import { NextResponse } from "next/server";
import { listBrands, createBrand } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ items: listBrands() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }
  const brand = createBrand({
    name: body.name,
    description: body.description,
    tokens: body.tokens,
  });
  return NextResponse.json(brand, { status: 201 });
}
