import {
  setTokenValue,
  DEFAULT_EFFECTS,
  type EffectsConfig,
  type TokenGroup,
} from "./tokens";
import type { SceneId, SceneBlockInstance } from "./scenes";
import type { PortfolioProject } from "./portfolioProjects";

/* ============================================================================
   Blueprint = "identidad de comportamiento" de una marca (además de la visual).
   Se guarda dentro del doc de tokens bajo la clave `blueprint` (compileBrand la
   ignora). Este módulo es la única fuente de verdad de su esquema, presets y
   serialización a markdown (para AI_PROMPT.md, AGENTS.md y MCP).
   ============================================================================ */

/** Una vista/pagina detectada del proyecto importado (Fase 1: proyecto -> vistas).
 *  `previewArchetype` es SOLO el arquetipo con el que se previsualiza la vista,
 *  no su definicion real. `sections` queda preparado para la Fase 2 (kind como
 *  string = registro extensible, no union cerrado). */
export interface ProjectSignal { kind: string; confidence: "strong" | "weak"; source: string }

export interface ProjectView {
  id: string;
  route: string;
  title?: string;
  previewArchetype: SceneId;
  dynamic?: boolean;
  sections?: { id: string; kind: string; confidence?: string; source?: string }[];
  data?: ProjectSignal[];        // señales de datos de la vista (Fase 3)
  interaction?: ProjectSignal[]; // señales de interacción de la vista (Fase 3)
  confidence: "strong" | "weak" | "default";
  source: string;
}

export interface Blueprint {
  /** Versión del esquema del blueprint (v2 = CMS dinámico con dataBinding). */
  schemaVersion?: number;
  /** Vistas/paginas detectadas del proyecto (Fase 1). El preview se deriva de aqui. */
  views?: ProjectView[];
  interaction?: {
    navigationPattern?: string;
    backConfirmUnsaved?: boolean;
    backFallbackRoute?: string;
    backSaveDraft?: boolean;
    motionPreset?: string;
    routeTransitions?: boolean;
    loadingPattern?: string;
    feedbackToastSuccess?: boolean;
    feedbackInlineErrors?: boolean;
    feedbackErrorSummaryTop?: boolean;
  };
  architecture?: {
    pattern?: string;
    serverComponentsDefault?: boolean;
    defaultExport?: boolean;
    naming?: string;
    folders?: string;
    tree?: TreeNode[];
    /** Estructura REAL detectada al escanear el proyecto (solo lectura / semilla).
     *  El puente (seedEditor) la usa para sembrar `tree` de forma honesta: refleja
     *  las carpetas y archivos reales, no una plantilla ni solo las rutas. */
    detectedTree?: TreeNode[];
  };
  security?: {
    authMethods?: string[];
    sessionType?: string;
    validationLib?: string;
    inlineValidation?: boolean;
    serverSideValidation?: boolean;
    csp?: boolean;
    rateLimit?: boolean;
    secretsServerOnly?: boolean;
  };
  libraries?: { approved?: string[]; forbidden?: string[]; items?: LibItem[] };
  agents?: { rules?: string; always?: string[]; never?: string[]; ask?: string[]; notes?: string };
  data?: {
    formPreset?: string;
    formValidation?: string;
    formConfirm?: string;
    tableLayout?: string;
    filters?: string;
    pagination?: string;
    search?: string;
    searchTrigger?: string;
    emptyCta?: boolean;
    loadingPattern?: string;
    errorPattern?: string;
    successPattern?: string;
    bulkActions?: boolean;
    confirmations?: string;
    mobileData?: string;
    preset?: string;
  };
  ideas?: Array<{ title: string; source?: string; url?: string }>;
  notes?: string;
  preset?: string;
  templateId?: string; // golden path aplicado (para trazabilidad de origen)
  /** Procedencia por campo (trazabilidad VISIBLE en el editor). Clave =
   *  `${domain}.${key}` en convención de resolve (structure.tree, data.formPreset,
   *  interaction.navigationPattern…). `detected` = inferido del análisis; `seeded` =
   *  autoaplicado por el puente; `manual` = editado por el usuario. resolve.ts sigue
   *  siendo la verdad de default/heredado; esto refina el caso "custom". */
  slots?: Record<string, Record<string, string>>;
  sceneLayouts?: Record<string, SceneBlockInstance[]>;
  provenance?: Record<string, FieldProvenance>;
  /** Coleccion CMS de proyectos del portfolio. Renderizados dinamicamente por
   *  ProjectCollectionSection y ProjectDetailTemplate — nunca como HTML estatico. */
  projects?: PortfolioProject[];
  /** Rutas personalizadas del proyecto (paginas, colecciones, detalle, sistema). */
  customRoutes?: Array<{ path: string; sceneId: string; title: string; icon?: string; isDynamic?: boolean; parentPath?: string; description?: string }>;
}
export type ProvenanceOrigin = "detected" | "seeded" | "manual";
export interface FieldProvenance { origin: ProvenanceOrigin; source?: string; confidence?: "strong" | "weak" | "default"; value?: unknown }
/** Estado de procedencia resuelto para pintar en la UI (combina resolve + provenance). */
export type OriginState = "detected" | "seeded" | "manual" | "default" | "inherited" | "missing";
export interface OriginInfo { state: OriginState; source?: string; confidence?: string }

