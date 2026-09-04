import { NextResponse } from "next/server";
import { buildCollectionRegistryItem } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /r/c/<slug>.json  ->  registry-item que agrupa toda una colección/perfil
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const clean = decodeURIComponent(slug).replace(/\.json$/i, "");
  const item = buildCollectionRegistryItem(clean);
  if (!item) {
    return NextResponse.json({ error: `No existe la colección "${clean}".` }, { status: 404 });
  }
  return NextResponse.json(item, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}
