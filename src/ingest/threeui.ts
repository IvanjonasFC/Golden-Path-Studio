import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import type { SourceAdapter, IngestItem, IngestContext } from "./util";

const REPO = "https://github.com/MengTo/threeui.git";
const CACHE = resolve(process.env.THREEUI_CACHE ?? "./.cache/threeui");
const SHADERS_FILE = "src/data/shaders.tsx";

const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".htm",
  ".glsl", ".frag", ".vert", ".json", ".md", ".txt",
]);
const MAX_FILE = 260_000; // evita inlinear bundles enormes (p.ej. three.min.js)

function ensureRepo(ctx: IngestContext) {
  if (existsSync(join(CACHE, ".git"))) {
    ctx.log("Actualizando repo de ThreeUI (git pull)...");
    try {
      execFileSync("git", ["-C", CACHE, "pull", "--ff-only"], { stdio: "ignore" });
      return;
    } catch {
      ctx.log("git pull fallo; se reutiliza el cache existente.");
      return;
    }
  }
  mkdirSync(CACHE, { recursive: true });
  ctx.log("Clonando repo de ThreeUI (shallow)...");
  execFileSync("git", ["clone", "--depth", "1", REPO, CACHE], { stdio: "ignore" });
}

/**
 * Extrae todos los objetos JSON incrustados en shaders.tsx. Cada entrada tiene
 * la forma `{ ...{ <JSON valido> } }`. Escaneamos las llaves respetando strings
 * (comillas dobles con escapes) para no romper con `{`/`}` dentro de textos.
 */
function extractJsonObjects(src: string): any[] {
  const out: any[] = [];
  const marker = "...{";
  let i = 0;
  while ((i = src.indexOf(marker, i)) !== -1) {
    const start = i + marker.length - 1; // posicion del "{" interno
    let depth = 0;
    let inStr = false;
    let esc = false;
    let j = start;
    for (; j < src.length; j++) {
      const ch = src[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
    }
    const raw = src.slice(start, j);
    try {
      out.push(JSON.parse(raw));
    } catch {
      /* entrada no parseable: se ignora */
    }
    i = j;
  }
  return out;
}

/** Limpia "ruta — comentario" -> "ruta". */
function cleanSourcePath(entry: string): string {
  return entry.split(/\s+[—-]\s+/)[0].trim();
}

function collectDirFiles(dir: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    try {
      if (!statSync(abs).isFile()) continue;
      if (!TEXT_EXT.has(extname(name).toLowerCase())) continue;
      if (statSync(abs).size > MAX_FILE) continue;
      files.push({ path: name, content: readFileSync(abs, "utf8") });
    } catch {
      /* ignore */
    }
  }
  return files;
}

export const threeuiAdapter: SourceAdapter = {
  key: "threeui",
  label: "ThreeUI (Three.js / React, MIT)",
  async collect(ctx) {
    ensureRepo(ctx);
    const src = readFileSync(join(CACHE, SHADERS_FILE), "utf8");
    const objects = extractJsonObjects(src);
    ctx.log(`  ${objects.length} entradas encontradas en shaders.tsx`);

    const items: IngestItem[] = [];
    const seen = new Set<string>();

    for (const o of objects) {
      if (!o || typeof o.id !== "string") continue;
      if (o.variantOf) continue; // es una variante de otra
      if (seen.has(o.id)) continue;
      seen.add(o.id);

      // Resolver ficheros fuente reales.
      const files: Array<{ path: string; content: string }> = [];
      const declared: string[] = Array.isArray(o.sourceFiles) ? o.sourceFiles : [];
      for (const entry of declared) {
        const rel = cleanSourcePath(entry);
        const abs = join(CACHE, rel);
        try {
          if (!existsSync(abs) || !statSync(abs).isFile()) continue;
          if (!TEXT_EXT.has(extname(rel).toLowerCase())) continue;
          if (statSync(abs).size > MAX_FILE) continue;
          files.push({ path: rel.replace(/^src\//, ""), content: readFileSync(abs, "utf8") });
        } catch {
          /* ignore */
        }
      }
      // Fallback: carpeta del shader.
      if (files.length === 0) {
        for (const f of collectDirFiles(join(CACHE, "src/shaders", o.id))) files.push(f);
      }
      if (files.length === 0) continue; // sin codigo utilizable

      const primary = declared.length ? cleanSourcePath(declared[0]) : `src/shaders/${o.id}`;
      const tags: string[] = Array.isArray(o.tags) ? o.tags.slice(0, 14) : ["three.js", "3d"];

      items.push({
        id: `threeui:${o.category ?? "3D"}:${o.id}`,
        source: "threeui",
        platform: "react",
        framework: "three.js",
        name: o.label ?? o.id,
        slug: o.id,
        category: o.category ?? "3D",
        type: (o.category === "Landing Pages" ? "landing-page" : "registry:ui"),
        author: "Meng To / ThreeUI",
        license: "MIT",
        description: o.description ?? null,
        tags,
        dependencies: ["three"],
        registryDependencies: [],
        files,
        previewHtml: null,
        thumbnail: typeof o.thumbnail === "string" ? o.thumbnail : null,
        sourceUrl: `https://github.com/MengTo/threeui/blob/main/${primary}`,
        installCommand: null, // copiar la fuente
      });
    }

    return items;
  },
};
