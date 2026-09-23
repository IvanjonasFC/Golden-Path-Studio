"use client";

import { useState } from "react";
import BrandsManager from "./BrandsManager";
import CollectionsManager from "./CollectionsManager";
import { CustomSelect } from "./CustomSelect";
import ImportBrandModal from "./ImportBrandModal";

type Tab = "marcas" | "colecciones" | "prompts";

export default function PerfilManager() {
  const [tab, setTab] = useState<Tab>("marcas");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [createNonce, setCreateNonce] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  const switchTab = (t: Tab) => {
    setTab(t);
    setQ("");
    setSort(t === "marcas" ? "recent" : "name");
  };

  const sortOptions = tab === "marcas"
    ? [{ label: "Recientes", value: "recent" }, { label: "Nombre", value: "name" }]
    : [{ label: "Nombre", value: "name" }, { label: "Nº componentes", value: "count" }];

  const field = "rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]";

  return (
    <div className="flex flex-col gap-5">
      {/* Una sola línea: tabs a la izquierda · buscar/ordenar/crear a la derecha */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-black/20 p-1">
          {([["marcas", "Marcas"], ["colecciones", "Colecciones"], ["prompts", "Prompts"]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === id ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "marcas" ? "Buscar marcas…" : "Buscar colecciones…"}
            className={field + " w-[200px]"}
          />
          <CustomSelect value={sort} onChange={setSort} size="md" className="w-[150px]" options={sortOptions} />
          {tab === "marcas" && (
            <button
              onClick={() => setImportOpen(true)}
              className="whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)]/60"
            >
              Importar
            </button>
          )}
          <button
            onClick={() => setCreateNonce((n) => n + 1)}
            className="whitespace-nowrap rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
          >
            {tab === "marcas" ? "Crear marca" : "Crear colección"}
          </button>
        </div>
      </div>

      {tab === "marcas" ? (
        <BrandsManager q={q} sort={sort} createNonce={createNonce} />
      ) : tab === "colecciones" ? (
        <CollectionsManager q={q} sort={sort} createNonce={createNonce} />
      ) : (
        <div className="card-surface rounded-xl border border-[var(--color-border)] p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                Bóveda de Prompts Integrada (185 componentes)
              </h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Prompts completos con especificación técnica, código y vídeo/mockup listos para Claude 3.5 Sonnet, v0 y Cursor.
              </p>
            </div>
            <a
              href="/prompts"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-black shadow-md hover:scale-[1.02] transition"
            >
              Abrir Galería Completa de Prompts →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-lg border border-white/5 bg-black/30 p-4">
              <span className="text-[11px] uppercase font-bold text-sky-400">SceneAI</span>
              <div className="mt-1 text-2xl font-bold text-white">139</div>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">Hero sections, Landing pages y portafolios con fondos en vídeo.</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/30 p-4">
              <span className="text-[11px] uppercase font-bold text-indigo-400">iPromptUI</span>
              <div className="mt-1 text-2xl font-bold text-white">23</div>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">Dashboards analíticos, tablas filtrables, modales y formularios neumórficos.</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/30 p-4">
              <span className="text-[11px] uppercase font-bold text-pink-400">VibeCoding / GitHub</span>
              <div className="mt-1 text-2xl font-bold text-white">23</div>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">Bento grids con cursor glow, tablas de precios 3-tier y paleta ⌘K.</p>
            </div>
          </div>
        </div>
      )}

      <ImportBrandModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
