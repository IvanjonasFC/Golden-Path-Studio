import { NextResponse } from "next/server";
import { listAllBrandExports } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/exports?limit=  → últimas exportaciones (cross-marca) para la consola de Actividad.
export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 30);
  return NextResponse.json({ items: listAllBrandExports(limit) });
}
