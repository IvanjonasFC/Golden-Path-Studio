import { sqlite, initDb } from "../db/index";
import {
  defaultBrandTokens,
  legacyToDtcg,
  compileBrand,
  type TokenGroup,
  type CompileResult,
} from "./tokens";
import { getCollection } from "./collections";
import { getResolvedValue } from "./tokens";
import { resolveBlueprint, type ValidationReport } from "./resolve";
import type { Blueprint } from "./blueprint";
import type { BrandVersionDTO } from "./types";

initDb();

/** Bloque reutilizable de una marca (footer, navbar, hero, CTA…). */
export interface BrandPart {
  id: string;
  name: string;
  kind: string; // footer | header | hero | cta | section | other
  code: string; // HTML/CSS autocontenido (puede usar las variables de la marca)
}

export interface BrandDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: TokenGroup;
  previewIds: string[];
  parts: BrandPart[];
  createdAt: number;
  updatedAt: number;
}

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: string;
  preview_ids: string | null;
  parts: string | null;
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
      .replace(/(^-|-$)/g, "") || "marca"
  );
}

function parseTokens(raw: string): TokenGroup {
  try {
    const t = JSON.parse(raw);
    return t && typeof t === "object" ? (t as TokenGroup) : {};
  } catch {
    return {};
  }
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseParts(raw: string | null): BrandPart[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? (a as BrandPart[]).filter((p) => p && p.id && typeof p.code === "string") : [];
  } catch {
    return [];
  }
}

function rowToDTO(r: BrandRow): BrandDTO {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    tokens: parseTokens(r.tokens),
    previewIds: parseIds(r.preview_ids),
    parts: parseParts(r.parts),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listBrands(): BrandDTO[] {
  return (
    sqlite.prepare("SELECT * FROM brands ORDER BY updated_at DESC").all() as BrandRow[]
  ).map(rowToDTO);
}

export function getBrand(idOrSlug: string): BrandDTO | null {
  const row = sqlite
    .prepare("SELECT * FROM brands WHERE id = ? OR slug = ?")
    .get(idOrSlug, idOrSlug) as BrandRow | undefined;
  return row ? rowToDTO(row) : null;
}

export function createBrand(input: {
  name: string;
  description?: string;
  tokens?: TokenGroup;
}): BrandDTO {
  const now = Date.now();
  const base = slugify(input.name);
  let slug = base;
  let i = 2;
  while (sqlite.prepare("SELECT 1 FROM brands WHERE slug = ?").get(slug)) slug = `${base}-${i++}`;
  const id = `brand_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  sqlite
    .prepare(
      `INSERT INTO brands (id, name, slug, description, tokens, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      slug,
      input.description ?? null,
      JSON.stringify(input.tokens ?? defaultBrandTokens()),
      now,
      now,
    );
  return getBrand(id)!;
}

export function updateBrand(
  id: string,
  patch: {
    name?: string;
    description?: string;
    tokens?: TokenGroup;
    previewIds?: string[];
    parts?: BrandPart[];
  },
): BrandDTO | null {
  const existing = getBrand(id);
  if (!existing) return null;
  sqlite
    .prepare(
      `UPDATE brands SET name=?, description=?, tokens=?, preview_ids=?, parts=?, updated_at=? WHERE id=?`,
    )
    .run(
      patch.name?.trim() ?? existing.name,
      patch.description !== undefined ? patch.description : existing.description,
      JSON.stringify(patch.tokens ?? existing.tokens),
      JSON.stringify(patch.previewIds ?? existing.previewIds),
      JSON.stringify(patch.parts ?? existing.parts),
      Date.now(),
      id,
    );
  return getBrand(id);
}

export function deleteBrand(id: string): boolean {
  // Desvincula colecciones que la usaban.
  sqlite.prepare("UPDATE collections SET brand_id = NULL WHERE brand_id = ?").run(id);
  return sqlite.prepare("DELETE FROM brands WHERE id = ?").run(id).changes > 0;
}

/** Compila una marca a CSS/Tailwind/Android/JS. */
export function compileBrandById(idOrSlug: string): CompileResult | null {
  const b = getBrand(idOrSlug);
  if (!b) return null;
  return compileBrand(b.tokens);
}

/** Enlaza una colección/blueprint a una marca. */
export function setCollectionBrand(collectionId: string, brandId: string | null): boolean {
  const r = sqlite
    .prepare("UPDATE collections SET brand_id = ?, updated_at = ? WHERE id = ?")
    .run(brandId, Date.now(), collectionId);
  return r.changes > 0;
}

/** Marca vinculada a una colección (si tiene brand_id), o null. */
export function getCollectionBrand(collectionId: string): BrandDTO | null {
  const row = sqlite
    .prepare("SELECT brand_id AS b FROM collections WHERE id = ?")
    .get(collectionId) as { b: string | null } | undefined;
  return row?.b ? getBrand(row.b) : null;
}

/** Crea una marca DTCG a partir del brandTokens plano (legacy) de una colección y la vincula. */
export function createBrandFromCollection(collectionId: string): BrandDTO | null {
  const col = getCollection(collectionId);
  if (!col) return null;
  const tokens = legacyToDtcg(col.brandTokens as Record<string, string> | null);
  const brand = createBrand({
    name: `${col.name} (marca)`,
    description: col.description ?? undefined,
    tokens,
  });
  setCollectionBrand(collectionId, brand.id);
  return brand;
}


/* ═══════════════════ Versionado / publicacion de marca ═══════════════════
   Snapshot inmutable. La FUENTE publicada principal es `resolvedConfig`, que se
   RECALCULA en servidor (nunca se confia solo en el cliente). Se bloquea si hay
   `blockingIssues` (required faltantes). Unicidad de (brand_id, version). */

const VISUAL_TOKEN_KEYS = [
  "color.bg", "color.text", "color.action.primary",
  "font.body", "font.heading", "radius.button", "radius.card",
] as const;

function brandVisualTokens(doc: TokenGroup): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of VISUAL_TOKEN_KEYS) {
    const v = getResolvedValue(doc, k);
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return out;
}

