import { listFacet, searchComponents, totalCount } from "@/lib/query";
import CatalogClient from "@/components/CatalogClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  const total = totalCount();
  const facets = {
    source: listFacet("source"),
    category: listFacet("category"),
    platform: listFacet("platform"),
    framework: listFacet("framework"),
  };
  const initial = searchComponents({ limit: 60 });

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)]" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient">Golden Path Studio</h1>
            <p className="text-sm text-[var(--color-muted)]">
              {total.toLocaleString("es")} componentes locales · offline · listos para copiar o para tu IA
            </p>
          </div>
        </div>
      </header>

      {total === 0 ? (
        <div className="card-surface rounded-xl p-8 text-center">
          <p className="text-lg font-medium">La base esta vacia.</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Ejecuta <code className="rounded bg-[var(--color-panel-2)] px-1.5 py-0.5">npm run ingest</code> para
            poblarla desde Uiverse, Magic UI y Aceternity.
          </p>
        </div>
      ) : (
        <CatalogClient facets={facets} initial={initial} />
      )}
    </main>
  );
}
