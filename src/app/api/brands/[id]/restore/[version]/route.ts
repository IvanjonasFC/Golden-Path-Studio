import { NextResponse } from "next/server";
import { restoreBrandVersion } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/brands/<id>/restore/<version> -> vuelca un snapshot publicado al draft.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await params;
  const brand = restoreBrandVersion(decodeURIComponent(id), decodeURIComponent(version));
  if (!brand) return NextResponse.json({ error: "Marca o version no encontrada" }, { status: 404 });
  return NextResponse.json({ success: true, brand });
}
