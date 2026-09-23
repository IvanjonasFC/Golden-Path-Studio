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
import type { Blueprint, LibItem, ProjectView, ProjectSignal, TreeNode } from "./blueprint";
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

/* ---------------------------- library detection ----------------------------
   Clasificador de dependencias → CATEGORÍA de export + POLÍTICA. Objetivo: que
   `libraries.json` del pack diga de verdad el STACK del proyecto (framework, UI,
   build, styling, data, desktop/nativo, runtime…), no solo un puñado de libs
   conocidas. Reglas ordenadas (la primera que casa gana). Cubre el ecosistema
   JS/TS y el nativo/Python del corpus (Tauri, requirements.txt). Regla general,
   no hardcode por proyecto. */
type LibCategory =
  | "framework" | "ui" | "motion" | "routing" | "styling" | "build" | "data"
  | "data-fetching" | "state" | "forms" | "validation" | "testing" | "desktop"
  | "native" | "runtime" | "utils" | "other";
const DEP_RULES: { re: RegExp; category: LibCategory }[] = [
  { re: /^(react|react-dom|next|astro|vue|svelte|@sveltejs\/|solid-js|preact|nuxt|@angular\/|qwik|@builder\.io\/qwik|remix|@remix-run\/|gatsby|expo)$/i, category: "framework" },
  { re: /^(@tauri-apps\/|electron$|electron-builder|@neutralinojs)/i, category: "desktop" },
  { re: /^(@capacitor\/|cordova|@ionic\/)/i, category: "native" },
  { re: /^(recharts|chart\.js|chartjs|@nivo\/|visx|@visx\/|apexcharts|d3)$/i, category: "data" },
  { re: /^(framer-motion|motion|@react-spring\/|gsap|@formkit\/auto-animate|@motionone\/)/i, category: "motion" },
  { re: /^(@radix-ui\/|@headlessui\/|@mui\/|@chakra-ui\/|lucide(-react)?|@heroicons\/|sonner|vaul|cmdk|embla-carousel|react-icons|@nextui-org\/|@mantine\/|daisyui)/i, category: "ui" },
  { re: /^(tailwindcss|@tailwindcss\/|postcss|autoprefixer|sass|less|@fontsource(-variable)?\/|styled-components|@emotion\/|@stitches\/|unocss|clsx|tailwind-merge|class-variance-authority|cva)/i, category: "styling" },
  { re: /^(react-router|react-router-dom|@tanstack\/react-router|wouter|@reach\/router)$/i, category: "routing" },
  { re: /^(@tanstack\/react-query|swr|@apollo\/|urql|@trpc\/|ky|graphql-request)/i, category: "data-fetching" },
  { re: /^(@tanstack\/react-table|drizzle-orm|@prisma\/|prisma|mongoose|sequelize|kysely|typeorm|better-sqlite3|@supabase\/|firebase)/i, category: "data" },
  { re: /^(zustand|jotai|redux|@reduxjs\/|recoil|valtio|mobx|xstate)$/i, category: "state" },
  { re: /^(react-hook-form|formik|@hookform\/|final-form)/i, category: "forms" },
  { re: /^(zod|valibot|yup|superstruct|joi|ajv)$/i, category: "validation" },
  { re: /^(vite|@vitejs\/|webpack|rollup|esbuild|turbo|tsup|parcel|@swc\/|swc|tsx|typescript)$/i, category: "build" },
  { re: /^(vitest|jest|@testing-library\/|playwright|@playwright\/|cypress|mocha|chai)/i, category: "testing" },
  // Python / runtime nativo (requirements.txt).
  { re: /^(requests|httpx|aiohttp|urllib3)$/i, category: "data-fetching" },
  { re: /^(sqlalchemy|psycopg2?(-binary)?|asyncpg|aiosqlite|alembic|pymongo|redis|databases)$/i, category: "data" },
  { re: /^(fastapi|flask|django|uvicorn|gunicorn|starlette)$/i, category: "framework" },
  { re: /^(numpy|pandas|scipy|torch|tensorflow|transformers|faster-whisper|openai-whisper|whisper|ffsubsync|pydub|pyinstaller)$/i, category: "runtime" },
  { re: /^(openai|anthropic|ollama|langchain)/i, category: "data-fetching" },
  { re: /^(date-fns|dayjs|luxon|ramda|nanoid|uuid|immer)$/i, category: "utils" },
];
const DEP_STATUS: { re: RegExp; status: LibItem["status"] }[] = [
  { re: /^moment$/i, status: "blocked" },
  { re: /^(lodash|axios|request)$/i, status: "discouraged" },
];
function classifyDep(name: string): { category: string; status: LibItem["status"] } {
  return {
    category: DEP_RULES.find((r) => r.re.test(name))?.category ?? "other",
    status: DEP_STATUS.find((r) => r.re.test(name))?.status ?? "approved",
  };
}
/** Detecta el STACK real del proyecto: package.json (deps+devDeps) y
 *  requirements.txt (Python). Devuelve LibItem[] deduplicado y clasificado. */
