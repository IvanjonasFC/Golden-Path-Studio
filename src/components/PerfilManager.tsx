"use client";

import { useState } from "react";
import BrandsManager from "./BrandsManager";
import CollectionsManager from "./CollectionsManager";
import { CustomSelect } from "./CustomSelect";
import ImportBrandModal from "./ImportBrandModal";

type Tab = "marcas" | "colecciones";

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
          {([["marcas", "Marcas"], ["colecciones", "Colecciones"]] as const).map(([id, label]) => (
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

      {tab === "marcas"
        ? <BrandsManager q={q} sort={sort} createNonce={createNonce} />
        : <CollectionsManager q={q} sort={sort} createNonce={createNonce} />}

      <ImportBrandModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
