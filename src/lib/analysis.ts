/* ============================================================================
   Contrato analysis.json — la ÚNICA interfaz entre el analizador (CLI local
   `scan-repo`, servicio `scan-serve`, o el análisis en el navegador) y la app.

   Regla de arquitectura: el analizador PRODUCE un AnalysisReport; la app lo
   CONSUME y entra por el pipeline unificado (marca → editor → blueprint →
   preview → export). No hay motor paralelo: tanto el CLI como el navegador
   usan el MISMO `extractIdentity`/`inferBlueprint` de importBrand.

   Todo campo inferido viaja con su confianza y su fuente de evidencia
   (ver ImportSummary), para que cada decisión sea explicable y trazable.

   Capas:
     · ESTÁTICA  → `summary` (lectura de código: rutas, deps, estilos).
     · RUNTIME   → `runtime` (Playwright: navega, captura, observa el DOM real).
   Ambas conviven; runtime nunca sobrescribe lo estático, solo lo confirma o
   lo contradice de forma trazable (runtime.confidenceAdjustments).
   ============================================================================ */
import { extractIdentity, type ImportFile, type ImportSummary } from "./importBrand";
import { Tracer, type TraceReport } from "./trace";
import type { TokenGroup } from "./tokens";
import type { Blueprint, ProjectView } from "./blueprint";

/** Versión del contrato. Súbela si cambia la forma de AnalysisReport. */
export const ANALYSIS_VERSION = "2";

/* ---------------------------------------------------------------------------
   RUNTIME (Playwright) — capa dinámica, opcional y honesta.
   Si Playwright no arranca, no accede o no renderiza: se registra en
   warnings/errors y `ran=false`; jamás se inventa una observación.
--------------------------------------------------------------------------- */

/** Clave de señal de layout observable en el DOM renderizado. */
export type LayoutSignalKey =
  | "sidebar" | "topbar" | "bottomNav" | "hero" | "cta"
  | "cards" | "table" | "form" | "tabs" | "chart" | "footer";

/** Una señal de layout observada en runtime (booleana + evidencia cuantitativa). */
export interface LayoutSignal {
  key: LayoutSignalKey;
  present: boolean;
  count: number;        // nº de coincidencias (0 si ausente) — evidencia
  note?: string;        // detalle opcional (selector representativo)
}

/** Captura de una ruta en un viewport concreto. */
export interface RuntimeScreenshot {
  route: string;                        // ruta relativa crawleada ("/", "/about", …)
  viewport: "desktop" | "mobile";
  width: number;
  height: number;
  file: string;                         // relativo al proyecto: .analysis/screenshots/xxx.png
  bytes: number;
  status: number | null;                // HTTP status de la navegación (null si desconocido)
}

/** Hallazgos agregados por viewport (señales + tema observado). */
export interface ViewportFinding {
  viewport: "desktop" | "mobile";
  width: number;
  theme: "light" | "dark" | "unknown";  // por luminancia del fondo computado
  bg: string | null;                    // color de fondo observado (rgb)
  routesObserved: string[];             // rutas de las que salieron estas señales
  signals: LayoutSignal[];
}

/** Ajuste de confianza: runtime confirma, contradice o añade sobre lo estático. */
export interface ConfidenceAdjustment {
  field: string;                        // "navigation" | "architecture" | "productType" | …
  effect: "confirm" | "contradict" | "add";
  staticValue: string | null;          // lo que dijo la capa estática
  runtimeValue: string;                // lo observado en runtime
  reason: string;                      // evidencia legible
}

/** Informe del análisis en runtime (Playwright). */
export interface RuntimeReport {
  enabled: boolean;                     // se PIDIÓ ejecutar runtime
  ran: boolean;                         // Playwright arrancó y navegó ≥1 ruta OK
  engine: string | null;               // "playwright-chromium" | null
  baseURL: string | null;              // URL base usada
  baseURLSource: "manual" | "autodetect" | "none";
  routesRequested: string[];           // rutas que se intentaron abrir
  routesCrawled: string[];             // rutas que respondieron correctamente
  screenshots: RuntimeScreenshot[];    // capturas desktop + mobile
  layoutSignals: LayoutSignal[];       // señales agregadas (unión de viewports)
  viewportFindings: ViewportFinding[]; // detalle por viewport
  confidenceAdjustments: ConfidenceAdjustment[];
  warnings: string[];                  // lo que no se pudo observar (no bloqueante)
  errors: string[];                    // fallos duros (Playwright ausente, base caída…)
  startedAt: number;                   // epoch ms
  finishedAt: number;                  // epoch ms
}

