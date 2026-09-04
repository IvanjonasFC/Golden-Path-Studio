#!/usr/bin/env node
/* ============================================================================
   runtime — CAPA DINÁMICA del pipeline de importación (Playwright).

   Alcance MUY controlado (primera versión, deliberadamente pequeña):
     · Arranca Chromium headless (Playwright), si está disponible.
     · Navega la baseURL + un puñado de rutas estáticas inferidas del repo.
     · Captura desktop (1280) y mobile (390).
     · Observa señales básicas de layout en el DOM REAL (sidebar, topbar,
       bottom-nav, hero, cta, cards, tabla, formularios, tabs, chart, footer)
       y el tema (claro/oscuro) por el fondo computado.
     · Escribe todo en el MISMO contrato (RuntimeReport de analysis.ts).

   Honestidad ante todo: si Playwright no arranca, no accede o no renderiza,
   NO se inventa nada — se registra en warnings/errors y `ran=false`. La capa
   estática (summary) nunca se sobrescribe: runtime solo la confirma o
   contradice de forma trazable (confidenceAdjustments).

   NO añade un motor nuevo ni VLM: solo crawling + capturas + señales simples.
   ============================================================================ */
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  RuntimeReport, RuntimeScreenshot, ViewportFinding, LayoutSignal, LayoutSignalKey,
  ConfidenceAdjustment,
} from "../src/lib/analysis";
import { emptyRuntime } from "../src/lib/analysis";

/* ---- tipos de entrada ---------------------------------------------------- */
export interface RuntimeOptions {
  root: string;                 // raíz del proyecto (para escribir capturas)
  baseURL: string | null;       // URL base ya resuelta (o null → no se ejecuta)
  baseURLSource?: "manual" | "autodetect" | "none";
  routes?: string[];            // rutas a intentar (incluye "/" por defecto)
  screenshotRoutes?: number;    // nº máx de rutas a capturar (defecto 4)
  navTimeoutMs?: number;        // timeout de navegación por ruta (defecto 15000)
  executablePath?: string;      // ruta a un Chromium concreto (opcional; si no, el de Playwright)
  staticHints?: { navigation?: string; architecture?: string; productType?: string };
}

const DESKTOP = { name: "desktop" as const, width: 1280, height: 800 };
const MOBILE = { name: "mobile" as const, width: 390, height: 844 };

/* ---- autodetección de baseURL ------------------------------------------- */
const COMMON_PORTS = [3000, 5173, 4321, 8080, 3001, 4200, 5000, 8000];

/** Prueba puertos locales comunes; devuelve la primera URL que responde. */
export async function detectBaseURL(ports: number[] = COMMON_PORTS, timeoutMs = 1200): Promise<string | null> {
  for (const port of ports) {
    const url = `http://localhost:${port}`;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { signal: ctrl.signal }).catch(() => null);
      clearTimeout(t);
      if (res && res.status < 500) return url;
    } catch { /* siguiente puerto */ }
  }
  return null;
}