/* ------------------------------ Opciones UI -------------------------------- */
export interface Badge { text: string; tone: "good" | "warn" | "bad" | "info" }
export interface Opt { value: string; label: string; desc: string; badge?: Badge; wire?: string }

export interface TreeNode { name: string; type: "folder" | "file" | "package"; children?: TreeNode[] }
export interface LibItem { name: string; category?: string; status: "approved" | "discouraged" | "blocked" }
export const LIB_CATEGORIES = ["framework", "ui", "motion", "routing", "styling", "build", "data", "data-fetching", "state", "forms", "validation", "testing", "desktop", "native", "runtime", "utils", "other"];

export const TREE_TEMPLATES: Record<string, TreeNode[]> = {
  "feature-based": [
    { name: "app", type: "folder", children: [
      { name: "(routes)", type: "folder", children: [] },
      { name: "layout.tsx", type: "file" },
      { name: "page.tsx", type: "file" },
    ] },
    { name: "features", type: "folder", children: [
      { name: "auth", type: "folder", children: [
        { name: "components", type: "folder", children: [] },
        { name: "hooks", type: "folder", children: [] },
        { name: "api.ts", type: "file" },
      ] },
    ] },
    { name: "components", type: "folder", children: [ { name: "ui", type: "folder", children: [] } ] },
    { name: "lib", type: "folder", children: [ { name: "utils.ts", type: "file" } ] },
    { name: "hooks", type: "folder", children: [] },
  ],
  "layer-based": [
    { name: "app", type: "folder", children: [] },
    { name: "components", type: "folder", children: [ { name: "ui", type: "folder", children: [] } ] },
    { name: "hooks", type: "folder", children: [] },
    { name: "services", type: "folder", children: [] },
    { name: "lib", type: "folder", children: [] },
    { name: "types", type: "folder", children: [] },
  ],
  "monorepo-lite": [
    { name: "apps", type: "folder", children: [
      { name: "web", type: "folder", children: [
        { name: "app", type: "folder", children: [] },
        { name: "components", type: "folder", children: [] },
      ] },
    ] },
    { name: "packages", type: "folder", children: [
      { name: "ui", type: "package", children: [ { name: "src", type: "folder", children: [] } ] },
      { name: "config", type: "package", children: [] },
    ] },
  ],
};

export const NAV_PATTERNS: Opt[] = [
  { wire: "app-shell", value: "app-shell", label: "App shell", desc: "Sidebar fija + topbar. Herramientas y dashboards densos." },
  { wire: "dashboard", value: "dashboard", label: "Dashboard", desc: "Rejilla de widgets con filtros. Datos de un vistazo." },
  { wire: "landing", value: "landing", label: "Landing", desc: "Scroll por secciones + CTA. Marketing y captación." },
  { wire: "wizard", value: "wizard", label: "Wizard / Stepper", desc: "Pasos guiados con progreso. Onboarding y checkout." },
  { wire: "tabbed", value: "tabbed", label: "Tabs / Modular", desc: "Navegación por pestañas o módulos independientes." },
];

export const MOTION_PRESETS: Opt[] = [
  { value: "minimal", label: "Minimal", desc: "Casi sin animación. Máxima velocidad percibida." },
  { value: "snappy", label: "Snappy", desc: "Rápida (120–180ms), orientada a productividad." },
  { value: "smooth", label: "Smooth", desc: "Pulida y visible (250–350ms). Sensación premium." },
  { value: "expressive", label: "Expressive", desc: "Llamativa, con spring. Branding fuerte.", badge: { text: "Puede penalizar UX", tone: "warn" } },
  { value: "none", label: "Ninguna", desc: "Sin transiciones. Accesibilidad / reduce-motion.", badge: { text: "Accesible", tone: "info" } },
];

export const LOADING_PATTERNS: Opt[] = [
  { value: "skeleton", label: "Skeleton", desc: "Esqueletos con la forma del contenido." },
  { value: "spinner", label: "Spinner", desc: "Indicador simple centrado." },
  { value: "progress", label: "Barra de progreso", desc: "Progreso superior en navegación." },
  { value: "optimistic", label: "Optimista", desc: "Pinta el resultado antes de confirmar." },
];

export const ARCH_PATTERNS: Opt[] = [
  { value: "feature-based", label: "Feature-based", desc: "Carpeta por feature (colocación de UI, lógica y datos)." },
  { value: "layer-based", label: "Layer-based", desc: "Por capas: ui / hooks / services / lib." },
  { value: "monorepo-lite", label: "Monorepo-lite", desc: "Paquetes internos compartidos (ui, config)." },
];

export const NAMING: Opt[] = [
  { value: "kebab-files", label: "kebab-case ficheros", desc: "user-card.tsx, use-auth.ts." },
  { value: "pascal-components", label: "PascalCase componentes", desc: "UserCard, AuthProvider." },
  { value: "camel-vars", label: "camelCase variables", desc: "getUser, isLoading." },
];

