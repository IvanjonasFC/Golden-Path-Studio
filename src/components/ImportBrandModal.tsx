"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./AssetKit";
import { extractIdentity, type ImportFile, type ImportResult } from "@/lib/importBrand";
import { isAnalysisReport, type RuntimeReport, type LayoutSignal } from "@/lib/analysis";
import { type TraceReport, countByKind } from "@/lib/trace";
import { seedScenes } from "@/lib/seed";
import { seedEditableFromBlueprint } from "@/lib/seedEditor";
import { type Blueprint } from "@/lib/blueprint";
import { type SceneId } from "@/lib/scenes";

const TEXT_RE = /\.(css|scss|less|js|jsx|ts|tsx|mjs|cjs|json|md|mdx|html|svelte|vue|astro|txt)$/i;
const MAX_FILES = 120;
const MAX_BYTES = 2_000_000;

function conf(c: "strong" | "weak" | "default") {
  if (c === "strong") return <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-emerald-300">detectado</span>;
  if (c === "weak") return <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-300">sugerencia</span>;
  return <span className="rounded border border-white/15 bg-white/5 px-1 py-0.5 text-[9px] font-bold uppercase text-[var(--color-muted)]">default</span>;
}

const SIGNAL_LABELS: Record<string, string> = {
  sidebar: "sidebar", topbar: "topbar", bottomNav: "bottom-nav", hero: "hero", cta: "CTA",
  cards: "cards", table: "tabla", form: "formulario", tabs: "tabs", chart: "chart", footer: "footer",
};

