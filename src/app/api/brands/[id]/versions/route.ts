import { NextResponse } from "next/server";
import { publishBrandVersion, listBrandVersions, updateBrand } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/brands/<id>/versions -> publica un snapshot RESUELTO.
// El servidor persiste el draft entrante y RECALCULA resolvedConfig + bloqueos.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brandId = decodeURIComponent(id);
  const body = (await req.json().catch(() => ({}))) as {
    name?: string; tokens?: unknown; previewIds?: string[];
    version?: string; label?: string; publishedBy?: string;
  };

  if (body && (body.tokens !== undefined || body.name !== undefined || body.previewIds !== undefined)) {
    updateBrand(brandId, {
      name: body.name,
      tokens: body.tokens as never,
      previewIds: body.previewIds,
    });
  }

  const out = publishBrandVersion(brandId, {
    version: typeof body?.version === "string" ? body.version : undefined,
    label: typeof body?.label === "string" ? body.label : undefined,
    publishedBy: typeof body?.publishedBy === "string" ? body.publishedBy : undefined,
  });

  if (out.ok) return NextResponse.json({ success: true, version: out.version }, { status: 201 });
  if (out.reason === "not_found") return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
  if (out.reason === "duplicate")
    return NextResponse.json({ error: `La version ${out.version} ya existe`, version: out.version }, { status: 409 });
  return NextResponse.json(
    {
      error: "Publicacion bloqueada: faltan campos obligatorios (required).",
      blockingIssues: out.validation.blockingIssues,
      validationReport: out.validation,
    },
    { status: 422 },
  );
}

// GET /api/brands/<id>/versions -> historial de snapshots publicados.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ versions: listBrandVersions(decodeURIComponent(id)) });
}
