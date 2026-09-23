"use client";

/* ============================================================================
   ActivityConsole — consola/panel OCULTABLE de Actividad. Es la CAPA DE
   VISUALIZACIÓN de la trazabilidad: no es el sistema de logs en sí. Se apoya en
   las otras dos capas ya existentes:
     · BD        → historial estructurado (GET /api/imports, /api/exports),
     · disco     → auditoría portable (.analysis/logs/*.json, EXPORT_LOG.json…).
   Aquí solo se OBSERVA: eventos claros, filtrables, con resumen y detalle.
   ============================================================================ */
import { useCallback, useEffect, useRef, useState } from "react";

/* DTOs locales (no importamos libs de servidor en el cliente). */
interface ImportRow {
  id: string; brandId: string | null; origin: string; root: string | null; tool: string | null;
  filesScanned: number; productType: string | null; scenes: string[];
  runtime: boolean; runtimeRan: boolean; ok: boolean;
  warnings: string[]; errors: string[]; durationMs: number | null; createdAt: number;
}
interface ExportRow {
  id: string; brandId: string | null; mode: string; target: string; status: string;
  errorMsg: string | null; createdAt: number; sourceLabel: string | null; filesCount: number | null;
  resolvedHash: string | null;
  files: string[]; omitted: { path: string; reason: string }[]; warnings: string[]; partial: boolean;
}
type Row =
  | { kind: "import"; at: number; imp: ImportRow }
  | { kind: "export"; at: number; exp: ExportRow };

type Filter = "all" | "brand" | "import" | "export" | "runtime" | "warning" | "error";
type Mode = "resumen" | "tecnico";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "import", label: "Import" },
  { id: "export", label: "Export" },
  { id: "runtime", label: "Runtime" },
  { id: "warning", label: "Avisos" },
  { id: "error", label: "Errores" },
];

