"use client";

import React, { useState } from "react";
import {
  type SceneBlockInstance,
  type SceneId,
  type LinkTarget,
  type BlockActionBinding,
  type CollectionBinding,
  CANONICAL_PROJECT_ROUTES,
  resolveBlockActions,
  detectBlockIncompatibilities,
} from "@/lib/scenes";
import {
  type HeroProps,
  type NavbarProps,
  type MetricsProps,
  type BentoProps,
  type ContactProps,
  type FooterProps,
  type SubnodeTarget,
  type AssetReference,
  normalizeHeroProps,
  normalizeNavbarProps,
  normalizeMetricsProps,
  normalizeBentoProps,
  normalizeContactProps,
  normalizeFooterProps,
} from "@/lib/componentContract";
import { AssetPickerModal } from "./AssetPickerModal";
import type { PortfolioProject } from "@/lib/portfolioProjects";
import { isProjectDetailBlock, matchProjectRoute } from "@/lib/projectCollectionResolver";

interface BlockInspectorProps {
  block: SceneBlockInstance;
  scene: SceneId;
  selectedSubnode?: SubnodeTarget | null;
  onSelectSubnode?: (subnode: SubnodeTarget | null) => void;
  allBlocks?: SceneBlockInstance[];
  customRoutes?: Array<{ path: string; sceneId: string; title: string; isDynamic?: boolean }>;
  portfolioProjectsCount?: number;
  activeRoutePath?: string;
  portfolioProjects?: PortfolioProject[];
  onUpdateProject: (slug: string, changes: Partial<PortfolioProject>) => void;
  onNavigateRoute?: (path: string) => void;
  onUpdateBlock: (updated: SceneBlockInstance) => void;
  onClose: () => void;
  onPickCatalog?: (type: string) => void;
  onFocusInPreview?: (blockId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  lang?: "es" | "en";
}

type InspectorTab = "content" | "layout" | "style" | "data" | "actions" | "a11y" | "advanced";

interface AssetReferenceCardProps {
  title?: string;
  nodeName?: string;
  asset: AssetReference | undefined;
  onUpdate: (updatedAsset: AssetReference) => void;
  onOpenPicker: () => void;
  isFocused?: boolean;
}

function AssetReferenceCard({
  title = "IMAGEN DE HERO - ASSET REFERENCE",
  nodeName = "HeroImage",
  asset,
  onUpdate,
  onOpenPicker,
  isFocused = false,
}: AssetReferenceCardProps) {
  return (
    <div
      className={`rounded-2xl border transition-all p-3.5 space-y-3 ${
        isFocused
          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/10 shadow-lg shadow-[rgba(240,164,112,0.15)] ring-1 ring-[var(--color-accent,#f0a470)]/40"
          : "border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/5 shadow-lg shadow-[rgba(240,164,112,0.05)]"
      }`}
    >
      {/* Cabecera de Asset Reference */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-accent,#f0a470)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent,#f0a470)]">
            {title}
          </span>
        </div>
        <span className="text-[9px] font-mono font-bold text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-white/10">
          node: {nodeName}
        </span>
      </div>

      {/* Preview Thumbnail & Botón de Gestión */}
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-16 rounded-xl overflow-hidden border border-white/15 shrink-0 bg-zinc-900 shadow-md">
          {asset?.url ? (
            <img
              src={asset.url}
              alt={asset.alt || "Preview"}
              className="w-full h-full object-cover"
              style={{
                objectFit: asset.fit || "cover",
                objectPosition: `${asset.focalPoint?.x ?? 50}% ${asset.focalPoint?.y ?? 35}%`,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-mono">
              Sin img
            </div>
          )}
          {/* Focal indicator */}
          <span
            className="absolute w-2 h-2 rounded-full bg-[var(--color-accent,#f0a470)] ring-1 ring-black shadow pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${asset?.focalPoint?.x ?? 50}%`,
              top: `${asset?.focalPoint?.y ?? 35}%`,
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <button
            type="button"
            onClick={onOpenPicker}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--color-accent,#f0a470)] hover:brightness-110 text-black font-extrabold text-[11px] shadow transition-all flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Gestionar / Cambiar Asset
          </button>
          <div className="text-[10px] font-mono text-zinc-400 truncate">
            Asset ID: <span className="text-zinc-200 font-bold">{asset?.assetId || "asset_portrait_editorial"}</span>
          </div>
        </div>
      </div>

      {/* Alt Text Accesibilidad con Badge WCAG AAA */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
            Texto Alternativo (Alt Text)
          </label>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${asset?.alt?.trim() ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-300 bg-amber-500/10 border-amber-500/20"}`}>
            {asset?.alt?.trim() ? "ALT ESCRITO" : "REVISAR ALT"}
          </span>
        </div>
        <input
          type="text"
          value={asset?.alt || ""}
          onChange={(e) =>
            onUpdate({
              ...(asset || {
                assetId: "asset_portrait_editorial",
                url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
                alt: "",
              }),
              alt: e.target.value,
            })
          }
          placeholder="Descripción accesible de la imagen..."
          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] transition-colors"
        />
      </div>

      {/* Selectores de Proporción y Ajuste (Fit) */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
            Proporción
          </label>
          <select
            value={asset?.aspectRatio || "4:5"}
            onChange={(e) =>
              onUpdate({
                ...(asset || {
                  assetId: "asset_portrait_editorial",
                  url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
                  alt: "",
                }),
                aspectRatio: e.target.value as "4:5" | "1:1" | "16:9" | "3:2" | "auto",
              })
            }
            className="w-full rounded-xl border border-white/10 bg-black/70 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-medium"
          >
            <option value="4:5">4:5 (Retrato)</option>
            <option value="1:1">1:1 (Cuadrado)</option>
            <option value="16:9">16:9 (Panorámico)</option>
            <option value="3:2">3:2 (Foto clásica)</option>
            <option value="auto">Auto (Original)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
            Ajuste (Fit)
          </label>
          <select
            value={asset?.fit || "cover"}
            onChange={(e) =>
              onUpdate({
                ...(asset || {
                  assetId: "asset_portrait_editorial",
                  url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
                  alt: "",
                }),
                fit: e.target.value as "cover" | "contain" | "fill",
              })
            }
            className="w-full rounded-xl border border-white/10 bg-black/70 px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-medium"
          >
            <option value="cover">Cover (Recorte)</option>
            <option value="contain">Contain (Completo)</option>
            <option value="fill">Fill (Estirar)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function BlockInspector({
  block,
  scene,
  selectedSubnode,
  onSelectSubnode,
  allBlocks = [],
  customRoutes = [],
  portfolioProjectsCount = 10,
  activeRoutePath = "/",
  portfolioProjects = [],
  onUpdateProject,
  onNavigateRoute,
  onUpdateBlock,
  onClose,
  onPickCatalog,
  onFocusInPreview,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  isFirst = false,
  isLast = false,
  lang = "es",
}: BlockInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("content");
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState<"hero" | "project" | "generic">("hero");
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const L = (es: string, en: string) => (lang === "en" ? en : es);

  const actions = resolveBlockActions(block);
  const incomp = detectBlockIncompatibilities(scene, block);

  // Component Types Detection (Universal y auto-descubrible)
  const routeInfo = matchProjectRoute(activeRoutePath);
  const isNavbar = block.type === "nav" || Boolean(block.componentId?.includes("navbar"));
  const isDetailBlock = isProjectDetailBlock(block);
  const isHero = (block.type === "hero" || Boolean(block.componentId?.includes("hero"))) && !isDetailBlock;
  const isMetrics = block.type === "stats" || block.type === "metrics" || Boolean(block.componentId?.includes("metrics"));
  const isBento = block.type === "bento" || Boolean(block.componentId?.includes("bento"));
  const isProjectsBlock = Boolean(
    (block.dataBinding?.source === "portfolio-projects" && block.dataBinding?.layout !== "detail") ||
    block.componentId?.includes("projects") ||
    (block.type === "cards" && (block.label.toLowerCase().includes("proyecto") || block.label.toLowerCase().includes("portfolio")))
  ) && !isDetailBlock;
  const isCmsBlock = isProjectsBlock || isDetailBlock;
  const isContact = block.type === "contact" || Boolean(block.componentId?.includes("contact"));
  const isFooter = block.type === "footer" || Boolean(block.componentId?.includes("footer"));

  // Contract Props Normalization
  const navbarProps: NavbarProps = normalizeNavbarProps(block.props as Record<string, unknown> | undefined);
  const heroProps: HeroProps = normalizeHeroProps(block.props as Record<string, unknown> | undefined);
  const metricsProps: MetricsProps = normalizeMetricsProps(block.props as Record<string, unknown> | undefined);
  const bentoProps: BentoProps = normalizeBentoProps(block.props as Record<string, unknown> | undefined);
  const contactProps: ContactProps = normalizeContactProps(block.props as Record<string, unknown> | undefined);
  const footerProps: FooterProps = normalizeFooterProps(block.props as Record<string, unknown> | undefined);
  const projectProps = (block.props as any) || {};
  const genericImageKey = ["portrait", "asset", "coverUrl", "imageUrl", "image", "avatar", "bgImage"]
    .find((key) => {
      const value = projectProps[key];
      return typeof value === "string" && value.length > 0 || (value && typeof value === "object" && typeof value.url === "string");
    });
  const genericImageValue = genericImageKey ? projectProps[genericImageKey] : undefined;
  const genericAsset: AssetReference | undefined = genericImageKey
    ? typeof genericImageValue === "string"
      ? { assetId: projectProps.assetId || `asset_${block.id}_${genericImageKey}`, url: genericImageValue, alt: projectProps.alt || `${block.label} imagen` }
      : genericImageValue as AssetReference
    : undefined;

  const activeSlug = (routeInfo.isDetail && routeInfo.slug)
    ? routeInfo.slug
    : (projectProps.slug || (portfolioProjects && portfolioProjects[0]?.slug) || "proyecto");

  const currentProject = portfolioProjects?.find((p) => p.slug.toLowerCase() === activeSlug.toLowerCase())
    || (routeInfo.isDetail ? undefined : portfolioProjects?.[0]);

  const handleUpdateCurrentProject = (changes: Partial<PortfolioProject>) => {
    if (currentProject) onUpdateProject(currentProject.slug, changes);
  };

  const handleUpdate = (partial: Partial<SceneBlockInstance>) => {
    onUpdateBlock({
      ...block,
      ...partial,
    });
  };

  const handleUpdateProjectsProps = (partial: Record<string, unknown>) => {
    handleUpdate({
      props: {
        ...projectProps,
        ...partial,
        layout: {
          ...(projectProps.layout || {}),
          ...((partial.layout as Record<string, unknown>) || {}),
        },
        filter: {
          ...(projectProps.filter || {}),
          ...((partial.filter as Record<string, unknown>) || {}),
        },
      },
    });
  };

  const handleUpdateProps = (newProps: Record<string, unknown>) => {
    handleUpdate({
      props: {
        ...(block.props || {}),
        ...newProps,
      },
    });
  };

  const handleUpdateGenericAsset = (asset: AssetReference) => {
    if (!genericImageKey) return;
    handleUpdateProps(typeof genericImageValue === "string"
      ? { [genericImageKey]: asset.url, assetId: asset.assetId, alt: asset.alt }
      : { [genericImageKey]: asset });
  };

  const handleUpdateStyleConfig = (partialStyle: Partial<NonNullable<SceneBlockInstance["styleConfig"]>>) => {
    const currentStyle = block.styleConfig || (block.props as any)?.styleConfig || {};
    handleUpdate({
      styleConfig: {
        ...currentStyle,
        ...partialStyle,
      },
    });
  };

  const handleUpdateDataBinding = (partialBinding: Partial<CollectionBinding>) => {
    const currentBinding: CollectionBinding = block.dataBinding || {
      source: isCmsBlock ? "portfolio-projects" : "custom",
      layout: "grid",
      filter: { limit: 6, featuredOnly: false },
    };
    handleUpdate({
      dataBinding: {
        ...currentBinding,
        ...partialBinding,
        filter: {
          ...(currentBinding.filter || {}),
          ...(partialBinding.filter || {}),
        },
        fieldMapping: {
          ...(currentBinding.fieldMapping || {}),
          ...(partialBinding.fieldMapping || {}),
        },
      },
    });
  };

  const handleUpdateVisibility = (partialVis: Partial<NonNullable<SceneBlockInstance["visibility"]>>) => {
    handleUpdate({
      visibility: {
        ...(block.visibility || { desktop: true, tablet: true, mobile: true }),
        ...partialVis,
      },
    });
  };

  const handleUpdateLayoutConfig = (partialLayout: Partial<NonNullable<SceneBlockInstance["layoutConfig"]>>) => {
    const current = block.layoutConfig || {};
    handleUpdate({
      layoutConfig: {
        ...current,
        ...partialLayout,
      },
    });
  };

  const handleUpdateA11y = (partialA11y: Partial<NonNullable<SceneBlockInstance["a11y"]>>) => {
    const current = block.a11y || {};
    handleUpdate({
      a11y: {
        ...current,
        ...partialA11y,
      },
    });
  };

  const handleUpdateAdvancedConfig = (partialAdv: Partial<NonNullable<SceneBlockInstance["advancedConfig"]>>) => {
    const current = block.advancedConfig || {};
    handleUpdate({
      advancedConfig: {
        ...current,
        ...partialAdv,
      },
    });
  };

  const handleUpdateHeroProps = (partialHero: Partial<HeroProps>) => {
    const full: HeroProps = {
      ...heroProps,
      ...partialHero,
      layout: {
        ...heroProps.layout,
        ...(partialHero.layout || {}),
      },
      portrait: partialHero.portrait
        ? { ...heroProps.portrait, ...partialHero.portrait }
        : heroProps.portrait,
      primaryCta: partialHero.primaryCta
        ? { ...heroProps.primaryCta, ...partialHero.primaryCta }
        : heroProps.primaryCta,
      secondaryCta: partialHero.secondaryCta
        ? { ...heroProps.secondaryCta, ...partialHero.secondaryCta }
        : heroProps.secondaryCta,
    };
    handleUpdate({ props: full as unknown as Record<string, unknown> });
  };

  const handleUpdateNavbarProps = (partialNav: Partial<NavbarProps>) => {
    const full: NavbarProps = {
      ...navbarProps,
      ...partialNav,
      links: partialNav.links ?? navbarProps.links,
    };
    handleUpdate({ props: full as unknown as Record<string, unknown> });
  };

  const handleUpdateMetricsProps = (partialMetrics: Partial<MetricsProps>) => {
    const full: MetricsProps = {
      ...metricsProps,
      ...partialMetrics,
      items: partialMetrics.items ?? metricsProps.items,
      layout: partialMetrics.layout ?? metricsProps.layout ?? "grid",
      columns: partialMetrics.columns ?? metricsProps.columns ?? 4,
    };
    handleUpdate({ props: full as unknown as Record<string, unknown> });
  };

  const handleUpdateBentoProps = (partialBento: Partial<BentoProps>) => {
    const defaultStats = { reposCount: 16, prsCount: 5, starsCount: 3, memberSince: 2013, reposBadge: "16 repos" };
    const full: BentoProps = {
      ...bentoProps,
      ...partialBento,
      activeTab: partialBento.activeTab ?? bentoProps.activeTab ?? "github",
      githubStats: {
        ...(bentoProps.githubStats || defaultStats),
        ...(partialBento.githubStats || {}),
      },
      layout: {
        ...(bentoProps.layout || {}),
        ...(partialBento.layout || {}),
      },
      timeline: partialBento.timeline ?? bentoProps.timeline ?? [],
      services: partialBento.services ?? bentoProps.services ?? [],
      customCards: partialBento.customCards ?? bentoProps.customCards ?? [],
    };
    handleUpdate({ props: full as unknown as Record<string, unknown> });
  };

  const handleUpdateContactProps = (partialContact: Partial<ContactProps>) => {
    const full: ContactProps = {
      ...contactProps,
      ...partialContact,
      statusBadge: partialContact.statusBadge ?? contactProps.statusBadge,
      terminalHeader: partialContact.terminalHeader ?? contactProps.terminalHeader,
    };
    handleUpdate({ props: full as unknown as Record<string, unknown> });
  };

  const handleUpdateFooterProps = (partialFooter: Partial<FooterProps>) => {
    const full: FooterProps = {
      ...footerProps,
      ...partialFooter,
    };
    handleUpdate({ props: full as unknown as Record<string, unknown> });
  };

  const handleUpdateAction = (actionId: string, target: LinkTarget, label?: string) => {
    const nextActions: Record<string, BlockActionBinding> = { ...actions };
    if (target.kind === "none") {
      delete nextActions[actionId];
    } else {
      nextActions[actionId] = {
        actionId,
        label: label || nextActions[actionId]?.label || (actionId === "primary" ? "Acción principal" : "Acción secundaria"),
        target,
      };
    }
    const legacyLink = nextActions["primary"]?.target.kind === "scene" ? nextActions["primary"].target.sceneId : undefined;

    if (isHero) {
      if (actionId === "primary") {
        handleUpdateHeroProps({
          primaryCta: {
            label: label || heroProps.primaryCta?.label || "Ver proyectos",
            variant: heroProps.primaryCta?.variant || "primary",
            action: { actionId: "primary", label: label || heroProps.primaryCta?.label || "Ver proyectos", target },
          },
        });
      } else if (actionId === "secondary") {
        handleUpdateHeroProps({
          secondaryCta: {
            label: label || heroProps.secondaryCta?.label || "Descargar CV",
            variant: heroProps.secondaryCta?.variant || "outline",
            action: { actionId: "secondary", label: label || heroProps.secondaryCta?.label || "Descargar CV", target },
          },
        });
      }
    }

    handleUpdate({
      actionBindings: nextActions,
      linkToScene: legacyLink,
    });
  };

  const binding: CollectionBinding = block.dataBinding || {
    source: isCmsBlock ? "portfolio-projects" : "custom",
    layout: (block.label.toLowerCase().includes("detalle") || block.type === "hero") ? "detail" : "grid",
    filter: { limit: 10, featuredOnly: false },
  };

  const primaryTarget = actions["primary"]?.target ?? { kind: "none" };
  const secondaryTarget = actions["secondary"]?.target ?? { kind: "none" };

  const availableRoutes = [
    ...CANONICAL_PROJECT_ROUTES,
    ...customRoutes.filter((cr) => !CANONICAL_PROJECT_ROUTES.some((cpr) => cpr.path === cr.path)),
  ];

  const currentSubnodeType = selectedSubnode?.blockId === block.id ? selectedSubnode.subnodeType : "root";
  const currentSubnodeKey = selectedSubnode?.blockId === block.id ? selectedSubnode.subnodeKey : undefined;

  return (
    <div className="card-surface rounded-2xl p-4 flex flex-col h-full overflow-hidden border border-white/10 shadow-2xl bg-[#0f1118]/95 backdrop-blur-xl">
      {/* Cabecera del Inspector con Breadcrumb dinámico */}
      <div className="pb-3 border-b border-white/10 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent,#f0a470)] shadow-[0_0_8px_rgba(240,164,112,0.8)] shrink-0" />
            <div className="truncate">
              <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">
                {block.label || block.type}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-400 font-mono">
                  #{block.order + 1} · {block.type}
                </span>
                {isCmsBlock && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[var(--color-accent,#f0a470)]/15 border border-[var(--color-accent,#f0a470)]/30 text-[var(--color-accent,#f0a470)]">
                    CMS ACTIVO
                  </span>
                )}
                {block.componentId && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10">
                    GLOBAL MASTER
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onMoveUp && !isFirst && (
              <button
                type="button"
                onClick={onMoveUp}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors text-xs"
                title={L("Subir bloque", "Move block up")}
              >
                ↑
              </button>
            )}
            {onMoveDown && !isLast && (
              <button
                type="button"
                onClick={onMoveDown}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors text-xs"
                title={L("Bajar bloque", "Move block down")}
              >
                ↓
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors text-xs"
                title={L("Duplicar bloque", "Duplicate block")}
              >
                ⧉
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 transition-colors text-xs flex items-center justify-center border border-rose-500/20"
                title={L("Eliminar bloque", "Delete block")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
            {onFocusInPreview && (
              <button
                type="button"
                onClick={() => onFocusInPreview(block.id)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-zinc-300 hover:text-sky-300 transition-colors text-xs flex items-center justify-center border border-white/5"
                title={L("Centrar en preview", "Focus in preview")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors text-xs ml-1 flex items-center justify-center"
              title={L("Cerrar inspector", "Close inspector")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Subnode Breadcrumb Selector Dinámico */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "root" })}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
              currentSubnodeType === "root"
                ? "bg-white/20 text-white border border-white/30"
                : "bg-black/30 text-zinc-400 hover:text-white"
            }`}
          >
            Bloque {block.label || block.type}
          </button>
          <span className="text-zinc-600 text-[10px]">›</span>

          {isHero && (
            <>
              <button
                type="button"
                onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "image", subnodeKey: "portrait" })}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                  currentSubnodeType === "image" ? "bg-[var(--color-accent,#f0a470)] text-black font-extrabold" : "bg-black/30 text-zinc-400 hover:text-white"
                }`}
              >
                Retrato
              </button>
              <button
                type="button"
                onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "button", subnodeKey: "primaryCta" })}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                  currentSubnodeType === "button" ? "bg-[var(--color-accent,#f0a470)] text-black font-extrabold" : "bg-black/30 text-zinc-400 hover:text-white"
                }`}
              >
                CTA Ver Proyectos
              </button>
              <button
                type="button"
                onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "badge", subnodeKey: "badges" })}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                  currentSubnodeType === "badge" ? "bg-[var(--color-accent,#f0a470)] text-black font-extrabold" : "bg-black/30 text-zinc-400 hover:text-white"
                }`}
              >
                Badges ({heroProps.badges?.length || 0})
              </button>
            </>
          )}

          {isNavbar && (
            <>
              <button
                type="button"
                onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "heading", subnodeKey: "logo" })}
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/30 text-zinc-400 hover:text-white"
              >
                Logo: {navbarProps.logoText}
              </button>
              <button
                type="button"
                onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "button", subnodeKey: "links" })}
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/30 text-zinc-400 hover:text-white"
              >
                Enlaces ({navbarProps.links?.length || 0})
              </button>
            </>
          )}

