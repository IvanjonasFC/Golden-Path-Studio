import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

const DB_PATH = resolve(process.env.DB_PATH ?? "./data/catalog.db");

// Asegura que la carpeta existe antes de abrir el fichero.
mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

/**
 * Crea la tabla principal, el indice de busqueda FTS5 y los triggers que
 * mantienen el FTS sincronizado. Idempotente: seguro llamarlo siempre.
 */
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS components (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'web',
      framework TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      author TEXT,
      license TEXT,
      description TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      dependencies TEXT NOT NULL DEFAULT '[]',
      registry_dependencies TEXT NOT NULL DEFAULT '[]',
      files TEXT NOT NULL DEFAULT '[]',
      preview_html TEXT,
      thumbnail TEXT,
      source_url TEXT,
      install_command TEXT,
      ingested_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_source    ON components(source);
    CREATE INDEX IF NOT EXISTS idx_category  ON components(category);
    CREATE INDEX IF NOT EXISTS idx_platform  ON components(platform);
    CREATE INDEX IF NOT EXISTS idx_framework ON components(framework);

    -- Indice de texto completo. content='components' => tabla externa (no duplica datos).
    CREATE VIRTUAL TABLE IF NOT EXISTS components_fts USING fts5(
      name, description, tags, category, author,
      content='components', content_rowid='rowid'
    );

    -- Triggers de sincronizacion FTS <-> tabla principal.
    CREATE TRIGGER IF NOT EXISTS components_ai AFTER INSERT ON components BEGIN
      INSERT INTO components_fts(rowid, name, description, tags, category, author)
      VALUES (new.rowid, new.name, new.description, new.tags, new.category, new.author);
    END;
    CREATE TRIGGER IF NOT EXISTS components_ad AFTER DELETE ON components BEGIN
      INSERT INTO components_fts(components_fts, rowid, name, description, tags, category, author)
      VALUES ('delete', old.rowid, old.name, old.description, old.tags, old.category, old.author);
    END;
    CREATE TRIGGER IF NOT EXISTS components_au AFTER UPDATE ON components BEGIN
      INSERT INTO components_fts(components_fts, rowid, name, description, tags, category, author)
      VALUES ('delete', old.rowid, old.name, old.description, old.tags, old.category, old.author);
      INSERT INTO components_fts(rowid, name, description, tags, category, author)
      VALUES (new.rowid, new.name, new.description, new.tags, new.category, new.author);
    END;

    -- Colecciones / perfiles (Stack, Marca, Proyecto) creadas por el usuario.
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'stack',   -- stack | brand | project
      description TEXT,
      brand_tokens TEXT,                     -- JSON opcional (colores, fuentes...)
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Pertenencia componente <-> coleccion (N:M) con orden y nota.
    CREATE TABLE IF NOT EXISTS collection_items (
      collection_id TEXT NOT NULL,
      component_id TEXT NOT NULL,
      note TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (collection_id, component_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ci_collection ON collection_items(collection_id);
    CREATE INDEX IF NOT EXISTS idx_ci_component ON collection_items(component_id);

    -- Marcas de primera clase (reutilizables entre colecciones/blueprints).
    -- 'tokens' es un documento DTCG (W3C) serializado en JSON.
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      tokens TEXT NOT NULL DEFAULT '{}',
      preview_ids TEXT NOT NULL DEFAULT '[]',
      parts TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Migracion suave: colecciones pueden referenciar una marca reutilizable.
  const colCols = new Set(
    (sqlite.prepare("PRAGMA table_info(collections)").all() as Array<{ name: string }>).map(
      (c) => c.name,
    ),
  );
  if (!colCols.has("brand_id")) {
    sqlite.exec("ALTER TABLE collections ADD COLUMN brand_id TEXT");
  }

  // Migracion suave: marcas guardan qué componentes se previsualizan sobre ellas.
  const brandCols = new Set(
    (sqlite.prepare("PRAGMA table_info(brands)").all() as Array<{ name: string }>).map(
      (c) => c.name,
    ),
  );
  if (!brandCols.has("preview_ids")) {
    sqlite.exec("ALTER TABLE brands ADD COLUMN preview_ids TEXT NOT NULL DEFAULT '[]'");
  }
  if (!brandCols.has("parts")) {
    sqlite.exec("ALTER TABLE brands ADD COLUMN parts TEXT NOT NULL DEFAULT '[]'");
  }

  // Migracion suave: anade columnas nuevas a bases ya creadas por versiones previas.
  const cols = new Set(
    (sqlite.prepare("PRAGMA table_info(components)").all() as Array<{ name: string }>).map(
      (c) => c.name,
    ),
  );
  const ADDS: Array<[string, string]> = [["thumbnail", "TEXT"]];
  for (const [name, type] of ADDS) {
    if (!cols.has(name)) sqlite.exec(`ALTER TABLE components ADD COLUMN ${name} ${type}`);
  }

  // ── Subsistema de versionado / publicacion (idempotente) ──────────────────
  // Snapshots inmutables de marca (fuente publicada = resolvedConfig), mas las
  // tablas de blueprint/generaciones que ya asumen blueprints.ts y diff.ts.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS brand_versions (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      version TEXT NOT NULL,
      label TEXT,
      tokens TEXT NOT NULL DEFAULT '{}',
      preview_ids TEXT NOT NULL DEFAULT '[]',
      resolved_config_json TEXT,
      draft_config_json TEXT,
      preset_id TEXT,
      coverage_json TEXT,
      validation_json TEXT,
      published_by TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE (brand_id, version),
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_bv_brand ON brand_versions(brand_id);

    CREATE TABLE IF NOT EXISTS blueprints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      brand_id TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blueprint_versions (
      id TEXT PRIMARY KEY,
      blueprint_id TEXT NOT NULL,
      version TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      brand_version_id TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE (blueprint_id, version),
      FOREIGN KEY (blueprint_id) REFERENCES blueprints(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_bpv_blueprint ON blueprint_versions(blueprint_id);

    CREATE TABLE IF NOT EXISTS project_generations (
      id TEXT PRIMARY KEY,
      blueprint_version_id TEXT NOT NULL,
      brand_version_id TEXT,
      mode TEXT NOT NULL,
      target TEXT NOT NULL,
      out_dir TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      error_msg TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gen_bpv ON project_generations(blueprint_version_id);
  `);

  // Migracion suave: la marca apunta a su ultima version publicada (opcional).
  const brandCols2 = new Set(
    (sqlite.prepare("PRAGMA table_info(brands)").all() as Array<{ name: string }>).map((c) => c.name),
  );
  if (!brandCols2.has("current_published_version_id")) {
    sqlite.exec("ALTER TABLE brands ADD COLUMN current_published_version_id TEXT");
  }
  // Migracion suave: una generacion puede enlazar directo a una brand_version.
  const genCols = new Set(
    (sqlite.prepare("PRAGMA table_info(project_generations)").all() as Array<{ name: string }>).map((c) => c.name),
  );
  if (!genCols.has("brand_version_id")) {
    sqlite.exec("ALTER TABLE project_generations ADD COLUMN brand_version_id TEXT");
  }

  // Migracion suave: columnas nuevas de brand_versions sobre tablas antiguas
  // (una tabla creada por versiones previas NO se actualiza con CREATE TABLE).
  const bvCols = new Set(
    (sqlite.prepare("PRAGMA table_info(brand_versions)").all() as Array<{ name: string }>).map((c) => c.name),
  );
  const BV_ADDS: Array<[string, string]> = [
    ["label", "TEXT"],
    ["resolved_config_json", "TEXT"],
    ["draft_config_json", "TEXT"],
    ["preset_id", "TEXT"],
    ["coverage_json", "TEXT"],
    ["validation_json", "TEXT"],
    ["published_by", "TEXT"],
  ];
  for (const [name, type] of BV_ADDS) {
    if (!bvCols.has(name)) sqlite.exec(`ALTER TABLE brand_versions ADD COLUMN ${name} ${type}`);
  }
  // Migracion suave: project_generations puede venir sin status/error_msg.
  const pgCols = new Set(
    (sqlite.prepare("PRAGMA table_info(project_generations)").all() as Array<{ name: string }>).map((c) => c.name),
  );
  if (!pgCols.has("status")) sqlite.exec("ALTER TABLE project_generations ADD COLUMN status TEXT NOT NULL DEFAULT 'created'");
  if (!pgCols.has("error_msg")) sqlite.exec("ALTER TABLE project_generations ADD COLUMN error_msg TEXT");

  // Auditoria fuerte de exportaciones: que version se exporto, cuando, a donde,
  // con que hash de resolvedConfig y con que estado.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS brand_exports (
      id TEXT PRIMARY KEY,
      brand_id TEXT,
      brand_version_id TEXT,
      mode TEXT NOT NULL DEFAULT 'tokens',
      target TEXT NOT NULL DEFAULT 'all',
      out_dir TEXT,
      resolved_hash TEXT,
      status TEXT NOT NULL DEFAULT 'ok',
      error_msg TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bexp_brand ON brand_exports(brand_id);
    CREATE INDEX IF NOT EXISTS idx_bexp_version ON brand_exports(brand_version_id);
  `);
}

export const db = drizzle(sqlite, { schema });
export { sqlite, DB_PATH, schema };
