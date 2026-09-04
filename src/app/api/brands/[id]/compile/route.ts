import { NextResponse } from "next/server";
import { compileBrandById } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/brands/<id>/compile -> { css, tailwind, androidColors, androidDimens, js, resolved }
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const out = compileBrandById(decodeURIComponent(id));
  if (!out) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(out);
}
