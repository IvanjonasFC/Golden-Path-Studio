import { NextResponse } from "next/server";
import { getComponent } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const component = getComponent(decodeURIComponent(id));
  if (!component) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(component);
}
