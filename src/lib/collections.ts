import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { sqlite, initDb } from "../db/index";
import { getComponent } from "./query";
import { compileBrand, type TokenGroup } from "./tokens";
import { blueprintToMarkdown, blueprintNonEmpty, type Blueprint } from "./blueprint";
import type { ComponentDTO } from "./types";

initDb();

/* ------------------------- Blueprint (comportamiento) ----------------------- */
// Esquema, presets y serializacion viven en ./blueprint (unica fuente de verdad).
function bpOf(doc: TokenGroup): Blueprint | null {
  const b = (doc as unknown as { blueprint?: Blueprint }).blueprint;
  return b && blueprintNonEmpty(b) ? b : null;
}
export function blueprintObject(doc: TokenGroup): Blueprint | null {
  return bpOf(doc);
}
export function blueprintMarkdown(doc: TokenGroup): string {
  const b = bpOf(doc);
  return b ? blueprintToMarkdown(b) : "";
}

export type CollectionKind = "stack" | "brand" | "project";

export interface BrandTokens {
  background?: string;
  foreground?: string;
  accent?: string;
  accentHover?: string;
  fontDisplay?: string;
  fontBody?: string;
  radius?: string;
  notes?: string;
}

export interface CollectionDTO {
  id: string;
  name: string;
  slug: string;
  kind: CollectionKind;
  description: string | null;
  brandTokens: BrandTokens | null;
  brandId: string | null;
  count: number;
  createdAt: number;
  updatedAt: number;
}

interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  kind: CollectionKind;
  description: string | null;
  brand_tokens: string | null;
  brand_id: string | null;
  created_at: number;
  updated_at: number;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "coleccion"
  );
}

