import { NextResponse } from "next/server";
import { addItem, removeItem } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body?.componentId) {
    return NextResponse.json({ error: "componentId requerido" }, { status: 400 });
  }
  const ok = addItem(decodeURIComponent(id), body.componentId, body.note);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const componentId = searchParams.get("componentId");
  if (!componentId) {
    return NextResponse.json({ error: "componentId requerido" }, { status: 400 });
  }
  const ok = removeItem(decodeURIComponent(id), componentId);
  return NextResponse.json({ ok });
}
