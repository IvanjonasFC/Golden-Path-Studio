/* ============================================================================
   Auditoría fuerte de IMPORTACIONES (tabla brand_imports). Paralela a la de
   exportaciones (brand_exports): registra qué se importó, de dónde, con qué
   totales, con runtime o sin él, y con qué resultado + el trace estructurado.
   Sirve para inspeccionar el historial y mostrar «últimas operaciones».
   ============================================================================ */
import { sqlite, initDb } from "../db/index";
import type { TraceReport } from "./trace";

initDb();

export interface BrandImportInput {
  brandId?: string | null;
  origin?: "upload" | "helper" | "analysis-json";
  root?: string | null;
  tool?: string | null;
  filesScanned?: number;
  productType?: string | null;
  scenes?: string[];
  runtime?: boolean;         // se pidió runtime
  runtimeRan?: boolean;      // runtime observó algo
  ok?: boolean;
  warnings?: string[];
  errors?: string[];
  durationMs?: number | null;
  trace?: TraceReport | null;
}

export interface BrandImportDTO {
  id: string; brandId: string | null; origin: string; root: string | null; tool: string | null;
  filesScanned: number; productType: string | null; scenes: string[];
  runtime: boolean; runtimeRan: boolean; ok: boolean;
  warnings: string[]; errors: string[]; durationMs: number | null; createdAt: number;
}

export function recordBrandImport(input: BrandImportInput): string {
  const now = Date.now();
  const id = `bimp_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  sqlite
    .prepare(
      `INSERT INTO brand_imports
         (id, brand_id, origin, root, tool, files_scanned, product_type, scenes_json,
          runtime, runtime_ran, ok, warnings_json, errors_json, duration_ms, trace_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id, input.brandId ?? null, input.origin ?? "upload", input.root ?? null, input.tool ?? null,
      input.filesScanned ?? 0, input.productType ?? null, JSON.stringify(input.scenes ?? []),
      input.runtime ? 1 : 0, input.runtimeRan ? 1 : 0, input.ok === false ? 0 : 1,
      JSON.stringify(input.warnings ?? []), JSON.stringify(input.errors ?? []),
      input.durationMs ?? null, input.trace ? JSON.stringify(input.trace) : null, now,
    );
  return id;
}

interface BrandImportRow {
  id: string; brand_id: string | null; origin: string; root: string | null; tool: string | null;
  files_scanned: number; product_type: string | null; scenes_json: string;
  runtime: number; runtime_ran: number; ok: number;
  warnings_json: string; errors_json: string; duration_ms: number | null; created_at: number;
}
function parseArr(raw: string | null): string[] {
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function rowToDTO(r: BrandImportRow): BrandImportDTO {
  return {
    id: r.id, brandId: r.brand_id, origin: r.origin, root: r.root, tool: r.tool,
    filesScanned: r.files_scanned, productType: r.product_type, scenes: parseArr(r.scenes_json),
    runtime: !!r.runtime, runtimeRan: !!r.runtime_ran, ok: !!r.ok,
    warnings: parseArr(r.warnings_json), errors: parseArr(r.errors_json),
    durationMs: r.duration_ms, createdAt: r.created_at,
  };
}

/** Últimas importaciones (global o de una marca), más recientes primero. */
export function listBrandImports(opts: { brandId?: string; limit?: number } = {}): BrandImportDTO[] {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const rows = opts.brandId
    ? sqlite.prepare("SELECT * FROM brand_imports WHERE brand_id = ? ORDER BY created_at DESC LIMIT ?").all(opts.brandId, limit)
    : sqlite.prepare("SELECT * FROM brand_imports ORDER BY created_at DESC LIMIT ?").all(limit);
  return (rows as BrandImportRow[]).map(rowToDTO);
}