function brandBlueprint(doc: TokenGroup): Blueprint {
  const bp = (doc as unknown as { blueprint?: Blueprint }).blueprint;
  return bp && typeof bp === "object" ? bp : {};
}

/** Recalcula en servidor resolvedConfig + validationReport de una marca. */
export function resolveBrand(idOrSlug: string) {
  const b = getBrand(idOrSlug);
  if (!b) return null;
  return resolveBlueprint(brandBlueprint(b.tokens), brandVisualTokens(b.tokens));
}

/** Recalcula la resolucion a partir de un TokenGroup arbitrario (draft actual o
 *  snapshot publicado). Fuente unica para la exportacion blindada. */
export function resolveTokens(tokens: TokenGroup) {
  return resolveBlueprint(brandBlueprint(tokens), brandVisualTokens(tokens));
}

function parseSemver(v: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Estrategia de version explicita: semver con autoincremento de patch;
 *  si el ultimo no es semver, fallback a `v{n}`. Nunca asume 1.0.0 en ciego. */
export function nextBrandVersion(brandId: string): string {
  const rows = sqlite
    .prepare("SELECT version FROM brand_versions WHERE brand_id = ? ORDER BY created_at DESC")
    .all(brandId) as Array<{ version: string }>;
  if (rows.length === 0) return "1.0.0";
  let best: [number, number, number] | null = null;
  for (const r of rows) {
    const p = parseSemver(r.version);
    if (!p) continue;
    if (!best || p[0] > best[0] ||
        (p[0] === best[0] && (p[1] > best[1] || (p[1] === best[1] && p[2] > best[2])))) best = p;
  }
  if (!best) return `v${rows.length + 1}`;
  return `${best[0]}.${best[1]}.${best[2] + 1}`;
}

export type PublishOutcome =
  | { ok: true; version: BrandVersionDTO }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "blocked"; validation: ValidationReport }
  | { ok: false; reason: "duplicate"; version: string };

