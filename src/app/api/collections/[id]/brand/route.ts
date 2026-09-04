import { NextResponse } from "next/server";
import { setCollectionBrand } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/collections/<id>/brand  { brandId }  -> vincula/desvincula una marca
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const ok = setCollectionBrand(decodeURIComponent(id), body?.brandId || null);
  return NextResponse.json({ ok });
}
