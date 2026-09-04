"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "./CustomSelect";
import { Modal, CardMenu, EmptyState } from "./AssetKit";

interface Col {
  id: string;
  name: string;
  slug: string;
  kind: string;
  description: string | null;
  count: number;
}

const KIND_LABEL: Record<string, string> = { stack: "Stack", brand: "Marca", project: "Proyecto" };

type Dialog = { mode: "create" } | { mode: "delete"; id: string; name: string } | null;

export default function CollectionsManager({ q = "", sort = "name", createNonce = 0 }: { q?: string; sort?: string; createNonce?: number }) {
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draftName, setDraftName] = useState("");
  const [draftKind, setDraftKind] = useState("stack");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };

  const load = async () => {
    const res = await fetch("/api/collections");
    const json = await res.json();
    setCols(json.items ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setDraftName(""); setDraftKind("stack"); setDialog({ mode: "create" }); };
  useEffect(() => { if (createNonce > 0) openCreate(); }, [createNonce]);

  const view = useMemo(() => {
    const t = q.trim().toLowerCase();
    let arr = t ? cols.filter((c) => c.name.toLowerCase().includes(t) || (c.description ?? "").toLowerCase().includes(t)) : cols.slice();
    if (sort === "count") arr = arr.sort((a, b) => b.count - a.count);
    else arr = arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [cols, q, sort]);

  const create = async () => {
    if (!draftName.trim() || busy) return;
    setBusy(true);
    await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draftName.trim(), kind: draftKind }) });
    setBusy(false);
    setDialog(null);
    flash("Colección creada.");
    load();
  };

  const remove = async () => {
    if (dialog?.mode !== "delete" || busy) return;
    setBusy(true);
    await fetch(`/api/collections/${dialog.id}`, { method: "DELETE" });
    setBusy(false);
    setDialog(null);
    flash("Colección eliminada.");
    load();
  };

  const duplicate = async (id: string) => {
    flash("Duplicando…");
    await fetch(`/api/collections/${id}/duplicate`, { method: "POST" });
    flash("Colección duplicada.");
    load();
  };

  const field = "rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]";

  return (
    <div>
      {msg && (
        <div className="mb-4 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-[var(--color-text)]">{msg}</div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
      ) : cols.length === 0 ? (
        <EmptyState
          title="Aún no tienes colecciones"
          body="Agrupa componentes por stack, marca o proyecto. Luego añádeles componentes desde el catálogo y compártelos con tu IA."
          cta="Crear colección"
          onCta={openCreate}
        />
      ) : (
        <>
          <div className="mb-3 text-xs font-medium text-[var(--color-muted)]">{cols.length} {cols.length === 1 ? "colección" : "colecciones"}</div>
          {view.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted)]">Sin resultados para «{q}».</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {view.map((c) => (
                <div key={c.id} className="card-surface group relative flex flex-col rounded-xl border border-[var(--color-border)] p-5 transition-all hover:border-[var(--color-accent)] hover:shadow-lg">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                      {KIND_LABEL[c.kind] ?? c.kind}
                    </span>
                    <CardMenu items={[
                      { label: "Abrir", onClick: () => { window.location.href = `/colecciones/${c.id}`; } },
                      { label: "Duplicar", onClick: () => duplicate(c.id) },
                      { label: "Eliminar", danger: true, onClick: () => setDialog({ mode: "delete", id: c.id, name: c.name }) },
                    ]} />
                  </div>
                  <a href={`/colecciones/${c.id}`} className="truncate text-lg font-bold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">{c.name}</a>
                  <div className="mt-1 text-[11px] text-[var(--color-muted)]">{c.count} {c.count === 1 ? "componente" : "componentes"}</div>
                  {c.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">{c.description}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Crear */}
      <Modal open={dialog?.mode === "create"} onClose={() => setDialog(null)} title="Crear colección"
        footer={<>
          <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancelar</button>
          <button onClick={create} disabled={!draftName.trim() || busy} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-black disabled:opacity-40">Crear</button>
        </>}>
        <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Nombre</label>
        <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="p. ej. Stack SaaS, Landing X" className={field + " w-full"} />
        <label className="mb-1.5 mt-3 block text-xs font-medium text-[var(--color-muted)]">Tipo</label>
        <CustomSelect value={draftKind} onChange={setDraftKind} size="md" className="w-full" options={[{ label: "Stack", value: "stack" }, { label: "Marca", value: "brand" }, { label: "Proyecto", value: "project" }]} />
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">Una base editable para agrupar componentes y compartirlos con tu IA y en el catálogo.</p>
      </Modal>

      {/* Eliminar */}
      <Modal open={dialog?.mode === "delete"} onClose={() => setDialog(null)} title="Eliminar colección"
        footer={<>
          <button onClick={() => setDialog(null)} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancelar</button>
          <button onClick={remove} disabled={busy} className="rounded-lg bg-red-500/90 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40">Eliminar</button>
        </>}>
        <p className="text-sm text-[var(--color-text)]">¿Eliminar <b>{dialog?.mode === "delete" ? dialog.name : ""}</b>? Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  );
}
