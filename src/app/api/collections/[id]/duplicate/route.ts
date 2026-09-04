import { NextResponse } from "next/server";
import { duplicateCollection } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const copy = duplicateCollection(decodeURIComponent(id));
  if (!copy) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
