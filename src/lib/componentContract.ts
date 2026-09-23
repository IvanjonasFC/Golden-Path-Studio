/**
 * Golden Path Studio - Component Contract & Schema Definition
 * 
 * Provides strict typing, schema definitions, and canonical HTML renderers
 * for contract-bound components (Hero, Cards, Buttons, Assets) guaranteeing
 * 100% parity across In-Canvas Preview, Next.js, Astro, and HTML5 exports.
 */

import type { BrandDTO } from './brands';
import type { BlockActionBinding } from './scenes';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AssetReference {
  assetId: string;
  url: string;
  alt: string;
  caption?: string;
  aspectRatio?: "1:1" | "4:5" | "16:9" | "3:2" | "auto";
  fit?: "cover" | "contain" | "fill";
  focalPoint?: { x: number; y: number }; // Percentage 0-100
}

export interface HeroBadgeItem {
  id: string;
  label: string;
  tone?: "accent" | "success" | "neutral" | "warning";
  iconName?: string;
}

export interface HeroProps {
  variant?: "split-portrait" | "centered" | "terminal" | "minimal";
  eyebrow?: string;
  statusText?: string;
  title?: string;
  highlightWord?: string;
  description?: string;
  portrait?: AssetReference;
  badges?: HeroBadgeItem[];
  primaryCta?: {
    label: string;
    action: BlockActionBinding;
    icon?: string;
    variant?: "primary" | "secondary" | "outline" | "ghost";
  };
  secondaryCta?: {
    label: string;
    action: BlockActionBinding;
    icon?: string;
    variant?: "primary" | "secondary" | "outline" | "ghost";
  };
  layout?: {
    imagePosition?: "left" | "right";
    align?: "left" | "center";
    mobileOrder?: "text-first" | "image-first";
    paddingY?: "compact" | "normal" | "spacious" | "sm" | "md" | "lg" | "xl";
    maxWidth?: "4xl" | "6xl" | "7xl" | "full";
  };
}

export interface SubnodeTarget {
  blockId: string;
  subnodeType: "root" | "image" | "heading" | "text" | "button" | "badge";
  subnodeKey?: string; // e.g. "portrait", "primaryCta", "badge-0", "eyebrow"
}

export interface ComponentSlotDefinition {
  id: string;
  name: string;
  description: string;
  accepts: Array<"badge" | "button" | "image" | "metric" | "card" | "text">;
  cardinality: "zero-or-one" | "zero-or-more";
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: "hero" | "portfolio" | "metrics" | "features" | "cta" | "content";
  description: string;
  slots: ComponentSlotDefinition[];
  defaultProps: Record<string, unknown>;
}

export const HERO_COMPONENT_DEFINITION: ComponentDefinition = {
  id: "comp_ivn_hero",
  name: "Hero Developer Iván Jonás",
  category: "hero",
  description: "Hero split con retrato focalizado, badges de especialidad, estado laboral y CTAs de conversión directa.",
  slots: [
    {
      id: "badges",
      name: "Badges de Especialidad",
      description: "Píldoras semánticas para tags de stack técnico o rol.",
      accepts: ["badge"],
      cardinality: "zero-or-more",
    },
    {
      id: "actions",
      name: "Acciones Principales",
      description: "Botones de conversión y navegación.",
      accepts: ["button"],
      cardinality: "zero-or-more",
    },
    {
      id: "portrait",
      name: "Retrato Principal",
      description: "Asset de imagen de perfil.",
      accepts: ["image"],
      cardinality: "zero-or-one",
    }
  ],
  defaultProps: {
    variant: "split-portrait",
    eyebrow: "HELLO WORLD",
    statusText: "Disponible para trabajar",
    title: "Iván Jonás",
    description: "Desarrollador Full-stack y DevOps especializado en crear soluciones escalables, automatizaciones inteligentes y plataformas cloud resilientes.",
    portrait: {
      assetId: "asset_ivn_profile",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
      alt: "Retrato de Iván Jonás",
      aspectRatio: "4:5",
      fit: "cover",
      focalPoint: { x: 50, y: 35 },
    },
    badges: [
      { id: "b1", label: "FULL-STACK DEV", tone: "accent" },
      { id: "b2", label: "DEVOPS & CLOUD", tone: "neutral" },
      { id: "b3", label: "REACT / NEXT.JS", tone: "neutral" },
      { id: "b4", label: "PYTHON / DOCKER", tone: "neutral" },
    ],
    primaryCta: {
      label: "Ver proyectos",
      variant: "primary",
      icon: "arrow-down",
      action: {
        actionId: "primary",
        label: "Ver proyectos",
        target: {
          kind: "anchor",
          blockId: "proyectos-destacados",
        },
      },
    },
    secondaryCta: {
      label: "Descargar CV",
      variant: "outline",
      icon: "download",
      action: {
        actionId: "secondary",
        label: "Descargar CV",
        target: {
          kind: "url",
          href: "https://github.com/ivan-jonas",
          newTab: true,
        },
      },
    },
    layout: {
      imagePosition: "left",
      align: "left",
      mobileOrder: "text-first",
      paddingY: "lg",
    },
  },
};

/**
 * Ensures props conforms to HeroProps with sensible defaults
 */
export function normalizeHeroProps(rawProps?: Record<string, unknown>): HeroProps {
  const defaults = HERO_COMPONENT_DEFINITION.defaultProps as HeroProps;
  if (!rawProps) return defaults;

  return {
    variant: (rawProps.variant as HeroProps['variant']) || defaults.variant,
    eyebrow: typeof rawProps.eyebrow === 'string' ? rawProps.eyebrow : defaults.eyebrow,
    statusText: typeof rawProps.statusText === 'string' ? rawProps.statusText : defaults.statusText,
    title: typeof rawProps.title === 'string' ? rawProps.title : defaults.title,
    highlightWord: typeof rawProps.highlightWord === 'string' ? rawProps.highlightWord : undefined,
    description: typeof rawProps.description === 'string' ? rawProps.description : defaults.description,
    portrait: rawProps.portrait ? (rawProps.portrait as AssetReference) : defaults.portrait,
    badges: Array.isArray(rawProps.badges) ? (rawProps.badges as HeroBadgeItem[]) : defaults.badges,
    primaryCta: rawProps.primaryCta ? (rawProps.primaryCta as HeroProps['primaryCta']) : defaults.primaryCta,
    secondaryCta: rawProps.secondaryCta ? (rawProps.secondaryCta as HeroProps['secondaryCta']) : defaults.secondaryCta,
    layout: rawProps.layout ? (rawProps.layout as HeroProps['layout']) : defaults.layout,
  };
}

/**
 * Canonical HTML renderer for Hero matching the strict contract.
 * Includes data-subnode attributes for in-canvas click introspection.
 */
