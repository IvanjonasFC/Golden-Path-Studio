import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrand } from "@/lib/brands";
import { searchComponents, getComponent } from "@/lib/query";
import BrandEditor from "@/components/BrandEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = getBrand(decodeURIComponent(id));
  if (!brand) notFound();

  // Componentes curados por el usuario; si no hay, unos de partida.
  let comps = brand.previewIds
    .map((cid) => getComponent(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (comps.length === 0) {
    const nav = searchComponents({ q: "navbar", limit: 1 }).items;
    const foot = searchComponents({ q: "footer", limit: 1 }).items;
    const cards = searchComponents({ category: "Cards", limit: 2 }).items;
    const btns = searchComponents({ category: "Buttons", limit: 3 }).items;
    
    comps = [...(nav.length ? nav : searchComponents({ category: "Navbars", limit: 1 }).items), ...btns, ...cards, ...foot];
  }
  const samples = comps.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    framework: c.framework,
    files: c.files,
    previewHtml: c.previewHtml,
  }));

  return (
    <main className="w-full h-full px-2 py-4">
      <BrandEditor initial={brand} samples={samples} />
    </main>
  );
}