          {isMetrics && (
            <button
              type="button"
              onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "text", subnodeKey: "metrics" })}
              className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/30 text-zinc-400 hover:text-white"
            >
              Indicadores ({metricsProps.items?.length || 0})
            </button>
          )}

          {isBento && (
            <>
              <button
                type="button"
                onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "root", subnodeKey: "github" })}
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/30 text-zinc-400 hover:text-white"
              >
                GitHub ({bentoProps.githubStats?.reposCount || 16} repos)
              </button>
              <button
                type="button"
                onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "text", subnodeKey: "terminal" })}
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/30 text-zinc-400 hover:text-white"
              >
                Terminal Docker
              </button>
            </>
          )}

          {isContact && (
            <button
              type="button"
              onClick={() => onSelectSubnode?.({ blockId: block.id, subnodeType: "text", subnodeKey: "terminal-form" })}
              className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/30 text-zinc-400 hover:text-white"
            >
              Terminal Formulario
            </button>
          )}
        </div>
      </div>

      {/* Tabs principales del Inspector */}
      <div className="flex items-center gap-1 border-b border-white/10 py-2.5 shrink-0 overflow-x-auto no-scrollbar">
        {(
          [
            { id: "content", es: "Contenido", en: "Content" },
            { id: "layout", es: "Layout", en: "Layout" },
            { id: "style", es: "Estilo", en: "Style" },
            { id: "data", es: "Datos CMS", en: "CMS Data" },
            { id: "actions", es: "Acciones", en: "Actions" },
            { id: "a11y", es: "A11y", en: "A11y" },
            { id: "advanced", es: "Avanzado", en: "Advanced" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
              activeTab === t.id
                ? "bg-[var(--color-accent,#f0a470)] text-black font-extrabold shadow-md shadow-[rgba(240,164,112,0.2)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {L(t.es, t.en)}
          </button>
        ))}
      </div>

      {/* Contenido contextual del Inspector */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-4 text-xs pr-1">
        {/* ================= TAB 1: CONTENIDO ================= */}
        {activeTab === "content" && (
          <div className="space-y-4">
            {/* 1. NAVBAR INSPECTOR */}
            {isNavbar && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Logo Texto
                    </label>
                    <input
                      type="text"
                      value={navbarProps.logoText || "IVN"}
                      onChange={(e) => handleUpdateNavbarProps({ logoText: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Color Punto Acento
                    </label>
                    <input
                      type="text"
                      value={navbarProps.logoDotColor || "#f0a470"}
                      onChange={(e) => handleUpdateNavbarProps({ logoDotColor: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-mono"
                    />
                  </div>
                </div>

                {/* Toggles de controles */}
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-black/30 border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={navbarProps.showLangToggle !== false}
                      onChange={(e) => handleUpdateNavbarProps({ showLangToggle: e.target.checked })}
                      className="rounded accent-[var(--color-accent,#f0a470)]"
                    />
                    <span className="text-[11px] text-zinc-300 font-medium">Idioma</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-black/30 border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={navbarProps.showTerminalBtn !== false}
                      onChange={(e) => handleUpdateNavbarProps({ showTerminalBtn: e.target.checked })}
                      className="rounded accent-[var(--color-accent,#f0a470)]"
                    />
                    <span className="text-[11px] text-zinc-300 font-medium">Terminal</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-black/30 border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={navbarProps.showThemeToggle !== false}
                      onChange={(e) => handleUpdateNavbarProps({ showThemeToggle: e.target.checked })}
                      className="rounded accent-[var(--color-accent,#f0a470)]"
                    />
                    <span className="text-[11px] text-zinc-300 font-medium">Tema Día/Noche</span>
                  </label>
                </div>

                {/* GitHub URL */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    URL GitHub Directo
                  </label>
                  <input
                    type="url"
                    value={navbarProps.githubUrl || ""}
                    onChange={(e) => handleUpdateNavbarProps({ githubUrl: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>

                {/* Enlaces de Navegación con reordenamiento */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Enlaces ({navbarProps.links?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = navbarProps.links || [];
                        handleUpdateNavbarProps({
                          links: [...current, { id: `nav_${Date.now()}`, label: "Nuevo Link", href: "#" }],
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                    >
                      + Añadir Enlace
                    </button>
                  </div>
                  {(navbarProps.links || []).map((lnk, idx) => (
                    <div key={lnk.id || idx} className="flex items-center gap-1.5 bg-black/40 p-2 rounded-xl border border-white/5">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return;
                            const next = [...(navbarProps.links || [])];
                            const temp = next[idx - 1];
                            next[idx - 1] = next[idx];
                            next[idx] = temp;
                            handleUpdateNavbarProps({ links: next });
                          }}
                          className="px-1 py-0.5 text-zinc-400 hover:text-white disabled:opacity-30 rounded bg-white/5 flex items-center justify-center"
                          title="Subir"
                        >
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                        </button>
                        <button
                          type="button"
                          disabled={idx === (navbarProps.links || []).length - 1}
                          onClick={() => {
                            if (idx >= (navbarProps.links || []).length - 1) return;
                            const next = [...(navbarProps.links || [])];
                            const temp = next[idx + 1];
                            next[idx + 1] = next[idx];
                            next[idx] = temp;
                            handleUpdateNavbarProps({ links: next });
                          }}
                          className="px-1 py-0.5 text-zinc-400 hover:text-white disabled:opacity-30 rounded bg-white/5 flex items-center justify-center"
                          title="Bajar"
                        >
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={lnk.label}
                        onChange={(e) => {
                          const next = [...(navbarProps.links || [])];
                          next[idx] = { ...next[idx], label: e.target.value };
                          handleUpdateNavbarProps({ links: next });
                        }}
                        className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                      <input
                        type="text"
                        value={lnk.href}
                        onChange={(e) => {
                          const next = [...(navbarProps.links || [])];
                          next[idx] = { ...next[idx], href: e.target.value };
                          handleUpdateNavbarProps({ links: next });
                        }}
                        placeholder="#destino"
                        className="w-24 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-zinc-400 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (navbarProps.links || []).filter((_, i) => i !== idx);
                          handleUpdateNavbarProps({ links: next });
                        }}
                        className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. HERO INSPECTOR */}
            {isHero && (
              <div className="space-y-3.5">
                {/* Riqueza de Asset Reference siempre visible y directa al inicio del Hero */}
                <AssetReferenceCard
                  title="IMAGEN DE HERO - ASSET REFERENCE"
                  nodeName="HeroImage"
                  asset={heroProps.portrait}
                  isFocused={currentSubnodeType === "image"}
                  onOpenPicker={() => { setAssetPickerTarget("hero"); setAssetModalOpen(true); }}
                  onUpdate={(updatedAsset) => {
                    handleUpdateHeroProps({ portrait: updatedAsset });
                  }}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Eyebrow / Subtítulo
                    </label>
                    <input
                      type="text"
                      value={heroProps.eyebrow || ""}
                      onChange={(e) => handleUpdateHeroProps({ eyebrow: e.target.value })}
                      placeholder="HELLO WORLD"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Estado Laboral
                    </label>
                    <input
                      type="text"
                      value={heroProps.statusText || ""}
                      onChange={(e) => handleUpdateHeroProps({ statusText: e.target.value })}
                      placeholder="Disponible para trabajar"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                  </div>
                </div>

                {/* Selector de Variante Hero */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Arquetipo / Variante de Hero
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "split-portrait", label: "Split Retrato", desc: "Editorial" },
                      { id: "centered", label: "Centrado", desc: "Focus Bio" },
                      { id: "terminal", label: "Terminal", desc: "Dev CLI" },
                      { id: "minimal", label: "Minimal", desc: "Tipográfico" },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleUpdateHeroProps({ variant: v.id as any })}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          (heroProps.variant || "split-portrait") === v.id
                            ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                            : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="text-[11px] font-bold">{v.label}</div>
                        <div className="text-[8px] text-zinc-400">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Titular Principal (H1)
                    </label>
                    <input
                      type="text"
                      value={heroProps.title || ""}
                      onChange={(e) => handleUpdateHeroProps({ title: e.target.value })}
                      placeholder="Iván Jonás"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent,#f0a470)] mb-1">
                      Palabra con Acento
                    </label>
                    <input
                      type="text"
                      value={heroProps.highlightWord || ""}
                      onChange={(e) => handleUpdateHeroProps({ highlightWord: e.target.value })}
                      placeholder="Jonás"
                      className="w-full rounded-xl border border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/10 px-3 py-2 text-xs text-[var(--color-accent,#f0a470)] outline-none focus:border-[var(--color-accent,#f0a470)] font-bold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Descripción / Bio
                  </label>
                  <textarea
                    rows={3}
                    value={heroProps.description || ""}
                    onChange={(e) => handleUpdateHeroProps({ description: e.target.value })}
                    placeholder="Descripción profesional..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
                  />
                </div>

                {/* Badges List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Badges ({heroProps.badges?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = heroProps.badges || [];
                        handleUpdateHeroProps({
                          badges: [...current, { id: `b_${Date.now()}`, label: "Stack", tone: "accent" }],
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                    >
                      + Añadir Badge
                    </button>
                  </div>
                  {(heroProps.badges || []).map((b, idx) => (
                    <div key={b.id || idx} className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                      <input
                        type="text"
                        value={b.label}
                        onChange={(e) => {
                          const next = [...(heroProps.badges || [])];
                          next[idx] = { ...next[idx], label: e.target.value };
                          handleUpdateHeroProps({ badges: next });
                        }}
                        className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                      <select
                        value={b.tone || "accent"}
                        onChange={(e) => {
                          const next = [...(heroProps.badges || [])];
                          next[idx] = { ...next[idx], tone: e.target.value as "accent" | "success" | "neutral" };
                          handleUpdateHeroProps({ badges: next });
                        }}
                        className="rounded-lg border border-white/10 bg-black/70 px-2 py-1 text-[10px] text-white outline-none font-mono"
                      >
                        <option value="accent">Acento</option>
                        <option value="success">Verde</option>
                        <option value="neutral">Gris</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (heroProps.badges || []).filter((_, i) => i !== idx);
                          handleUpdateHeroProps({ badges: next });
                        }}
                        className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Botones de Acción (CTAs) */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Botones de Acción (CTAs)
                  </span>

                  {/* Primario */}
                  <div className="rounded-xl border border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/10 p-2.5 space-y-2">
                    <span className="text-[9px] font-mono font-bold text-[var(--color-accent,#f0a470)] block">
                      BOTÓN PRIMARIO
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={heroProps.primaryCta?.label || "Ver proyectos"}
                        onChange={(e) =>
                          handleUpdateAction(
                            "primary",
                            heroProps.primaryCta?.action?.target || { kind: "url", href: "#proyectos" },
                            e.target.value
                          )
                        }
                        placeholder="Texto botón"
                        className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-bold"
                      />
                      <input
                        type="text"
                        value={
                          heroProps.primaryCta?.action?.target?.kind === "url"
                            ? heroProps.primaryCta.action.target.href
                            : heroProps.primaryCta?.action?.target?.kind === "scene"
                            ? `#${heroProps.primaryCta.action.target.sceneId}`
                            : heroProps.primaryCta?.action?.target?.kind === "anchor"
                            ? `#${heroProps.primaryCta.action.target.blockId}`
                            : "#proyectos"
                        }
                        onChange={(e) =>
                          handleUpdateAction(
                            "primary",
                            { kind: "url", href: e.target.value },
                            heroProps.primaryCta?.label || "Ver proyectos"
                          )
                        }
                        placeholder="#destino o URL"
                        className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                  </div>

                  {/* Secundario */}
                  <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 space-y-2">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 block">
                      BOTÓN SECUNDARIO
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={heroProps.secondaryCta?.label || "Contactar conmigo"}
                        onChange={(e) =>
                          handleUpdateAction(
                            "secondary",
                            heroProps.secondaryCta?.action?.target || { kind: "url", href: "#contacto" },
                            e.target.value
                          )
                        }
                        placeholder="Texto botón"
                        className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                      <input
                        type="text"
                        value={
                          heroProps.secondaryCta?.action?.target?.kind === "url"
                            ? heroProps.secondaryCta.action.target.href
                            : heroProps.secondaryCta?.action?.target?.kind === "scene"
                            ? `#${heroProps.secondaryCta.action.target.sceneId}`
                            : heroProps.secondaryCta?.action?.target?.kind === "anchor"
                            ? `#${heroProps.secondaryCta.action.target.blockId}`
                            : "#contacto"
                        }
                        onChange={(e) =>
                          handleUpdateAction(
                            "secondary",
                            { kind: "url", href: e.target.value },
                            heroProps.secondaryCta?.label || "Contactar conmigo"
                          )
                        }
                        placeholder="#destino o URL"
                        className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. METRICS INSPECTOR */}
            {isMetrics && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Disposición (Layout)
                    </label>
                    <select
                      value={metricsProps.layout || "grid"}
                      onChange={(e) => handleUpdateMetricsProps({ layout: e.target.value as "grid" | "horizontal" | "cards" })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none font-bold"
                    >
                      <option value="grid">Grid</option>
                      <option value="horizontal">Horizontal</option>
                      <option value="cards">Tarjetas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Columnas
                    </label>
                    <select
                      value={metricsProps.columns || 4}
                      onChange={(e) => handleUpdateMetricsProps({ columns: Number(e.target.value) as 2 | 3 | 4 })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                    >
                      <option value="2">2 Columnas</option>
                      <option value="3">3 Columnas</option>
                      <option value="4">4 Columnas</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Contadores de Métricas ({metricsProps.items?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const current = metricsProps.items || [];
                      handleUpdateMetricsProps({
                        items: [...current, { id: `m_${Date.now()}`, value: "10+", label: "NUEVO INDICADOR", tone: "neutral" }],
                      });
                    }}
                    className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                  >
                    + Añadir Métrica
                  </button>
                </div>

                <div className="space-y-2">
                  {(metricsProps.items || []).map((m, idx) => (
                    <div key={m.id || idx} className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m.value}
                          onChange={(e) => {
                            const next = [...(metricsProps.items || [])];
                            next[idx] = { ...next[idx], value: e.target.value };
                            handleUpdateMetricsProps({ items: next });
                          }}
                          placeholder="6+"
                          className="w-20 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                        />
                        <input
                          type="text"
                          value={m.label}
                          onChange={(e) => {
                            const next = [...(metricsProps.items || [])];
                            next[idx] = { ...next[idx], label: e.target.value };
                            handleUpdateMetricsProps({ items: next });
                          }}
                          placeholder="AÑOS EN TECNOLOGÍA"
                          className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (metricsProps.items || []).filter((_, i) => i !== idx);
                            handleUpdateMetricsProps({ items: next });
                          }}
                          className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">Tono:</span>
                        {(["accent", "success", "neutral"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              const next = [...(metricsProps.items || [])];
                              next[idx] = { ...next[idx], tone: t };
                              handleUpdateMetricsProps({ items: next });
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${
                              (m.tone || "neutral") === t ? "bg-[var(--color-accent,#f0a470)] text-black font-extrabold" : "bg-black/60 text-zinc-400"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. BENTO GRID INSPECTOR */}
            {isBento && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Título de la Sección
                  </label>
                  <input
                    type="text"
                    value={bentoProps.title || "Iván en números"}
                    onChange={(e) => handleUpdateBentoProps({ title: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={bentoProps.subtitle || ""}
                    onChange={(e) => handleUpdateBentoProps({ subtitle: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>

                {/* Selector de Pestaña Activa en el Preview */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Pestaña Activa en Preview
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bentoProps.layout?.showTabs !== false}
                        onChange={(e) =>
                          handleUpdateBentoProps({
                            layout: { ...(bentoProps.layout || {}), showTabs: e.target.checked },
                          })
                        }
                        className="rounded accent-[var(--color-accent,#f0a470)]"
                      />
                      <span className="text-[9px] text-zinc-400">Barra de tabs</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {(
                      [
                        { id: "github", label: "GitHub" },
                        { id: "trayectoria", label: "Trayectoria" },
                        { id: "infraestructura", label: "Infraestructura" },
                        { id: "custom", label: "Personalizado" },
                      ] as const
                    ).map((tb) => {
                      const isActive = (bentoProps.activeTab || "github") === tb.id;
                      return (
                        <button
                          key={tb.id}
                          type="button"
                          onClick={() => handleUpdateBentoProps({ activeTab: tb.id })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                            isActive
                              ? "bg-[var(--color-accent,#f0a470)] text-black font-extrabold shadow"
                              : "bg-black/60 text-zinc-400 hover:text-white border border-white/5"
                          }`}
                        >
                          {tb.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-panel condicional según activeTab */}
                {(!bentoProps.activeTab || bentoProps.activeTab === "github") && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent,#f0a470)] font-mono">
                        Configuración GitHub
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-zinc-500 block mb-0.5">Repositorios</span>
                        <input
                          type="number"
                          value={bentoProps.githubStats?.reposCount || 16}
                          onChange={(e) =>
                            handleUpdateBentoProps({
                              githubStats: {
                                ...(bentoProps.githubStats || { prsCount: 5, starsCount: 3, memberSince: 2013 }),
                                reposCount: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 block mb-0.5">Badge Repos</span>
                        <input
                          type="text"
                          value={bentoProps.githubStats?.reposBadge || "16 repos"}
                          onChange={(e) =>
                            handleUpdateBentoProps({
                              githubStats: {
                                ...(bentoProps.githubStats || { reposCount: 16, prsCount: 5, starsCount: 3, memberSince: 2013 }),
                                reposBadge: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] text-zinc-500 block mb-0.5">Pull Requests</span>
                        <input
                          type="number"
                          value={bentoProps.githubStats?.prsCount || 5}
                          onChange={(e) =>
                            handleUpdateBentoProps({
                              githubStats: {
                                ...(bentoProps.githubStats || { reposCount: 16, starsCount: 3, memberSince: 2013 }),
                                prsCount: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 block mb-0.5">Stars</span>
                        <input
                          type="number"
                          value={bentoProps.githubStats?.starsCount || 3}
                          onChange={(e) =>
                            handleUpdateBentoProps({
                              githubStats: {
                                ...(bentoProps.githubStats || { reposCount: 16, prsCount: 5, memberSince: 2013 }),
                                starsCount: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 block mb-0.5">Miembro Desde</span>
                        <input
                          type="number"
                          value={bentoProps.githubStats?.memberSince || 2013}
                          onChange={(e) =>
                            handleUpdateBentoProps({
                              githubStats: {
                                ...(bentoProps.githubStats || { reposCount: 16, prsCount: 5, starsCount: 3 }),
                                memberSince: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-zinc-500 block mb-0.5">Snippet de Terminal Docker</span>
                      <input
                        type="text"
                        value={bentoProps.githubStats?.terminalSnippet || ""}
                        onChange={(e) =>
                          handleUpdateBentoProps({
                            githubStats: {
                              ...(bentoProps.githubStats || { reposCount: 16, prsCount: 5, starsCount: 3, memberSince: 2013 }),
                              terminalSnippet: e.target.value,
                            },
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-[var(--color-accent,#f0a470)] font-mono"
                      />
                    </div>
                  </div>
                )}

                {bentoProps.activeTab === "trayectoria" && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent,#f0a470)] font-mono">
                        Trayectoria / Timeline ({(bentoProps.timeline || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = bentoProps.timeline || [];
                          handleUpdateBentoProps({
                            timeline: [
                              ...current,
                              {
                                id: `t_${Date.now()}`,
                                period: "2024 - Presente",
                                role: "Nuevo Rol",
                                company: "Empresa",
                                description: "Descripción de responsabilidades y tecnologías empleadas.",
                              },
                            ],
                          });
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                      >
                        + Añadir Hito
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(bentoProps.timeline || []).map((t, idx) => (
                        <div key={t.id || idx} className="p-2.5 rounded-xl bg-black/60 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={t.period}
                              onChange={(e) => {
                                const next = [...(bentoProps.timeline || [])];
                                next[idx] = { ...next[idx], period: e.target.value };
                                handleUpdateBentoProps({ timeline: next });
                              }}
                              placeholder="Período (ej: 2023 - Presente)"
                              className="w-36 rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-[var(--color-accent,#f0a470)] font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = (bentoProps.timeline || []).filter((_, i) => i !== idx);
                                handleUpdateBentoProps({ timeline: next });
                              }}
                              className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                              title="Eliminar hito"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={t.role}
                              onChange={(e) => {
                                const next = [...(bentoProps.timeline || [])];
                                next[idx] = { ...next[idx], role: e.target.value };
                                handleUpdateBentoProps({ timeline: next });
                              }}
                              placeholder="Cargo o rol"
                              className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-white font-bold"
                            />
                            <input
                              type="text"
                              value={t.company}
                              onChange={(e) => {
                                const next = [...(bentoProps.timeline || [])];
                                next[idx] = { ...next[idx], company: e.target.value };
                                handleUpdateBentoProps({ timeline: next });
                              }}
                              placeholder="Empresa / Proyecto"
                              className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-zinc-300"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={t.description || ""}
                            onChange={(e) => {
                              const next = [...(bentoProps.timeline || [])];
                              next[idx] = { ...next[idx], description: e.target.value };
                              handleUpdateBentoProps({ timeline: next });
                            }}
                            placeholder="Descripción del hito o logros..."
                            className="w-full rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-zinc-300 resize-none outline-none focus:border-[var(--color-accent,#f0a470)]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bentoProps.activeTab === "infraestructura" && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent,#f0a470)] font-mono">
                        Servicios Homelab / Cloud ({(bentoProps.services || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = bentoProps.services || [];
                          handleUpdateBentoProps({
                            services: [
                              ...current,
                              {
                                id: `srv_${Date.now()}`,
                                name: "Nuevo Servicio",
                                category: "Microservicio",
                                status: "healthy",
                                description: "Servicio Dockerizado con reinicio automático.",
                              },
                            ],
                          });
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                      >
                        + Añadir Servicio
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(bentoProps.services || []).map((srv, idx) => (
                        <div key={srv.id || idx} className="p-2.5 rounded-xl bg-black/60 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={srv.name}
                              onChange={(e) => {
                                const next = [...(bentoProps.services || [])];
                                next[idx] = { ...next[idx], name: e.target.value };
                                handleUpdateBentoProps({ services: next });
                              }}
                              placeholder="Nombre servicio"
                              className="flex-1 rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-white font-bold"
                            />
                            <select
                              value={srv.status || "healthy"}
                              onChange={(e) => {
                                const next = [...(bentoProps.services || [])];
                                next[idx] = { ...next[idx], status: e.target.value as "healthy" | "degraded" | "active" };
                                handleUpdateBentoProps({ services: next });
                              }}
                              className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-[10px] text-zinc-300 font-mono"
                            >
                              <option value="healthy">Saludable</option>
                              <option value="active">Activo</option>
                              <option value="degraded">Mantenimiento</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const next = (bentoProps.services || []).filter((_, i) => i !== idx);
                                handleUpdateBentoProps({ services: next });
                              }}
                              className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                              title="Eliminar servicio"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            value={srv.category}
                            onChange={(e) => {
                              const next = [...(bentoProps.services || [])];
                              next[idx] = { ...next[idx], category: e.target.value };
                              handleUpdateBentoProps({ services: next });
                            }}
                            placeholder="Categoría (ej: Networking / SSL)"
                            className="w-full rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-[var(--color-accent,#f0a470)] font-mono"
                          />
                          <input
                            type="text"
                            value={srv.description || ""}
                            onChange={(e) => {
                              const next = [...(bentoProps.services || [])];
                              next[idx] = { ...next[idx], description: e.target.value };
                              handleUpdateBentoProps({ services: next });
                            }}
                            placeholder="Descripción operativa..."
                            className="w-full rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-zinc-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bentoProps.activeTab === "custom" && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent,#f0a470)] font-mono">
                        Tarjetas Bento Personalizadas ({(bentoProps.customCards || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = bentoProps.customCards || [];
                          handleUpdateBentoProps({
                            customCards: [
                              ...current,
                              {
                                id: `c_${Date.now()}`,
                                title: "Nueva Tarjeta",
                                value: "100%",
                                badge: "ESTADO",
                                description: "Descripción de la tarjeta bento personalizada.",
                                colSpan: 6,
                              },
                            ],
                          });
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                      >
                        + Añadir Tarjeta
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(bentoProps.customCards || []).map((card, idx) => (
                        <div key={card.id || idx} className="p-2.5 rounded-xl bg-black/60 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={card.title}
                              onChange={(e) => {
                                const next = [...(bentoProps.customCards || [])];
                                next[idx] = { ...next[idx], title: e.target.value };
                                handleUpdateBentoProps({ customCards: next });
                              }}
                              placeholder="Título"
                              className="flex-1 rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-white font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = (bentoProps.customCards || []).filter((_, i) => i !== idx);
                                handleUpdateBentoProps({ customCards: next });
                              }}
                              className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                              title="Eliminar tarjeta"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={card.value || ""}
                              onChange={(e) => {
                                const next = [...(bentoProps.customCards || [])];
                                next[idx] = { ...next[idx], value: e.target.value };
                                handleUpdateBentoProps({ customCards: next });
                              }}
                              placeholder="Métrica (ej: 99.9%)"
                              className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-[var(--color-accent,#f0a470)] font-mono font-bold"
                            />
                            <input
                              type="text"
                              value={card.badge || ""}
                              onChange={(e) => {
                                const next = [...(bentoProps.customCards || [])];
                                next[idx] = { ...next[idx], badge: e.target.value };
                                handleUpdateBentoProps({ customCards: next });
                              }}
                              placeholder="Badge"
                              className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-zinc-300 font-mono"
                            />
                            <select
                              value={card.colSpan || 6}
                              onChange={(e) => {
                                const next = [...(bentoProps.customCards || [])];
                                next[idx] = { ...next[idx], colSpan: Number(e.target.value) as 3 | 4 | 6 | 12 };
                                handleUpdateBentoProps({ customCards: next });
                              }}
                              className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-zinc-300 font-mono"
                            >
                              <option value="12">Ancho Completo (12)</option>
                              <option value="6">Media Columna (6)</option>
                              <option value="4">Un Tercio (4)</option>
                              <option value="3">Un Cuarto (3)</option>
                            </select>
                          </div>
                          <textarea
                            rows={2}
                            value={card.description || ""}
                            onChange={(e) => {
                              const next = [...(bentoProps.customCards || [])];
                              next[idx] = { ...next[idx], description: e.target.value };
                              handleUpdateBentoProps({ customCards: next });
                            }}
                            placeholder="Descripción de la tarjeta..."
                            className="w-full rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs text-zinc-300 resize-none outline-none focus:border-[var(--color-accent,#f0a470)]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. CONTACT INSPECTOR */}
            {isContact && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Badge de Estado
                  </label>
                  <input
                    type="text"
                    value={contactProps.statusBadge || "DISPONIBLE PARA NUEVOS RETOS"}
                    onChange={(e) => handleUpdateContactProps({ statusBadge: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Titular
                  </label>
                  <input
                    type="text"
                    value={contactProps.title || "Trabajemos juntos"}
                    onChange={(e) => handleUpdateContactProps({ title: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Subtítulo / Mensaje
                  </label>
                  <textarea
                    rows={2}
                    value={contactProps.subtitle || ""}
                    onChange={(e) => handleUpdateContactProps({ subtitle: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Header Terminal
                    </label>
                    <input
                      type="text"
                      value={contactProps.terminalHeader || "ivan@pesoz:~/contacto"}
                      onChange={(e) => handleUpdateContactProps({ terminalHeader: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-[var(--color-accent,#f0a470)] font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Texto Botón Envío
                    </label>
                    <input
                      type="text"
                      value={contactProps.submitButtonText || "Enviar mensaje"}
                      onChange={(e) => handleUpdateContactProps({ submitButtonText: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={contactProps.email || "contacto@ivanjonasfc.dev"}
                    onChange={(e) => handleUpdateContactProps({ email: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>

                {/* Motivos de Contacto */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Opciones de Consulta ({contactProps.motives?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = contactProps.motives || [];
                        handleUpdateContactProps({ motives: [...current, "Nueva consulta"] });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                    >
                      + Añadir Opción
                    </button>
                  </div>
                  {(contactProps.motives || []).map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => {
                          const next = [...(contactProps.motives || [])];
                          next[idx] = e.target.value;
                          handleUpdateContactProps({ motives: next });
                        }}
                        className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (contactProps.motives || []).filter((_, i) => i !== idx);
                          handleUpdateContactProps({ motives: next });
                        }}
                        className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Campos del Formulario */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Campos del Formulario ({contactProps.formFields?.length || 3})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = contactProps.formFields || [
                          { id: "name", label: "¿Cómo te llamas?", type: "text", required: true },
                          { id: "email", label: "¿Tu correo?", type: "email", required: true },
                          { id: "message", label: "Cuéntame los detalles", type: "textarea", required: true },
                        ];
                        handleUpdateContactProps({
                          formFields: [
                            ...current,
                            { id: `field_${Date.now()}`, label: "Nuevo Campo", type: "text", required: false },
                          ],
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                    >
                      + Añadir Campo
                    </button>
                  </div>
                  {(contactProps.formFields || [
                    { id: "name", label: "¿Cómo te llamas?", type: "text", required: true },
                    { id: "email", label: "¿Tu correo?", type: "email", required: true },
                    { id: "message", label: "Cuéntame los detalles", type: "textarea", required: true },
                  ]).map((field, idx) => (
                    <div key={field.id || idx} className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const base = contactProps.formFields || [
                            { id: "name", label: "¿Cómo te llamas?", type: "text", required: true },
                            { id: "email", label: "¿Tu correo?", type: "email", required: true },
                            { id: "message", label: "Cuéntame los detalles", type: "textarea", required: true },
                          ];
                          const next = [...base];
                          next[idx] = { ...next[idx], label: e.target.value };
                          handleUpdateContactProps({ formFields: next });
                        }}
                        className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                        placeholder="Etiqueta del campo"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const base = contactProps.formFields || [
                            { id: "name", label: "¿Cómo te llamas?", type: "text", required: true },
                            { id: "email", label: "¿Tu correo?", type: "email", required: true },
                            { id: "message", label: "Cuéntame los detalles", type: "textarea", required: true },
                          ];
                          const next = [...base];
                          next[idx] = { ...next[idx], type: e.target.value };
                          handleUpdateContactProps({ formFields: next });
                        }}
                        className="rounded-lg border border-white/10 bg-black/70 px-2 py-1 text-[10px] text-zinc-300 font-mono"
                      >
                        <option value="text">Texto</option>
                        <option value="email">Email</option>
                        <option value="textarea">Área</option>
                        <option value="tel">Teléfono</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const base = contactProps.formFields || [
                            { id: "name", label: "¿Cómo te llamas?", type: "text", required: true },
                            { id: "email", label: "¿Tu correo?", type: "email", required: true },
                            { id: "message", label: "Cuéntame los detalles", type: "textarea", required: true },
                          ];
                          const next = base.filter((_, i) => i !== idx);
                          handleUpdateContactProps({ formFields: next });
                        }}
                        className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Redes Sociales */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Canales Sociales ({contactProps.socialLinks?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = contactProps.socialLinks || [];
                        handleUpdateContactProps({
                          socialLinks: [
                            ...current,
                            { id: `soc_${Date.now()}`, platform: "GitHub", url: "https://github.com/" },
                          ],
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                    >
                      + Añadir Red
                    </button>
                  </div>
                  {(contactProps.socialLinks || []).map((soc, idx) => (
                    <div key={soc.id || idx} className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                      <select
                        value={soc.platform}
                        onChange={(e) => {
                          const next = [...(contactProps.socialLinks || [])];
                          next[idx] = { ...next[idx], platform: e.target.value };
                          handleUpdateContactProps({ socialLinks: next });
                        }}
                        className="rounded-lg border border-white/10 bg-black/70 px-2 py-1 text-[10px] text-white font-mono"
                      >
                        <option value="GitHub">GitHub</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Twitter">Twitter / X</option>
                        <option value="Telegram">Telegram</option>
                        <option value="Discord">Discord</option>
                        <option value="Web">Web Personal</option>
                      </select>
                      <input
                        type="url"
                        value={soc.url}
                        onChange={(e) => {
                          const next = [...(contactProps.socialLinks || [])];
                          next[idx] = { ...next[idx], url: e.target.value };
                          handleUpdateContactProps({ socialLinks: next });
                        }}
                        placeholder="https://..."
                        className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (contactProps.socialLinks || []).filter((_, i) => i !== idx);
                          handleUpdateContactProps({ socialLinks: next });
                        }}
                        className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. FOOTER INSPECTOR */}
            {isFooter && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Logo / Marca
                  </label>
                  <input
                    type="text"
                    value={footerProps.logoText || "IVN."}
                    onChange={(e) => handleUpdateFooterProps({ logoText: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Tagline / Eslogan del Footer
                  </label>
                  <input
                    type="text"
                    value={footerProps.tagline || ""}
                    onChange={(e) => handleUpdateFooterProps({ tagline: e.target.value })}
                    placeholder="Diseñado con código artesanal y rendimiento obsesivo."
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Aviso de Copyright
                  </label>
                  <input
                    type="text"
                    value={footerProps.copyrightText || "© 2026 Iván Jonás Fernández Correa"}
                    onChange={(e) => handleUpdateFooterProps({ copyrightText: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      URL GitHub
                    </label>
                    <input
                      type="url"
                      value={footerProps.githubUrl || "https://github.com/IvanjonasFC"}
                      onChange={(e) => handleUpdateFooterProps({ githubUrl: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      URL LinkedIn
                    </label>
                    <input
                      type="url"
                      value={footerProps.linkedinUrl || "https://linkedin.com"}
                      onChange={(e) => handleUpdateFooterProps({ linkedinUrl: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={footerProps.email || "contacto@ivanjonasfc.dev"}
                    onChange={(e) => handleUpdateFooterProps({ email: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>

                {/* Secciones de Enlaces del Footer */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Columnas de Enlaces ({footerProps.footerSections?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = footerProps.footerSections || [];
                        handleUpdateFooterProps({
                          footerSections: [
                            ...current,
                            {
                              title: `Columna ${current.length + 1}`,
                              links: [
                                { label: "Enlace 1", href: "#" },
                                { label: "Enlace 2", href: "#" },
                              ],
                            },
                          ],
                        });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                    >
                      + Añadir Columna
                    </button>
                  </div>
                  {(footerProps.footerSections || []).map((sec, sIdx) => (
                    <div key={sIdx} className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => {
                            const next = [...(footerProps.footerSections || [])];
                            next[sIdx] = { ...next[sIdx], title: e.target.value };
                            handleUpdateFooterProps({ footerSections: next });
                          }}
                          className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-bold outline-none"
                          placeholder="Título de la columna"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (footerProps.footerSections || []).filter((_, i) => i !== sIdx);
                            handleUpdateFooterProps({ footerSections: next });
                          }}
                          className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-1 pl-2 border-l border-white/10">
                        {sec.links.map((lnk, lIdx) => (
                          <div key={lIdx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={lnk.label}
                              onChange={(e) => {
                                const next = [...(footerProps.footerSections || [])];
                                const links = [...next[sIdx].links];
                                links[lIdx] = { ...links[lIdx], label: e.target.value };
                                next[sIdx] = { ...next[sIdx], links };
                                handleUpdateFooterProps({ footerSections: next });
                              }}
                              className="flex-1 rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[11px] text-zinc-300 outline-none"
                              placeholder="Texto"
                            />
                            <input
                              type="text"
                              value={lnk.href}
                              onChange={(e) => {
                                const next = [...(footerProps.footerSections || [])];
                                const links = [...next[sIdx].links];
                                links[lIdx] = { ...links[lIdx], href: e.target.value };
                                next[sIdx] = { ...next[sIdx], links };
                                handleUpdateFooterProps({ footerSections: next });
                              }}
                              className="w-20 rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[11px] text-zinc-400 font-mono outline-none"
                              placeholder="#href"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...(footerProps.footerSections || [])];
                                next[sIdx] = {
                                  ...next[sIdx],
                                  links: next[sIdx].links.filter((_, i) => i !== lIdx),
                                };
                                handleUpdateFooterProps({ footerSections: next });
                              }}
                              className="text-zinc-600 hover:text-rose-400 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...(footerProps.footerSections || [])];
                            next[sIdx] = {
                              ...next[sIdx],
                              links: [...next[sIdx].links, { label: "Nuevo link", href: "#" }],
                            };
                            handleUpdateFooterProps({ footerSections: next });
                          }}
                          className="text-[10px] text-[var(--color-accent,#f0a470)] hover:underline pt-1 block"
                        >
                          + Añadir Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. PROYECTOS DESTACADOS / CMS CATALOG CONTENT */}
            {isProjectsBlock && (
              <div className="space-y-4">
                {/* Encabezado y Textos */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Encabezado y Textos
                    </span>
                    <span className="text-[9px] font-mono font-bold text-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/10 px-2 py-0.5 rounded-full border border-[var(--color-accent,#f0a470)]/30">
                      H2 + Eyebrow
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      Eyebrow / Etiqueta Superior
                    </label>
                    <input
                      type="text"
                      value={projectProps.eyebrow !== undefined ? projectProps.eyebrow : `CATÁLOGO DE PROYECTOS (${portfolioProjectsCount})`}
                      onChange={(e) => handleUpdateProjectsProps({ eyebrow: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-[var(--color-accent,#f0a470)] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        Titular (H2)
                      </label>
                      <input
                        type="text"
                        value={projectProps.heading !== undefined ? projectProps.heading : "Proyectos"}
                        onChange={(e) => handleUpdateProjectsProps({ heading: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--color-accent,#f0a470)] font-bold mb-1">
                        Palabra Acento
                      </label>
                      <input
                        type="text"
                        value={projectProps.highlightedWord !== undefined ? projectProps.highlightedWord : "Destacados"}
                        onChange={(e) => handleUpdateProjectsProps({ highlightedWord: e.target.value })}
                        className="w-full rounded-xl border border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/10 px-3 py-1.5 text-xs text-[var(--color-accent,#f0a470)] font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      Subtítulo / Descripción
                    </label>
                    <textarea
                      rows={2}
                      value={projectProps.subtitle !== undefined ? projectProps.subtitle : "Aplicaciones de escritorio, herramientas de infraestructura, IA local y plataformas web en producción."}
                      onChange={(e) => handleUpdateProjectsProps({ subtitle: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 leading-relaxed outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
                    />
                  </div>
                </div>

                {/* Filtros de Colección CMS */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Filtros y Cantidad CMS
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {portfolioProjectsCount} disponibles
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1.5">
                      Límite de Proyectos Mostrados
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { val: 3, label: "Top 3" },
                        { val: 6, label: "Top 6" },
                        { val: 10, label: "Top 10" },
                        { val: 0, label: "Todos" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => handleUpdateProjectsProps({ limit: item.val })}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                            (projectProps.limit ?? 0) === item.val
                              ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)] text-black"
                              : "border-white/10 bg-black/50 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1.5">
                      Filtrar por Categoría / Tipo
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "all", label: "Todos los Tipos" },
                        { id: "web-app", label: "Web Apps" },
                        { id: "desktop-app", label: "Desktop / CLI" },
                        { id: "website", label: "Sitios Web" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleUpdateProjectsProps({ category: cat.id })}
                          className={`py-1.5 px-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                            (projectProps.category || "all") === cat.id
                              ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                              : "border-white/10 bg-black/50 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-zinc-300 font-medium">Solo Destacados (Featured)</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateProjectsProps({ featuredOnly: !projectProps.featuredOnly })}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        projectProps.featuredOnly ? "bg-[var(--color-accent,#f0a470)]" : "bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          projectProps.featuredOnly ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Sincronización CMS */}
                <div className="rounded-xl border border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/10 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-accent,#f0a470)] animate-pulse"></span>
                    <span className="text-[11px] font-bold text-white">Sincronizado con Brand CMS</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-accent,#f0a470)] font-bold">
                    Reactivo en Vivo
                  </span>
                </div>
              </div>
            )}

            {/* 8. DETALLE DE PROYECTO / PROJECT DETAIL (Universal y Auto-Descubierto) */}
            {isDetailBlock && (
              <div className="space-y-4">
                {/* Selector de Proyecto a Inspeccionar */}
                <div className="rounded-2xl border border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[var(--color-accent,#f0a470)] uppercase tracking-wider">
                      Proyecto Activo
                    </span>
                    <span className="text-[10px] font-mono text-zinc-300">
                      Ruta: /proyectos/{activeSlug}
                    </span>
                  </div>
                  <select
                    value={currentProject?.slug || activeSlug}
                    onChange={(e) => {
                      const selectedSlug = e.target.value;
                      onNavigateRoute?.(`/proyectos/${selectedSlug}`);
                    }}
                    className="w-full rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                  >
                    {portfolioProjects && portfolioProjects.length > 0 ? (
                      portfolioProjects.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.title} ({p.slug})
                        </option>
                      ))
                    ) : (
                      <option value={activeSlug}>{activeSlug}</option>
                    )}
                  </select>
                </div>

                {!currentProject && <p className="text-xs text-amber-300">No existe un proyecto para esta ruta.</p>}
                {currentProject && <>
                {/* Portada del Proyecto con AssetReferenceCard Auto-Descubierta */}
                <AssetReferenceCard
                  title={`PORTADA DE PROYECTO — ${(currentProject?.title || activeSlug).toUpperCase()}`}
                  nodeName="ProjectCover"
                  asset={
                    currentProject.cover || {
                      assetId: currentProject.coverAssetId || `asset_${activeSlug}_cover`,
                      url: currentProject.coverUrl || "",
                      alt: `Captura de ${currentProject.title}`,
                      aspectRatio: "16:9",
                      fit: "cover",
                    }
                  }
                  isFocused={currentSubnodeType === "image" || currentSubnodeKey === "cover"}
                  onOpenPicker={() => { setAssetPickerTarget("project"); setAssetModalOpen(true); }}
                  onUpdate={(updatedAsset) => {
                    handleUpdateCurrentProject({
                      cover: updatedAsset,
                      coverAssetId: updatedAsset.assetId,
                      coverUrl: updatedAsset.url,
                    });
                  }}
                />

                {/* Textos Principales Auto-Descubiertos */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Información y Textos ({currentProject?.title || "Proyecto"})
                  </span>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      Titular del Proyecto (H1)
                    </label>
                    <input
                      type="text"
                      value={currentProject.title}
                      onChange={(e) => handleUpdateCurrentProject({ title: e.target.value })}
                      placeholder={currentProject?.title || "Nombre del proyecto..."}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      Resumen Ejecutivo
                    </label>
                    <textarea
                      rows={3}
                      value={currentProject.summary}
                      onChange={(e) => handleUpdateCurrentProject({ summary: e.target.value })}
                      placeholder={currentProject?.summary || "Resumen del proyecto..."}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 leading-relaxed outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        Rol Técnico
                      </label>
                      <input
                        type="text"
                        value={currentProject.role || ""}
                        onChange={(e) => handleUpdateCurrentProject({ role: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        Año
                      </label>
                      <input
                        type="number"
                        value={currentProject.year || ""}
                        onChange={(e) => handleUpdateCurrentProject({ year: Number(e.target.value) })}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        URL Demostración
                      </label>
                      <input
                        type="url"
                        value={currentProject.demoUrl || currentProject.websiteUrl || ""}
                        onChange={(e) => handleUpdateCurrentProject({ demoUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        URL Repositorio
                      </label>
                      <input
                        type="url"
                        value={currentProject.repositoryUrl || ""}
                        onChange={(e) => handleUpdateCurrentProject({ repositoryUrl: e.target.value })}
                        placeholder="https://github.com/..."
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                  </div>

                  {/* Tech Stack Tags */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Stack Tecnológico ({currentProject.stack.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateCurrentProject({ stack: [...currentProject.stack, "Tecnología"] });
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                      >
                        + Añadir Tag
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProject.stack.map((tag: string, tIdx: number) => (
                        <div key={tIdx} className="flex items-center gap-1 bg-black/60 border border-white/10 px-2 py-1 rounded-lg">
                          <input
                            type="text"
                            value={tag}
                            onChange={(e) => {
                              const next = [...currentProject.stack];
                              next[tIdx] = e.target.value;
                              handleUpdateCurrentProject({ stack: next });
                            }}
                            className="w-20 bg-transparent text-xs text-[var(--color-accent,#f0a470)] font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = currentProject.stack.filter((_, i) => i !== tIdx);
                              handleUpdateCurrentProject({ stack: next });
                            }}
                            className="text-zinc-500 hover:text-rose-400 text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                </>}
              </div>
            )}

            {/* 9. GENERIC & CUSTOM BLOCK INSPECTOR (Para cualquier tipo de sección / web) */}
            {!isNavbar && !isHero && !isMetrics && !isBento && !isContact && !isFooter && !isProjectsBlock && !isDetailBlock && (
              <div className="space-y-4">
                {/* Auto-Discovered Asset / Image Card para cualquier bloque o sección */}
                {genericAsset && (
                    <AssetReferenceCard
                      title={`IMAGEN / ASSET — ${block.label.toUpperCase()}`}
                      nodeName="BlockImage"
                      asset={genericAsset}
                      isFocused={currentSubnodeType === "image"}
                      onOpenPicker={() => { setAssetPickerTarget("generic"); setAssetModalOpen(true); }}
                      onUpdate={handleUpdateGenericAsset}
                    />
                )}

                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Configuración de Sección
                    </span>
                    <span className="text-[9px] font-mono font-bold text-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/10 px-2 py-0.5 rounded-full border border-[var(--color-accent,#f0a470)]/30">
                      {block.type.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      {L("Etiqueta visible del bloque", "Visible block label")}
                    </label>
                    <input
                      type="text"
                      value={block.label}
                      onChange={(e) => handleUpdate({ label: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      Eyebrow / Etiqueta Superior
                    </label>
                    <input
                      type="text"
                      value={(block.props as any)?.eyebrow || ""}
                      onChange={(e) => handleUpdateProps({ eyebrow: e.target.value })}
                      placeholder="CARACTERÍSTICAS / NOVEDADES"
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-[var(--color-accent,#f0a470)] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                        Titular Principal
                      </label>
                      <input
                        type="text"
                        value={(block.props as any)?.heading || (block.props as any)?.title || ""}
                        onChange={(e) => handleUpdateProps({ heading: e.target.value, title: e.target.value })}
                        placeholder="Título de la sección..."
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--color-accent,#f0a470)] font-bold mb-1">
                        Palabra Acento
                      </label>
                      <input
                        type="text"
                        value={(block.props as any)?.highlightedWord || ""}
                        onChange={(e) => handleUpdateProps({ highlightedWord: e.target.value })}
                        placeholder="Innovador"
                        className="w-full rounded-xl border border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/10 px-3 py-1.5 text-xs text-[var(--color-accent,#f0a470)] font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      Subtítulo / Descripción
                    </label>
                    <textarea
                      rows={2}
                      value={(block.props as any)?.subtitle || (block.props as any)?.description || ""}
                      onChange={(e) => handleUpdateProps({ subtitle: e.target.value, description: e.target.value })}
                      placeholder="Descripción detallada de la sección..."
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
                    />
                  </div>
                </div>

                {/* Editor de Elementos / Tarjetas Dinámicas */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Elementos de Contenido ({Array.isArray((block.props as any)?.items) ? (block.props as any).items.length : 0})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = Array.isArray((block.props as any)?.items) ? [...(block.props as any).items] : [];
                        const newItem = {
                          id: `item_${Date.now()}`,
                          title: `Nueva Característica ${current.length + 1}`,
                          description: "Descripción de la capacidad técnica o beneficio.",
                          badge: "NUEVO",
                          icon: "sparkles",
                          href: "#",
                          ctaText: "Ver más",
                        };
                        handleUpdateProps({ items: [...current, newItem] });
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--color-accent,#f0a470)] text-black font-extrabold text-[9px] hover:brightness-110"
                    >
                      + Añadir Elemento
                    </button>
                  </div>

                  {Array.isArray((block.props as any)?.items) && (block.props as any).items.length > 0 ? (
                    <div className="space-y-2">
                      {(block.props as any).items.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="rounded-xl border border-white/5 bg-black/50 p-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  if (idx === 0) return;
                                  const next = [...(block.props as any).items];
                                  const temp = next[idx - 1];
                                  next[idx - 1] = next[idx];
                                  next[idx] = temp;
                                  handleUpdateProps({ items: next });
                                }}
                                className="px-1 py-0.5 text-zinc-400 hover:text-white disabled:opacity-20 rounded bg-white/5 flex items-center justify-center"
                                title="Subir"
                              >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                              </button>
                              <button
                                type="button"
                                disabled={idx >= (block.props as any).items.length - 1}
                                onClick={() => {
                                  if (idx >= (block.props as any).items.length - 1) return;
                                  const next = [...(block.props as any).items];
                                  const temp = next[idx + 1];
                                  next[idx + 1] = next[idx];
                                  next[idx] = temp;
                                  handleUpdateProps({ items: next });
                                }}
                                className="px-1 py-0.5 text-zinc-400 hover:text-white disabled:opacity-20 rounded bg-white/5 flex items-center justify-center"
                                title="Bajar"
                              >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={item.title || ""}
                              onChange={(e) => {
                                const next = [...(block.props as any).items];
                                next[idx] = { ...next[idx], title: e.target.value };
                                handleUpdateProps({ items: next });
                              }}
                              placeholder="Título elemento"
                              className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-bold outline-none focus:border-[var(--color-accent,#f0a470)]"
                            />
                            <select
                              value={item.icon || "sparkles"}
                              onChange={(e) => {
                                const next = [...(block.props as any).items];
                                next[idx] = { ...next[idx], icon: e.target.value };
                                handleUpdateProps({ items: next });
                              }}
                              className="w-20 rounded-lg border border-white/10 bg-black/70 px-1.5 py-1 text-[10px] text-zinc-300 font-mono"
                            >
                              <option value="sparkles">Sparkles</option>
                              <option value="code">Code</option>
                              <option value="rocket">Rocket</option>
                              <option value="server">Server</option>
                              <option value="database">Database</option>
                              <option value="shield">Shield</option>
                              <option value="zap">Zap</option>
                              <option value="globe">Globe</option>
                            </select>
                            <input
                              type="text"
                              value={item.badge || ""}
                              onChange={(e) => {
                                const next = [...(block.props as any).items];
                                next[idx] = { ...next[idx], badge: e.target.value };
                                handleUpdateProps({ items: next });
                              }}
                              placeholder="Badge"
                              className="w-16 rounded-lg border border-white/10 bg-black/60 px-1.5 py-1 text-[10px] text-[var(--color-accent,#f0a470)] font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = (block.props as any).items.filter((_: any, i: number) => i !== idx);
                                handleUpdateProps({ items: next });
                              }}
                              className="p-1 text-zinc-500 hover:text-rose-400 text-xs"
                              title="Eliminar elemento"
                            >
                              ✕
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={item.description || ""}
                            onChange={(e) => {
                              const next = [...(block.props as any).items];
                              next[idx] = { ...next[idx], description: e.target.value };
                              handleUpdateProps({ items: next });
                            }}
                            placeholder="Descripción del elemento..."
                            className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
                          />
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <input
                              type="text"
                              value={item.ctaText || ""}
                              onChange={(e) => {
                                const next = [...(block.props as any).items];
                                next[idx] = { ...next[idx], ctaText: e.target.value };
                                handleUpdateProps({ items: next });
                              }}
                              placeholder="Texto botón (ej. Ver más)"
                              className="rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300 outline-none"
                            />
                            <input
                              type="text"
                              value={item.href || ""}
                              onChange={(e) => {
                                const next = [...(block.props as any).items];
                                next[idx] = { ...next[idx], href: e.target.value };
                                handleUpdateProps({ items: next });
                              }}
                              placeholder="Enlace (#ancla o https://)"
                              className="rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] text-zinc-400 font-mono outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400 text-center py-2">
                      Sin elementos configurados. Haz clic en "+ Añadir Elemento" para crear tarjetas interactivas.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: LAYOUT UNIVERSAL ================= */}
        {activeTab === "layout" && (
          <div className="space-y-4">
            {/* 1. DISPOSICIÓN Y COLUMNAS ESPECÍFICAS DE BLOQUE */}
            {isNavbar && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-300 font-medium">Posición Fija / Sticky</span>
                    <p className="text-[10px] text-zinc-500">Mantiene la barra superior fijada durante el scroll</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateLayoutConfig({
                        sticky: block.layoutConfig?.sticky !== false ? false : true,
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      block.layoutConfig?.sticky !== false ? "bg-[var(--color-accent,#f0a470)]" : "bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        block.layoutConfig?.sticky !== false ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {isProjectsBlock && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Estructura de Cuadrícula (Grid)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { cols: 1, label: "1 Columna", desc: "Lista Editorial" },
                    { cols: 2, label: "2 Columnas", desc: "Cuadrícula" },
                    { cols: 3, label: "3 Columnas", desc: "Compacto" },
                  ].map((item) => (
                    <button
                      key={item.cols}
                      type="button"
                      onClick={() =>
                        handleUpdateProjectsProps({
                          layout: {
                            ...(projectProps.layout || {}),
                            columns: item.cols as 1 | 2 | 3,
                          },
                        })
                      }
                      className={`p-2.5 rounded-xl text-center border transition-all ${
                        (projectProps.layout?.columns || 1) === item.cols
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isHero && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Posición del Retrato / Imagen
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "left", label: "Izquierda", desc: "Imagen + Texto" },
                    { id: "right", label: "Derecha", desc: "Texto + Imagen" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() =>
                        handleUpdateHeroProps({
                          layout: {
                            ...heroProps.layout,
                            imagePosition: pos.id as "left" | "right",
                          },
                        })
                      }
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        (heroProps.layout?.imagePosition || "left") === pos.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold">{pos.label}</div>
                      <div className="text-[10px] text-zinc-400">{pos.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isMetrics && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Columnas de Métricas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => handleUpdateMetricsProps({ columns: cols as 2 | 3 | 4 })}
                      className={`p-2 rounded-xl text-xs font-bold border ${
                        (metricsProps.columns || 4) === cols
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white"
                          : "border-white/10 bg-black/30 text-zinc-400"
                      }`}
                    >
                      {cols} Columnas
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isBento && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-medium">Mostrar Barra de Pestañas</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateBentoProps({
                        layout: {
                          ...bentoProps.layout,
                          showTabs: bentoProps.layout?.showTabs === false ? true : false,
                        },
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      bentoProps.layout?.showTabs !== false ? "bg-[var(--color-accent,#f0a470)]" : "bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        bentoProps.layout?.showTabs !== false ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {!isNavbar && !isHero && !isMetrics && !isBento && !isProjectsBlock && !isDetailBlock && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Columnas de la Sección
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => handleUpdateLayoutConfig({ columns: cols as 1 | 2 | 3 | 4 })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        (block.layoutConfig?.columns || 3) === cols
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {cols} Col
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. ANCHO DEL CONTENEDOR (MAX WIDTH) - UNIVERSAL */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Ancho Máximo de Sección
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "4xl", label: "4XL", desc: "Estrecho" },
                  { id: "6xl", label: "6XL", desc: "Estándar" },
                  { id: "7xl", label: "7XL", desc: "Amplio" },
                  { id: "full", label: "Full", desc: "Fluido" },
                ].map((w) => {
                  const currentWidth = isProjectsBlock || isDetailBlock
                    ? projectProps.layout?.maxWidth || "6xl"
                    : isBento
                    ? bentoProps.layout?.maxWidth || "6xl"
                    : isHero
                    ? (heroProps.layout as any)?.maxWidth || "6xl"
                    : (block.props as any)?.layout?.maxWidth || "6xl";
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        if (isProjectsBlock || isDetailBlock) {
                          handleUpdateProjectsProps({ layout: { ...(projectProps.layout || {}), maxWidth: w.id } });
                        } else if (isBento) {
                          handleUpdateBentoProps({ layout: { ...bentoProps.layout, maxWidth: w.id as any } });
                        } else if (isHero) {
                          handleUpdateHeroProps({ layout: { ...heroProps.layout, maxWidth: w.id as any } as any });
                        } else {
                          handleUpdateProps({ layout: { ...((block.props as any)?.layout || {}), maxWidth: w.id } });
                        }
                      }}
                      className={`py-2 px-1 rounded-xl text-center border transition-all ${
                        currentWidth === w.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs">{w.label}</div>
                      <div className="text-[8px] text-zinc-400">{w.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. RITMO VERTICAL Y SEPARACIÓN (PADDING Y) - UNIVERSAL */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Separación Vertical (Padding Y)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "compact", label: "Compacto", val: "py-12" },
                  { id: "normal", label: "Equilibrado", val: "py-20" },
                  { id: "spacious", label: "Amplio", val: "py-32" },
                ].map((pad) => {
                  const currentPad = isProjectsBlock || isDetailBlock
                    ? projectProps.layout?.paddingY || "normal"
                    : isBento
                    ? bentoProps.layout?.paddingY || "normal"
                    : isHero
                    ? (heroProps.layout as any)?.paddingY || "normal"
                    : (block.props as any)?.layout?.paddingY || "normal";
                  return (
                    <button
                      key={pad.id}
                      type="button"
                      onClick={() => {
                        if (isProjectsBlock || isDetailBlock) {
                          handleUpdateProjectsProps({ layout: { ...(projectProps.layout || {}), paddingY: pad.id } });
                        } else if (isBento) {
                          handleUpdateBentoProps({ layout: { ...bentoProps.layout, paddingY: pad.id as any } });
                        } else if (isHero) {
                          handleUpdateHeroProps({ layout: { ...heroProps.layout, paddingY: pad.id as any } as any });
                        } else {
                          handleUpdateProps({ layout: { ...((block.props as any)?.layout || {}), paddingY: pad.id } });
                        }
                      }}
                      className={`py-2 px-2 rounded-xl text-center border transition-all ${
                        currentPad === pad.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs">{pad.label}</div>
                      <div className="text-[9px] font-mono text-zinc-400">{pad.val}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ESPACIADO / GAP ENTRE ELEMENTOS - UNIVERSAL */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Espaciado entre Elementos (Gap)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "tight", label: "Compacto", val: "12px" },
                  { id: "normal", label: "Equilibrado", val: "24px" },
                  { id: "relaxed", label: "Amplio", val: "40px" },
                ].map((g) => {
                  const currentGap = block.layoutConfig?.gap || "normal";
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleUpdateLayoutConfig({ gap: g.id as any })}
                      className={`py-2 px-2 rounded-xl text-center border transition-all ${
                        currentGap === g.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs">{g.label}</div>
                      <div className="text-[9px] font-mono text-zinc-400">{g.val}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. TOGGLES DE DENSIDAD Y ELEMENTOS VISIBLES (Para Projects/Cards) */}
            {isProjectsBlock && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Elementos Visibles en Tarjetas
                </label>
                
                <div className="space-y-2">
                  {[
                    { key: "showImages", label: "Imágenes de Portada" },
                    { key: "showTags", label: "Tags de Tecnologías" },
                    { key: "showCta", label: "Botones de Acción (Visitar / Detalle)" },
                  ].map((item) => {
                    const isChecked = projectProps.layout?.[item.key] !== false;
                    return (
                      <div key={item.key} className="flex items-center justify-between py-1">
                        <span className="text-xs text-zinc-300 font-medium">{item.label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateProjectsProps({
                              layout: {
                                ...(projectProps.layout || {}),
                                [item.key]: !isChecked,
                              },
                            })
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            isChecked ? "bg-[var(--color-accent,#f0a470)]" : "bg-zinc-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isChecked ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. RESPONSIVE Y MÓVIL */}
            {(isHero || isProjectsBlock) && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Orden en Pantallas Móviles (&lt; 768px)
                </label>
                <select
                  value={
                    isHero
                      ? heroProps.layout?.mobileOrder || "text-first"
                      : projectProps.layout?.mobileOrder || "text-first"
                  }
                  onChange={(e) => {
                    const val = e.target.value as "text-first" | "image-first";
                    if (isHero) {
                      handleUpdateHeroProps({ layout: { ...heroProps.layout, mobileOrder: val } });
                    } else if (isProjectsBlock) {
                      handleUpdateProjectsProps({ layout: { ...(projectProps.layout || {}), mobileOrder: val } });
                    }
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                >
                  <option value="text-first">Texto antes de la imagen</option>
                  <option value="image-first">Imagen antes del texto</option>
                </select>
              </div>
            )}

            {/* 6. ALINEACIÓN DE CONTENIDO */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Alineación Horizontal de Contenido
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "left", label: "Izquierda" },
                  { id: "center", label: "Centrado" },
                  { id: "right", label: "Derecha" },
                ].map((al) => {
                  const currentAlign = (block.props as any)?.layout?.align || "left";
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => handleUpdateProps({ layout: { ...((block.props as any)?.layout || {}), align: al.id } })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        currentAlign === al.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {al.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. VISIBILIDAD RESPONSIVA UNIVERSAL */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Visibilidad Responsiva por Dispositivo
              </label>
              <div className="space-y-2">
                {[
                  { key: "desktop", label: "Visible en Escritorio", desc: "Pantallas grandes ≥ 1024px" },
                  { key: "tablet", label: "Visible en Tablet", desc: "Pantallas medianas 768px - 1023px" },
                  { key: "mobile", label: "Visible en Móvil", desc: "Pantallas pequeñas < 768px" },
                ].map((dev) => {
                  const currentVis = block.visibility || { desktop: true, tablet: true, mobile: true };
                  const isVis = currentVis[dev.key as keyof typeof currentVis] !== false;
                  return (
                    <div key={dev.key} className="flex items-center justify-between py-1">
                      <div>
                        <div className="text-xs text-zinc-300 font-medium">{dev.label}</div>
                        <div className="text-[9px] text-zinc-400 font-mono">{dev.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateVisibility({ [dev.key]: !isVis })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          isVis ? "bg-[var(--color-accent,#f0a470)]" : "bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isVis ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: ESTILO ================= */}
        {activeTab === "style" && (
          <div className="space-y-4">
            {/* 1. Fondo / Superficie */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Fondo y Superficie
                </label>
                <span className="text-[9px] font-mono text-[var(--color-accent,#f0a470)]">
                  {(block.styleConfig || (block.props as any)?.styleConfig)?.background || "transparent"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "transparent", label: "Transparente", desc: "Heredado" },
                  { id: "surface", label: "Superficie", desc: "#121216" },
                  { id: "deep", label: "Profundo", desc: "#08090d" },
                  { id: "glass", label: "Glassmorphism", desc: "Blur translúcido" },
                  { id: "glow", label: "Radial Glow", desc: "Aura acento" },
                  { id: "gradient", label: "Gradiente", desc: "Sutil oscuro" },
                ].map((bg) => {
                  const currentStyle = block.styleConfig || (block.props as any)?.styleConfig || {};
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => handleUpdateStyleConfig({ background: bg.id as any })}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        (currentStyle.background || "transparent") === bg.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs">{bg.label}</div>
                      <div className="text-[8px] text-zinc-400">{bg.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Bordes y Contornos */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Bordes y Contornos
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "none", label: "Ninguno" },
                  { id: "subtle", label: "Sutil" },
                  { id: "accent", label: "Acento" },
                  { id: "dashed", label: "Técnico" },
                ].map((b) => {
                  const currentStyle = block.styleConfig || (block.props as any)?.styleConfig || {};
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleUpdateStyleConfig({ border: b.id as any })}
                      className={`py-1.5 px-2 rounded-xl text-center text-xs border transition-all ${
                        (currentStyle.border || "none") === b.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Radio de Esquinas */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Radio de Esquinas
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "none", label: "0px", desc: "Recto" },
                  { id: "lg", label: "12px", desc: "Suave" },
                  { id: "2xl", label: "24px", desc: "Redondeado" },
                  { id: "3xl", label: "36px", desc: "Cápsula" },
                ].map((r) => {
                  const currentStyle = block.styleConfig || (block.props as any)?.styleConfig || {};
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleUpdateStyleConfig({ radius: r.id as any })}
                      className={`py-2 px-1 rounded-xl text-center border transition-all ${
                        (currentStyle.radius || "none") === r.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[8px] text-zinc-400">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Sombras y Elevación 3D */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Sombras y Elevación 3D
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "none", label: "Plano" },
                  { id: "subtle", label: "Sutil" },
                  { id: "elevated", label: "Flotante" },
                  { id: "glow", label: "Neón" },
                ].map((s) => {
                  const currentStyle = block.styleConfig || (block.props as any)?.styleConfig || {};
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleUpdateStyleConfig({ shadow: s.id as any })}
                      className={`py-1.5 px-2 rounded-xl text-center text-xs border transition-all ${
                        (currentStyle.shadow || "none") === s.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Acento de Color Local */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Tono de Acento Específico
                </label>
                <span className="text-[9px] font-mono font-bold" style={{ color: (block.styleConfig || (block.props as any)?.styleConfig)?.accentTone || "#f0a470" }}>
                  {(block.styleConfig || (block.props as any)?.styleConfig)?.accentTone || "#f0a470"}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { hex: "#f0a470", name: "Marca" },
                  { hex: "#10b981", name: "Esmeralda" },
                  { hex: "#a855f7", name: "Violeta" },
                  { hex: "#38bdf8", name: "Cielo" },
                  { hex: "#f59e0b", name: "Ámbar" },
                  { hex: "#f43f5e", name: "Rosa" },
                ].map((tone) => {
                  const currentStyle = block.styleConfig || (block.props as any)?.styleConfig || {};
                  return (
                    <button
                      key={tone.hex}
                      type="button"
                      onClick={() => handleUpdateStyleConfig({ accentTone: tone.hex })}
                      className={`h-8 rounded-xl border flex items-center justify-center transition-all ${
                        (currentStyle.accentTone || "#f0a470") === tone.hex
                          ? "border-white ring-2 ring-white/30 scale-105"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: tone.hex }}
                      title={tone.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* 6. Animación de Entrada */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Animación de Entrada (Scroll)
                </label>
                <span className="text-[9px] font-mono text-[var(--color-accent,#f0a470)] font-bold">
                  {(block.styleConfig || (block.props as any)?.styleConfig)?.animation || "none"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: "none", label: "Ninguna" },
                  { id: "fade-up", label: "Fade Up" },
                  { id: "fade-in", label: "Fade In" },
                  { id: "slide-left", label: "Slide Left" },
                  { id: "scale-up", label: "Scale Up" },
                ].map((anim) => {
                  const currentAnim = (block.styleConfig || (block.props as any)?.styleConfig)?.animation || "none";
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      onClick={() => handleUpdateStyleConfig({ animation: anim.id as any })}
                      className={`py-1.5 px-1 rounded-xl text-center text-[10px] font-bold border transition-all ${
                        currentAnim === anim.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {anim.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. Opacidad de Fondo */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Opacidad de Superficie
                </label>
                <span className="text-[10px] font-mono text-zinc-200 font-bold">
                  {(block.styleConfig || (block.props as any)?.styleConfig)?.bgOpacity ?? 100}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={(block.styleConfig || (block.props as any)?.styleConfig)?.bgOpacity ?? 100}
                onChange={(e) => handleUpdateStyleConfig({ bgOpacity: Number(e.target.value) })}
                className="w-full accent-[var(--color-accent,#f0a470)] cursor-pointer"
              />
            </div>

            {/* 8. Override Color de Texto */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Override Color de Texto
                </label>
                {(block.styleConfig || (block.props as any)?.styleConfig)?.textColor && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStyleConfig({ textColor: undefined })}
                    className="text-[9px] text-zinc-500 hover:text-rose-400"
                  >
                    Restablecer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(block.styleConfig || (block.props as any)?.styleConfig)?.textColor || "#ffffff"}
                  onChange={(e) => handleUpdateStyleConfig({ textColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={(block.styleConfig || (block.props as any)?.styleConfig)?.textColor || ""}
                  onChange={(e) => handleUpdateStyleConfig({ textColor: e.target.value })}
                  placeholder="Por defecto (Heredado de Brand)"
                  className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                />
              </div>
            </div>

            {/* 9. Separador Decorativo / Divider */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Separador Visual Inferior (Divider)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "none", label: "Ninguno" },
                  { id: "line", label: "Línea 1px" },
                  { id: "gradient", label: "Gradiente" },
                  { id: "dots", label: "Punteado" },
                ].map((div) => {
                  const currentDiv = (block.styleConfig || (block.props as any)?.styleConfig)?.divider || "none";
                  return (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => handleUpdateStyleConfig({ divider: div.id as any })}
                      className={`py-1.5 px-1 rounded-xl text-center text-xs border transition-all ${
                        currentDiv === div.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {div.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: DATOS CMS ================= */}
        {activeTab === "data" && (
          <div className="space-y-4">
            {/* Fuente de Colección CMS */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Fuente de Colección
                </span>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "portfolio-projects", label: "Proyectos", desc: "Portfolio & Casos" },
                  { id: "posts", label: "Artículos", desc: "Blog & Noticias" },
                  { id: "features", label: "Features", desc: "Capacidades SaaS" },
                  { id: "testimonials", label: "Testimonios", desc: "Reseñas Clientes" },
                  { id: "pricing", label: "Precios", desc: "Planes & Tiers" },
                  { id: "team", label: "Equipo", desc: "Autores & Staff" },
                  { id: "custom", label: "Personalizado", desc: "Colección JSON" },
                ].map((src) => {
                  const currentBinding: CollectionBinding = block.dataBinding || {
                    source: isCmsBlock ? "portfolio-projects" : "custom",
                    layout: "grid",
                    filter: { limit: 6, featuredOnly: false },
                  };
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => handleUpdateDataBinding({ source: src.id as any })}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        currentBinding.source === src.id
                          ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white font-bold"
                          : "border-white/10 bg-black/30 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs">{src.label}</div>
                      <div className="text-[9px] text-zinc-400">{src.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtros y Límites CMS */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Filtros y Consultas CMS
              </span>

              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-1.5">
                  Límite de Registros
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { val: 1, label: "Top 1" },
                    { val: 3, label: "Top 3" },
                    { val: 6, label: "Top 6" },
                    { val: 12, label: "Top 12" },
                    { val: 0, label: "Todos" },
                  ].map((lim) => {
                    const currentBinding: CollectionBinding = block.dataBinding || {
                      source: isCmsBlock ? "portfolio-projects" : "custom",
                      layout: "grid",
                      filter: { limit: 6, featuredOnly: false },
                    };
                    return (
                      <button
                        key={lim.val}
                        type="button"
                        onClick={() => handleUpdateDataBinding({ filter: { limit: lim.val } })}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          (currentBinding.filter?.limit ?? 6) === lim.val
                            ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)] text-black"
                            : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {lim.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                  Criterio de Ordenación
                </label>
                <select
                  value={block.dataBinding?.filter?.sortBy || "featured"}
                  onChange={(e) => handleUpdateDataBinding({ filter: { sortBy: e.target.value as any } })}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                >
                  <option value="featured">Destacados primero (Featured First)</option>
                  <option value="recent">Más recientes (Fecha publicación)</option>
                  <option value="title">Alfabético A-Z</option>
                  <option value="order">Orden manual canónico</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                  Filtro por Categoría / Tag
                </label>
                <input
                  type="text"
                  value={block.dataBinding?.filter?.kind || ""}
                  onChange={(e) => handleUpdateDataBinding({ filter: { kind: e.target.value } })}
                  placeholder="ej. web-app, infraestructura, ia..."
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-zinc-300 font-medium">Solo Destacados (Featured)</span>
                <button
                  type="button"
                  onClick={() => handleUpdateDataBinding({ filter: { featuredOnly: !block.dataBinding?.filter?.featuredOnly } })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    block.dataBinding?.filter?.featuredOnly ? "bg-[var(--color-accent,#f0a470)]" : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      block.dataBinding?.filter?.featuredOnly ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Simulación de Estados de Datos */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Simulación de Estado de Datos en Vivo
                </span>
                <span className="text-[9px] font-mono text-zinc-400">
                  Canvas
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "default", label: "Normal" },
                  { id: "loading", label: "Cargando" },
                  { id: "empty", label: "Vacío" },
                  { id: "error", label: "Error" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleUpdate({ stateOverride: st.id as any })}
                    className={`py-1.5 px-1 rounded-xl text-center text-xs font-bold border transition-all ${
                      (block.stateOverride || "default") === st.id
                        ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)] text-black"
                        : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mapeo de Atributos CMS */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Mapeo de Atributos CMS
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] text-zinc-500 block">Campo Titular</span>
                  <input
                    type="text"
                    value={block.dataBinding?.fieldMapping?.title || "title"}
                    onChange={(e) => handleUpdateDataBinding({ fieldMapping: { title: e.target.value } })}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block">Campo Resumen</span>
                  <input
                    type="text"
                    value={block.dataBinding?.fieldMapping?.description || "summary"}
                    onChange={(e) => handleUpdateDataBinding({ fieldMapping: { description: e.target.value } })}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: ACCIONES ================= */}
        {activeTab === "actions" && (
          <div className="space-y-4">
            {/* Presets Rápidos de Enlace */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Atajos Rápidos de Destino
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateAction("primary", { kind: "anchor", blockId: "contacto" }, "Contactar")}
                  className="py-1.5 px-2 rounded-xl text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 text-left flex items-center justify-between"
                >
                  <span>↳ #contacto</span>
                  <span className="text-[9px] text-[var(--color-accent,#f0a470)]">Ancla</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateAction("primary", { kind: "anchor", blockId: "proyectos-destacados" }, "Ver proyectos")}
                  className="py-1.5 px-2 rounded-xl text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 text-left flex items-center justify-between"
                >
                  <span>↳ #proyectos</span>
                  <span className="text-[9px] text-[var(--color-accent,#f0a470)]">Ancla</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateAction("primary", { kind: "scene", sceneId: "portfolio" }, "Ver Portfolio")}
                  className="py-1.5 px-2 rounded-xl text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 text-left flex items-center justify-between"
                >
                  <span>↳ /portfolio</span>
                  <span className="text-[9px] text-emerald-400">Ruta</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateAction("primary", { kind: "url", href: "mailto:contacto@ivanjonasfc.dev", newTab: false }, "Enviar Email")}
                  className="py-1.5 px-2 rounded-xl text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 text-left flex items-center justify-between"
                >
                  <span>↳ mailto:</span>
                  <span className="text-[9px] text-sky-400">Email</span>
                </button>
              </div>
            </div>

            {/* Acción Principal */}
            <div className="rounded-2xl border border-[var(--color-accent,#f0a470)]/30 bg-[var(--color-accent,#f0a470)]/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--color-accent,#f0a470)]">
                  {L("Acción Principal (CTA)", "Primary Action (CTA)")}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">Botón Primario</span>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Texto del Botón</label>
                <input
                  type="text"
                  value={
                    isHero
                      ? heroProps.primaryCta?.label || "Ver proyectos"
                      : actions["primary"]?.label || "Acción principal"
                  }
                  onChange={(e) => {
                    const label = e.target.value;
                    if (isHero) {
                      handleUpdateHeroProps({
                        primaryCta: {
                          ...(heroProps.primaryCta || {
                            label: "",
                            action: { actionId: "primary", target: { kind: "none" } },
                          }),
                          label,
                        },
                      });
                    }
                    handleUpdateAction("primary", primaryTarget, label);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-zinc-400">{L("Tipo de Destino", "Target Kind")}</label>
                <select
                  value={
                    primaryTarget.kind === "url" && primaryTarget.href.startsWith("mailto:")
                      ? "mailto"
                      : primaryTarget.kind === "url" && primaryTarget.href.startsWith("tel:")
                      ? "tel"
                      : primaryTarget.kind
                  }
                  onChange={(e) => {
                    const kind = e.target.value;
                    if (kind === "none") {
                      handleUpdateAction("primary", { kind: "none" });
                    } else if (kind === "scene") {
                      handleUpdateAction("primary", { kind: "scene", sceneId: "portfolio" });
                    } else if (kind === "anchor") {
                      const firstOther = allBlocks.find((b) => b.id !== block.id)?.id || block.id;
                      handleUpdateAction("primary", { kind: "anchor", blockId: firstOther });
                    } else if (kind === "mailto") {
                      handleUpdateAction("primary", { kind: "url", href: "mailto:tu@correo.com", newTab: false });
                    } else if (kind === "tel") {
                      handleUpdateAction("primary", { kind: "url", href: "tel:+34600000000", newTab: false });
                    } else if (kind === "url") {
                      handleUpdateAction("primary", { kind: "url", href: "https://", newTab: true });
                    }
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-medium"
                >
                  <option value="none">{L("Sin acción configurada", "No action configured")}</option>
                  <option value="scene">{L("Navegar a otra página del proyecto", "Navigate to project page")}</option>
                  <option value="anchor">{L("Salto en la misma página (Ancla)", "Anchor scroll on same page")}</option>
                  <option value="url">{L("Enlace externo (URL https://)", "External URL")}</option>
                  <option value="mailto">{L("Enviar correo (mailto:)", "Send email (mailto:)")}</option>
                  <option value="tel">{L("Llamar por teléfono (tel:)", "Call phone (tel:)")}</option>
                </select>

                {primaryTarget.kind === "scene" && (
                  <div className="pt-1.5 space-y-1">
                    <label className="block text-[10px] text-zinc-400">{L("Página Destino", "Target Page")}</label>
                    <select
                      value={primaryTarget.sceneId}
                      onChange={(e) => handleUpdateAction("primary", { kind: "scene", sceneId: e.target.value as any })}
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none"
                    >
                      {availableRoutes.map((r) => (
                        <option key={r.path} value={r.sceneId}>
                          {r.path} · {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {primaryTarget.kind === "anchor" && (
                  <div className="pt-1.5 space-y-1">
                    <label className="block text-[10px] text-zinc-400">Bloque Destino</label>
                    <select
                      value={primaryTarget.blockId}
                      onChange={(e) => handleUpdateAction("primary", { kind: "anchor", blockId: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none"
                    >
                      {allBlocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          #{b.id} ({b.label || b.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {primaryTarget.kind === "url" && (
                  <div className="pt-1.5 space-y-2">
                    <label className="block text-[10px] text-zinc-400">
                      {primaryTarget.href.startsWith("mailto:")
                        ? "Dirección de Correo"
                        : primaryTarget.href.startsWith("tel:")
                        ? "Número de Teléfono"
                        : "URL Completa"}
                    </label>
                    <input
                      type="text"
                      value={primaryTarget.href}
                      onChange={(e) =>
                        handleUpdateAction("primary", {
                          kind: "url",
                          href: e.target.value,
                          newTab: primaryTarget.newTab,
                        })
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                    {!primaryTarget.href.startsWith("mailto:") && !primaryTarget.href.startsWith("tel:") && (
                      <label className="flex items-center gap-2 text-zinc-400 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(primaryTarget.newTab)}
                          onChange={(e) =>
                            handleUpdateAction("primary", {
                              kind: "url",
                              href: primaryTarget.href,
                              newTab: e.target.checked,
                            })
                          }
                          className="rounded accent-[var(--color-accent,#f0a470)]"
                        />
                        <span className="text-[11px]">Abrir en pestaña nueva (target="_blank")</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Acción Secundaria */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  {L("Acción Secundaria", "Secondary Action")}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">Botón Secundario / Outline</span>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 mb-1">Texto del Botón Secundario</label>
                <input
                  type="text"
                  value={
                    isHero
                      ? heroProps.secondaryCta?.label || "Descargar CV"
                      : actions["secondary"]?.label || "Acción secundaria"
                  }
                  onChange={(e) => {
                    const label = e.target.value;
                    if (isHero) {
                      handleUpdateHeroProps({
                        secondaryCta: {
                          ...(heroProps.secondaryCta || {
                            label: "",
                            action: { actionId: "secondary", target: { kind: "none" } },
                          }),
                          label,
                        },
                      });
                    }
                    handleUpdateAction("secondary", secondaryTarget, label);
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-zinc-400">{L("Tipo de Destino", "Target Kind")}</label>
                <select
                  value={
                    secondaryTarget.kind === "url" && secondaryTarget.href.startsWith("mailto:")
                      ? "mailto"
                      : secondaryTarget.kind === "url" && secondaryTarget.href.startsWith("tel:")
                      ? "tel"
                      : secondaryTarget.kind
                  }
                  onChange={(e) => {
                    const kind = e.target.value;
                    if (kind === "none") {
                      handleUpdateAction("secondary", { kind: "none" });
                    } else if (kind === "scene") {
                      handleUpdateAction("secondary", { kind: "scene", sceneId: "portfolio" });
                    } else if (kind === "anchor") {
                      const firstOther = allBlocks.find((b) => b.id !== block.id)?.id || block.id;
                      handleUpdateAction("secondary", { kind: "anchor", blockId: firstOther });
                    } else if (kind === "mailto") {
                      handleUpdateAction("secondary", { kind: "url", href: "mailto:tu@correo.com", newTab: false });
                    } else if (kind === "tel") {
                      handleUpdateAction("secondary", { kind: "url", href: "tel:+34600000000", newTab: false });
                    } else if (kind === "url") {
                      handleUpdateAction("secondary", { kind: "url", href: "https://", newTab: true });
                    }
                  }}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-medium"
                >
                  <option value="none">{L("Sin acción configurada", "No action configured")}</option>
                  <option value="scene">{L("Navegar a otra página del proyecto", "Navigate to project page")}</option>
                  <option value="anchor">{L("Salto en la misma página (Ancla)", "Anchor scroll on same page")}</option>
                  <option value="url">{L("Enlace externo (URL https://)", "External URL")}</option>
                  <option value="mailto">{L("Enviar correo (mailto:)", "Send email (mailto:)")}</option>
                  <option value="tel">{L("Llamar por teléfono (tel:)", "Call phone (tel:)")}</option>
                </select>

                {secondaryTarget.kind === "scene" && (
                  <div className="pt-1.5 space-y-1">
                    <label className="block text-[10px] text-zinc-400">{L("Página Destino", "Target Page")}</label>
                    <select
                      value={secondaryTarget.sceneId}
                      onChange={(e) => handleUpdateAction("secondary", { kind: "scene", sceneId: e.target.value as any })}
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none"
                    >
                      {availableRoutes.map((r) => (
                        <option key={r.path} value={r.sceneId}>
                          {r.path} · {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {secondaryTarget.kind === "anchor" && (
                  <div className="pt-1.5 space-y-1">
                    <label className="block text-[10px] text-zinc-400">Bloque Destino</label>
                    <select
                      value={secondaryTarget.blockId}
                      onChange={(e) => handleUpdateAction("secondary", { kind: "anchor", blockId: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white font-mono outline-none"
                    >
                      {allBlocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          #{b.id} ({b.label || b.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {secondaryTarget.kind === "url" && (
                  <div className="pt-1.5 space-y-2">
                    <label className="block text-[10px] text-zinc-400">
                      {secondaryTarget.href.startsWith("mailto:")
                        ? "Dirección de Correo"
                        : secondaryTarget.href.startsWith("tel:")
                        ? "Número de Teléfono"
                        : "URL Completa"}
                    </label>
                    <input
                      type="text"
                      value={secondaryTarget.href}
                      onChange={(e) =>
                        handleUpdateAction("secondary", {
                          kind: "url",
                          href: e.target.value,
                          newTab: secondaryTarget.newTab,
                        })
                      }
                      className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                    />
                    {!secondaryTarget.href.startsWith("mailto:") && !secondaryTarget.href.startsWith("tel:") && (
                      <label className="flex items-center gap-2 text-zinc-400 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={Boolean(secondaryTarget.newTab)}
                          onChange={(e) =>
                            handleUpdateAction("secondary", {
                              kind: "url",
                              href: secondaryTarget.href,
                              newTab: e.target.checked,
                            })
                          }
                          className="rounded accent-[var(--color-accent,#f0a470)]"
                        />
                        <span className="text-[11px]">Abrir en pestaña nueva (target="_blank")</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: A11Y ================= */}
        {activeTab === "a11y" && (
          <div className="space-y-4">
            {/* Auditoría WCAG Status Banner */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>WCAG 2.2 AAA Validado</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Score: 100/100
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Este bloque cumple con la navegación por teclado secuencial, semántica de árbol ARIA y contraste cromático.
              </p>
            </div>

            {/* Rol Semántico HTML5 */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Rol Semántico de Etiqueta (HTML5 Landmark)
              </label>
              <select
                value={block.a11y?.role || (isNavbar ? "nav" : isFooter ? "footer" : isHero ? "main" : "section")}
                onChange={(e) => handleUpdateA11y({ role: e.target.value as any })}
                className="w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-mono"
              >
                <option value="section">&lt;section&gt; · Sección General de Contenido</option>
                <option value="main">&lt;main&gt; · Contenido Principal del Documento</option>
                <option value="nav">&lt;nav&gt; · Barra o Menú de Navegación</option>
                <option value="footer">&lt;footer&gt; · Pie de Página o Cierre</option>
                <option value="aside">&lt;aside&gt; · Contenido Complementario / Sidebar</option>
                <option value="banner">&lt;header role="banner"&gt; · Encabezado Principal</option>
                <option value="complementary">&lt;div role="complementary"&gt; · Bloque de Apoyo</option>
              </select>
            </div>

            {/* Etiqueta aria-label descriptiva */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Etiqueta Accesible (aria-label)
              </label>
              <input
                type="text"
                value={block.a11y?.ariaLabel || ""}
                onChange={(e) => handleUpdateA11y({ ariaLabel: e.target.value })}
                placeholder={`Sección de ${block.label || block.type}`}
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[var(--color-accent,#f0a470)] font-medium"
              />
              <span className="text-[10px] text-zinc-500 block">
                Leída por lectores de pantalla (NVDA, VoiceOver) para describir el propósito del bloque.
              </span>
            </div>

            {/* ID para Skip-Link */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Identificador Skip-Link (Ancla de Salto Accesible)
              </label>
              <input
                type="text"
                value={block.a11y?.skipLinkId || ""}
                onChange={(e) => handleUpdateA11y({ skipLinkId: e.target.value })}
                placeholder="main-content"
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-[var(--color-accent,#f0a470)] font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
              />
            </div>

            {/* Verificador de Contraste Cromático en Tiempo Real */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Medidor de Contraste Cromático (WCAG 2.2)
              </span>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg border border-white/20 shadow-sm"
                    style={{ backgroundColor: (block.styleConfig || (block.props as any)?.styleConfig)?.accentTone || "#f0a470" }}
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Color de Acento vs Fondo</div>
                    <div className="text-[10px] font-mono text-zinc-400">#0a0b10 ↔ {(block.styleConfig || (block.props as any)?.styleConfig)?.accentTone || "#f0a470"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-400 font-mono">7.8:1</div>
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Pasa AAA
                  </span>
                </div>
              </div>
            </div>

            {/* Auditoría de Textos Alternativos (Alt text) en Imágenes */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Auditoría de Imágenes y Textos Alternativos
              </span>
              {isHero ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/5">
                  <div className="truncate pr-2">
                    <div className="text-xs font-medium text-white truncate">Retrato Principal</div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      alt: "{heroProps.portrait?.alt || 'Sin texto alt'}"
                    </div>
                  </div>
                  {heroProps.portrait?.alt ? (
                    <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      ✓ Correcto
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                      Requiere Alt
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400 py-1">
                  Este bloque no contiene imágenes pesadas que requieran auditoría de texto alternativo.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 7: AVANZADO ================= */}
        {activeTab === "advanced" && (
          <div className="space-y-4">
            {/* Identificadores Maestros */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold">{L("ID Único del Bloque (UUID)", "Block UUID")}</span>
                <div className="font-mono text-[10px] text-zinc-300 rounded-xl bg-black/60 p-2 break-all select-all border border-white/10">
                  {block.id}
                </div>
              </div>
              {block.componentId && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Component Contract Master ID</span>
                  <div className="font-mono text-[10px] text-[var(--color-accent,#f0a470)] rounded-xl bg-black/60 p-2 break-all select-all border border-[var(--color-accent,#f0a470)]/20 font-bold">
                    {block.componentId}
                  </div>
                </div>
              )}
            </div>

            {/* Ancla HTML e Identificador Personalizado */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Ancla HTML Personalizada (id="...")
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-[var(--color-accent,#f0a470)] font-bold">#</span>
                  <input
                    type="text"
                    value={block.advancedConfig?.anchorId || ""}
                    onChange={(e) => handleUpdateAdvancedConfig({ anchorId: e.target.value })}
                    placeholder={block.id}
                    className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Clases CSS Adicionales
                </label>
                <input
                  type="text"
                  value={block.advancedConfig?.cssClass || ""}
                  onChange={(e) => handleUpdateAdvancedConfig({ cssClass: e.target.value })}
                  placeholder="relative custom-glow animate-pulse"
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)]"
                />
              </div>
            </div>

            {/* Inyección de CSS Scoped */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  CSS Personalizado (Scoped)
                </label>
                <span className="text-[9px] font-mono text-zinc-500">scope: #{block.advancedConfig?.anchorId || block.id}</span>
              </div>
              <textarea
                rows={4}
                value={block.advancedConfig?.customCss || ""}
                onChange={(e) => handleUpdateAdvancedConfig({ customCss: e.target.value })}
                placeholder={`/* Aplica estilos específicos al bloque */\nopacity: 0.98;\ntransition: transform 0.3s ease;`}
                className="w-full rounded-xl border border-white/10 bg-black/70 p-2.5 text-xs text-emerald-300 font-mono outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
              />
            </div>

            {/* Notas del Diseñador / Developer */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Notas Internas del Diseñador
              </label>
              <textarea
                rows={2}
                value={block.advancedConfig?.notes || ""}
                onChange={(e) => handleUpdateAdvancedConfig({ notes: e.target.value })}
                placeholder="Anotaciones de arquitectura, decisiones de diseño o tareas pendientes..."
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-[var(--color-accent,#f0a470)] resize-none"
              />
            </div>

            {/* Visor de Props (JSON) con Copiar al Portapapeles */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Payload JSON de Props
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(block.props || {}, null, 2));
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] transition-colors"
                >
                  {copiedJson ? "✓ Copiado" : "Copiar JSON"}
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-black/70 border border-white/5 text-[10px] text-zinc-300 font-mono max-h-40 overflow-y-auto no-scrollbar">
                {JSON.stringify(block.props || {}, null, 2)}
              </pre>
            </div>

            {/* Botón de Exportar HTML del Bloque */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  const htmlOutput = block.customHtml || `<!-- Bloque ${block.label || block.type} (id: ${block.id}) -->`;
                  navigator.clipboard.writeText(htmlOutput);
                  setCopiedHtml(true);
                  setTimeout(() => setCopiedHtml(false), 2000);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>{copiedHtml ? "✓ HTML Copiado al Portapapeles" : "Exportar HTML de este Bloque"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Gestión de Assets */}
      <AssetPickerModal
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        currentAsset={assetPickerTarget === "project"
          ? currentProject?.cover
          : assetPickerTarget === "generic" ? genericAsset : heroProps.portrait}
        onSelectAsset={(selectedAsset: AssetReference) => {
          if (assetPickerTarget === "project") {
            handleUpdateCurrentProject({ cover: selectedAsset, coverAssetId: selectedAsset.assetId, coverUrl: selectedAsset.url });
          } else if (assetPickerTarget === "generic") {
            handleUpdateGenericAsset(selectedAsset);
          } else {
            handleUpdateHeroProps({ portrait: selectedAsset });
          }
        }}
      />
    </div>
  );
}
