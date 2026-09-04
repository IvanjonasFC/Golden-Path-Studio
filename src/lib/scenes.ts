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

export interface SceneSlot {
  /** id estable dentro de la escena (clave de asignación en Fase 2). */
  id: string;
  /** nombre visible de la zona. */
  label: string;
  /** tipo de componente que espera, en lenguaje humano. */
  expects: string;
  /**
   * substrings de categoría del catálogo que encajan (en minúsculas). Se
   * comparan con `category.toLowerCase()` igual que hace mockDoc. Vacío =
   * slot estructural: lo resuelve el layout/los defaults, no el catálogo.
   */
  match: string[];
  /** búsqueda por defecto al pulsar "+ Añadir" en el slot. */
  query: string;
  /**
   * Modo de render en el canvas:
   * - persistent (def.) → se dibuja siempre en la escena.
   * - triggered → componente activable (sheet/modal/toast/tooltip/drawer/⌘K):
   *   se dibuja un trigger y al activarlo se abre un overlay con el componente.
   * - structural → lo resuelve el layout/los defaults (equivale a match vacío).
   */
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

/** Orden y definición de zonas por escena. */
export const SCENE_SLOTS: Record<SceneId, SceneSlot[]> = {
  marca: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header"], query: "navbar" },
    { id: "hero", label: "Hero", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "actions", label: "Acciones", expects: "Botones", match: ["button", "btn"], query: "button" },
    { id: "cards", label: "Tarjetas", expects: "Cards", match: ["card"], query: "card" },
    { id: "stats", label: "Métricas", expects: "Stats / KPIs", match: ["stat", "kpi"], query: "stats" },
    { id: "faq", label: "Listado / FAQ", expects: "List / Accordion", match: ["list", "accordion", "faq"], query: "accordion" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  landing: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header"], query: "navbar" },
    { id: "hero", label: "Hero", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "cta", label: "CTA", expects: "Botones", match: ["button", "btn"], query: "button" },
    { id: "features", label: "Features", expects: "Cards", match: ["card"], query: "feature card" },
    { id: "social", label: "Prueba social", expects: "Stats / Logos", match: ["stat", "kpi", "logo"], query: "stats" },
    { id: "faq", label: "FAQ", expects: "List / Accordion", match: ["list", "accordion", "faq"], query: "accordion" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  portfolio: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header"], query: "navbar" },
    { id: "hero", label: "Hero", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "stats", label: "Métricas", expects: "Stats / KPIs", match: ["stat", "kpi"], query: "stats" },
    { id: "projects", label: "Proyectos", expects: "Cards", match: ["card"], query: "project card" },
    { id: "skills", label: "Skills / Tags", expects: "Badges / List", match: ["badge", "chip", "tag", "list"], query: "badge" },
    { id: "contact", label: "Contacto", expects: "Form / Inputs", match: ["form", "input"], query: "contact form" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  dashboard: [
    { id: "shell", label: "Sidebar / Nav", expects: "Navbar / Sidebar", match: ["nav", "sidebar", "header"], query: "sidebar" },
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
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header"], query: "navbar" },
    { id: "hero", label: "Portada", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "articles", label: "Artículos", expects: "Cards / List", match: ["card", "list"], query: "article card" },
    { id: "aside", label: "Aside", expects: "Cards (opcional)", match: ["card"], query: "card" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  commerce: [
    { id: "nav", label: "Navegación", expects: "Navbar / Header", match: ["nav", "header"], query: "navbar" },
    { id: "hero", label: "Portada", expects: "Estructural (auto)", match: [], query: "hero" },
    { id: "catalog", label: "Catálogo", expects: "Cards / Grid", match: ["card"], query: "product card" },
    { id: "filters", label: "Filtros", expects: "Inputs / Chips", match: ["filter", "input", "select", "chip"], query: "filters" },
    { id: "cart", label: "Carrito", expects: "Sheet / Modal", match: ["sheet", "modal", "drawer"], query: "cart drawer", render: "triggered" },
    { id: "footer", label: "Footer", expects: "Footer", match: ["footer"], query: "footer" },
  ],
  settings: [
    { id: "nav", label: "Navegación", expects: "Sidebar / Tabs", match: ["nav", "sidebar", "tab"], query: "settings nav" },
    { id: "sections", label: "Secciones", expects: "List / Cards", match: ["list", "card"], query: "settings list" },
    { id: "fields", label: "Campos", expects: "Inputs / Toggles", match: ["input", "form", "select", "switch", "toggle"], query: "input" },
    { id: "danger", label: "Zona peligrosa", expects: "Alert (opcional)", match: ["alert", "error"], query: "danger alert" },
  ],
  mobile: [
    { id: "nav", label: "Nav inferior", expects: "Tab bar / Nav", match: ["nav", "tab", "bottom"], query: "mobile nav" },
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
