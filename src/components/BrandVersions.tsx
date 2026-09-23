"use client";

/* ============================================================================
   Panel de versiones publicadas de una marca. Consume SOLO los endpoints REST
   (/versions, /diff, /restore); no recalcula nada en cliente. Autocontenido:
   listo para montar en la pestana Visual de BrandEditor.
   ============================================================================ */
import { useCallback, useEffect, useState } from "react";
import { logEvent } from "@/lib/log";

type Version = {
  id: string;
  version: string;
  label?: string | null;
  presetId?: string | null;
  createdAt: number;
  coverage?: { global?: number } | null;
};
type Msg = { kind: "ok" | "error" | "blocked"; text: string; issues?: string[] };

function pct(n?: number) { return Math.round((n ?? 0) * 100); }
function when(ts: number) { try { return new Date(ts).toLocaleString(); } catch { return String(ts); } }

export type RestoredBrand = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  tokens: unknown;
  previewIds: string[];
  parts?: unknown[];
};

export function BrandVersions({
  brandId,
  getDraft,
  onRestored,
  onPublished,
}: {
  brandId: string;
  getDraft?: () => { name: string; tokens: unknown; previewIds: string[] };
  onRestored?: (brand: RestoredBrand) => void;
  onPublished?: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [versionInput, setVersionInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [diffFor, setDiffFor] = useState<string | null>(null);
  const [diffChanges, setDiffChanges] = useState<string[] | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/brands/${brandId}/versions`);
      const d = await r.json();
      setVersions(Array.isArray(d.versions) ? d.versions : []);
    } catch { setVersions([]); }
    setLoading(false);
  }, [brandId]);

  useEffect(() => { void load(); }, [load]);

  const publish = async () => {
    setPublishing(true); setMsg(null);
    try {
      const r = await fetch(`/api/brands/${brandId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Incluir el borrador actual del editor para que el snapshot capture
        // también los cambios sin guardar (integridad del snapshot).
        body: JSON.stringify({ version: versionInput.trim() || undefined, label: labelInput.trim() || undefined, ...(getDraft ? getDraft() : {}) }),
      });
      const d = await r.json().catch(() => ({} as Record<string, unknown>));
      if (r.ok) {
        const v = (d as { version?: { version?: string } }).version?.version ?? "";
        logEvent("version.publish", { version: v });
        setMsg({ kind: "ok", text: `Punto de control guardado con éxito: ${v}` });
        setVersionInput(""); setLabelInput(""); await load();
        if (onPublished) onPublished();
      } else if (r.status === 422) {
        setMsg({ kind: "blocked", text: "Publicación bloqueada: faltan campos obligatorios.", issues: (d as { blockingIssues?: string[] }).blockingIssues ?? [] });
      } else {
        setMsg({ kind: "error", text: (d as { error?: string }).error ?? "Error al publicar." });
      }
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Error de red." });
    }
    setPublishing(false);
  };

  const exportVersion = async (v: string) => {
    try {
      const r = await fetch(`/api/brands/${brandId}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: v, mode: "full" }) });
      const d = (await r.json().catch(() => ({}))) as { dir?: string; error?: string };
      logEvent("export", { version: v, mode: "full" });
      setMsg(r.ok && d.dir ? { kind: "ok", text: `Pack exportado (v${v}) a ${d.dir}` } : { kind: "error", text: d.error ?? "No se pudo exportar." });
    } catch { setMsg({ kind: "error", text: "No se pudo exportar." }); }
  };

  const showDiff = async (v: string) => {
    logEvent("version.diff", { version: v });
    setDiffFor(v); setDiffChanges(null);
    try {
      // Persistir el draft visible para que el diff "vs draft" refleje lo editado
      // (los cambios visuales no se guardan hasta pulsar Guardar Borrador).
      if (getDraft) {
        await fetch(`/api/brands/${brandId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getDraft()) });
      }
      const r = await fetch(`/api/brands/${brandId}/diff?v=${encodeURIComponent(v)}`);
      const d = await r.json();
      setDiffChanges(Array.isArray(d.changes) ? d.changes : []);
    } catch { setDiffChanges([]); }
  };

  const restore = async (v: string) => {
    try {
      const r = await fetch(`/api/brands/${brandId}/restore/${encodeURIComponent(v)}`, { method: "POST" });
      if (!r.ok) throw new Error();
      const d = (await r.json().catch(() => ({}))) as { brand?: RestoredBrand };
      logEvent("version.restore", { version: v });
      setConfirmRestore(null);
      if (d?.brand && onRestored) {
        // Restore EN VIVO: el editor se re-hidrata al momento; sin recarga manual.
        onRestored(d.brand);
        setMsg({ kind: "ok", text: `Restaurado desde ${v} — editor actualizado en vivo.` });
      } else {
        setMsg({ kind: "ok", text: `Draft restaurado desde ${v}. Recarga para ver los tokens.` });
      }
    } catch { setMsg({ kind: "error", text: "No se pudo restaurar." }); }
  };

  const msgCls = msg?.kind === "ok" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
    : msg?.kind === "blocked" ? "border-red-400/40 bg-red-400/10 text-red-200"
    : "border-amber-400/40 bg-amber-400/10 text-amber-200";

  return (
    <div className="card-surface rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Versiones publicadas</h3>
        <span className="text-[11px] font-semibold text-[var(--color-muted)]">{versions.length}</span>
      </div>

      {/* Publicar */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
          Version (auto si vacio)
          <input value={versionInput} onChange={(e) => setVersionInput(e.target.value)} placeholder="p.ej. 1.2.0"
            className="w-28 rounded-md border border-white/15 bg-[var(--color-panel-2)] px-2 py-1 text-xs text-[var(--color-text)]" />
        </label>
        <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
          Etiqueta (opcional)
          <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} placeholder="p.ej. Entrega a diseno"
            className="w-full rounded-md border border-white/15 bg-[var(--color-panel-2)] px-2 py-1 text-xs text-[var(--color-text)]" />
        </label>
        <button type="button" onClick={publish} disabled={publishing}
          className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50">
          {publishing ? "Publicando…" : "Publicar snapshot"}
        </button>
      </div>

      {msg && (
        <div className={"mt-3 rounded-lg border px-3 py-2 text-xs " + msgCls}>
          <p className="font-semibold">{msg.text}</p>
          {msg.issues && msg.issues.length > 0 && (
            <ul className="mt-1 space-y-0.5">{msg.issues.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5"><span className="mt-0.5">✕</span><span>{b}</span></li>
            ))}</ul>
          )}
        </div>
      )}

      {/* Historial */}
      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-[11px] text-[var(--color-muted)]">Cargando historial…</p>
        ) : versions.length === 0 ? (
          <p className="text-[11px] text-[var(--color-muted)]">Aun no hay snapshots publicados.</p>
        ) : versions.map((v) => (
          <div key={v.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[var(--color-panel-2)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-text)]">{v.version}</span>
              {v.label && <span className="text-[11px] text-[var(--color-muted)]">{v.label}</span>}
              <span className="ml-auto rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">{pct(v.coverage?.global)}% cobertura</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-muted)]">
              <span>{when(v.createdAt)}</span>
              {v.presetId && <span>preset: {v.presetId}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => showDiff(v.version)}
                className="rounded-md bg-[var(--color-panel-2)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted)] hover:text-white">Ver diff (vs draft)</button>
              <button type="button" onClick={() => exportVersion(v.version)} title="Pack completo IA/build anclado a esta versión publicada"
                className="rounded-md bg-[var(--color-panel-2)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted)] hover:text-white">Exportar pack</button>
              {confirmRestore === v.version ? (
                <>
                  <button type="button" onClick={() => restore(v.version)}
                    className="rounded-md bg-red-500/80 px-2 py-1 text-[11px] font-bold text-white">Confirmar restaurar</button>
                  <button type="button" onClick={() => setConfirmRestore(null)}
                    className="rounded-md bg-[var(--color-panel-2)] px-2 py-1 text-[11px] text-[var(--color-muted)]">Cancelar</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmRestore(v.version)}
                  className="rounded-md bg-[var(--color-panel-2)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted)] hover:text-white">Restaurar al draft</button>
              )}
            </div>
            {diffFor === v.version && (
              <div className="mt-2 rounded-md border border-white/10 bg-black/30 p-2 text-[11px]">
                {diffChanges === null ? <span className="text-[var(--color-muted)]">Calculando diff…</span>
                  : diffChanges.length === 0 ? <span className="text-[var(--color-muted)]">Sin cambios frente al draft.</span>
                  : <ul className="space-y-0.5">{diffChanges.map((c, i) => <li key={i} className="text-[var(--color-text)]/90">• {c}</li>)}</ul>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