function rowToDTO(r: CollectionRow): CollectionDTO {
  const count = (
    sqlite
      .prepare("SELECT COUNT(*) AS n FROM collection_items WHERE collection_id = ?")
      .get(r.id) as { n: number }
  ).n;
  let brandTokens: BrandTokens | null = null;
  if (r.brand_tokens) {
    try {
      brandTokens = JSON.parse(r.brand_tokens);
    } catch {
      brandTokens = null;
    }
  }
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    kind: r.kind,
    description: r.description,
    brandTokens,
    brandId: r.brand_id ?? null,
    count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listCollections(): CollectionDTO[] {
  const rows = sqlite
    .prepare("SELECT * FROM collections ORDER BY updated_at DESC")
    .all() as CollectionRow[];
  return rows.map(rowToDTO);
}

export function getCollection(idOrSlug: string): CollectionDTO | null {
  const row = sqlite
    .prepare("SELECT * FROM collections WHERE id = ? OR slug = ?")
    .get(idOrSlug, idOrSlug) as CollectionRow | undefined;
  return row ? rowToDTO(row) : null;
}

export function createCollection(input: {
  name: string;
  kind?: CollectionKind;
  description?: string;
  brandTokens?: BrandTokens;
}): CollectionDTO {
  const now = Date.now();
  const base = slugify(input.name);
  // slug unico
  let slug = base;
  let i = 2;
  while (sqlite.prepare("SELECT 1 FROM collections WHERE slug = ?").get(slug)) {
    slug = `${base}-${i++}`;
  }
  const id = `col_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  sqlite
    .prepare(
      `INSERT INTO collections (id, name, slug, kind, description, brand_tokens, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      slug,
      input.kind ?? "stack",
      input.description ?? null,
      input.brandTokens ? JSON.stringify(input.brandTokens) : null,
      now,
      now,
    );
  return getCollection(id)!;
}

export function updateCollection(
  id: string,
  patch: { name?: string; description?: string; kind?: CollectionKind; brandTokens?: BrandTokens },
): CollectionDTO | null {
  const existing = getCollection(id);
  if (!existing) return null;
  const name = patch.name?.trim() ?? existing.name;
  const description = patch.description ?? existing.description;
  const kind = patch.kind ?? existing.kind;
  const brandTokens =
    patch.brandTokens !== undefined
      ? patch.brandTokens
      : existing.brandTokens;
  sqlite
    .prepare(
      `UPDATE collections SET name=?, description=?, kind=?, brand_tokens=?, updated_at=? WHERE id=?`,
    )
    .run(
      name,
      description,
      kind,
      brandTokens ? JSON.stringify(brandTokens) : null,
      Date.now(),
      id,
    );
  return getCollection(id);
}

export function deleteCollection(id: string): boolean {
  const r = sqlite.prepare("DELETE FROM collections WHERE id = ?").run(id);
  return r.changes > 0;
}

function touch(id: string) {
  sqlite.prepare("UPDATE collections SET updated_at=? WHERE id=?").run(Date.now(), id);
}

export function addItem(collectionId: string, componentId: string, note?: string): boolean {
  if (!getCollection(collectionId)) return false;
  if (!getComponent(componentId)) return false;
  const pos =
    ((
      sqlite
        .prepare("SELECT MAX(position) AS m FROM collection_items WHERE collection_id = ?")
        .get(collectionId) as { m: number | null }
    ).m ?? 0) + 1;
  sqlite
    .prepare(
      `INSERT INTO collection_items (collection_id, component_id, note, position, added_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(collection_id, component_id) DO UPDATE SET note=excluded.note`,
    )
    .run(collectionId, componentId, note ?? null, pos, Date.now());
  touch(collectionId);
  return true;
}

export function removeItem(collectionId: string, componentId: string): boolean {
  const r = sqlite
    .prepare("DELETE FROM collection_items WHERE collection_id = ? AND component_id = ?")
    .run(collectionId, componentId);
  if (r.changes > 0) touch(collectionId);
  return r.changes > 0;
}

export function getCollectionComponents(collectionId: string): ComponentDTO[] {
  const rows = sqlite
    .prepare(
      "SELECT component_id FROM collection_items WHERE collection_id = ? ORDER BY position ASC",
    )
    .all(collectionId) as Array<{ component_id: string }>;
  const out: ComponentDTO[] = [];
  for (const r of rows) {
    const c = getComponent(r.component_id);
    if (c) out.push(c);
  }
  return out;
}

/** IDs de colecciones que contienen un componente (para marcar en la UI). */
export function collectionsForComponent(componentId: string): string[] {
  return (
    sqlite
      .prepare("SELECT collection_id FROM collection_items WHERE component_id = ?")
      .all(componentId) as Array<{ collection_id: string }>
  ).map((r) => r.collection_id);
}

/** Genera un prompt en markdown para pasar la coleccion a una IA. */
/** Tokens de la marca DTCG vinculada a la colección (por brand_id), ya compilados. */
function linkedBrand(collectionId: string): { tokens: TokenGroup; compiled: ReturnType<typeof compileBrand> } | null {
  const row = sqlite
    .prepare("SELECT brand_id AS b FROM collections WHERE id = ?")
    .get(collectionId) as { b: string | null } | undefined;
  if (!row?.b) return null;
  const br = sqlite.prepare("SELECT tokens FROM brands WHERE id = ?").get(row.b) as
    | { tokens: string }
    | undefined;
  if (!br) return null;
  try {
    const doc = JSON.parse(br.tokens) as TokenGroup;
    return { tokens: doc, compiled: compileBrand(doc) };
  } catch {
    return null;
  }
}

export function buildCollectionPrompt(collectionId: string): string {
  const col = getCollection(collectionId);
  if (!col) return "";
  const comps = getCollectionComponents(collectionId);
  const deps = new Set<string>();
  comps.forEach((c) => c.dependencies.forEach((d) => deps.add(d)));

  const lines: string[] = [];
  lines.push(`# Perfil de componentes: ${col.name}`);
  if (col.description) lines.push(`\n${col.description}`);
  lines.push(
    `\nUsa EXCLUSIVAMENTE los siguientes ${comps.length} componentes de mi catalogo local para construir la interfaz. No inventes otros ni cambies su estetica.`,
  );

  if (col.kind === "brand" && col.brandTokens) {
    const b = col.brandTokens;
    lines.push(`\n## Marca / design tokens`);
    if (b.background) lines.push(`- Fondo: ${b.background}`);
    if (b.foreground) lines.push(`- Texto: ${b.foreground}`);
    if (b.accent) lines.push(`- Acento: ${b.accent}${b.accentHover ? ` (hover ${b.accentHover})` : ""}`);
    if (b.fontDisplay) lines.push(`- Fuente titulos: ${b.fontDisplay}`);
    if (b.fontBody) lines.push(`- Fuente cuerpo: ${b.fontBody}`);
    if (b.radius) lines.push(`- Radio de bordes: ${b.radius}`);
    if (b.notes) lines.push(`- Notas: ${b.notes}`);
  }

  // Marca DTCG vinculada: se pasan las variables CSS compiladas (la fuente de la verdad).
  const lb = linkedBrand(collectionId);
  if (lb) {
    lines.push(`\n## Marca (design tokens compilados)`);
    lines.push(
      `Aplica estas variables CSS y NO inventes colores/radios; usa \`var(--color-action-primary)\`, etc.:`,
    );
    lines.push("```css\n" + lb.compiled.css + "```");
    const _bpmd = blueprintMarkdown(lb.tokens);
    if (_bpmd) lines.push("\n" + _bpmd);
  }

  if (deps.size) lines.push(`\n## Dependencias npm necesarias\n\`\`\`\nnpm i ${[...deps].join(" ")}\n\`\`\``);

  lines.push(`\n## Componentes`);
  for (const c of comps) {
    lines.push(`\n### ${c.name}  \n- id: \`${c.id}\`\n- fuente: ${c.source} · ${c.framework} · ${c.category}`);
    if (c.installCommand) lines.push(`- instalar: \`${c.installCommand}\``);
    if (c.description) lines.push(`- ${c.description}`);
    lines.push(
      `- Para obtener el codigo completo, usa la herramienta MCP \`get_component\` con id \`${c.id}\`, o mira \`components/\` en la exportacion.`,
    );
  }
  return lines.join("\n");
}

/** Exporta la coleccion a disco: codigo + manifest + prompt. Devuelve la ruta. */
export function exportCollection(
  collectionId: string,
  baseDir?: string,
): { dir: string; fileCount: number; components: number } | null {
  const col = getCollection(collectionId);
  if (!col) return null;
  const comps = getCollectionComponents(collectionId);
  const root = resolve(baseDir ?? process.env.EXPORT_DIR ?? "./exports", col.slug);

  let fileCount = 0;
  const manifest: any[] = [];
  const allDeps = new Set<string>();

  for (const c of comps) {
    const safe = c.id.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const compDir = join(root, "components", c.source, safe);
    for (const f of c.files) {
      const target = join(compDir, f.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content, "utf8");
      fileCount++;
    }
    c.dependencies.forEach((d) => allDeps.add(d));
    manifest.push({
      id: c.id,
      name: c.name,
      source: c.source,
      framework: c.framework,
      category: c.category,
      dependencies: c.dependencies,
      installCommand: c.installCommand,
      files: c.files.map((f) => `components/${c.source}/${safe}/${f.path}`),
      sourceUrl: c.sourceUrl,
      license: c.license,
    });
  }

  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "components.json"),
    JSON.stringify({ collection: col, components: manifest }, null, 2),
    "utf8",
  );
  writeFileSync(join(root, "AI_PROMPT.md"), buildCollectionPrompt(collectionId), "utf8");
  const install = [
    `# Instalacion — ${col.name}`,
    allDeps.size ? `\n## Dependencias\n\`\`\`\nnpm i ${[...allDeps].join(" ")}\n\`\`\`` : "",
    `\n## Componentes shadcn (si aplica)`,
    ...comps.filter((c) => c.installCommand).map((c) => `- ${c.name}: \`${c.installCommand}\``),
  ].join("\n");
  writeFileSync(join(root, "INSTALL.md"), install, "utf8");

  if (col.kind === "brand" && col.brandTokens) {
    writeFileSync(
      join(root, "brand.tokens.json"),
      JSON.stringify(col.brandTokens, null, 2),
      "utf8",
    );
  }

  // Marca DTCG vinculada -> tokens compilados listos para cada plataforma.
  const lb = linkedBrand(collectionId);
  if (lb) {
    mkdirSync(join(root, "brand", "android"), { recursive: true });
    writeFileSync(join(root, "brand", "tokens.dtcg.json"), JSON.stringify(lb.tokens, null, 2), "utf8");
    writeFileSync(join(root, "brand", "tokens.css"), lb.compiled.css, "utf8");
    writeFileSync(join(root, "brand", "tailwind.theme.css"), lb.compiled.tailwind, "utf8");
    writeFileSync(join(root, "brand", "android", "colors.xml"), lb.compiled.androidColors, "utf8");
    writeFileSync(join(root, "brand", "android", "dimens.xml"), lb.compiled.androidDimens, "utf8");
    const _bpjson = blueprintObject(lb.tokens);
    if (_bpjson) writeFileSync(join(root, "brand", "blueprint.json"), JSON.stringify(_bpjson, null, 2), "utf8");
    const _bpmd = blueprintMarkdown(lb.tokens);
    if (_bpmd) writeFileSync(join(root, "AGENTS.md"), "# AGENTS \u2014 " + col.name + "\n\nReglas y convenciones de esta marca. Un agente DEBE respetarlas al construir.\n\n" + _bpmd + "\n", "utf8");
  }

  return { dir: root, fileCount, components: comps.length };
}