/** Un RuntimeReport vacío/honesto para cuando runtime no se pide o no puede. */
export function emptyRuntime(patch: Partial<RuntimeReport> = {}): RuntimeReport {
  const now = Date.now();
  return {
    enabled: false,
    ran: false,
    engine: null,
    baseURL: null,
    baseURLSource: "none",
    routesRequested: [],
    routesCrawled: [],
    screenshots: [],
    layoutSignals: [],
    viewportFindings: [],
    confidenceAdjustments: [],
    warnings: [],
    errors: [],
    startedAt: now,
    finishedAt: now,
    ...patch,
  };
}

export interface AnalysisReport {
  version: string;                 // ANALYSIS_VERSION
  generatedAt: number;             // epoch ms
  source: {
    root: string;                  // ruta analizada (o "browser")
    filesScanned: number;
    tool: string;                  // "scan-repo" | "scan-serve" | "browser"
    toolVersion: string;
  };
  brand: { name: string | null; tokens: TokenGroup };  // marca inferida (DTCG)
  blueprint: Blueprint;            // blueprint inferido (también embebido en tokens.blueprint)
  summary: ImportSummary;          // evidencia + confianza + fuente por campo (ESTÁTICA)
  project?: { projectType?: ImportSummary["productType"]; views: ProjectView[] };  // Fase 1: modelo proyecto -> vistas
  runtime?: RuntimeReport;         // capa dinámica opcional (Playwright)
  trace?: TraceReport;             // trazabilidad estructurada de toda la importación
}

/** Construye un AnalysisReport a partir de archivos del proyecto (capa estática).
 *  Reutiliza extractIdentity (que ya infiere blueprint y arma el summary).
 *  El runtime, si lo hay, se adjunta después con `attachRuntime`.
 *
 *  Trazabilidad: si `meta.tracer` viene dado (operación con varias fases:
 *  estático + runtime), emite en él y NO cierra el trace — lo cierra quien
 *  orquesta. Si no viene, crea uno local, emite y adjunta `trace` al informe
 *  (camino navegador, de una sola fase). */
export function buildAnalysis(files: ImportFile[], meta: { root: string; tool?: string; tracer?: Tracer }): AnalysisReport {
  const shared = meta.tracer;
  const tr = shared ?? new Tracer();
  tr.emit("files_scanned", { count: files.length, root: meta.root });

  const { tokens, summary } = extractIdentity(files);
  tr.emit("identity_extracted", {
    name: summary.suggestedName, colors: summary.colors.length,
    fonts: summary.fonts.length, radii: summary.radii.length, libraries: summary.libraries.length,
  });

  const blueprint = (tokens as unknown as { blueprint?: Blueprint }).blueprint ?? {};
  tr.emit("blueprint_inferred", {
    navigation: summary.navigation?.value, navigationConfidence: summary.navigation?.confidence,
    architecture: summary.architecture?.value, productType: summary.productType?.value,
    scenes: summary.scenes, components: summary.components.length,
  });
  // Notas del análisis = límites/baja confianza → warnings trazables.
  for (const note of summary.notes) tr.warn("import_warning", note);

  const report: AnalysisReport = {
    version: ANALYSIS_VERSION,
    generatedAt: Date.now(),
    source: { root: meta.root, filesScanned: files.length, tool: meta.tool ?? "scan-repo", toolVersion: ANALYSIS_VERSION },
    brand: { name: summary.suggestedName, tokens },
    blueprint,
    summary,
    project: summary.views && summary.views.length ? { projectType: summary.productType, views: summary.views } : undefined,
  };
  if (!shared) report.trace = tr.report();   // sin orquestador: cerramos aquí
  return report;
}

/** Adjunta (sin mutar destructivamente lo estático) el informe de runtime. */
export function attachRuntime(report: AnalysisReport, runtime: RuntimeReport): AnalysisReport {
  return { ...report, runtime };
}

/** Adjunta el trace final (cerrado por el orquestador: estático + runtime). */
export function attachTrace(report: AnalysisReport, trace: TraceReport): AnalysisReport {
  return { ...report, trace };
}

/** ¿Un objeto arbitrario cumple el contrato (para consumirlo en la app)? */
export function isAnalysisReport(x: unknown): x is AnalysisReport {
  if (!x || typeof x !== "object") return false;
  const r = x as Partial<AnalysisReport>;
  return typeof r.version === "string" && !!r.brand && typeof r.brand === "object"
    && !!(r.brand as AnalysisReport["brand"]).tokens && !!r.summary && Array.isArray((r.summary as ImportSummary).colors);
}
