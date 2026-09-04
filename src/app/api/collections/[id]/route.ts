import { NextResponse } from "next/server";
import {
  getCollection,
  getCollectionComponents,
  updateCollection,
  deleteCollection,
} from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const col = getCollection(decodeURIComponent(id));
  if (!col) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ...col, components: getCollectionComponents(col.id) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updated = updateCollection(decodeURIComponent(id), body);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteCollection(decodeURIComponent(id));
  return NextResponse.json({ ok });
}