export function publishBrandVersion(
  brandId: string,
  opts?: { version?: string; label?: string; publishedBy?: string },
): PublishOutcome {
  const brand = getBrand(brandId);
  if (!brand) return { ok: false, reason: "not_found" };

  // Recompute server-side (no se confia en el cliente para el snapshot):
  const { resolvedConfig, validationReport, draftConfig } = resolveBlueprint(
    brandBlueprint(brand.tokens), brandVisualTokens(brand.tokens),
  );

  // Bloqueo real: los required faltantes impiden publicar (los defaults NO tapan).
  if (validationReport.blockingIssues.length > 0) {
    return { ok: false, reason: "blocked", validation: validationReport };
  }

  const version = (opts?.version && opts.version.trim()) || nextBrandVersion(brand.id);
  const dup = sqlite
    .prepare("SELECT 1 FROM brand_versions WHERE brand_id = ? AND version = ?")
    .get(brand.id, version);
  if (dup) return { ok: false, reason: "duplicate", version };

  const now = Date.now();
  const id = `bv_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const coverage = {
    global: validationReport.coverage,
    domains: Object.fromEntries(
      Object.values(validationReport.domains).map(
        (d) => [d.domain, { coverage: d.coverage, status: d.status, counts: d.counts }],
      ),
    ),
  };
  sqlite
    .prepare(
      `INSERT INTO brand_versions
         (id, brand_id, version, label, tokens, preview_ids, resolved_config_json,
          draft_config_json, preset_id, coverage_json, validation_json, published_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id, brand.id, version, opts?.label ?? null,
      JSON.stringify(brand.tokens), JSON.stringify(brand.previewIds),
      JSON.stringify(resolvedConfig), JSON.stringify(draftConfig),
      resolvedConfig.meta.preset ?? null,
      JSON.stringify(coverage), JSON.stringify(validationReport),
      opts?.publishedBy ?? null, now,
    );
  try {
    sqlite.prepare("UPDATE brands SET current_published_version_id = ? WHERE id = ?").run(id, brand.id);
  } catch { /* columna opcional */ }

  return { ok: true, version: getBrandVersion(brand.id, version)! };
}

interface BrandVersionRow {
  id: string; brand_id: string; version: string; label: string | null;
  tokens: string; preview_ids: string; resolved_config_json: string | null;
  draft_config_json: string | null; preset_id: string | null;
  coverage_json: string | null; validation_json: string | null;
  published_by: string | null; created_at: number;
}
function bvSafeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
function bvRowToDTO(r: BrandVersionRow): BrandVersionDTO {
  return {
    id: r.id, brandId: r.brand_id, version: r.version, label: r.label,
    tokens: bvSafeParse(r.tokens) ?? {},
    previewIds: bvSafeParse<string[]>(r.preview_ids) ?? [],
    resolvedConfig: bvSafeParse(r.resolved_config_json),
    draftConfig: bvSafeParse(r.draft_config_json),
    presetId: r.preset_id,
    coverage: bvSafeParse(r.coverage_json),
    validation: bvSafeParse(r.validation_json),
    publishedBy: r.published_by,
    createdAt: r.created_at,
  };
}

export function listBrandVersions(brandId: string): BrandVersionDTO[] {
  const b = getBrand(brandId);
  if (!b) return [];
  return (sqlite
    .prepare("SELECT * FROM brand_versions WHERE brand_id = ? ORDER BY created_at DESC")
    .all(b.id) as BrandVersionRow[]).map(bvRowToDTO);
}

export function getBrandVersion(brandId: string, versionOrId: string): BrandVersionDTO | null {
  const b = getBrand(brandId);
  if (!b) return null;
  const row = sqlite
    .prepare("SELECT * FROM brand_versions WHERE brand_id = ? AND (id = ? OR version = ?) ORDER BY created_at DESC LIMIT 1")
    .get(b.id, versionOrId, versionOrId) as BrandVersionRow | undefined;
  return row ? bvRowToDTO(row) : null;
}

/** Restaura el draft de la marca desde un snapshot publicado (tokens+previews). */
export function restoreBrandVersion(brandId: string, versionOrId: string): BrandDTO | null {
  const v = getBrandVersion(brandId, versionOrId);
  const b = getBrand(brandId);
  if (!v || !b) return null;
  return updateBrand(b.id, { tokens: v.tokens as TokenGroup, previewIds: v.previewIds });
}