/* ---- detección de señales dentro del navegador --------------------------
   Esta función se serializa y corre en el contexto de la página. No puede
   referenciar nada de fuera. Devuelve conteos + tema observado.
-------------------------------------------------------------------------- */
function domProbe() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
  const visible = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05;
  };
  const rect = (el: HTMLElement) => el.getBoundingClientRect();
  const cls = (el: HTMLElement) => (el.className && typeof el.className === "string" ? el.className.toLowerCase() : "");
  const count = (sel: string) => { try { return document.querySelectorAll(sel).length; } catch { return 0; } };

  // sidebar: vertical, pegado a un lado, alto y visible.
  let sidebar = 0;
  for (const el of all) {
    if (!visible(el)) continue;
    const r = rect(el), c = cls(el);
    const tall = r.height > vh * 0.5;
    const narrow = r.width < vw * 0.4 && r.width > 40;
    const side = r.left < 8 || r.right > vw - 8;
    const looks = el.tagName === "ASIDE" || /sidebar|side-nav|sidenav|drawer/.test(c) || el.getAttribute("role") === "complementary";
    if (tall && narrow && side && (looks || el.querySelector("nav"))) { sidebar++; }
  }

  // topbar: horizontal, arriba, ancho.
  let topbar = 0;
  for (const el of all) {
    if (!visible(el)) continue;
    const r = rect(el), c = cls(el);
    const top = r.top < 88 && r.top >= -4;
    const wide = r.width > vw * 0.6;
    const shortH = r.height < 160;
    const looks = el.tagName === "HEADER" || el.tagName === "NAV" || /navbar|topbar|app-?bar|header/.test(c) || el.getAttribute("role") === "banner";
    if (top && wide && shortH && looks) topbar++;
  }

  // bottom-nav: barra pegada abajo (típico mobile).
  let bottomNav = 0;
  for (const el of all) {
    if (!visible(el)) continue;
    const r = rect(el), c = cls(el);
    const bottom = r.bottom > vh - 8 && r.top > vh * 0.6;
    const wide = r.width > vw * 0.6;
    const shortH = r.height < 120;
    const looks = el.tagName === "NAV" || /bottom-?nav|tab-?bar|tabbar/.test(c) || el.getAttribute("role") === "navigation";
    if (bottom && wide && shortH && looks) bottomNav++;
  }

  // hero: bloque grande arriba con un h1 grande.
  let hero = 0;
  const h1s = Array.from(document.querySelectorAll<HTMLElement>("h1"));
  for (const h of h1s) {
    if (!visible(h)) continue;
    const r = rect(h);
    const fs = parseFloat(getComputedStyle(h).fontSize) || 0;
    if (r.top < vh * 0.9 && fs >= 30) { hero++; break; }
  }
  if (!hero) {
    for (const el of all) {
      if (!visible(el)) continue;
      const c = cls(el), r = rect(el);
      if (/hero|jumbotron|masthead/.test(c) && r.height > vh * 0.35 && r.top < vh) { hero++; break; }
    }
  }

  // cta: botones/enlaces de acción.
  const cta = count("a[class*='btn'],a[class*='button'],button,[class*='cta'],[role='button']");

  // cards
  const cards = count("[class*='card']");

  // table (con contenido real)
  let table = 0;
  for (const t of Array.from(document.querySelectorAll<HTMLElement>("table,[role='table'],[role='grid']"))) {
    if (visible(t) && t.querySelectorAll("tr,[role='row']").length >= 2) table++;
  }

  // form (con inputs)
  let form = 0;
  for (const f of Array.from(document.querySelectorAll<HTMLElement>("form"))) {
    if (visible(f) && f.querySelectorAll("input,select,textarea").length >= 1) form++;
  }
  if (!form && document.querySelectorAll("input[type='password'],input[type='email']").length) form = 1;

  // tabs
  const tabs = count("[role='tablist'],[role='tab'],[class*='tabs'],[class*='tab-']");

  // chart (canvas / svg grande / clase chart)
  let chart = count("canvas,[class*='chart'],[class*='graph']");
  for (const svg of Array.from(document.querySelectorAll<SVGElement>("svg"))) {
    const r = svg.getBoundingClientRect();
    if (r.width > 160 && r.height > 120) chart++;
  }

  // footer
  let footer = 0;
  for (const el of all) {
    if (!visible(el)) continue;
    const c = cls(el);
    if ((el.tagName === "FOOTER" || /footer|site-foot/.test(c) || el.getAttribute("role") === "contentinfo")) { footer++; }
  }

  // tema por fondo computado
  const readBg = (el: Element | null): string => {
    while (el) {
      const bg = getComputedStyle(el as HTMLElement).backgroundColor;
      if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return bg;
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || "";
  };
  const bg = readBg(document.body);
  let theme: "light" | "dark" | "unknown" = "unknown";
  const m = bg.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(",").map((n) => parseFloat(n));
    if ([r, g, b].every((n) => !Number.isNaN(n))) {
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      theme = lum < 0.5 ? "dark" : "light";
    }
  }

  return {
    counts: { sidebar, topbar, bottomNav, hero, cta, cards, table, form, tabs, chart, footer },
    theme, bg,
  };
}

type ProbeResult = ReturnType<typeof domProbe>;

