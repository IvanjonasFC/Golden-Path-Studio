import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SourceAdapter, IngestItem, IngestContext } from "./util";
import { slugify } from "./util";

const REPO = "https://github.com/uiverse-io/galaxy.git";
const CACHE = resolve(process.env.UIVERSE_CACHE ?? "./.cache/galaxy");

// Carpetas del repo que contienen elementos (el resto se ignora).
const CATEGORY_DIRS = [
  "Buttons",
  "Cards",
  "Checkboxes",
  "Forms",
  "Inputs",
  "Notifications",
  "Patterns",
  "Radio-buttons",
  "Toggle-switches",
  "Tooltips",
  "loaders",
];

function ensureRepo(ctx: IngestContext) {
  if (existsSync(join(CACHE, ".git"))) {
    ctx.log("Actualizando repo de Uiverse (git pull)...");
    try {
      execFileSync("git", ["-C", CACHE, "pull", "--ff-only", "--depth", "1"], {
        stdio: "ignore",
      });
      return;
    } catch {
      ctx.log("git pull fallo; se reutiliza el cache existente.");
      return;
    }
  }
  mkdirSync(CACHE, { recursive: true });
  ctx.log("Clonando repo de Uiverse (~3.700 elementos, shallow)...");
  execFileSync("git", ["clone", "--depth", "1", REPO, CACHE], {
    stdio: "ignore",
  });
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/-\d+$/, "") // quita el numero final
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Extrae los tags del comentario "From Uiverse.io by X - Tags: a, b, c". */
function extractTags(html: string): string[] {
  const m = html.match(/Tags?:\s*([^*\-\n][^*\n]*?)(?:\*\/|-->)/i);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/** Envuelve el snippet en un documento renderizable en iframe. */
function buildPreview(html: string, framework: string): string {
  const tailwindCdn =
    framework === "tailwind"
      ? '<script src="https://cdn.tailwindcss.com"></script>'
      : "";
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${tailwindCdn}
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{display:grid;place-items:center;min-height:100vh;
    background:#0b0b0f;color:#eee;font-family:system-ui,sans-serif;padding:24px}
</style></head><body>
${html}
</body></html>`;
}

export const uiverseAdapter: SourceAdapter = {
  key: "uiverse",
  label: "Uiverse.io (CSS/Tailwind, MIT)",
  async collect(ctx) {
    ensureRepo(ctx);
    const items: IngestItem[] = [];

    for (const dir of CATEGORY_DIRS) {
      const abs = join(CACHE, dir);
      if (!existsSync(abs)) continue;
      const files = readdirSync(abs).filter((f) => f.endsWith(".html"));
      for (const file of files) {
        const raw = readFileSync(join(abs, file), "utf8").trim();
        const base = file.replace(/\.html$/, "");
        const cut = base.lastIndexOf("_"); // slug nunca tiene "_"
        const author = cut > 0 ? base.slice(0, cut) : "unknown";
        const slugFull = cut > 0 ? base.slice(cut + 1) : base;

        const framework = /<style[\s>]/i.test(raw) ? "css" : "tailwind";
        const tags = extractTags(raw);

        items.push({
          id: `uiverse:${dir}:${base}`,
          source: "uiverse",
          platform: "web",
          framework,
          name: titleFromSlug(slugFull),
          slug: slugFull,
          category: dir === "loaders" ? "Loaders" : dir,
          type: "css-snippet",
          author,
          license: "MIT",
          description: `Elemento "${titleFromSlug(slugFull)}" (${framework}) de ${author} en Uiverse.`,
          tags: tags.length ? tags : [dir.toLowerCase().replace(/s$/, "")],
          dependencies: [],
          registryDependencies: [],
          files: [{ path: `${slugify(slugFull)}.html`, content: raw }],
          previewHtml: buildPreview(raw, framework),
          sourceUrl: `https://uiverse.io/${author}/${slugFull}`,
          installCommand: null, // copiar/pegar
        });
      }
      ctx.log(`  ${dir}: ${files.length} elementos`);
    }

    return items;
  },
};
