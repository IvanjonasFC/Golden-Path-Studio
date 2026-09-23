import { NextResponse } from "next/server";
import { getBrand, listBrandExports } from "@/lib/brands";
import { listBrandImports } from "@/lib/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/brands/<id>/exports?limit=  → historial de operaciones de la marca
// (exportaciones + importaciones) para «últimas operaciones».
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = getBrand(decodeURIComponent(id));
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  return NextResponse.json({
    exports: listBrandExports(brand.id, limit),
    imports: listBrandImports({ brandId: brand.id, limit }),
  });
}
