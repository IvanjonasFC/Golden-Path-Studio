/* ============================================================================
   walkRepo — recorrido determinista del repo (Node, capa local). Compartido por
   el CLI `scan-repo` y el servicio `scan-serve`. Ignora lo pesado/privado
   (node_modules, .git, dist, .env, …) y devuelve solo texto analizable.
   ============================================================================ */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ImportFile } from "../src/lib/importBrand";

export const TEXT_RE = /\.(css|scss|less|js|jsx|ts|tsx|mjs|cjs|json|md|mdx|html|svelte|vue|astro|txt)$/i;
export const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "out", "coverage", ".turbo", ".vercel", ".cache", ".svelte-kit", ".astro"]);
// Nunca leer secretos ni lockfiles ruidosos.
const SKIP_FILES = /(^|\/)(\.env(\..*)?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i;
const MAX_FILES = 4000;
const MAX_BYTES = 2_000_000;

async function walk(dir: string, root: string, acc: ImportFile[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (acc.length >= MAX_FILES) return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      await walk(full, root, acc);
    } else if (e.isFile() && TEXT_RE.test(e.name)) {
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (SKIP_FILES.test("/" + rel)) continue;
      try {
        const st = await fs.stat(full);
        if (st.size > MAX_BYTES) continue;
        acc.push({ name: rel, text: await fs.readFile(full, "utf8") });
      } catch { /* ilegible: se ignora */ }
    }
  }
}

/** Recorre `root` y devuelve los archivos de texto analizables (relativos a root). */
export async function collectFiles(root: string): Promise<ImportFile[]> {
  const acc: ImportFile[] = [];
  await walk(root, root, acc);
  return acc;
}

/* ---------------------------------------------------------------------------
   deriveRoutes — infiere rutas navegables a partir de las convenciones de
   fichero del framework (sin ejecutar nada). Conservador y honesto:
     · solo rutas ESTÁTICAS (descarta dinámicas [param], (grupos), catch-all)
     · siempre incluye "/"
     · deduplica y limita (crawl pequeño y robusto)
   Cubre Next (app y pages), Astro, SvelteKit, Nuxt/Vue y HTML plano.
--------------------------------------------------------------------------- */
const MAX_ROUTES = 12;

/** ¿El segmento es dinámico o un grupo que no forma parte de la URL? */
function isDynamicSeg(seg: string): boolean {
  return seg.startsWith("[") || seg.startsWith(":") || (seg.startsWith("(") && seg.endsWith(")"));
}
/** Los grupos `(marketing)` existen en disco pero NO en la URL: se eliminan. */
function stripGroups(segs: string[]): string[] {
  return segs.filter((s) => !(s.startsWith("(") && s.endsWith(")")));
}
function normRoute(segs: string[]): string {
  const clean = stripGroups(segs).filter(Boolean);
  return "/" + clean.join("/");
}
/** ¿Alguno de los segmentos es dinámico? (entonces descartamos la ruta) */
function hasDynamic(segs: string[]): boolean {
  return stripGroups(segs).some(isDynamicSeg);
}

export function deriveRoutes(files: ImportFile[]): string[] {
  const routes = new Set<string>(["/"]);
  const add = (segs: string[]) => {
    if (routes.size > MAX_ROUTES) return;
    if (hasDynamic(segs)) return;                 // solo estáticas
    const r = normRoute(segs);
    if (r) routes.add(r === "//" ? "/" : r);
  };

  for (const f of files) {
    const p = f.name.replace(/\\/g, "/");
    let m: RegExpMatchArray | null;

    // Next App Router: (src/)?app/<...>/page.(tsx|jsx|ts|js|mdx)
    if ((m = p.match(/(?:^|\/)app\/(.*)\/page\.(?:tsx|jsx|ts|js|mdx)$/))) {
      add(m[1].split("/")); continue;
    }
    // Next App Router raíz: (src/)?app/page.*
    if (/(?:^|\/)app\/page\.(?:tsx|jsx|ts|js|mdx)$/.test(p)) { add([]); continue; }

    // Next Pages Router: (src/)?pages/<...>.(tsx|jsx|ts|js) (excluye _app,_document,api)
    if ((m = p.match(/(?:^|\/)pages\/(.*)\.(?:tsx|jsx|ts|js|mdx)$/))) {
      const rel = m[1];
      if (/^_|(?:^|\/)_/.test(rel) || rel.startsWith("api/") || rel.includes("/api/")) continue;
      const segs = rel === "index" ? [] : rel.replace(/\/index$/, "").split("/");
      add(segs); continue;
    }

    // Astro: (src/)?pages/<...>.astro | .md | .mdx
    if ((m = p.match(/(?:^|\/)src\/pages\/(.*)\.(?:astro|md|mdx|html)$/))) {
      const rel = m[1];
      if (rel.startsWith("api/") || rel.includes("/api/")) continue;
      const segs = rel === "index" ? [] : rel.replace(/\/index$/, "").split("/");
      add(segs); continue;
    }

    // SvelteKit: (src/)?routes/<...>/+page.svelte  (raíz: routes/+page.svelte)
    if ((m = p.match(/(?:^|\/)routes\/(.*)\/\+page\.svelte$/))) { add(m[1].split("/")); continue; }
    if (/(?:^|\/)routes\/\+page\.svelte$/.test(p)) { add([]); continue; }

    // Nuxt/Vue: (src/)?pages/<...>.vue
    if ((m = p.match(/(?:^|\/)pages\/(.*)\.vue$/))) {
      const rel = m[1];
      const segs = rel === "index" ? [] : rel.replace(/\/index$/, "").split("/");
      add(segs); continue;
    }

    // HTML plano en raíz o /public: index.html → "/", about.html → "/about"
    if ((m = p.match(/^(?:public\/)?([\w-]+)\.html$/))) {
      add(m[1] === "index" ? [] : [m[1]]); continue;
    }
  }

  // "/" primero, resto ordenado y recortado.
  const ordered = ["/", ...[...routes].filter((r) => r !== "/").sort()];
  return ordered.slice(0, MAX_ROUTES);
}
