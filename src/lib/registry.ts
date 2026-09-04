import type { ComponentDTO, ComponentFile } from "./types";
import { getCollection, getCollectionComponents } from "./collections";

/**
 * Mapea los componentes del Vault al formato "registry-item" de shadcn, para
 * poder instalarlos en cualquier proyecto con:
 *   npx shadcn@latest add https://tu-host/r/<slug>.json
 * El id del Vault ("source:category:slug") se codifica sustituyendo ":" por "__"
 * para que sea seguro en una URL.
 */

const SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";

export function idToSlug(id: string): string {
  return id.replace(/:/g, "__");
}
export function slugToId(slug: string): string {
  return slug.replace(/\.json$/i, "").replace(/__/g, ":");
}

function isCode(path: string): boolean {
  return /\.(t|j)sx?$/.test(path);
}

/** Tipo de fichero para shadcn. Los .tsx/.jsx son componentes; el resto, ficheros sueltos. */
function fileType(f: ComponentFile): string {
  return isCode(f.path) ? "registry:component" : "registry:file";
}

/** Los "registry:file" necesitan un target (dónde cae el fichero en el proyecto). */
function fileTarget(f: ComponentFile, comp: ComponentDTO): string | undefined {
  if (f.target) return f.target;
  if (isCode(f.path)) return undefined; // shadcn lo coloca según components.json
  const base = f.path.split("/").pop() || f.path;
  return `components/vault/${comp.source}/${base}`;
}

/** Tipo del item completo. */
function itemType(comp: ComponentDTO): string {
  if (comp.type && comp.type.startsWith("registry:")) {
    return comp.type === "registry:block" ? "registry:block" : "registry:ui";
  }
  return comp.files.some((f) => isCode(f.path)) ? "registry:component" : "registry:file";
}

function toFiles(comp: ComponentDTO) {
  return comp.files.map((f) => {
    const entry: Record<string, unknown> = {
      path: f.path,
      content: f.content,
      type: fileType(f),
    };
    const target = fileTarget(f, comp);
    if (target) entry.target = target;
    return entry;
  });
}

/** Item de registro para UN componente. */
export function buildRegistryItem(comp: ComponentDTO) {
  return {
    $schema: SCHEMA,
    name: idToSlug(comp.id),
    type: itemType(comp),
    title: comp.name,
    description: comp.description ?? undefined,
    author: comp.author ?? undefined,
    dependencies: comp.dependencies.length ? comp.dependencies : undefined,
    registryDependencies: comp.registryDependencies.length
      ? comp.registryDependencies
      : undefined,
    files: toFiles(comp),
    // Metadatos propios (shadcn los ignora, útiles para depurar/atribución).
    meta: {
      id: comp.id,
      source: comp.source,
      framework: comp.framework,
      category: comp.category,
      license: comp.license,
      sourceUrl: comp.sourceUrl,
    },
  };
}

/** Item de registro que agrupa TODOS los ficheros de una colección/perfil. */
export function buildCollectionRegistryItem(idOrSlug: string) {
  const col = getCollection(idOrSlug);
  if (!col) return null;
  const comps = getCollectionComponents(col.id);

  const deps = new Set<string>();
  const regDeps = new Set<string>();
  const files: Array<Record<string, unknown>> = [];

  for (const c of comps) {
    c.dependencies.forEach((d) => deps.add(d));
    c.registryDependencies.forEach((d) => regDeps.add(d));
    for (const f of c.files) {
      const safe = c.id.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const isC = isCode(f.path);
      const entry: Record<string, unknown> = {
        path: `${c.source}/${safe}/${f.path}`,
        content: f.content,
        type: isC ? "registry:component" : "registry:file",
      };
      entry.target =
        f.target ||
        (isC
          ? `components/vault/${c.source}/${f.path.split("/").pop()}`
          : `components/vault/${c.source}/${f.path.split("/").pop()}`);
      files.push(entry);
    }
  }

  return {
    $schema: SCHEMA,
    name: col.slug,
    type: "registry:block",
    title: col.name,
    description: col.description ?? `Perfil "${col.name}" del Golden Path Studio`,
    dependencies: deps.size ? [...deps] : undefined,
    registryDependencies: regDeps.size ? [...regDeps] : undefined,
    files,
    meta: {
      collectionId: col.id,
      kind: col.kind,
      brandTokens: col.brandTokens ?? undefined,
      components: comps.length,
    },
  };
}
