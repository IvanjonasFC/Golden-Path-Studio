import { NextResponse } from "next/server";
import { recordBrandImport, listBrandImports, type BrandImportInput } from "@/lib/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/imports  → registra una importación (auditoría). Devuelve { importId }.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as BrandImportInput;
  try {
    const importId = recordBrandImport({
      brandId: body.brandId ?? null,
      origin: body.origin ?? "upload",
      root: body.root ?? null,
      tool: body.tool ?? null,
      filesScanned: Number(body.filesScanned ?? 0),
      productType: body.productType ?? null,
      scenes: Array.isArray(body.scenes) ? body.scenes : [],
      runtime: !!body.runtime,
      runtimeRan: !!body.runtimeRan,
      ok: body.ok !== false,
      warnings: Array.isArray(body.warnings) ? body.warnings : [],
      errors: Array.isArray(body.errors) ? body.errors : [],
      durationMs: body.durationMs ?? null,
      trace: body.trace ?? null,
    });
    return NextResponse.json({ importId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "import log failed" }, { status: 500 });
  }
}

// GET /api/imports?brandId=&limit=  → últimas importaciones (auditoría).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brandId") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 20);
  return NextResponse.json({ items: listBrandImports({ brandId, limit }) });
}
