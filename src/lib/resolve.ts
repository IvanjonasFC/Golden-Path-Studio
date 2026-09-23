/* ============================================================================
   Capa de resolución global de la marca.
   Fuente ÚNICA que preview / exportador / AGENTS.md deben consumir — nunca el
   draft crudo de cada pestaña.

     draftConfig   → lo editado por el usuario
     presetConfig  → valores base heredados del preset elegido
     defaultConfig → valores de sistema para cubrir OPCIONALES vacíos
     resolvedConfig→ merge normalizado (draft > preset > default)
     validationReport → cobertura, orígenes, warnings y BLOQUEOS reales

   Principio: los defaults rellenan opcionales; NUNCA tapan un bloqueo real.
   Un campo `required` no tiene default: si falta, bloquea la publicación.
   ============================================================================ */
import {
  PRESETS, DATA_PRESETS, type Blueprint, type LibItem, type TreeNode,
} from "./blueprint";
import { templateBlueprint } from "./templates";

export type Origin = "custom" | "template" | "preset" | "default" | "missing";
export type FieldClass = "required" | "recommended" | "advanced";
export type DomainKey = "visual" | "interaction" | "structure" | "data" | "security";
export type TabStatus = "complete" | "partial" | "using_defaults" | "blocking";
export const DOMAINS: DomainKey[] = ["visual", "interaction", "structure", "data", "security"];

export interface FieldReport { key: string; label: string; domain: DomainKey; cls: FieldClass; origin: Origin; value: unknown }
export interface DomainReport {
  domain: DomainKey; status: TabStatus;
  counts: { custom: number; template: number; preset: number; default: number; missing: number };
  coverage: number;                // 0..1 sobre required+recommended
  blocking: string[]; warnings: string[];
  fields: FieldReport[];
}
export interface ValidationReport {
  domains: Record<DomainKey, DomainReport>;
  blockingIssues: string[]; warnings: string[];
  coverage: number; canPublish: boolean;
}
export interface ResolvedConfig {
  visual: Record<string, unknown>;
  interaction: Record<string, unknown>;
  structure: Record<string, unknown>;
  data: Record<string, unknown>;
  security: Record<string, unknown>;
  suggestionsApplied: Array<{ title: string; source?: string; url?: string }>;
  meta: {
    preset?: string; dataPreset?: string; resolvedAt: string;
    inheritedFields: string[];   // origin = preset
    defaultedFields: string[];   // origin = default
    customFields: string[];      // origin = custom
    templateFields: string[];    // origin = template (golden path aplicado)
    warnings: string[]; blockingIssues: string[];
  };
}
export interface Resolution {
  draftConfig: Record<DomainKey, Record<string, unknown>>;
  presetConfig: Record<DomainKey, Record<string, unknown>>;
  defaultConfig: Record<DomainKey, Record<string, unknown>>;
  resolvedConfig: ResolvedConfig;
  validationReport: ValidationReport;
}

/* --------------------------- Especificación de campos ---------------------- */
interface FieldSpec { key: string; label: string; cls: FieldClass; def?: unknown }
const MINIMAL_TREE: TreeNode[] = [
  { name: "app", type: "folder", children: [{ name: "layout.tsx", type: "file" }, { name: "page.tsx", type: "file" }] },
  { name: "components", type: "folder", children: [{ name: "ui", type: "folder", children: [] }] },
  { name: "lib", type: "folder", children: [{ name: "utils.ts", type: "file" }] },
];
const MINIMAL_AGENTS = {
  always: ["Usar los design tokens siempre", "Usar primero los componentes del registry interno"],
  never: ["No usar colores hex hardcodeados"],
  ask: ["No añadir dependencias sin preguntar"],
};