export const SESSION_TYPES: Opt[] = [
  { value: "httpOnly-cookie", label: "Cookie httpOnly", desc: "Sesión en cookie no accesible por JS.", badge: { text: "Recomendado", tone: "good" } },
  { value: "jwt-cookie", label: "JWT en cookie", desc: "JWT firmado en cookie httpOnly.", badge: { text: "OK", tone: "info" } },
  { value: "jwt-localstorage", label: "JWT en localStorage", desc: "Simple pero expuesto a XSS.", badge: { text: "Riesgo XSS", tone: "bad" } },
];

export const VALIDATION_LIBS: Opt[] = [
  { value: "zod", label: "Zod", desc: "Esquemas TS-first. Estándar actual.", badge: { text: "TS-first", tone: "info" } },
  { value: "valibot", label: "Valibot", desc: "Ligero y modular, ideal para bundles pequeños." },
  { value: "yup", label: "Yup", desc: "Maduro, común con Formik." },
  { value: "none", label: "Ninguna", desc: "Validación manual.", badge: { text: "Sin validación", tone: "warn" } },
];

export const AUTH_METHODS: Opt[] = [
  { value: "email-password", label: "Email + contraseña", desc: "Credenciales clásicas con hashing." },
  { value: "oauth", label: "OAuth", desc: "Google, GitHub… delega la identidad.", badge: { text: "Recomendado", tone: "good" } },
  { value: "magic-link", label: "Magic link", desc: "Enlace por email, sin contraseña.", badge: { text: "Sin password", tone: "info" } },
  { value: "session-cookie", label: "Sesión de servidor", desc: "Sesión en servidor + cookie." },
];

export const SECURITY_CHECKS: { key: keyof NonNullable<Blueprint["security"]>; label: string; desc: string }[] = [
  { key: "inlineValidation", label: "Validación inline", desc: "Errores junto al campo, en tiempo real." },
  { key: "serverSideValidation", label: "Validación en servidor", desc: "Nunca confiar solo en el cliente." },
  { key: "csp", label: "CSP estricta", desc: "Content-Security-Policy que bloquea inline/eval." },
  { key: "rateLimit", label: "Rate limiting", desc: "Límite de peticiones por IP/usuario en la API." },
  { key: "secretsServerOnly", label: "Secretos solo en servidor", desc: "Nada de claves en el bundle cliente." },
];

/* ------------------------------ Datos (#4) --------------------------------- */
export const FORM_PRESETS: Opt[] = [
  { wire: "form-simple", value: "simple", label: "Simple", desc: "Un formulario corto, pocos campos." },
  { wire: "form-multistep", value: "multi-step", label: "Multi-step", desc: "Pasos con progreso.", badge: { text: "Sugiere wizard", tone: "info" } },
  { wire: "form-dashboard", value: "dashboard-form", label: "Dashboard form", desc: "Campos en rejilla dentro de un panel." },
  { wire: "form-auth", value: "auth-form", label: "Auth form", desc: "Login/registro centrado." },
];
export const FORM_VALIDATION: Opt[] = [
  { value: "inline", label: "Inline", desc: "Valida mientras se escribe.", badge: { text: "Accesible", tone: "info" } },
  { value: "on-submit", label: "Al enviar", desc: "Valida al pulsar enviar." },
  { value: "hybrid", label: "Híbrida", desc: "Inline tras el primer envío.", badge: { text: "Recomendado", tone: "good" } },
];
export const FORM_CONFIRM: Opt[] = [
  { value: "toast", label: "Toast", desc: "Aviso breve, no bloqueante." },
  { value: "banner", label: "Banner", desc: "Mensaje persistente arriba." },
  { value: "redirect", label: "Redirección", desc: "Lleva a otra pantalla al éxito." },
  { value: "modal", label: "Modal", desc: "Confirmación en diálogo." },
];
export const TABLE_LAYOUTS: Opt[] = [
  { wire: "table-dense", value: "dense", label: "Tabla densa", desc: "Muchas filas, poco padding.", badge: { text: "Sugiere filtros", tone: "info" } },
  { wire: "table-comfortable", value: "comfortable", label: "Tabla cómoda", desc: "Más aire por fila." },
  { wire: "table-cards", value: "cards-mobile", label: "Cards mobile", desc: "Tarjetas apiladas en móvil.", badge: { text: "Cuidado móvil", tone: "good" } },
  { wire: "table-list", value: "simple-list", label: "Lista simple", desc: "Lista de una columna." },
];
export const FILTER_STYLES: Opt[] = [
  { value: "inline", label: "Filtros inline", desc: "Barra de filtros sobre la tabla." },
  { value: "drawer", label: "Filtros en drawer", desc: "Panel lateral desplegable." },
  { value: "none", label: "Sin filtros", desc: "No hay filtrado." },
];
export const PAGINATION: Opt[] = [
  { value: "classic", label: "Paginación clásica", desc: "Páginas numeradas.", badge: { text: "Accesible", tone: "info" } },
  { value: "infinite", label: "Infinite scroll", desc: "Carga al hacer scroll.", badge: { text: "Riesgo a11y/footer", tone: "warn" } },
  { value: "virtualized", label: "Virtualizada", desc: "Renderiza solo lo visible.", badge: { text: "Coste alto", tone: "warn" } },
];
export const SEARCH_STYLES: Opt[] = [
  { wire: "search-simple", value: "simple", label: "Search bar", desc: "Campo de búsqueda simple." },
  { wire: "search-filters", value: "with-filters", label: "Con filtros", desc: "Búsqueda + facetas." },
  { wire: "search-command", value: "command-palette", label: "Command palette", desc: "Cmd/Ctrl-K global.", badge: { text: "Afecta interacción", tone: "info" } },
  { value: "none", label: "Sin búsqueda", desc: "No hay búsqueda." },
];
export const SEARCH_TRIGGER: Opt[] = [
  { value: "instant", label: "Resultados instantáneos", desc: "Filtra al teclear (con debounce)." },
  { value: "on-submit", label: "Al confirmar", desc: "Busca al pulsar Enter." },
];
export const ERROR_PATTERNS: Opt[] = [
  { value: "inline", label: "Error inline", desc: "Junto al dato que falló." },
  { value: "screen", label: "Pantalla de error", desc: "Estado de error a página completa." },
];
export const SUCCESS_PATTERNS: Opt[] = [
  { value: "toast", label: "Toast", desc: "Confirmación breve." },
  { value: "banner", label: "Banner", desc: "Confirmación persistente." },
];
export const MOBILE_DATA: Opt[] = [
  { value: "cards", label: "Cards apiladas", desc: "Cada fila se vuelve una tarjeta.", badge: { text: "Recomendado", tone: "good" } },
  { value: "horizontal-scroll", label: "Scroll horizontal", desc: "Tabla con scroll-x.", badge: { text: "Cuidado móvil", tone: "warn" } },
  { value: "stacked", label: "Campos apilados", desc: "Etiqueta arriba, valor abajo." },
];
export const CONFIRMATIONS: Opt[] = [
  { value: "modal", label: "Modal de confirmación", desc: "Diálogo antes de acciones destructivas." },
  { value: "inline", label: "Confirmación inline", desc: "Segundo clic o control en la propia fila." },
  { value: "toast-undo", label: "Toast con deshacer", desc: "Acción inmediata + undo.", badge: { text: "Recomendado", tone: "good" } },
];

