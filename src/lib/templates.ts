/* ============================================================================
   Golden paths — plantillas de PROYECTO completas (no solo presets visuales).
   Rellenan arquitectura + árbol + naming + librerías (approved/discouraged/
   blocked) + reglas de agente + interacción + datos + seguridad. El usuario
   parte de una base senior y ajusta, en vez de diseñar todo desde cero.

   Modos de uso previstos:
   - Starter  → aplicar plantilla completa (applyTemplateToDoc con todas las partes).
   - Guided   → aplicar base y preguntar 3–5 decisiones (siguiente iteración).
   - Expert   → edición manual (lo que ya existe en las pestañas).

   Aplicación parcial: applyTemplateToDoc(doc, id, ["architecture"]) etc.
   ============================================================================ */
import {
  applyPresetToDoc, applyVisualToDoc, DATA_PRESETS,
  type Blueprint, type TreeNode, type LibItem,
} from "./blueprint";
import { type TokenGroup, type EffectsConfig } from "./tokens";
import { type SceneId } from "./scenes";

export type Rigor = "rapido" | "equilibrado" | "estricto" | "enterprise";
export type TemplatePart = "visual" | "architecture" | "interaction" | "data" | "security" | "libraries" | "agents";
export const ALL_TEMPLATE_PARTS: TemplatePart[] = ["visual", "architecture", "interaction", "data", "security", "libraries", "agents"];

/** Identidad visual propia de una plantilla (tokens + efectos). Prioritaria
 *  sobre presetId: cada golden path tiene su propio look, no una variación. */
export interface TemplateVisual {
  tokens: Record<string, string>;
  effects: EffectsConfig;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  tagline: string;         // para qué tipo de app sirve
  rigor: Rigor;
  stack: string[];         // chips de stack sugerido
  presetId?: string;       // preset visual base (fallback si no hay `visual`)
  visual?: TemplateVisual; // identidad visual propia (tokens + efectos)
  accent?: string;         // color de muestra para la galería (swatch)
  defaultScene?: SceneId;  // escena que abre el preview al aplicar la plantilla
  suggested?: string[];    // componentes/queries sugeridos (chips en la galería)
  blueprint: Blueprint;    // base de comportamiento/estructura completa
}

/* --------------------------- helpers de árbol ------------------------------ */
const dir = (name: string, children: TreeNode[] = []): TreeNode => ({ name, type: "folder", children });
const file = (name: string): TreeNode => ({ name, type: "file" });
const pkg = (name: string, children: TreeNode[] = []): TreeNode => ({ name, type: "package", children });

const dataOf = (id: string): NonNullable<Blueprint["data"]> =>
  structuredClone(DATA_PRESETS.find((d) => d.id === id)?.data ?? {});

/* --------------------------- packs de reglas IA ---------------------------- */
interface RulePack { always: string[]; never: string[]; ask: string[] }
export const RULE_PACKS: Record<string, RulePack> = {
  "frontend-strict": {
    always: [
      "Usar siempre los design tokens de la marca",
      "TypeScript estricto (strict:true, sin any implícito)",
      "Cubrir siempre estados loading, error y empty",
      "Usar primero los componentes del registry/ui interno",
    ],
    never: [
      "No hardcodear colores hex ni valores mágicos",
      "No usar estilos inline salvo justificación puntual",
    ],
    ask: ["Preguntar antes de añadir una dependencia nueva"],
  },
  "security-aware": {
    always: [
      "Validar SIEMPRE en el servidor; no confiar solo en el cliente",
      "Mantener los secretos únicamente en el servidor",
    ],
    never: [
      "No exponer secretos ni claves en el bundle cliente",
      "No introducir dependencias sin auditar",
    ],
    ask: ["Preguntar antes de tocar autenticación, sesiones o pagos"],
  },
  "startup-fast": {
    always: [
      "Priorizar simplicidad y time-to-market",
      "Usar un stack corto y bien conocido",
    ],
    never: ["No caer en sobreingeniería ni abstracciones prematuras"],
    ask: ["Preguntar antes de añadir infraestructura compleja (colas, microservicios, etc.)"],
  },
};