/** Duplica una coleccion entera (metadatos, marca e items) con nuevo id/slug. */
export function duplicateCollection(id: string): CollectionDTO | null {
  const src = getCollection(id);
  if (!src) return null;
  const copy = createCollection({
    name: `${src.name} (copia)`,
    kind: src.kind,
    description: src.description ?? undefined,
    brandTokens: src.brandTokens ?? undefined,
  });
  const items = sqlite
    .prepare(
      "SELECT component_id, note, position FROM collection_items WHERE collection_id = ? ORDER BY position ASC",
    )
    .all(src.id) as Array<{ component_id: string; note: string | null; position: number }>;
  const now = Date.now();
  const ins = sqlite.prepare(
    `INSERT INTO collection_items (collection_id, component_id, note, position, added_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const run = sqlite.transaction(() => {
    for (const it of items) ins.run(copy.id, it.component_id, it.note, it.position, now);
  });
  run();
  touch(copy.id);
  return getCollection(copy.id);
}

/** Mueve un componente arriba/abajo intercambiando su posicion con el vecino. */
export function moveItem(
  collectionId: string,
  componentId: string,
  dir: "up" | "down",
): boolean {
  const items = sqlite
    .prepare(
      "SELECT component_id, position FROM collection_items WHERE collection_id = ? ORDER BY position ASC, added_at ASC",
    )
    .all(collectionId) as Array<{ component_id: string; position: number }>;
  const idx = items.findIndex((i) => i.component_id === componentId);
  if (idx === -1) return false;
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= items.length) return false;

  // Renumera de forma estable (evita empates de position en datos antiguos).
  const order = items.map((i) => i.component_id);
  [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
  const upd = sqlite.prepare(
    "UPDATE collection_items SET position = ? WHERE collection_id = ? AND component_id = ?",
  );
  const run = sqlite.transaction(() => {
    order.forEach((cid, i) => upd.run(i + 1, collectionId, cid));
  });
  run();
  touch(collectionId);
  return true;
}
