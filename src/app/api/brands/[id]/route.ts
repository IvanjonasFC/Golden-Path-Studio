import { NextResponse } from "next/server";
import { getBrand, updateBrand, deleteBrand } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = getBrand(decodeURIComponent(id));
  if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(b);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updated = updateBrand(decodeURIComponent(id), body);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteBrand(decodeURIComponent(id)) });
}
