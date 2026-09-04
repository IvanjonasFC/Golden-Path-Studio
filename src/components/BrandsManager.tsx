"use client";

import { useEffect, useMemo, useState } from "react";
import { getResolvedValue, type TokenGroup } from "@/lib/tokens";
import { Modal, CardMenu, EmptyState, formatUpdated } from "./AssetKit";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: TokenGroup;
  updatedAt?: number;
}

type Dialog = { mode: "create" } | { mode: "rename"; id: string; name: string } | { mode: "delete"; id: string; name: string } | null;

/** Cuenta hojas DTCG ($value) del doc de tokens — número real, sin inventar. */
function countTokens(doc: unknown): number {
  let n = 0;
  const walk = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    if (Object.prototype.hasOwnProperty.call(o, "$value")) { n++; return; }
    for (const v of Object.values(o as Record<string, unknown>)) walk(v);
  };
  walk(doc);
  return n;
}

export default function BrandsManager({ q = "", sort = "recent", createNonce = 0 }: { q?: string; sort?: string; createNonce?: number }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };

  const load = async () => {
    const res = await fetch("/api/brands");
    const json = await res.json();
    setBrands(json.items ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setDraftName(""); setDialog({ mode: "create" }); };
  // Crear se dispara desde la toolbar del PerfilManager (createNonce se incrementa).
  useEffect(() => { if (createNonce > 0) openCreate(); }, [createNonce]);

  const view = useMemo(() => {
    const t = q.trim().toLowerCase();
    let arr = t ? brands.filter((b) => b.name.toLowerCase().includes(t) || (b.description ?? "").toLowerCase().includes(t)) : brands.slice();
    if (sort === "name") arr = arr.sort((a, b) => a.name.localeCompare(b.name));
    else arr = arr.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return arr;
  }, [brands, q, sort]);

  const create = async () => {
    if (!draftName.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draftName.trim() }) });
    const b = await res.json();
    setBusy(false);
    setDialog(null);
    if (b?.id) window.location.href = `/marcas/${b.id}`;
    else load();
  };

  const rename = async () => {
    if (dialog?.mode !== "rename" || !draftName.trim() || busy) return;
    setBusy(true);
    await fetch(`/api/brands/${dialog.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draftName.trim() }) });
    setBusy(false);
    setDialog(null);
    flash("Marca renombrada.");
    load();
  };

  const remove = async () => {
    if (dialog?.mode !== "delete" || busy) return;
    setBusy(true);
    await fetch(`/api/brands/${dialog.id}`, { method: "DELETE" });
    setBusy(false);
    setDialog(null);
    flash("Marca eliminada.");
    load();
  };

  const exportBrand = async (id: string) => {
    flash("Exportando…");
    try {
      const res = await fetch(`/api/brands/${id}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const j = await res.json();
      flash(j?.dir ? `Exportada a ${j.dir}` : "Marca exportada.");
    } catch { flash("No se pudo exportar."); }
  };

  const field = "rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]";

  return (
    <div>
      {msg && (
        <div className="mb-4 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-[var(--color-text)]">{msg}</div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
      ) : brands.length === 0 ? (
        <EmptyState
          title="Aún no tienes marcas"
          body="Una marca es tu paleta y tipografía en tokens reutilizables (DTCG). Créala y edítala en el editor visual."
          cta="Crear marca"
          onCta={openCreate}
        />
      ) : (
        <>
          <div className="mb-3 text-xs font-medium text-[var(--color-muted)]">{brands.length} {brands.length === 1 ? "marca" : "marcas"}</div>
          {view.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted)]">Sin resultados para «{q}».</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {view.map((b) => {
                const bg = getResolvedValue(b.tokens, "color.bg") || "#000000";
                const text = getResolvedValue(b.tokens, "color.text") || "#ffffff";
                const primary = getResolvedValue(b.tokens, "color.action.primary") || "#3b82f6";
                const font = getResolvedValue(b.tokens, "font.heading") || "sans-serif";
                const radius = getResolvedValue(b.tokens, "radius.card") || "8px";
                const tokens = countTokens(b.tokens);

                return (
                  <div key={b.id} className="card-surface group relative flex flex-col rounded-xl border border-[var(--color-border)] transition-all hover:border-[var(--color-accent)] hover:shadow-lg">
                    <a href={`/marcas/${b.id}`} className="block h-28 w-full rounded-t-xl p-4" style={{ backgroundColor: bg, color: text, fontFamily: font }}>
                      <div className="flex h-full flex-col justify-between border border-white/10 p-3" style={{ borderRadius: radius }}>
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: primary }} />
                          <span className="truncate text-sm font-bold opacity-90">{b.name}</span>
                        </div>
                        <div>
                          <div className="h-2 w-2/3 rounded opacity-20" style={{ backgroundColor: text }} />
                          <div className="mt-1.5 h-2 w-1/2 rounded opacity-20" style={{ backgroundColor: text }} />
                        </div>
                      </div>
                    </a>

                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <a href={`/marcas/${b.id}`} className="truncate text-base font-semibold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">{b.name}</a>
                        <CardMenu items={[
                          { label: "Abrir", onClick: () => { window.location.href = `/marcas/${b.id}`; } },
                          { label: "Renombrar", onClick: () => { setDraftName(b.name); setDialog({ mode: "rename", id: b.id, name: b.name }); } },
                          { label: "Exportar", onClick: () => exportBrand(b.id) },
                          { label: "Eliminar", danger: true, onClick: () => setDialog({ mode: "delete", id: b.id, name: b.name }) },
                        ]} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-muted)]">
                        <span>{tokens} tokens</span>
                        <span aria-hidden>·</span>
                        <span>actualizada {formatUpdated(b.updatedAt)}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">Local</span>
                      </div>
                      {b.description && <p className="line-clamp-2 text-xs text-[var(--color-muted)]">{b.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Crear */}
      <Modal open={dialog?.mode === "create"} onClose={() => setDialog(null)} title="Crear marca"
        footer={<>
          <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancelar</button>
          <button onClick={create} disabled={!draftName.trim() || busy} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-black disabled:opacity-40">Crear</button>
        </>}>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Nombre de la marca</label>
        <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="p. ej. Ivan Jonas, LifeOS" className={field + " w-full"} />
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">Se creará una base editable (colores, tipografía y radios en tokens) que podrás usar en el editor y en el catálogo.</p>
      </Modal>

      {/* Renombrar */}
      <Modal open={dialog?.mode === "rename"} onClose={() => setDialog(null)} title="Renombrar marca"
        footer={<>
          <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancelar</button>
          <button onClick={rename} disabled={!draftName.trim() || busy} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-black disabled:opacity-40">Guardar</button>
        </>}>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Nombre de la marca</label>
        <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename()} className={field + " w-full"} />
      </Modal>

      {/* Eliminar */}
      <Modal open={dialog?.mode === "delete"} onClose={() => setDialog(null)} title="Eliminar marca"
        footer={<>
          <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancelar</button>
          <button onClick={remove} disabled={busy} className="rounded-lg bg-red-500/90 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40">Eliminar</button>
        </>}>
        <p className="text-sm text-[var(--color-text)]">¿Eliminar <b>{dialog?.mode === "delete" ? dialog.name : ""}</b>? Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  );
}
