/* ============================================================================
   Modelo de ESCENAS y SLOTS del constructor de marca.
   Cada escena (Marca / Landing / Dashboard / Login / Formulario / Móvil /
   Estados) define zonas ("slots") con: nombre visible, tipo esperado,
   categorías de catálogo compatibles y una query por defecto.

   Fase 1: alimenta la detección de "slots vacíos" y el agrupado de componentes
   por escena bajo el preview.
   Fase 2: los mismos slots se vuelven interactivos dentro del iframe (mockDoc),
   con asignación explícita escena→slot→componentId guardada en
   tokens.blueprint.slots (sin migración de BD).
   ============================================================================ */

/** Orden canonico y FUENTE UNICA de escenas. Anadir una escena = anadirla aqui
 *  (+ su label en SCENE_LABEL y sus slots en SCENE_SLOTS). SceneId se deriva de
 *  este array, asi el tipo sigue siendo estricto y no hay listas paralelas. */
export const SCENE_ORDER = [
  "marca", "landing", "portfolio", "dashboard", "auth", "form",
  "content", "commerce", "settings", "mobile", "states",
] as const;
export type SceneId = (typeof SCENE_ORDER)[number];

export type {
  SlotCardinality,
  InsertionPolicy,
  SlotDefinition,
  PageNode,
  PageDocument,
  RouteDefinition,
  ComponentDefinition,
  DocumentManifest,
  DiagnosticSeverity,
  SuggestedAction,
  ProjectDiagnostic,
  DeleteCommand,
  CanonicalProjectDocument,
  CanonicalPageDocument,
  CanonicalPageNode,
  ConflictResolutionOption,
  SlotConflictResult,
  TreeValidationResult,
} from "./projectDocument";
export {
  computeDocumentHash,
  computeDocumentHashAsync,
  checkSlotInsertionConflict,
  canonicalizeProjectDocument,
  stableStringify,
  validatePageTree,
  migrateNodesToNormalized,
  collectSubtreeNodes,
} from "./projectDocument";

import type {
  SlotCardinality,
  InsertionPolicy,
  DiagnosticSeverity,
  SuggestedAction,
  ProjectDiagnostic,
} from "./projectDocument";

export interface SceneSlot {
  /** id estable dentro de la escena (clave de asignación en Fase 2). */
  id: string;
  /** nombre visible de la zona. */
  label: string;
  /** tipo de componente que espera, en lenguaje humano. */
  expects: string;
  /** substrings de categoría del catálogo que encajan (en minúsculas). */
  match: string[];
  /** búsqueda por defecto al pulsar "+ Añadir" en el slot. */
  query: string;
  /** Cardinalidad de elementos en la zona: exactly-one, zero-or-one, etc. */
  cardinality?: SlotCardinality;
  /** Capacidad máxima de componentes antes de avisar de límite */
  maxItems?: number;
  /** Política por defecto ante inserción: append, replace-existing, etc. */
  insertionPolicy?: InsertionPolicy;
  /** Grupo exclusivo (ej: "navigation" para navbar vs sidebar) */
  exclusiveGroup?: string;
  /** Modo de render en el canvas */
  render?: "persistent" | "triggered" | "structural";
  /**
   * Slot DINÁMICO: no existe siempre. Aparece solo cuando una capacidad del
   * resolvedConfig está activa (p.ej. wizard, command-palette). Cuando la
   * capacidad se apaga el slot desaparece del lienzo pero su asignación NUNCA
   * se borra: pasa a "pendiente · oculto" hasta que la capacidad vuelva.
   */
  dyn?: boolean;
}

export const SCENE_LABEL: Record<SceneId, string> = {
  marca: "Marca",
  landing: "Landing",
  portfolio: "Portfolio",
  dashboard: "Dashboard",
  auth: "Login",
  form: "Formulario",
  content: "Contenido",
  commerce: "Tienda",
  settings: "Ajustes",
  mobile: "Móvil",
  states: "Estados",
};

/** Definición canónica de escena con identidad estable y ruta web explícita */
export interface SceneDefinition {
  id: string;             // ID canónico estable ("scene_landing", "scene_auth")
  key: SceneId;           // Clave estricta de escena
  route: string;          // Ruta explícita ("/", "/auth", "/dashboard", "/tienda")
  title: string;          // Título descriptivo
  description?: string;
}