const SPECS: Record<DomainKey, FieldSpec[]> = {
  visual: [
    { key: "colorBg", label: "Color de fondo", cls: "required" },
    { key: "colorText", label: "Color de texto", cls: "required" },
    { key: "colorPrimary", label: "Acción primaria", cls: "required" },
    { key: "fontBody", label: "Tipografía principal", cls: "required" },
    { key: "fontHeading", label: "Tipografía secundaria", cls: "recommended", def: "Inter" },
    { key: "radiusButton", label: "Radio de botón", cls: "recommended", def: "8px" },
    { key: "radiusCard", label: "Radio de tarjeta", cls: "recommended", def: "12px" },
    { key: "density", label: "Densidad base", cls: "advanced", def: "comfortable" },
    { key: "effects", label: "Fondo/efectos", cls: "advanced", def: { background: "solid", pattern: "none", glow: false, grain: false } },
  ],
  interaction: [
    { key: "navigationPattern", label: "Navegación", cls: "recommended", def: "dashboard" },
    { key: "motionPreset", label: "Motion", cls: "recommended", def: "minimal" },
    { key: "loadingPattern", label: "Carga", cls: "recommended", def: "skeleton" },
    { key: "routeTransitions", label: "Transiciones de ruta", cls: "advanced", def: false },
    { key: "backConfirmUnsaved", label: "Confirmar sin guardar", cls: "advanced", def: true },
    { key: "backSaveDraft", label: "Guardar borrador", cls: "advanced", def: false },
    { key: "feedbackInlineErrors", label: "Errores inline", cls: "advanced", def: true },
    { key: "feedbackToastSuccess", label: "Toast de éxito", cls: "advanced", def: true },
    { key: "feedbackErrorSummaryTop", label: "Resumen de errores", cls: "advanced", def: false },
  ],
  structure: [
    { key: "pattern", label: "Arquitectura", cls: "recommended", def: "feature-based" },
    { key: "naming", label: "Naming", cls: "recommended", def: "kebab-files" },
    { key: "tree", label: "Árbol de carpetas", cls: "recommended", def: MINIMAL_TREE },
    { key: "libraries", label: "Librerías", cls: "recommended", def: [] as LibItem[] },
    { key: "agents", label: "Reglas de agente", cls: "recommended", def: MINIMAL_AGENTS },
    { key: "serverComponentsDefault", label: "RSC por defecto", cls: "advanced", def: true },
    { key: "defaultExport", label: "Default exports", cls: "advanced", def: false },
  ],
  data: [
    { key: "formValidation", label: "Validación de formularios", cls: "recommended", def: "hybrid" },
    { key: "search", label: "Búsqueda", cls: "recommended", def: "none" },
    { key: "emptyCta", label: "Empty state con CTA", cls: "recommended", def: true },
    { key: "loadingPattern", label: "Estado de carga", cls: "recommended", def: "skeleton" },
    { key: "errorPattern", label: "Estado de error", cls: "recommended", def: "inline" },
    { key: "successPattern", label: "Estado de éxito", cls: "recommended", def: "toast" },
    { key: "formPreset", label: "Tipo de formulario", cls: "advanced" },
    { key: "tableLayout", label: "Tablas/listas", cls: "advanced" },
    { key: "filters", label: "Filtros", cls: "advanced" },
    { key: "pagination", label: "Paginación", cls: "advanced" },
    { key: "confirmations", label: "Confirmaciones", cls: "advanced" },
    { key: "mobileData", label: "Datos en móvil", cls: "advanced" },
    { key: "bulkActions", label: "Acciones masivas", cls: "advanced", def: false },
  ],
  security: [
    { key: "authMethods", label: "Métodos de autenticación", cls: "required" },
    { key: "sessionType", label: "Sesión", cls: "recommended", def: "httpOnly-cookie" },
    { key: "validationLib", label: "Librería de validación", cls: "recommended", def: "zod" },
    { key: "serverSideValidation", label: "Validación en servidor", cls: "recommended", def: true },
    { key: "inlineValidation", label: "Validación inline", cls: "advanced", def: true },
    { key: "csp", label: "CSP estricta", cls: "advanced", def: false },
    { key: "rateLimit", label: "Rate limiting", cls: "advanced", def: false },
    { key: "secretsServerOnly", label: "Secretos solo en servidor", cls: "advanced", def: true },
  ],
};