/** Combina varios packs deduplicando líneas, preservando orden. */
function packs(...ids: (keyof typeof RULE_PACKS)[]): NonNullable<Blueprint["agents"]> {
  const uniq = (arr: string[]) => Array.from(new Set(arr));
  const always: string[] = [], never: string[] = [], ask: string[] = [];
  for (const id of ids) {
    const p = RULE_PACKS[id];
    always.push(...p.always); never.push(...p.never); ask.push(...p.ask);
  }
  return { always: uniq(always), never: uniq(never), ask: uniq(ask) };
}

/* ------------------------------- librerías --------------------------------- */
const lib = (name: string, category: string, status: LibItem["status"]): LibItem => ({ name, category, status });

const STACK_SAAS: LibItem[] = [
  lib("react-hook-form", "forms", "approved"),
  lib("zod", "validation", "approved"),
  lib("@tanstack/react-query", "data-fetching", "approved"),
  lib("date-fns", "utils", "approved"),
  lib("clsx", "utils", "approved"),
  lib("tailwind-merge", "utils", "approved"),
  lib("lodash", "utils", "discouraged"),
  lib("moment", "utils", "blocked"),
  lib("axios", "data-fetching", "blocked"),
];
const STACK_ENTERPRISE: LibItem[] = [
  ...STACK_SAAS,
  lib("@tanstack/react-table", "data", "approved"),
  lib("zustand", "state", "approved"),
];
const STACK_MINIMAL: LibItem[] = [
  lib("zod", "validation", "approved"),
  lib("react-hook-form", "forms", "approved"),
  lib("date-fns", "utils", "approved"),
  lib("moment", "utils", "blocked"),
];

/* ------------------------------- árboles ----------------------------------- */
const TREE_SAAS: TreeNode[] = [
  dir("app", [dir("(routes)"), file("layout.tsx"), file("page.tsx")]),
  dir("features", [dir("auth", [dir("components"), dir("hooks"), file("api.ts")])]),
  dir("components", [dir("ui"), dir("shared")]),
  dir("lib", [file("utils.ts")]),
  dir("server", [file("db.ts"), file("auth.ts")]),
  dir("hooks"), dir("types"), dir("tests"), dir("emails"), dir("docs"), dir("public"),
];
const TREE_CRUD: TreeNode[] = [
  dir("app"),
  dir("entities"),
  dir("features"),
  dir("shared", [dir("ui"), dir("lib"), dir("api")]),
];
const TREE_MONO: TreeNode[] = [
  dir("apps", [
    dir("web", [dir("app"), dir("components")]),
    dir("admin", [dir("app"), dir("components")]),
  ]),
  dir("packages", [
    pkg("ui", [dir("src")]),
    pkg("config"), pkg("types"), pkg("utils"),
  ]),
];
const TREE_MOBILE: TreeNode[] = [
  dir("app", [dir("(tabs)"), file("layout.tsx")]),
  dir("features", [dir("home", [dir("components"), dir("hooks")])]),
  dir("components", [dir("ui")]),
  dir("lib", [file("utils.ts")]),
  dir("hooks"),
];
const TREE_MARKETING: TreeNode[] = [
  dir("app", [
    dir("(marketing)", [file("page.tsx"), dir("pricing")]),
    dir("(app)", [dir("dashboard")]),
    dir("(auth)", [dir("login"), dir("register")]),
  ]),
  dir("components", [dir("ui"), dir("marketing")]),
  dir("lib", [file("utils.ts")]),
  dir("server"),
];

