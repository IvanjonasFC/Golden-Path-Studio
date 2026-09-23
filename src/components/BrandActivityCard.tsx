"use client";

/* ============================================================================
   BrandActivityCard — resumen CONTEXTUAL de «Últimas operaciones» de UNA marca.
   Reutiliza el mismo dato que la consola global (GET /api/brands/<id>/exports,
   que devuelve exports + imports de esa marca). Vista de producto: compacta,
   plegable y bajo demanda; la auditoría completa sigue en BD y en disco.
   ============================================================================ */
import { useCallback, useEffect, useState } from "react";

interface ImportRow {
  id: string; origin: string; tool: string | null; filesScanned: number; productType: string | null;
  scenes: string[]; runtime: boolean; runtimeRan: boolean; ok: boolean;
  warnings: string[]; errors: string[]; createdAt: number;
}
interface ExportRow {
  id: string; mode: string; status: string; createdAt: number; sourceLabel: string | null;
  filesCount: number | null; resolvedHash: string | null; files: string[];
  omitted: { path: string; reason: string }[]; warnings: string[]; partial: boolean;
}
type Row = { kind: "import"; at: number; imp: ImportRow } | { kind: "export"; at: number; exp: ExportRow };

function ago(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60); if (m < 60) return `hace ${m}m`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h}h`;
  return new Date(t).toLocaleDateString();
}

export default function BrandActivityCard({ brandId }: { brandId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [exp, setExp] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const j = await fetch(`/api/brands/${brandId}/exports?limit=20`).then((r) => r.json()).catch(() => ({}));
      const imp: Row[] = (j.imports ?? []).map((x: ImportRow) => ({ kind: "import" as const, at: x.createdAt, imp: x }));
      const ex: Row[] = (j.exports ?? []).map((x: ExportRow) => ({ kind: "export" as const, at: x.createdAt, exp: x }));
      setRows([...imp, ...ex].sort((a, b) => b.at - a.at).slice(0, 12));
    } catch { /* best-effort */ }
    setBusy(false); setLoaded(true);
  }, [brandId]);

  useEffect(() => { if (open && !loaded) load(); }, [open, loaded, load]);

  return (
    <section className="mx-auto mt-6 w-full max-w-[1100px] rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-2)]/40">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text)]">Últimas operaciones</span>
        {loaded && <span className="text-[10px] text-[var(--color-muted)]">{rows.length}</span>}
        <span className="ml-auto text-[11px] text-[var(--color-muted)]">{open ? "ocultar ▲" : "mostrar ▼"}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] px-3 py-2">
          {busy && !loaded && <p className="px-1 py-3 text-[11px] text-[var(--color-muted)]">Cargando…</p>}
          {loaded && rows.length === 0 && (
            <p className="px-1 py-3 text-[11px] text-[var(--color-muted)]">
              Sin operaciones para esta marca todavía. Al importar o exportar aparecerán aquí (y en el panel global de Actividad).
            </p>
          )}
          {rows.map((r) => {
            const id = r.kind === "import" ? r.imp.id : r.exp.id;
            const warnN = r.kind === "import" ? r.imp.warnings.length : r.exp.warnings.length;
            const isErr = r.kind === "import" ? (!r.imp.ok || r.imp.errors.length > 0) : r.exp.status !== "ok";
            const tone = isErr ? "border-red-400/40 bg-red-400/10 text-red-300" : warnN > 0 ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
            const kindChip = r.kind === "import"
              ? <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">import</span>
              : <span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">export</span>;
            const legacyExp = r.kind === "export" && r.exp.filesCount == null && r.exp.files.length === 0;
            const title = r.kind === "import" ? `Importación · ${r.imp.origin}` : `Exportación · ${r.exp.mode}`;
            const sub = r.kind === "import"
              ? `${r.imp.filesScanned} archivo(s) · ${r.imp.productType ?? "tipo —"} · ${r.imp.runtime ? (r.imp.runtimeRan ? "runtime ✓" : "runtime ✗") : "sin runtime"}`
              : legacyExp ? `${r.exp.sourceLabel ?? "—"} · registro previo`
                : `${r.exp.filesCount ?? r.exp.files.length} archivo(s) · ${r.exp.sourceLabel ?? "—"} · ${r.exp.partial ? "parcial" : "completo"}`;
            const isOpen = exp === id;
            return (
              <div key={id} className="mb-1 rounded-lg border border-[var(--color-border)] bg-black/10">
                <button onClick={() => setExp(isOpen ? null : id)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
                  {kindChip}
                  <span className="text-[11px] font-medium text-[var(--color-text)]">{title}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone}`}>{isErr ? "error" : warnN > 0 ? "avisos" : "ok"}</span>
                  <span className="ml-auto text-[10px] text-[var(--color-muted)]">{ago(r.at)}</span>
                </button>
                <div className="px-2.5 pb-1.5 text-[10px] text-[var(--color-muted)]">{sub}</div>
                {isOpen && (
                  <div className="space-y-1 border-t border-[var(--color-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-muted)]">
                    {r.kind === "import" ? (
                      <>
                        <div>herramienta: {r.imp.tool ?? "—"} · escenas: {r.imp.scenes.join(", ") || "—"}</div>
                        {r.imp.warnings.length > 0 && <ul className="space-y-0.5 text-amber-300/90">{r.imp.warnings.slice(0, 6).map((w, i) => <li key={i}>! {w}</li>)}</ul>}
                        {r.imp.errors.length > 0 && <ul className="space-y-0.5 text-red-300/90">{r.imp.errors.slice(0, 6).map((e, i) => <li key={i}>✗ {e}</li>)}</ul>}
                      </>
                    ) : (
                      <>
                        <div>estado: {r.exp.status}{r.exp.partial ? " · parcial" : " · completo"} · hash: <span className="font-mono">{r.exp.resolvedHash ?? "—"}</span></div>
                        {legacyExp && <div className="opacity-70">Registro previo al detalle de auditoría.</div>}
                        {r.exp.files.length > 0 && <div className="font-mono opacity-80">generados ({r.exp.files.length}): {r.exp.files.slice(0, 8).join(", ")}{r.exp.files.length > 8 ? "…" : ""}</div>}
                        {r.exp.omitted.length > 0 && <div>omitidos: {r.exp.omitted.map((o) => o.path).join(", ")}</div>}
                        {r.exp.warnings.length > 0 && <ul className="space-y-0.5 text-amber-300/90">{r.exp.warnings.slice(0, 6).map((w, i) => <li key={i}>! {w}</li>)}</ul>}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="px-1 pt-1 text-[9px] text-[var(--color-muted)]">Mismo dato que el panel global de Actividad · auditoría completa en BD y <span className="font-mono">.analysis/logs</span>.</div>
        </div>
      )}
    </section>
  );
}