export default function ImportBrandModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [paste, setPaste] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(true);
  const [mode, setMode] = useState<"brand" | "project">("brand");
  const [localPath, setLocalPath] = useState("");
  const [helper, setHelper] = useState<"checking" | "up" | "down">("checking");
  const [picking, setPicking] = useState(false);
  const [playwrightOk, setPlaywrightOk] = useState(false);
  const [useRuntime, setUseRuntime] = useState(false);
  const [baseURL, setBaseURL] = useState("");
  const [runtime, setRuntime] = useState<RuntimeReport | null>(null);
  const [trace, setTrace] = useState<TraceReport | null>(null);
  const [origin, setOrigin] = useState<"upload" | "helper" | "analysis-json">("upload");
  const filesRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFiles([]); setPaste(""); setResult(null); setName(""); setError(null); setBusy(false); setRuntime(null); setTrace(null); setOrigin("upload"); };
  const close = () => { reset(); onClose(); };

  const onPick = async (list: FileList | null) => {
    if (!list) return;
    const picked: ImportFile[] = [];
    let skipped = 0;
    for (const f of Array.from(list)) {
      if (picked.length >= MAX_FILES) break;
      const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      if (!TEXT_RE.test(f.name)) { skipped++; continue; }
      if (f.size > MAX_BYTES) { skipped++; continue; }
      try { picked.push({ name: path, text: await f.text() }); } catch { skipped++; }
    }
    setFiles(picked);
    setResult(null);
    setError(picked.length ? null : "No se encontraron archivos de texto (css, tailwind, package.json, README…).");
  };

  const analyze = () => {
    setError(null);
    const all: ImportFile[] = [...files];
    if (paste.trim()) all.push({ name: "pegado.css", text: paste });
    if (!all.length) { setError("Añade archivos del proyecto o pega tu CSS / tailwind config."); return; }
    // ¿Es un analysis.json ya generado por el CLI `scan-repo`? Cárgalo tal cual.
    const jsonSrc = all.find((f) => /analysis\.json$/i.test(f.name)) ?? (paste.trim().startsWith("{") ? { name: "pegado.json", text: paste } : undefined);
    if (jsonSrc) {
      try {
        const rep = JSON.parse(jsonSrc.text);
        if (isAnalysisReport(rep)) {
          setResult({ tokens: rep.brand.tokens, summary: rep.summary });
          setRuntime(rep.runtime ?? null);
          setTrace(rep.trace ?? null);
          setOrigin("analysis-json");
          setName(rep.brand.name ?? rep.summary.suggestedName ?? "");
          return;
        }
      } catch { /* no era analysis.json; seguimos con el análisis normal */ }
    }
    try {
      const r = extractIdentity(all);
      setResult(r);
      setRuntime(null);
      setTrace(null);
      setOrigin("upload");
      setName(r.summary.suggestedName ?? "");
    } catch (e) {
      setError("No se pudo analizar: " + (e as Error).message);
    }
  };

  // Helper local: pide al servicio scan-serve que analice una carpeta por RUTA
  // (sin subir archivos). Requiere `npx tsx scripts/scan-serve.ts` en marcha.
  const analyzeLocal = async () => {
    setError(null);
    if (!localPath.trim()) { setError("Escribe la ruta de la carpeta del proyecto."); return; }
    setBusy(true);
    try {
      const body: { path: string; runtime?: boolean; baseURL?: string } = { path: localPath.trim() };
      if (useRuntime) { body.runtime = true; if (baseURL.trim()) body.baseURL = baseURL.trim(); }
      const r = await fetch("http://127.0.0.1:4319/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const rep = await r.json();
      if (!r.ok || !isAnalysisReport(rep)) { setError(rep?.error ?? "El helper local no devolvió un análisis válido."); setBusy(false); return; }
      setResult({ tokens: rep.brand.tokens, summary: rep.summary });
      setRuntime(rep.runtime ?? null);
      setTrace(rep.trace ?? null);
      setOrigin("helper");
      setName(rep.brand.name ?? rep.summary.suggestedName ?? "");
      setBusy(false);
    } catch {
      setError("No se pudo contactar con el helper local. Inícialo con: npx tsx scripts/scan-serve.ts");
      setBusy(false);
    }
  };

  // Estado y control del helper local (scan-serve).
  const HELPER = "http://127.0.0.1:4319";
  const checkHelper = async () => {
    setHelper("checking");
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 1500);
      const r = await fetch(`${HELPER}/health`, { signal: c.signal });
      clearTimeout(t);
      if (r.ok) { const j = await r.json().catch(() => ({})); setPlaywrightOk(!!(j as { playwright?: boolean }).playwright); setHelper("up"); }
      else setHelper("down");
    } catch { setHelper("down"); }
  };
  useEffect(() => { if (open && mode === "project") checkHelper(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, mode]);

  // Abre el explorador nativo de Windows (via el helper) y rellena la ruta.
  const pickFolder = async () => {
    if (picking) return;
    setError(null);
    setPicking(true);
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 185_000);
      const r = await fetch(`${HELPER}/pick`, { signal: c.signal });
      clearTimeout(t);
      const j = await r.json();
      if (j?.path) setLocalPath(j.path);
      else if (j?.error) setError(j.error);
    } catch {
      setError("No se pudo abrir el selector. Reinicia el helper (cierra su ventana y doble clic en scan-serve.cmd) e inténtalo otra vez.");
    } finally {
      setPicking(false);
    }
  };

  const createBrand = async () => {
    if (!result || !name.trim() || busy) return;
    setBusy(true);
    try {
      // PUENTE modelo → UI editable: vuelca las señales del análisis a los controles
      // editables (arquitectura/árbol, datos, interacción) de forma NO destructiva y
      // trazable, para que la marca NAZCA con las pestañas pobladas, no "con defaults".
      // Solo en import nuevo (autosemilla inicial); reaplicar luego es idempotente.
      const seededTokens = structuredClone(result.tokens) as Record<string, unknown>;
      const baseBp = (seededTokens.blueprint as Blueprint | undefined) ?? {};
      seededTokens.blueprint = seedEditableFromBlueprint(baseBp).bp;
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: "Importada de un proyecto", tokens: seededTokens }),
      });
      const b = await res.json();
      if (b?.id) {
        // Pre-siembra por escena (auto, del catálogo) desde las escenas inferidas.
        const scenes = (result.summary.scenes ?? []) as SceneId[];
        if (seed && mode === "project" && scenes.length) {
          try {
            const { autoSeeded } = await seedScenes<{ id: string; category?: string }>(
              scenes,
              [],
              async (q) => {
                const r = await fetch(`/api/components?q=${encodeURIComponent(q)}&limit=1`);
                const j = await r.json();
                const it = (j.items ?? [])[0];
                return it ? { id: it.id, category: it.category } : null;
              },
            );
            if (autoSeeded.length) {
              const tokens = structuredClone(seededTokens) as Record<string, unknown>;
              const bp = { ...((tokens.blueprint as Record<string, unknown>) ?? {}), autoSeeded };
              tokens.blueprint = bp;
              await fetch(`/api/brands/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokens, previewIds: autoSeeded }) });
            }
          } catch { /* siembra best-effort: nunca bloquea la creación */ }
        }
        // Auditoría de importación (best-effort, nunca bloquea la creación).
        try {
          const sum = result.summary;
          await fetch("/api/imports", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brandId: b.id,
              origin,
              root: origin === "helper" ? localPath.trim() : null,
              tool: origin === "helper" ? "scan-serve" : origin === "analysis-json" ? "scan-repo" : "browser",
              filesScanned: sum.filesRead,
              productType: sum.productType?.value ?? null,
              scenes: sum.scenes ?? [],
              runtime: !!runtime?.enabled,
              runtimeRan: !!runtime?.ran,
              ok: trace?.ok ?? true,
              warnings: trace?.warnings ?? sum.notes ?? [],
              errors: trace?.errors ?? [],
              durationMs: trace ? trace.finishedAt - trace.startedAt : null,
              trace: trace ?? null,
            }),
          });
        } catch { /* auditoría best-effort */ }
        window.location.href = `/marcas/${b.id}`;
        return;
      }
      setError("No se pudo crear la marca.");
      setBusy(false);
    } catch { setError("No se pudo crear la marca."); setBusy(false); }
  };

  const field = "rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)]";
  const s = result?.summary;

  const isProject = mode === "project";
  return (
    <Modal open={open} onClose={close} title={isProject ? "Importar proyecto completo" : "Importar marca (rápido)"} width={560}
      footer={<>
        <button onClick={close} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancelar</button>
        {!result
          ? <button onClick={analyze} className="rounded-lg bg-[var(--color-panel-2)] px-4 py-2 text-xs font-bold text-[var(--color-text)] hover:bg-white/10">Analizar</button>
          : <button onClick={createBrand} disabled={!name.trim() || busy} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-black disabled:opacity-40">{busy ? "Creando…" : (isProject ? "Crear desde proyecto" : "Crear marca")}</button>}
      </>}>

      {/* Modo: marca rápida vs proyecto completo */}
      <div className="mb-3 inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-black/20 p-1">
        {([["brand", "Marca (rápido)"], ["project", "Proyecto completo"]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => { setMode(id); setResult(null); }}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${mode === id ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"}`}>
            {label}
          </button>
        ))}
      </div>

      {isProject ? (
        <p className="mb-3 text-[12px] text-[var(--color-muted)]">
          Reconstruye la identidad y la estructura de tu proyecto —paleta, tipografía, escenas y componentes— y compone un preview inicial, con su fuente y nivel de confianza por campo.
        </p>
      ) : (
        <p className="mb-3 text-[12px] text-[var(--color-muted)]">
          Extracción rápida de <b className="text-[var(--color-text)]">identidad visual</b> (paleta, tipografía, radios, librerías) + blueprint base. Ideal para pegar tu CSS o unos pocos archivos.
        </p>
      )}
      {isProject && (
        <>
          {/* Vía recomendada para repos grandes: helper local (no sube nada) */}
          <p className="mb-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
            El helper analiza el proyecto en tu equipo y solo envía el resultado —nada se sube. Recomendado para repos grandes.
          </p>
          {/* Estado del helper local */}
          <div className="mb-2 flex items-center gap-2 text-[11px]">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${helper === "up" ? "bg-emerald-400" : helper === "down" ? "bg-red-400" : "animate-pulse bg-amber-400"}`} />
            {helper === "up" && <span className="text-emerald-300">Helper conectado</span>}
            {helper === "checking" && <span className="text-[var(--color-muted)]">Comprobando helper…</span>}
            {helper === "down" && (
              <span className="text-[var(--color-muted)]">Helper no detectado — doble clic en <code className="rounded bg-[var(--color-panel-2)] px-1 py-0.5 text-[10px]">scan-serve.cmd</code> o ejecuta <code className="rounded bg-[var(--color-panel-2)] px-1 py-0.5 text-[10px]">npm run scan</code></span>
            )}
            <button type="button" onClick={checkHelper} className="ml-auto shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline">Reintentar</button>
          </div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Proyecto (carpeta)</label>
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={pickFolder} disabled={picking || helper !== "up"} title={helper !== "up" ? "Arranca el helper local primero" : "Abrir el explorador de Windows"} className="whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)]/60 disabled:cursor-not-allowed disabled:opacity-40">{picking ? "Abriendo…" : "Elegir carpeta…"}</button>
            <input value={localPath} onChange={(e) => setLocalPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyzeLocal()} placeholder="C:\\Users\\IvN\\Desktop\\mi-proyecto" className={field + " min-w-[200px] flex-1 font-mono text-[11px]"} />
            <button onClick={analyzeLocal} disabled={busy || helper !== "up"} className="whitespace-nowrap rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-bold text-black transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Analizando…" : "Analizar con helper local"}</button>
          </div>
          {/* Runtime opcional (Playwright): CAPA EXTRA sobre el análisis estático. */}
          <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-black/15 p-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]/80">Runtime (opcional)</div>
            <label className="flex items-start gap-2 text-[11px] text-[var(--color-muted)]">
              <input type="checkbox" checked={useRuntime} onChange={(e) => setUseRuntime(e.target.checked)} className="mt-0.5" />
              <span>
                <b className="text-[var(--color-text)]">Runtime (Playwright)</b> — capa extra que observa el proyecto <b className="text-[var(--color-text)]">ya ejecutado</b> (navega rutas y captura desktop + mobile). No sustituye al análisis: <b className="text-[var(--color-text)]">el análisis lee la carpeta</b>; esta URL solo la usa el runtime.
              </span>
            </label>
            {useRuntime && (
              <>
                <input value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="URL del dev server — p. ej. http://localhost:4321 · vacío = autodetectar"
                  className={field + " mt-2 w-full font-mono text-[11px]"} />
                {helper === "up" && !playwrightOk && (
                  <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] leading-relaxed text-amber-300">Playwright no está en el helper: el runtime <b>se omitirá</b> (el análisis estático sí funciona). Instala <code className="rounded bg-black/30 px-1">npm i -D playwright</code> + <code className="rounded bg-black/30 px-1">npx playwright install chromium</code> y reinicia el helper.</p>
                )}
              </>
            )}
          </div>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted)]">
            <span>¿Ya tienes un <code className="rounded bg-[var(--color-panel-2)] px-1 py-0.5 text-[10px]">analysis.json</code> de scan-repo?</span>
            <button type="button" onClick={() => filesRef.current?.click()} className="rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-[11px] font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)]/60">Cargar analysis.json</button>
            {files.length > 0 && <span>{files.length} archivo(s)</span>}
          </div>
        </>
      )}

      {isProject ? (
        <details className="mt-1 rounded-lg border border-[var(--color-border)] bg-black/10">
          <summary className="cursor-pointer select-none px-3 py-2 text-[11px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">Sin helper · subir un proyecto pequeño o pegar CSS</summary>
          <div className="space-y-3 px-3 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => filesRef.current?.click()} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-accent)]/60">Subir archivos</button>
              <button onClick={() => dirRef.current?.click()} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:border-[var(--color-accent)]/60">Carpeta (pocos archivos)</button>
              {files.length > 0 && <span className="text-[11px] text-[var(--color-muted)]">{files.length} archivo(s)</span>}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] text-[var(--color-muted)]">…o pega tu CSS / tokens / analysis.json</label>
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder=":root{ --color-bg:#0a0a0c; --color-primary:#f0a470 } font-family: 'Inter'…" className={field + " w-full resize-y font-mono text-[11px]"} />
            </div>
          </div>
        </details>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => filesRef.current?.click()} className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-bold text-black transition-transform hover:scale-[1.02]">Elegir archivos</button>
            {files.length > 0 && <span className="text-[11px] text-[var(--color-muted)]">{files.length} archivo(s) leídos</span>}
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">…o pega tu CSS / tailwind.config / tokens</label>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder=":root{ --color-bg:#0a0a0c; --color-primary:#f0a470 } font-family: 'Inter'…" className={field + " w-full resize-y font-mono text-[11px]"} />
          </div>
        </>
      )}

      {/* inputs de archivo (compartidos, ocultos) */}
      <input ref={filesRef} type="file" multiple accept=".css,.scss,.less,.js,.jsx,.ts,.tsx,.json,.md,.html,.svelte,.vue,.astro" className="hidden" onChange={(e) => onPick(e.target.files)} />
      {/* @ts-expect-error webkitdirectory no tipado en React */}
      <input ref={dirRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />

      {error && <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

      {/* Resumen de lo detectado */}
      {s && (
        <div className="mt-4 space-y-3 rounded-xl border border-[var(--color-border)] bg-black/20 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Análisis estático ({s.filesRead} archivo{s.filesRead === 1 ? "" : "s"} · tema {s.theme === "dark" ? "oscuro" : "claro"})</div>
          <div className="flex flex-wrap items-center gap-2">
            {s.colors.map((c) => (
              <span key={c.path} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-[var(--color-muted)]" title={c.label}>
                <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: c.value }} />
                {c.value}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-muted)]">
            <div><b className="text-[var(--color-text)]">Tipografía:</b> {s.fonts.length ? s.fonts.join(" · ") : "por defecto"}</div>
            <div><b className="text-[var(--color-text)]">Radios:</b> {s.radii.length ? s.radii.join(" · ") : "por defecto"}</div>
          </div>
          <div className="text-[11px] text-[var(--color-muted)]"><b className="text-[var(--color-text)]">Librerías:</b> {s.libraries.length ? s.libraries.map((l) => l.name).join(", ") : "ninguna detectada"}</div>

          {/* Estructura inferida (fase 2) — con trazabilidad: valor · confianza · fuente */}
          <div className="space-y-1.5">
            {[["Navegación", s.navigation], ["Arquitectura", s.architecture], ["Auth", s.auth], ["Tipo", s.productType]].map(([label, inf]) =>
              inf ? (
                <div key={label as string} className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
                  <b className="text-[var(--color-text)]">{label as string}:</b>
                  <span>{(inf as { value: string }).value}</span>
                  {conf((inf as { confidence: "strong" | "weak" | "default" }).confidence)}
                  <span className="text-[10px] opacity-70">— {(inf as { source: string }).source}</span>
                </div>
              ) : null,
            )}
          </div>
          {s.scenes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
              <b className="text-[var(--color-text)]">Escenas probables:</b>
              {s.scenes.map((sc) => <span key={sc} className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)]">{sc}</span>)}
            </div>
          )}
          {s.components.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
              <b className="text-[var(--color-text)]">Componentes dominantes:</b>
              {s.components.slice(0, 8).map((c) => <span key={c.name} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-[var(--color-muted)]">{c.name} <span className="opacity-60">×{c.count}</span></span>)}
              <span className="text-[9px] opacity-60">(menciones en el código)</span>
            </div>
          )}

          {s.notes.length > 0 && (
            <ul className="space-y-0.5 text-[10px] text-[var(--color-muted)]">
              {s.notes.map((n, i) => <li key={i}>· {n}</li>)}
            </ul>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">Nombre de la marca</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. nombre del proyecto" className={field + " w-full"} />
          </div>
          {s.scenes.length > 0 && (
            <label className="flex items-start gap-2 text-[11px] text-[var(--color-muted)]">
              <input type="checkbox" checked={seed} onChange={(e) => setSeed(e.target.checked)} className="mt-0.5" />
              <span>Sembrar las {s.scenes.length} escena(s) detectada(s) con componentes <b className="text-[var(--color-text)]">sugeridos del catálogo</b> (marcados <i>auto</i>, editables). La estructura viene del análisis; los componentes no son copias del proyecto.</span>
            </label>
          )}
        </div>
      )}

      {/* Runtime (Playwright): evidencia observada en el proyecto ejecutado */}
      {runtime && runtime.enabled && (
        <div className="mt-3 space-y-2 rounded-xl border border-[var(--color-border)] bg-black/20 p-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Runtime
            {runtime.ran
              ? <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-emerald-300">observado</span>
              : <span className="rounded border border-red-400/40 bg-red-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-red-300">no ejecutado</span>}
            {runtime.baseURL && <span className="font-mono text-[10px] normal-case opacity-70">{runtime.baseURL} · {runtime.baseURLSource}</span>}
          </div>

          <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
            El <b className="text-[var(--color-text)]">análisis estático</b> (arriba) es la base que se importa. El <b className="text-[var(--color-text)]">runtime</b> es evidencia de lo que se ve al ejecutar el proyecto: <b className="text-emerald-300">confirma</b> o <b className="text-amber-300">contradice</b>, pero <b className="text-[var(--color-text)]">no cambia</b> el estático — ante una contradicción, decides tú.
          </p>

          {runtime.ran && (
            <>
              <div className="text-[11px] text-[var(--color-muted)]">
                <b className="text-[var(--color-text)]">Rutas:</b> {runtime.routesCrawled.join(", ") || "—"} · <b className="text-[var(--color-text)]">capturas:</b> {runtime.screenshots.length} (desktop + mobile)
              </div>
              {runtime.viewportFindings.map((v) => (
                <div key={v.viewport} className="text-[11px] text-[var(--color-muted)]">
                  <b className="text-[var(--color-text)]">{v.viewport}</b> · tema {v.theme === "dark" ? "oscuro" : v.theme === "light" ? "claro" : "—"}:
                  <span className="ml-1 inline-flex flex-wrap gap-1">
                    {v.signals.filter((sig: LayoutSignal) => sig.present).map((sig: LayoutSignal) => (
                      <span key={sig.key} className="rounded border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                        {SIGNAL_LABELS[sig.key] ?? sig.key}{sig.count > 1 ? `×${sig.count}` : ""}
                      </span>
                    ))}
                    {v.signals.every((sig: LayoutSignal) => !sig.present) && <span className="opacity-60">sin señales</span>}
                  </span>
                </div>
              ))}
              {runtime.confidenceAdjustments.length > 0 && (
                <div className="space-y-0.5">
                  {runtime.confidenceAdjustments.map((a, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                      {a.effect === "confirm"
                        ? <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-emerald-300">confirma</span>
                        : a.effect === "contradict"
                          ? <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-300">contradice</span>
                          : <span className="rounded border border-white/15 bg-white/5 px-1 py-0.5 text-[9px] font-bold uppercase text-[var(--color-muted)]">añade</span>}
                      <b className="text-[var(--color-text)]">{a.field}:</b> {a.runtimeValue}
                      <span className="opacity-70">— {a.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {runtime.warnings.length > 0 && (
            <ul className="space-y-0.5 text-[10px] text-amber-300/90">
              {runtime.warnings.map((w, i) => <li key={i}>! {w}</li>)}
            </ul>
          )}
          {runtime.errors.length > 0 && (
            <ul className="space-y-0.5 text-[10px] text-red-300/90">
              {runtime.errors.map((er, i) => <li key={i}>✗ {er}</li>)}
            </ul>
          )}
          {runtime.screenshots.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-[var(--color-muted)]">Capturas (en tu equipo, no se suben):</div>
              {runtime.screenshots.map((sh, i) => (
                <div key={i} className="font-mono text-[9px] text-[var(--color-muted)] opacity-80">
                  {sh.route} · {sh.viewport} → <span className="text-[var(--color-text)]">{sh.file}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trazabilidad estructurada: existe un log de auditoría de esta importación */}
      {trace && (
        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-black/20 p-3 text-[11px] text-[var(--color-muted)]">
          <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-wider">
            Trazabilidad
            <span className="rounded border border-white/15 bg-white/5 px-1 py-0.5 text-[9px] font-bold uppercase">{origin}</span>
            {trace.ok
              ? <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-emerald-300">ok</span>
              : <span className="rounded border border-red-400/40 bg-red-400/10 px-1 py-0.5 text-[9px] font-bold uppercase text-red-300">con errores</span>}
          </div>
          <div>
            {trace.events.length} evento(s) · {trace.warnings.length} aviso(s) · {trace.errors.length} error(es)
            {(() => { const c = countByKind(trace.events); const parts = Object.entries(c).slice(0, 6).map(([k, n]) => `${k}×${n}`); return parts.length ? " · " + parts.join(", ") : ""; })()}
          </div>
          <p className="mt-1 text-[9px] opacity-60">Log completo guardado en tu equipo (.analysis/logs/import-*.json) y en el historial de la marca.</p>
        </div>
      )}
    </Modal>
  );
}
