import { NextResponse } from "next/server";
import { diffBrandAgainstVersion, diffBrandVersions } from "@/lib/diff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/brands/<id>/diff?v=<A>[&against=<B>]
//  - sin `against`: compara el DRAFT actual contra la version A.
//  - con `against`: compara la version A contra la version B (ambas publicadas).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brandId = decodeURIComponent(id);
  const url = new URL(req.url);
  const v = url.searchParams.get("v") || "1.0.0";
  const against = url.searchParams.get("against");
  try {
    const changes = against
      ? diffBrandVersions(brandId, v, against)
      : diffBrandAgainstVersion(brandId, v);
    return NextResponse.json({ changes, base: v, target: against ?? "draft" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