/* ------------------------------ Utilidades --------------------------------- */
function present(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true; // boolean/number: cualquier valor definido cuenta
}

/* ------------------------ Extracción de cada capa -------------------------- */
function draftLayer(bp: Blueprint, visualTokens?: Record<string, string>): Record<DomainKey, Record<string, unknown>> {
  const a = bp.architecture ?? {}, ag = bp.agents ?? {};
  const agentsDraft = (ag.always?.length || ag.never?.length || ag.ask?.length)
    ? { always: ag.always ?? [], never: ag.never ?? [], ask: ag.ask ?? [] } : undefined;
  return {
    visual: visualTokens ? {
      colorBg: visualTokens["color.bg"], colorText: visualTokens["color.text"], colorPrimary: visualTokens["color.action.primary"],
      fontBody: visualTokens["font.body"], fontHeading: visualTokens["font.heading"],
      radiusButton: visualTokens["radius.button"], radiusCard: visualTokens["radius.card"],
    } : {},
    interaction: { ...(bp.interaction ?? {}) },
    structure: {
      pattern: a.pattern, naming: a.naming, tree: a.tree, libraries: bp.libraries?.items,
      agents: agentsDraft, serverComponentsDefault: a.serverComponentsDefault, defaultExport: a.defaultExport,
    },
    data: { ...(bp.data ?? {}) },
    security: { ...(bp.security ?? {}) },
  };
}
function presetLayer(bp: Blueprint): Record<DomainKey, Record<string, unknown>> {
  const p = PRESETS.find((x) => x.id === bp.preset);
  const dp = DATA_PRESETS.find((x) => x.id === bp.data?.preset);
  const pb = p?.blueprint ?? {};
  const pa = pb.architecture ?? {};
  return {
    visual: p ? {
      colorBg: p.tokens["color.bg"], colorText: p.tokens["color.text"], colorPrimary: p.tokens["color.action.primary"],
      fontBody: p.tokens["font.body"], fontHeading: p.tokens["font.heading"],
      radiusButton: p.tokens["radius.button"], radiusCard: p.tokens["radius.card"],
      effects: p.effects,
    } : {},
    interaction: { ...(pb.interaction ?? {}) },
    structure: {
      pattern: pa.pattern, naming: pa.naming, tree: pa.tree, libraries: pb.libraries?.items,
      serverComponentsDefault: pa.serverComponentsDefault, defaultExport: pa.defaultExport,
    },
    data: dp ? { ...dp.data } : {},
    security: { ...(pb.security ?? {}) },
  };
}
function defaultLayer(): Record<DomainKey, Record<string, unknown>> {
  const out = {} as Record<DomainKey, Record<string, unknown>>;
  for (const d of DOMAINS) { out[d] = {}; for (const f of SPECS[d]) if (f.def !== undefined) out[d][f.key] = f.def; }
  return out;
}
/** Valores base del golden path aplicado (bp.templateId). Sirven para saber qué
 *  campos del draft coinciden con la plantilla (origin=template) y cuáles editó
 *  el usuario (origin=custom). Lo visual NO viene de aquí (viene del preset/tokens). */
function templateLayer(bp: Blueprint): Record<DomainKey, Record<string, unknown>> {
  const tb = templateBlueprint(bp.templateId);
  const empty = { visual: {}, interaction: {}, structure: {}, data: {}, security: {} } as Record<DomainKey, Record<string, unknown>>;
  if (!tb) return empty;
  const a = tb.architecture ?? {}, ag = tb.agents ?? {};
  const agentsT = (ag.always?.length || ag.never?.length || ag.ask?.length)
    ? { always: ag.always ?? [], never: ag.never ?? [], ask: ag.ask ?? [] } : undefined;
  return {
    visual: {},
    interaction: { ...(tb.interaction ?? {}) },
    structure: {
      pattern: a.pattern, naming: a.naming, tree: a.tree, libraries: tb.libraries?.items,
      agents: agentsT, serverComponentsDefault: a.serverComponentsDefault, defaultExport: a.defaultExport,
    },
    data: { ...(tb.data ?? {}) },
    security: { ...(tb.security ?? {}) },
  };
}
function sameVal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

