import { getBrand } from "./brands";
import { sqlite } from "../db/index";
import { getResolvedValue } from "./tokens";

export function diffBrandAgainstVersion(brandId: string, versionIdOrVersion: string) {
  const current = getBrand(brandId);
  if (!current) throw new Error("Draft no encontrado");

  const row = sqlite
    .prepare("SELECT tokens, preview_ids FROM brand_versions WHERE brand_id = ? AND (id = ? OR version = ?) ORDER BY created_at DESC LIMIT 1")
    .get(brandId, versionIdOrVersion, versionIdOrVersion) as { tokens: string; preview_ids: string } | undefined;
  
  if (!row) throw new Error("Versión no encontrada");

  const oldTokens = JSON.parse(row.tokens);
  const oldPreviewIds = JSON.parse(row.preview_ids) as string[];

  const changes: string[] = [];

  // Compare some important tokens semantically
  const track = ["color.bg", "color.text", "color.action.primary"];
  for (const t of track) {
    const oldV = getResolvedValue(oldTokens, t);
    const newV = getResolvedValue(current.tokens, t);
    if (oldV !== newV) {
      changes.push(`Token [${t}]: ${oldV || 'no definido'} -> ${newV || 'no definido'}`);
    }
  }

  // Compare components (previewIds)
  const added = current.previewIds.filter(id => !oldPreviewIds.includes(id));
  const removed = oldPreviewIds.filter(id => !current.previewIds.includes(id));

  if (added.length > 0) changes.push(`Componentes añadidos: ${added.length}`);
  if (removed.length > 0) changes.push(`Componentes eliminados: ${removed.length}`);

  return changes;
}


/** Compara dos versiones PUBLICADAS entre si (no contra el draft). */
export function diffBrandVersions(brandId: string, versionA: string, versionB: string) {
  const get = (v: string) =>
    sqlite
      .prepare("SELECT tokens, preview_ids FROM brand_versions WHERE brand_id = ? AND (id = ? OR version = ?) ORDER BY created_at DESC LIMIT 1")
      .get(brandId, v, v) as { tokens: string; preview_ids: string } | undefined;

  const a = get(versionA);
  const b = get(versionB);
  if (!a) throw new Error(`Version no encontrada: ${versionA}`);
  if (!b) throw new Error(`Version no encontrada: ${versionB}`);

  const ta = JSON.parse(a.tokens);
  const tb = JSON.parse(b.tokens);
  const pa = JSON.parse(a.preview_ids) as string[];
  const pb = JSON.parse(b.preview_ids) as string[];

  const changes: string[] = [];
  for (const t of ["color.bg", "color.text", "color.action.primary", "font.body", "font.heading"]) {
    const va = getResolvedValue(ta, t);
    const vb = getResolvedValue(tb, t);
    if (va !== vb) changes.push(`Token [${t}]: ${va || "no definido"} -> ${vb || "no definido"}`);
  }
  const added = pb.filter((id) => !pa.includes(id));
  const removed = pa.filter((id) => !pb.includes(id));
  if (added.length) changes.push(`Componentes anadidos: ${added.length}`);
  if (removed.length) changes.push(`Componentes eliminados: ${removed.length}`);
  return changes;
}