/* ---- helpers ------------------------------------------------------------- */
function safeName(route: string): string {
  const s = route.replace(/^\/+|\/+$/g, "").replace(/[^\w-]+/g, "_") || "index";
  return s;
}
function toSignals(counts: Record<LayoutSignalKey, number>): LayoutSignal[] {
  const keys: LayoutSignalKey[] = ["sidebar", "topbar", "bottomNav", "hero", "cta", "cards", "table", "form", "tabs", "chart", "footer"];
  return keys.map((key) => ({ key, present: (counts[key] || 0) > 0, count: counts[key] || 0 }));
}
/** Une señales de varias rutas (present = OR, count = máximo observado). */
function mergeSignals(list: LayoutSignal[][]): LayoutSignal[] {
  const byKey = new Map<LayoutSignalKey, LayoutSignal>();
  for (const sigs of list) for (const s of sigs) {
    const prev = byKey.get(s.key);
    if (!prev) byKey.set(s.key, { ...s });
    else byKey.set(s.key, { key: s.key, present: prev.present || s.present, count: Math.max(prev.count, s.count) });
  }
  return [...byKey.values()];
}

/** Compara runtime con las pistas estáticas → ajustes de confianza trazables. */
function deriveAdjustments(sig: LayoutSignal[], hints: RuntimeOptions["staticHints"]): ConfidenceAdjustment[] {
  const out: ConfidenceAdjustment[] = [];
  const on = (k: LayoutSignalKey) => sig.find((s) => s.key === k)?.present ?? false;
  const nav = (hints?.navigation || "").toLowerCase();
  const ptype = (hints?.productType || "").toLowerCase();

  // Navegación: sidebar observado vs. lo estático.
  if (on("sidebar")) {
    if (/sidebar|shell|app|dashboard/.test(nav))
      out.push({ field: "navigation", effect: "confirm", staticValue: hints?.navigation ?? null, runtimeValue: "sidebar", reason: "Sidebar visible en el DOM renderizado." });
    else if (nav)
      out.push({ field: "navigation", effect: "contradict", staticValue: hints?.navigation ?? null, runtimeValue: "sidebar", reason: "Runtime observa sidebar; la estática indicaba otra navegación." });
  } else if (on("topbar") && !on("sidebar")) {
    if (/landing|topbar|marketing|top/.test(nav))
      out.push({ field: "navigation", effect: "confirm", staticValue: hints?.navigation ?? null, runtimeValue: "topbar", reason: "Topbar visible sin sidebar." });
  }

  // Tipo de producto: tabla/formulario vs. hero.
  if (on("table") || on("form")) {
    if (/dashboard|crud|app|auth/.test(ptype))
      out.push({ field: "productType", effect: "confirm", staticValue: hints?.productType ?? null, runtimeValue: on("table") ? "data/tabla" : "form", reason: "Tabla/formulario reales en el render." });
    else if (ptype)
      out.push({ field: "productType", effect: "contradict", staticValue: hints?.productType ?? null, runtimeValue: on("table") ? "data/tabla" : "form", reason: "Runtime ve tabla/formulario; la estática sugería otro tipo." });
  } else if (on("hero") && !on("table") && !on("form")) {
    if (/static|portfolio|landing|marketing/.test(ptype))
      out.push({ field: "productType", effect: "confirm", staticValue: hints?.productType ?? null, runtimeValue: "landing/estático", reason: "Hero presente y sin tabla/formulario." });
  }

  return out;
}

