/**
 * ============================================================================
 * PORTFOLIO PROJECT — ENTIDAD CMS DE CONTENIDO Y RENDERIZADOR DINÁMICO
 * ============================================================================
 *
 * Desacoplamiento estricto entre:
 *  1. Contenido CMS (PortfolioProject)
 *  2. Estructura de Navegación (/proyectos/[slug])
 *  3. Composición Visual (ProjectCollectionSection & ProjectDetailTemplate)
 */

import { sanitizeForHtml, sanitizeUrl } from "./projectCollectionResolver";
import type { AssetReference } from "./componentContract";

export type ProjectStatus =
  | "draft"
  | "in-progress"
  | "published"
  | "archived";

export type ProjectVisibility =
  | "public"
  | "unlisted"
  | "private";

export type ProjectKind =
  | "website"
  | "web-app"
  | "mobile-app"
  | "desktop-app"
  | "infrastructure"
  | "automation"
  | "ai"
  | "open-source"
  | "case-study"
  | "other";

export interface ProjectMetric {
  id: string;
  label: string;
  value: string;
  description?: string;
  icon?: string;
}

export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content?: string;

  kind: ProjectKind;
  status: ProjectStatus;
  visibility: ProjectVisibility;

  role?: string;
  year?: number;

  stack: string[];
  tags: string[];

  coverAssetId?: string;
  coverUrl?: string;
  cover?: AssetReference;
  galleryAssetIds?: string[];

  demoUrl?: string;
  repositoryUrl?: string;
  websiteUrl?: string;

  metrics: ProjectMetric[];

  featured: boolean;
  sortOrder?: number;

  seo?: {
    title?: string;
    description?: string;
    ogImageAssetId?: string;
  };

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "assets",
  "login",
  "signup",
  "settings",
  "static",
  "public",
  "system",
  "portfolio",
  "contacto",
  "marca",
  "inicio",
  "nuevo",
]);

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateSlug(
  slug: string,
  existingSlugs: string[] = [],
  currentProjectId?: string,
): { valid: boolean; reason?: string } {
  const clean = normalizeSlug(slug);
  if (!clean) {
    return { valid: false, reason: "El slug no puede estar vacío." };
  }
  if (clean.length < 2) {
    return { valid: false, reason: "El slug debe tener al menos 2 caracteres." };
  }
  if (RESERVED_SLUGS.has(clean)) {
    return { valid: false, reason: `El slug "${clean}" es una palabra reservada del sistema.` };
  }
  const isDuplicate = existingSlugs.some((s) => s.toLowerCase() === clean);
  if (isDuplicate) {
    return { valid: false, reason: `El slug "${clean}" ya está en uso por otro proyecto.` };
  }
  return { valid: true };
}

export interface ProjectCardLayoutOptions {
  columns?: 1 | 2 | 3;
  showImages?: boolean;
  showTags?: boolean;
  showCta?: boolean;
  mobileOrder?: "text-first" | "image-first";
}

export interface ProjectsSectionOptions {
  includeDrafts?: boolean;
  limit?: number;
  category?: string;
  featuredOnly?: boolean;
  heading?: string;
  highlightedWord?: string;
  eyebrow?: string;
  subtitle?: string;
  layout?: {
    columns?: 1 | 2 | 3;
    gap?: "compact" | "normal" | "spacious";
    maxWidth?: "4xl" | "6xl" | "7xl" | "full";
    paddingY?: "compact" | "normal" | "spacious";
    showImages?: boolean;
    showTags?: boolean;
    showCta?: boolean;
    mobileOrder?: "text-first" | "image-first";
  };
}

