import { NextResponse } from "next/server";
import { searchComponents } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const num = (k: string) => {
    const v = searchParams.get(k);
    return v ? Number(v) : undefined;
  };
  const str = (k: string) => searchParams.get(k) || undefined;

  const result = searchComponents({
    q: str("q"),
    source: str("source"),
    category: str("category"),
    platform: str("platform"),
    framework: str("framework"),
    limit: num("limit"),
    offset: num("offset"),
  });

  return NextResponse.json(result);
}
