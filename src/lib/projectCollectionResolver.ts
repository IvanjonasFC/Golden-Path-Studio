/**
 * ============================================================================
 * PROJECT COLLECTION RESOLVER — MOTOR CANÓNICO DE DATOS CMS PARA PORTFOLIO
 * ============================================================================
 *
 * Fuente única de verdad para:
 *  1. Normalización de entidades PortfolioProject (compatibilidad y defaults)
 *  2. Filtrado por política de publicación (runtimeMode vs status vs visibility)
 *  3. Validación de rutas dinámicas (/proyectos/[slug])
 *  4. Sanitización estricta de HTML y URLs para prevenir inyecciones
 *  5. Migración de esquemas de Blueprint (schemaVersion)
 *  6. Consumo compartido por Preview (BrandEditor) y Exporters (Next.js, Astro, HTML)
 */

import type { PortfolioProject, ProjectStatus, ProjectVisibility, ProjectKind } from "./portfolioProjects";
import { INITIAL_PORTFOLIO_PROJECTS } from "./portfolioProjects";
import type { Blueprint } from "./blueprint";
import type { SceneBlockInstance, RuntimeMode } from "./scenes";

export const CURRENT_BLUEPRINT_SCHEMA_VERSION = 2;

/* ----------------------------------------------------------------------------
 * 1. SANITIZACIÓN DE DATOS (Prevención XSS en renderizado HTML dinámico)
 * ---------------------------------------------------------------------------- */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/** Sanitiza texto plano para su inserción segura en templates HTML */
export function sanitizeForHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/** Sanitiza y valida URLs para atributos href/src (solo protocolos seguros) */
export function sanitizeUrl(url: unknown, defaultUrl: string = "#"): string {
  if (!url || typeof url !== "string") return defaultUrl;
  const trimmed = url.trim();
  if (!trimmed) return defaultUrl;

  // Enlaces relativos o anclas permitidos
  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("./")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // URL inválida
  }
  return defaultUrl;
}

/* ----------------------------------------------------------------------------
 * 2. NORMALIZACIÓN DE ENTIDADES
 * ---------------------------------------------------------------------------- */

/** Garantiza que una entidad de proyecto tenga todas las propiedades requeridas */
export function normalizePortfolioProject(raw: Partial<PortfolioProject> & { id: string; title?: string }): PortfolioProject {
  const fallbackSlug = (raw.id || "proyecto").replace(/^proj_/, "").replace(/_/g, "-");
  const now = new Date().toISOString();

  return {
    id: raw.id,
    slug: raw.slug || fallbackSlug,
    title: raw.title || "Proyecto sin título",
    summary: raw.summary || "",
    content: raw.content || "",
    kind: (raw.kind as ProjectKind) || "other",
    status: (raw.status as ProjectStatus) || "draft",
    visibility: (raw.visibility as ProjectVisibility) || "public",
    role: raw.role,
    year: typeof raw.year === "number" ? raw.year : new Date().getFullYear(),
    stack: Array.isArray(raw.stack) ? raw.stack.map(String) : [],
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    coverAssetId: raw.coverAssetId,
    coverUrl: raw.cover?.url || raw.coverUrl,
    cover: raw.cover,
    galleryAssetIds: Array.isArray(raw.galleryAssetIds) ? raw.galleryAssetIds : [],
    demoUrl: raw.demoUrl,
    repositoryUrl: raw.repositoryUrl,
    websiteUrl: raw.websiteUrl,
    metrics: Array.isArray(raw.metrics)
      ? raw.metrics.map((m, i) => ({
          id: m.id || `m_${i}`,
          label: String(m.label || ""),
          value: String(m.value || ""),
          description: m.description ? String(m.description) : undefined,
          icon: m.icon ? String(m.icon) : undefined,
        }))
      : [],
    featured: Boolean(raw.featured),
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 99,
    seo: raw.seo ? { ...raw.seo } : undefined,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    publishedAt: raw.publishedAt,
  };
}

/* ----------------------------------------------------------------------------
 * 3. POLÍTICA DE PUBLICACIÓN Y FILTRADO
 * ---------------------------------------------------------------------------- */

export type RuntimeEnvironment = "editor" | "preview" | "production" | "export";