export const SCENE_DEFINITIONS: Record<SceneId, SceneDefinition> = {
  marca: { id: "scene_marca", key: "marca", route: "/marca", title: "Marca", description: "Diseño e identidad visual" },
  landing: { id: "scene_landing", key: "landing", route: "/", title: "Landing", description: "Página de inicio y conversión" },
  portfolio: { id: "scene_portfolio", key: "portfolio", route: "/portfolio", title: "Portfolio", description: "Presentación personal y proyectos" },
  dashboard: { id: "scene_dashboard", key: "dashboard", route: "/dashboard", title: "Dashboard", description: "Panel de control y métricas" },
  auth: { id: "scene_auth", key: "auth", route: "/auth", title: "Login / Registro", description: "Acceso y autenticación" },
  form: { id: "scene_form", key: "form", route: "/formulario", title: "Formulario", description: "Captación de datos y validación" },
  content: { id: "scene_content", key: "content", route: "/blog", title: "Contenido", description: "Artículos y blog editorial" },
  commerce: { id: "scene_commerce", key: "commerce", route: "/tienda", title: "Tienda", description: "Catálogo de productos y checkout" },
  settings: { id: "scene_settings", key: "settings", route: "/ajustes", title: "Ajustes", description: "Configuración de cuenta" },
  mobile: { id: "scene_mobile", key: "mobile", route: "/mobile", title: "Móvil", description: "Vista optimizada para smartphone" },
  states: { id: "scene_states", key: "states", route: "/estados", title: "Estados", description: "Vacío, carga y errores" },
};

export function routeForScene(sceneKeyOrId: string): string {
  if (sceneKeyOrId in SCENE_DEFINITIONS) {
    return SCENE_DEFINITIONS[sceneKeyOrId as SceneId].route;
  }
  const byId = Object.values(SCENE_DEFINITIONS).find((s) => s.id === sceneKeyOrId);
  if (byId) return byId.route;
  return `/${sceneKeyOrId.replace(/^\//, "")}`;
}