/* ------------------------- Identidad visual por path -----------------------
   Cada golden path trae su propio look (paleta, tipografía, radios, efectos),
   no una variación de una marca única. Comparten la MISMA arquitectura de
   tokens y base tipográfica → cambian de piel sin romper la identidad global.
   (Prevalece sobre presetId; presetId queda como fallback.)
   --------------------------------------------------------------------------- */
type Tk = Record<string, string>;
const visual = (tokens: Tk, effects: EffectsConfig): TemplateVisual => ({ tokens, effects });

// Producto B2B sobrio: claro, azul de producto, poco ruido.
const VIS_SAAS = visual(
  { "color.bg": "#f6f7f9", "color.surface": "#ffffff", "color.text": "#14141a", "color.muted": "#5b626f",
    "color.action.primary": "#2563eb", "color.action.primary-hover": "#1d4ed8", "color.action.accent": "#7c3aed",
    "font.body": "Inter", "font.heading": "Space Grotesk", "radius.button": "10px", "radius.card": "14px" },
  { background: { type: "solid" }, pattern: { type: "none" }, glow: { enabled: false }, grain: { enabled: false } },
);
// Backoffice enterprise: oscuro, denso, control. Rejilla técnica, radios pequeños.
const VIS_ADMIN = visual(
  { "color.bg": "#0b0d10", "color.surface": "#12151a", "color.text": "#e8eaed", "color.muted": "#8b93a1",
    "color.action.primary": "#6366f1", "color.action.primary-hover": "#4f46e5", "color.action.accent": "#22d3ee",
    "font.body": "Inter", "font.heading": "Inter", "radius.button": "6px", "radius.card": "8px" },
  { background: { type: "solid" }, pattern: { type: "grid", color: "rgba(255,255,255,0.03)", size: "26px" }, glow: { enabled: false }, grain: { enabled: false } },
);
// CRUD robusto: neutro cálido, teal serio, nada de marketing.
const VIS_CRUD = visual(
  { "color.bg": "#f5f5f4", "color.surface": "#ffffff", "color.text": "#1c1b19", "color.muted": "#6b675f",
    "color.action.primary": "#0f766e", "color.action.primary-hover": "#115e59", "color.action.accent": "#b45309",
    "font.body": "Inter", "font.heading": "Inter", "radius.button": "8px", "radius.card": "10px" },
  { background: { type: "solid" }, pattern: { type: "none" }, glow: { enabled: false }, grain: { enabled: false } },
);
// Mobile-first: claro y táctil, violeta/rosa, radios muy generosos.
const VIS_MOBILE = visual(
  { "color.bg": "#fafafa", "color.surface": "#ffffff", "color.text": "#17171a", "color.muted": "#6b6b74",
    "color.action.primary": "#7c3aed", "color.action.primary-hover": "#6d28d9", "color.action.accent": "#ec4899",
    "font.body": "Inter", "font.heading": "Space Grotesk", "radius.button": "14px", "radius.card": "20px" },
  { background: { type: "solid" }, pattern: { type: "none" }, glow: { enabled: false }, grain: { enabled: false } },
);
// Marketing + auth: oscuro expresivo, naranja de marca, hero con glow + grano.
const VIS_MARKETING = visual(
  { "color.bg": "#08080b", "color.surface": "#141418", "color.text": "#f5f5f7", "color.muted": "#8a8a94",
    "color.action.primary": "#f0a470", "color.action.primary-hover": "#e08a50", "color.action.accent": "#f4ae7c",
    "font.body": "Inter", "font.heading": "Space Grotesk", "radius.button": "12px", "radius.card": "18px" },
  { background: { type: "radial", from: "#1a1206", to: "#08080b" }, pattern: { type: "none" }, glow: { enabled: true, color: "#f0a470", intensity: 0.18, animated: false }, grain: { enabled: true, opacity: 0.04 } },
);
// Monorepo-lite: neutro técnico, azul sobrio, rejilla fina, poca marca.
const VIS_MONO = visual(
  { "color.bg": "#0c0d0f", "color.surface": "#131519", "color.text": "#e6e7ea", "color.muted": "#868b95",
    "color.action.primary": "#0ea5e9", "color.action.primary-hover": "#0284c7", "color.action.accent": "#64748b",
    "font.body": "Inter", "font.heading": "Space Grotesk", "radius.button": "6px", "radius.card": "8px" },
  { background: { type: "solid" }, pattern: { type: "grid", color: "rgba(255,255,255,0.025)", size: "30px" }, glow: { enabled: false }, grain: { enabled: false } },
);