/** Renderiza una tarjeta de proyecto HTML accesible y con estilos Tailwind */
export function renderProjectCard(
  project: PortfolioProject,
  layoutOptions?: ProjectCardLayoutOptions
): string {
  const isDraft = project.status === "draft";
  const isInProgress = project.status === "in-progress";
  const columns = layoutOptions?.columns || 1;
  const showImages = layoutOptions?.showImages !== false;
  const showTags = layoutOptions?.showTags !== false;
  const showCta = layoutOptions?.showCta !== false;
  const isImageFirst = layoutOptions?.mobileOrder === "image-first";

  const kindLabel: Record<ProjectKind, string> = {
    website: "SITIO WEB",
    "web-app": "WEB APP",
    "mobile-app": "MOBILE APP",
    "desktop-app": "DESKTOP / CLI",
    infrastructure: "INFRAESTRUCTURA",
    automation: "AUTOMATIZACIÓN",
    ai: "IA / ML",
    "open-source": "OPEN SOURCE",
    "case-study": "CASO DE ESTUDIO",
    other: "PROYECTO",
  };

  const safeTitle = sanitizeForHtml(project.title);
  const safeSlug = sanitizeForHtml(project.slug);
  const safeSummary = sanitizeForHtml(project.summary);
  const safeKind = sanitizeForHtml(kindLabel[project.kind] || project.kind.toUpperCase());
  const coverSrc = sanitizeUrl(
    project.cover?.url || project.coverUrl,
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
  );
  const demoOrWebsiteUrl = sanitizeUrl(project.demoUrl || project.websiteUrl, "");
  const repoUrl = sanitizeUrl(project.repositoryUrl, "");

  // Grid layout (2 o 3 columnas)
  if (columns > 1) {
    return `
      <!-- Proyecto: ${safeTitle} (${safeSlug}) [Grid ${columns} cols] -->
      <div data-project-slug="${safeSlug}" class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-5 sm:p-6 hover:border-[var(--color-accent,#f0a470)]/40 transition-all group relative overflow-hidden flex flex-col justify-between">
        ${isDraft ? `
        <div class="absolute top-4 right-4 z-20">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            BORRADOR
          </span>
        </div>` : ""}

        <div class="space-y-4 flex-1">
          ${showImages ? `
          <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 aspect-video group-hover:border-[var(--color-accent,#f0a470)]/50 transition-colors">
            <img src="${coverSrc}" alt="${safeTitle} Preview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>` : ""}

          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-orange-400 uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> ${safeKind}
            </span>
            ${isInProgress ? `
            <span class="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-blue-400">
              DEV
            </span>` : ""}
          </div>

          <div>
            <h3 class="text-xl font-black text-white group-hover:text-[var(--color-accent,#f0a470)] transition-colors leading-tight">
              ${safeTitle}
            </h3>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="w-5 h-1 rounded-full bg-[var(--color-accent,#f0a470)]"></span>
              <span class="w-5 h-1 rounded-full bg-zinc-600"></span>
            </div>
          </div>

          <p class="text-xs text-zinc-300/90 leading-relaxed font-normal line-clamp-3">
            ${safeSummary}
          </p>

          ${showTags ? `
          <div class="flex flex-wrap gap-1.5 pt-1">
            ${project.stack.slice(0, 4).map((tag) => `<span class="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono font-bold text-zinc-300">${sanitizeForHtml(tag)}</span>`).join("\n            ")}
          </div>` : ""}
        </div>

        ${showCta ? `
        <div class="flex items-center gap-2 pt-4 mt-2 border-t border-white/[0.06] flex-wrap">
          ${demoOrWebsiteUrl ? `
          <a href="${demoOrWebsiteUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent,#f0a470)] hover:brightness-110 text-black font-extrabold px-3.5 py-2 text-xs shadow transition-all">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            <span>Visitar</span>
          </a>` : ""}
          <a href="#detalle-${safeSlug}" data-route-to="/proyectos/${safeSlug}" class="inline-flex items-center gap-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white px-3 py-2 text-xs font-mono border border-white/10 transition-all cursor-pointer">
            <span>Detalle</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>` : ""}
      </div>`;
  }

  // Layout 1 Columna (Lista Editorial Split)
  return `
      <!-- Proyecto: ${safeTitle} (${safeSlug}) -->
      <div data-project-slug="${safeSlug}" class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f0a470)]/40 transition-all group relative overflow-hidden">
        ${isDraft ? `
        <div class="absolute top-4 right-4 z-20">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            BORRADOR (NO PÚBLICO)
          </span>
        </div>` : ""}

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${isImageFirst ? "flex-col-reverse" : ""}">
          <div class="${showImages ? "lg:col-span-7" : "lg:col-span-12"} space-y-4 ${isImageFirst ? "order-2 lg:order-1" : ""}">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> ${safeKind}
              </span>
              ${isInProgress ? `
              <span class="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-blue-400">
                EN DESARROLLO
              </span>` : ""}
            </div>

            <div>
              <h3 class="text-2xl sm:text-3xl font-black text-white group-hover:text-[var(--color-accent,#f0a470)] transition-colors">
                ${safeTitle}
              </h3>
              <div class="flex items-center gap-1.5 mt-2">
                <span class="w-6 h-1 rounded-full bg-[var(--color-accent,#f0a470)]"></span>
                <span class="w-6 h-1 rounded-full bg-zinc-600"></span>
                <span class="w-6 h-1 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed font-normal">
              ${safeSummary}
            </p>

            ${showTags ? `
            <div class="flex flex-wrap gap-2 pt-1">
              ${project.stack.map((tag) => `<span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">${sanitizeForHtml(tag)}</span>`).join("\n              ")}
            </div>` : ""}

            ${showCta ? `
            <div class="flex items-center gap-3 pt-2 flex-wrap">
              ${demoOrWebsiteUrl ? `
              <a href="${demoOrWebsiteUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f0a470)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                <span>Visitar</span>
              </a>` : ""}
              ${repoUrl ? `
              <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold px-5 py-2.5 text-xs border border-white/10 transition-all">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span>Código</span>
              </a>` : ""}
              <a href="#detalle-${safeSlug}" data-route-to="/proyectos/${safeSlug}" class="inline-flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white px-4 py-2.5 text-xs font-mono border border-white/10 transition-all cursor-pointer">
                <span>Ver detalle</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </a>
            </div>` : ""}
          </div>

          ${showImages ? `
          <div class="lg:col-span-5 relative p-2 ${isImageFirst ? "order-1 lg:order-2" : ""}">
            <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-orange-500/80"></div>
            <div class="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-orange-500/80"></div>
            <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-orange-500/80"></div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-orange-500/80"></div>
            <div class="rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative group-hover:border-[var(--color-accent,#f0a470)]/50 transition-colors">
              <img src="${coverSrc}" alt="${safeTitle} Preview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            </div>
          </div>` : ""}
        </div>
      </div>`;
}

/** Renderiza la colección completa de proyectos en un Grid responsive data-bound. */
export function renderProjectsGrid(
  projects: PortfolioProject[],
  options: ProjectsSectionOptions = {},
): string {
  let list = [...projects];

  if (!options.includeDrafts) {
    list = list.filter((p) => p.status === "published" && p.visibility === "public");
  } else {
    list = list.filter((p) => p.status !== "archived");
  }

  // Filtro por categoría
  if (options.category && options.category !== "all") {
    list = list.filter((p) => p.kind === options.category);
  }

  // Filtro de solo destacados
  if (options.featuredOnly) {
    list = list.filter((p) => p.featured);
  }

  // Orden: featured primero, luego por sortOrder o por fecha
  list.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99);
  });

  if (options.limit && options.limit > 0) {
    list = list.slice(0, options.limit);
  }

  const columns = options.layout?.columns || 1;
  const paddingYClass = options.layout?.paddingY === "compact" ? "py-12" : options.layout?.paddingY === "spacious" ? "py-32" : "py-20";
  const maxWidthClass = options.layout?.maxWidth === "4xl" ? "max-w-4xl" : options.layout?.maxWidth === "7xl" ? "max-w-7xl" : options.layout?.maxWidth === "full" ? "w-full max-w-none" : "max-w-6xl";
  
  let gridOrStackClass = "space-y-8";
  if (columns === 2) {
    gridOrStackClass = options.layout?.gap === "compact" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : options.layout?.gap === "spacious" ? "grid grid-cols-1 md:grid-cols-2 gap-10" : "grid grid-cols-1 md:grid-cols-2 gap-6";
  } else if (columns === 3) {
    gridOrStackClass = options.layout?.gap === "compact" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : options.layout?.gap === "spacious" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
  } else {
    gridOrStackClass = options.layout?.gap === "compact" ? "space-y-4" : options.layout?.gap === "spacious" ? "space-y-12" : "space-y-8";
  }

  const headingText = options.heading || "Proyectos";
  const highlightedWord = options.highlightedWord !== undefined ? options.highlightedWord : "Destacados";
  const eyebrowText = options.eyebrow || `CATÁLOGO DE PROYECTOS (${list.length})`;
  const subtitleText = options.subtitle || "Aplicaciones de escritorio, herramientas de infraestructura, IA local y plataformas web en producción.";

  const cardLayoutOptions: ProjectCardLayoutOptions = {
    columns,
    showImages: options.layout?.showImages,
    showTags: options.layout?.showTags,
    showCta: options.layout?.showCta,
    mobileOrder: options.layout?.mobileOrder,
  };

  const cardsHtml = list.map((p) => renderProjectCard(p, cardLayoutOptions)).join("\n\n");

  return `
<section id="proyectos" class="w-full ${paddingYClass} px-6 ${maxWidthClass} mx-auto space-y-12">
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-mono font-bold text-orange-400">
        <span class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
        ${sanitizeForHtml(eyebrowText)}
      </span>
    </div>

    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
          ${sanitizeForHtml(headingText)} ${highlightedWord ? `<span class="text-[var(--color-accent,#f0a470)]">${sanitizeForHtml(highlightedWord)}</span>` : ""}
        </h2>
        <p class="text-sm text-zinc-400 mt-2 max-w-xl">
          ${sanitizeForHtml(subtitleText)}
        </p>
      </div>
    </div>
  </div>

  <div class="${gridOrStackClass}">
    ${cardsHtml}
  </div>
</section>`;
}

