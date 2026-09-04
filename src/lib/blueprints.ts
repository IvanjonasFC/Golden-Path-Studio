import { sqlite } from "../db/index";
import type { BlueprintDTO, BlueprintVersionDTO, ProjectGenerationDTO, BlueprintConfig } from "./types";

export function createBlueprint(input: { name: string; brandId: string | null; config: BlueprintConfig }): BlueprintDTO {
  const now = Date.now();
  let slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let i = 2;
  while (sqlite.prepare("SELECT 1 FROM blueprints WHERE slug = ?").get(slug)) slug = `${input.name}-${i++}`;
  const id = `bp_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  sqlite
    .prepare(
      `INSERT INTO blueprints (id, name, slug, brand_id, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.name.trim(), slug, input.brandId, JSON.stringify(input.config), now, now);
  
  return {
    id,
    name: input.name,
    slug,
    description: null,
    brandId: input.brandId,
    config: input.config,
    createdAt: now,
    updatedAt: now
  };
}

export function publishBlueprintVersion(blueprintId: string, version: string, brandVersionId: string | null): BlueprintVersionDTO | null {
  const row = sqlite.prepare("SELECT config FROM blueprints WHERE id = ?").get(blueprintId) as { config: string } | undefined;
  if (!row) return null;
  const now = Date.now();
  const id = `bpv_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  
  sqlite
    .prepare(
      `INSERT INTO blueprint_versions (id, blueprint_id, version, config, brand_version_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, blueprintId, version, row.config, brandVersionId, now);
    
  return {
    id,
    blueprintId,
    version,
    config: JSON.parse(row.config),
    brandVersionId,
    createdAt: now
  };
}

export function recordProjectGeneration(blueprintVersionId: string, mode: string, target: string, outDir: string): ProjectGenerationDTO {
  const now = Date.now();
  const id = `gen_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  sqlite
    .prepare(
      `INSERT INTO project_generations (id, blueprint_version_id, mode, target, out_dir, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, blueprintVersionId, mode, target, outDir, 'created', now);
  
  return { id, blueprintVersionId, mode, target, outDir, status: 'created', errorMsg: null, createdAt: now };
}

export function updateProjectGenerationStatus(id: string, status: 'validated' | 'failed', errorMsg: string | null = null) {
  sqlite
    .prepare("UPDATE project_generations SET status = ?, error_msg = ? WHERE id = ?")
    .run(status, errorMsg, id);
}