function ago(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60); if (m < 60) return `hace ${m}m`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h}h`;
  return new Date(t).toLocaleDateString();
}
function rowWarnings(r: Row): number { return r.kind === "import" ? r.imp.warnings.length : r.exp.warnings.length; }
function rowIsError(r: Row): boolean {
  return r.kind === "import" ? (!r.imp.ok || r.imp.errors.length > 0) : r.exp.status !== "ok";
}
function rowBrandId(r: Row): string | null { return r.kind === "import" ? r.imp.brandId : r.exp.brandId; }

function StatusChip({ tone, text }: { tone: "ok" | "warn" | "error"; text: string }) {
  const cls = tone === "ok"
    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
    : tone === "warn"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
      : "border-red-400/40 bg-red-400/10 text-red-300";
  return <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}>{text}</span>;
}

export default function ActivityConsole() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("resumen");
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const inited = useRef(false);
  // Marca actual (si estamos en /marcas/<id>) → habilita el filtro "Esta marca".
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);
  const detectBrand = useCallback(() => {
    try {
      const m = window.location.pathname.match(/\/marcas\/([^/?#]+)/);
      setCurrentBrandId(m ? decodeURIComponent(m[1]) : null);
    } catch { setCurrentBrandId(null); }
  }, []);
  useEffect(() => { if (open) detectBrand(); }, [open, detectBrand]);

  // Restaura preferencias (best-effort).
  useEffect(() => {
    try {
      if (localStorage.getItem("activity.open") === "1") setOpen(true);
      const m = localStorage.getItem("activity.mode"); if (m === "tecnico" || m === "resumen") setMode(m);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("activity.open", open ? "1" : "0"); } catch { /* ignore */ } }, [open]);
  useEffect(() => { try { localStorage.setItem("activity.mode", mode); } catch { /* ignore */ } }, [mode]);

  const load = useCallback(async () => {
    setBusy(true); setErr(null); detectBrand();
    try {
      const [ri, re] = await Promise.all([
        fetch("/api/imports?limit=50").then((r) => r.json()).catch(() => ({ items: [] })),
        fetch("/api/exports?limit=50").then((r) => r.json()).catch(() => ({ items: [] })),
      ]);
      const imp: Row[] = (ri.items ?? []).map((x: ImportRow) => ({ kind: "import" as const, at: x.createdAt, imp: x }));
      const exp: Row[] = (re.items ?? []).map((x: ExportRow) => ({ kind: "export" as const, at: x.createdAt, exp: x }));
      setRows([...imp, ...exp].sort((a, b) => b.at - a.at));
    } catch (e) { setErr((e as Error).message ?? "no se pudo cargar"); }
    setBusy(false);
  }, [detectBrand]);

  // Carga al abrir la primera vez.
  useEffect(() => { if (open && !inited.current) { inited.current = true; load(); } }, [open, load]);

  const visible = rows.filter((r) => {
    switch (filter) {
      case "all": return true;
      case "brand": return !currentBrandId || rowBrandId(r) === currentBrandId;
      case "import": return r.kind === "import";
      case "export": return r.kind === "export";
      case "runtime": return r.kind === "import" && r.imp.runtime;
      case "warning": return rowWarnings(r) > 0;
      case "error": return rowIsError(r);
    }
  });

  const toggleRow = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      {/* Botón flotante para abrir/cerrar */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Actividad"
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3.5 py-2 text-xs font-bold text-[var(--color-text)] shadow-2xl backdrop-blur transition-transform hover:scale-[1.03]"
      >
        <span className={`inline-block h-2 w-2 rounded-full ${rows.some(rowIsError) ? "bg-red-400" : "bg-emerald-400"}`} />
        Actividad
      </button>

      {/* Drawer inferior */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[59] transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
        role="dialog" aria-label="Consola de actividad" aria-hidden={!open}
      >
        <div className="mx-auto flex max-h-[46vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-popover)] shadow-2xl">
          {/* Cabecera */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text)]">Actividad</span>
            <span className="text-[10px] text-[var(--color-muted)]">{rows.length} operación(es){filter !== "all" ? ` · ${visible.length} en filtro` : ""}</span>

            {/* Filtros */}
            <div className="ml-2 flex flex-wrap gap-1">
              {[...(currentBrandId ? [{ id: "brand" as Filter, label: "Esta marca" }] : []), ...FILTERS].map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${filter === f.id ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"}`}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1">
              {/* Modo resumen / técnico */}
              <div className="mr-1 inline-flex overflow-hidden rounded-md border border-[var(--color-border)]">
                {(["resumen", "tecnico"] as Mode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${mode === m ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"}`}>
                    {m === "tecnico" ? "técnico" : m}
                  </button>
                ))}
              </div>
              <button onClick={load} disabled={busy} className="rounded-md px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-40">{busy ? "…" : "Refrescar"}</button>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-md px-2 py-0.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-text)]">✕</button>
            </div>
          </div>

          {/* Lista */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {err && <p className="px-2 py-1 text-[11px] text-red-300">No se pudo cargar la actividad: {err}</p>}
            {!err && visible.length === 0 && (
              <p className="px-2 py-6 text-center text-[11px] text-[var(--color-muted)]">
                {busy ? "Cargando…" : "Sin operaciones registradas todavía. Importa o exporta una marca y aparecerá aquí."}
              </p>
            )}
            {visible.map((r) => {
              const id = r.kind === "import" ? r.imp.id : r.exp.id;
              const bId = r.kind === "import" ? r.imp.brandId : r.exp.brandId;
              const isOpen = mode === "tecnico" || expanded.has(id);
              const warnN = rowWarnings(r);
              const isErr = rowIsError(r);
              const tone: "ok" | "warn" | "error" = isErr ? "error" : warnN > 0 ? "warn" : "ok";
              const kindChip = r.kind === "import"
                ? <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">import</span>
                : <span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">export</span>;

              const title = r.kind === "import"
                ? `Importación · ${r.imp.origin}`
                : `Exportación · ${r.exp.mode}`;
              const legacyExp = r.kind === "export" && r.exp.filesCount == null && r.exp.files.length === 0;
              const sub = r.kind === "import"
                ? `${r.imp.filesScanned} archivo(s) · ${r.imp.productType ?? "tipo —"} · ${r.imp.runtime ? (r.imp.runtimeRan ? "runtime ✓" : "runtime ✗") : "sin runtime"}${warnN ? ` · ${warnN} aviso(s)` : ""}`
                : legacyExp
                  ? `${r.exp.sourceLabel ?? "—"} · registro previo (sin detalle de archivos)`
                  : `${r.exp.filesCount ?? r.exp.files.length} archivo(s) · ${r.exp.sourceLabel ?? "—"} · ${r.exp.partial ? "parcial" : "completo"}${warnN ? ` · ${warnN} aviso(s)` : ""}`;

              return (
                <div key={id} className="mb-1 rounded-lg border border-[var(--color-border)] bg-black/10">
                  <button onClick={() => mode === "resumen" && toggleRow(id)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
                    {kindChip}
                    <span className="text-[11px] font-medium text-[var(--color-text)]">{title}</span>
                    <StatusChip tone={tone} text={tone === "ok" ? "ok" : tone === "warn" ? "avisos" : "error"} />
                    <span className="ml-auto text-[10px] text-[var(--color-muted)]">{ago(r.at)}</span>
                  </button>
                  <div className="flex items-center gap-2 px-2.5 pb-1.5 text-[10px] text-[var(--color-muted)]">
                    <span>{sub}</span>
                    {bId && <a href={`/marcas/${bId}`} className="ml-auto shrink-0 font-medium text-[var(--color-accent)] hover:underline">→ ver marca</a>}
                  </div>

                  {isOpen && (
                    <div className="space-y-1 border-t border-[var(--color-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-muted)]">
                      {r.kind === "import" ? (
                        <>
                          {r.imp.root && <div className="font-mono opacity-80">{r.imp.root}</div>}
                          <div>herramienta: {r.imp.tool ?? "—"} · escenas: {r.imp.scenes.join(", ") || "—"}{r.imp.durationMs != null ? ` · ${r.imp.durationMs} ms` : ""}</div>
                          {r.imp.warnings.length > 0 && <ul className="space-y-0.5 text-amber-300/90">{r.imp.warnings.slice(0, 8).map((w, i) => <li key={i}>! {w}</li>)}</ul>}
                          {r.imp.errors.length > 0 && <ul className="space-y-0.5 text-red-300/90">{r.imp.errors.slice(0, 8).map((e, i) => <li key={i}>✗ {e}</li>)}</ul>}
                        </>
                      ) : (
                        <>
                          <div>estado: {r.exp.status}{r.exp.partial ? " · parcial" : " · completo"} · destino: {r.exp.target} · hash: <span className="font-mono">{r.exp.resolvedHash ?? "—"}</span>{r.exp.errorMsg ? ` · ${r.exp.errorMsg}` : ""}</div>
                          {legacyExp && <div className="opacity-70">Registro previo al detalle de auditoría: los exports nuevos incluirán archivos generados, omitidos y warnings.</div>}
                          {r.exp.files.length > 0 && <div className="font-mono opacity-80">generados ({r.exp.files.length}): {r.exp.files.slice(0, 10).join(", ")}{r.exp.files.length > 10 ? "…" : ""}</div>}
                          {r.exp.omitted.length > 0 && <div>omitidos: {r.exp.omitted.map((o) => o.path).join(", ")}</div>}
                          {r.exp.warnings.length > 0 && <ul className="space-y-0.5 text-amber-300/90">{r.exp.warnings.slice(0, 8).map((w, i) => <li key={i}>! {w}</li>)}</ul>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-[var(--color-border)] px-3 py-1 text-[9px] text-[var(--color-muted)]">
            Vista de la trazabilidad · historial en BD · auditoría portable en <span className="font-mono">.analysis/logs</span> y <span className="font-mono">EXPORT_LOG.json</span>
          </div>
        </div>
      </div>
    </>
  );
}