/** Renderiza la plantilla única de detalle para cualquier proyecto (ProjectDetailTemplate). */
export function renderProjectDetailTemplate(project: PortfolioProject): string {
  const kindLabel: Record<ProjectKind, string> = {
    website: "SITIO WEB",
    "web-app": "WEB APP",
    "mobile-app": "MOBILE APP",
    "desktop-app": "DESKTOP / CLI",
    infrastructure: "INFRAESTRUCTURA",
    automation: "AUTOMATIZACIÓN",
    ai: "IA / ML",
    "open-source": "OPEN SOURCE",
    "case-study": "CASO DE ESTUDIO",
    other: "PROYECTO",
  };

  const safeTitle = sanitizeForHtml(project.title);
  const safeSlug = sanitizeForHtml(project.slug);
  const safeSummary = sanitizeForHtml(project.summary);
  const safeKind = sanitizeForHtml(kindLabel[project.kind] || project.kind.toUpperCase());
  const safeStatus = sanitizeForHtml(project.status.toUpperCase());
  const safeRole = sanitizeForHtml(project.role || "Full-stack + DevOps");
  const safeYear = sanitizeForHtml(project.year || 2026);
  const coverSrc = sanitizeUrl(
    project.cover?.url || project.coverUrl,
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
  );
  const demoOrWebsiteUrl = sanitizeUrl(project.demoUrl || project.websiteUrl, "");
  const repoUrl = sanitizeUrl(project.repositoryUrl, "");

  const paddingYClass = (project as any).layout?.paddingY === "compact"
    ? "py-8"
    : (project as any).layout?.paddingY === "spacious"
    ? "py-28"
    : "py-12 md:py-20";

  const maxWidthClass = (project as any).layout?.maxWidth === "6xl"
    ? "max-w-6xl"
    : (project as any).layout?.maxWidth === "7xl"
    ? "max-w-7xl"
    : (project as any).layout?.maxWidth === "full"
    ? "w-full"
    : "max-w-4xl";

  return `
<section id="detalle-${safeSlug}" class="w-full ${paddingYClass} bg-[#0d0e12]">
  <div class="${maxWidthClass} mx-auto px-6 space-y-10">
    
    <!-- Botón Volver -->
    <div>
      <a href="#inicio" data-route-to="/portfolio" data-subnode="button" data-subnode-key="back-link" data-clickable="true" class="inline-flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 hover:text-[var(--color-accent,#f0a470)] transition-colors cursor-pointer">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        <span>Volver a proyectos</span>
      </a>
    </div>

    <!-- Cabecera de Proyecto -->
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <span data-subnode="badge" data-subnode-key="kind" data-clickable="true" class="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-0.5 text-xs font-mono font-bold text-orange-400">
          ${safeKind}
        </span>
        <span data-subnode="badge" data-subnode-key="status" data-clickable="true" class="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400">
          ${safeStatus}
        </span>
      </div>

      <h1 data-subnode="heading" data-subnode-key="title" data-clickable="true" class="text-4xl sm:text-5xl font-black text-white tracking-tight cursor-pointer hover:text-[var(--color-accent,#f0a470)] transition-colors">
        ${safeTitle}
      </h1>

      <p data-subnode="text" data-subnode-key="summary" data-clickable="true" class="text-sm sm:text-base text-zinc-300/90 leading-relaxed font-normal cursor-pointer">
        ${safeSummary}
      </p>

      <!-- Tech stack pills -->
      <div class="flex flex-wrap gap-2 pt-2">
        ${project.stack.map((t, idx) => `<span data-subnode="badge" data-subnode-key="stack-${idx}" data-clickable="true" class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300 cursor-pointer hover:border-[var(--color-accent,#f0a470)]">${sanitizeForHtml(t)}</span>`).join("\n        ")}
      </div>

      <!-- Fila de metadatos ROL | AÑO | ESTADO | LICENCIA -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-white/[0.08] text-xs font-mono">
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">ROL</span>
          <span class="text-white font-bold mt-0.5 block">${safeRole}</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">AÑO</span>
          <span class="text-white font-bold mt-0.5 block">${safeYear}</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">ESTADO</span>
          <span class="text-emerald-400 font-bold mt-0.5 block">${project.status === "published" ? "Producción" : safeStatus}</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">LICENCIA</span>
          <span class="text-white font-bold mt-0.5 block">MIT</span>
        </div>
      </div>
    </div>

    <!-- Banner Galería Showcase / Imagen Portada Auto-Descubierta -->
    <div data-subnode="image" data-subnode-key="cover" data-clickable="true" class="rounded-3xl overflow-hidden border border-white/10 bg-[#161822] p-6 shadow-2xl cursor-pointer group hover:border-[var(--color-accent,#f0a470)]/50 transition-all">
      <img src="${sanitizeForHtml(coverSrc)}" alt="${sanitizeForHtml(project.cover?.alt || `${project.title} Showcase`)}" style="object-position:${Math.min(100, Math.max(0, project.cover?.focalPoint?.x ?? 50))}% ${Math.min(100, Math.max(0, project.cover?.focalPoint?.y ?? 50))}%" class="w-full h-auto rounded-xl object-cover pointer-events-none group-hover:scale-[1.01] transition-transform duration-500" />
    </div>

    ${project.metrics && project.metrics.length > 0 ? `
    <!-- Fila de Rendimiento / Benchmarks -->
    <div class="grid grid-cols-1 sm:grid-cols-${Math.min(project.metrics.length, 3)} gap-4">
      ${project.metrics.map((m) => `
      <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 text-center space-y-1">
        <div class="text-3xl font-black font-mono text-[var(--color-accent,#f0a470)]">${sanitizeForHtml(m.value)}</div>
        <div class="text-[10px] text-zinc-400 font-mono">${sanitizeForHtml(m.label)}</div>
      </div>
      `).join("\n")}
    </div>` : ""}

    <!-- Enlaces Externos -->
    <div class="flex items-center gap-4 pt-4 flex-wrap">
      ${demoOrWebsiteUrl ? `
      <a href="${demoOrWebsiteUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f0a470)] hover:brightness-110 text-black font-extrabold px-6 py-3 text-xs shadow-lg transition-all">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        <span>Visitar Sitio Web</span>
      </a>` : ""}
      ${repoUrl ? `
      <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold px-6 py-3 text-xs border border-white/10 transition-all">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        <span>Ver Código en GitHub</span>
      </a>` : ""}
    </div>

  </div>
</section>`;
}

/** 10 proyectos semilla oficiales del Portfolio de Iván Jonás */
export const INITIAL_PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: "proj_oposapp",
    slug: "oposapp",
    title: "OposApp — TFG Móvil & IA",
    summary: "App móvil para opositores con seguimiento automático del BOPA, generación de tests con IA local (Ollama) y dashboard de progreso en tiempo real.",
    kind: "mobile-app",
    status: "published",
    visibility: "public",
    role: "Full-stack + Infra",
    year: 2026,
    stack: ["Flutter", "Spring Boot", "IA Local (Ollama)", "PostgreSQL", "RGPD"],
    tags: ["TFG", "DAM", "Mobile", "IA"],
    coverUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80",
    metrics: [
      { id: "m1", label: "Listado de 200 convocatorias", value: "187 ms" },
      { id: "m2", label: "Test IA (10 preguntas)", value: "11,3 s" },
      { id: "m3", label: "Login con BCrypt", value: "312 ms" },
    ],
    featured: true,
    sortOrder: 1,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2026-02-01T12:00:00Z",
  },
  {
    id: "proj_subsforge",
    slug: "subsforge",
    title: "SubsForge — Subtítulos con IA",
    summary: "Suite de escritorio para traducción, síntesis de voz, sincronización milimétrica e incrustación de subtítulos con modelos locales Whisper y Piper en tu GPU/CPU.",
    kind: "desktop-app",
    status: "published",
    visibility: "public",
    role: "Lead Developer",
    year: 2026,
    stack: ["Tauri 2", "Rust", "Python", "Whisper.cpp", "Silero VAD"],
    tags: ["Open Source", "Desktop", "IA Local"],
    coverUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    repositoryUrl: "https://github.com/IvanjonasFC/subsforge",
    metrics: [
      { id: "m1", label: "Precisión de sincronía VAD", value: "99.2%" },
      { id: "m2", label: "Velocidad de transcripción", value: "6.4x realtime" },
    ],
    featured: true,
    sortOrder: 2,
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2026-02-20T12:00:00Z",
  },
  {
    id: "proj_orquestagit",
    slug: "orquestagit",
    title: "OrquestaGit — Sync CLI Rust",
    summary: "CLI de alto rendimiento en Rust para sincronizar, auditar estados y ejecutar workflows en lote sobre múltiples repositorios locales y remotos concurrentemente.",
    kind: "desktop-app",
    status: "published",
    visibility: "public",
    role: "Creador",
    year: 2026,
    stack: ["Rust", "Tokio", "Git2", "Clap", "Linux CLI"],
    tags: ["CLI", "Rust", "DevOps"],
    coverUrl: "https://images.unsplash.com/photo-1618401471353-b98aedd04e11?auto=format&fit=crop&w=800&q=80",
    repositoryUrl: "https://github.com/IvanjonasFC/orquestagit",
    metrics: [
      { id: "m1", label: "Escaneo de 50 repos", value: "42 ms" },
    ],
    featured: true,
    sortOrder: 3,
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2026-03-10T12:00:00Z",
  },
  {
    id: "proj_job_radar",
    slug: "job-radar",
    title: "Job Radar — Scraper & Matching",
    summary: "Buscador y clasificador inteligente de ofertas tecnológicas que rastrea portales públicos, filtra por stack y calcula afinidad con tu perfil automáticamente.",
    kind: "automation",
    status: "published",
    visibility: "public",
    role: "Full-stack & Scraping",
    year: 2026,
    stack: ["TypeScript", "Cheerio", "Puppeteer", "PostgreSQL", "Tailwind"],
    tags: ["Scraper", "Automatización", "Web"],
    coverUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80",
    demoUrl: "https://portfolio.ivanjonasfc.dev",
    metrics: [
      { id: "m1", label: "Ofertas procesadas al día", value: "1,200+" },
    ],
    featured: false,
    sortOrder: 4,
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2026-03-25T12:00:00Z",
  },
  {
    id: "proj_lifeos",
    slug: "lifeos",
    title: "LifeOS — Dashboard de Vida",
    summary: "Panel de control personal self-hosted para centralizar finanzas, proyectos, hábitos y estado de servidores en una sola vista minimalista y segura.",
    kind: "web-app",
    status: "published",
    visibility: "public",
    role: "Diseño & Arquitectura",
    year: 2026,
    stack: ["React", "TypeScript", "Fastify", "SQLite", "Docker"],
    tags: ["Self-hosted", "Dashboard"],
    coverUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    metrics: [
      { id: "m1", label: "Tiempo de arranque", value: "85 ms" },
    ],
    featured: false,
    sortOrder: 5,
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2026-04-10T12:00:00Z",
  },
  {
    id: "proj_infra_pesoz",
    slug: "infra-pesoz",
    title: "Infraestructura Pesoz — Homelab",
    summary: "Entorno de virtualización Proxmox VE con monitorización Prometheus/Grafana, backups automáticos, túneles WireGuard y reverse proxy con Caddy.",
    kind: "infrastructure",
    status: "published",
    visibility: "public",
    role: "DevOps & SysAdmin",
    year: 2025,
    stack: ["Proxmox VE", "Docker", "WireGuard", "Caddy", "ZFS"],
    tags: ["DevOps", "SysAdmin", "Homelab"],
    coverUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
    metrics: [
      { id: "m1", label: "Servidores en ejecución", value: "24/7" },
      { id: "m2", label: "Uptime anual", value: "99.98%" },
    ],
    featured: true,
    sortOrder: 6,
    createdAt: "2025-06-01T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2025-08-01T12:00:00Z",
  },
  {
    id: "proj_rutas_raices",
    slug: "rutas-raices",
    title: "Rutas & Raíces — Guía de Senderismo",
    summary: "Guía interactiva de senderismo y patrimonio rural con rutas GPX interactivas, perfiles altimétricos interactivos y modo sin conexión (PWA).",
    kind: "web-app",
    status: "published",
    visibility: "public",
    role: "Full-stack",
    year: 2025,
    stack: ["Astro", "Tailwind", "Leaflet", "PWA", "GeoJSON"],
    tags: ["PWA", "Maps", "Turismo"],
    coverUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80",
    demoUrl: "https://portfolio.ivanjonasfc.dev",
    metrics: [],
    featured: false,
    sortOrder: 7,
    createdAt: "2025-09-01T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2025-10-01T12:00:00Z",
  },
  {
    id: "proj_vagabond_battery_saver",
    slug: "vagabond-battery-saver",
    title: "Vagabond Battery Saver",
    summary: "Módulo de bajo nivel para optimización de ciclos de batería y throttling inteligente en dispositivos móviles y portátiles Linux.",
    kind: "open-source",
    status: "published",
    visibility: "public",
    role: "Sistemas & Batería",
    year: 2025,
    stack: ["C", "Bash", "Systemd", "Linux Kernel"],
    tags: ["Hardware", "Linux", "Open Source"],
    coverUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    repositoryUrl: "https://github.com/IvanjonasFC",
    metrics: [],
    featured: false,
    sortOrder: 8,
    createdAt: "2025-11-01T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2025-11-20T12:00:00Z",
  },
  {
    id: "proj_acopio_de_codigo",
    slug: "acopio-de-codigo",
    title: "Acopio de Código",
    summary: "Página web interactiva con snippets de código de varios lenguajes: busca, copia y ten todo a mano. Autohospedada en mi propia infraestructura.",
    kind: "web-app",
    status: "published",
    visibility: "public",
    role: "Full-stack",
    year: 2025,
    stack: ["React", "Snippets", "Self-hosted"],
    tags: ["Snippets", "Tool"],
    coverUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
    demoUrl: "https://portfolio.ivanjonasfc.dev",
    metrics: [],
    featured: false,
    sortOrder: 9,
    createdAt: "2025-12-01T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2025-12-15T12:00:00Z",
  },
  {
    id: "proj_portfolio_web",
    slug: "portfolio-web",
    title: "Portfolio Web",
    summary: "Este mismo sitio. Astro 7 + React (Islas) + Tailwind, self-hosted con Docker y Caddy. Cada proyecto es una carpeta con su contenido y se da de alta con un script (npm run proyecto:add).",
    kind: "website",
    status: "published",
    visibility: "public",
    role: "Diseño & Desarrollo",
    year: 2026,
    stack: ["Astro", "React", "Tailwind", "Self-hosted"],
    tags: ["Portfolio", "Meta"],
    coverUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    demoUrl: "https://portfolio.ivanjonasfc.dev",
    repositoryUrl: "https://github.com/IvanjonasFC/portfolio-astro",
    metrics: [],
    featured: true,
    sortOrder: 10,
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
    publishedAt: "2026-01-10T12:00:00Z",
  },
];
