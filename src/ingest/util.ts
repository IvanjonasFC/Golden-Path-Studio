import { sqlite, initDb } from "../db/index";
import type { ComponentFile } from "../lib/types";

/** Lo que un adaptador produce por componente (antes de serializar a SQLite). */
export interface IngestItem {
  id: string;
  source: string;
  platform: string;
  framework: string;
  name: string;
  slug: string;
  category: string;
  type: string;
  author?: string | null;
  license?: string | null;
  description?: string | null;
  tags?: string[];
  dependencies?: string[];
  registryDependencies?: string[];
  files: ComponentFile[];
  previewHtml?: string | null;
  thumbnail?: string | null;
  sourceUrl?: string | null;
  installCommand?: string | null;
}

/** Contrato de una fuente. Anadir una web/stack nuevo = implementar esto. */
export interface SourceAdapter {
  /** clave estable, usada en CLI y en la columna `source` */
  key: string;
  /** etiqueta legible */
  label: string;
  /** devuelve todos los componentes de la fuente */
  collect(ctx: IngestContext): Promise<IngestItem[]>;
}

export interface IngestContext {
  log: (msg: string) => void;
}

initDb();

const upsertStmt = sqlite.prepare(`
  INSERT INTO components (
    id, source, platform, framework, name, slug, category, type,
    author, license, description, tags, dependencies, registry_dependencies,
    files, preview_html, thumbnail, source_url, install_command, ingested_at
  ) VALUES (
    @id, @source, @platform, @framework, @name, @slug, @category, @type,
    @author, @license, @description, @tags, @dependencies, @registry_dependencies,
    @files, @preview_html, @thumbnail, @source_url, @install_command, @ingested_at
  )
  ON CONFLICT(id) DO UPDATE SET
    source=excluded.source, platform=excluded.platform, framework=excluded.framework,
    name=excluded.name, slug=excluded.slug, category=excluded.category, type=excluded.type,
    author=excluded.author, license=excluded.license, description=excluded.description,
    tags=excluded.tags, dependencies=excluded.dependencies,
    registry_dependencies=excluded.registry_dependencies, files=excluded.files,
    preview_html=excluded.preview_html, thumbnail=excluded.thumbnail,
    source_url=excluded.source_url,
    install_command=excluded.install_command, ingested_at=excluded.ingested_at
`);

/** Inserta/actualiza un lote entero dentro de una transaccion (rapido). */
export function upsertMany(items: IngestItem[]): number {
  const now = Date.now();
  const run = sqlite.transaction((batch: IngestItem[]) => {
    for (const it of batch) {
      upsertStmt.run({
        id: it.id,
        source: it.source,
        platform: it.platform,
        framework: it.framework,
        name: it.name,
        slug: it.slug,
        category: it.category,
        type: it.type,
        author: it.author ?? null,
        license: it.license ?? null,
        description: it.description ?? null,
        tags: JSON.stringify(it.tags ?? []),
        dependencies: JSON.stringify(it.dependencies ?? []),
        registry_dependencies: JSON.stringify(it.registryDependencies ?? []),
        files: JSON.stringify(it.files ?? []),
        preview_html: it.previewHtml ?? null,
        thumbnail: it.thumbnail ?? null,
        source_url: it.sourceUrl ?? null,
        install_command: it.installCommand ?? null,
        ingested_at: now,
      });
    }
  });
  run(items);
  return items.length;
}

/** Borra todos los componentes de una fuente (para reingesta limpia). */
export function purgeSource(source: string): number {
  return sqlite.prepare("DELETE FROM components WHERE source = ?").run(source)
    .changes;
}

/** slugify basico para ids/nombres. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** fetch con user-agent de navegador y reintentos. */
export async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 component-vault",
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}
