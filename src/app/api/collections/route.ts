import { NextResponse } from "next/server";
import {
  listCollections,
  createCollection,
  collectionsForComponent,
} from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const componentId = searchParams.get("componentId");
  const items = listCollections();
  if (componentId) {
    const member = new Set(collectionsForComponent(componentId));
    return NextResponse.json({
      items: items.map((c) => ({ ...c, has: member.has(c.id) })),
    });
  }
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }
  const col = createCollection({
    name: body.name,
    kind: body.kind,
    description: body.description,
    brandTokens: body.brandTokens,
  });
  return NextResponse.json(col, { status: 201 });
}
