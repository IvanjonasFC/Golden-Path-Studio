/* ============================================================================
   seedEditor — PUENTE modelo → UI editable.

   El análisis (importBrand) rellena `blueprint.views[]` con señales derivadas
   (datos/interacción/secciones) y algunos campos editables. Pero muchas pestañas
   del editor (Estructura/Datos/Interacción) quedan "CON DEFAULTS" porque nadie
   vuelca esas señales a los CONTROLES editables (`blueprint.architecture/data/
   interaction`). Este módulo hace ese volcado.

   Principios (acordados):
   · NO destructivo: solo escribe un campo si está VACÍO. Nunca machaca lo que el
     usuario (o una inferencia previa) ya puso. Reaplicar es idempotente.
   · HONESTO: no inventa. El árbol se siembra desde las RUTAS reales detectadas
     (o, si hay patrón de arquitectura con evidencia, desde su plantilla). Si no
     hay evidencia, no se fuerza nada.
   · TRAZABLE: cada valor autoaplicado se registra en `blueprint.seeded[path]`
     con su confianza y fuente, y se devuelve la lista `applied` para la UI.

   Módulo PURO (sin DOM, sin red): entra un Blueprint, sale un Blueprint nuevo.
   ============================================================================ */
import { TREE_TEMPLATES, type Blueprint, type ProjectView, type TreeNode, type FieldProvenance } from "./blueprint";

export type SeedConfidence = "strong" | "weak" | "default";
export interface AppliedSeed { path: string; value: unknown; confidence: SeedConfidence; source: string }
export interface SeedResult { bp: Blueprint; applied: AppliedSeed[] }

/* ¿un valor cuenta como "puesto"? (mismo criterio que resolve.ts) */
function present(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true; // boolean/number definidos
}

/* --- agregación de señales de todas las vistas --------------------------- */
interface Signals {
  data: Map<string, SeedConfidence>;         // kind -> confianza máxima
  interaction: Map<string, SeedConfidence>;
  sections: Set<string>;
  anyDynamic: boolean;
}
function strongest(a: SeedConfidence | undefined, b: SeedConfidence): SeedConfidence {
  if (a === "strong" || b === "strong") return "strong";
  if (a === "weak" || b === "weak") return "weak";
  return "default";
}
function collectSignals(views: ProjectView[]): Signals {
  const data = new Map<string, SeedConfidence>();
  const interaction = new Map<string, SeedConfidence>();
  const sections = new Set<string>();
  let anyDynamic = false;
  for (const v of views) {
    if (v.dynamic) anyDynamic = true;
    for (const s of v.data ?? []) data.set(s.kind, strongest(data.get(s.kind), s.confidence));
    for (const s of v.interaction ?? []) interaction.set(s.kind, strongest(interaction.get(s.kind), s.confidence));
    for (const b of v.sections ?? []) sections.add(b.kind);
  }
  return { data, interaction, sections, anyDynamic };
}

/* --- árbol desde rutas reales (honesto: refleja las vistas detectadas) ----
   Convierte rutas ("/", "/gracias", "/proyectos/[slug]") en un árbol de páginas
   bajo la raíz del router dominante (Astro → src/pages, Next app → app, etc.). */
function rootForRouter(views: ProjectView[]): { root: string; leaf: (last: boolean) => TreeNode["type"] } {
  const src = views.map((v) => v.source || "").join(" ").toLowerCase();
  if (/astro/.test(src)) return { root: "src/pages", leaf: () => "file" };
  if (/\bpages\b/.test(src)) return { root: "pages", leaf: () => "file" };
  return { root: "app", leaf: () => "file" };   // Next app router y por defecto
}
function insertRoute(children: TreeNode[], segs: string[], leafType: TreeNode["type"], router: string): void {
  if (segs.length === 0) {
    const name = router === "app" ? "page.tsx" : "index";
    if (!children.some((c) => c.name === name)) children.push({ name, type: "file" });
    return;
  }
  const [head, ...rest] = segs;
  if (rest.length === 0) {
    if (router === "app") {
      let dir = children.find((c) => c.name === head && c.type === "folder");
      if (!dir) { dir = { name: head, type: "folder", children: [] }; children.push(dir); }
      if (!(dir.children ?? []).some((c) => c.name === "page.tsx")) (dir.children ??= []).push({ name: "page.tsx", type: "file" });
    } else if (!children.some((c) => c.name === head)) {
      children.push({ name: head, type: leafType });
    }
    return;
  }
  let dir = children.find((c) => c.name === head && c.type === "folder");
  if (!dir) { dir = { name: head, type: "folder", children: [] }; children.push(dir); }
  dir.children ??= [];
  insertRoute(dir.children, rest, leafType, router);
}
function treeFromViews(views: ProjectView[]): TreeNode[] | null {
  const routes = views.map((v) => v.route).filter((r) => r && r !== "/");
  // Solo merece la pena si hay rutas reales (más allá de "/").
  if (routes.length === 0) return null;
  const { root, leaf } = rootForRouter(views);
  const router = root === "app" ? "app" : root;
  const pages: TreeNode[] = [];
  for (const v of views) {
    const segs = v.route.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    insertRoute(pages, segs, leaf(true), router);
  }
  return [{ name: root, type: "folder", children: pages }];
}