/* ---- ejecución principal ------------------------------------------------- */
export async function runRuntime(opts: RuntimeOptions): Promise<RuntimeReport> {
  const startedAt = Date.now();
  const rep = emptyRuntime({
    enabled: true,
    baseURL: opts.baseURL,
    baseURLSource: opts.baseURLSource ?? (opts.baseURL ? "manual" : "none"),
    startedAt,
  });

  if (!opts.baseURL) {
    rep.errors.push("Sin baseURL: no hay servidor en marcha que analizar. Arranca el dev server o pásame la URL.");
    rep.finishedAt = Date.now();
    return rep;
  }

  // Playwright es opcional: import dinámico con fallback honesto.
  type PW = typeof import("playwright");
  let pw: PW;
  try {
    pw = (await import("playwright")) as PW;
  } catch {
    rep.errors.push("Playwright no está instalado. Instálalo con `npm i -D playwright` y `npx playwright install chromium`. Runtime omitido (la capa estática sigue siendo válida).");
    rep.finishedAt = Date.now();
    return rep;
  }

  let browser: import("playwright").Browser | null = null;
  try {
    const launchOpts: import("playwright").LaunchOptions = { headless: true };
    const exe = opts.executablePath || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "";
    if (exe) launchOpts.executablePath = exe;
    browser = await pw.chromium.launch(launchOpts);
  } catch (e) {
    rep.errors.push(`No se pudo arrancar Chromium: ${String((e as Error).message || e)}. Prueba \`npx playwright install chromium\`.`);
    rep.finishedAt = Date.now();
    return rep;
  }

  rep.engine = "playwright-chromium";
  const routes = (opts.routes && opts.routes.length ? opts.routes : ["/"]).slice(0, 12);
  rep.routesRequested = routes;
  const shotBudget = Math.max(1, opts.screenshotRoutes ?? 4);
  const navTimeout = opts.navTimeoutMs ?? 15000;
  const shotsDir = path.join(opts.root, ".analysis", "screenshots");
  await fs.mkdir(shotsDir, { recursive: true }).catch(() => {});

  const crawledOk = new Set<string>();

  for (const vp of [DESKTOP, MOBILE]) {
    let context: import("playwright").BrowserContext | null = null;
    try {
      context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: vp.name === "mobile",
      });
    } catch (e) {
      rep.warnings.push(`No se pudo crear el contexto ${vp.name}: ${String((e as Error).message || e)}.`);
      continue;
    }

    const perRouteSignals: LayoutSignal[][] = [];
    const routesObserved: string[] = [];
    let theme: ViewportFinding["theme"] = "unknown";
    let bg: string | null = null;
    let shotsTaken = 0;

    const page = await context.newPage();
    for (const route of routes) {
      const url = opts.baseURL.replace(/\/+$/, "") + (route === "/" ? "/" : route);
      let status: number | null = null;
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: navTimeout });
        status = resp ? resp.status() : null;
        if (status !== null && status >= 400) {
          rep.warnings.push(`${vp.name} ${route}: HTTP ${status} (ruta no renderizada, se omite).`);
          continue;
        }
        await page.waitForTimeout(400); // deja asentar layout/CSS
      } catch (e) {
        rep.warnings.push(`${vp.name} ${route}: no se pudo abrir (${String((e as Error).message || e).slice(0, 120)}).`);
        continue;
      }

      crawledOk.add(route);
      routesObserved.push(route);

      // señales del DOM real
      try {
        const probe = (await page.evaluate(domProbe)) as ProbeResult;
        perRouteSignals.push(toSignals(probe.counts as Record<LayoutSignalKey, number>));
        if (theme === "unknown" && probe.theme !== "unknown") { theme = probe.theme; bg = probe.bg; }
      } catch (e) {
        rep.warnings.push(`${vp.name} ${route}: no se pudieron leer señales del DOM (${String((e as Error).message || e).slice(0, 80)}).`);
      }

      // captura (con presupuesto)
      if (shotsTaken < shotBudget) {
        const file = `${safeName(route)}__${vp.name}.png`;
        const abs = path.join(shotsDir, file);
        try {
          await page.screenshot({ path: abs, fullPage: false });
          const st = await fs.stat(abs).catch(() => null);
          const shot: RuntimeScreenshot = {
            route, viewport: vp.name, width: vp.width, height: vp.height,
            file: path.join(".analysis", "screenshots", file).split(path.sep).join("/"),
            bytes: st ? st.size : 0, status,
          };
          rep.screenshots.push(shot);
          shotsTaken++;
        } catch (e) {
          rep.warnings.push(`${vp.name} ${route}: captura fallida (${String((e as Error).message || e).slice(0, 80)}).`);
        }
      }
    }

    await context.close().catch(() => {});

    if (perRouteSignals.length) {
      const merged = mergeSignals(perRouteSignals);
      rep.viewportFindings.push({ viewport: vp.name, width: vp.width, theme, bg, routesObserved, signals: merged });
    }
  }

  await browser.close().catch(() => {});

  rep.routesCrawled = [...crawledOk];
  rep.ran = rep.routesCrawled.length > 0;
  rep.layoutSignals = mergeSignals(rep.viewportFindings.map((v) => v.signals));
  if (rep.ran) rep.confidenceAdjustments = deriveAdjustments(rep.layoutSignals, opts.staticHints);
  else if (!rep.errors.length) rep.errors.push("No se pudo renderizar ninguna ruta: revisa la baseURL y que el servidor esté activo.");

  rep.finishedAt = Date.now();
  return rep;
}
