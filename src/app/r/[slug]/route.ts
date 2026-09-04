import { NextResponse } from "next/server";
import { getComponent } from "@/lib/query";
import { buildRegistryItem, slugToId } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /r/<slug>.json  ->  registry-item de un componente (formato shadcn)
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = slugToId(decodeURIComponent(slug));
  const comp = getComponent(id);
  if (!comp) {
    return NextResponse.json({ error: `No existe el componente "${id}".` }, { status: 404 });
  }
  return NextResponse.json(buildRegistryItem(comp), {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}
