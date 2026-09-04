import { NextResponse } from "next/server";
import { buildCollectionPrompt, getCollection } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const col = getCollection(decodeURIComponent(id));
  if (!col) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ prompt: buildCollectionPrompt(col.id) });
}