export function renderHeroTemplate(
  props: HeroProps,
  brand?: BrandDTO,
  options?: { isInteractivePreview?: boolean }
): string {
  const p = normalizeHeroProps(props as Record<string, unknown>);
  const interactive = options?.isInteractivePreview !== false;

  const subnodeAttr = (type: string, key?: string) => {
    if (!interactive) return '';
    return `data-subnode="${type}" ${key ? `data-subnode-key="${key}"` : ''} data-clickable="true"`;
  };

  const primaryColor = '#f0a470';
  const surfaceColor = '#121216';
  const textColor = '#ffffff';
  const textMuted = '#94a3b8';
  const borderColor = 'rgba(255,255,255,0.1)';

  const focalX = p.portrait?.focalPoint?.x ?? 50;
  const focalY = p.portrait?.focalPoint?.y ?? 50;
  const objectPosition = `${focalX}% ${focalY}%`;

  const badgesHtml = (p.badges || []).map((b, idx) => {
    let bg = 'rgba(255,255,255,0.06)';
    let text = textMuted;
    let border = 'rgba(255,255,255,0.12)';

    if (b.tone === 'accent') {
      bg = `${primaryColor}18`;
      text = primaryColor;
      border = `${primaryColor}40`;
    } else if (b.tone === 'success') {
      bg = 'rgba(16, 185, 129, 0.12)';
      text = '#34d399';
      border = 'rgba(16, 185, 129, 0.3)';
    }

    return `
      <span ${subnodeAttr('badge', `badge-${idx}`)} 
        style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: ${bg}; color: ${text}; border: 1px solid ${border}; cursor: pointer; transition: all 0.2s ease;">
        <span style="width: 5px; height: 5px; border-radius: 50%; background: currentColor;"></span>
        ${b.label}
      </span>
    `;
  }).join('');

  // Primary Action Link Resolution
  const primaryTarget = p.primaryCta?.action?.target;
  const primaryHref = !primaryTarget || primaryTarget.kind === "none" ? "#"
    : primaryTarget.kind === "scene" ? `/${primaryTarget.sceneId}`
    : primaryTarget.kind === "route" ? primaryTarget.path
    : primaryTarget.kind === "url" ? primaryTarget.href
    : primaryTarget.kind === "anchor" ? `#${primaryTarget.blockId}`
    : "#";

  // Secondary Action Link Resolution
  const secondaryTarget = p.secondaryCta?.action?.target;
  const secondaryHref = !secondaryTarget || secondaryTarget.kind === "none" ? "#"
    : secondaryTarget.kind === "scene" ? `/${secondaryTarget.sceneId}`
    : secondaryTarget.kind === "route" ? secondaryTarget.path
    : secondaryTarget.kind === "url" ? secondaryTarget.href
    : secondaryTarget.kind === "anchor" ? `#${secondaryTarget.blockId}`
    : "#";
  const secondaryNewTab = secondaryTarget?.kind === "url" ? Boolean(secondaryTarget.newTab) : false;

  const rawTitle = p.title || 'Iván Jonás';
  let formattedTitle = rawTitle;
  if (p.highlightWord && p.highlightWord.trim()) {
    const hw = p.highlightWord.trim();
    const regex = new RegExp(`(${hw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
    if (regex.test(rawTitle)) {
      formattedTitle = rawTitle.replace(regex, `<span style="color: ${primaryColor}; text-shadow: 0 0 24px ${primaryColor}40;">$1</span>`);
    } else {
      formattedTitle = `${rawTitle} <span style="color: ${primaryColor}; text-shadow: 0 0 24px ${primaryColor}40;">${hw}</span>`;
    }
  }

  const isImgLeft = p.layout?.imagePosition === 'left';
  const variant = p.variant || 'split-portrait';

  const imageBlock = `
    <div ${subnodeAttr('image', 'portrait')} class="hero-image-wrapper" style="flex: 1; max-width: 420px; position: relative; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid ${borderColor}; cursor: pointer; group: true;">
      <div style="aspect-ratio: ${p.portrait?.aspectRatio === '4:5' ? '4/5' : p.portrait?.aspectRatio === '1:1' ? '1/1' : '16/9'}; width: 100%; background: ${surfaceColor}; overflow: hidden; position: relative;">
        <img src="${p.portrait?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'}" 
             alt="${p.portrait?.alt || 'Retrato de Iván Jonás'}" 
             style="width: 100%; height: 100%; object-fit: ${p.portrait?.fit || 'cover'}; object-position: ${objectPosition}; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);" />
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.7) 100%); pointer-events: none;"></div>
      </div>
      <div style="position: absolute; bottom: 14px; left: 14px; right: 14px; display: flex; align-items: center; justify-content: space-between; background: rgba(18, 18, 22, 0.75); backdrop-filter: blur(12px); padding: 8px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
        <span style="font-size: 11px; font-family: monospace; color: #94a3b8;">ASSET: ${p.portrait?.assetId || 'PORTRAIT'}</span>
        <span style="font-size: 10px; font-weight: 600; color: #34d399; display: flex; align-items: center; gap: 4px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span> OPTIMIZADO
        </span>
      </div>
    </div>
  `;

  const ctaButtons = `
    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 8px;">
      <a ${subnodeAttr('button', 'primaryCta')} href="${primaryHref}" style="display: inline-flex; align-items: center; gap: 10px; background: ${primaryColor}; color: #000; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 25px ${primaryColor}40; transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer;">
        <span>${p.primaryCta?.label || 'Ver proyectos'}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </a>

      <a ${subnodeAttr('button', 'secondaryCta')} href="${secondaryHref}" ${secondaryNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''} style="display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); color: ${textColor}; font-weight: 600; font-size: 14px; padding: 12px 22px; border-radius: 12px; text-decoration: none; border: 1px solid ${borderColor}; transition: all 0.2s ease; cursor: pointer;">
        <span>${p.secondaryCta?.label || 'Descargar CV'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </a>
    </div>
  `;

  const paddingYStyle = p.layout?.paddingY === "compact" || p.layout?.paddingY === "sm"
    ? "48px 24px"
    : p.layout?.paddingY === "spacious" || p.layout?.paddingY === "xl"
    ? "128px 24px"
    : "80px 24px";
  const maxWidthStyle = p.layout?.maxWidth === "4xl"
    ? "896px"
    : p.layout?.maxWidth === "7xl"
    ? "1280px"
    : p.layout?.maxWidth === "full"
    ? "100%"
    : "1180px";

  // VARIANTE: CENTRADO
  if (variant === 'centered') {
    return `
      <section class="hero-section hero--centered" style="position: relative; width: 100%; padding: ${paddingYStyle}; overflow: hidden; background: radial-gradient(circle at 50% 30%, rgba(240, 164, 112, 0.08) 0%, transparent 70%);">
        <div style="max-width: 860px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 24px;">
          <!-- Meta & Status -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px;">
            <span ${subnodeAttr('text', 'eyebrow')} style="font-size: 13px; font-family: monospace; color: ${primaryColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;">
              // ${p.eyebrow || 'HELLO WORLD'}
            </span>
            <div ${subnodeAttr('text', 'statusText')} style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 3px 10px; border-radius: 9999px; font-size: 12px; color: #34d399; font-weight: 500; cursor: pointer;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399;"></span>
              ${p.statusText || 'Disponible para trabajar'}
            </div>
          </div>

          <!-- Main Title -->
          <h1 ${subnodeAttr('heading', 'title')} style="margin: 0; font-size: clamp(2.6rem, 6vw, 4.4rem); font-weight: 900; line-height: 1.05; letter-spacing: -0.03em; color: ${textColor}; cursor: pointer;">
            ${formattedTitle}
          </h1>

          <!-- Badges -->
          <div ${subnodeAttr('badge', 'badges-container')} style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
            ${badgesHtml}
          </div>

          <!-- Description -->
          <p ${subnodeAttr('text', 'description')} style="margin: 0; font-size: 17px; line-height: 1.6; color: ${textMuted}; max-width: 640px; cursor: pointer;">
            ${p.description || ''}
          </p>

          <!-- CTAs -->
          <div style="display: flex; justify-content: center; margin-top: 6px;">
            ${ctaButtons}
          </div>
        </div>
      </section>
    `;
  }

  // VARIANTE: TERMINAL
  if (variant === 'terminal') {
    return `
      <section class="hero-section hero--terminal" style="position: relative; width: 100%; padding: ${paddingYStyle}; overflow: hidden;">
        <div style="max-width: 900px; margin: 0 auto;">
          <div style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.15); background: rgba(13,14,20,0.95); backdrop-filter: blur(20px); box-shadow: 0 25px 60px rgba(0,0,0,0.7); overflow: hidden; font-family: monospace;">
            <div style="height: 38px; background: rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 16px; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
              <span style="margin-left: 12px; font-size: 11px; color: #71717a;">bash - 80x24 • ~/profile</span>
            </div>
            <div style="padding: 32px 28px; display: flex; flex-direction: column; gap: 20px;">
              <div style="font-size: 13px; color: #a1a1aa;">
                <span style="color: #34d399;">user@local</span>:<span style="color: ${primaryColor};">~</span>$ cat intro.md
              </div>
              <h1 ${subnodeAttr('heading', 'title')} style="margin: 0; font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 800; color: #fff; letter-spacing: -0.02em;">
                ${formattedTitle}
              </h1>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${badgesHtml}
              </div>
              <p ${subnodeAttr('text', 'description')} style="margin: 0; font-size: 15px; line-height: 1.6; color: #cbd5e1; font-family: system-ui, sans-serif;">
                ${p.description || ''}
              </p>
              <div style="padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);">
                ${ctaButtons}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // VARIANTE: MINIMAL
  if (variant === 'minimal') {
    return `
      <section class="hero-section hero--minimal" style="position: relative; width: 100%; padding: ${paddingYStyle};">
        <div style="max-width: ${maxWidthStyle}; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: ${primaryColor};">${p.eyebrow || 'HELLO WORLD'}</span>
            <span style="color: #52525b;">—</span>
            <span style="font-size: 12px; color: #94a3b8;">${p.statusText || 'Disponible para trabajar'}</span>
          </div>
          <h1 ${subnodeAttr('heading', 'title')} style="margin: 0; font-size: clamp(2.8rem, 7vw, 5rem); font-weight: 900; line-height: 1.0; letter-spacing: -0.04em; color: #fff;">
            ${formattedTitle}
          </h1>
          <p ${subnodeAttr('text', 'description')} style="margin: 0; font-size: 18px; line-height: 1.6; color: #94a3b8; max-width: 680px;">
            ${p.description || ''}
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0;">
            ${badgesHtml}
          </div>
          <div style="margin-top: 12px;">
            ${ctaButtons}
          </div>
        </div>
      </section>
    `;
  }

  // VARIANTE POR DEFECTO: SPLIT-PORTRAIT
  const contentBlock = `
    <div style="flex: 1.3; display: flex; flex-direction: column; gap: 20px;">
      <!-- Header meta & status -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
        <span ${subnodeAttr('text', 'eyebrow')} style="font-size: 13px; font-family: monospace; color: ${primaryColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;">
          // ${p.eyebrow || 'HELLO WORLD'}
        </span>
        <div ${subnodeAttr('text', 'statusText')} style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 3px 10px; border-radius: 9999px; font-size: 12px; color: #34d399; font-weight: 500; cursor: pointer;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399;"></span>
          ${p.statusText || 'Disponible para trabajar'}
        </div>
      </div>

      <!-- Main Title -->
      <h1 ${subnodeAttr('heading', 'title')} style="margin: 0; font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 800; line-height: 1.05; letter-spacing: -0.03em; color: ${textColor}; cursor: pointer;">
        ${formattedTitle}
      </h1>

      <!-- Badges List -->
      <div ${subnodeAttr('badge', 'badges-container')} style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: -6px;">
        ${badgesHtml}
      </div>

      <!-- Description -->
      <p ${subnodeAttr('text', 'description')} style="margin: 0; font-size: 16px; line-height: 1.6; color: ${textMuted}; max-width: 540px; cursor: pointer;">
        ${p.description || ''}
      </p>

      <!-- Action Buttons -->
      ${ctaButtons}
    </div>
  `;

  return `
    <section class="hero-section" style="position: relative; width: 100%; padding: ${paddingYStyle}; overflow: hidden; background: radial-gradient(circle at 10% 20%, rgba(255, 122, 0, 0.04) 0%, transparent 60%);">
      <div style="max-width: ${maxWidthStyle}; margin: 0 auto; display: flex; flex-direction: ${isImgLeft ? 'row' : 'row-reverse'}; align-items: center; justify-content: space-between; gap: 48px; flex-wrap: wrap;">
        ${imageBlock}
        ${contentBlock}
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  route?: string;
}

export interface NavbarProps {
  logoText?: string;
  logoDotColor?: string;
  links?: NavLinkItem[];
  showLangToggle?: boolean;
  activeLang?: "EN" | "ES";
  githubUrl?: string;
  showTerminalBtn?: boolean;
  showThemeToggle?: boolean;
}

export const NAVBAR_COMPONENT_DEFINITION: ComponentDefinition = {
  id: "comp_ivn_navbar",
  name: "Navbar Developer IVN",
  category: "hero",
  description: "Barra de navegación sticky con logo, enlaces de secciones, selector de idioma y accesos directos.",
  slots: [
    {
      id: "links",
      name: "Enlaces de Navegación",
      description: "Rutas y anclas de navegación principal.",
      accepts: ["button", "text"],
      cardinality: "zero-or-more",
    },
  ],
  defaultProps: {
    logoText: "IVN",
    logoDotColor: "#f97316",
    links: [
      { id: "nav-inicio", label: "Inicio", href: "#inicio", route: "/portfolio" },
      { id: "nav-panel", label: "Panel", href: "#panel" },
      { id: "nav-proyectos", label: "Proyectos", href: "#proyectos" },
      { id: "nav-contacto", label: "Contacto", href: "#contacto" },
    ],
    showLangToggle: true,
    activeLang: "EN",
    githubUrl: "https://github.com",
    showTerminalBtn: true,
    showThemeToggle: true,
  },
};

export function normalizeNavbarProps(rawProps?: Record<string, unknown>): NavbarProps {
  const defaults = NAVBAR_COMPONENT_DEFINITION.defaultProps as NavbarProps;
  if (!rawProps) return defaults;
  return {
    logoText: typeof rawProps.logoText === "string" ? rawProps.logoText : defaults.logoText,
    logoDotColor: typeof rawProps.logoDotColor === "string" ? rawProps.logoDotColor : defaults.logoDotColor,
    links: Array.isArray(rawProps.links) ? (rawProps.links as NavLinkItem[]) : defaults.links,
    showLangToggle: rawProps.showLangToggle !== undefined ? Boolean(rawProps.showLangToggle) : defaults.showLangToggle,
    activeLang: (rawProps.activeLang as NavbarProps["activeLang"]) || defaults.activeLang,
    githubUrl: typeof rawProps.githubUrl === "string" ? rawProps.githubUrl : defaults.githubUrl,
    showTerminalBtn: rawProps.showTerminalBtn !== undefined ? Boolean(rawProps.showTerminalBtn) : defaults.showTerminalBtn,
    showThemeToggle: rawProps.showThemeToggle !== undefined ? Boolean(rawProps.showThemeToggle) : defaults.showThemeToggle,
  };
}

export function renderNavbarTemplate(
  props: NavbarProps,
  brand?: BrandDTO,
  options?: { isInteractivePreview?: boolean }
): string {
  const p = normalizeNavbarProps(props as Record<string, unknown>);
  const interactive = options?.isInteractivePreview !== false;
  const subnodeAttr = (type: string, key?: string) => {
    if (!interactive) return "";
    return `data-subnode="${type}" ${key ? `data-subnode-key="${key}"` : ""} data-clickable="true"`;
  };

  const linksHtml = (p.links || []).map((l, idx) => `
    <a href="${l.href || '#'}" ${l.route ? `data-route-to="${l.route}"` : ''} ${subnodeAttr('nav-link', l.id || `nav-${idx}`)} 
       class="hover:text-white transition-colors cursor-pointer" style="color: #d4d4d8; font-size: 12px; font-weight: 600; text-decoration: none;">
      ${l.label}
    </a>
  `).join('');

  return `
    <header class="w-full sticky top-0 z-50 backdrop-blur-xl bg-[#0d0e12]/85 border-b border-white/[0.08] transition-all">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between" style="display: flex; align-items: center; justify-content: space-between;">
        <!-- Logo -->
        <a href="#inicio" data-route-to="/portfolio" ${subnodeAttr('logo', 'brand-logo')} class="flex items-center gap-1 text-lg font-black tracking-wider text-white hover:text-[var(--color-accent,#f97316)] transition-colors cursor-pointer" style="display: inline-flex; align-items: center; gap: 2px; text-decoration: none; color: #fff; font-size: 18px; font-weight: 900;">
          <span>${p.logoText || 'IVN'}</span><span style="color: ${p.logoDotColor || '#f97316'}; font-size: 20px; line-height: 1;">.</span>
        </a>

        <!-- Links principales -->
        <nav ${subnodeAttr('nav-container', 'links')} class="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wide text-zinc-300" style="display: flex; align-items: center; gap: 32px;">
          ${linksHtml}
        </nav>

        <!-- Badges y controles de la derecha -->
        <div ${subnodeAttr('nav-actions', 'right-controls')} class="flex items-center gap-3" style="display: flex; align-items: center; gap: 12px;">
          ${p.showLangToggle ? `
            <button type="button" class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:border-white/25 hover:text-white transition-all" style="padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #d4d4d8; font-size: 10px; font-weight: 700; cursor: pointer;">
              ${p.activeLang || 'EN'}
            </button>
          ` : ''}
          ${p.githubUrl ? `
            <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer" class="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all" title="GitHub" style="padding: 8px; color: #a1a1aa; border-radius: 9999px; display: inline-flex; align-items: center;">
              <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            </a>
          ` : ''}
          ${p.showTerminalBtn ? `
            <button type="button" class="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all" title="Terminal" style="padding: 8px; color: #a1a1aa; border-radius: 9999px; background: transparent; border: none; cursor: pointer;">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </button>
          ` : ''}
          ${p.showThemeToggle ? `
            <button type="button" class="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all" title="Modo Oscuro" style="padding: 8px; color: #a1a1aa; border-radius: 9999px; background: transparent; border: none; cursor: pointer;">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    </header>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// METRICS CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricItem {
  id: string;
  value: string;
  label: string;
  suffix?: string;
  tone?: "accent" | "neutral" | "success";
}

export interface MetricsProps {
  items?: MetricItem[];
  layout?: "grid" | "horizontal" | "cards";
  columns?: 2 | 3 | 4;
}

export const METRICS_COMPONENT_DEFINITION: ComponentDefinition = {
  id: "comp_ivn_metrics",
  name: "Barra de Métricas Iván Jonás",
  category: "metrics",
  description: "Franja de métricas e indicadores de impacto profesional con soporte de contadores y estilos.",
  slots: [
    {
      id: "items",
      name: "Indicadores Clave",
      description: "Contadores de años, proyectos y entregas.",
      accepts: ["metric"],
      cardinality: "zero-or-more",
    },
  ],
  defaultProps: {
    layout: "grid",
    columns: 4,
    items: [
      { id: "m1", value: "6+", label: "AÑOS EN TECNOLOGÍA", tone: "neutral" },
      { id: "m2", value: "6", label: "PROYECTOS EN PRODUCCIÓN", tone: "accent" },
      { id: "m3", value: "10+", label: "PROYECTOS ENTREGADOS", tone: "neutral" },
      { id: "m4", value: "~30", label: "SERVICIOS SELF-HOSTED", tone: "success" },
    ],
  },
};

export function normalizeMetricsProps(rawProps?: Record<string, unknown>): MetricsProps {
  const defaults = METRICS_COMPONENT_DEFINITION.defaultProps as MetricsProps;
  if (!rawProps) return defaults;
  return {
    layout: (rawProps.layout as MetricsProps["layout"]) || defaults.layout,
    columns: (rawProps.columns as MetricsProps["columns"]) || defaults.columns,
    items: Array.isArray(rawProps.items) ? (rawProps.items as MetricItem[]) : defaults.items,
  };
}

export function renderMetricsTemplate(
  props: MetricsProps,
  brand?: BrandDTO,
  options?: { isInteractivePreview?: boolean }
): string {
  const p = normalizeMetricsProps(props as Record<string, unknown>);
  const interactive = options?.isInteractivePreview !== false;
  const subnodeAttr = (type: string, key?: string) => {
    if (!interactive) return "";
    return `data-subnode="${type}" ${key ? `data-subnode-key="${key}"` : ""} data-clickable="true"`;
  };

  const primaryAccent = "#f0a470";

  const metricsHtml = (p.items || []).map((m, idx) => {
    let color = "#ffffff";
    if (m.tone === "accent") color = primaryAccent;
    else if (m.tone === "success") color = "#34d399";

    return `
      <div ${subnodeAttr('metric', m.id || `metric-${idx}`)} class="space-y-1" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;">
        <div style="font-size: clamp(2rem, 3.5vw, 2.5rem); font-weight: 900; font-family: monospace; color: ${color}; letter-spacing: -0.02em; line-height: 1;">
          ${m.value}
        </div>
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-top: 6px;">
          ${m.label}
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="w-full py-8 border-y border-white/[0.08] bg-[#0d0e12]/60 backdrop-blur-sm" style="border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(13,14,18,0.6); backdrop-filter: blur(8px); padding: 32px 24px;">
      <div class="max-w-6xl mx-auto px-6" style="max-width: 1180px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 24px; text-align: center;">
          ${metricsHtml}
        </div>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// BENTO GRID CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

export interface BentoTimelineItem {
  id: string;
  period: string;
  role: string;
  company: string;
  description: string;
  badge?: string;
}

export interface BentoServiceItem {
  id: string;
  name: string;
  status: string;
  category: string;
  description: string;
}

export interface BentoCustomCard {
  id: string;
  title: string;
  value?: string;
  badge?: string;
  description: string;
  colSpan?: 3 | 4 | 6 | 12;
}

export interface BentoProps {
  title?: string;
  subtitle?: string;
  activeTab?: "github" | "trayectoria" | "infraestructura" | "custom";
  githubStats?: {
    reposCount: number;
    reposBadge?: string;
    prsCount: number;
    starsCount: number;
    memberSince: number;
    terminalSnippet?: string;
  };
  timeline?: BentoTimelineItem[];
  services?: BentoServiceItem[];
  customCards?: BentoCustomCard[];
  layout?: {
    maxWidth?: "4xl" | "6xl" | "7xl" | "full";
    paddingY?: "compact" | "normal" | "spacious";
    showTabs?: boolean;
  };
}

export const BENTO_COMPONENT_DEFINITION: ComponentDefinition = {
  id: "comp_ivn_bento_numbers",
  name: "Bento Grid Iván en Números (Interactivo)",
  category: "features",
  description: "Cuadrícula interactiva con pestañas de GitHub, Trayectoria laboral e Infraestructura con terminal interactiva.",
  slots: [],
  defaultProps: {
    title: "Iván en números",
    subtitle: "Mi actividad en GitHub, mi trayectoria y mi infraestructura · datos en vivo.",
    activeTab: "github",
    githubStats: {
      reposCount: 16,
      reposBadge: "+3 en 2026",
      prsCount: 5,
      starsCount: 3,
      memberSince: 2013,
      terminalSnippet: "14 containers healthy (caddy, n8n, postgres...)",
    },
    timeline: [
      { id: "t1", period: "2024 - 2026", role: "Tech Lead & Senior Frontend", company: "Golden Path Studio", description: "Arquitectura de componentes reactivos y sistemas web de alto rendimiento.", badge: "Actual" },
      { id: "t2", period: "2021 - 2024", role: "Full-Stack Developer", company: "Cloud & DevOps Systems", description: "Microservicios, pipelines CI/CD y despliegue distribuido en contenedores.", badge: "Producción" },
      { id: "t3", period: "2018 - 2021", role: "Frontend UI Specialist", company: "Digital Agency", description: "Interfaces de usuario de alta fidelidad orientadas a conversión.", badge: "Core UI" },
    ],
    services: [
      { id: "s1", name: "Caddy Reverse Proxy", status: "Healthy", category: "Edge Routing", description: "SSL automático y balanceo de carga para servicios locales." },
      { id: "s2", name: "n8n Workflow Engine", status: "Active", category: "Automation", description: "Pipelines de integración continua y sincronización de datos." },
      { id: "s3", name: "PostgreSQL Database", status: "Healthy", category: "Persistence", description: "Base de datos transaccional con réplicas y copias automatizadas." },
      { id: "s4", name: "Docker Swarm Cluster", status: "Operational", category: "Orchestration", description: "Contenedores orquestados con reinicio automático 24/7." },
    ],
    customCards: [
      { id: "c1", title: "Rendimiento Web", value: "99+", badge: "Lighthouse", description: "Métricas Core Web Vitals en rango óptimo para todos los dispositivos.", colSpan: 6 },
      { id: "c2", title: "Diseño Procedural", value: "100%", badge: "CSS Tokens", description: "Sincronización total entre tokens de diseño y runtime visual.", colSpan: 6 },
    ],
    layout: {
      maxWidth: "6xl",
      paddingY: "normal",
      showTabs: true,
    },
  },
};

export function normalizeBentoProps(rawProps?: Record<string, unknown>): BentoProps {
  const defaults = BENTO_COMPONENT_DEFINITION.defaultProps as BentoProps;
  if (!rawProps) return defaults;
  return {
    title: typeof rawProps.title === "string" ? rawProps.title : defaults.title,
    subtitle: typeof rawProps.subtitle === "string" ? rawProps.subtitle : defaults.subtitle,
    activeTab: (rawProps.activeTab as BentoProps["activeTab"]) || defaults.activeTab,
    githubStats: (rawProps.githubStats as BentoProps["githubStats"]) || defaults.githubStats,
    timeline: Array.isArray(rawProps.timeline) ? (rawProps.timeline as BentoTimelineItem[]) : defaults.timeline,
    services: Array.isArray(rawProps.services) ? (rawProps.services as BentoServiceItem[]) : defaults.services,
    customCards: Array.isArray(rawProps.customCards) ? (rawProps.customCards as BentoCustomCard[]) : defaults.customCards,
    layout: (rawProps.layout as BentoProps["layout"]) || defaults.layout,
  };
}

export function renderBentoTemplate(
  props: BentoProps,
  brand?: BrandDTO,
  options?: { isInteractivePreview?: boolean }
): string {
  const p = normalizeBentoProps(props as Record<string, unknown>);
  const interactive = options?.isInteractivePreview !== false;
  const subnodeAttr = (type: string, key?: string) => {
    if (!interactive) return "";
    return `data-subnode="${type}" ${key ? `data-subnode-key="${key}"` : ""} data-clickable="true"`;
  };

  const gh = p.githubStats || {
    reposCount: 16,
    reposBadge: "+3 en 2026",
    prsCount: 5,
    starsCount: 3,
    memberSince: 2013,
    terminalSnippet: "14 containers healthy (caddy, n8n, postgres...)",
  };

  const paddingYClass = p.layout?.paddingY === "compact" ? "py-10" : p.layout?.paddingY === "spacious" ? "py-32" : "py-16 md:py-24";
  const maxWidthClass = p.layout?.maxWidth === "4xl" ? "max-w-4xl" : p.layout?.maxWidth === "7xl" ? "max-w-7xl" : p.layout?.maxWidth === "full" ? "w-full" : "max-w-6xl";
  const showTabs = p.layout?.showTabs !== false;
  const activeTab = p.activeTab || "github";

  const getTabBtnStyle = (tab: string) => {
    if (activeTab === tab) {
      return "border-radius: 9999px; background: #f0a470; color: #000; font-weight: 700; padding: 8px 20px; font-size: 12px; border: none; cursor: pointer; transition: all 0.2s ease;";
    }
    return "border-radius: 9999px; background: transparent; color: #94a3b8; font-weight: 600; padding: 8px 20px; font-size: 12px; border: none; cursor: pointer; transition: all 0.2s ease;";
  };

  let cardsContent = "";

  if (activeTab === "trayectoria") {
    const timelineList = p.timeline || [];
    cardsContent = `
      <div style="grid-column: span 12; display: flex; flex-direction: column; gap: 14px;">
        ${timelineList.map((item, idx) => `
          <div ${subnodeAttr('bento-timeline', item.id || `timeline-${idx}`)} style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #12141c; padding: 22px 26px; display: flex; flex-direction: column; gap: 8px; border-left: 3px solid #f0a470;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: #f0a470; background: rgba(240,164,112,0.12); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(240,164,112,0.3);">${esc(item.period)}</span>
                <span style="font-size: 15px; font-weight: 800; color: #fff;">${esc(item.role)}</span>
              </div>
              <span style="font-size: 12px; color: #a1a1aa; font-family: monospace; font-weight: 600;">@ ${esc(item.company)}</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">${esc(item.description)}</p>
          </div>
        `).join('')}
      </div>
    `;
  } else if (activeTab === "infraestructura") {
    const servicesList = p.services || [];
    cardsContent = `
      <!-- Terminal Cluster Banner -->
      <div ${subnodeAttr('bento-card', 'terminal-cluster')} style="grid-column: span 12; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); background: #0d0e14; padding: 20px 24px; font-family: monospace; font-size: 12px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
            <span style="color: #71717a; font-size: 11px; margin-left: 8px;">cluster@homelab:~$</span>
          </div>
          <span style="color: #f0a470; font-size: 10px; font-weight: 700;">4/4 NODES OPERATIONAL</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <p style="margin: 0; color: #f0a470; font-weight: 600;">${esc(gh.terminalSnippet || '14 containers healthy (caddy, n8n, postgres...)')}</p>
          <span style="font-size: 11px; color: #71717a;">Uptime: 99.98%</span>
        </div>
      </div>

      <!-- Services Grid -->
      ${servicesList.map((srv, idx) => `
        <div ${subnodeAttr('bento-service', srv.id || `service-${idx}`)} style="grid-column: span 6; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #12141c; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: #f0a470; text-transform: uppercase;">${esc(srv.category)}</span>
            <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-family: monospace; color: #34d399; font-weight: 700;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span> ${esc(srv.status)}
            </span>
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px;">${esc(srv.name)}</div>
            <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">${esc(srv.description)}</p>
          </div>
        </div>
      `).join('')}
    `;
  } else if (activeTab === "custom" && p.customCards && p.customCards.length > 0) {
    cardsContent = p.customCards.map((card, idx) => {
      const col = card.colSpan === 12 ? 12 : card.colSpan === 6 ? 6 : card.colSpan === 4 ? 4 : 3;
      return `
        <div ${subnodeAttr('bento-custom', card.id || `custom-${idx}`)} style="grid-column: span ${col}; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #12141c; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: #94a3b8; text-transform: uppercase;">${esc(card.title)}</span>
            ${card.badge ? `<span style="font-size: 10px; font-family: monospace; font-weight: 700; color: #f0a470; background: rgba(240,164,112,0.12); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(240,164,112,0.3);">${esc(card.badge)}</span>` : ""}
          </div>
          ${card.value ? `<div style="font-size: 2.2rem; font-weight: 900; font-family: monospace; color: #fff;">${esc(card.value)}</div>` : ""}
          <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">${esc(card.description)}</p>
        </div>
      `;
    }).join('');
  } else {
    // Modo GitHub por defecto
    cardsContent = `
      <!-- Card 1: Repos -->
      <div ${subnodeAttr('bento-card', 'repos')} style="grid-column: span 3; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #12141c; padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: #94a3b8;">REPOSITORIOS</span>
        <div style="padding: 16px 0;">
          <div style="font-size: 2.4rem; font-weight: 900; font-family: monospace; color: #fff;">${gh.reposCount}</div>
          <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-family: monospace; color: #34d399; font-weight: 700; margin-top: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span> ${esc(gh.reposBadge || '+3 en 2026')}
          </span>
        </div>
      </div>

      <!-- Card 2: Terminal -->
      <div ${subnodeAttr('bento-card', 'terminal')} style="grid-column: span 6; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #0d0e14; padding: 24px; font-family: monospace; font-size: 12px; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
            <span style="color: #71717a; font-size: 10px; margin-left: 8px;">ivan@pesoz:~$</span>
          </div>
          <span style="color: #52525b; font-size: 9px;">bash 5.2</span>
        </div>
        <div style="padding: 16px 0; display: flex; flex-direction: column; gap: 6px;">
          <p style="margin: 0; color: #94a3b8;"><span style="color: #34d399;">$</span> docker ps --format "table {{.Names}}\t{{.Status}}"</p>
          <p style="margin: 0; color: #f0a470; font-weight: 600;">${esc(gh.terminalSnippet || '14 containers healthy (caddy, n8n, postgres...)')}</p>
        </div>
        <div style="color: #71717a; font-size: 10px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399;"></span> Cluster Homelab 24/7
        </div>
      </div>

      <!-- Card 3: PRs -->
      <div ${subnodeAttr('bento-card', 'prs')} style="grid-column: span 3; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #12141c; padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: #94a3b8;">PULL REQUESTS</span>
        <div style="padding: 16px 0;">
          <div style="font-size: 2.4rem; font-weight: 900; font-family: monospace; color: #fff;">${gh.prsCount}</div>
          <div style="font-size: 10px; color: #94a3b8; font-family: monospace; margin-top: 4px;">Contribuciones activas</div>
        </div>
      </div>

      <!-- Card 4: Stars -->
      <div ${subnodeAttr('bento-card', 'stars')} style="grid-column: span 6; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #12141c; padding: 24px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: #94a3b8;">STARS RECIBIDAS</span>
          <div style="font-size: 2rem; font-weight: 900; font-family: monospace; color: #fff; margin-top: 4px;">${gh.starsCount}</div>
        </div>
        <svg style="width: 24px; height: 24px; color: #f0a470;" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </div>

      <!-- Card 5: Miembro -->
      <div ${subnodeAttr('bento-card', 'member')} style="grid-column: span 6; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: #12141c; padding: 24px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: #94a3b8;">EN GITHUB DESDE</span>
          <div style="font-size: 2rem; font-weight: 900; font-family: monospace; color: #fff; margin-top: 4px;">${gh.memberSince}</div>
        </div>
        <svg style="width: 24px; height: 24px; color: #f0a470;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      </div>
    `;
  }

  return `
    <section id="panel" class="w-full ${paddingYClass} bg-[#0d0e12] border-t border-white/[0.08]">
      <div class="${maxWidthClass} mx-auto px-6 space-y-10" style="display: flex; flex-direction: column; gap: 40px;">
        <!-- Título -->
        <div style="text-align: center; display: flex; flex-direction: column; gap: 8px;">
          <h2 ${subnodeAttr('heading', 'bento-title')} style="margin: 0; font-size: 2.2rem; font-weight: 900; color: #fff; letter-spacing: -0.02em;">
            ${esc(p.title || 'Iván en números')}
          </h2>
          <p ${subnodeAttr('text', 'bento-subtitle')} style="margin: 0; font-size: 13px; color: #94a3b8;">
            ${esc(p.subtitle || 'Mi actividad en GitHub, mi trayectoria y mi infraestructura · datos en vivo.')}
          </p>
        </div>

        ${showTabs ? `
        <!-- Pestañas -->
        <div style="display: flex; justify-content: center;">
          <div style="display: inline-flex; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.1); background: #141620; padding: 4px; gap: 4px;">
            <button type="button" ${subnodeAttr('bento-tab', 'github')} style="${getTabBtnStyle('github')}">
              GitHub
            </button>
            <button type="button" ${subnodeAttr('bento-tab', 'trayectoria')} style="${getTabBtnStyle('trayectoria')}">
              Trayectoria
            </button>
            <button type="button" ${subnodeAttr('bento-tab', 'infraestructura')} style="${getTabBtnStyle('infraestructura')}">
              Infraestructura
            </button>
            ${p.customCards && p.customCards.length > 0 ? `
              <button type="button" ${subnodeAttr('bento-tab', 'custom')} style="${getTabBtnStyle('custom')}">
                Personalizado
              </button>
            ` : ""}
          </div>
        </div>` : ""}

        <!-- Bento Grid Cards -->
        <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px;">
          ${cardsContent}
        </div>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

export interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
}

export interface ContactFormFieldItem {
  id: string;
  label: string;
  type: string;
  required?: boolean;
}

export interface ContactProps {
  statusBadge?: string;
  title?: string;
  subtitle?: string;
  terminalHeader?: string;
  motives?: string[];
  submitButtonText?: string;
  email?: string;
  socialLinks?: SocialLinkItem[];
  formFields?: ContactFormFieldItem[];
  layout?: {
    maxWidth?: "4xl" | "6xl" | "7xl" | "full";
    paddingY?: "compact" | "normal" | "spacious";
  };
}

export const CONTACT_COMPONENT_DEFINITION: ComponentDefinition = {
  id: "comp_ivn_contact",
  name: "Terminal de Contacto Iván Jonás",
  category: "cta",
  description: "Caja de contacto estilo terminal interactiva con formulario y canales directos.",
  slots: [],
  defaultProps: {
    statusBadge: "DISPONIBLE PARA NUEVOS RETOS",
    title: "Trabajemos juntos",
    subtitle: "¿Buscas un perfil full-stack / DevOps, un colaborador o un freelance? Cuéntame qué necesitas y te respondo en menos de 24 h.",
    terminalHeader: "ivan@pesoz:~/contacto",
    motives: ["Oportunidad laboral", "Colaboración", "Proyecto freelance", "Otro"],
    submitButtonText: "Enviar mensaje",
    email: "contacto@ivanjonasfc.dev",
  },
};

export function normalizeContactProps(rawProps?: Record<string, unknown>): ContactProps {
  const defaults = CONTACT_COMPONENT_DEFINITION.defaultProps as ContactProps;
  if (!rawProps) return defaults;
  return {
    statusBadge: typeof rawProps.statusBadge === "string" ? rawProps.statusBadge : defaults.statusBadge,
    title: typeof rawProps.title === "string" ? rawProps.title : defaults.title,
    subtitle: typeof rawProps.subtitle === "string" ? rawProps.subtitle : defaults.subtitle,
    terminalHeader: typeof rawProps.terminalHeader === "string" ? rawProps.terminalHeader : defaults.terminalHeader,
    motives: Array.isArray(rawProps.motives) ? (rawProps.motives as string[]) : defaults.motives,
    submitButtonText: typeof rawProps.submitButtonText === "string" ? rawProps.submitButtonText : defaults.submitButtonText,
    email: typeof rawProps.email === "string" ? rawProps.email : defaults.email,
    socialLinks: Array.isArray(rawProps.socialLinks) ? (rawProps.socialLinks as SocialLinkItem[]) : undefined,
    formFields: Array.isArray(rawProps.formFields) ? (rawProps.formFields as ContactFormFieldItem[]) : undefined,
    layout: rawProps.layout ? (rawProps.layout as ContactProps["layout"]) : undefined,
  };
}

export function renderContactTemplate(
  props: ContactProps,
  brand?: BrandDTO,
  options?: { isInteractivePreview?: boolean }
): string {
  const p = normalizeContactProps(props as Record<string, unknown>);
  const interactive = options?.isInteractivePreview !== false;
  const subnodeAttr = (type: string, key?: string) => {
    if (!interactive) return "";
    return `data-subnode="${type}" ${key ? `data-subnode-key="${key}"` : ""} data-clickable="true"`;
  };

  const pad = p.layout?.paddingY === "compact" ? "48px 24px" : p.layout?.paddingY === "spacious" ? "128px 24px" : "64px 24px";
  const maxW = p.layout?.maxWidth === "6xl" ? "1152px" : p.layout?.maxWidth === "7xl" ? "1280px" : p.layout?.maxWidth === "full" ? "100%" : "896px";

  const motivesHtml = (p.motives || []).map((m, idx) => `
    <label style="cursor: pointer;">
      <span style="display: inline-block; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); padding: 6px 14px; font-size: 12px; color: ${idx === 0 ? '#f0a470' : '#a1a1aa'}; background: ${idx === 0 ? 'rgba(240,164,112,0.15)' : 'transparent'}; font-weight: ${idx === 0 ? '700' : '500'};">
        ${m}
      </span>
    </label>
  `).join('');

  return `
    <section id="contacto" class="w-full relative overflow-hidden bg-transparent" style="padding: ${pad};">
      <div class="mx-auto relative z-10" style="max-width: ${maxW}; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div ${subnodeAttr('badge', 'contact-status')} style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 9999px; background: rgba(240,164,112,0.1); border: 1px solid rgba(240,164,112,0.3); color: #f0a470; font-size: 11px; font-family: monospace; font-weight: 600; margin-bottom: 12px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span>
            ${p.statusBadge || 'DISPONIBLE PARA NUEVOS RETOS'}
          </div>
          <h2 ${subnodeAttr('heading', 'contact-title')} style="margin: 0; font-size: 2.4rem; font-weight: 900; color: #fff; letter-spacing: -0.02em;">
            ${p.title || 'Trabajemos juntos'}<span style="color: #f0a470;">.</span>
          </h2>
          <p ${subnodeAttr('text', 'contact-subtitle')} style="font-size: 14px; color: #94a3b8; margin-top: 8px; max-width: 560px; margin-left: auto; margin-right: auto;">
            ${p.subtitle || '¿Buscas un perfil full-stack / DevOps, un colaborador o un freelance?'}
          </p>
        </div>

        <div ${subnodeAttr('contact-terminal', 'form-terminal')} style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); background: rgba(13,14,20,0.9); backdrop-filter: blur(16px); overflow: hidden; font-family: monospace; font-size: 13px;">
          <div style="height: 40px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 16px; gap: 8px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
            <span style="margin-left: 12px; font-size: 11px; color: #71717a;">${p.terminalHeader || 'ivan@pesoz:~/contacto'}</span>
          </div>

          <form style="padding: 24px; display: flex; flex-direction: column; gap: 20px;" onsubmit="event.preventDefault(); alert('Mensaje enviado');">
            <div>
              <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">
                <span style="color: #f0a470;">#</span> ¿Qué te trae por aquí?
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${motivesHtml}
              </div>
            </div>

            ${(p.formFields && p.formFields.length > 0) ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                ${p.formFields.map((f, i) => `
                  <div style="${f.type === 'textarea' ? 'grid-column: 1 / -1;' : ''}">
                    <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 6px;">
                      <span style="color: #34d399;">$</span> ${esc(f.label)}${f.required ? ' <span style="color:#ef4444;">*</span>' : ''}
                    </label>
                    <div style="display: flex; align-items: ${f.type === 'textarea' ? 'flex-start' : 'center'}; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
                      <span style="color: #f0a470; ${f.type === 'textarea' ? 'padding-top: 4px;' : ''}">↳</span>
                      ${f.type === 'textarea'
                        ? `<textarea rows="3" placeholder="${esc(f.label)}..." style="width: 100%; background: transparent; color: #fff; font-size: 12px; border: none; outline: none; resize: none; font-family: monospace;"></textarea>`
                        : `<input type="${esc(f.type || 'text')}" placeholder="${esc(f.label)}..." style="width: 100%; background: transparent; color: #fff; font-size: 12px; border: none; outline: none; font-family: monospace;" />`
                      }
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                <div>
                  <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 6px;"><span style="color: #34d399;">$</span> ¿Cómo te llamas?</label>
                  <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
                    <span style="color: #f0a470;">↳</span>
                    <input type="text" placeholder="Nombre / Empresa" style="width: 100%; background: transparent; color: #fff; font-size: 12px; border: none; outline: none; font-family: monospace;" />
                  </div>
                </div>
                <div>
                  <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 6px;"><span style="color: #34d399;">$</span> ¿Tu correo?</label>
                  <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
                    <span style="color: #f0a470;">↳</span>
                    <input type="email" placeholder="tu@correo.com" style="width: 100%; background: transparent; color: #fff; font-size: 12px; border: none; outline: none; font-family: monospace;" />
                  </div>
                </div>
              </div>

              <div>
                <label style="font-size: 12px; color: #94a3b8; display: block; margin-bottom: 6px;"><span style="color: #f0a470;">#</span> Cuéntame los detalles</label>
                <div style="display: flex; align-items: flex-start; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
                  <span style="color: #f0a470; padding-top: 4px;">↳</span>
                  <textarea rows="3" placeholder="Rol, proyecto, stack tecnológico..." style="width: 100%; background: transparent; color: #fff; font-size: 12px; border: none; outline: none; resize: none; font-family: monospace;"></textarea>
                </div>
              </div>
            `}

            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding-top: 8px;">
              <button ${subnodeAttr('button', 'submit-contact')} type="submit" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; background: #f0a470; color: #000; font-weight: 800; font-size: 12px; border: none; cursor: pointer;">
                <span>${p.submitButtonText || 'Enviar mensaje'}</span>
              </button>
              <p style="font-size: 11px; color: #71717a; margin: 0;">Sin spam. Tus datos solo se usan para responderte.</p>
            </div>

            ${(p.socialLinks && p.socialLinks.length > 0) ? `
              <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.1); flex-wrap: wrap;">
                <span style="font-size: 11px; color: #71717a; text-transform: uppercase;">// Canales Directos:</span>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${p.socialLinks.map((s) => `
                    <a href="${esc(s.url || '#')}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #d4d4d8; font-size: 11px; text-decoration: none; font-family: monospace;">
                      <span>${esc(s.platform)}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f0a470" stroke-width="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
                    </a>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </form>
        </div>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterSectionItem {
  title: string;
  links: FooterLinkItem[];
}

export interface FooterProps {
  logoText?: string;
  copyrightText?: string;
  tagline?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  email?: string;
  footerSections?: FooterSectionItem[];
  layout?: {
    maxWidth?: "4xl" | "6xl" | "7xl" | "full";
    paddingY?: "compact" | "normal" | "spacious";
  };
}

export const FOOTER_COMPONENT_DEFINITION: ComponentDefinition = {
  id: "comp_ivn_footer",
  name: "Footer Minimalista Iván Jonás",
  category: "hero",
  description: "Pie de página oscuro con enlaces a redes y copyright legal.",
  slots: [],
  defaultProps: {
    logoText: "IVN.",
    copyrightText: "© 2026 Iván Jonás Fernández Correa",
    githubUrl: "https://github.com/IvanjonasFC",
    linkedinUrl: "https://linkedin.com",
    email: "contacto@ivanjonasfc.dev",
  },
};

export function normalizeFooterProps(rawProps?: Record<string, unknown>): FooterProps {
  const defaults = FOOTER_COMPONENT_DEFINITION.defaultProps as FooterProps;
  if (!rawProps) return defaults;
  return {
    logoText: typeof rawProps.logoText === "string" ? rawProps.logoText : defaults.logoText,
    copyrightText: typeof rawProps.copyrightText === "string" ? rawProps.copyrightText : defaults.copyrightText,
    tagline: typeof rawProps.tagline === "string" ? rawProps.tagline : undefined,
    githubUrl: typeof rawProps.githubUrl === "string" ? rawProps.githubUrl : defaults.githubUrl,
    linkedinUrl: typeof rawProps.linkedinUrl === "string" ? rawProps.linkedinUrl : defaults.linkedinUrl,
    email: typeof rawProps.email === "string" ? rawProps.email : defaults.email,
    footerSections: Array.isArray(rawProps.footerSections) ? (rawProps.footerSections as FooterSectionItem[]) : undefined,
    layout: rawProps.layout ? (rawProps.layout as FooterProps["layout"]) : undefined,
  };
}

export function renderFooterTemplate(
  props: FooterProps,
  brand?: BrandDTO,
  options?: { isInteractivePreview?: boolean }
): string {
  const p = normalizeFooterProps(props as Record<string, unknown>);
  const interactive = options?.isInteractivePreview !== false;
  const subnodeAttr = (type: string, key?: string) => {
    if (!interactive) return "";
    return `data-subnode="${type}" ${key ? `data-subnode-key="${key}"` : ""} data-clickable="true"`;
  };

  const pad = p.layout?.paddingY === "compact" ? "24px 24px" : p.layout?.paddingY === "spacious" ? "64px 24px" : "40px 24px";
  const maxW = p.layout?.maxWidth === "4xl" ? "896px" : p.layout?.maxWidth === "7xl" ? "1280px" : p.layout?.maxWidth === "full" ? "100%" : "1180px";

  const sectionsHtml = (p.footerSections && p.footerSections.length > 0)
    ? `
      <div style="width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 28px; padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        ${p.footerSections.map((sec, sIdx) => `
          <div>
            <h4 style="color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px 0; font-family: monospace;">${esc(sec.title || `Sección ${sIdx + 1}`)}</h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
              ${(sec.links || []).map((link, lIdx) => `
                <li>
                  <a href="${esc(link.href || '#')}" ${subnodeAttr('footer-link', `sec-${sIdx}-link-${lIdx}`)} style="color: #a1a1aa; text-decoration: none; font-size: 12px; transition: color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#a1a1aa'">
                    ${esc(link.label || 'Enlace')}
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `
    : '';

  return `
    <footer id="contacto-footer" class="w-full border-t border-white/[0.08] bg-[#08090d] text-zinc-400 text-xs" style="padding: ${pad}; border-top: 1px solid rgba(255,255,255,0.08); background: #08090d; color: #a1a1aa; font-size: 12px;">
      <div class="mx-auto px-6 flex flex-col items-stretch gap-6" style="max-width: ${maxW}; margin: 0 auto;">
        ${sectionsHtml}
        <div class="flex flex-col sm:flex-row items-center justify-between gap-6" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; width: 100%;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #fff; font-weight: 700; font-family: monospace; letter-spacing: 0.05em;">${p.logoText || 'IVN.'}</span>
              <span style="color: #52525b;">•</span>
              <span ${subnodeAttr('text', 'copyright')}>${p.copyrightText || '© 2026 Iván Jonás Fernández Correa'}</span>
            </div>
            ${p.tagline ? `<p style="font-size: 11px; color: #71717a; margin: 0;">${esc(p.tagline)}</p>` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 16px;">
            ${p.githubUrl ? `
              <a ${subnodeAttr('button', 'footer-github')} href="${p.githubUrl}" target="_blank" rel="noopener noreferrer" style="color: #a1a1aa; text-decoration: none;" title="GitHub">GitHub</a>
            ` : ''}
            ${p.linkedinUrl ? `
              <a ${subnodeAttr('button', 'footer-linkedin')} href="${p.linkedinUrl}" target="_blank" rel="noopener noreferrer" style="color: #a1a1aa; text-decoration: none;" title="LinkedIn">LinkedIn</a>
            ` : ''}
            ${p.email ? `
              <a ${subnodeAttr('button', 'footer-email')} href="mailto:${p.email}" style="color: #a1a1aa; text-decoration: none;" title="Email">Email</a>
            ` : ''}
          </div>
        </div>
      </div>
    </footer>
  `;
}

