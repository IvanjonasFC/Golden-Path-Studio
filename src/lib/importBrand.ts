/* ============================================================================
   Importar marca desde un PROYECTO (fase 1: identidad visual + librerías).
   "Funciona al revés": das tus archivos reales (CSS, tailwind, package.json,
   README, HTML) y el sistema DESCUBRE evidencia (paleta, tipografía, radios,
   dependencias) y PROPONE una marca resuelta en tokens DTCG — que luego editas
   en el editor y ya tiene blueprint/preview/export.

   Este módulo es PURO (sin DOM, sin red): entra texto de archivos, sale una
   marca (tokens DTCG) + un resumen de lo detectado, con trazabilidad. La lectura
   más profunda (componentes, rutas, escenas, docs pack) son fases siguientes.
   ============================================================================ */
import { defaultBrandTokens, setTokenValue, type TokenGroup } from "./tokens";
import type { Blueprint, LibItem, ProjectView } from "./blueprint";
import type { SceneId } from "./scenes";

export interface ImportFile { name: string; text: string }

export type Confidence = "strong" | "weak" | "default";

/** Campo inferido con trazabilidad: valor + confianza + fuente de evidencia. */
export interface Inferred { value: string; confidence: Confidence; source: string }

export interface ImportSummary {
  suggestedName: string | null;
  theme: "dark" | "light";
  colors: { path: string; label: string; value: string }[];
  fonts: string[];
  radii: string[];
  libraries: LibItem[];
  filesRead: number;
  notes: string[];
  // Estructura inferida (fase 2) — evidencia real, con confianza y fuente.
  navigation?: Inferred;
  architecture?: Inferred;
  productType?: Inferred;
  auth?: Inferred;
  scenes: string[];
  views?: ProjectView[];
  components: DetectedComponent[];
}

export interface ImportResult { tokens: TokenGroup; summary: ImportSummary }

/* ------------------------------- color utils ------------------------------- */
function expandHex(h: string): string | null {
  let s = h.trim().toLowerCase();
  if (!s.startsWith("#")) return null;
  s = s.slice(1);
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length === 8) s = s.slice(0, 6); // descarta alpha
  if (s.length !== 6 || /[^0-9a-f]/.test(s)) return null;
  return "#" + s;
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function toRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function saturation(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}
function darken(hex: string, amount = 0.12): string {
  const [r, g, b] = toRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = toRgb(a), [r2, g2, b2] = toRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Extrae todos los colores (hex + rgb/rgba) del texto, con frecuencia. */
function collectColors(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (hex: string | null) => { if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1); };
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) add(expandHex(m[0]));
  for (const m of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) add(rgbToHex(+m[1], +m[2], +m[3]));
  return counts;
}

