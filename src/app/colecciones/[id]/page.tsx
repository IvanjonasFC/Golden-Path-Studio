import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection, getCollectionComponents } from "@/lib/collections";
import CollectionDetail from "@/components/CollectionDetail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const col = getCollection(decodeURIComponent(id));
  if (!col) notFound();
  const components = getCollectionComponents(col.id);

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8">
      <Link href="/colecciones" className="text-sm text-[var(--color-muted)] hover:text-white">
        ← Colecciones
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold tracking-tight text-gradient">{col.name}</h1>
      <CollectionDetail initial={{ ...col, components }} />
    </main>
  );
}
