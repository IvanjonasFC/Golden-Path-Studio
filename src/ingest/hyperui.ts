import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SourceAdapter, IngestItem, IngestContext } from "./util";

const REPO = "https://github.com/markmead/hyperui.git";
const CACHE = resolve(process.env.HYPERUI_CACHE ?? "./.cache/hyperui");
const EXAMPLES = "public/examples";

function ensureRepo(ctx: IngestContext) {
  if (existsSync(join(CACHE, ".git"))) {
    ctx.log("Actualizando repo de HyperUI (git pull)...");
    try {
      execFileSync("git", ["-C", CACHE, "pull", "--ff-only"], { stdio: "ignore" });
      return;
    } catch {
      ctx.log("git pull fallo; se reutiliza el cache existente.");
      return;
    }
  }
  mkdirSync(CACHE, { recursive: true });
  ctx.log("Clonando repo de HyperUI (shallow)...");
  execFileSync("git", ["clone", "--depth", "1", REPO, CACHE], { stdio: "ignore" });
}

function titleCase(s: string): string {
  return s
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Inyecta Tailwind CDN en el <head> para que el snippet renderice en iframe. */
function buildPreview(html: string): string {
  const cdn = '<script src="https://cdn.tailwindcss.com"></script>';
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n${cdn}`);
  }
  return `<!doctype html><html><head>${cdn}</head><body>${html}</body></html>`;
}

/** Recorre public/examples y devuelve rutas relativas de todos los .html. */
function walkHtml(root: string): string[] {
  const out: string[] = [];
  const rec = (dir: string, rel: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) rec(abs, relPath);
      else if (name.endsWith(".html")) out.push(relPath);
    }
  };
  if (existsSync(root)) rec(root, "");
  return out;
}

export const hyperuiAdapter: SourceAdapter = {
  key: "hyperui",
  label: "HyperUI (Tailwind, MIT)",
  async collect(ctx) {
    ensureRepo(ctx);
    const root = join(CACHE, EXAMPLES);
    const rels = walkHtml(root);
    ctx.log(`  ${rels.length} snippets .html encontrados`);

    const items: IngestItem[] = [];
    for (const rel of rels) {
      // rel = "<group>/<name>/<variant>.html"  (a veces mas profundo)
      const parts = rel.split("/");
      if (parts.length < 3) continue;
      const group = parts[0];
      const name = parts[1];
      const variant = parts[parts.length - 1].replace(/\.html$/, "");

      const raw = readFileSync(join(root, rel), "utf8");
      const label = `${titleCase(name)} #${variant}`;

      items.push({
        id: `hyperui:${name}:${group}-${name}-${variant}`,
        source: "hyperui",
        platform: "web",
        framework: "tailwind",
        name: label,
        slug: `${group}-${name}-${variant}`,
        category: titleCase(name),
        type: "html-snippet",
        author: "HyperUI (Mark Mead)",
        license: "MIT",
        description: `Componente Tailwind "${titleCase(name)}" (grupo ${group}) de HyperUI.`,
        tags: [group, name, "tailwind"],
        dependencies: [],
        registryDependencies: [],
        files: [{ path: `${group}-${name}-${variant}.html`, content: raw }],
        previewHtml: buildPreview(raw),
        thumbnail: null,
        sourceUrl: `https://github.com/markmead/hyperui/blob/main/${EXAMPLES}/${rel}`,
        installCommand: null,
      });
    }

    return items;
  },
};