/** Resuelve la clave canónica de escena a partir de una ruta URL o clave de destino */
export function sceneForRoute(routeOrKey: string): SceneId | undefined {
  if (!routeOrKey) return undefined;
  const norm = routeOrKey.trim().toLowerCase();
  // 1. Coincidencia directa con SceneId ("landing", "auth", "commerce", "content", "portfolio")
  if (SCENE_ORDER.includes(norm as SceneId)) return norm as SceneId;
  const clean = norm.replace(/^\//, "");
  if (SCENE_ORDER.includes(clean as SceneId)) return clean as SceneId;

  // 2. Coincidencia exacta con la ruta canónica ("/", "/auth", "/tienda", "/blog", "/portfolio", etc.)
  const formattedRoute = norm.startsWith("/") ? norm : `/${norm}`;
  if (formattedRoute === "/" || formattedRoute === "/landing") return "landing";
  if (formattedRoute.startsWith("/projects/") || formattedRoute.startsWith("/proyectos/")) return "content";

  const byRoute = Object.values(SCENE_DEFINITIONS).find(
    (d) => d.route.toLowerCase() === formattedRoute || d.route.toLowerCase() === `/${clean}`,
  );
  if (byRoute) return byRoute.key;

  const byCanonical = CANONICAL_PROJECT_ROUTES?.find((r) => r.path.toLowerCase() === formattedRoute);
  if (byCanonical) return byCanonical.sceneId;

  // 3. Coincidencia por id canónico ("scene_auth", "scene_commerce")
  const byId = Object.values(SCENE_DEFINITIONS).find((d) => d.id === norm || d.id === clean);
  if (byId) return byId.key;

  return undefined;
}

/** Orden y definición de zonas por escena. */
export const SCENE_SLOTS: Record<SceneId, SceneSlot[]> = {
  marca: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header", "menu", "navigation"], query: "navbar" },
    { id: "hero", label: "Hero", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "actions", label: "Acciones", expects: "Botones", match: ["button", "btn"], query: "button" },
    { id: "cards", label: "Tarjetas", expects: "Cards", match: ["card"], query: "card" },
    { id: "stats", label: "Métricas", expects: "Stats / KPIs", match: ["stat", "kpi"], query: "stats" },
    { id: "faq", label: "Listado / FAQ", expects: "List / Accordion", match: ["list", "accordion", "faq"], query: "accordion" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  landing: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header", "menu", "navigation"], query: "navbar" },
    { id: "hero", label: "Hero", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "cta", label: "CTA", expects: "Botones", match: ["button", "btn"], query: "button" },
    { id: "features", label: "Features", expects: "Cards", match: ["card"], query: "feature card" },
    { id: "social", label: "Prueba social", expects: "Stats / Logos", match: ["stat", "kpi", "logo"], query: "stats" },
    { id: "faq", label: "FAQ", expects: "List / Accordion", match: ["list", "accordion", "faq"], query: "accordion" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  portfolio: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header", "menu", "navigation"], query: "navbar" },
    { id: "hero", label: "Hero", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "stats", label: "Métricas", expects: "Stats / KPIs", match: ["stat", "kpi"], query: "stats" },
    { id: "projects", label: "Proyectos", expects: "Cards", match: ["card"], query: "project card" },
    { id: "skills", label: "Skills / Tags", expects: "Badges / List", match: ["badge", "chip", "tag", "list"], query: "badge" },
    { id: "contact", label: "Contacto", expects: "Form / Inputs", match: ["form", "input"], query: "contact form" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  dashboard: [
    { id: "shell", label: "Sidebar / Nav", expects: "Navbar / Sidebar", match: ["nav", "sidebar", "header", "menu", "navigation"], query: "menu" },
    { id: "kpis", label: "KPIs", expects: "Stats / KPIs", match: ["stat", "kpi"], query: "stats" },
    { id: "filters", label: "Filtros", expects: "Inputs / Chips", match: ["filter", "input", "select", "chip"], query: "filters" },
    { id: "table", label: "Tabla", expects: "Table / List", match: ["table", "list"], query: "table" },
    { id: "side", label: "Panel lateral", expects: "Cards (opcional)", match: ["card"], query: "card" },
  ],
  auth: [
    { id: "form", label: "Formulario", expects: "Inputs / Form", match: ["input", "form"], query: "login form" },
    { id: "oauth", label: "Proveedores", expects: "Botones OAuth", match: ["button", "btn", "oauth", "social"], query: "oauth button" },
    { id: "footer", label: "Footer", expects: "Footer (opcional)", match: ["footer"], query: "footer" },
  ],
  form: [
    { id: "header", label: "Cabecera", expects: "Estructural (auto)", match: [], query: "form header" },
    { id: "fields", label: "Campos", expects: "Inputs / Selects", match: ["input", "form", "textarea", "select"], query: "input" },
    { id: "validation", label: "Validación", expects: "Estructural (auto)", match: [], query: "validation" },
    { id: "actions", label: "Acciones", expects: "Botones", match: ["button", "btn"], query: "button" },
    { id: "success", label: "Estado de éxito", expects: "Toast / Alert", match: ["toast", "alert"], query: "toast" },
  ],
  content: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header", "menu", "navigation"], query: "navbar" },
    { id: "hero", label: "Portada", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "articles", label: "Artículos", expects: "Cards / List", match: ["card", "list"], query: "article card" },
    { id: "aside", label: "Aside", expects: "Cards (opcional)", match: ["card"], query: "card" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  commerce: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header", "menu", "navigation"], query: "navbar" },
    { id: "hero", label: "Portada", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "catalog", label: "Catálogo", expects: "Cards / Grid", match: ["card"], query: "product card" },
    { id: "filters", label: "Filtros", expects: "Inputs / Chips", match: ["filter", "input", "select", "chip"], query: "filters" },
    { id: "cart", label: "Carrito", expects: "Sheet / Modal", match: ["sheet", "modal", "drawer"], query: "cart drawer", render: "triggered" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  settings: [
    { id: "nav", label: "Navegación", expects: "Sidebar / Tabs", match: ["nav", "sidebar", "tab", "menu", "navigation"], query: "settings nav" },
    { id: "sections", label: "Secciones", expects: "List / Cards", match: ["list", "card"], query: "settings list" },
    { id: "fields", label: "Campos", expects: "Inputs / Toggles", match: ["input", "form", "select", "switch", "toggle"], query: "input" },
    { id: "danger", label: "Zona peligrosa", expects: "Alert (opcional)", match: ["alert", "error"], query: "danger alert" },
  ],
  mobile: [
    { id: "nav", label: "Nav inferior", expects: "Tab bar / Nav", match: ["nav", "tab", "bottom", "menu"], query: "mobile nav" },
    { id: "cards", label: "Tarjetas", expects: "Cards", match: ["card"], query: "card" },
    { id: "list", label: "Lista", expects: "List", match: ["list"], query: "list" },
    { id: "sheet", label: "Bottom sheet", expects: "Sheet / Modal", match: ["sheet", "modal", "drawer"], query: "bottom sheet", render: "triggered" },
  ],
  states: [
    { id: "empty", label: "Vacío", expects: "Estructural (auto)", match: [], query: "empty state" },
    { id: "loading", label: "Cargando", expects: "Loader / Skeleton", match: ["loader", "spinner", "skeleton"], query: "loader" },
    { id: "error", label: "Error", expects: "Alert (opcional)", match: ["alert", "error"], query: "alert" },
    { id: "success", label: "Éxito", expects: "Toast / Alert", match: ["toast", "alert"], query: "toast" },
  ],
};

/** Forma mínima que necesitan los helpers de un componente añadido a la marca. */
export interface SlotSample {
  id: string;
  category?: string;
}

/** ¿Una categoría de catálogo encaja en este slot? */
export function categoryMatchesSlot(slot: SceneSlot, category?: string): boolean {
  if (slot.match.length === 0) return false; // estructural: no lo llena el catálogo
  const c = (category ?? "").toLowerCase();
  return slot.match.some((m) => c.includes(m));
}

/** ¿Hay al menos un componente añadido que encaje en este slot? */
export function slotFilled(slot: SceneSlot, samples: SlotSample[]): boolean {
  return samples.some((s) => categoryMatchesSlot(slot, s.category));
}

/* NOTA de arquitectura: los componentes pertenecen a la MARCA (samples/previewIds =
   biblioteca única). Las escenas NO poseen componentes: guardan asignaciones por slot en
   blueprint.slots[scene][slotId]=componentId (referencias, sin duplicar). La compatibilidad
   la define slot.match; el fallback por categoría solo rellena slots compatibles y se marca
   como auto. componentUsage() da la trazabilidad escena↔slot de cada componente. */

/** Componentes añadidos que encajan en este slot concreto. */
export function samplesForSlot<T extends SlotSample>(slot: SceneSlot, samples: T[]): T[] {
  return samples.filter((s) => categoryMatchesSlot(slot, s.category));
}

/**
 * Estado de una zona:
 * - assigned   → hay un componente fijado explícitamente (y presente).
 * - auto       → sin fijar, pero relleno inteligente por categoría (arranque).
 * - empty      → sin fijar y sin nada compatible: hueco real con placeholder.
 * - structural → lo resuelve el layout/los defaults (no se llena con catálogo).
 */
export type SlotState = "assigned" | "auto" | "empty" | "structural";

export function slotStateOf(slot: SceneSlot, assignedId: string | undefined, samples: SlotSample[]): SlotState {
  if (assignedId && samples.some((s) => s.id === assignedId)) return "assigned";
  if (slot.match.length === 0) return "structural";
  return slotFilled(slot, samples) ? "auto" : "empty";
}

/** Dónde está asignado (fijado) un componente concreto, a través de todas las escenas. */
export interface SlotUsage { scene: SceneId; slotId: string; slotLabel: string }
export function componentUsage(
  componentId: string,
  allSlots: Partial<Record<SceneId, Record<string, string>>>,
): SlotUsage[] {
  const out: SlotUsage[] = [];
  for (const scene of Object.keys(allSlots) as SceneId[]) {
    const map = allSlots[scene];
    if (!map) continue;
    for (const [slotId, compId] of Object.entries(map)) {
      if (compId === componentId) {
        const def = (SCENE_SLOTS[scene] ?? []).find((s) => s.id === slotId);
        out.push({ scene, slotId, slotLabel: def?.label ?? slotId });
      }
    }
  }
  return out;
}

export interface SceneSlotStats { assigned: number; auto: number; empty: number; buildable: number }

/** Recuento fijado/auto/vacío de una escena (buildable = slots que acepta catálogo). */
export function sceneSlotStats(scene: SceneId, slotsMap: Record<string, string> | undefined, samples: SlotSample[]): SceneSlotStats {
  const defs = SCENE_SLOTS[scene] ?? [];
  let assigned = 0, auto = 0, empty = 0, buildable = 0;
  for (const slot of defs) {
    if (slot.match.length > 0) buildable++;
    const st = slotStateOf(slot, slotsMap?.[slot.id], samples);
    if (st === "assigned") assigned++;
    else if (st === "auto") auto++;
    else if (st === "empty") empty++;
  }
  return { assigned, auto, empty, buildable };
}

/* Recuento sobre una lista de defs YA resuelta (base + dinámicos). */
export function statsFromDefs(defs: SceneSlot[], slotsMap: Record<string, string> | undefined, samples: SlotSample[]): SceneSlotStats {
  let assigned = 0, auto = 0, empty = 0, buildable = 0;
  for (const slot of defs) {
    if (slot.match.length > 0) buildable++;
    const st = slotStateOf(slot, slotsMap?.[slot.id], samples);
    if (st === "assigned") assigned++;
    else if (st === "auto") auto++;
    else if (st === "empty") empty++;
  }
  return { assigned, auto, empty, buildable };
}

/* ============================================================================
   SLOTS DINÁMICOS por resolvedConfig.
   Una zona asignable puede EXISTIR solo cuando la marca activa cierta capacidad
   (wizard, command-palette, búsqueda…). Fuente única: SCENE_SLOTS (base) +
   DYNAMIC_SLOTS (condicionales). Las asignaciones se guardan por el MISMO
   mecanismo (blueprint.slots[scene][slotId]) y sobreviven a que la capacidad se
   apague: el slot desaparece del lienzo pero su asignación queda "pendiente".
   ============================================================================ */

/** Subconjunto del resolvedConfig que decide la TOPOLOGÍA de slots (no el render). */
export interface SlotFlags {
  multiStep?: boolean;
  hasSearch?: boolean;
  isPalette?: boolean;
  hasFilters?: boolean;
  filtersMode?: string; // "inline" | "drawer" | "none"
}

interface DynDef { slot: SceneSlot; when: (f: SlotFlags) => boolean }

const PALETTE_SLOT: SceneSlot = {
  id: "command", label: "Command palette", expects: "⌘K / Command",
  match: ["command", "palette", "cmdk"], query: "command palette", render: "triggered", dyn: true,
};

const DYNAMIC_SLOTS: Partial<Record<SceneId, DynDef[]>> = {
  form: [
    { slot: { id: "stepper", label: "Pasos / Wizard", expects: "Stepper / Progress", match: ["step", "wizard", "stepper", "progress"], query: "stepper", dyn: true }, when: (f) => !!f.multiStep },
  ],
  dashboard: [
    { slot: PALETTE_SLOT, when: (f) => !!f.isPalette },
    { slot: { id: "search", label: "Búsqueda", expects: "Search input", match: ["search", "input"], query: "search input", dyn: true }, when: (f) => !!f.hasSearch && !f.isPalette },
  ],
  marca: [
    { slot: PALETTE_SLOT, when: (f) => !!f.isPalette },
  ],
};

/** Slots dinámicos ACTIVOS ahora mismo para la escena. */
export function dynamicSlotsFor(scene: SceneId, f: SlotFlags): SceneSlot[] {
  return (DYNAMIC_SLOTS[scene] ?? []).filter((d) => d.when(f)).map((d) => d.slot);
}

/** Def de un slot dinámico por id, esté activo o no (para render de pendientes). */
export function dynamicSlotDef(scene: SceneId, id: string): SceneSlot | undefined {
  return (DYNAMIC_SLOTS[scene] ?? []).find((d) => d.slot.id === id)?.slot;
}

/** Todas las zonas de la escena AHORA: base + dinámicos activos. Fuente única para preview y builder. */
export function sceneSlotsResolved(scene: SceneId, f: SlotFlags): SceneSlot[] {
  return [...(SCENE_SLOTS[scene] ?? []), ...dynamicSlotsFor(scene, f)];
}

/** Ids conocidos de la escena: base + TODOS los dinámicos (activos o no). Un id
 *  fuera de este conjunto es un huérfano real (p.ej. slot renombrado). */
export function allSlotIdsFor(scene: SceneId): string[] {
  const base = (SCENE_SLOTS[scene] ?? []).map((s) => s.id);
  const dyn = (DYNAMIC_SLOTS[scene] ?? []).map((d) => d.slot.id);
  return [...base, ...dyn];
}

/* ============================================================================
   LIBERTAD TOPOLÓGICA & SECCIONES DINÁMICAS (SceneBlockInstance)
   Permite que cualquier escena tenga una secuencia libre de secciones ordenables,
   duplicables, insertables y con enlaces/rutas interactivas entre páginas.
   ============================================================================ */

export type LinkTarget =
  | {
      kind: "scene";
      sceneId: string; // Clave de escena o ID canónico ("auth", "commerce")
      hash?: string;   // Salto opcional dentro de la escena ("#pricing")
    }
  | {
      kind: "route";
      routeId: string;
      path: string;    // Ruta explícita ("/auth/login", "/checkout")
    }
  | {
      kind: "url";
      href: string;    // URL externa ("https://github.com/...")
      newTab?: boolean;
    }
  | {
      kind: "anchor";
      blockId: string; // Salto a un bloque en la misma página
    }
  | {
      kind: "none";
    };

export interface BlockActionBinding {
  actionId: string;    // "primary", "secondary", "cta", "login", "register", "docs"
  label?: string;      // "Botón principal", "Crear cuenta", "Ver precios"
  target: LinkTarget;
}

export type RuntimeMode = "design" | "interaction" | "data" | "a11y" | "production";

export type DataStateMode = "success" | "loading" | "empty" | "error" | "forbidden";

export type PrecisionViewport = "fluid" | "desktop" | "laptop" | "tablet" | "mobile" | "mobile_s";

export interface ViewportSpec {
  id: PrecisionViewport;
  width: number;
  height: number;
  label: string;
  badge: string;
  breakpoint: "xl" | "lg" | "md" | "sm" | "xs";
}

export const PRECISION_VIEWPORTS: Record<PrecisionViewport, ViewportSpec> = {
  fluid: { id: "fluid", width: 0, height: 0, label: "Fluido", badge: "100% Ancho Total", breakpoint: "xl" },
  desktop: { id: "desktop", width: 1440, height: 900, label: "Escritorio", badge: "1440 × 900 px · Desktop", breakpoint: "xl" },
  laptop: { id: "laptop", width: 1280, height: 800, label: "Portátil", badge: "1280 × 800 px · Laptop", breakpoint: "lg" },
  tablet: { id: "tablet", width: 768, height: 1024, label: "Tablet", badge: "768 × 1024 px · iPad / Tablet", breakpoint: "md" },
  mobile: { id: "mobile", width: 390, height: 844, label: "Móvil", badge: "390 × 844 px · iPhone 14", breakpoint: "sm" },
  mobile_s: { id: "mobile_s", width: 360, height: 800, label: "Móvil S", badge: "360 × 800 px · Compact", breakpoint: "xs" },
};

export interface PageRoute {
  path: string;
  sceneId: SceneId;
  title: string;
  icon?: string;
  isDynamic?: boolean;
  parentPath?: string;
  description?: string;
}

export const CANONICAL_PROJECT_ROUTES: PageRoute[] = [
  { path: "/", sceneId: "landing", title: "Inicio (Landing)", icon: "home", description: "Página de inicio y conversión" },
  { path: "/portfolio", sceneId: "portfolio", title: "Portfolio", icon: "briefcase", description: "Presentación de proyectos y skills" },
  { path: "/projects/[slug]", sceneId: "content", title: "Detalle de Proyecto", icon: "file-text", isDynamic: true, parentPath: "/portfolio", description: "Ficha individual de proyecto (OposApp, Rutas)" },
  { path: "/auth", sceneId: "auth", title: "Iniciar Sesión / Registro", icon: "key", description: "Acceso y autenticación" },
  { path: "/dashboard", sceneId: "dashboard", title: "Panel Principal", icon: "grid", description: "Panel de control y KPIs" },
  { path: "/tienda", sceneId: "commerce", title: "Tienda / Catálogo", icon: "shopping-bag", description: "Productos y checkout" },
  { path: "/formulario", sceneId: "form", title: "Contacto / Formulario", icon: "mail", description: "Captación y validación" },
  { path: "/blog", sceneId: "content", title: "Blog / Artículos", icon: "book-open", description: "Publicaciones y contenido" },
];

export interface CollectionBinding {
  source: "portfolio-projects" | "posts" | "features" | "testimonials" | "pricing" | "team" | "custom";
  collectionId?: string;
  filter?: {
    kind?: string;
    featuredOnly?: boolean;
    limit?: number;
    tags?: string[];
    sortBy?: "recent" | "featured" | "title" | "order";
  };
  layout?: "grid" | "list" | "bento" | "detail";
  fallbackComponentId?: string;
  fieldMapping?: {
    title?: string;
    description?: string;
    image?: string;
    cta?: string;
    category?: string;
  };
}

export interface SceneBlockInstance {
  id: string;                     // ID único de la sección (ej. "nav", "cards", "custom_172901...")
  type: string;                   // Tipo de slot base ("nav", "hero", "cards", "stats", "faq", "footer", "cta", "custom")
  label: string;                  // Nombre visible
  componentId?: string;           // ID del componente asignado en SQLite
  customHtml?: string;            // HTML con modificaciones (opcional)
  order: number;                  // Posición canónica en la secuencia (0, 1, 2...)
  // Vinculación CMS con colecciones dinámicas de datos:
  dataBinding?: CollectionBinding;
  // Retrocompatibilidad con datos existentes:
  linkToScene?: string;
  // Acciones y enlaces granulares por elemento interactivo:
  actionBindings?: Record<string, BlockActionBinding>;
  props?: Record<string, unknown>;
  visibility?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  styleConfig?: {
    background?: "transparent" | "surface" | "deep" | "glass" | "glow" | "gradient";
    radius?: "none" | "lg" | "2xl" | "3xl";
    border?: "none" | "subtle" | "accent" | "dashed";
    shadow?: "none" | "subtle" | "elevated" | "glow";
    accentTone?: string;
    animation?: "none" | "fade-up" | "fade-in" | "slide-left" | "scale-up";
    bgOpacity?: number; // 0-100
    textColor?: string; // override color
    divider?: "none" | "line" | "gradient" | "dots";
  };
  a11y?: {
    ariaLabel?: string;
    role?: "main" | "section" | "aside" | "nav" | "footer" | "complementary" | "banner";
    skipLinkId?: string;
  };
  advancedConfig?: {
    customCss?: string;
    anchorId?: string;
    cssClass?: string;
    notes?: string;
  };
  dataMode?: "static" | "mock" | "dynamic";
  isDemoData?: boolean;
  incompatibleNotice?: string;
  stateOverride?: "default" | "loading" | "empty" | "error";
  layoutConfig?: {
    maxWidth?: string;
    padding?: string;
    gap?: "tight" | "normal" | "relaxed";
    columns?: 1 | 2 | 3 | 4;
    sticky?: boolean;
  };
}

export interface ProjectDocument {
  projectId: string;
  projectName: string;
  brandId: string;
  activeRoute: string;
  activeSceneId: SceneId;
  theme: "dark" | "light";
  viewport: PrecisionViewport;
  runtimeMode: RuntimeMode;
  dataState: {
    mode: DataStateMode;
    recordCount: number;
    source: "mock" | "seed" | "custom";
  };
  userRole: "public" | "authenticated" | "admin";
  blocks: SceneBlockInstance[];
  selectedBlockId: string | null;
}

export interface BlockIncompatibilityResult {
  isIncompatible: boolean;
  reason?: string;
  severity: DiagnosticSeverity;
  diagnostic?: ProjectDiagnostic;
  suggestedActions: SuggestedAction[];
  suppressible: boolean;
}

/** Detecta si un bloque contiene contenido ajeno y emite diagnóstico estructurado info/warning/error */
export function detectBlockIncompatibilities(scene: SceneId, block: SceneBlockInstance): BlockIncompatibilityResult {
  const t = block.type.toLowerCase();
  const lbl = block.label.toLowerCase();
  const route = routeForScene(scene);

  if (scene === "portfolio") {
    if (t.includes("stat") || t.includes("kpi") || lbl.includes("métrica") || lbl.includes("balance") || lbl.includes("sales") || lbl.includes("trusted")) {
      const diag: ProjectDiagnostic = {
        id: `diag_${block.id}_stat_portfolio`,
        ruleId: "portfolio.metrics.composition",
        severity: "info",
        nodeId: block.id,
        nodeLabel: block.label,
        routeId: route,
        title: "Composición de Métricas en Portfolio",
        explanation: "Bloque de métricas detectado. Puede ser intencional (ej. +12 proyectos, 4 años de experiencia) o requerir adaptación.",
        suggestedActions: [
          {
            id: "act_adapt",
            label: "Adaptar a proyectos (+12 proyectos, 4 años exp)",
            actionKind: "adapt_content",
            payload: { blockId: block.id },
          },
          {
            id: "act_suppress",
            label: "Marcar como válido (métricas de experiencia)",
            actionKind: "suppress",
            payload: { blockId: block.id },
          },
        ],
        suppressible: true,
        suppressionReason: block.incompatibleNotice?.includes("válido") ? block.incompatibleNotice : undefined,
      };
      return {
        isIncompatible: !diag.suppressionReason,
        reason: diag.explanation,
        severity: "info",
        diagnostic: diag,
        suggestedActions: diag.suggestedActions,
        suppressible: true,
      };
    }
  }

  if (scene === "auth") {
    if (t.includes("card") || t.includes("grid") || t.includes("commerce") || t.includes("table")) {
      const diag: ProjectDiagnostic = {
        id: `diag_${block.id}_auth_complex`,
        ruleId: "auth.layout.leakage",
        severity: "warning",
        nodeId: block.id,
        nodeLabel: block.label,
        routeId: route,
        title: "Bloque complejo en flujo de Login",
        explanation: "Bloque de catálogo o tabla dentro de flujo de autenticación, lo que puede distraer de la conversión de login.",
        suggestedActions: [
          {
            id: "act_remove",
            label: "Eliminar de Login",
            actionKind: "remove",
            payload: { blockId: block.id },
          },
        ],
        suppressible: true,
      };
      return {
        isIncompatible: true,
        reason: diag.explanation,
        severity: "warning",
        diagnostic: diag,
        suggestedActions: diag.suggestedActions,
        suppressible: true,
      };
    }
  }

  return {
    isIncompatible: false,
    severity: "info",
    suggestedActions: [],
    suppressible: false,
  };
}

/** Genera la ruta de migajas de pan (breadcrumb) jerárquica para un bloque */
export function resolveBlockBreadcrumb(scene: SceneId, blockId: string | null, blocks: SceneBlockInstance[]): string[] {
  const route = routeForScene(scene);
  const sceneName = SCENE_LABEL[scene] || scene;
  if (!blockId) return [`Ruta: ${route}`, sceneName];
  
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return [`Ruta: ${route}`, sceneName, blockId];

  const primaryAction = block.actionBindings?.["primary"];
  const actionHint = primaryAction ? `CTA ↗ ${primaryAction.label || primaryAction.actionId}` : undefined;

  return [
    `Ruta: ${route}`,
    sceneName,
    `${block.label} (#${block.order + 1})`,
    ...(actionHint ? [actionHint] : [])
  ];
}

/** Normaliza y resuelve las acciones de un bloque con retrocompatibilidad absoluta */
export function resolveBlockActions(block: SceneBlockInstance): Record<string, BlockActionBinding> {
  const bindings: Record<string, BlockActionBinding> = { ...(block.actionBindings ?? {}) };
  // Si no tiene "primary" pero tiene linkToScene legado, se sintetiza de forma transparente
  if (!bindings["primary"] && block.linkToScene) {
    bindings["primary"] = {
      actionId: "primary",
      label: "Acción principal",
      target: {
        kind: "scene",
        sceneId: block.linkToScene,
      },
    };
  }
  return bindings;
}

/** Resuelve la lista ordenada de bloques de una escena, combinando layouts persistidos y slots predeterminados */
export function resolveSceneLayout(
  scene: SceneId,
  savedLayouts?: Record<string, SceneBlockInstance[]>,
  slotsMap?: Record<string, string>,
  flags?: SlotFlags,
  componentProps?: Record<string, Record<string, unknown>>,
): SceneBlockInstance[] {
  const saved = savedLayouts?.[scene];
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved.map((b, idx) => {
      const compId = b.componentId || slotsMap?.[b.id];
      const masterProps = compId ? componentProps?.[compId] : undefined;
      return {
        ...b,
        order: idx,
        componentId: compId,
        props: masterProps ? { ...(b.props || {}), ...(masterProps || {}) } : b.props,
        actionBindings: resolveBlockActions(b),
      };
    });
  }

  // Fallback: Sintetizar el layout a partir de las definiciones base de la escena
  const defs = sceneSlotsResolved(scene, flags ?? {});
  return defs.map((d, idx) => {
    const compId = slotsMap?.[d.id];
    const masterProps = compId ? componentProps?.[compId] : undefined;
    return {
      id: d.id,
      type: d.id,
      label: d.label,
      componentId: compId,
      props: masterProps ? { ...masterProps } : undefined,
      order: idx,
    };
  });
}

/** Reordena un bloque en la secuencia (arriba/abajo o posición libre) */
export function reorderSceneBlocks(
  blocks: SceneBlockInstance[],
  fromIndex: number,
  toIndex: number,
): SceneBlockInstance[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) {
    return blocks;
  }
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((b, idx) => ({ ...b, order: idx }));
}

/** Duplica un bloque de sección inmediatamente después del original */
export function duplicateSceneBlock(
  blocks: SceneBlockInstance[],
  blockId: string,
): SceneBlockInstance[] {
  const at = blocks.findIndex((b) => b.id === blockId);
  if (at === -1) return blocks;
  const orig = blocks[at];
  const newId = `${orig.type}_${Date.now().toString(36)}`;
  const clone: SceneBlockInstance = {
    ...orig,
    id: newId,
    label: orig.type === "nav" ? `${orig.label} (Barra secundaria)` : orig.type === "footer" ? `${orig.label} (Sub-footer)` : `${orig.label} (Instancia adicional)`,
    order: at + 1,
    actionBindings: orig.actionBindings ? JSON.parse(JSON.stringify(orig.actionBindings)) : undefined,
    props: orig.props ? JSON.parse(JSON.stringify(orig.props)) : undefined,
  };
  const next = [...blocks];
  next.splice(at + 1, 0, clone);
  return next.map((b, idx) => ({ ...b, order: idx }));
}

/** Inserta un nuevo bloque en cualquier posición */
export function insertSceneBlock(
  blocks: SceneBlockInstance[],
  newBlock: Omit<SceneBlockInstance, "order">,
  atIndex?: number,
): SceneBlockInstance[] {
  const next = [...blocks];
  const targetIdx = typeof atIndex === "number" && atIndex >= 0 && atIndex <= blocks.length ? atIndex : blocks.length;
  const blockWithOrder: SceneBlockInstance = {
    ...newBlock,
    order: targetIdx,
    actionBindings: newBlock.actionBindings ? { ...newBlock.actionBindings } : undefined,
  };
  next.splice(targetIdx, 0, blockWithOrder);
  return next.map((b, idx) => ({ ...b, order: idx }));
}

/** Elimina un bloque de la escena */
export function removeSceneBlock(
  blocks: SceneBlockInstance[],
  blockId: string,
): SceneBlockInstance[] {
  const filtered = blocks.filter((b) => b.id !== blockId);
  return filtered.map((b, idx) => ({ ...b, order: idx }));
}

/** Actualiza o añade una acción específica de un bloque */
export function updateSceneBlockAction(
  blocks: SceneBlockInstance[],
  blockId: string,
  actionId: string,
  target: LinkTarget,
  label?: string,
): SceneBlockInstance[] {
  return blocks.map((b) => {
    if (b.id !== blockId) return b;
    const currentActions = resolveBlockActions(b);
    if (target.kind === "none") {
      delete currentActions[actionId];
    } else {
      currentActions[actionId] = {
        actionId,
        label: label || currentActions[actionId]?.label || (actionId === "primary" ? "Acción principal" : actionId === "secondary" ? "Acción secundaria" : actionId),
        target,
      };
    }
    // Sincronizar linkToScene para mantener compatibilidad con cualquier lectura de datos legada
    const primaryTarget = currentActions["primary"]?.target;
    const legacyLink = primaryTarget && primaryTarget.kind === "scene" ? primaryTarget.sceneId : undefined;

    return {
      ...b,
      actionBindings: currentActions,
      linkToScene: legacyLink,
    };
  });
}

/** Elimina una acción de un bloque */
export function removeSceneBlockAction(
  blocks: SceneBlockInstance[],
  blockId: string,
  actionId: string,
): SceneBlockInstance[] {
  return updateSceneBlockAction(blocks, blockId, actionId, { kind: "none" });
}

/** Actualiza el destino de enlace principal de un bloque (retrocompatibilidad) */
export function updateSceneBlockLink(
  blocks: SceneBlockInstance[],
  blockId: string,
  linkToScene?: string,
): SceneBlockInstance[] {
  const target: LinkTarget = linkToScene ? { kind: "scene", sceneId: linkToScene } : { kind: "none" };
  return updateSceneBlockAction(blocks, blockId, "primary", target);
}
