import { NextResponse } from "next/server";
import { moveItem } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const componentId = body?.componentId;
  const direction = body?.direction;
  if (!componentId || (direction !== "up" && direction !== "down")) {
    return NextResponse.json({ error: "componentId y direction (up|down) requeridos" }, { status: 400 });
  }
  const ok = moveItem(decodeURIComponent(id), componentId, direction);
  return NextResponse.json({ ok });
}