export interface DataPreset { id: string; name: string; desc: string; data: NonNullable<Blueprint["data"]> }
export const DATA_PRESETS: DataPreset[] = [
  { id: "dashboard-admin", name: "Dashboard admin", desc: "Tablas densas, filtros, acciones masivas.",
    data: { formPreset: "dashboard-form", formValidation: "hybrid", formConfirm: "toast", tableLayout: "dense", filters: "inline", pagination: "classic", search: "with-filters", searchTrigger: "instant", emptyCta: true, loadingPattern: "skeleton", errorPattern: "inline", successPattern: "toast", bulkActions: true, confirmations: "modal", mobileData: "cards" } },
  { id: "saas", name: "SaaS", desc: "Producto B2B: formularios limpios, tablas cómodas.",
    data: { formPreset: "simple", formValidation: "hybrid", formConfirm: "toast", tableLayout: "comfortable", filters: "inline", pagination: "classic", search: "with-filters", searchTrigger: "instant", emptyCta: true, loadingPattern: "skeleton", errorPattern: "inline", successPattern: "toast", bulkActions: true, confirmations: "toast-undo", mobileData: "cards" } },
  { id: "productive", name: "App productiva", desc: "Velocidad: command palette, virtualización, undo.",
    data: { formPreset: "dashboard-form", formValidation: "inline", formConfirm: "toast", tableLayout: "dense", filters: "drawer", pagination: "virtualized", search: "command-palette", searchTrigger: "instant", emptyCta: true, loadingPattern: "skeleton", errorPattern: "inline", successPattern: "toast", bulkActions: true, confirmations: "toast-undo", mobileData: "cards" } },
  { id: "crud", name: "CRUD clásico", desc: "Altas/bajas simples con confirmaciones seguras.",
    data: { formPreset: "simple", formValidation: "on-submit", formConfirm: "redirect", tableLayout: "comfortable", filters: "inline", pagination: "classic", search: "simple", searchTrigger: "on-submit", emptyCta: true, loadingPattern: "spinner", errorPattern: "inline", successPattern: "banner", bulkActions: false, confirmations: "modal", mobileData: "stacked" } },
  { id: "mobile-first", name: "Mobile-first", desc: "Cards, scroll infinito y estados claros en móvil.",
    data: { formPreset: "multi-step", formValidation: "inline", formConfirm: "toast", tableLayout: "cards-mobile", filters: "drawer", pagination: "infinite", search: "simple", searchTrigger: "instant", emptyCta: true, loadingPattern: "skeleton", errorPattern: "inline", successPattern: "toast", bulkActions: false, confirmations: "toast-undo", mobileData: "cards" } },
];

