import { NextResponse } from "next/server";
import { exportCollection } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const res = exportCollection(decodeURIComponent(id), body?.dir);
    if (!res) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