/* ------------------------------- Resolución -------------------------------- */
export function resolveBlueprint(bp: Blueprint, visualTokens?: Record<string, string>): Resolution {
  const draftConfig = draftLayer(bp, visualTokens);
  const presetConfig = presetLayer(bp);
  const defaultConfig = defaultLayer();
  const templateConfig = templateLayer(bp);

  const resolved: Record<DomainKey, Record<string, unknown>> = { visual: {}, interaction: {}, structure: {}, data: {}, security: {} };
  const domains = {} as Record<DomainKey, DomainReport>;
  const allBlocking: string[] = [], allWarnings: string[] = [];
  const inheritedFields: string[] = [], defaultedFields: string[] = [], customFields: string[] = [], templateFields: string[] = [];

  // Reglas CONTEXTUALES por tipo de proyecto: una web estática/portfolio no
  // necesita auth/sesión/validación de servidor, así que esos campos dejan de
  // ser required/recommended (pasan a "advanced" = opcional) y no bloquean ni
  // cuentan como falta. Nada se inventa: es el mismo motor con clase efectiva.
  const projectType = String((bp as { projectType?: string }).projectType ?? "").toLowerCase();
  const isStatic = /static|portfolio|marketing|landing|content|blog|docs/.test(projectType);
  const NA_STATIC = new Set<string>([
    "security.authMethods", "security.sessionType", "security.validationLib", "security.serverSideValidation",
    "security.inlineValidation", "security.csp", "security.rateLimit", "security.secretsServerOnly",
    "data.formValidation",
  ]);
  const clsOf = (domain: DomainKey, spec: FieldSpec): FieldClass =>
    (isStatic && NA_STATIC.has(`${domain}.${spec.key}`)) ? "advanced" : spec.cls;

  // P3 — DEFAULTS CONSCIENTES DE PLATAFORMA. Un default solo se aplica si tiene
  // sentido para ESTE tipo de proyecto; si no, se resuelve al valor correcto de la
  // plataforma (p. ej. RSC solo en Next). Sigue siendo origin="default" (honesto:
  // no "detectado"), pero deja de meter semántica web/Next donde no aplica.
  const libNames = new Set((bp.libraries?.items ?? []).map((l) => String(l.name).toLowerCase()));
  const isNext = libNames.has("next");
  const platformDefault = (domain: DomainKey, key: string, base: unknown): unknown => {
    // RSC (React Server Components) solo tiene sentido en Next. Astro, Tauri/Electron
    // (desktop), Capacitor/Android (mobile) y backend puro → false por defecto.
    if (domain === "structure" && key === "serverComponentsDefault") return isNext;
    // Navegación por defecto según la naturaleza del proyecto.
    if (domain === "interaction" && key === "navigationPattern") {
      if (projectType === "mobile") return "tabbed";
      if (projectType === "desktop" || projectType === "dashboard" || projectType === "crud" || projectType === "commerce") return "app-shell";
      if (/portfolio|marketing|landing|content|blog|docs|static/.test(projectType)) return "landing";
      return base;
    }
    return base;
  };

  for (const domain of DOMAINS) {
    const fields: FieldReport[] = [];
    const counts = { custom: 0, template: 0, preset: 0, default: 0, missing: 0 };
    const blocking: string[] = [], warnings: string[] = [];
    let covNum = 0, covDen = 0;

    for (const spec of SPECS[domain]) {
      const dv = draftConfig[domain][spec.key];
      const tv = templateConfig[domain][spec.key];
      const pv = presetConfig[domain][spec.key];
      let origin: Origin; let value: unknown;
      if (present(dv)) { origin = present(tv) && sameVal(dv, tv) ? "template" : "custom"; value = dv; }
      else if (present(tv)) { origin = "template"; value = tv; }
      else if (present(pv)) { origin = "preset"; value = pv; }
      else if (spec.def !== undefined) { origin = "default"; value = platformDefault(domain, spec.key, spec.def); }
      else { origin = "missing"; value = undefined; }

      resolved[domain][spec.key] = value;
      counts[origin]++;
      const fq = `${domain}.${spec.key}`;
      if (origin === "custom") customFields.push(fq);
      else if (origin === "template") templateFields.push(fq);
      else if (origin === "preset") inheritedFields.push(fq);
      else if (origin === "default") defaultedFields.push(fq);

      const cls = clsOf(domain, spec);
      if (cls === "required" || cls === "recommended") {
        covDen++;
        if (origin === "custom" || origin === "template" || origin === "preset") covNum++;
      }
      if (cls === "required" && origin === "missing") { blocking.push(`Falta «${spec.label}» (${domain})`); }
      if (cls === "recommended" && origin === "default") { warnings.push(`«${spec.label}» usa valor por defecto`); }
      if (cls === "recommended" && origin === "missing") { warnings.push(`Falta «${spec.label}» (recomendado)`); }

      fields.push({ key: spec.key, label: spec.label, domain, cls, origin, value });
    }

    // Regla dura extra: sesión insegura (no bloquea, es elección válida, pero avisa fuerte)
    if (domain === "security" && resolved.security.sessionType === "jwt-localstorage")
      warnings.push("Sesión JWT en localStorage: expuesta a XSS (recomendado: cookie httpOnly)");

    const status: TabStatus = blocking.length ? "blocking"
      : warnings.some((w) => w.includes("Falta")) ? "partial"
      : counts.default > 0 ? "using_defaults" : "complete";

    domains[domain] = { domain, status, counts, coverage: covDen ? covNum / covDen : 1, blocking, warnings, fields };
    allBlocking.push(...blocking); allWarnings.push(...warnings);
  }

  const covDenAll = DOMAINS.reduce((n, d) => n + SPECS[d].filter((f) => clsOf(d, f) !== "advanced").length, 0);
  const covNumAll = DOMAINS.reduce((n, d) => n + domains[d].fields.filter((f) => f.cls !== "advanced" && (f.origin === "custom" || f.origin === "preset")).length, 0);

  const validationReport: ValidationReport = {
    domains, blockingIssues: allBlocking, warnings: allWarnings,
    coverage: covDenAll ? covNumAll / covDenAll : 1, canPublish: allBlocking.length === 0,
  };

  const resolvedConfig: ResolvedConfig = {
    visual: resolved.visual, interaction: resolved.interaction, structure: resolved.structure,
    data: resolved.data, security: resolved.security,
    suggestionsApplied: bp.ideas ?? [],
    meta: {
      preset: bp.preset, dataPreset: bp.data?.preset, resolvedAt: new Date().toISOString(),
      inheritedFields, defaultedFields, customFields, templateFields, warnings: allWarnings, blockingIssues: allBlocking,
    },
  };

  return { draftConfig, presetConfig, defaultConfig, resolvedConfig, validationReport };
}

/* --------- Reconstruir un Blueprint desde resolvedConfig (para AGENTS.md) --- */
export function resolvedToBlueprint(rc: ResolvedConfig): Blueprint {
  const s = rc.structure, d = rc.data, sec = rc.security, it = rc.interaction;
  const ag = (s.agents as { always?: string[]; never?: string[]; ask?: string[] } | undefined) ?? {};
  return {
    interaction: it as Blueprint["interaction"],
    architecture: {
      pattern: s.pattern as string, naming: s.naming as string,
      serverComponentsDefault: s.serverComponentsDefault as boolean, defaultExport: s.defaultExport as boolean,
      tree: s.tree as TreeNode[],
    },
    security: sec as Blueprint["security"],
    libraries: { items: (s.libraries as LibItem[]) ?? [] },
    agents: { always: ag.always ?? [], never: ag.never ?? [], ask: ag.ask ?? [] },
    data: d as Blueprint["data"],
    preset: rc.meta.preset,
  };
}