/* --- mapeos señal → control editable ------------------------------------- */
function pickFormPreset(projectType: string, hasMultiStep: boolean): string {
  if (hasMultiStep) return "multi-step";
  if (projectType === "auth-app") return "auth-form";
  if (projectType === "dashboard" || projectType === "crud") return "dashboard-form";
  return "simple";
}
function pickNavPattern(projectType: string): string {
  switch (projectType) {
    case "dashboard": case "crud": case "desktop": case "commerce": return "app-shell";
    case "mobile": return "tabbed";
    case "portfolio": case "marketing": case "content": case "docs": case "static": return "landing";
    default: return "dashboard";
  }
}

/**
 * Vuelca las señales del análisis a los controles editables del blueprint.
 * No destructivo (solo rellena vacíos) y trazable (`bp.seeded` + `applied`).
 */
export function seedEditableFromBlueprint(input: Blueprint): SeedResult {
  const bp: Blueprint = structuredClone(input);
  const applied: AppliedSeed[] = [];
  // Procedencia unificada por campo (clave = convención de resolve: structure.*/
  // data.*/interaction.*). Se preserva la existente y se añade lo nuevo.
  const prov: Record<string, FieldProvenance> = { ...((bp as { provenance?: Record<string, FieldProvenance> }).provenance ?? {}) };
  const toProvKey = (path: string) => path.startsWith("architecture.") ? "structure." + path.slice("architecture.".length) : path;

  const projectType = String((bp as { projectType?: string }).projectType ?? "static");
  const views = bp.views ?? [];
  const sig = collectSignals(views);

  // put: escribe SOLO si el destino está vacío. Marca la procedencia como "seeded".
  const put = (obj: Record<string, unknown>, key: string, path: string, value: unknown, confidence: SeedConfidence, source: string) => {
    if (present(obj[key])) return;             // no destructivo
    obj[key] = value;
    prov[toProvKey(path)] = { origin: "seeded", value, confidence, source };
    applied.push({ path, value, confidence, source });
  };
  const has = (m: Map<string, SeedConfidence>, k: string) => m.has(k);
  const conf = (m: Map<string, SeedConfidence>, k: string): SeedConfidence => m.get(k) ?? "weak";

  // Pre-pass DETECTADO: los campos editables YA presentes antes de sembrar vienen
  // de la inferencia del análisis (o de una carga previa). Se marcan "detected"
  // salvo que ya tengan procedencia (manual/seeded previa). Debe ir ANTES de sembrar.
  const EDITABLE: Record<"interaction" | "structure" | "data", string[]> = {
    interaction: ["navigationPattern", "motionPreset", "loadingPattern", "routeTransitions", "backConfirmUnsaved", "backSaveDraft", "feedbackInlineErrors", "feedbackToastSuccess", "feedbackErrorSummaryTop"],
    structure: ["pattern", "naming", "tree", "serverComponentsDefault", "defaultExport"],
    data: ["formPreset", "formValidation", "formConfirm", "tableLayout", "filters", "pagination", "search", "searchTrigger", "emptyCta", "loadingPattern", "errorPattern", "successPattern", "bulkActions", "confirmations", "mobileData"],
  };
  const fieldVal = (domain: "interaction" | "structure" | "data", key: string): unknown =>
    domain === "structure"
      ? (bp.architecture as Record<string, unknown> | undefined)?.[key]
      : (bp as unknown as Record<string, Record<string, unknown> | undefined>)[domain]?.[key];
  for (const domain of ["interaction", "structure", "data"] as const) {
    for (const key of EDITABLE[domain]) {
      const pk = `${domain}.${key}`;
      if (prov[pk]) continue;
      const v = fieldVal(domain, key);
      if (present(v)) prov[pk] = { origin: "detected", value: v, source: "análisis (inferencia)" };
    }
  }

  /* ---- Arquitectura: patrón (solo con evidencia) + árbol -------------------
     Prioridad HONESTA del árbol (lo que alimenta project/tree.json en el export):
       1. estructura REAL escaneada (architecture.detectedTree) — el esqueleto fiel;
       2. rutas detectadas (si no hubo escaneo de estructura, p. ej. analysis.json viejo);
       3. plantilla del patrón de arquitectura (último recurso, marcado débil).
     El patrón NO se inventa cuando no hay evidencia. */
  const arch = (bp.architecture ??= {});
  if (!present(arch.tree)) {
    const detected = (arch as { detectedTree?: TreeNode[] }).detectedTree;
    const fromViews = treeFromViews(views);
    if (present(detected)) {
      put(arch as Record<string, unknown>, "tree", "architecture.tree", structuredClone(detected), "strong", "estructura real del proyecto (archivos escaneados)");
    } else if (fromViews) {
      put(arch as Record<string, unknown>, "tree", "architecture.tree", fromViews, "weak", `rutas detectadas (${views.length} vista/s)`);
    } else if (present(arch.pattern) && TREE_TEMPLATES[arch.pattern as string]) {
      put(arch as Record<string, unknown>, "tree", "architecture.tree", structuredClone(TREE_TEMPLATES[arch.pattern as string]), "weak", `plantilla de arquitectura «${arch.pattern}»`);
    }
  }

  /* ---- Datos: formularios / tablas / filtros / paginación / búsqueda ------ */
  const data = (bp.data ??= {});
  const hasForm = has(sig.data, "forms") || sig.sections.has("form");
  const hasTable = has(sig.data, "tables") || sig.sections.has("table");
  const hasFilters = has(sig.data, "filters") || sig.sections.has("filters");
  const hasPagination = has(sig.data, "pagination");
  const hasSearch = has(sig.data, "search") || has(sig.interaction, "search") || has(sig.interaction, "commandPalette");
  const hasMultiStep = has(sig.interaction, "multiStep");

  if (hasForm) put(data as Record<string, unknown>, "formPreset", "data.formPreset", pickFormPreset(projectType, hasMultiStep), conf(sig.data, "forms"), "formulario detectado en vistas");
  if (hasTable) put(data as Record<string, unknown>, "tableLayout", "data.tableLayout", projectType === "mobile" ? "cards-mobile" : "dense", conf(sig.data, "tables"), "tabla de datos detectada");
  if (hasFilters) put(data as Record<string, unknown>, "filters", "data.filters", "inline", conf(sig.data, "filters"), "filtros detectados");
  if (hasPagination) put(data as Record<string, unknown>, "pagination", "data.pagination", "classic", conf(sig.data, "pagination"), "paginación detectada");
  if (hasSearch) {
    const searchVal = has(sig.interaction, "commandPalette") ? "command-palette" : hasTable ? "with-filters" : "simple";
    put(data as Record<string, unknown>, "search", "data.search", searchVal, strongest(conf(sig.data, "search"), conf(sig.interaction, "commandPalette")), "búsqueda detectada");
  }

  /* ---- Interacción: navegación / motion / carga -------------------------- */
  const inter = (bp.interaction ??= {});
  if (!present(inter.navigationPattern))
    put(inter as Record<string, unknown>, "navigationPattern", "interaction.navigationPattern", pickNavPattern(projectType), "weak", `tipo de proyecto «${projectType}»`);
  if (has(sig.interaction, "motion"))
    put(inter as Record<string, unknown>, "motionPreset", "interaction.motionPreset", "smooth", conf(sig.interaction, "motion"), "animación detectada");
  if (sig.anyDynamic || has(sig.data, "fetch") || has(sig.data, "backend"))
    put(inter as Record<string, unknown>, "loadingPattern", "interaction.loadingPattern", "skeleton", "weak", "datos servidos/backend detectados");

  if (Object.keys(prov).length) (bp as { provenance?: unknown }).provenance = prov;
  return { bp, applied };
}
