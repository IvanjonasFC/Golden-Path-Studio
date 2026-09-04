import { NextResponse } from "next/server";
import { getBrandVersion } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/brands/<id>/versions/<version> -> un snapshot concreto (por version o id).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await params;
  const v = getBrandVersion(decodeURIComponent(id), decodeURIComponent(version));
  if (!v) return NextResponse.json({ error: "Version no encontrada" }, { status: 404 });
  return NextResponse.json(v);
}
