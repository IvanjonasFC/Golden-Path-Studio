import { sqlite, initDb } from "../db/index";
import type {
  ComponentDTO,
  ComponentFile,
  SearchParams,
  SearchResult,
} from "./types";

initDb();

interface RawRow {
  id: string;
  source: string;
  platform: string;
  framework: string;
  name: string;
  slug: string;
  category: string;
  type: string;
  author: string | null;
  license: string | null;
  description: string | null;
  tags: string;
  dependencies: string;
  registry_dependencies: string;
  files: string;
  preview_html: string | null;
  thumbnail: string | null;
  source_url: string | null;
  install_command: string | null;
  ingested_at: number;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toDTO(r: RawRow): ComponentDTO {
  return {
    id: r.id,
    source: r.source,
    platform: r.platform,
    framework: r.framework,
    name: r.name,
    slug: r.slug,
    category: r.category,
    type: r.type,
    author: r.author,
    license: r.license,
    description: r.description,
    tags: parseJson<string[]>(r.tags, []),
    dependencies: parseJson<string[]>(r.dependencies, []),
    registryDependencies: parseJson<string[]>(r.registry_dependencies, []),
    files: parseJson<ComponentFile[]>(r.files, []),
    previewHtml: r.preview_html,
    thumbnail: r.thumbnail,
    sourceUrl: r.source_url,
    installCommand: r.install_command,
    ingestedAt: r.ingested_at,
  };
}

/** Convierte texto libre en una consulta FTS5 segura por prefijos. */
function toFtsQuery(q: string): string {
  const tokens = q
    .toLowerCase()
    .replace(/["'()*:^-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t}"*`).join(" AND ");
}

const FILTERS: Array<[keyof SearchParams, string]> = [
  ["source", "c.source = ?"],
  ["category", "c.category = ?"],
  ["platform", "c.platform = ?"],
  ["framework", "c.framework = ?"],
];

export function searchComponents(params: SearchParams): SearchResult {
  const limit = Math.min(Math.max(params.limit ?? 60, 1), 500);
  const offset = Math.max(params.offset ?? 0, 0);

  const where: string[] = [];
  const args: unknown[] = [];
  let join = "";

  const fts = params.q ? toFtsQuery(params.q) : "";
  if (fts) {
    join = "JOIN components_fts f ON f.rowid = c.rowid";
    where.push("components_fts MATCH ?");
    args.push(fts);
  }

  for (const [key, clause] of FILTERS) {
    const val = params[key];
    if (val) {
      where.push(clause);
      args.push(val);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order = fts ? "ORDER BY rank" : "ORDER BY RANDOM()";

  const total = (
    sqlite
      .prepare(`SELECT COUNT(*) AS n FROM components c ${join} ${whereSql}`)
      .get(...args) as { n: number }
  ).n;

  const rows = sqlite
    .prepare(
      `SELECT c.* FROM components c ${join} ${whereSql} ${order} LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset) as RawRow[];

  return { total, items: rows.map(toDTO) };
}

export function getComponent(id: string): ComponentDTO | null {
  const row = sqlite
    .prepare("SELECT * FROM components WHERE id = ?")
    .get(id) as RawRow | undefined;
  return row ? toDTO(row) : null;
}

export function listFacet(
  column: "source" | "category" | "platform" | "framework",
): Array<{ value: string; count: number }> {
  return sqlite
    .prepare(
      `SELECT ${column} AS value, COUNT(*) AS count
       FROM components GROUP BY ${column} ORDER BY count DESC`,
    )
    .all() as Array<{ value: string; count: number }>;
}

export function totalCount(): number {
  return (
    sqlite.prepare("SELECT COUNT(*) AS n FROM components").get() as {
      n: number;
    }
  ).n;
}