/* ------------------------------- font utils -------------------------------- */
function collectFonts(text: string): string[] {
  const out: string[] = [];
  const GENERIC = /^(inherit|initial|unset|revert|sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|blinkmacsystemfont|segoe ui|emoji|math)$/i;
  const clean = (v: string) => v.split(",")[0].replace(/['"]/g, "").trim();
  const push = (raw?: string) => {
    if (!raw) return;
    let first = clean(raw);
    if (!first) return;
    // Resolver var(--x[, fallback]) contra las definiciones --x del propio CSS.
    const vm = first.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/i);
    if (vm) {
      const def = text.match(new RegExp("\\" + vm[1] + "\\s*:\\s*([^;{}]+)"));
      first = clean(def ? def[1] : (vm[2] || ""));
    }
    if (!first || /^var\(/i.test(first) || GENERIC.test(first)) return;
    if (!out.includes(first)) out.push(first);
  };
  for (const m of text.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) push(m[1]);
  for (const m of text.matchAll(/--font[\w-]*\s*:\s*([^;{}]+)/gi)) push(m[1]);
  // Google Fonts: family=Space+Grotesk
  for (const m of text.matchAll(/family=([A-Za-z0-9+]+)/g)) push(m[1].replace(/\+/g, " "));
  // @fontsource/space-grotesk  o  @fontsource-variable/inter  ->  "Space Grotesk" / "Inter"
  for (const m of text.matchAll(/@fontsource(?:-variable)?\/([a-z0-9-]+)/gi)) {
    push(m[1].split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
  }
  // next/font/google:  import { Inter, Space_Grotesk } from "next/font/google"
  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g)) {
    for (const nm of m[1].split(",")) push(nm.trim().replace(/_/g, " "));
  }
  return out;
}

/* ------------------------------ radius utils ------------------------------- */
function collectRadii(text: string): string[] {
  const out: string[] = [];
  const push = (v?: string) => {
    if (!v) return;
    const val = v.trim().split(/\s+/)[0];
    if (/^\d+(\.\d+)?(px|rem)$/.test(val) && val !== "0px" && !out.includes(val)) out.push(val);
  };
  for (const m of text.matchAll(/border-radius\s*:\s*([^;{}]+)/gi)) push(m[1]);
  for (const m of text.matchAll(/--radius[\w-]*\s*:\s*([^;{}]+)/gi)) push(m[1]);
  return out.sort((a, b) => parseFloat(a) - parseFloat(b));
}

/* ---------------------------- library detection ---------------------------- */
const LIB_MAP: Record<string, { category: string; status: LibItem["status"] }> = {
  "react-hook-form": { category: "forms", status: "approved" },
  zod: { category: "validation", status: "approved" },
  valibot: { category: "validation", status: "approved" },
  "@tanstack/react-query": { category: "data-fetching", status: "approved" },
  "@tanstack/react-table": { category: "data", status: "approved" },
  zustand: { category: "state", status: "approved" },
  jotai: { category: "state", status: "approved" },
  "date-fns": { category: "utils", status: "approved" },
  clsx: { category: "utils", status: "approved" },
  "tailwind-merge": { category: "utils", status: "approved" },
  "framer-motion": { category: "ui", status: "approved" },
  motion: { category: "ui", status: "approved" },
  lodash: { category: "utils", status: "discouraged" },
  moment: { category: "utils", status: "blocked" },
  axios: { category: "data-fetching", status: "discouraged" },
};
function detectLibraries(pkgText: string): LibItem[] {
  try {
    const pkg = JSON.parse(pkgText) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const out: LibItem[] = [];
    for (const name of Object.keys(deps)) {
      const hit = LIB_MAP[name];
      if (hit) out.push({ name, category: hit.category, status: hit.status });
    }
    return out;
  } catch { return []; }
}
function detectName(files: ImportFile[]): string | null {
  const pkg = files.find((f) => /(^|\/)package\.json$/i.test(f.name));
  if (pkg) { try { const j = JSON.parse(pkg.text) as { name?: string }; if (j.name) return prettyName(j.name); } catch { /* ignore */ } }
  const readme = files.find((f) => /readme\.md$/i.test(f.name));
  if (readme) { const m = readme.text.match(/^\s*#\s+(.+)$/m); if (m) return m[1].trim().slice(0, 60); }
  return null;
}
function prettyName(s: string): string {
  return s.replace(/^@[^/]+\//, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 60);
}

/* --------------------- componentes dominantes (manifiesto) -----------------
   Extractor determinista de "componentes repetidos": cuenta menciones de
   primitivas UI en el código. Es un PROXY (menciones, no uso garantizado en
   runtime), por eso se muestra como evidencia, no como verdad absoluta. */
export interface DetectedComponent { name: string; count: number }
const COMPONENT_SIGNS: { name: string; re: RegExp }[] = [
  { name: "table", re: /<table\b|data-?grid|datatable|react-table|<thead\b/gi },
  { name: "form", re: /<form\b|useform\b|<label\b|<input\b/gi },
  { name: "modal", re: /\bmodal\b|<dialog\b|\bdrawer\b|\bsheet\b|\bpopover\b/gi },
  { name: "card", re: /\bcard\b/gi },
  { name: "chart", re: /recharts|chart\.js|<canvas\b|\bchart\b/gi },
  { name: "sidebar", re: /\bsidebar\b|app-?shell|<aside\b/gi },
  { name: "nav", re: /<nav\b|navbar|\bheader\b/gi },
  { name: "tabs", re: /\btabs?\b|tabbar|bottom-?nav/gi },
  { name: "button", re: /<button\b|\bbtn\b/gi },
  { name: "badge", re: /\bbadge\b|\bchip\b|\bpill\b/gi },
  { name: "avatar", re: /\bavatar\b/gi },
  { name: "accordion", re: /\baccordion\b|<details\b/gi },
  { name: "toast", re: /\btoast\b|sonner|react-hot-toast/gi },
];
function detectComponents(code: string): DetectedComponent[] {
  const out: DetectedComponent[] = [];
  for (const c of COMPONENT_SIGNS) {
    const n = (code.match(c.re) || []).length;
    if (n > 0) out.push({ name: c.name, count: n });
  }
  return out.sort((a, b) => b.count - a.count);
}

/* ------------------------- blueprint inferido (fase 2) ---------------------
   Infiere estructura/navegación/escenas SOLO desde evidencia real (rutas,
   layouts, código, dependencias). Reglas: evidencia fuerte → rellena; débil →
   se rellena pero se marca como sugerencia; nula → se omite (queda el default
   sensato del propio motor). Sin hardcodes por "tipo de proyecto": todo son
   señales genéricas (presencia de tablas/forms/auth/landing/sidebar/…).
   --------------------------------------------------------------------------- */
export interface InferResult {
  blueprint: Blueprint;
  navigation?: Inferred;
  architecture?: Inferred;
  productType?: Inferred;
  auth?: Inferred;
  scenes: string[];
  notes: string[];
}

export function inferBlueprint(files: ImportFile[], libraries: LibItem[]): InferResult {
  const notes: string[] = [];
  const paths = files.map((f) => f.name.toLowerCase());
  const pathsJoined = paths.join("\n");
  const code = files.map((f) => f.text).join("\n").toLowerCase();
  const libNames = new Set(libraries.map((l) => l.name.toLowerCase()));
  const hasPath = (re: RegExp) => re.test(pathsJoined);
  const inCode = (re: RegExp) => re.test(code);
  const hasStructure = paths.some((p) => p.includes("/")); // ¿tenemos rutas/carpetas?

  // Señales (cada una: hay evidencia en rutas y/o código y/o deps).
  const sig = {
    landing: hasPath(/\(marketing\)|\/landing|\/pricing|\/(home)\//) || inCode(/hero|pricing|testimonial/),
    sidebar: hasPath(/\/dashboard(\/|$)|\/admin(\/|$)|\/(app)\//) || inCode(/sidebar|app-?shell/),
    tabs: hasPath(/\(tabs\)|\/mobile(\/|$)|bottom-?nav/) || inCode(/bottom-?nav|tabbar|tab-?bar/),
    auth: hasPath(/\(auth\)|\/login|\/register|\/sign-?in|\/sign-?up|\/auth(\/|$)/) || libNames.has("next-auth") || libNames.has("@clerk/nextjs") || [...libNames].some((n) => /clerk|lucia|supabase|firebase|auth/.test(n)),
    table: inCode(/data-?grid|datatable|<table|react-table/) || libNames.has("@tanstack/react-table") || hasPath(/\/table/),
    form: inCode(/<form|useform|react-hook-form/) || libNames.has("react-hook-form") || hasPath(/\/forms?(\/|$)/),
    charts: [...libNames].some((n) => /recharts|chart\.js|nivo|visx|apexcharts|d3/.test(n)) || inCode(/recharts|chart\.js/),
    settings: hasPath(/\/settings(\/|$)|\/ajustes(\/|$)/),
    modal: inCode(/\bmodal\b|\bdialog\b|\bdrawer\b|\bsheet\b/),
    cmdk: libNames.has("cmdk") || inCode(/command-?palette|cmdk|⌘k/),
    monorepo: hasPath(/(^|\n)[^\n]*\/apps\//) && hasPath(/(^|\n)[^\n]*\/packages\//),
    features: hasPath(/\/features?\//),
    layers: hasPath(/\/(services|entities|shared)\//),
    motion: [...libNames].some((n) => /framer-motion|^motion$/.test(n)) || inCode(/framer-motion/),
    commerce: hasPath(/\/shop(\/|$)|\/store(\/|$)|\/products?(\/|$)|\/checkout(\/|$)|\/cart(\/|$)/) || inCode(/add[ -]?to[ -]?cart|checkout|addtocart/),
    blog: hasPath(/\/blog(\/|$)|\/posts?(\/|$)|\/articles?(\/|$)/) || inCode(/<article\b/),
    portfolio: hasPath(/\/projects?(\/|$)|\/proyectos(\/|$)|\/portfolio(\/|$)|\/work(\/|$)/) || inCode(/\bportfolio\b|\bproyectos\b|\bmy work\b/),
  };

  const bp: Blueprint = {};

  // --- Navegación (escoge por puntuación de señales, con fuente trazable) ---
  const navEvidence: Record<string, string[]> = {
    "app-shell": [sig.sidebar && "sidebar/dashboard", sig.table && "tablas", sig.charts && "charts"].filter(Boolean) as string[],
    landing: [sig.landing && "marketing/hero/pricing"].filter(Boolean) as string[],
    tabbed: [sig.tabs && "tabs/mobile/bottom-nav"].filter(Boolean) as string[],
  };
  const navScore: Record<string, number> = {
    "app-shell": (sig.sidebar ? 2 : 0) + (sig.table ? 1 : 0) + (sig.charts ? 1 : 0),
    landing: (sig.landing ? 2 : 0),
    tabbed: (sig.tabs ? 2 : 0),
  };
  const navTop = Object.entries(navScore).sort((a, b) => b[1] - a[1])[0];
  let navigation: Inferred;
  if (navTop && navTop[1] >= 2) { bp.interaction = { ...(bp.interaction ?? {}), navigationPattern: navTop[0] }; navigation = { value: navTop[0], confidence: "strong", source: navEvidence[navTop[0]].join(" + ") }; }
  else if (navTop && navTop[1] === 1) { bp.interaction = { ...(bp.interaction ?? {}), navigationPattern: navTop[0] }; navigation = { value: navTop[0], confidence: "weak", source: navEvidence[navTop[0]].join(" + ") || "señal única" }; notes.push(`Navegación «${navTop[0]}» inferida con evidencia débil — revísala.`); }
  else { navigation = { value: "dashboard", confidence: "default", source: "sin señales de navegación" }; notes.push("Navegación: sin evidencia clara; se deja el default (dashboard)."); }

  if (sig.motion) bp.interaction = { ...(bp.interaction ?? {}), motionPreset: "smooth" };

  // --- Arquitectura ---
  let architecture: Inferred;
  if (!hasStructure) { architecture = { value: "feature-based", confidence: "default", source: "sin rutas/carpetas" }; notes.push("Sin rutas/carpetas (¿solo archivos sueltos?): arquitectura por defecto."); }
  else if (sig.monorepo) { bp.architecture = { ...(bp.architecture ?? {}), pattern: "monorepo-lite" }; architecture = { value: "monorepo-lite", confidence: "strong", source: "apps/ + packages/" }; }
  else if (sig.features) { bp.architecture = { ...(bp.architecture ?? {}), pattern: "feature-based" }; architecture = { value: "feature-based", confidence: "strong", source: "carpeta features/" }; }
  else if (sig.layers) { bp.architecture = { ...(bp.architecture ?? {}), pattern: "layer-based" }; architecture = { value: "layer-based", confidence: "strong", source: "services|entities|shared/" }; }
  else { architecture = { value: "feature-based", confidence: "default", source: "sin patrón claro de carpetas" }; }

  // --- Datos (tablas/filtros/búsqueda) ---
  const data: NonNullable<Blueprint["data"]> = {};
  if (sig.tabs) data.tableLayout = "cards-mobile";
  else if (sig.table) { data.tableLayout = "dense"; data.filters = "inline"; data.pagination = "classic"; }
  if (sig.cmdk) data.search = "command-palette";
  else if (sig.table) data.search = "with-filters";
  if (Object.keys(data).length) bp.data = data;

  // --- Seguridad (auth) ---
  let auth: Inferred | undefined;
  if (sig.auth) {
    const oauthLib = [...libNames].find((n) => /clerk|next-auth|firebase|supabase/.test(n));
    if (oauthLib) { bp.security = { ...(bp.security ?? {}), authMethods: ["oauth", "email-password"] }; auth = { value: "oauth + email", confidence: "strong", source: `dep ${oauthLib}` }; }
    else { bp.security = { ...(bp.security ?? {}), authMethods: ["email-password"] }; auth = { value: "email/contraseña", confidence: "weak", source: "rutas de auth (login/register)" }; notes.push("Auth detectada por rutas: método «email/contraseña» como sugerencia."); }
  }

  // --- Tipo de proyecto → CONDICIONA las reglas del motor (auth/seguridad/datos).
  //     Sin backend/auth/dashboard = estático/portfolio: seguridad NO obligatoria.
  const hasBackend = sig.auth || (sig.sidebar && (sig.table || sig.charts));
  let ptype: "static" | "dashboard" | "crud" | "mobile" | "auth-app";
  let psource: string;
  if (sig.auth) { ptype = "auth-app"; psource = "rutas/deps de auth"; }
  else if (sig.sidebar && (sig.table || sig.charts)) { ptype = "dashboard"; psource = "sidebar + tablas/charts"; }
  else if (sig.tabs) { ptype = "mobile"; psource = "tabs/mobile"; }
  else if (sig.table) { ptype = "crud"; psource = "tablas de datos"; }
  else { ptype = "static"; psource = sig.landing ? "landing/marketing sin backend ni auth" : "sin backend ni auth"; }
  // Se persiste en el blueprint: el resolvedConfig lo usa para relajar reglas.
  (bp as { projectType?: string }).projectType = ptype;

  const PT_LABEL: Record<string, string> = {
    "static": "portfolio / estático", "dashboard": "workspace / dashboard",
    "crud": "CRUD / app de datos", "mobile": "mobile", "auth-app": "app con auth",
  };
  const productType: Inferred = {
    value: PT_LABEL[ptype],
    confidence: hasBackend || sig.tabs || sig.landing || sig.table ? "strong" : "weak",
    source: psource,
  };

  // --- Escenas probables (restringidas al set del motor) ---
  const scenes: string[] = [];
  if (sig.landing) scenes.push("landing");
  // Dashboard SOLO con evidencia real de backend/datos (sidebar + tablas/charts):
  // evita clasificar como dashboard un portfolio que solo menciona "sidebar".
  if (sig.sidebar && (sig.table || sig.charts)) scenes.push("dashboard");
  if (sig.auth) scenes.push("auth");
  if (sig.form) scenes.push("form");
  if (sig.tabs) scenes.push("mobile");
  if (sig.commerce) scenes.push("commerce");
  if (sig.blog) scenes.push("content");
  if (sig.settings) scenes.push("settings");
  // Portfolio: sitio estatico con senales propias (proyectos/portfolio) o estatico
  // sin ninguna otra escena mejor. Se pone primero por ser la pantalla principal.
  if (sig.portfolio || (ptype === "static" && scenes.length === 0)) {
    if (!scenes.includes("portfolio")) scenes.unshift("portfolio");
  }

  return { blueprint: bp, navigation, architecture, productType, auth, scenes, notes };
}

/* ------------------------- vistas del proyecto (Fase 1) -------------------
   Detecta las VISTAS/paginas reales (rutas Next app/pages, Astro o react-router;
   si no hay ninguna, una vista unica "home"). Cada vista lleva un
   previewArchetype (SOLO para previsualizar) con confianza y fuente. NO describe
   secciones/datos/interaccion todavia (fases siguientes).
   ------------------------------------------------------------------------- */
function slugifyRoute(route: string): string {
  const s = route.replace(/^\/+|\/+$/g, "").replace(/[[\]()]/g, "").replace(/\//g, "-");
  return (s || "home").toLowerCase();
}
function archetypeForRoute(route: string, projectType: string): SceneId {
  const r = route.toLowerCase();
  if (/login|sign-?in|sign-?up|register|auth/.test(r)) return "auth";
  if (/blog|posts?|articles?/.test(r)) return "content";
  if (/shop|store|products?|checkout|cart/.test(r)) return "commerce";
  if (/settings|ajustes|account/.test(r)) return "settings";
  if (/dashboard|admin/.test(r)) return "dashboard";
  if (/contact|about|projects?|proyectos|portfolio|work/.test(r)) return "portfolio";
  if (r === "/" || r === "") return projectType === "static" ? "portfolio" : projectType === "dashboard" ? "dashboard" : projectType === "auth-app" ? "auth" : "landing";
  return "landing";
}
function extractViewTitle(src: string): string | undefined {
  if (!src) return undefined;
  const t = src.match(/<title[^>]*>([^<]{1,80})<\/title>/i);
  if (t) return t[1].trim();
  const fm = src.match(/^---[\s\S]*?\btitle:\s*["']?([^"'\n]{1,80})["']?/m);
  if (fm) return fm[1].trim();
  const h1 = src.match(/<h1[^>]*>([^<]{1,80})<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, "").trim() || undefined;
  return undefined;
}
function routeOf(path: string): { route: string; router: string } | null {
  const app = path.match(/(?:^|\/)app\/(.*\/)?page\.(?:t|j)sx?$/i);
  if (app) {
    const seg = (app[1] ?? "").replace(/\/$/, "").split("/").filter((x) => x && !/^\(.*\)$/.test(x)).join("/");
    return { route: "/" + seg, router: "app" };
  }
  const pages = path.match(/(?:^|\/)pages\/(.*)\.(?:t|j)sx?$/i);
  if (pages) {
    let seg = pages[1];
    if (/^_(app|document|error)$/.test(seg) || /^api(\/|$)/.test(seg)) return null;
    seg = seg.replace(/(^|\/)index$/i, "");
    return { route: "/" + seg.replace(/^\//, ""), router: "pages" };
  }
  const astro = path.match(/(?:^|\/)src\/pages\/(.*)\.(?:astro|mdx?|md)$/i);
  if (astro) {
    const seg = astro[1].replace(/(^|\/)index$/i, "");
    return { route: "/" + seg.replace(/^\//, ""), router: "astro" };
  }
  return null;
}
export function detectViews(files: ImportFile[], projectType: string): ProjectView[] {
  const norm = (r: string) => { r = ("/" + r.replace(/^\/+/, "")).replace(/\/{2,}/g, "/"); return r.length > 1 ? r.replace(/\/$/, "") : "/"; };
  const seen = new Map<string, ProjectView>();
  const add = (rawRoute: string, src: string, router: string, conf: "strong" | "default") => {
    const route = norm(rawRoute);
    if (seen.has(route)) return;
    const dynamic = /\[[^\]]+\]/.test(route);
    const title = extractViewTitle(src);
    seen.set(route, {
      id: slugifyRoute(route),
      route,
      ...(title ? { title } : {}),
      previewArchetype: archetypeForRoute(route, projectType),
      ...(dynamic ? { dynamic: true } : {}),
      confidence: conf,
      source: router === "one-page" ? "sitio de una pagina (sin rutas)" : "ruta " + router,
    });
  };
  for (const f of files) {
    const r = routeOf(f.name);
    if (r) add(r.route, f.text, r.router, "strong");
  }
  if (seen.size === 0) {
    const code = files.map((f) => f.text).join("\n");
    for (const m of code.matchAll(/<Route\s+[^>]*\bpath=["'`]([^"'`]+)["'`]/g)) add(m[1], "", "router", "strong");
  }
  if (seen.size === 0) add("/", files.map((f) => f.text).join("\n"), "one-page", "default");
  return [...seen.values()].slice(0, 40);
}

/* --------------------------------- extract --------------------------------- */
export function extractIdentity(files: ImportFile[]): ImportResult {
  const notes: string[] = [];
  const styleText = files.filter((f) => /\.(css|scss|less|js|jsx|ts|tsx|html|svelte|vue|astro)$/i.test(f.name) || /tailwind|globals|theme|tokens/i.test(f.name)).map((f) => f.text).join("\n");
  const allText = files.map((f) => f.text).join("\n");

  // Colores por frecuencia (de estilos; si no, de todo).
  const counts = collectColors(styleText || allText);
  const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
  const neutrals = colors.filter((c) => saturation(c) <= 0.22);
  const accents = colors.filter((c) => saturation(c) > 0.22);

  const darkNeutrals = neutrals.filter((c) => luminance(c) < 0.25).sort((a, b) => luminance(a) - luminance(b));
  const lightNeutrals = neutrals.filter((c) => luminance(c) > 0.8).sort((a, b) => luminance(b) - luminance(a));
  const theme: "dark" | "light" = darkNeutrals.length >= lightNeutrals.length && darkNeutrals.length > 0 ? "dark" : (lightNeutrals.length > 0 ? "light" : "dark");

  const def = defaultBrandTokens();
  const rv = (path: string, fb: string) => {
    // valores por defecto legibles como fallback
    const map: Record<string, string> = { "color.bg": "#0a0a0c", "color.surface": "#141418", "color.text": "#f2f2f5", "color.muted": "#a0a0a0", "color.action.primary": "#f0a470", "color.action.primary-hover": "#e08a50", "color.action.accent": "#f4ae7c" };
    return map[path] ?? fb;
  };

  const primary = accents[0] ?? rv("color.action.primary", "#f0a470");
  const accent = accents[1] ?? primary;
  const bg = theme === "dark"
    ? (darkNeutrals[0] ?? "#0a0a0c")
    : (lightNeutrals[0] ?? "#f7f7f9");
  const text = theme === "dark"
    ? (lightNeutrals[0] ?? "#f2f2f5")
    : (darkNeutrals[0] ?? "#14141a");
  const surface = mix(bg, text, 0.06);
  const muted = mix(text, bg, 0.45);

  const fonts = collectFonts(styleText || allText);
  const radii = collectRadii(styleText || allText);
  const pkg = files.find((f) => /(^|\/)package\.json$/i.test(f.name));
  const libraries = pkg ? detectLibraries(pkg.text) : [];

  if (!accents.length) notes.push("No se detectaron colores de acento claros; se usa el naranja de marca por defecto.");
  if (!fonts.length) notes.push("No se detectaron tipografías; se mantienen Inter / Space Grotesk.");
  if (!radii.length) notes.push("No se detectaron radios; se mantienen los valores por defecto.");
  if (!pkg) notes.push("Sin package.json: no se detectaron librerías.");

  // Construir doc de tokens DTCG partiendo del default y sobrescribiendo semánticos.
  let doc: TokenGroup = structuredClone(def);
  const put = (path: string, value?: string) => { if (value) doc = setTokenValue(doc, path, value); };
  put("color.bg", bg);
  put("color.surface", surface);
  put("color.text", text);
  put("color.muted", muted);
  put("color.action.primary", primary);
  put("color.action.primary-hover", darken(primary, 0.14));
  put("color.action.accent", accent);
  if (fonts[0]) put("font.heading", fonts[0]);
  if (fonts[1] ?? fonts[0]) put("font.body", fonts[1] ?? fonts[0]);
  if (radii.length) { put("radius.button", radii[0]); put("radius.card", radii[radii.length - 1]); }

  // Blueprint inferido (fase 2) + librerías detectadas → mismo doc de tokens,
  // que entra tal cual en el pipeline (editor → blueprint → preview → export).
  const inferred = inferBlueprint(files, libraries);
  notes.push(...inferred.notes);
  const mergedBp: Blueprint = { ...inferred.blueprint };
  const projectTypeRaw = (inferred.blueprint as { projectType?: string }).projectType ?? "static";
  const detectedViews = detectViews(files, projectTypeRaw);
  if (detectedViews.length) mergedBp.views = detectedViews;
  if (libraries.length) mergedBp.libraries = { items: libraries };
  if (Object.keys(mergedBp).length) {
    const root = doc as unknown as { blueprint?: Blueprint };
    root.blueprint = { ...(root.blueprint ?? {}), ...mergedBp };
  }

  const summary: ImportSummary = {
    suggestedName: detectName(files),
    theme,
    colors: [
      { path: "color.bg", label: "Fondo", value: bg },
      { path: "color.surface", label: "Superficie", value: surface },
      { path: "color.text", label: "Texto", value: text },
      { path: "color.action.primary", label: "Primario", value: primary },
      { path: "color.action.accent", label: "Acento", value: accent },
    ],
    fonts: fonts.slice(0, 2),
    radii: radii.slice(0, 4),
    libraries,
    filesRead: files.length,
    notes,
    navigation: inferred.navigation,
    architecture: inferred.architecture,
    productType: inferred.productType,
    auth: inferred.auth,
    scenes: inferred.scenes,
    views: detectedViews,
    components: detectComponents(allText.toLowerCase()),
  };

  return { tokens: doc, summary };
}