/* ═══════════════ Auditoria de exportaciones (brand_exports) ═══════════════ */
export interface BrandExportInput {
  brandId?: string | null;
  brandVersionId?: string | null;   // null = export desde draft
  mode?: string;                     // theme | docs | full
  target?: string;                   // all | web | android | js …
  outDir?: string | null;
  resolvedHash?: string | null;      // hash del resolvedConfig exportado
  status?: string;                   // ok | failed
  errorMsg?: string | null;
  // Auditoría enriquecida (opcional):
  sourceLabel?: string | null;       // draft | version:x.y.z
  files?: string[];                  // rutas generadas
  omitted?: { path: string; reason: string }[]; // no generado y por qué
  warnings?: string[];
  partial?: boolean;                 // true = incompleto (bloqueos/faltantes)
}

export interface BrandExportDTO {
  id: string; brandId: string | null; brandVersionId: string | null;
  mode: string; target: string; outDir: string | null; resolvedHash: string | null;
  status: string; errorMsg: string | null; createdAt: number;
  sourceLabel: string | null; filesCount: number | null; files: string[];
  omitted: { path: string; reason: string }[]; warnings: string[]; partial: boolean;
}

export function recordBrandExport(input: BrandExportInput): string {
  const now = Date.now();
  const id = `bexp_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  sqlite
    .prepare(
      `INSERT INTO brand_exports
         (id, brand_id, brand_version_id, mode, target, out_dir, resolved_hash, status, error_msg,
          source_label, files_count, files_json, omitted_json, warnings_json, partial, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id, input.brandId ?? null, input.brandVersionId ?? null,
      input.mode ?? "full", input.target ?? "all", input.outDir ?? null,
      input.resolvedHash ?? null, input.status ?? "ok", input.errorMsg ?? null,
      input.sourceLabel ?? null,
      input.files ? input.files.length : null,
      input.files ? JSON.stringify(input.files) : null,
      input.omitted ? JSON.stringify(input.omitted) : null,
      input.warnings ? JSON.stringify(input.warnings) : null,
      input.partial ? 1 : 0,
      now,
    );
  return id;
}

interface BrandExportRow {
  id: string; brand_id: string | null; brand_version_id: string | null;
  mode: string; target: string; out_dir: string | null; resolved_hash: string | null;
  status: string; error_msg: string | null; created_at: number;
  source_label: string | null; files_count: number | null; files_json: string | null;
  omitted_json: string | null; warnings_json: string | null; partial: number | null;
}
function jParseArr<T>(raw: string | null): T[] { if (!raw) return []; try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch { return []; } }
function bexpRowToDTO(r: BrandExportRow): BrandExportDTO {
  return {
    id: r.id, brandId: r.brand_id, brandVersionId: r.brand_version_id,
    mode: r.mode, target: r.target, outDir: r.out_dir, resolvedHash: r.resolved_hash,
    status: r.status, errorMsg: r.error_msg, createdAt: r.created_at,
    sourceLabel: r.source_label, filesCount: r.files_count,
    files: jParseArr<string>(r.files_json),
    omitted: jParseArr<{ path: string; reason: string }>(r.omitted_json),
    warnings: jParseArr<string>(r.warnings_json),
    partial: !!r.partial,
  };
}
export function listBrandExports(brandId: string, limit = 20): BrandExportDTO[] {
  const n = Math.min(Math.max(limit, 1), 100);
  return (sqlite
    .prepare("SELECT * FROM brand_exports WHERE brand_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(brandId, n) as BrandExportRow[]).map(bexpRowToDTO);
}

/** Todas las exportaciones (cross-marca), más recientes primero — para la consola de Actividad. */
export function listAllBrandExports(limit = 30): BrandExportDTO[] {
  const n = Math.min(Math.max(limit, 1), 100);
  return (sqlite
    .prepare("SELECT * FROM brand_exports ORDER BY created_at DESC LIMIT ?")
    .all(n) as BrandExportRow[]).map(bexpRowToDTO);
}
