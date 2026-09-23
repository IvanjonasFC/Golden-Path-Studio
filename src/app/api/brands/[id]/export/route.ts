import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { getBrand, getBrandVersion, resolveTokens, recordBrandExport } from "@/lib/brands";
import { compileBrand } from "@/lib/tokens";
import { buildBrandExport, type ExportMode, type ExportSource } from "@/lib/brandExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashResolved(rc: unknown): string | null {
  if (!rc) return null;
  try { return createHash("sha256").update(JSON.stringify(rc)).digest("hex").slice(0, 16); } catch { return null; }
}
const MODES: ExportMode[] = ["theme", "docs", "full"];

// POST /api/brands/<id>/export  { dir?, version?, target?, mode? }
//  - sin `version`: exporta el DRAFT resuelto actual.
//  - con `version`: exporta anclado a un snapshot PUBLICADO (tokens + previews del snapshot).
//  - mode: theme (solo tokens) | docs (documentacion) | full (contrato completo IA/build). Default full.
// Cada exportacion queda registrada en brand_exports (auditoria fuerte).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brandId = decodeURIComponent(id);
  const brand = getBrand(brandId);
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({} as { dir?: string; version?: string; target?: string; mode?: string }));
  const versionSel = typeof body?.version === "string" ? body.version : null;
  const target = typeof body?.target === "string" ? body.target : "all";
  const mode: ExportMode = MODES.includes(body?.mode as ExportMode) ? (body!.mode as ExportMode) : "full";

  // Fuente de tokens/previews: snapshot publicado o draft actual.
  let tokens = brand.tokens;
  let previewIds = brand.previewIds;
  let source: ExportSource = { kind: "draft" };
  let versionLabel = "draft";
  let brandVersionId: string | null = null;
  if (versionSel) {
    const ver = getBrandVersion(brand.id, versionSel);
    if (!ver) return NextResponse.json({ error: "version not found" }, { status: 404 });
    tokens = ver.tokens;
    previewIds = ver.previewIds;
    versionLabel = ver.version;
    brandVersionId = ver.id;
    source = { kind: "version", version: ver.version, versionId: ver.id, createdAt: ver.createdAt };
  }

  // Resolucion recalculada en servidor (fuente de verdad del paquete).
  const resolution = resolveTokens(tokens);
  const resolvedHash = hashResolved(resolution.resolvedConfig);
  const base = resolve(body?.dir || process.env.EXPORT_DIR || "./exports", "brands", brand.slug,
    versionSel ? `v-${versionLabel}` : "draft");

  const sourceLabel = versionSel ? `version:${versionLabel}` : "draft";
  try {
    const compile = compileBrand(tokens);
    const { files, audit } = buildBrandExport({
      brand: {
        id: brand.id, name: brand.name, slug: brand.slug, description: brand.description,
        tokens, previewIds, parts: brand.parts,
      },
      compile, resolution, source, resolvedHash,
    }, mode);

    for (const [rel, content] of Object.entries(files)) {
      const abs = join(base, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf8");
    }

    const exportId = recordBrandExport({
      brandId: brand.id, brandVersionId, mode, target,
      outDir: base, resolvedHash, status: "ok",
      sourceLabel, files: audit.filesGenerated, omitted: audit.filesOmitted,
      warnings: audit.warnings, partial: audit.partial,
    });

    return NextResponse.json({
      exportId, dir: base, mode,
      source: sourceLabel,
      brandVersionId, resolvedHash, files: Object.keys(files).length,
      audit,
    });
  } catch (error: any) {
    recordBrandExport({
      brandId: brand.id, brandVersionId, mode, target,
      outDir: base, resolvedHash, status: "failed", errorMsg: error?.message ?? "error",
      sourceLabel, partial: true,
    });
    return NextResponse.json({ error: error?.message ?? "export failed" }, { status: 500 });
  }
}
