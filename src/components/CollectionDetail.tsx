"use client";

import { useEffect, useState } from "react";
import type { ComponentDTO } from "@/lib/types";
import { RegistryInstall } from "./CodeViewer";
import { CustomSelect } from "./CustomSelect";

import { withGuard, GUARD } from "@/lib/previewGuard";

interface BrandTokens {
  background?: string;
  foreground?: string;
  accent?: string;
  accentHover?: string;
  fontDisplay?: string;
  fontBody?: string;
  radius?: string;
  notes?: string;
}
interface Collection {
  id: string;
  name: string;
  slug: string;
  kind: string;
  description: string | null;
  brandTokens: BrandTokens | null;
  brandId: string | null;
  components: ComponentDTO[];
}

const SOURCE_COLORS: Record<string, string> = {
  uiverse: "#22d3ee",
  magicui: "#a78bfa",
  aceternity: "#f472b6",
  threeui: "#34d399",
  hyperui: "#60a5fa",
  shadcn: "#e5e7eb",
  cult: "#f59e0b",
  kokonut: "#f97316",
};

/** Documento renderizable de un componente sobre el fondo/tipografia de la marca. */
function brandPreviewDoc(c: ComponentDTO, b: BrandTokens): string {
  const htmlFile = c.files.find((f) => /\.html?$/i.test(f.path));
  const inner = htmlFile ? htmlFile.content : "";
  const tw = c.framework === "tailwind" ? '<script src="https://cdn.tailwindcss.com"></script>' : "";
  const bg = b.background || "#0b0b0f";
  const fg = b.foreground || "#eeeeee";
  const font = b.fontBody || "system-ui";
  const radiusVar = b.radius ? `:root{--radius:${b.radius}}` : "";
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">${tw}
<style>*{box-sizing:border-box}html,body{height:100%;margin:0}
body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${fg};
font-family:${font},system-ui,sans-serif;padding:18px}${radiusVar}</style>
</head><body>${inner}${GUARD}</body></html>`;
}

export default function CollectionDetail({ initial }: { initial: Collection }) {
  const [col, setCol] = useState(initial);
  const [comps, setComps] = useState<ComponentDTO[]>(initial.components);
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState(initial.kind);
  const [description, setDescription] = useState(initial.description ?? "");
  const [brand, setBrand] = useState<BrandTokens>(initial.brandTokens ?? {});
  const [msg, setMsg] = useState<string | null>(null);
  const [exportDir, setExportDir] = useState("");
  const [showBrand, setShowBrand] = useState(true);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [brandId, setBrandId] = useState(initial.brandId ?? "");

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((j) => setBrands(j.items ?? []))
      .catch(() => {});
  }, []);

  const linkBrand = async (id: string) => {
    setBrandId(id);
    await fetch(`/api/collections/${col.id}/brand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: id || null }),
    });
    flash(id ? "Marca vinculada." : "Marca desvinculada.");
  };

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  };

  const save = async () => {
    const res = await fetch(`/api/collections/${col.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind, description, brandTokens: brand }),
    });
    const updated = await res.json();
    setCol(updated);
    flash("Guardado.");
  };

  const copyPrompt = async () => {
    const res = await fetch(`/api/collections/${col.id}/prompt`);
    const { prompt } = await res.json();
    try {
      await navigator.clipboard.writeText(prompt);
      flash("Prompt copiado al portapapeles.");
    } catch {
      flash("No se pudo copiar (portapapeles bloqueado).");
    }
  };

  const doExport = async () => {
    const res = await fetch(`/api/collections/${col.id}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exportDir ? { dir: exportDir } : {}),
    });
    const json = await res.json();
    if (json.error) flash(`Error: ${json.error}`);
    else flash(`Exportado: ${json.components} componentes, ${json.fileCount} ficheros → ${json.dir}`);
  };

  const removeComp = async (id: string) => {
    await fetch(`/api/collections/${col.id}/items?componentId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setComps((prev) => prev.filter((c) => c.id !== id));
  };

  const move = async (id: string, dir: "up" | "down") => {
    setComps((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    await fetch(`/api/collections/${col.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ componentId: id, direction: dir }),
    });
  };

  const field =
    "rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-sm outline-none w-full";

  return (
    <div>
      {msg && (
        <div className="mb-4 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2 text-sm">
          {msg}
        </div>
      )}

      {/* Cabecera editable */}
      <div className="card-surface mb-6 rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={field + " flex-1 min-w-[220px]"} />
          <CustomSelect
            value={kind}
            onChange={setKind}
            size="md"
            className="w-[140px]"
            options={[
              { label: "Stack", value: "stack" },
              { label: "Marca", value: "brand" },
              { label: "Proyecto", value: "project" },
            ]}
          />
          <button onClick={save} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black">
            Guardar
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción / instrucciones para la IA…"
          rows={2}
          className={field + " mt-2 resize-y"}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-muted)]">Marca vinculada</span>
          <CustomSelect
            value={brandId}
            onChange={linkBrand}
            placeholder="— sin marca —"
            size="md"
            className="w-[200px]"
            options={[
              { label: "— sin marca —", value: "" },
              ...brands.map((b) => ({ label: b.name, value: b.id })),
            ]}
          />
          <a href="/marcas" className="text-xs text-[var(--color-accent)] hover:underline">
            gestionar marcas →
          </a>
          <span className="text-xs text-[var(--color-muted)]">
            Sus tokens compilados viajan en el prompt IA y en la exportación.
          </span>
        </div>
      </div>

      {/* Editor de marca */}
      {kind === "brand" && (
        <div className="card-surface mb-6 rounded-xl p-4">
          <h2 className="mb-3 text-sm font-medium text-[var(--color-muted)]">Design tokens de la marca</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["background", "Fondo"],
              ["foreground", "Texto"],
              ["accent", "Acento"],
              ["accentHover", "Acento hover"],
              ["fontDisplay", "Fuente títulos"],
              ["fontBody", "Fuente cuerpo"],
              ["radius", "Radio bordes"],
            ] as const).map(([key, label]) => (
              <label key={key} className="text-xs text-[var(--color-muted)]">
                {label}
                <input
                  value={(brand as any)[key] ?? ""}
                  onChange={(e) => setBrand({ ...brand, [key]: e.target.value })}
                  placeholder={key.includes("font") ? "Inter" : key === "radius" ? "0.75rem" : "#F0A470"}
                  className={field + " mt-1"}
                />
              </label>
            ))}
          </div>
          <textarea
            value={brand.notes ?? ""}
            onChange={(e) => setBrand({ ...brand, notes: e.target.value })}
            placeholder="Notas de marca (tono, estilo, do/don't)…"
            rows={2}
            className={field + " mt-3 resize-y"}
          />
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Recuerda pulsar <b>Guardar</b>. Estos tokens viajan en el prompt de IA y en la exportación.
          </p>
        </div>
      )}

      {/* Vista previa con la marca */}
      {kind === "brand" && (
        <div className="card-surface mb-6 rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--color-muted)]">Vista previa con tu marca</h2>
            <button onClick={() => setShowBrand((v) => !v)} className="text-xs text-[var(--color-accent)]">
              {showBrand ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {showBrand &&
            (comps.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]">
                Añade componentes para verlos sobre tu marca.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
                  {comps.map((c) => {
                    const hasHtml = c.files.some((f) => /\.html?$/i.test(f.path));
                    return (
                      <div key={c.id} className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                        {hasHtml ? (
                          <iframe
                            title={`brand-${c.id}`}
                            srcDoc={brandPreviewDoc(c, brand)}
                            sandbox="allow-scripts"
                            scrolling="no"
                            loading="lazy"
                            className="h-[160px] w-full border-0 pointer-events-none"
                          />
                        ) : (
                          <div
                            className="grid h-32 place-items-center text-xs text-[var(--color-muted)]"
                            style={{ background: brand.background || "#0b0b0f" }}
                          >
                            sin HTML
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  Se muestran sobre tu <b>fondo</b> y <b>tipografía</b>. Los colores propios de cada
                  componente se respetan; el <b>acento</b> viaja en el prompt de IA y en la exportación.
                  Edita los tokens arriba para verlo cambiar al momento.
                </p>
              </>
            ))}
        </div>
      )}

      {/* Acciones */}
      <div className="card-surface mb-6 flex flex-wrap items-center gap-2 rounded-xl p-4">
        <button onClick={copyPrompt} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black">
          Copiar prompt IA
        </button>
        <div className="flex items-center gap-1">
          <input
            value={exportDir}
            onChange={(e) => setExportDir(e.target.value)}
            placeholder="Carpeta destino (opcional, def. ./exports)"
            className="w-64 rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-xs outline-none"
          />
          <button onClick={doExport} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-white/5">
            Exportar a proyecto
          </button>
        </div>
        <span className="text-xs text-[var(--color-muted)]">{comps.length} componentes</span>
      </div>

      {/* Instalar el perfil entero desde el registry local */}
      {comps.length > 0 && (
        <div className="card-surface mb-6 rounded-xl p-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--color-muted)]">
            Instalar este perfil en un proyecto
          </h2>
          <RegistryInstall id={col.slug} kind="collection" />
          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
            Instala de una vez todos los componentes del perfil desde tu registry local
            (web arrancada o desplegada, y <code>shadcn</code> inicializado en el destino).
          </p>
        </div>
      )}

      {/* Componentes */}
      {comps.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Vacío. Ve al <a href="/" className="text-[var(--color-accent)]">catálogo</a> y usa “＋ Colección” en los componentes.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {comps.map((c, i) => (
            <div key={c.id} className="card-surface group flex flex-col overflow-hidden rounded-xl">
              <div className="relative h-[180px] overflow-hidden bg-[#0b0b0f]">
                {c.previewHtml ? (
                  <iframe
                    title={c.name}
                    srcDoc={withGuard(c.previewHtml)}
                    sandbox="allow-scripts allow-pointer-lock"
                    loading="lazy"
                    scrolling="no"
                    className="h-full w-full border-0 pointer-events-none transition group-hover:pointer-events-auto"
                  />
                ) : c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnail} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--color-accent,#f0a470)]">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                )}
                <a
                  href={`/component/${encodeURIComponent(c.id)}`}
                  title="Abrir componente"
                  className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md bg-black/60 text-sm text-white opacity-0 backdrop-blur transition hover:bg-[var(--color-accent)] hover:text-black group-hover:opacity-100"
                >
                  ⤢
                </a>
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <a
                    href={`/component/${encodeURIComponent(c.id)}`}
                    className="block truncate text-sm font-medium transition hover:text-[var(--color-accent)]"
                  >
                    {c.name}
                  </a>
                  <div className="text-[10px] uppercase" style={{ color: SOURCE_COLORS[c.source] ?? "#9aa0ac" }}>
                    {c.source}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => move(c.id, "up")}
                    disabled={i === 0}
                    title="Subir"
                    className="rounded-md border border-[var(--color-border)] px-1.5 py-1 text-xs text-[var(--color-muted)] hover:text-white disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(c.id, "down")}
                    disabled={i === comps.length - 1}
                    title="Bajar"
                    className="rounded-md border border-[var(--color-border)] px-1.5 py-1 text-xs text-[var(--color-muted)] hover:text-white disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeComp(c.id)}
                    title="Quitar de la colección"
                    className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)] hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
