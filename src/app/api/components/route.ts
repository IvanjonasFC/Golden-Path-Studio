import { NextResponse } from "next/server";
import { searchComponents } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const num = (k: string) => {
    const v = searchParams.get(k);
    return v ? Number(v) : undefined;
  };
  const str = (k: string) => searchParams.get(k) || undefined;

  const result = searchComponents({
    q: str("q"),
    source: str("source"),
    category: str("category"),
    platform: str("platform"),
    framework: str("framework"),
    limit: num("limit"),
    offset: num("offset"),
  });

  return NextResponse.json(result);
}

import { sqlite } from "@/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, category = "Custom", html = "", css = "", framework = "tailwind" } = body;
    if (!name || !html) {
      return NextResponse.json({ error: "Nombre y HTML son obligatorios" }, { status: 400 });
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "snippet";
    const id = body.id || `custom:${category.toLowerCase()}:${slug}-${Date.now().toString(36)}`;
    const previewHtml = css ? `<style>${css}</style>${html}` : html;
    const files = [
      { path: "index.html", content: html },
      ...(css ? [{ path: "style.css", content: css }] : []),
    ];

    sqlite.prepare(`
      INSERT INTO components (id, source, platform, framework, name, slug, category, type, description, tags, dependencies, registry_dependencies, files, preview_html, ingested_at)
      VALUES (?, 'custom', 'web', ?, ?, ?, ?, 'snippet', 'Componente personalizado', '["custom", "project"]', '[]', '[]', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        framework = excluded.framework,
        name = excluded.name,
        slug = excluded.slug,
        category = excluded.category,
        files = excluded.files,
        preview_html = excluded.preview_html,
        ingested_at = excluded.ingested_at
    `).run(id, framework, name, slug, category, JSON.stringify(files), previewHtml, Date.now());

    return NextResponse.json({ id, name, slug, category, framework, previewHtml });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