/* ------------------------------- Presets ----------------------------------- */
export interface BrandPreset {
  id: string;
  name: string;
  desc: string;
  swatch: string; // color de muestra en la UI
  tokens: Record<string, string>;
  effects: EffectsConfig;
  blueprint: Blueprint;
  defaultScene?: string; // escena representativa que abre el preview al aplicar el preset
}

const P = "color.action.primary";
const PH = "color.action.primary-hover";
const AC = "color.action.accent";

export const PRESETS: BrandPreset[] = [
  {
    id: "builder", name: "Builder / Productivo", swatch: "#f0a470", defaultScene: "dashboard",
    desc: "Oscuro, contraste alto, densidad alta, motion ligera. Herramientas y paneles.",
    tokens: {
      "color.bg": "#0a0a0c", "color.surface": "#141418", "color.text": "#f5f5f7", "color.muted": "#8a8a94",
      [P]: "#f0a470", [PH]: "#e08a50", [AC]: "#f4ae7c",
      "font.body": "Inter", "font.heading": "Space Grotesk", "radius.button": "8px", "radius.card": "12px",
    },
    effects: { pattern: { type: "grid", color: "rgba(255,255,255,0.03)", size: "34px" }, glow: { enabled: false }, grain: { enabled: true, opacity: 0.04 } },
    blueprint: {
      interaction: { navigationPattern: "app-shell", motionPreset: "minimal", routeTransitions: false, loadingPattern: "skeleton", feedbackToastSuccess: true, feedbackInlineErrors: true },
      architecture: { pattern: "feature-based", serverComponentsDefault: true, defaultExport: false, naming: "kebab-files" },
      security: { authMethods: ["email-password"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true, csp: true, rateLimit: true, secretsServerOnly: true },
      libraries: { items: [{ name: "react-hook-form", category: "forms", status: "approved" }, { name: "zod", category: "validation", status: "approved" }, { name: "date-fns", category: "utils", status: "approved" }, { name: "tanstack-query", category: "data-fetching", status: "approved" }, { name: "moment", category: "utils", status: "blocked" }, { name: "axios", category: "data-fetching", status: "blocked" }] },
    },
  },
  {
    id: "minimal-saas", name: "Minimal SaaS", swatch: "#2563eb", defaultScene: "dashboard",
    desc: "Claro, espaciado medio, cards suaves, validación limpia. Producto B2B.",
    tokens: {
      "color.bg": "#f7f7f9", "color.surface": "#ffffff", "color.text": "#14141a", "color.muted": "#5b5b66",
      [P]: "#2563eb", [PH]: "#1d4ed8", [AC]: "#7c3aed",
      "font.body": "Inter", "font.heading": "Inter", "radius.button": "10px", "radius.card": "16px",
    },
    effects: { background: { type: "solid" }, pattern: { type: "none" }, glow: { enabled: false }, grain: { enabled: false } },
    blueprint: {
      interaction: { navigationPattern: "dashboard", motionPreset: "smooth", routeTransitions: true, loadingPattern: "skeleton", feedbackToastSuccess: true, feedbackInlineErrors: true },
      architecture: { pattern: "feature-based", serverComponentsDefault: true, defaultExport: false, naming: "kebab-files" },
      security: { authMethods: ["oauth", "email-password"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true, csp: true, secretsServerOnly: true },
      libraries: { items: [{ name: "react-hook-form", category: "forms", status: "approved" }, { name: "zod", category: "validation", status: "approved" }, { name: "tanstack-query", category: "data-fetching", status: "approved" }, { name: "moment", category: "utils", status: "blocked" }] },
    },
  },
  {
    id: "cyber", name: "Cyber / Neon", swatch: "#22d3ee", defaultScene: "landing",
    desc: "Fondos oscuros, acento fuerte, glow, motion visible. Branding llamativo.",
    tokens: {
      "color.bg": "#05060a", "color.surface": "#0d1018", "color.text": "#e6f0ff", "color.muted": "#7c8aa5",
      [P]: "#22d3ee", [PH]: "#06b6d4", [AC]: "#a855f7",
      "font.body": "Space Grotesk", "font.heading": "Space Grotesk", "radius.button": "6px", "radius.card": "12px",
    },
    effects: { background: { type: "radial", from: "#0a1226", to: "#05060a" }, pattern: { type: "dots", color: "rgba(34,211,238,0.12)", size: "22px" }, glow: { enabled: true, color: "#22d3ee", intensity: 0.24, animated: true }, grain: { enabled: true, opacity: 0.04 } },
    blueprint: {
      interaction: { navigationPattern: "landing", motionPreset: "expressive", routeTransitions: true, loadingPattern: "spinner", feedbackToastSuccess: true },
      architecture: { pattern: "feature-based", serverComponentsDefault: true, defaultExport: false },
      security: { authMethods: ["oauth"], sessionType: "jwt-cookie", validationLib: "zod", serverSideValidation: true, csp: true },
      libraries: { items: [{ name: "motion", category: "ui", status: "approved" }, { name: "zod", category: "validation", status: "approved" }, { name: "moment", category: "utils", status: "blocked" }] },
    },
  },
  {
    id: "knowledge", name: "Knowledge OS", swatch: "#b8734a", defaultScene: "landing",
    desc: "Lectura cómoda, tipografía limpia, densidad media, navegación modular.",
    tokens: {
      "color.bg": "#faf9f7", "color.surface": "#ffffff", "color.text": "#1b1a17", "color.muted": "#6b675f",
      [P]: "#b8734a", [PH]: "#9c5f3b", [AC]: "#c9a24b",
      "font.body": "Georgia", "font.heading": "Inter", "radius.button": "8px", "radius.card": "12px",
    },
    effects: { background: { type: "solid" }, pattern: { type: "none" }, glow: { enabled: false }, grain: { enabled: true, opacity: 0.03 } },
    blueprint: {
      interaction: { navigationPattern: "tabbed", motionPreset: "smooth", routeTransitions: true, loadingPattern: "skeleton", feedbackInlineErrors: true },
      architecture: { pattern: "layer-based", serverComponentsDefault: true, defaultExport: false, naming: "kebab-files" },
      security: { authMethods: ["email-password"], sessionType: "httpOnly-cookie", validationLib: "zod", inlineValidation: true, serverSideValidation: true },
      libraries: { items: [{ name: "zod", category: "validation", status: "approved" }, { name: "date-fns", category: "utils", status: "approved" }, { name: "moment", category: "utils", status: "blocked" }] },
    },
  },
  {
    id: "dev-dashboard", name: "Dev Dashboard", swatch: "#34d399", defaultScene: "dashboard",
    desc: "Tablas claras, filtros rápidos, layout shell. Consolas y observabilidad.",
    tokens: {
      "color.bg": "#0b0d10", "color.surface": "#12151a", "color.text": "#e8eaed", "color.muted": "#8b93a1",
      [P]: "#34d399", [PH]: "#10b981", [AC]: "#60a5fa",
      "font.body": "Inter", "font.heading": "Inter", "radius.button": "6px", "radius.card": "10px",
    },
    effects: { background: { type: "solid" }, pattern: { type: "grid", color: "rgba(255,255,255,0.03)", size: "28px" }, glow: { enabled: false }, grain: { enabled: false } },
    blueprint: {
      interaction: { navigationPattern: "app-shell", motionPreset: "snappy", routeTransitions: false, loadingPattern: "spinner", feedbackToastSuccess: true, feedbackInlineErrors: true, feedbackErrorSummaryTop: true },
      architecture: { pattern: "feature-based", serverComponentsDefault: true, defaultExport: false, naming: "kebab-files" },
      security: { authMethods: ["oauth", "session-cookie"], sessionType: "httpOnly-cookie", validationLib: "zod", serverSideValidation: true, csp: true, rateLimit: true, secretsServerOnly: true },
      libraries: { items: [{ name: "tanstack-query", category: "data-fetching", status: "approved" }, { name: "zod", category: "validation", status: "approved" }, { name: "moment", category: "utils", status: "blocked" }, { name: "axios", category: "data-fetching", status: "blocked" }] },
    },
  },
];

/* --------------------------- Aplicar un preset ----------------------------- */
function effectsOfDoc(doc: TokenGroup): Required<Pick<EffectsConfig, "background" | "pattern" | "glow" | "grain" | "vignette" | "gradient">> {
  const e = (doc as { effects?: EffectsConfig }).effects ?? {};
  return {
    background: { ...DEFAULT_EFFECTS.background, ...(e.background ?? {}) },
    pattern: { ...DEFAULT_EFFECTS.pattern, ...(e.pattern ?? {}) },
    glow: { ...DEFAULT_EFFECTS.glow, ...(e.glow ?? {}) },
    grain: { ...DEFAULT_EFFECTS.grain, ...(e.grain ?? {}) },
    vignette: { ...DEFAULT_EFFECTS.vignette, ...(e.vignette ?? {}) },
    gradient: { ...DEFAULT_EFFECTS.gradient, ...(e.gradient ?? {}) },
  };
}

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

/** Devuelve un doc nuevo con el preset aplicado a lo visual (tokens+efectos) y al comportamiento. */
export function applyPresetToDoc(doc: TokenGroup, presetId: string): TokenGroup {
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p) return doc;
  let next = structuredClone(doc);
  for (const [path, val] of Object.entries(p.tokens)) next = setTokenValue(next, path, val);
  const merged = effectsOfDoc(next);
  const patch = p.effects as Record<string, Record<string, unknown>>;
  for (const sec of Object.keys(patch)) {
    (merged as Record<string, Record<string, unknown>>)[sec] = { ...(merged as Record<string, Record<string, unknown>>)[sec], ...patch[sec] };
  }
  (next as { effects?: EffectsConfig }).effects = merged as EffectsConfig;
  const root = next as unknown as { blueprint?: Blueprint };
  root.blueprint = mergeBlueprint(root.blueprint ?? {}, p.blueprint);
  root.blueprint.preset = p.id;
  return next;
}

/** Aplica SOLO lo visual (tokens + efectos) de forma directa, sin tocar el
 *  blueprint. Lo usan las plantillas que traen su propia identidad visual. */
export function applyVisualToDoc(doc: TokenGroup, tokens?: Record<string, string>, effects?: EffectsConfig): TokenGroup {
  let next = structuredClone(doc);
  if (tokens) for (const [path, val] of Object.entries(tokens)) next = setTokenValue(next, path, val);
  if (effects) {
    const merged = effectsOfDoc(next);
    const patch = effects as Record<string, Record<string, unknown>>;
    for (const sec of Object.keys(patch)) {
      (merged as Record<string, Record<string, unknown>>)[sec] = { ...(merged as Record<string, Record<string, unknown>>)[sec], ...patch[sec] };
    }
    (next as { effects?: EffectsConfig }).effects = merged as EffectsConfig;
  }
  return next;
}

/* ----------------------- ¿Tiene algo el blueprint? ------------------------- */
export function blueprintNonEmpty(bp?: Blueprint | null): boolean {
  if (!bp) return false;
  const i = bp.interaction ?? {}, a = bp.architecture ?? {}, s = bp.security ?? {}, l = bp.libraries ?? {}, ag = bp.agents ?? {}, d = bp.data ?? {};
  const anyStr = [i.navigationPattern, i.motionPreset, i.loadingPattern, i.backFallbackRoute, a.pattern, a.naming, a.folders, s.sessionType, s.validationLib, ag.rules, ag.notes, bp.notes,
    d.formPreset, d.formValidation, d.formConfirm, d.tableLayout, d.filters, d.pagination, d.search, d.searchTrigger, d.loadingPattern, d.errorPattern, d.successPattern, d.confirmations, d.mobileData].some((v) => String(v ?? "").trim());
  const anyBool = [i.routeTransitions, i.backConfirmUnsaved, i.backSaveDraft, i.feedbackToastSuccess, i.feedbackInlineErrors, i.feedbackErrorSummaryTop, a.serverComponentsDefault, a.defaultExport, s.inlineValidation, s.serverSideValidation, s.csp, s.rateLimit, s.secretsServerOnly, d.emptyCta, d.bulkActions].some(Boolean);
  const counts = (s.authMethods?.length ?? 0) + (l.approved?.length ?? 0) + (l.forbidden?.length ?? 0) + (l.items?.length ?? 0) + (a.tree?.length ?? 0) + (ag.always?.length ?? 0) + (ag.never?.length ?? 0) + (ag.ask?.length ?? 0) + (bp.ideas?.length ?? 0);
  return anyStr || anyBool || counts > 0;
}

/* --------------------- Serialización a markdown (AGENTS) ------------------- */
function labelOf(list: Opt[], value?: string): string {
  const o = list.find((x) => x.value === value);
  return o ? o.label : String(value ?? "");
}
export function treeToText(nodes?: TreeNode[], depth = 0): string {
  if (!nodes || !nodes.length) return "";
  const lines: string[] = [];
  for (const n of nodes) {
    const pad = "  ".repeat(depth);
    const suffix = n.type === "folder" ? "/" : n.type === "package" ? "/ (pkg)" : "";
    lines.push(pad + n.name + suffix);
    if (n.children && n.children.length) lines.push(treeToText(n.children, depth + 1));
  }
  return lines.filter(Boolean).join("\n");
}
export function blueprintToMarkdown(bp?: Blueprint | null): string {
  if (!bp || !blueprintNonEmpty(bp)) return "";
  const out: string[] = ["## Cómo se construye (blueprint de la marca)"];
  const i = bp.interaction ?? {}, a = bp.architecture ?? {}, s = bp.security ?? {}, l = bp.libraries ?? {};

  const inter: string[] = [];
  if (i.navigationPattern) inter.push("- Navegación: **" + labelOf(NAV_PATTERNS, i.navigationPattern) + "**");
  if (i.motionPreset) inter.push("- Motion: **" + labelOf(MOTION_PRESETS, i.motionPreset) + "**" + (i.routeTransitions ? " · transiciones de ruta activadas" : ""));
  if (i.loadingPattern) inter.push("- Carga: **" + labelOf(LOADING_PATTERNS, i.loadingPattern) + "**");
  const back: string[] = [];
  if (i.backConfirmUnsaved) back.push("confirmar cambios sin guardar");
  if (i.backSaveDraft) back.push("guardar borrador");
  if (i.backFallbackRoute) back.push("fallback → " + i.backFallbackRoute);
  if (back.length) inter.push("- Retroceso: " + back.join("; "));
  const fb: string[] = [];
  if (i.feedbackToastSuccess) fb.push("toast al éxito");
  if (i.feedbackInlineErrors) fb.push("errores inline");
  if (i.feedbackErrorSummaryTop) fb.push("resumen de errores arriba");
  if (fb.length) inter.push("- Feedback: " + fb.join(", "));
  if (inter.length) out.push("\n### Interacción\n" + inter.join("\n"));

  const arch: string[] = [];
  if (a.pattern) arch.push("- Arquitectura: **" + labelOf(ARCH_PATTERNS, a.pattern) + "**");
  if (a.serverComponentsDefault) arch.push("- Server Components por defecto");
  arch.push("- Default exports: " + (a.defaultExport ? "permitidos" : "prohibidos"));
  if (a.naming) arch.push("- Naming: " + labelOf(NAMING, a.naming));
  const treeTxt = treeToText(a.tree);
  if (treeTxt) arch.push("- Estructura de carpetas:\n```\n" + treeTxt + "\n```");
  else if (a.folders && a.folders.trim()) arch.push("- Estructura de carpetas:\n```\n" + a.folders.trim() + "\n```");
  if (arch.length) out.push("\n### Estructura\n" + arch.join("\n"));

  const sec: string[] = [];
  if (s.authMethods?.length) sec.push("- Auth: " + s.authMethods.map((m) => labelOf(AUTH_METHODS, m)).join(", "));
  if (s.sessionType) sec.push("- Sesión: " + labelOf(SESSION_TYPES, s.sessionType));
  if (s.validationLib) sec.push("- Validación: " + labelOf(VALIDATION_LIBS, s.validationLib));
  const checks = SECURITY_CHECKS.filter((c) => (s as Record<string, unknown>)[c.key]).map((c) => c.label);
  if (checks.length) sec.push("- Reglas activas: " + checks.join(", "));
  if (sec.length) out.push("\n### Seguridad\n" + sec.join("\n"));

  const libs: string[] = [];
  const items = l.items ?? [];
  const named = (st: string) => items.filter((x) => x.status === st).map((x) => x.name + (x.category ? " (" + x.category + ")" : ""));
  const appr = named("approved"), disc = named("discouraged"), blk = named("blocked");
  if (appr.length) libs.push("- Aprobadas: " + appr.join(", "));
  if (disc.length) libs.push("- Desaconsejadas: " + disc.join(", "));
  if (blk.length) libs.push("- Prohibidas (NO usar; el lint/CI debe fallar): " + blk.join(", "));
  if (!items.length && l.approved?.length) libs.push("- Aprobadas: " + l.approved.join(", "));
  if (!items.length && l.forbidden?.length) libs.push("- Prohibidas (NO usar): " + l.forbidden.join(", "));
  if (libs.length) out.push("\n### Librerías\n" + libs.join("\n"));

  const d = bp.data ?? {};
  const dat: string[] = [];
  if (d.formPreset) dat.push("- Formularios: **" + labelOf(FORM_PRESETS, d.formPreset) + "**" + (d.formValidation ? " · validación " + labelOf(FORM_VALIDATION, d.formValidation) : "") + (d.formConfirm ? " · confirmación " + labelOf(FORM_CONFIRM, d.formConfirm) : ""));
  if (d.tableLayout) dat.push("- Tablas/listas: **" + labelOf(TABLE_LAYOUTS, d.tableLayout) + "**" + (d.filters ? " · filtros " + labelOf(FILTER_STYLES, d.filters) : "") + (d.pagination ? " · paginación " + labelOf(PAGINATION, d.pagination) : ""));
  if (d.search) dat.push("- Búsqueda: **" + labelOf(SEARCH_STYLES, d.search) + "**" + (d.searchTrigger ? " · " + labelOf(SEARCH_TRIGGER, d.searchTrigger) : ""));
  const states: string[] = [];
  if (d.emptyCta) states.push("empty state con CTA");
  if (d.loadingPattern) states.push("carga: " + labelOf(LOADING_PATTERNS, d.loadingPattern));
  if (d.errorPattern) states.push("error: " + labelOf(ERROR_PATTERNS, d.errorPattern));
  if (d.successPattern) states.push("éxito: " + labelOf(SUCCESS_PATTERNS, d.successPattern));
  if (states.length) dat.push("- Estados: " + states.join(", "));
  const dops: string[] = [];
  if (d.bulkActions) dops.push("acciones masivas");
  if (d.confirmations) dops.push("confirmaciones: " + labelOf(CONFIRMATIONS, d.confirmations));
  if (d.mobileData) dops.push("móvil: " + labelOf(MOBILE_DATA, d.mobileData));
  if (dops.length) dat.push("- Operaciones: " + dops.join(", "));
  if (dat.length) out.push("\n### Datos\n" + dat.join("\n"));

  const ag = bp.agents ?? {};
  const agLines: string[] = [];
  if (ag.always?.length) agLines.push("**Siempre:**\n" + ag.always.map((r) => "- " + r).join("\n"));
  if (ag.never?.length) agLines.push("**Nunca:**\n" + ag.never.map((r) => "- " + r).join("\n"));
  if (ag.ask?.length) agLines.push("**Preguntar antes:**\n" + ag.ask.map((r) => "- " + r).join("\n"));
  if (ag.notes && ag.notes.trim()) agLines.push(ag.notes.trim());
  if (ag.rules && ag.rules.trim()) agLines.push(ag.rules.trim());
  if (agLines.length) out.push("\n### Reglas para agentes\n" + agLines.join("\n\n"));
  if (bp.notes && bp.notes.trim()) out.push("\n### Notas\n" + bp.notes.trim());
  return out.join("\n");
}
