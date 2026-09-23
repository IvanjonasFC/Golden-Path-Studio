"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentDTO, SearchResult } from "@/lib/types";
import AddToCollection from "./AddToCollection";
import { CustomSelect } from "./CustomSelect";

type Facet = { value: string; count: number };
interface Facets {
  source: Facet[];
  category: Facet[];
  platform: Facet[];
  framework: Facet[];
}

import { withGuard } from "@/lib/previewGuard";

const SOURCE_COLORS: Record<string, string> = {
  uiverse: "#22d3ee",
  magicui: "#a78bfa",
  aceternity: "#f472b6",
  threeui: "#34d399",
  hyperui: "#60a5fa",
  cult: "#fb923c",
  kokonut: "#f0a470",
  shadcn: "#e5e7eb",
  kibo: "#facc15",
  sceneai: "#38bdf8",
  ipromptui: "#818cf8",
  vibecoding: "#ec4899",
  promptvault: "#10b981",
};

export default function CatalogClient({
  facets,
  initial,
}: {
  facets: Facets;
  initial: SearchResult;
}) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [framework, setFramework] = useState("");
  const [data, setData] = useState<SearchResult>(initial);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 60;

  const fetchPage = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (source) params.set("source", source);
      if (category) params.set("category", category);
      if (framework) params.set("framework", framework);
      const nextOffset = reset ? 0 : offset;
      params.set("limit", String(LIMIT));
      params.set("offset", String(nextOffset));
      const res = await fetch(`/api/components?${params}`);
      const json: SearchResult = await res.json();
      setData((prev) =>
        reset
          ? json
          : { total: json.total, items: [...prev.items, ...json.items] },
      );
      setOffset(nextOffset + LIMIT);
      setLoading(false);
    },
    [q, source, category, framework, offset],
  );

  // Recarga (reset) al cambiar filtros, con debounce en el texto.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setOffset(0);
      fetchPage(true);
    }, 220);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, source, category, framework]);

  const canLoadMore = data.items.length < data.total;

  return (
    <div>
      {/* Barra de filtros (estática en el flujo para evitar colisiones con el nav flotante) */}
      <div className="card-surface mb-6 rounded-xl p-3.5 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar: neon button, aurora, 3d card, glassmorphism..."
            className="min-w-[240px] flex-1 rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-[var(--color-accent)]"
          />
          <Select value={source} onChange={setSource} label="Fuente" options={facets.source} />
          <Select value={category} onChange={setCategory} label="Categoria" options={facets.category} />
          <Select value={framework} onChange={setFramework} label="Framework" options={facets.framework} />
          <a
            href="/prompts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-2 text-xs font-bold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)] hover:text-black whitespace-nowrap"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Galería de Prompts (185) →
          </a>
          {(q || source || category || framework) && (
            <button
              onClick={() => {
                setQ("");
                setSource("");
                setCategory("");
                setFramework("");
              }}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)] hover:text-white"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-[var(--color-muted)]">
          {data.total.toLocaleString("es")} resultados
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {data.items.map((c) => (
          <Card key={c.id} c={c} />
        ))}
      </div>

      {data.items.length === 0 && !loading && (
        <p className="mt-10 text-center text-sm text-[var(--color-muted)]">Sin resultados.</p>
      )}

      {canLoadMore && (
        <div className="mt-8 flex justify-center">
          <button
            disabled={loading}
            onClick={() => fetchPage(false)}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Cargar mas"}
          </button>
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: Facet[];
}) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      placeholder={`${label} (todo)`}
      size="md"
      className="min-w-[150px]"
      options={[
        { label: `${label} (todo)`, value: "" },
        ...options.map((o) => ({ label: `${o.value} (${o.count})`, value: o.value })),
      ]}
    />
  );
}

/**
 * Tarjeta con preview VIVO e interactivo (estilo uiverse.io).
 * - El iframe solo se monta cuando la tarjeta entra en pantalla (IntersectionObserver),
 *   asi 4000+ tarjetas no crean 4000 iframes de golpe.
 * - En reposo el iframe tiene pointer-events:none (la pagina hace scroll con normalidad).
 *   Al pasar el raton (group-hover) se vuelve interactivo: se disparan las animaciones
 *   :hover y puedes pulsar botones/toggles dentro, igual que en la web original.
 * - La tarjeta ya NO es un enlace gigante: el titulo y el boton de expandir llevan al detalle,
 *   dejando el area de preview libre para interactuar.
 */
function Card({ c }: { c: ComponentDTO }) {
  const color = SOURCE_COLORS[c.source] ?? "#9aa0ac";
  const href = `/component/${encodeURIComponent(c.id)}`;
  const zoneRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div className="card-surface group relative flex flex-col overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
      {/* Zona de preview interactiva (altura fija en px para no encoger con el font-size global) */}
      <div 
        ref={zoneRef} 
        className="relative h-[200px] overflow-hidden"
        style={{
          backgroundColor: '#16161e',
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
          backgroundSize: '14px 14px'
        }}
      >
        {visible && c.previewHtml ? (
          <iframe
            title={c.name}
            srcDoc={withGuard(c.previewHtml, { fit: true })}
            sandbox="allow-scripts allow-pointer-lock"
            loading="lazy"
            scrolling="no"
            className="h-full w-full border-0 pointer-events-none transition group-hover:pointer-events-auto"
          />
        ) : visible && c.thumbnail ? (
          <a href={href} className="block h-full w-full cursor-pointer">
            {/\.(mp4|mov)(\?.*)?$/i.test(c.thumbnail) ? (
              <video
                src={c.thumbnail}
                muted
                loop
                autoPlay
                playsInline
                className="h-full w-full object-cover transition hover:scale-105"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={c.thumbnail}
                alt={c.name}
                loading="lazy"
                className="h-full w-full object-cover transition hover:scale-105"
              />
            )}
          </a>
        ) : (
          <PreviewFallback framework={c.framework} ready={visible} />
        )}

        {/* Etiqueta de fuente */}
        <span
          className="pointer-events-none absolute left-2 top-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: `${color}22`, color }}
        >
          {c.source}
        </span>

        {/* Pista "hover para probar" (se desvanece al pasar el raton) */}
        {c.previewHtml && (
          <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur transition group-hover:opacity-0">
            pasa el raton para probar
          </span>
        )}

        {/* Acciones (aparecen al hover) */}
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
          <AddToCollection componentId={c.id} compact />
          <a
            href={href}
            title="Ver código y detalles"
            aria-label="Ver código"
            className="flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-[var(--color-accent)] hover:text-black shadow-lg"
          >
            <span>Ver código</span>
            <span className="text-[10px] opacity-70">↗</span>
          </a>
        </div>
      </div>

      {/* Pie */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <a href={href} className="truncate text-sm font-medium transition hover:text-[var(--color-accent)]">
            {c.name}
          </a>
          <span className="shrink-0 text-[10px] text-[var(--color-muted)]">{c.framework}</span>
        </div>
        <span className="text-xs text-[var(--color-muted)]">{c.category}</span>
      </div>
    </div>
  );
}

function PreviewFallback({ framework, ready }: { framework: string; ready: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_40%,#1c1c26,#0b0b0f)]">
      <span className="text-[var(--color-accent,#f0a470)]">
        {ready ? (
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        ) : "…"}
      </span>
      <span className="text-xs text-[var(--color-muted)]">
        {framework} · ver codigo
      </span>
    </div>
  );
}