/* ------------------------------ Golden paths ------------------------------- */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "saas-dashboard-pro", name: "SaaS dashboard pro",
    tagline: "Producto B2B con panel, auth y datos.", rigor: "estricto",
    stack: ["Next 15", "RSC", "zod", "react-hook-form", "tanstack-query", "tailwind"],
    presetId: "minimal-saas", visual: VIS_SAAS, accent: "#2563eb", defaultScene: "dashboard",
    suggested: ["sidebar", "stats", "table", "filters", "card"],
    blueprint: {
      architecture: { pattern: "feature-based", naming: "kebab-files", serverComponentsDefault: true, defaultExport: false, tree: TREE_SAAS },
      interaction: { navigationPattern: "dashboard", motionPreset: "smooth", loadingPattern: "skeleton", routeTransitions: true, feedbackToastSuccess: true, feedbackInlineErrors: true },
      data: dataOf("saas"),
      security: { authMethods: ["oauth", "email-password"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true, csp: true, secretsServerOnly: true },
      libraries: { items: STACK_SAAS },
      agents: packs("frontend-strict", "security-aware"),
    },
  },
  {
    id: "admin-enterprise", name: "Admin panel enterprise",
    tagline: "Backoffice denso con tablas, filtros y roles.", rigor: "enterprise",
    stack: ["Next 15", "app-shell", "tanstack-table", "zod", "tanstack-query", "zustand"],
    presetId: "dev-dashboard", visual: VIS_ADMIN, accent: "#6366f1", defaultScene: "dashboard",
    suggested: ["sidebar", "table", "filters", "stats", "command palette"],
    blueprint: {
      architecture: { pattern: "feature-based", naming: "kebab-files", serverComponentsDefault: true, defaultExport: false, tree: TREE_SAAS },
      interaction: { navigationPattern: "app-shell", motionPreset: "snappy", loadingPattern: "skeleton", feedbackToastSuccess: true, feedbackInlineErrors: true, feedbackErrorSummaryTop: true },
      data: dataOf("dashboard-admin"),
      security: { authMethods: ["oauth", "session-cookie"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true, csp: true, rateLimit: true, secretsServerOnly: true },
      libraries: { items: STACK_ENTERPRISE },
      agents: packs("frontend-strict", "security-aware"),
    },
  },
  {
    id: "crud-robusto", name: "CRUD clásico robusto",
    tagline: "Altas/bajas seguras con confirmaciones.", rigor: "equilibrado",
    stack: ["Next 15", "FSD", "zod", "react-hook-form"],
    presetId: "knowledge", visual: VIS_CRUD, accent: "#0f766e", defaultScene: "form",
    suggested: ["form", "table", "confirm modal", "toast", "input"],
    blueprint: {
      architecture: { pattern: "layer-based", naming: "kebab-files", serverComponentsDefault: true, defaultExport: false, tree: TREE_CRUD },
      interaction: { navigationPattern: "tabbed", motionPreset: "minimal", loadingPattern: "spinner", feedbackToastSuccess: true, feedbackInlineErrors: true },
      data: dataOf("crud"),
      security: { authMethods: ["email-password"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true },
      libraries: { items: STACK_MINIMAL },
      agents: packs("frontend-strict"),
    },
  },
  {
    id: "mobile-first", name: "App mobile-first",
    tagline: "Producto móvil: cards, gestos y estados claros.", rigor: "equilibrado",
    stack: ["Next 15", "tabs", "cards mobile", "zod"],
    presetId: "builder", visual: VIS_MOBILE, accent: "#7c3aed", defaultScene: "mobile",
    suggested: ["bottom nav", "card", "list", "bottom sheet", "avatar"],
    blueprint: {
      architecture: { pattern: "feature-based", naming: "kebab-files", serverComponentsDefault: true, defaultExport: false, tree: TREE_MOBILE },
      interaction: { navigationPattern: "tabbed", motionPreset: "smooth", loadingPattern: "skeleton", feedbackToastSuccess: true, feedbackInlineErrors: true },
      data: dataOf("mobile-first"),
      security: { authMethods: ["magic-link", "oauth"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true },
      libraries: { items: STACK_MINIMAL },
      agents: packs("frontend-strict", "startup-fast"),
    },
  },
  {
    id: "marketing-auth-backoffice", name: "Marketing + auth + backoffice",
    tagline: "Landing pública, auth y panel privado.", rigor: "equilibrado",
    stack: ["Next 15", "landing", "oauth", "magic-link", "zod"],
    presetId: "cyber", visual: VIS_MARKETING, accent: "#f0a470", defaultScene: "landing",
    suggested: ["hero", "cta", "proof", "feature card", "faq", "footer"],
    blueprint: {
      architecture: { pattern: "feature-based", naming: "kebab-files", serverComponentsDefault: true, defaultExport: false, tree: TREE_MARKETING },
      interaction: { navigationPattern: "landing", motionPreset: "smooth", loadingPattern: "skeleton", routeTransitions: true, feedbackToastSuccess: true, feedbackInlineErrors: true },
      data: dataOf("saas"),
      security: { authMethods: ["oauth", "magic-link"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true, csp: true, secretsServerOnly: true },
      libraries: { items: STACK_SAAS },
      agents: packs("frontend-strict", "security-aware"),
    },
  },
  {
    id: "monorepo-lite", name: "Monorepo-lite escalable",
    tagline: "Varias apps + paquetes compartidos.", rigor: "enterprise",
    stack: ["Turborepo", "apps/web+admin", "packages/ui", "zod", "tanstack-query"],
    presetId: "dev-dashboard", visual: VIS_MONO, accent: "#0ea5e9", defaultScene: "dashboard",
    suggested: ["app-shell", "workspace tabs", "table", "stats", "card"],
    blueprint: {
      architecture: { pattern: "monorepo-lite", naming: "kebab-files", serverComponentsDefault: true, defaultExport: false, tree: TREE_MONO },
      interaction: { navigationPattern: "app-shell", motionPreset: "snappy", loadingPattern: "skeleton", feedbackToastSuccess: true, feedbackInlineErrors: true },
      data: dataOf("productive"),
      security: { authMethods: ["oauth", "session-cookie"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true, csp: true, rateLimit: true, secretsServerOnly: true },
      libraries: { items: STACK_ENTERPRISE },
      agents: packs("frontend-strict", "security-aware", "startup-fast"),
    },
  },
];

/* ----------------------- Aplicar plantilla (Starter) ----------------------- */
function mergeBlueprint(base: Blueprint, patch: Blueprint): Blueprint {
  const out = structuredClone(base ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(patch ?? {}) as Array<keyof Blueprint>) {
    const pv = (patch as Record<string, unknown>)[k];
    if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      out[k] = { ...((out[k] as object) ?? {}), ...(pv as object) };
    } else {
      out[k] = pv;
    }
  }
  return out as Blueprint;
}

/**
 * Aplica una plantilla al doc. `parts` = qué capas aplicar (por defecto todas =
 * Starter). Ej.: applyTemplateToDoc(doc, id, ["architecture"]) = "usar solo árbol".
 * Reutiliza applyPresetToDoc para lo visual y mergeBlueprint para el resto.
 */
export function applyTemplateToDoc(doc: TokenGroup, templateId: string, parts?: TemplatePart[]): TokenGroup {
  const tpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return doc;
  const want = new Set(parts && parts.length ? parts : ALL_TEMPLATE_PARTS);
  let next = structuredClone(doc);
  if (want.has("visual")) {
    // Identidad visual propia de la plantilla; si no la trae, cae al preset base.
    if (tpl.visual) next = applyVisualToDoc(next, tpl.visual.tokens, tpl.visual.effects);
    else if (tpl.presetId) next = applyPresetToDoc(next, tpl.presetId);
  }

  const patch: Blueprint = {};
  if (want.has("architecture") && tpl.blueprint.architecture) patch.architecture = tpl.blueprint.architecture;
  if (want.has("interaction") && tpl.blueprint.interaction) patch.interaction = tpl.blueprint.interaction;
  if (want.has("data") && tpl.blueprint.data) patch.data = tpl.blueprint.data;
  if (want.has("security") && tpl.blueprint.security) patch.security = tpl.blueprint.security;
  if (want.has("libraries") && tpl.blueprint.libraries) patch.libraries = tpl.blueprint.libraries;
  if (want.has("agents") && tpl.blueprint.agents) patch.agents = tpl.blueprint.agents;

  const root = next as unknown as { blueprint?: Blueprint };
  root.blueprint = mergeBlueprint(root.blueprint ?? {}, patch);
  if (want.has("visual") && !tpl.visual && tpl.presetId && !root.blueprint.preset) root.blueprint.preset = tpl.presetId;
  // Solo la aplicación COMPLETA marca la marca como "basada en plantilla" (trazabilidad
  // de origen). La aplicación parcial trae piezas que quedan como decisión propia (custom).
  const isFull = !parts || parts.length === 0;
  if (isFull) root.blueprint.templateId = tpl.id;
  return next;
}

/** Devuelve el blueprint (base) de una plantilla, para comparar orígenes. */
export function templateBlueprint(templateId?: string): Blueprint | null {
  if (!templateId) return null;
  return PROJECT_TEMPLATES.find((t) => t.id === templateId)?.blueprint ?? null;
}

/* ============================================================================
   Modo GUIDED — capa corta encima de los golden paths: elige una base y
   responde 3–5 decisiones de alto impacto; se aplica la plantilla completa
   (origin=plantilla) y luego los overrides (origin=custom, "lo que cambió").
   ============================================================================ */
export interface GuidedAnswers {
  nav?: string;        // dashboard | app-shell | landing | wizard | tabbed
  auth?: string;       // oauth | magic-link | email-password
  datos?: string;      // tabla | cards | simple
  rigor?: Rigor;       // rapido | equilibrado | estricto | enterprise
  priority?: string;   // mobile | desktop
}

export const GUIDED_QUESTIONS = [
  { key: "nav", label: "Navegación", help: "Cómo se moverá el usuario.",
    options: [{ v: "dashboard", l: "Dashboard" }, { v: "app-shell", l: "App shell" }, { v: "landing", l: "Landing" }, { v: "wizard", l: "Wizard" }, { v: "tabbed", l: "Tabs" }] },
  { key: "auth", label: "Autenticación", help: "Cómo entra la gente.",
    options: [{ v: "oauth", l: "OAuth (+email)" }, { v: "magic-link", l: "Magic link" }, { v: "email-password", l: "Email + contraseña" }] },
  { key: "datos", label: "Datos", help: "Cómo se listan los registros.",
    options: [{ v: "tabla", l: "Tabla" }, { v: "cards", l: "Cards" }, { v: "simple", l: "Lista simple" }] },
  { key: "rigor", label: "Rigor", help: "Cuánta seguridad/validación de serie.",
    options: [{ v: "rapido", l: "Rápido" }, { v: "equilibrado", l: "Equilibrado" }, { v: "estricto", l: "Estricto" }, { v: "enterprise", l: "Enterprise" }] },
  { key: "priority", label: "Prioridad", help: "Móvil o escritorio primero.",
    options: [{ v: "mobile", l: "Mobile-first" }, { v: "desktop", l: "Desktop-first" }] },
] as const;

/** Traduce las respuestas Guided a un patch de Blueprint (overrides). */
export function guidedPatch(ans: GuidedAnswers): Blueprint {
  const bp: Blueprint = {};
  if (ans.nav) {
    bp.interaction = { navigationPattern: ans.nav };
    if (ans.nav === "wizard") bp.data = { ...(bp.data ?? {}), formPreset: "multi-step" };
  }
  if (ans.auth) {
    const m = ans.auth === "oauth" ? ["oauth", "email-password"] : ans.auth === "magic-link" ? ["magic-link"] : ["email-password"];
    bp.security = { ...(bp.security ?? {}), authMethods: m };
  }
  if (ans.datos) {
    const tl = ans.datos === "cards" ? "cards-mobile" : ans.datos === "simple" ? "simple-list" : "comfortable";
    bp.data = { ...(bp.data ?? {}), tableLayout: tl };
  }
  if (ans.rigor) {
    const sec = { ...(bp.security ?? {}) } as NonNullable<Blueprint["security"]>;
    if (ans.rigor === "rapido") { sec.csp = false; sec.rateLimit = false; }
    else if (ans.rigor === "equilibrado") { sec.csp = true; }
    else if (ans.rigor === "estricto") { sec.csp = true; sec.serverSideValidation = true; sec.inlineValidation = true; }
    else if (ans.rigor === "enterprise") { sec.csp = true; sec.rateLimit = true; sec.serverSideValidation = true; sec.secretsServerOnly = true; }
    bp.security = sec;
  }
  if (ans.priority) {
    bp.data = { ...(bp.data ?? {}), mobileData: ans.priority === "mobile" ? "cards" : "stacked" };
  }
  return bp;
}

/** Aplica la plantilla base COMPLETA + los overrides de Guided (estos quedan custom). */
export function applyGuidedToDoc(doc: TokenGroup, baseId: string, ans: GuidedAnswers): TokenGroup {
  let next = applyTemplateToDoc(doc, baseId); // completa → templateId + base = origin plantilla
  const patch = guidedPatch(ans);
  const root = next as unknown as { blueprint?: Blueprint };
  root.blueprint = mergeBlueprint(root.blueprint ?? {}, patch);
  return next;
}

/** Cambios de Guided respecto a la base (para el resumen base → nuevo). */
export interface GuidedChange { label: string; from: string; to: string }
export function guidedChanges(baseId: string, ans: GuidedAnswers): GuidedChange[] {
  const base = PROJECT_TEMPLATES.find((t) => t.id === baseId)?.blueprint;
  if (!base) return [];
  const patch = guidedPatch(ans);
  const fmt = (v: unknown) => Array.isArray(v) ? (v.join(", ") || "—") : String(v ?? "—");
  const out: GuidedChange[] = [];
  const check = (label: string, from: unknown, to: unknown) => {
    if (to === undefined) return;
    if (JSON.stringify(from) !== JSON.stringify(to)) out.push({ label, from: fmt(from), to: fmt(to) });
  };
  check("Navegación", base.interaction?.navigationPattern, patch.interaction?.navigationPattern);
  check("Auth", base.security?.authMethods, patch.security?.authMethods);
  check("Tablas/listas", base.data?.tableLayout, patch.data?.tableLayout);
  check("Datos en móvil", base.data?.mobileData, patch.data?.mobileData);
  check("CSP", base.security?.csp, patch.security?.csp);
  check("Rate limiting", base.security?.rateLimit, patch.security?.rateLimit);
  return out;
}