function detectStack(files: ImportFile[]): LibItem[] {
  const out = new Map<string, LibItem>();
  const add = (raw: string) => {
    const name = raw.trim();
    if (!name || out.has(name)) return;
    const { category, status } = classifyDep(name);
    out.set(name, { name, category, status });
  };
  // TODOS los package.json (raíz + workspaces de un monorepo), no solo el primero.
  for (const pkgFile of files.filter((f) => /(^|\/)package\.json$/i.test(f.name))) {
    try {
      const j = JSON.parse(pkgFile.text) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      for (const nm of Object.keys({ ...(j.dependencies ?? {}), ...(j.devDependencies ?? {}) })) add(nm);
    } catch { /* package.json ilegible */ }
  }
  for (const r of files.filter((f) => /(^|\/)requirements[\w.-]*\.txt$/i.test(f.name))) {
    for (const line of r.text.split(/\r?\n/)) {
      if (/^\s*#/.test(line) || line.includes("://")) continue;
      const m = line.match(/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/);
      if (m) add(m[1]);
    }
  }
  return [...out.values()];
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

/* CONTENIDO vs UI (política ARCHITECTURE.md, regla 3): .md/.mdx y src/content/ son
   CONTENIDO — solo emiten la señal `collections`. Los patrones de UI (table, form,
   nav, sidebar…) solo se detectan en archivos de UI. */
const CONTENT_RE = /\.mdx?$/i;
function isContentFile(name: string): boolean {
  return CONTENT_RE.test(name) || /(^|\/)src\/content\//i.test(name);
}
const UI_FILE_RE = /\.(astro|tsx|jsx|mjs|cjs|js|ts|html|vue|svelte)$/i;

/* CÓDIGO BACKEND (política ARCHITECTURE.md, regla R-E): .py/.rs son código de
   servidor/sidecar. NO son UI ni rutas navegables. Solo pueden emitir señales del
   eje Datos (con patrones FUERTES), nunca vistas, secciones, tipo, colores ni
   tipografías. Se aíslan del escaneo genérico y se analizan aparte. */
const BACKEND_FILE_RE = /\.(py|rs)$/i;
function isBackendFile(name: string): boolean { return BACKEND_FILE_RE.test(name); }

/* R-A: un SELECTOR CSS (`.prose-portfolio table {…}`) NO es markup. Antes de buscar
   CUALQUIER patrón de UI (table/form/nav/sidebar…) se eliminan los bloques
   `<style>…</style>` (Astro/Vue/Svelte/HTML) y, de forma conservadora, los bloques
   CSS `{ … }`. Así una regla de estilo para tablas de contenido no crea una tabla
   de datos, ni una clase `.sidebar`/`.hero` inventa un bloque de layout. */
function stripStyle(src: string): string {
  if (!src) return src;
  // 1) <style ...>...</style> completos (incluye <style is:global>, scoped, lang=…).
  let out = src.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  // 2) <template>/JSX aparte: elimina bloques de reglas CSS sueltas `selector { … }`
  //    solo cuando el cuerpo parece CSS (contiene `:` y `;`), para no tocar JS/JSX.
  out = out.replace(/\{[^{}]*:[^{}]*;[^{}]*\}/g, " ");
  return out;
}

/* ¿El proyecto SIRVE en runtime? (política regla 2). Astro output server/hybrid,
   Next SSR / route handlers / force-dynamic. Si NO, las rutas [param] se generan en
   build (getStaticPaths) y NO son dynamic. */
function detectServerOutput(files: ImportFile[]): boolean {
  const cfg = files.find((f) => /(^|\/)astro\.config\.[mc]?[jt]s$/i.test(f.name));
  if (cfg && /\boutput\s*:\s*["'](server|hybrid)["']/i.test(cfg.text)) return true;
  const names = files.map((f) => f.name).join("\n");
  if (/(^|\/)(app|src\/app)\/api\//i.test(names) || /(^|\/)pages\/api\//i.test(names)) return true;
  const code = files.map((f) => f.text).join("\n");
  if (/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(code)) return true;
  if (/getServerSideProps/.test(code)) return true;
  return false;
}

/* ESTRUCTURA REAL del proyecto: reconstruye el árbol de carpetas/archivos a partir
   de las rutas realmente escaneadas (walkRepo ya excluyó node_modules/.git/dist/
   target/venv/dotfolders). Es el esqueleto HONESTO del proyecto — el que alimenta
   `project/tree.json` en el export. Acotado para que el editor sea usable. */
const STRUCT_MAX_CHILDREN = 14;
const STRUCT_MAX_DEPTH = 6;
const STRUCT_MAX_NODES = 120;
export function buildStructureTree(files: ImportFile[]): TreeNode[] {
  interface Dir { folders: Map<string, Dir>; files: Set<string>; hasPkg: boolean }
  const mkDir = (): Dir => ({ folders: new Map(), files: new Set(), hasPkg: false });
  const root = mkDir();
  for (const f of files) {
    const parts = f.name.replace(/\\/g, "/").split("/").filter(Boolean);
    if (!parts.length) continue;
    let d = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!d.folders.has(seg)) d.folders.set(seg, mkDir());
      d = d.folders.get(seg) as Dir;
    }
    const file = parts[parts.length - 1];
    d.files.add(file);
    if (file === "package.json") d.hasPkg = true;
  }
  let nodes = 0;
  const build = (d: Dir, depth: number): TreeNode[] => {
    const out: TreeNode[] = [];
    const folderNames = [...d.folders.keys()].sort((a, b) => a.localeCompare(b));
    const fileNames = [...d.files].sort((a, b) => a.localeCompare(b));
    const total = folderNames.length + fileNames.length;
    let shown = 0;
    const overflow = () => { out.push({ name: `… (+${total - shown})`, type: "file" }); };
    for (const name of folderNames) {
      if (nodes >= STRUCT_MAX_NODES) return out;
      if (shown >= STRUCT_MAX_CHILDREN) { overflow(); return out; }
      const sub = d.folders.get(name) as Dir;
      nodes++; shown++;
      const type: TreeNode["type"] = sub.hasPkg && depth > 0 ? "package" : "folder";
      out.push({ name, type, children: depth + 1 < STRUCT_MAX_DEPTH ? build(sub, depth + 1) : [] });
    }
    for (const name of fileNames) {
      if (nodes >= STRUCT_MAX_NODES) return out;
      if (shown >= STRUCT_MAX_CHILDREN) { overflow(); return out; }
      nodes++; shown++;
      out.push({ name, type: "file" });
    }
    return out;
  };
  return build(root, 0);
}

/* R-E: análisis de código BACKEND (.py/.rs). Estos archivos NO son UI ni rutas;
   solo pueden aportar señales del eje DATOS, y SOLO con patrones FUERTES (imports/
   llamadas reales), nunca por keywords sueltas. Distingue tres orígenes de datos:
   base de datos, cliente HTTP y puente IPC/sidecar (Tauri/subprocess). */
export interface BackendData { db: boolean; http: boolean; ipc: boolean; langs: string[]; sources: string[] }
export function detectBackendData(files: ImportFile[]): BackendData {
  const langs = new Set<string>();
  let db = false, http = false, ipc = false;
  for (const f of files) {
    if (/\.py$/i.test(f.name)) langs.add("python");
    if (/\.rs$/i.test(f.name)) langs.add("rust");
    const t = f.text;
    if (/\bsqlite3\b|\bpsycopg2?\b|\bsqlalchemy\b|\bsqlx\b|\brusqlite\b|\bdiesel\b|\bsea-orm\b|\bmongoengine\b/i.test(t)) db = true;
    if (/\brequests\b|\bhttpx\b|\baiohttp\b|\burllib(\.request|3)?\b|\bhttp\.client\b|\breqwest\b/i.test(t)) http = true;
    if (/#\[tauri::command\]|\binvoke_handler\b|\btauri::command\b|\bsidecar\b|Command::new|\bsubprocess\.|\bPyInstaller\b/i.test(t)) ipc = true;
  }
  const sources: string[] = [];
  if (db) sources.push("db (sqlite/sqlx/…)");
  if (http) sources.push("http-client (requests/reqwest/…)");
  if (ipc) sources.push("ipc/sidecar (tauri::command/invoke/subprocess)");
  return { db, http, ipc, langs: [...langs], sources };
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
  // R-E: los archivos backend (.py/.rs) se apartan del escaneo genérico (tipo,
  // rutas, UI, colores). Solo alimentan el eje Datos vía detectBackendData().
  const frontFiles = files.filter((f) => !isBackendFile(f.name));
  const backendFiles = files.filter((f) => isBackendFile(f.name));
  const paths = frontFiles.map((f) => f.name.toLowerCase());
  const pathsJoined = paths.join("\n");
  const code = frontFiles.map((f) => f.text).join("\n").toLowerCase();
  const libNames = new Set(libraries.map((l) => l.name.toLowerCase()));
  const hasPath = (re: RegExp) => re.test(pathsJoined);
  const inCode = (re: RegExp) => re.test(code);
  const hasStructure = paths.some((p) => p.includes("/")); // ¿tenemos rutas/carpetas?
  // Código SOLO de archivos de UI (excluye .md/.mdx, src/content y backend). Los
  // patrones de UI (table/form/nav/sidebar…) se buscan aquí; el contenido no los
  // emite (regla 3). R-A: se eliminan los bloques <style>/CSS antes de buscar, para
  // que un selector CSS (`.prose-portfolio table`) no cuente como markup.
  const uiCode = frontFiles.filter((f) => UI_FILE_RE.test(f.name) && !isContentFile(f.name)).map((f) => stripStyle(f.text)).join("\n").toLowerCase();
  const inUi = (re: RegExp) => re.test(uiCode);

  // Señales (cada una: hay evidencia en rutas y/o código de UI y/o deps).
  const sig = {
    landing: hasPath(/\(marketing\)|\/landing|\/pricing|\/(home)\//) || inUi(/hero|pricing|testimonial/),
    sidebar: hasPath(/\/dashboard(\/|$)|\/admin(\/|$)|\/(app)\//) || inUi(/sidebar|app-?shell/),
    tabs: hasPath(/\(tabs\)|\/mobile(\/|$)|bottom-?nav/) || inUi(/bottom-?nav|tabbar|tab-?bar/),
    auth: hasPath(/\(auth\)|\/login|\/register|\/sign-?in|\/sign-?up|\/auth(\/|$)/) || libNames.has("next-auth") || libNames.has("@clerk/nextjs") || [...libNames].some((n) => /clerk|lucia|supabase|firebase|auth/.test(n)),
    table: inUi(/data-?grid|datatable|<table|react-table/) || libNames.has("@tanstack/react-table") || hasPath(/\/table/),
    form: inUi(/<form|useform|react-hook-form/) || libNames.has("react-hook-form") || hasPath(/\/forms?(\/|$)/),
    charts: [...libNames].some((n) => /recharts|chart\.js|nivo|visx|apexcharts|d3/.test(n)) || inUi(/recharts|chart\.js/),
    settings: hasPath(/\/settings(\/|$)|\/ajustes(\/|$)/),
    modal: inUi(/\bmodal\b|\bdialog\b|\bdrawer\b|\bsheet\b/),
    cmdk: libNames.has("cmdk") || inUi(/command-?palette|cmdk|⌘k/),
    // Arquitectura por carpeta: cuenta también a NIVEL RAÍZ (apps/, packages/,
    // features/, services/…), no solo anidadas. `(?:^|[\n/])` cubre inicio de ruta
    // (las rutas van unidas por \n, sin flag /m) y carpeta anidada.
    monorepo: hasPath(/(?:^|[\n/])apps\//) && hasPath(/(?:^|[\n/])packages\//),
    features: hasPath(/(?:^|[\n/])features?\//),
    layers: hasPath(/(?:^|[\n/])(services|entities|shared)\//),
    motion: [...libNames].some((n) => /framer-motion|^motion$/.test(n)) || inUi(/framer-motion/),
    commerce: hasPath(/\/shop(\/|$)|\/store(\/|$)|\/products?(\/|$)|\/checkout(\/|$)|\/cart(\/|$)/) || inUi(/add[ -]?to[ -]?cart|checkout|addtocart/),
    blog: hasPath(/\/blog(\/|$)|\/posts?(\/|$)|\/articles?(\/|$)/), // solo rutas de blog reales; las content collections alimentan data.collections, NO el tipo
    // R-B: portfolio se decide por RUTA real (/projects, /proyectos, /portfolio, /work).
    // El keyword suelto («portfolio» en una clase CSS o en un texto) YA NO dispara el
    // tipo. Fallback documentado para sitios de UNA página sin rutas: una sección/grid
    // de proyectos REAL en el home (<section id=projects…>, ProjectGrid/ProjectCard)
    // basta para no degradar un portfolio de una página a «marketing».
    portfolio: hasPath(/\/projects?(\/|$)|\/proyectos(\/|$)|\/portfolio(\/|$)|\/work(\/|$)/)
      || inUi(/<section[^>]*\bid=["']?(projects|proyectos|portfolio|work)\b|<projectgrid\b|<projectcard\b/),
    docs: hasPath(/\/docs?(\/|$)|\/documentation(\/|$)/) || [...libNames].some((n) => /docusaurus|nextra|mintlify|starlight/.test(n)) || inUi(/docusaurus|nextra/),
    // R-D: archetipos de "cáscara nativa". Tauri/Electron → desktop; Capacitor/Android
    // → mobile (nativo). Se detectan por RUTA de proyecto (src-tauri/, tauri.conf,
    // android/) o por deps, no por prosa. Definen la NATURALEZA del artefacto.
    desktop: hasPath(/(^|\/)src-tauri(\/|$)|(^|\/)tauri\.conf\.(json|json5|toml)$|(^|\/)electron(\/|$)/)
      || inCode(/@tauri-apps|tauri-build|["']electron["']\s*:/) || [...libNames].some((n) => /^electron$/.test(n)),
    mobileNative: hasPath(/(^|\/)(android|ios)(\/|$)|capacitor\.config\./) || inCode(/@capacitor|\bcordova\b/),
    // Datos estructurados en archivos (regla 1 / R-C): alimenta el eje Datos, NUNCA
    // projectType. SOLO fuentes reales de content collections — un README.md o
    // CHANGELOG.md NUNCA cuenta (por eso no se mira `paths.some(*.md)`).
    collections: hasPath(/(^|\/)src\/content\//) || inCode(/getcollection|getstaticpaths|contentlayer/),
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
  // Content collections = datos estructurados en archivos (build-time). Van al eje
  // Datos, no al tipo ni a "dynamic" (regla 1). Campo libre para no acoplar el schema.
  if (sig.collections) { (data as Record<string, unknown>).collections = true; notes.push("Datos: content collections detectadas (datos estáticos en archivos) — eje Datos, no afecta al tipo."); }
  // R-E: los archivos backend (.py/.rs) solo pueden aportar aquí, en el eje Datos.
  if (backendFiles.length) {
    const be = detectBackendData(backendFiles);
    if (be.db || be.http || be.ipc) {
      const d = data as Record<string, unknown>;
      if (be.db) d.backendDb = true;
      if (be.http) d.backendHttp = true;
      if (be.ipc) d.sidecar = true;
      notes.push(`Datos: backend en ${be.langs.join("/") || "código nativo"} (${be.sources.join("; ")}) — eje Datos; no crea vistas ni cambia el tipo (R-E).`);
    }
  }
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
  // Capa "projectType": naturaleza GLOBAL del proyecto. Separada de las otras
  // capas: escenas/arquetipos de preview, vistas (views[]) y categorías de catálogo.
  const hasBackend = sig.auth || sig.commerce || sig.table || (sig.sidebar && (sig.table || sig.charts));
  type PType = "portfolio" | "marketing" | "content" | "docs" | "dashboard" | "crud" | "commerce" | "desktop" | "auth-app" | "mobile" | "static";
  let ptype: PType;
  let psource: string;
  // R-D: la "cáscara nativa" (desktop Tauri/Electron, mobile Capacitor/Android) define
  // la naturaleza del artefacto y gana sobre los tipos web genéricos (dashboard/portfolio…),
  // porque el empaquetado nativo es lo más específico y determinante del proyecto.
  if (sig.commerce) { ptype = "commerce"; psource = "rutas/código de tienda (product/cart/checkout)"; }
  else if (sig.desktop) { ptype = "desktop"; psource = "cáscara nativa de escritorio (src-tauri/tauri.conf/electron o deps @tauri-apps)"; }
  else if (sig.mobileNative) { ptype = "mobile"; psource = "cáscara nativa móvil (Capacitor/Android)"; }
  else if (sig.sidebar && (sig.table || sig.charts)) { ptype = "dashboard"; psource = "sidebar + tablas/charts"; }
  else if (sig.portfolio) { ptype = "portfolio"; psource = "rutas/sección real de portfolio (proyectos/work)"; }
  else if (sig.docs) { ptype = "docs"; psource = "rutas /docs o framework de documentación"; }
  else if (sig.blog) { ptype = "content"; psource = "rutas de blog/artículos"; }
  else if (sig.table) { ptype = "crud"; psource = "tablas de datos"; }
  else if (sig.auth) { ptype = "auth-app"; psource = "rutas/deps de auth"; }
  else if (sig.tabs) { ptype = "mobile"; psource = "tabs/navegación móvil"; }
  else if (sig.landing) { ptype = "marketing"; psource = "landing/marketing (hero/pricing) sin backend"; }
  else { ptype = "static"; psource = "sin señales claras (estático genérico)"; }
  // Se persiste en el blueprint: resolve.ts lo usa para relajar reglas de seguridad.
  (bp as { projectType?: string }).projectType = ptype;
  // Trazabilidad: registra que señales de tipo estaban activas y por que gano ptype.
  const _typeSignals = [
    sig.commerce && "commerce",
    sig.desktop && "desktop(nativo)",
    sig.mobileNative && "mobile(nativo)",
    (sig.sidebar && (sig.table || sig.charts)) && "dashboard",
    sig.portfolio && "portfolio",
    sig.docs && "docs",
    sig.blog && "blog",
    sig.table && "crud(table)",
    sig.auth && "auth",
    sig.tabs && "mobile(tabs)",
    sig.landing && "marketing(landing)",
  ].filter(Boolean) as string[];
  notes.push(`Tipo '${ptype}' (${psource}). Señales activas: ${_typeSignals.join(", ") || "ninguna"} — gana la de mayor prioridad de capa.`);

  const PT_LABEL: Record<PType, string> = {
    portfolio: "portfolio", marketing: "marketing / landing", content: "blog / contenido",
    docs: "documentación", dashboard: "workspace / dashboard", crud: "CRUD / app de datos",
    commerce: "e-commerce", desktop: "app de escritorio (nativa)", "auth-app": "app con auth",
    mobile: "mobile", static: "estático / genérico",
  };
  const productType: Inferred = {
    value: PT_LABEL[ptype],
    confidence: ptype !== "static" ? "strong" : "weak",
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
  if (sig.tabs || sig.mobileNative) scenes.push("mobile");
  if (sig.commerce) scenes.push("commerce");
  if (sig.blog) scenes.push("content");
  if (sig.settings) scenes.push("settings");
  // Desktop (Tauri/Electron): no hay escena "desktop" en el motor; su pantalla-marco
  // (sidebar + main) se previsualiza con el arquetipo "dashboard" (app-shell).
  if (sig.desktop && !scenes.includes("dashboard")) scenes.push("dashboard");
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
  if (/\bdocs?\b|documentation/.test(r)) return "content";
  if (/contact|about|projects?|proyectos|portfolio|work/.test(r)) return "portfolio";
  if (r === "/" || r === "") {
    const home: Record<string, SceneId> = { portfolio: "portfolio", marketing: "landing", content: "content", docs: "content", dashboard: "dashboard", crud: "dashboard", commerce: "commerce", desktop: "dashboard", "auth-app": "auth", mobile: "mobile", static: "portfolio" };
    return home[projectType] ?? "landing";
  }
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
/* ------------------------- secciones por vista (Fase 2) ------------------
   Detecta los BLOQUES de una vista (nav, hero, stats, projects, table, form,
   footer...) desde su codigo, en orden aproximado de aparicion. Cada seccion
   con confianza + fuente. `kind` es un registro EXTENSIBLE (string), no cerrado.
   ------------------------------------------------------------------------- */
const SECTION_SIGNALS: Array<{ kind: string; strong?: RegExp; weak?: RegExp }> = [
  { kind: "nav", strong: /<nav\b|<header\b/i, weak: /navbar|\bheader\b/i },
  { kind: "hero", weak: /\bhero\b/i },
  { kind: "stats", weak: /\bstats?\b|\bkpis?\b|\bmetrics?\b|counter/i },
  { kind: "projects", weak: /\bprojects?\b|\bproyectos?\b|portfolio|\bwork\b/i },
  { kind: "features", weak: /\bfeatures?\b/i },
  { kind: "gallery", weak: /\bgallery\b|carousel/i },
  { kind: "pricing", weak: /\bpricing\b|\bprice\b/i },
  { kind: "testimonials", weak: /testimonial/i },
  { kind: "table", strong: /<table\b/i, weak: /data-?grid|datatable|react-table|\bDataTable\b/i },
  { kind: "filters", weak: /\bfilters?\b|facet/i },
  { kind: "chart", weak: /\bchart\b|recharts/i },
  { kind: "form", strong: /<form\b/i, weak: /\bcontact\b|use-?form|react-hook-form/i },
  { kind: "faq", weak: /\bfaq\b|accordion/i },
  { kind: "sidebar", strong: /<aside\b/i, weak: /\bsidebar\b/i },
  { kind: "footer", strong: /<footer\b/i, weak: /\bfooter\b/i },
];

function detectSections(src: string, isContent = false): { id: string; kind: string; confidence: "strong" | "weak"; source: string }[] {
  if (!src || isContent) return [];   // contenido (md/mdx) no emite bloques de UI (regla 3)
  src = stripStyle(src);              // R-A: un selector CSS no es un bloque de UI
  const found: Array<{ kind: string; idx: number; conf: "strong" | "weak"; ev: string }> = [];
  for (const sig of SECTION_SIGNALS) {
    let idx = -1; let conf: "strong" | "weak" = "weak"; let ev = "";
    const sec = src.search(new RegExp(`<section[^>]*\\bid=["']?${sig.kind}`, "i"));
    if (sec >= 0) { idx = sec; conf = "strong"; ev = "<section id>"; }
    if (idx < 0 && sig.strong) { const m = src.search(sig.strong); if (m >= 0) { idx = m; conf = "strong"; ev = "tag semantico"; } }
    if (idx < 0 && sig.weak) { const m = src.search(sig.weak); if (m >= 0) { idx = m; conf = "weak"; ev = "nombre/keyword"; } }
    if (idx >= 0) found.push({ kind: sig.kind, idx, conf, ev });
  }
  found.sort((a, b) => a.idx - b.idx);
  return found.slice(0, 12).map((f) => ({ id: f.kind, kind: f.kind, confidence: f.conf, source: f.ev }));
}

function detectData(src: string, isContent = false, runtimeServing = false, nativeShell = false): ProjectSignal[] {
  if (!src) return [];
  if (isContent) {
    // Contenido (md/mdx/src/content) = datos estáticos en archivos → solo collections (reglas 1 y 3).
    return [
      { kind: "static", confidence: "weak", source: "contenido estático (archivos)" },
      { kind: "collections", confidence: "strong", source: "content collection (.md/.mdx)" },
    ];
  }
  src = stripStyle(src);   // R-A: no confundir reglas CSS (.datatable{…}) con UI de datos
  const SIG: Array<{ kind: string; strong?: RegExp; weak?: RegExp }> = [
    { kind: "forms", strong: /<form\b|use-?form|react-hook-form|\bformik\b/i, weak: /\bform\b/i },
    { kind: "tables", strong: /<table\b|@tanstack\/react-table|data-?grid|datatable|react-table/i },
    { kind: "filters", weak: /\bfilters?\b|\bfacet|use-?filter/i },
    { kind: "collections", strong: /getcollection|getstaticpaths|contentlayer|allposts|alldocs/i, weak: /\bcollection|\.mdx?\b|\bposts?\b/i },
    { kind: "fetch", strong: /\bfetch\(|useswr|usequery|react-query|@tanstack\/react-query|\baxios\b|getserversideprops|getstaticprops|use server/i, weak: /\.json\(\)|\/api\//i },
    { kind: "backend", strong: /\bprisma\b|drizzle|mongoose|supabase|firestore/i, weak: /\bdatabase\b|\bdb\./i },
    { kind: "search", strong: /fuse\.js|command-?palette|\bcmdk\b/i, weak: /\bsearch\b/i },
    { kind: "sort", weak: /\bsort\b|order-?by|orderby/i },
    { kind: "pagination", strong: /useinfinitequery|\bcursor\b/i, weak: /pagination|load-?more/i },
  ];
  const out: ProjectSignal[] = [];
  for (const s of SIG) {
    if (s.strong && s.strong.test(src)) out.push({ kind: s.kind, confidence: "strong", source: "dep/API/tag" });
    else if (s.weak && s.weak.test(src)) out.push({ kind: s.kind, confidence: "weak", source: "nombre/keyword" });
  }
  // dynamic (regla 2) = SERVING en runtime: fetch/API/DB, o framework en server/hybrid.
  // collections y tables NO cuentan (son datos estáticos / UI). getStaticPaths ⇒ static.
  const prerendered = /getstaticpaths/i.test(src);
  const runtimeData = out.some((o) => ["fetch", "backend"].includes(o.kind));
  // R-D: una app nativa (desktop/mobile) NO sirve rutas web; sus datos llegan por
  // IPC/sidecar (eje Datos), así que la vista es estática, no runtime-dynamic.
  const dynamic = !prerendered && !nativeShell && (runtimeServing || runtimeData);
  out.unshift(dynamic
    ? { kind: "dynamic", confidence: "strong", source: runtimeServing ? "framework en modo server/hybrid" : "fetch/API/DB en runtime" }
    : { kind: "static", confidence: "weak", source: nativeShell ? "app nativa (datos por IPC/sidecar, no serving web)" : prerendered ? "getStaticPaths (generada en build)" : "sin serving en runtime" });
  return out;
}

function detectInteraction(src: string): ProjectSignal[] {
  if (!src) return [];
  src = stripStyle(src);   // R-A: clases CSS (.modal, .drawer…) no son interacción real
  const SIG: Array<{ kind: string; strong?: RegExp; weak?: RegExp }> = [
    { kind: "navigation", strong: /<nav\b|use-?router|next\/link|react-router|<navlink/i, weak: /\bnavigation\b|navbar/i },
    { kind: "tabs", strong: /role=["']tab|<tabs\b|@radix-ui\/react-tabs/i, weak: /\btabs?\b/i },
    { kind: "drawers", strong: /<drawer\b|\bvaul\b/i, weak: /\bdrawer\b|\bsheet\b/i },
    { kind: "modals", strong: /<dialog\b|role=["']dialog|<modal\b|@radix-ui\/react-dialog/i, weak: /\bmodal\b|\bdialog\b/i },
    { kind: "multiStep", strong: /\bstepper\b|multi-?step|use-?steps/i, weak: /\bwizard\b/i },
    { kind: "search", strong: /type=["']search|fuse\.js|use-?search/i, weak: /\bsearch\b/i },
    { kind: "commandPalette", strong: /\bcmdk\b|command-?palette|\bkbar\b/i, weak: /ctrl\+k/i },
    { kind: "motion", strong: /framer-motion|\bmotion\.|use-?animation|\bgsap\b|@react-spring|auto-?animate/i, weak: /\banimate\b/i },
    { kind: "menus", strong: /dropdown-?menu|@radix-ui\/react-dropdown|context-?menu|<popover/i, weak: /\bdropdown\b|\bpopover\b/i },
    { kind: "filtersInteractive", strong: /use-?filter|on-?filter|faceted/i, weak: /\bfilters?\b/i },
  ];
  const out: ProjectSignal[] = [];
  for (const s of SIG) {
    if (s.strong && s.strong.test(src)) out.push({ kind: s.kind, confidence: "strong", source: "dep/API/tag" });
    else if (s.weak && s.weak.test(src)) out.push({ kind: s.kind, confidence: "weak", source: "nombre/keyword" });
  }
  return out;
}

export function detectViews(files: ImportFile[], projectType: string): ProjectView[] {
  const norm = (r: string) => { r = ("/" + r.replace(/^\/+/, "")).replace(/\/{2,}/g, "/"); return r.length > 1 ? r.replace(/\/$/, "") : "/"; };
  // R-E: los archivos backend (.py/.rs) nunca generan vistas ni bloques de UI.
  const front = files.filter((f) => !isBackendFile(f.name));
  const runtimeServing = detectServerOutput(front);   // regla 2: ¿sirve en runtime?
  const nativeShell = projectType === "desktop";      // R-D: app nativa → vistas estáticas
  const seen = new Map<string, ProjectView>();
  const add = (rawRoute: string, src: string, router: string, conf: "strong" | "default", isContent = false) => {
    const route = norm(rawRoute);
    if (seen.has(route)) return;
    const title = extractViewTitle(src);
    const sections = detectSections(src, isContent);
    const data = detectData(src, isContent, runtimeServing, nativeShell);
    const interaction = isContent ? [] : detectInteraction(src);
    // dynamic = serving REAL (lo decide detectData), no la forma [param] de la ruta (regla 2).
    const dynamic = data[0]?.kind === "dynamic";
    seen.set(route, {
      id: slugifyRoute(route),
      route,
      ...(title ? { title } : {}),
      previewArchetype: archetypeForRoute(route, projectType),
      ...(dynamic ? { dynamic: true } : {}),
      ...(sections.length ? { sections } : {}),
      ...(data.length ? { data } : {}),
      ...(interaction.length ? { interaction } : {}),
      confidence: conf,
      source: router === "one-page" ? "sitio de una pagina (sin rutas)" : "ruta " + router,
    });
  };
  for (const f of front) {
    const r = routeOf(f.name);
    if (r) add(r.route, f.text, r.router, "strong", isContentFile(f.name));
  }
  // Sitio de una sola página: la vista "/" se arma SOLO con código de UI. El
  // contenido (.md/.mdx, README) es datos, no markup (regla 3), así que no
  // contamina los bloques/datos de la vista.
  const uiFront = front.filter((f) => !isContentFile(f.name));
  if (seen.size === 0) {
    const code = uiFront.map((f) => f.text).join("\n");
    for (const m of code.matchAll(/<Route\s+[^>]*\bpath=["'`]([^"'`]+)["'`]/g)) add(m[1], "", "router", "strong");
  }
  if (seen.size === 0) add("/", uiFront.map((f) => f.text).join("\n"), "one-page", "default");
  return [...seen.values()].slice(0, 40);
}

/* --------------------------------- extract --------------------------------- */
export function extractIdentity(files: ImportFile[]): ImportResult {
  const notes: string[] = [];
  // R-E: los archivos backend (.py/.rs) no aportan identidad visual ni componentes.
  const frontFiles = files.filter((f) => !isBackendFile(f.name));
  const styleText = frontFiles.filter((f) => /\.(css|scss|less|js|jsx|ts|tsx|html|svelte|vue|astro)$/i.test(f.name) || /tailwind|globals|theme|tokens/i.test(f.name)).map((f) => f.text).join("\n");
  const allText = frontFiles.map((f) => f.text).join("\n");

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
  const libraries = detectStack(files);   // stack real: package.json + requirements.txt

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
  // Estructura real del proyecto (semilla honesta del árbol / export tree.json).
  const detectedTree = buildStructureTree(files);
  if (detectedTree.length) mergedBp.architecture = { ...(mergedBp.architecture ?? {}), detectedTree };
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
    components: detectComponents(stripStyle(allText).toLowerCase()),   // R-A: sin CSS
  };

  return { tokens: doc, summary };
}
