import type { SourceAdapter, IngestItem, IngestContext } from "./util";
import { fetchJson } from "./util";
import { guessCategory } from "./categorize";

/** Item resuelto del registro shadcn (con contenido de ficheros). */
interface RegistryItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files?: Array<{ path: string; content?: string; type?: string; target?: string }>;
}

interface RegistryIndex {
  name?: string;
  homepage?: string;
  items: Array<{ name: string; type: string; title?: string; description?: string }>;
}

export interface ShadcnConfig {
  key: string;
  label: string;
  license: string;
  homepage: string;
  /** URL del indice del registro (lista de items). Opcional si se dan `names`. */
  indexUrl?: string;
  /** Lista fija de nombres (para registros sin indice publico, p.ej. shadcn/ui). */
  names?: string[];
  /** URL del JSON resuelto de un componente (con `content`). */
  itemUrl: (name: string) => string;
  /** que tipos de item ingerir. */
  keepTypes?: string[];
  /** ruta de la pagina de docs del componente. */
  docPath?: (name: string) => string;
}

/** Ejecuta `fn` sobre `arr` con concurrencia limitada. */
async function mapPool<T, R>(
  arr: T[],
  size: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(arr.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(size, arr.length) }, async () => {
    while (cursor < arr.length) {
      const i = cursor++;
      out[i] = await fn(arr[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export function makeShadcnAdapter(cfg: ShadcnConfig): SourceAdapter {
  const keep = new Set(cfg.keepTypes ?? ["registry:ui", "registry:block"]);
  return {
    key: cfg.key,
    label: cfg.label,
    async collect(ctx: IngestContext): Promise<IngestItem[]> {
      let wanted: Array<{ name: string; type: string; title?: string; description?: string }>;
      if (cfg.names && cfg.names.length) {
        wanted = cfg.names.map((name) => ({ name, type: "registry:ui" }));
        ctx.log(`  ${wanted.length} componentes (lista fija) de ${cfg.label}.`);
      } else {
        ctx.log(`Descargando indice del registro de ${cfg.label}...`);
        const index = await fetchJson<RegistryIndex>(cfg.indexUrl!);
        wanted = (index.items ?? [])
          .filter((it) => keep.has(it.type))
          .filter((it) => !/-(demo|example)s?$/i.test(it.name));
        ctx.log(`  ${wanted.length} componentes a resolver (de ${index.items?.length ?? 0}).`);
      }

      const meta = new Map(wanted.map((w) => [w.name, w]));

      const results = await mapPool(wanted, 6, async (w) => {
        try {
          const item = await fetchJson<RegistryItem>(cfg.itemUrl(w.name));
          return { name: w.name, item };
        } catch (e) {
          ctx.log(`  ! omitido ${w.name}: ${(e as Error).message}`);
          return null;
        }
      });

      const items: IngestItem[] = [];
      for (const r of results) {
        if (!r) continue;
        const { name, item } = r;
        const m = meta.get(name);
        const files = (item.files ?? [])
          .filter((f) => typeof f.content === "string")
          .map((f) => ({ path: f.path, content: f.content as string, target: f.target }));
        if (files.length === 0) continue;

        const title = item.title ?? m?.title ?? name;
        const description = item.description ?? m?.description ?? null;
        const tags = [name, item.type.replace("registry:", "")];

        items.push({
          id: `${cfg.key}:${item.type.replace("registry:", "")}:${name}`,
          source: cfg.key,
          platform: "react",
          framework: "react",
          name: title,
          slug: name,
          category: guessCategory(`${name} ${title}`, m?.description ? [m.description] : []),
          type: item.type,
          author: item.author ?? cfg.label,
          license: cfg.license,
          description,
          tags,
          dependencies: item.dependencies ?? [],
          registryDependencies: item.registryDependencies ?? [],
          files,
          previewHtml: null, // React: no se renderiza en iframe sin build
          sourceUrl: cfg.docPath
            ? cfg.docPath(name)
            : `${cfg.homepage}/${cfg.key === "magicui" ? "docs/components" : "components"}/${name}`,
          installCommand: `npx shadcn@latest add "${cfg.itemUrl(name)}"`,
        });
      }

      return items;
    },
  };
}