export interface PublicationPolicyOptions {
  runtimeMode?: RuntimeMode | "preview";
  environment?: RuntimeEnvironment;
  includeDrafts?: boolean;
  featuredOnly?: boolean;
  kind?: ProjectKind;
  tags?: string[];
  limit?: number;
}

/** Filtra proyectos según entorno de ejecución y política de publicación */
export function filterByPublicationPolicy(
  projects: PortfolioProject[],
  options: PublicationPolicyOptions = {},
): PortfolioProject[] {
  const {
    runtimeMode = "preview",
    environment = "preview",
    includeDrafts = false,
    featuredOnly = false,
    kind,
    tags,
    limit,
  } = options;

  const isProduction = runtimeMode === "production" || environment === "production" || environment === "export";
  const allowDrafts = includeDrafts && !isProduction;

  let list = projects.map(normalizePortfolioProject);

  // Filtro de estado
  if (isProduction || !allowDrafts) {
    list = list.filter((p) => p.status === "published" && p.visibility === "public");
  } else {
    // En editor/diseño se ven borradores pero no archivados (a menos que se especifique)
    list = list.filter((p) => p.status !== "archived");
  }

  // Filtros adicionales opcionales
  if (featuredOnly) {
    list = list.filter((p) => p.featured);
  }

  if (kind) {
    list = list.filter((p) => p.kind === kind);
  }

  if (tags && tags.length > 0) {
    const lowerTags = tags.map((t) => t.toLowerCase());
    list = list.filter((p) => p.tags.some((t) => lowerTags.includes(t.toLowerCase())));
  }

  // Orden canónico: destacados primero, luego sortOrder ascendente, luego updatedAt descendente
  list.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    const orderDiff = (a.sortOrder ?? 99) - (b.sortOrder ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (limit && limit > 0) {
    list = list.slice(0, limit);
  }

  return list;
}

/* ----------------------------------------------------------------------------
 * 4. ROUTE MATCHER ROBUSTO
 * ---------------------------------------------------------------------------- */

export interface MatchedProjectRoute {
  isProjectRoute: boolean;
  isDetail: boolean;
  isCollection: boolean;
  slug?: string;
  normalizedPath: string;
}

/** Only blocks explicitly bound to a project detail may render an entity route. */
export function isProjectDetailBlock(block: SceneBlockInstance): boolean {
  return (block.dataBinding?.source === "portfolio-projects" && block.dataBinding.layout === "detail")
    || Boolean(block.componentId?.includes("project_detail"));
}

const PROJECT_DETAIL_REGEX = /^\/proyectos\/([a-z0-9-_]+)\/?$/i;
const PROJECT_COLLECTION_REGEX = /^\/(?:portfolio|proyectos)\/?$/i;

/** Valida y machea rutas de proyectos de forma determinista y segura */
export function matchProjectRoute(pathname?: string): MatchedProjectRoute {
  if (!pathname || typeof pathname !== "string") {
    return { isProjectRoute: false, isDetail: false, isCollection: false, normalizedPath: "/" };
  }

  const cleanPath = pathname.trim().replace(/\/+/g, "/");

  // Detalle: /proyectos/:slug (excluye templates genéricos como [slug] o :slug)
  const detailMatch = cleanPath.match(PROJECT_DETAIL_REGEX);
  if (detailMatch) {
    const rawSlug = detailMatch[1];
    // Rechazar placeholders genéricos
    if (rawSlug !== "[slug]" && rawSlug !== ":slug") {
      return {
        isProjectRoute: true,
        isDetail: true,
        isCollection: false,
        slug: rawSlug.toLowerCase(),
        normalizedPath: `/proyectos/${rawSlug.toLowerCase()}`,
      };
    }
  }

  // Colección: /portfolio o /proyectos
  if (PROJECT_COLLECTION_REGEX.test(cleanPath)) {
    return {
      isProjectRoute: true,
      isDetail: false,
      isCollection: true,
      normalizedPath: "/portfolio",
    };
  }

  return {
    isProjectRoute: false,
    isDetail: false,
    isCollection: false,
    normalizedPath: cleanPath,
  };
}

/* ----------------------------------------------------------------------------
 * 5. MIGRACIÓN Y COMPATIBILIDAD DE ESQUEMA DE BLUEPRINT
 * ---------------------------------------------------------------------------- */

/** Migra y normaliza un Blueprint legacy al esquema v2 canónico */
export function migrateBlueprint(blueprint?: Blueprint | null): Blueprint {
  if (!blueprint) return { schemaVersion: CURRENT_BLUEPRINT_SCHEMA_VERSION };

  const migrated: Blueprint = {
    ...blueprint,
    schemaVersion: blueprint.schemaVersion ?? CURRENT_BLUEPRINT_SCHEMA_VERSION,
  };

  // Normalizar proyectos si existen
  if (Array.isArray(blueprint.projects)) {
    migrated.projects = blueprint.projects.map(normalizePortfolioProject);
  }

  // Asegurar dataBinding en bloques legacy que usaban comp_ivn_projects
  if (blueprint.sceneLayouts) {
    const updatedLayouts: Record<string, SceneBlockInstance[]> = {};
    for (const [sceneKey, blocks] of Object.entries(blueprint.sceneLayouts)) {
      updatedLayouts[sceneKey] = blocks.map((b) => {
        if (!b.dataBinding && (b.componentId === "comp_ivn_projects" || (b.type === "cards" && b.label.toLowerCase().includes("proyecto")))) {
          return {
            ...b,
            dataBinding: {
              source: "portfolio-projects",
              layout: "grid",
              fallbackComponentId: b.componentId,
            },
          };
        }
        return b;
      });
    }
    migrated.sceneLayouts = updatedLayouts;
  }

  return migrated;
}

/* ----------------------------------------------------------------------------
 * 6. RESOLVER CANÓNICO DE PROYECTOS
 * ---------------------------------------------------------------------------- */

/** Resuelve la lista de proyectos desde un Blueprint aplicando normalización y políticas */
export function resolveProjectCollection(
  blueprint?: Blueprint | null,
  options: PublicationPolicyOptions = {},
): PortfolioProject[] {
  const projectsList = Array.isArray(blueprint?.projects)
    ? blueprint.projects
    : INITIAL_PORTFOLIO_PROJECTS;
  return filterByPublicationPolicy(projectsList, options);
}

/** Resuelve un proyecto específico por su slug */
export function resolveProjectBySlug(
  blueprint?: Blueprint | null,
  slug?: string,
  options: PublicationPolicyOptions = {},
): PortfolioProject | undefined {
  if (!slug) return undefined;
  const list = resolveProjectCollection(blueprint, options);
  const cleanSlug = slug.toLowerCase().trim();
  return list.find((p) => p.slug.toLowerCase() === cleanSlug);
}

/** Update one entity without leaking its content into the shared detail template. */
export function updateProjectBySlug(
  projects: PortfolioProject[],
  slug: string,
  changes: Partial<PortfolioProject>,
  updatedAt: string = new Date().toISOString(),
): PortfolioProject[] {
  return projects.map((project) => project.slug.toLowerCase() === slug.toLowerCase()
    ? { ...project, ...changes, id: project.id, slug: project.slug, updatedAt }
    : project);
}

/* ----------------------------------------------------------------------------
 * 7. TEMPLATE 404 / NOT FOUND PARA PROYECTOS NO ENCONTRADOS
 * ---------------------------------------------------------------------------- */

/** Renderiza una vista amigable de "Proyecto no encontrado" cuando el slug no existe */
export function renderProjectNotFound(slug: string): string {
  const safeSlug = sanitizeForHtml(slug);
  return `
<section class="w-full py-24 px-6 bg-[#0d0e12] min-h-[60vh] flex items-center justify-center">
  <div class="max-w-md mx-auto text-center space-y-6">
    <div class="inline-flex p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    
    <div class="space-y-2">
      <h1 class="text-2xl sm:text-3xl font-black text-white">Proyecto no encontrado</h1>
      <p class="text-sm text-zinc-400">
        El proyecto con identificador <code class="px-2 py-0.5 rounded bg-white/10 font-mono text-orange-300">${safeSlug}</code> no existe o no está publicado actualmente.
      </p>
    </div>

    <div class="pt-4">
      <a href="#inicio" data-route-to="/portfolio" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold border border-white/10 transition-all cursor-pointer">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        <span>Volver al catálogo de proyectos</span>
      </a>
    </div>
  </div>
</section>`;
}
