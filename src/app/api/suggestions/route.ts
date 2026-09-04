import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fuentes curadas (no "lo último" crudo): repos y temas relevantes al golden path.
const GH_REPOS = [
  "tailwindlabs/tailwindcss",
  "shadcn-ui/ui",
  "magicuidesign/magicui",
  "vercel/next.js",
  "motiondivision/motion",
];
const HN_QUERIES = ["design system", "shadcn", "react framework"];

const CACHE = resolve(process.cwd(), "data", "suggestions-cache.json");
const TIMEOUT = 6000;

export interface Suggestion {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  date: string;
  confidence: "alta" | "media" | "baja";
  kind: "release" | "tag" | "discussion";
}

async function get(url: string, type: "text" | "json"): Promise<string | Record<string, unknown> | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { "User-Agent": "component-vault" } });
    if (!r.ok) return null;
    return type === "json" ? await r.json() : await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function firstMatch(re: RegExp, s: string): string {
  const m = re.exec(s);
  return m ? m[1] : "";
}

function parseAtom(xml: string, repo: string, kind: "release" | "tag"): Suggestion[] {
  const out: Suggestion[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const e of entries.slice(0, 3)) {
    const title = firstMatch(/<title>([^<]+)<\/title>/, e).trim();
    const href = firstMatch(/<link[^>]*href="([^"]+)"/, e).trim();
    const updated = firstMatch(/<updated>([^<]+)<\/updated>/, e).trim();
    if (!title) continue;
    out.push({
      id: kind + ":" + repo + ":" + title,
      title: repo.split("/")[1] + " · " + title,
      summary: kind === "release" ? "Nueva release de " + repo + ". Revisa breaking changes y features antes de fijar versión." : "Nuevo tag de " + repo + ".",
      source: "GitHub · " + repo,
      url: href || "https://github.com/" + repo,
      date: updated || new Date().toISOString(),
      confidence: kind === "release" ? "alta" : "media",
      kind,
    });
  }
  return out;
}

function parseHn(json: Record<string, unknown>, query: string): Suggestion[] {
  const hits = (json?.hits as Array<Record<string, unknown>>) ?? [];
  return hits
    .filter((h) => h.title && h.url)
    .slice(0, 4)
    .map((h) => {
      const points = Number(h.points ?? 0);
      const comments = Number(h.num_comments ?? 0);
      const conf: Suggestion["confidence"] = points > 120 ? "alta" : points > 40 ? "media" : "baja";
      return {
        id: "hn:" + String(h.objectID),
        title: String(h.title),
        summary: points + " puntos · " + comments + " comentarios · tema \"" + query + "\".",
        source: "Hacker News",
        url: String(h.url),
        date: String(h.created_at ?? new Date().toISOString()),
        confidence: conf,
        kind: "discussion" as const,
      };
    });
}

function readCache(): { suggestions: Suggestion[]; cachedAt: string } | null {
  try {
    return JSON.parse(readFileSync(CACHE, "utf8"));
  } catch {
    return null;
  }
}

export async function GET() {
  const collected: Suggestion[] = [];

  const ghTasks = GH_REPOS.flatMap((repo) => [
    get("https://github.com/" + repo + "/releases.atom", "text").then((x) => (typeof x === "string" ? parseAtom(x, repo, "release") : [])),
    get("https://github.com/" + repo + "/tags.atom", "text").then((x) => (typeof x === "string" ? parseAtom(x, repo, "tag") : [])),
  ]);
  const hnTasks = HN_QUERIES.map((q) =>
    get("https://hn.algolia.com/api/v1/search_by_date?query=" + encodeURIComponent(q) + "&tags=story&hitsPerPage=6", "json").then((x) => (x && typeof x === "object" ? parseHn(x as Record<string, unknown>, q) : [])),
  );

  const results = await Promise.allSettled([...ghTasks, ...hnTasks]);
  for (const r of results) if (r.status === "fulfilled") collected.push(...r.value);

  // Curación: dedupe por id, prioriza releases y descarta lo muy antiguo, ordena por fecha.
  const seen = new Set<string>();
  const curated = collected
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 24);

  if (curated.length >= 4) {
    try {
      mkdirSync(join(process.cwd(), "data"), { recursive: true });
      writeFileSync(CACHE, JSON.stringify({ suggestions: curated, cachedAt: new Date().toISOString() }, null, 2), "utf8");
    } catch {
      /* cache best-effort */
    }
    return NextResponse.json({ suggestions: curated, cachedAt: new Date().toISOString(), stale: false });
  }

  // Sin red o pocas señales: cae al caché.
  const cache = readCache();
  if (cache) return NextResponse.json({ ...cache, stale: true });
  return NextResponse.json({ suggestions: curated, cachedAt: null, stale: true });
}
