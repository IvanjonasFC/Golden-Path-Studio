"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  compileBrand,
  getResolvedValue,
  resolveTokens,
  setTokenValue,
  DEFAULT_EFFECTS,
  EFFECT_PRESETS,
  type TokenGroup,
  type EffectsConfig,
} from "@/lib/tokens";
import type { ComponentDTO, ComponentFile } from "@/lib/types";
import BrandBehavior from "./BrandBehavior";
import { PRESETS, applyPresetToDoc, type Blueprint, type ProjectView, type OriginInfo } from "@/lib/blueprint";
import { seedEditableFromBlueprint } from "@/lib/seedEditor";
import { t } from "@/lib/i18n";
import { resolveBlueprint, type ResolvedConfig } from "@/lib/resolve";
import { StatusPill, AuditDrawer } from "./BrandSynthesis";
import {
  SCENE_SLOTS,
  SCENE_LABEL,
  SCENE_ORDER,
  samplesForSlot,
  slotStateOf,
  statsFromDefs,
  componentUsage,
  categoryMatchesSlot,
  sceneSlotsResolved,
  dynamicSlotDef,
  allSlotIdsFor,
  resolveSceneLayout,
  reorderSceneBlocks,
  duplicateSceneBlock,
  insertSceneBlock,
  removeSceneBlock,
  updateSceneBlockLink,
  updateSceneBlockAction,
  removeSceneBlockAction,
  resolveBlockActions,
  SCENE_DEFINITIONS,
  routeForScene,
  sceneForRoute,
  type SceneId,
  type SceneSlot,
  type SlotFlags,
  type SceneBlockInstance,
  type BlockActionBinding,
  type LinkTarget,
  type RuntimeMode,
  type DataStateMode,
  type PrecisionViewport,
  PRECISION_VIEWPORTS,
  CANONICAL_PROJECT_ROUTES,
  detectBlockIncompatibilities,
  resolveBlockBreadcrumb,
  computeDocumentHash,
  checkSlotInsertionConflict,
  type SlotDefinition,
  type ProjectDocument,
  type PageNode,
  type PageRoute,
} from "@/lib/scenes";
import { BlockInspector } from "./BlockInspector";
import {
  renderHeroTemplate,
  renderNavbarTemplate,
  renderMetricsTemplate,
  renderBentoTemplate,
  renderContactTemplate,
  renderFooterTemplate,
  type SubnodeTarget,
} from "@/lib/componentContract";
import { ActionableCoverageDrawer } from "./ActionableCoverageDrawer";
import { ConflictResolverModal } from "./ConflictResolverModal";
import { ProductionModeGuardModal } from "./ProductionModeGuardModal";
import { PROJECT_TEMPLATES, applyTemplateToDoc, applyGuidedToDoc, type TemplatePart, type GuidedAnswers } from "@/lib/templates";
import { seedScenes } from "@/lib/seed";
import { TemplatesGallery } from "./TemplatesGallery";
import { GuidedSetup } from "./GuidedSetup";
import { CustomSelect } from "./CustomSelect";
import { logEvent } from "@/lib/log";
import type { RestoredBrand } from "./BrandVersions";
import WcagLiveAuditor from "./WcagLiveAuditor";
import type { DeficiencyType } from "@/lib/contrast";
import {
  assembleNextJsPage,
  assembleAstroPage,
  assembleHtmlPage,
  generateSceneMasterPrompt,
  applyRoutingLinks,
  resolveTargetUrl,
} from "@/lib/sceneAssembler";
import {
  renderProjectsGrid,
  renderProjectDetailTemplate,
  INITIAL_PORTFOLIO_PROJECTS,
  type PortfolioProject,
} from "@/lib/portfolioProjects";
import {
  resolveProjectCollection,
  resolveProjectBySlug,
  matchProjectRoute,
  renderProjectNotFound,
  isProjectDetailBlock,
  updateProjectBySlug,
} from "@/lib/projectCollectionResolver";

// Mapa plano de tokens visuales para alimentar la resolucion en Visual.
function brandVisualTokensForResolve(doc: TokenGroup): Record<string, string> {
  const keys = ["color.bg", "color.text", "color.action.primary", "font.body", "font.heading", "radius.button", "radius.card"];
  const o: Record<string, string> = {};
  for (const k of keys) { const v = getResolvedValue(doc, k); if (typeof v === "string" && v.trim()) o[k] = v; }
  return o;
}

function invertHex(color: string) {
  if (/^#[0-9a-fA-F]{6}$/i.test(color)) {
    const r = 255 - parseInt(color.slice(1, 3), 16);
    const g = 255 - parseInt(color.slice(3, 5), 16);
    const b = 255 - parseInt(color.slice(5, 7), 16);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m) {
    const r = 255 - parseInt(m[1]);
    const g = 255 - parseInt(m[2]);
    const b = 255 - parseInt(m[3]);
    const a = m[4] ? `, ${m[4]}` : "";
    return `rgba(${r}, ${g}, ${b}${a})`;
  }
  return color;
}

type Doc = TokenGroup & { effects?: EffectsConfig };
interface Part {
  id: string;
  name: string;
  kind: string;
  code: string;
}
interface BrandDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tokens: Doc;
  previewIds: string[];
  parts: Part[];
}
interface Sample {
  id: string;
  name: string;
  framework: string;
  files: ComponentFile[];
  previewHtml: string | null;
  category?: string;
  html?: string;
  css?: string;
}

const GUARD = '<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a)e.preventDefault();},true);document.addEventListener("submit",function(e){e.preventDefault();},true);</script>';

type SlotKind = "color" | "font" | "dim";
const SLOTS: Array<{ label: string; path: string; kind: SlotKind }> = [
  { label: "Fondo", path: "color.bg", kind: "color" },
  { label: "Superficie", path: "color.surface", kind: "color" },
  { label: "Texto", path: "color.text", kind: "color" },
  { label: "Texto atenuado", path: "color.muted", kind: "color" },
  { label: "Acción primaria", path: "color.action.primary", kind: "color" },
  { label: "Primaria (hover)", path: "color.action.primary-hover", kind: "color" },
  { label: "Acento", path: "color.action.accent", kind: "color" },
  { label: "Fuente cuerpo", path: "font.body", kind: "font" },
  { label: "Fuente títulos", path: "font.heading", kind: "font" },
  { label: "Radio botón", path: "radius.button", kind: "dim" },
  { label: "Radio tarjeta", path: "radius.card", kind: "dim" },
];
const FONTS = ["Inter", "Space Grotesk", "Roboto", "Poppins", "Montserrat", "Georgia", "system-ui", "monospace"];

function toSample(c: ComponentDTO): Sample {
  return { id: c.id, name: c.name, framework: c.framework, files: c.files, previewHtml: c.previewHtml, category: c.category };
}

function effectsOf(doc: Doc): Required<EffectsConfig> {
  const e = doc.effects ?? {};
  return {
    background: { ...DEFAULT_EFFECTS.background, ...(e.background ?? {}) },
    pattern: { ...DEFAULT_EFFECTS.pattern, ...(e.pattern ?? {}) },
    glow: { ...DEFAULT_EFFECTS.glow, ...(e.glow ?? {}) },
    grain: { ...DEFAULT_EFFECTS.grain, ...(e.grain ?? {}) },
    vignette: { ...DEFAULT_EFFECTS.vignette, ...(e.vignette ?? {}) },
    gradient: { ...DEFAULT_EFFECTS.gradient, ...(e.gradient ?? {}) },
    grid: e.grid ?? {},
  } as Required<EffectsConfig>;
}

function brandifyHtml(html?: string): string {
  if (!html) return "";
  return html;
}

function BlockTypeIcon({ type, className = "w-3.5 h-3.5 shrink-0" }: { type: string; className?: string }) {
  const t = type.toLowerCase();
  if (t === "nav") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    );
  }
  if (t === "hero") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (t === "stats" || t === "metrics") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    );
  }
  if (t === "bento" || t === "features") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
    );
  }
  if (t === "cards" || t === "projects") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="7" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  }
  if (t === "contact" || t === "form") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    );
  }
  if (t === "footer") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <line x1="3" x2="21" y1="15" y2="15" />
      </svg>
    );
  }
  if (t === "sidebar") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <line x1="9" x2="9" y1="3" y2="21" />
      </svg>
    );
  }
  if (t === "auth") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (t === "dashboard") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function realDoc(sample: Sample, css: string, font: string): string {
  const html = brandifyHtml(sample.files.find((f) => /\.html?$/i.test(f.path))?.content);
  const tw = sample.framework === "tailwind" ? '<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={darkMode:"class"}</script>' : "";
  return `<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${tw}<style>${css}
*{box-sizing:border-box}html,body{height:100%;margin:0}
.brand-bg{min-height:100%;display:grid;place-items:center;font-family:${font},system-ui,sans-serif;padding:12px}
</style>${GUARD}</head><body><div class="brand-bg">${html}</div></body></html>`;
}

/* ==========================================================================
   MOTOR DE ESCENA REAL (Fase 2)
   Renderiza cada escena (landing/dashboard/auth/form/mobile/states) como HTML
   real, inyectando componentes reales en cada slot. Fuente de asignación:
   1) explícita (tokens.blueprint.slots[scene][slotId] = componentId),
   2) fallback por categoría (primer componente compatible sin usar),
   3) placeholder punteado clicable si no hay ninguno.
   Cada slot con contenido/relleno es clicable → postMessage SLOT_SELECT.
   ========================================================================== */
type SlotMap = Record<string, string>; // slotId -> componentId

const SCENE_STYLES = `
*{box-sizing:border-box}
html,body{
  height:100%;
  width:100%;
  max-width:100vw;
  overflow-x:hidden !important;
  scroll-behavior:auto;
}
body{
  margin:0;
  padding:0;
  color:var(--color-text);
  font-family:var(--font-body),system-ui,sans-serif;
  min-height:100vh;
  background-color:var(--color-bg);
  background-image:
    radial-gradient(ellipse 70% 40% at 50% 0%, color-mix(in srgb, var(--color-action-primary, #f97316) 12%, transparent), transparent 70%),
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 100% 100%, 32px 32px, 32px 32px;
}
/* Sleek custom scrollbars to prevent ugly white native scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.25);
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-action-primary, #f0a470);
}
h1,h2,h3{font-family:var(--font-heading),var(--font-body),sans-serif;margin:0 0 8px}
.muted{color:var(--color-muted)}
.card{background:var(--color-surface);border:1px solid color-mix(in srgb,var(--color-text) 12%,transparent);border-radius:var(--radius-card);padding:24px;}
.btn{border:0;cursor:pointer;font:inherit;font-weight:600;padding:10px 20px;border-radius:var(--radius-button);background:var(--color-action-primary);color:#fff;display:inline-flex;align-items:center;justify-content:center;}
.btn:hover{background:var(--color-action-primary-hover)}
.btn.ghost{background:transparent;color:var(--color-action-primary);border:1px solid var(--color-action-primary)}
.badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:500;background:color-mix(in srgb,var(--color-action-accent) 22%,transparent);color:var(--color-action-accent)}
.input{width:100%;padding:10px 14px;border-radius:var(--radius-button);background:var(--color-bg);color:var(--color-text);border:1px solid color-mix(in srgb,var(--color-text) 18%,transparent);outline:none;}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
a{color:var(--color-action-primary)}
.mock-header{width:100%;padding:16px 32px;border-bottom:1px solid color-mix(in srgb,var(--color-text) 10%,transparent);display:flex;justify-content:space-between;align-items:center;background:color-mix(in srgb,var(--color-bg) 50%,transparent);backdrop-filter:blur(12px);flex-wrap:wrap;gap:16px;}
.mock-nav{display:flex;gap:32px;font-size:14px;font-weight:500;}
.mock-main{display:flex;flex-direction:column;align-items:center;padding:64px 24px;text-align:center;width:100%;max-width:1200px;margin:0 auto;}
.mock-title{font-size:3rem;line-height:1.05;margin-bottom:16px;max-width:900px;letter-spacing:-0.02em;}
/* Slots interactivos */
.slot{position:relative;border-radius:14px;transition:outline .15s ease;}
.slot--clickable{cursor:pointer;}
.slot--clickable:hover{outline:2px dashed var(--color-action-primary);outline-offset:6px;}
.slot-tag{position:absolute;top:-11px;left:10px;z-index:6;font-size:10px;line-height:1;padding:3px 7px;border-radius:7px;background:var(--color-action-primary);color:#0b0b0b;font-weight:700;opacity:0;transition:opacity .15s ease;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.35);}
.slot--clickable:hover .slot-tag{opacity:1;}
.ph{border:2px dashed color-mix(in srgb,var(--color-text) 25%,transparent);color:var(--color-muted);border-radius:14px;padding:22px;display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:700;font-size:14px;text-align:center;transition:background .15s ease;min-height:64px;justify-content:center;}
.slot--clickable:hover .ph{background:color-mix(in srgb,var(--color-text) 6%,transparent);}
/* Botón "quitar" en el preview: solo en zonas con componente fijado, al pasar el ratón */
.slot-x{position:absolute;top:-11px;right:10px;z-index:7;width:22px;height:22px;border-radius:999px;border:none;background:#ef4444;color:#fff;font-size:12px;font-weight:700;line-height:1;cursor:pointer;opacity:0;transition:opacity .15s ease,background .15s ease;box-shadow:0 4px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;}
.slot--clickable:hover .slot-x{opacity:1;}
.slot-x:hover{background:#dc2626;}
.ph-sub{font-size:11px;font-weight:400;opacity:.7}
.scene-center{min-height:560px;display:flex;align-items:center;justify-content:center;padding:24px;}
/* Componentes activables (triggered): trigger + overlay */
.trigwrap{display:flex;justify-content:center;}
.trig{display:inline-flex;align-items:center;gap:8px;}
.trig .st{font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 7px;border-radius:999px;}
.st--set{background:rgba(52,211,153,.18);color:#6ee7b7;}
.st--auto{background:color-mix(in srgb,var(--color-action-primary) 24%,transparent);color:var(--color-action-primary);}
.st--empty{background:rgba(251,191,36,.18);color:#fcd34d;}
.overlay{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;}
.overlay.open{display:flex;}
.overlay-bd{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);}
.overlay-pan{position:relative;z-index:1;width:min(520px,92%);max-height:86%;overflow:auto;background:var(--color-surface);border:1px solid color-mix(in srgb,var(--color-text) 14%,transparent);border-radius:var(--radius-card);padding:26px 20px 20px;box-shadow:0 30px 80px rgba(0,0,0,.5);}
.overlay--sheet{align-items:flex-end;}
.overlay--sheet .overlay-pan{width:100%;max-width:520px;border-radius:20px 20px 0 0;}
.overlay-x{position:absolute;top:8px;right:10px;background:transparent;border:0;color:var(--color-muted);cursor:pointer;font-size:16px;line-height:1;}
/* Secciones dinámicas y barra de herramientas contextual */
.slot-block{position:relative;border-radius:14px;transition:outline .15s ease,box-shadow .15s ease;width:100%;}
.slot-block:hover{outline:2px dashed var(--color-action-primary);outline-offset:4px;}
.slot-block-toolbar{position:absolute;top:-13px;left:10px;right:10px;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:8px;opacity:0;pointer-events:none;transition:opacity .15s ease;}
.slot-block:hover .slot-block-toolbar{opacity:1;pointer-events:auto;}
.slot-block-title{background:#121316;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);box-shadow:0 4px 14px rgba(0,0,0,0.6);font-family:system-ui,sans-serif;display:inline-flex;align-items:center;gap:6px;}
.slot-block-link-tag{background:rgba(139,92,246,0.25);color:#c4b5fd;border:1px solid rgba(139,92,246,0.4);font-size:10px;font-weight:600;padding:2px 6px;border-radius:6px;}
.slot-block-actions{display:flex;align-items:center;gap:4px;background:#121316;padding:2px 4px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);box-shadow:0 4px 14px rgba(0,0,0,0.6);}
.slot-btn{background:rgba(255,255,255,0.08);border:0;color:#fff;width:22px;height:22px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;transition:all 0.12s ease;}
.slot-btn:hover{background:var(--color-action-primary);color:#000;}
.slot-btn--danger:hover{background:#ef4444;color:#fff;}
[data-route-to]{cursor:pointer;}
`;

function esc(s: string): string { return String(s).replace(/'/g, ""); }

function sceneShell(
  css: string,
  theme: "dark" | "light",
  body: string,
  interactions?: { cursorGlow?: boolean; glowBorders?: boolean; staggerReveal?: boolean },
  runtimeMode: RuntimeMode = "design",
): string {
  const runtimeCss = `
  /* Estilos específicos de cada modo del runtime de verificación */
  ${runtimeMode === "production" ? `
    .slot-block-toolbar, .slot-tag, .slot-x, .slot-block-demo-pill, .slot-block-link-tag { display: none !important; }
    .slot-block:hover, .slot--clickable:hover, .slot:hover { outline: none !important; box-shadow: none !important; }
    .slot-block { cursor: default !important; }
  ` : `
    .slot-block--selected {
      outline: 2px solid var(--color-action-primary, #6366f1) !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-action-primary, #6366f1) 25%, transparent) !important;
    }
    .slot-block--selected .slot-block-toolbar {
      opacity: 1 !important;
      pointer-events: auto !important;
    }
    .slot-block-demo-pill {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  `}

  ${runtimeMode === "a11y" ? `
    /* Diagnóstico visual de accesibilidad y jerarquía WCAG */
    h1, h2, h3, h4 { position: relative; }
    h1::after { content: 'H1'; position: absolute; right: 4px; top: 0; font-size: 9px; font-weight: 800; font-family: monospace; background: #6366f1; color: #fff; padding: 1px 4px; border-radius: 4px; opacity: 0.85; pointer-events: none; }
    h2::after { content: 'H2'; position: absolute; right: 4px; top: 0; font-size: 9px; font-weight: 800; font-family: monospace; background: #8b5cf6; color: #fff; padding: 1px 4px; border-radius: 4px; opacity: 0.85; pointer-events: none; }
    h3::after { content: 'H3'; position: absolute; right: 4px; top: 0; font-size: 9px; font-weight: 800; font-family: monospace; background: #a855f7; color: #fff; padding: 1px 4px; border-radius: 4px; opacity: 0.85; pointer-events: none; }
    header, nav, main, footer, section { outline: 1px dashed rgba(56, 189, 248, 0.5) !important; position: relative; }
    nav::after { content: '<nav>'; position: absolute; top: 2px; left: 6px; font-size: 9px; font-family: monospace; color: #38bdf8; background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 3px; pointer-events: none; }
    main::after { content: '<main>'; position: absolute; top: 2px; left: 6px; font-size: 9px; font-family: monospace; color: #38bdf8; background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 3px; pointer-events: none; }
    footer::after { content: '<footer>'; position: absolute; top: 2px; left: 6px; font-size: 9px; font-family: monospace; color: #38bdf8; background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 3px; pointer-events: none; }
    img:not([alt]), img[alt=""] { outline: 2px solid #ef4444 !important; }
  ` : ""}
  `;

  const iCss = `
  ${interactions?.cursorGlow ? `
  .cursor-glow-active::before {
    content: '';
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    pointer-events: none;
    z-index: 9999;
    background: radial-gradient(600px circle at var(--cx, 50vw) var(--cy, 50vh), color-mix(in srgb, var(--color-action-primary, #6366f1) 18%, transparent), transparent 80%);
  }
  ` : ""}
  ${interactions?.glowBorders ? `
  .glow-borders-active .slot, .glow-borders-active .card, .glow-borders-active .ph, .glow-borders-active .slot-block {
    transition: box-shadow 0.3s ease, border-color 0.3s ease;
  }
  .glow-borders-active .slot:hover, .glow-borders-active .card:hover, .glow-borders-active .slot-block:hover {
    box-shadow: 0 0 24px -2px color-mix(in srgb, var(--color-action-primary, #6366f1) 40%, transparent);
    border-color: var(--color-action-primary, #6366f1) !important;
  }
  ` : ""}
  ${interactions?.staggerReveal ? `
  @keyframes gpsFadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .stagger-reveal-active .slot, .stagger-reveal-active .card, .stagger-reveal-active .slot-block {
    animation: gpsFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .stagger-reveal-active .slot:nth-child(1), .stagger-reveal-active .slot-block:nth-child(1) { animation-delay: 0.04s; }
  .stagger-reveal-active .slot:nth-child(2), .stagger-reveal-active .slot-block:nth-child(2) { animation-delay: 0.10s; }
  .stagger-reveal-active .slot:nth-child(3), .stagger-reveal-active .slot-block:nth-child(3) { animation-delay: 0.16s; }
  .stagger-reveal-active .slot:nth-child(4), .stagger-reveal-active .slot-block:nth-child(4) { animation-delay: 0.22s; }
  .stagger-reveal-active .slot:nth-child(5), .stagger-reveal-active .slot-block:nth-child(5) { animation-delay: 0.28s; }
  .stagger-reveal-active .slot:nth-child(6), .stagger-reveal-active .slot-block:nth-child(6) { animation-delay: 0.34s; }
  ` : ""}
  @keyframes blockPulseGlow {
    0% { outline: 3px solid var(--color-action-primary, #6366f1); outline-offset: 4px; }
    50% { outline: 4px solid var(--color-action-primary, #6366f1); outline-offset: 8px; box-shadow: 0 0 32px rgba(99,102,241,0.6); }
    100% { outline: 0px solid transparent; outline-offset: 0px; }
  }
  .block-active-pulse {
    animation: blockPulseGlow 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes animFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes animFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes animSlideLeft {
    from { opacity: 0; transform: translateX(-24px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes animScaleUp {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .slot--dragover, .slot-block.slot--dragover, .ph.slot--dragover {
    outline: 3px solid var(--color-action-primary, #f0a470) !important;
    outline-offset: 4px !important;
    background: color-mix(in srgb, var(--color-action-primary, #f0a470) 18%, transparent) !important;
    transform: scale(1.01) !important;
    box-shadow: 0 0 25px rgba(240, 164, 112, 0.4) !important;
  }
  `;

  const cursorScript = interactions?.cursorGlow
    ? `<script>window.addEventListener('pointermove', function(e){document.documentElement.style.setProperty('--cx', e.clientX + 'px'); document.documentElement.style.setProperty('--cy', e.clientY + 'px');});</script>`
    : "";

  const script = `
    ${cursorScript}
    <script>
      // 1. Restaurar scroll instantáneo tras actualización (evita saltos y temblores)
      try {
        var savedY = sessionStorage.getItem("gps_preview_scroll");
        if (savedY) {
          window.scrollTo({ top: parseInt(savedY, 10), behavior: 'instant' });
        }
      } catch(e) {}

      window.addEventListener("scroll", function() {
        try { sessionStorage.setItem("gps_preview_scroll", String(window.scrollY)); } catch(e) {}
        window.parent.postMessage({ type: "PREVIEW_SCROLL", scrollY: window.scrollY }, "*");
      }, { passive: true });

      // Anunciar al editor que el iframe está montado y listo
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

      // 2. Enrutamiento, subnodos y selección reactiva
      document.addEventListener("click", function(e) {
        if (document.body.classList.contains("runtime--production")) return;

        // A) Detección de subnodos (imagen, botón, badge, heading, texto)
        var subnodeEl = e.target && e.target.closest && e.target.closest("[data-subnode]");
        if (subnodeEl) {
          e.preventDefault();
          e.stopPropagation();
          var blockEl = subnodeEl.closest("[data-block-id]");
          var blockId = blockEl ? blockEl.getAttribute("data-block-id") : "";
          var subnodeType = subnodeEl.getAttribute("data-subnode");
          var subnodeKey = subnodeEl.getAttribute("data-subnode-key") || "";
          if (blockId) {
            window.parent.postMessage({
              type: "SUBNODE_SELECT",
              blockId: blockId,
              subnodeType: subnodeType,
              subnodeKey: subnodeKey
            }, "*");
          }
          return;
        }

        // B) Enrutamiento explícito entre escenas ([data-route-to])
        var routed = e.target && e.target.closest && e.target.closest("[data-route-to]");
        if (routed) {
          if (document.body.classList.contains("runtime--interaction")) {
            e.preventDefault();
            e.stopPropagation();
            var target = routed.getAttribute("data-route-to");
            if (target) {
              routed.style.transform = 'scale(0.95)';
              routed.style.transition = 'transform 0.12s ease';
              setTimeout(function() { routed.style.transform = ''; }, 160);
              window.parent.postMessage({ type: "NAVIGATE_TO_SCENE", targetScene: target }, "*");
            }
            return;
          } else {
            // En modo diseño, seleccionar el bloque para poder configurar la ruta en el inspector
            e.preventDefault();
            var blk = routed.closest("[data-block-id]");
            if (blk) {
              var bId = blk.getAttribute("data-block-id");
              window.parent.postMessage({ type: "BLOCK_SELECT", blockId: bId }, "*");
            }
            return;
          }
        }

        // C) Enlaces con ancla interna (#proyectos, #contacto, #inicio...)
        var anchor = e.target && e.target.closest && e.target.closest('a[href^="#"]');
        if (anchor) {
          var href = anchor.getAttribute("href");
          if (href && href.length > 1) {
            // SOLO en modo interacción permitimos que el preview haga scroll hacia la sección
            if (document.body.classList.contains("runtime--interaction")) {
              var targetEl = document.querySelector(href);
              if (targetEl) {
                e.preventDefault();
                e.stopPropagation();
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.remove('block-active-pulse');
                void targetEl.offsetWidth;
                targetEl.classList.add('block-active-pulse');
                setTimeout(function() { targetEl.classList.remove('block-active-pulse'); }, 1400);
                return;
              }
            } else {
              // En modo diseño: EVITAR que el preview se desplace inesperadamente.
              // Seleccionar el bloque para editar sus textos, enlaces o estilos en el inspector.
              e.preventDefault();
              e.stopPropagation();
              var blk = anchor.closest("[data-block-id]");
              if (blk) {
                var bId = blk.getAttribute("data-block-id");
                window.parent.postMessage({ type: "BLOCK_SELECT", blockId: bId }, "*");
              }
              return;
            }
          }
        }

        // D) Cualquier otro enlace <a> en modo diseño: prevenir recarga/desplazamiento y seleccionar bloque
        var anyAnchor = e.target && e.target.closest && e.target.closest("a");
        if (anyAnchor && !document.body.classList.contains("runtime--interaction")) {
          e.preventDefault();
          var blk = anyAnchor.closest("[data-block-id]");
          if (blk) {
            var bId = blk.getAttribute("data-block-id");
            window.parent.postMessage({ type: "BLOCK_SELECT", blockId: bId }, "*");
          }
          return;
        }
      }, true);

      // 3. Soporte de Drag & Drop directo dentro del iframe
      document.addEventListener("dragover", function(e) {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = "copy";
        }
        var el = e.target && e.target.closest && (e.target.closest("[data-block-id]") || e.target.closest(".slot") || e.target.closest(".ph"));
        if (el) el.classList.add("slot--dragover");
      });

      document.addEventListener("dragleave", function(e) {
        var el = e.target && e.target.closest && (e.target.closest("[data-block-id]") || e.target.closest(".slot") || e.target.closest(".ph"));
        if (el) el.classList.remove("slot--dragover");
      });

      document.addEventListener("drop", function(e) {
        e.preventDefault();
        var el = e.target && e.target.closest && (e.target.closest("[data-block-id]") || e.target.closest(".slot") || e.target.closest(".ph"));
        if (el) el.classList.remove("slot--dragover");
        var targetId = el ? (el.getAttribute("data-block-id") || (el.id ? el.id.replace(/^section-/, '') : '')) : '';
        var compId = e.dataTransfer ? e.dataTransfer.getData("text/plain") : '';
        var compJson = e.dataTransfer ? e.dataTransfer.getData("application/json") : '';
        window.parent.postMessage({
          type: "IFRAME_DROP_COMPONENT",
          targetId: targetId,
          compId: compId,
          compJson: compJson
        }, "*");
      });

      // 4. Reactividad en caliente sin recargar el iframe (0ms de latencia)
      window.addEventListener("message", function(e) {
        if (!e.data) return;
        if (e.data.type === "UPDATE_TOKENS_CSS" && e.data.css) {
          var s = document.getElementById("gps-live-tokens-css");
          if (s) s.textContent = e.data.css;
        }
        if (e.data.type === "SET_THEME" && e.data.theme) {
          document.documentElement.className = e.data.theme;
          document.documentElement.style.colorScheme = e.data.theme;
        }
        if (e.data.type === "RESTORE_SCROLL" && typeof e.data.scrollY === "number") {
          window.scrollTo({ top: e.data.scrollY, behavior: 'instant' });
        }
        if (e.data.type === "SCROLL_TO_BLOCK" && e.data.blockId) {
          var el = document.querySelector('[data-block-id="' + e.data.blockId + '"]') || document.getElementById('section-' + e.data.blockId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.remove('block-active-pulse');
            void el.offsetWidth;
            el.classList.add('block-active-pulse');
            setTimeout(function() { el.classList.remove('block-active-pulse'); }, 1400);
          }
        }
      });

      // 5. Controlador de pestañas de Bento Grid (GitHub, Trayectoria, Infraestructura)
      window.switchIvnTab = function(tabName) {
        var panels = document.querySelectorAll('.ivn-tab-panel');
        panels.forEach(function(p) { p.classList.add('hidden'); });
        var activePanel = document.getElementById('ivn-panel-' + tabName);
        if (activePanel) activePanel.classList.remove('hidden');

        var btns = document.querySelectorAll('.ivn-tab-btn');
        btns.forEach(function(b) {
          b.className = 'ivn-tab-btn rounded-full text-zinc-400 hover:text-white px-5 py-2 transition-all flex items-center gap-2 cursor-pointer';
        });
        var activeBtn = document.getElementById('tab-btn-' + tabName);
        if (activeBtn) {
          activeBtn.className = 'ivn-tab-btn rounded-full bg-[var(--color-accent,#f97316)] text-black px-5 py-2 font-bold shadow transition-all flex items-center gap-2 cursor-pointer';
        }
      };
    </script>
  `;

  const bodyClasses = [
    "brand-bg",
    runtimeMode === "production" ? "runtime--production" : "",
    runtimeMode === "a11y" ? "runtime--a11y" : "",
    runtimeMode === "interaction" ? "runtime--interaction" : "runtime--design",
    interactions?.cursorGlow ? "cursor-glow-active" : "",
    interactions?.glowBorders ? "glow-borders-active" : "",
    interactions?.staggerReveal ? "stagger-reveal-active" : ""
  ].filter(Boolean).join(" ");

  return `<!doctype html><html class="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={darkMode:'class'}</script>
<style id="gps-live-tokens-css">:root{color-scheme:${theme};}${css}${SCENE_STYLES}${iCss}${runtimeCss}</style>${GUARD}</head><body class="${bodyClasses}">${body}${script}</body></html>`;
}

// Flags de comportamiento resueltos (Interacción/Datos/Seguridad) que SÍ cambian el lienzo.
function sceneResolvedFlags(resolved: ResolvedConfig) {
  const it = resolved.interaction, d = resolved.data, sec = resolved.security, v = resolved.visual;
  const str = (x: unknown, fb: string) => (typeof x === "string" && x.trim() ? x : fb);
  const has = (x: unknown) => x !== undefined && x !== null && x !== "" && x !== false;
  const nav = str(it.navigationPattern, "dashboard");
  const search = str(d.search, "none");
  const authArr = Array.isArray(sec.authMethods) ? (sec.authMethods as string[]) : [];
  const hasOAuth = authArr.some((a) => /oauth|google|github|sso/i.test(a));
  const hasMagic = authArr.some((a) => /magic|passwordless|link|otp/i.test(a));
  return {
    motion: str(it.motionPreset, "minimal"),
    density: str(v.density, "comfortable"),
    hasShell: /app-shell|dashboard|sidebar/i.test(nav),
    hasSearch: search !== "none",
    isPalette: /command|cmdk|palette|⌘/i.test(search),
    hasFilters: has(d.filters) && d.filters !== "none",
    filtersMode: /drawer|off-?canvas|panel/i.test(str(d.filters, "")) ? "drawer" : (has(d.filters) && d.filters !== "none" ? "inline" : "none"),
    hasPagination: has(d.pagination) && d.pagination !== "none",
    cardsData: str(d.tableLayout, "table") === "cards" || d.mobileData === "cards",
    formVal: str(d.formValidation, "hybrid"),
    inlineErr: sec.inlineValidation !== false,
    successPat: str(d.successPattern, "toast"),
    loadingPat: str(d.loadingPattern, "skeleton"),
    errorPat: str(d.errorPattern, "inline"),
    multiStep: /multi|step|wizard/i.test(str(d.formPreset, "")) || d.multiStep === true,
    session: str(sec.sessionType, "httpOnly-cookie"),
    authCount: authArr.length,
    hasOAuth, hasMagic,
    hasPassword: authArr.some((a) => /password|email/i.test(a)) || (!hasOAuth && !hasMagic && authArr.length > 0),
  };
}

// Slots que la configuración actual OCULTA en una escena (su asignación queda pendiente).
function hiddenSlotsFor(scene: SceneId, resolved: ResolvedConfig): string[] {
  const f = sceneResolvedFlags(resolved);
  if (scene === "dashboard") return f.hasFilters ? [] : ["filters"];
  if (scene === "auth") {
    const out: string[] = [];
    if (!f.hasPassword) out.push("form");
    if (!(f.hasOAuth || f.hasMagic)) out.push("oauth");
    return out;
  }
  return [];
}

function sceneDoc(
  scene: SceneId, css: string, theme: "dark" | "light",
  samples: Sample[], slots: SlotMap, resolved: ResolvedConfig, lang: "es" | "en",
  interactions?: { cursorGlow?: boolean; glowBorders?: boolean; staggerReveal?: boolean },
  layoutBlocks?: SceneBlockInstance[],
  runtimeMode: RuntimeMode = "design",
  selectedBlockId: string | null = null,
  dataState?: { mode: DataStateMode; count: number; source: string },
  portfolioProjects?: PortfolioProject[],
  activeRoutePath?: string,
): string {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const f = sceneResolvedFlags(resolved);
  // Tono de escena derivado del blueprint (una sola fuente: resolvedConfig).
  const navP = String(resolved.interaction?.navigationPattern ?? "").toLowerCase();
  const heroTone: "marketing" | "product" | "mobile" | "generic" =
    /landing/.test(navP) ? "marketing"
    : (/mobile/.test(navP) || (/tabbed/.test(navP) && f.cardsData)) ? "mobile"
    : f.hasShell ? "product"
    : "generic";
  const used = new Set<string>();
  const htmlOf = (s: Sample) => {
    let raw = s.html || "";
    if (!raw && s.files?.length) {
      raw = s.files.find((f) => /\.html?$/i.test(f.path))?.content || "";
    }
    if (!raw && s.previewHtml) raw = s.previewHtml;
    return brandifyHtml(raw) || "";
  };
  const cssOf = (s: Sample) => {
    let c = s.css || "";
    if (!c && s.files?.length) {
      c = s.files.find((f) => /\.css$/i.test(f.path))?.content || "";
    }
    return c;
  };
  const assigned = (slotId: string): Sample | undefined => {
    const id = slots?.[slotId];
    return id ? samples.find((s) => s.id === id) : undefined;
  };
  const fallback = (slot: SceneSlot): Sample | undefined => {
    if (!slot.match.length) return undefined;
    const s = samples.find((x) => !used.has(x.id) && slot.match.some((m) => (x.category ?? "").toLowerCase().includes(m)));
    if (s) used.add(s.id);
    return s;
  };

  const wrapBlock = (
    block: SceneBlockInstance,
    inner: string,
    index: number,
    total: number,
    clickable: boolean,
  ) => {
    const isSelected = block.id === selectedBlockId;
    const incomp = detectBlockIncompatibilities(scene, block);
    const isDemo = block.isDemoData || incomp.isIncompatible;
    const demoReason = block.incompatibleNotice || incomp.reason || "Contenido demo/fixture";
    const actions = resolveBlockActions(block);
    const actionKeys = Object.keys(actions);
    const actionBadges = actionKeys.length > 0
      ? actionKeys.map((k) => {
          const act = actions[k];
          let desc = "";
          if (act.target.kind === "scene") desc = `↗ ${SCENE_LABEL[act.target.sceneId as SceneId] || act.target.sceneId}`;
          else if (act.target.kind === "route") desc = `↗ ${act.target.path}`;
          else if (act.target.kind === "url") desc = `↗ ${act.target.href.replace(/^https?:\/\//, "").slice(0, 16)}`;
          else if (act.target.kind === "anchor") desc = `#${act.target.blockId}`;
          const prefix = k === "primary" ? "CTA" : k === "secondary" ? "Sec" : k;
          return `<span class="slot-block-link-tag" title="${esc(act.label || k)}: ${esc(desc)}">${esc(prefix)}: ${esc(desc)}</span>`;
        }).join(" ")
      : "";

    const demoBadge = isDemo
      ? `<span class="slot-block-demo-pill" title="${esc(demoReason)}">${esc(incomp.isIncompatible ? "Demo Data" : "Fixture")}</span>`
      : "";

    const toolbar = `
      <div class="slot-block-toolbar" onclick="event.stopPropagation()">
        <div class="slot-block-title">
          <span>${esc(block.label)}</span>
          ${demoBadge}
          ${actionBadges}
        </div>
        <div class="slot-block-actions">
          ${index > 0 ? `<button class="slot-btn" title="${L("Subir sección", "Move section up")}" onclick="event.stopPropagation();window.parent.postMessage({type:'BLOCK_MOVE',scene:'${scene}',from:${index},to:${index - 1}},'*')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg></button>` : ""}
          ${index < total - 1 ? `<button class="slot-btn" title="${L("Bajar sección", "Move section down")}" onclick="event.stopPropagation();window.parent.postMessage({type:'BLOCK_MOVE',scene:'${scene}',from:${index},to:${index + 1}},'*')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></button>` : ""}
          <button class="slot-btn" title="${L("Duplicar sección", "Duplicate section")}" onclick="event.stopPropagation();window.parent.postMessage({type:'BLOCK_DUPLICATE',scene:'${scene}',blockId:'${block.id}'},'*')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>
          <button class="slot-btn" title="${L("Inspeccionar / Acciones de la sección", "Inspect / Section actions")}" onclick="event.stopPropagation();window.parent.postMessage({type:'BLOCK_SELECT',scene:'${scene}',blockId:'${block.id}',label:'${esc(block.label)}'},'*')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg></button>
          <button class="slot-btn slot-btn--danger" title="${L("Eliminar sección", "Remove section")}" onclick="event.stopPropagation();window.parent.postMessage({type:'BLOCK_REMOVE',scene:'${scene}',blockId:'${block.id}'},'*')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
      </div>
    `;

    let renderedInner = inner;

    // 1. Simulación de estados de datos (a nivel de bloque o global)
    const activeDataMode = block.stateOverride && block.stateOverride !== "default"
      ? block.stateOverride
      : (runtimeMode === "data" && dataState && dataState.mode !== "success" ? dataState.mode : "success");

    if (activeDataMode !== "success") {
      const sourceName = block.dataBinding?.source || dataState?.source || "Colección CMS";
      if (activeDataMode === "loading") {
        renderedInner = `
          <div style="padding: 48px 24px; display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; opacity: 0.85;">
            <div style="width: 44px; height: 44px; border-radius: 999px; border: 3px solid var(--color-accent,#f0a470); border-top-color: transparent; animation: spin 0.8s linear infinite;"></div>
            <span style="font-size: 12px; font-family: monospace; font-weight: 600; color: #a1a1aa;">Cargando registros dinámicos de [${esc(sourceName)}]...</span>
          </div>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
      } else if (activeDataMode === "empty") {
        renderedInner = `
          <div style="padding: 56px 24px; text-align: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 16px; margin: 16px; background: rgba(18,18,22,0.4);">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; color: #71717a;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
            <p style="font-size: 14px; font-weight: 800; color: #fff; margin-bottom: 4px;">Sin elementos para mostrar</p>
            <p style="font-size: 12px; color: #94a3b8; margin: 0 auto; max-width: 400px;">La colección "${esc(sourceName)}" no contiene registros que coincidan con los filtros actuales.</p>
          </div>
        `;
      } else if (activeDataMode === "error") {
        renderedInner = `
          <div style="padding: 48px 24px; text-align: center; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08); border-radius: 16px; margin: 16px;">
            <p style="font-size: 14px; font-weight: 800; color: #f87171; margin-bottom: 4px;">Error de Conexión CMS</p>
            <p style="font-size: 12px; color: #fca5a5; margin: 0;">Fallo al sincronizar con la fuente "${esc(sourceName)}". Código de estado: 500 Internal Error.</p>
          </div>
        `;
      } else if (activeDataMode === "forbidden") {
        renderedInner = `
          <div style="padding: 48px 24px; text-align: center; border: 1px solid rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.08); border-radius: 16px; margin: 16px;">
            <p style="font-size: 14px; font-weight: 700; color: #fbbf24; margin-bottom: 4px;">Acceso no autorizado (403)</p>
            <p style="font-size: 12px; color: var(--color-muted); margin: 0;">El rol de usuario actual no tiene permisos para ver "${esc(sourceName)}".</p>
          </div>
        `;
      }
    }

    // 2. Estilos personalizados del bloque (TAB ESTILO)
    const blockStyle = block.styleConfig || (block.props as any)?.styleConfig || {};
    let customStyles = "";
    if (blockStyle.background === "surface") customStyles += "background-color: #121216 !important;";
    else if (blockStyle.background === "deep") customStyles += "background-color: #08090d !important;";
    else if (blockStyle.background === "glass") customStyles += "background: rgba(18, 18, 22, 0.72) !important; backdrop-filter: blur(18px) !important; -webkit-backdrop-filter: blur(18px) !important;";
    else if (blockStyle.background === "glow") customStyles += "background: radial-gradient(circle at 50% 0%, rgba(240, 164, 112, 0.12) 0%, rgba(13,14,18,0.98) 75%) !important;";
    else if (blockStyle.background === "gradient") customStyles += "background: linear-gradient(180deg, #151722 0%, #0c0d12 100%) !important;";

    if (blockStyle.radius === "none") customStyles += "border-radius: 0px !important;";
    else if (blockStyle.radius === "lg") customStyles += "border-radius: 12px !important;";
    else if (blockStyle.radius === "2xl") customStyles += "border-radius: 24px !important;";
    else if (blockStyle.radius === "3xl") customStyles += "border-radius: 36px !important;";

    if (blockStyle.border === "subtle") customStyles += "border: 1px solid rgba(255,255,255,0.08) !important;";
    else if (blockStyle.border === "accent") customStyles += "border: 1px solid rgba(240,164,112,0.35) !important;";
    else if (blockStyle.border === "dashed") customStyles += "border: 1px dashed rgba(255,255,255,0.18) !important;";

    if (blockStyle.shadow === "subtle") customStyles += "box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;";
    else if (blockStyle.shadow === "elevated") customStyles += "box-shadow: 0 25px 60px rgba(0,0,0,0.7) !important;";
    else if (blockStyle.shadow === "glow") customStyles += "box-shadow: 0 0 45px rgba(240,164,112,0.18) !important;";

    if (blockStyle.accentTone) customStyles += `--color-accent: ${blockStyle.accentTone} !important;`;
    if (blockStyle.bgOpacity !== undefined && blockStyle.bgOpacity < 100) {
      customStyles += `opacity: ${blockStyle.bgOpacity / 100} !important;`;
    }
    if (blockStyle.textColor) {
      customStyles += `color: ${blockStyle.textColor} !important;`;
    }
    if (blockStyle.animation && blockStyle.animation !== "none") {
      if (blockStyle.animation === "fade-up") customStyles += "animation: animFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both !important;";
      else if (blockStyle.animation === "fade-in") customStyles += "animation: animFadeIn 0.5s ease-out both !important;";
      else if (blockStyle.animation === "slide-left") customStyles += "animation: animSlideLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) both !important;";
      else if (blockStyle.animation === "scale-up") customStyles += "animation: animScaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both !important;";
    }
    if (blockStyle.divider === "line") {
      customStyles += "border-bottom: 1px solid rgba(255,255,255,0.12) !important;";
    } else if (blockStyle.divider === "gradient") {
      customStyles += "border-bottom: 2px solid transparent !important; border-image: linear-gradient(90deg, transparent, var(--color-accent, #f0a470), transparent) 1 !important;";
    } else if (blockStyle.divider === "dots") {
      customStyles += "border-bottom: 2px dotted rgba(255,255,255,0.25) !important;";
    }

    const layout = block.layoutConfig;
    if (layout?.gap === "tight") customStyles += "gap: 12px !important;";
    else if (layout?.gap === "relaxed") customStyles += "gap: 40px !important;";
    else if (layout?.gap === "normal") customStyles += "gap: 24px !important;";

    if (layout?.sticky) {
      customStyles += "position: sticky !important; top: 0 !important; z-index: 40 !important;";
    }

    const advanced = block.advancedConfig;
    const a11y = block.a11y;
    const blockDomId = (advanced?.anchorId?.trim()) ? esc(advanced.anchorId.trim().replace(/^#/, "")) : `section-${esc(block.id)}`;
    const extraClasses = advanced?.cssClass ? ` ${esc(advanced.cssClass.trim())}` : "";
    const a11yAttrs = `${a11y?.role ? ` role="${esc(a11y.role)}"` : ""}${a11y?.ariaLabel ? ` aria-label="${esc(a11y.ariaLabel)}"` : ""}`;
    const customCssTag = advanced?.customCss ? `<style>#${blockDomId} { ${advanced.customCss} }</style>` : "";

    const inlineStyle = customStyles ? ` style="${customStyles}"` : "";

    const selectedCls = isSelected ? " slot-block--selected" : "";
    if (runtimeMode === "production") {
      if (!renderedInner || renderedInner.trim() === "" || renderedInner.includes('class="ph"')) return "";
      return `${customCssTag}<div class="slot-block${extraClasses}" data-block-id="${esc(block.id)}" id="${blockDomId}"${a11yAttrs}${inlineStyle} onclick="window.parent.postMessage({type:'PRODUCTION_CLICK_GUARD',action:'seleccionar o inspeccionar'},'*')">${renderedInner}</div>`;
    }
    return `${customCssTag}<div class="slot-block slot--clickable${selectedCls}${extraClasses}" data-block-id="${esc(block.id)}" id="${blockDomId}"${a11yAttrs}${inlineStyle} onclick="window.parent.postMessage({type:'BLOCK_SELECT',scene:'${scene}',blockId:'${esc(block.id)}',label:'${esc(block.label)}',expects:'${esc(block.type)}'},'*')">${toolbar}${renderedInner}</div>`;
  };

  const wrap = (slot: SceneSlot, inner: string, clickable: boolean, removable = false) => {
    if (runtimeMode === "production") {
      if (!inner || inner.trim() === "" || inner.includes('class="ph"')) return "";
      return `<div class="slot">${inner}</div>`;
    }
    const tag = `<span class="slot-tag">${esc(slot.label)} · ${esc(slot.expects)}</span>`;
    if (!clickable) return `<div class="slot">${inner}</div>`;
    // Solo las zonas con componente FIJADO llevan "×" (borrar) — reutiliza clearSlot.
    const x = removable
      ? `<button class="slot-x" title="${L("Quitar componente", "Remove component")}" onclick="event.stopPropagation();window.parent.postMessage({type:'SLOT_CLEAR',scene:'${scene}',slot:'${slot.id}'},'*')">✕</button>`
      : "";
    return `<div class="slot slot--clickable" onclick="window.parent.postMessage({type:'SLOT_SELECT',scene:'${scene}',slot:'${slot.id}',query:'${esc(slot.query)}',label:'${esc(slot.label)}',expects:'${esc(slot.expects)}'},'*')">${tag}${x}${inner}</div>`;
  };
  const placeholder = (slot: SceneSlot) => {
    if (runtimeMode === "production") return "";
    // Placeholders enriquecidos para zonas dinámicas: muestran la "forma" de la
    // capacidad aunque aún no haya un componente fijado (guía visual, no chrome).
    if (slot.id === "stepper") {
      const dots = [1, 2, 3].map((n, i) => `<span style="width:20px;height:20px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;background:${i === 0 ? "var(--color-action-primary)" : "color-mix(in srgb,var(--color-text) 12%,transparent)"};color:${i === 0 ? "#0b0b0b" : "var(--color-muted)"}">${n}</span>${i < 2 ? `<span style="width:28px;height:2px;background:color-mix(in srgb,var(--color-text) 15%,transparent)"></span>` : ""}`).join("");
      return `<div class="ph" style="gap:8px"><div class="row" style="justify-content:center;gap:6px">${dots}</div><span class="ph-sub">+ ${esc(slot.label)}</span></div>`;
    }
    if (slot.id === "command") {
      return `<div class="ph" style="gap:6px"><div class="row" style="gap:8px;align-items:center;color:var(--color-muted);font-size:12px"><span>${L("Buscar acciones", "Search actions")}</span><span style="border:1px solid color-mix(in srgb,var(--color-text) 22%,transparent);border-radius:6px;padding:1px 6px;font-weight:700">⌘K</span></div><span class="ph-sub">+ ${esc(slot.label)}</span></div>`;
    }
    if (slot.id === "search") {
      return `<div class="ph" style="gap:6px"><div class="input" style="max-width:260px;display:flex;align-items:center;color:var(--color-muted);font-size:12px">${L("Buscar…", "Search…")}</div><span class="ph-sub">+ ${esc(slot.label)}</span></div>`;
    }
    return `<div class="ph">+ ${esc(slot.label)}<span class="ph-sub">${esc(slot.expects)}</span></div>`;
  };
  const structural = (slot: SceneSlot): string => {
    switch (slot.id) {
      case "hero": {
        // Copy/tono del hero según el tono resuelto (marketing / producto / móvil / genérico).
        const SCENE_HERO: Partial<Record<SceneId, { b: string; h: string; p: string }>> = {
          portfolio: { b: L("Portfolio", "Portfolio"), h: L("Hola, soy…", "Hi, I'm…"), p: L("Presentación, proyectos y contacto en una sola página.", "Intro, projects and contact on a single page.") },
          content: { b: L("Blog", "Blog"), h: L("Últimos artículos", "Latest posts"), p: L("Contenido editorial: portada, lista de artículos y aside.", "Editorial content: cover, post list and aside.") },
          commerce: { b: L("Tienda", "Shop"), h: L("Descubre la colección", "Discover the collection"), p: L("Catálogo, ficha de producto y carrito.", "Catalog, product page and cart.") },
          settings: { b: L("Ajustes", "Settings"), h: L("Configuración", "Settings"), p: L("Secciones, campos y zona peligrosa.", "Sections, fields and danger zone.") },
        };
        const HC = SCENE_HERO[scene] ?? {
          marketing: { b: L("Nuevo", "New"), h: L("Lanza tu producto hoy", "Launch your product today"), p: L("Landing con CTA, prueba social y bloques de contenido.", "Landing with CTA, social proof and content blocks.") },
          product: { b: L("Panel", "Console"), h: L("Tu producto, bajo control", "Your product, under control"), p: L("Layout de app: sidebar, métricas y tablas densas.", "App layout: sidebar, metrics and dense tables.") },
          mobile: { b: L("Móvil", "Mobile"), h: L("Diseñado para el pulgar", "Built for the thumb"), p: L("Cards apiladas, navegación inferior y sheets.", "Stacked cards, bottom nav and sheets.") },
          generic: { b: L("Escena resuelta", "Resolved scene"), h: L("Titular de la escena", "Scene headline"), p: L("Layout y tono resueltos por la marca. Rellena las zonas con componentes reales.", "Layout and tone resolved by the brand. Fill the zones with real components.") },
        }[heroTone];
        return `<div style="text-align:center"><span class="badge" style="margin-bottom:16px">${HC.b}</span><h1 class="mock-title">${HC.h}</h1><p class="muted" style="max-width:560px;margin:0 auto;font-size:1.1rem">${HC.p}</p></div>`;
      }
      case "header": return `<h2 style="font-size:1.4rem">${L("Formulario", "Form")}</h2>`;
      case "validation": return `<p class="muted" style="font-size:12px;margin:0">${L("Validación resuelta por la marca (híbrida).", "Validation resolved by the brand (hybrid).")}</p>`;
      case "empty": return `<div class="card" style="text-align:center;min-height:120px;display:flex;flex-direction:column;justify-content:center;gap:8px"><div style="font-weight:700">${L("Sin datos todavía", "No data yet")}</div><p class="muted" style="font-size:12px;margin:0">${L("Estado vacío resuelto.", "Resolved empty state.")}</p></div>`;
      default: return `<div class="card muted" style="font-size:12px">${esc(slot.label)}</div>`;
    }
  };
  // Resuelve el contenido de un slot + su estado (para badges de trigger).
  const resolveInner = (slot: SceneSlot): { inner: string; clickable: boolean; state: "assigned" | "auto" | "empty" | "structural" } => {
    const a = assigned(slot.id);
    if (a) { used.add(a.id); return { inner: htmlOf(a), clickable: true, state: "assigned" }; }
    if (slot.match.length) {
      const f = fallback(slot);
      if (f) return { inner: htmlOf(f), clickable: true, state: "auto" };
      return { inner: placeholder(slot), clickable: true, state: "empty" };
    }
    return { inner: structural(slot), clickable: false, state: "structural" };
  };
  // Componente activable: trigger visible + overlay (sheet abajo, resto centrado).
  const triggered = (slot: SceneSlot, r: { inner: string; clickable: boolean; state: string }): string => {
    const ov = `ov_${scene}_${slot.id}`;
    const stCls = r.state === "assigned" ? "st--set" : r.state === "empty" ? "st--empty" : "st--auto";
    const stTxt = r.state === "assigned" ? L("fijado", "set") : r.state === "empty" ? L("vacío", "empty") : "auto";
    const isSheet = slot.id === "sheet";
    return `<div class="slot trigwrap"><button class="btn trig" onclick="document.getElementById('${ov}').classList.add('open')">${L("Abrir", "Open")} ${esc(slot.label)}<span class="st ${stCls}">${stTxt}</span></button>
      <div id="${ov}" class="overlay ${isSheet ? "overlay--sheet" : ""}">
        <div class="overlay-bd" onclick="document.getElementById('${ov}').classList.remove('open')"></div>
        <div class="overlay-pan">
          <button class="overlay-x" onclick="document.getElementById('${ov}').classList.remove('open')">✕</button>
          ${wrap(slot, r.inner, r.clickable, r.state === "assigned")}
        </div>
      </div>
    </div>`;
  };
  const renderSlot = (slot: SceneSlot): string => {
    const mode = slot.render ?? (slot.match.length === 0 ? "structural" : "persistent");
    const r = resolveInner(slot);
    if (mode === "triggered") return triggered(slot, r);
    return wrap(slot, r.inner, r.clickable, r.state === "assigned");
  };
  // Fuente única de zonas de ESTA escena: base + dinámicas activas por resolvedConfig.
  const S = sceneSlotsResolved(scene, f);
  const by = (id: string) => S.find((s) => s.id === id)!;
  const hasSlot = (id: string) => S.some((s) => s.id === id);

  // Motion + densidad resueltos → afectan al lienzo (no solo colores).
  const speed = f.motion === "none" ? "0s" : f.motion === "minimal" ? "140ms" : "280ms";
  const pad = f.density === "compact" ? "14px" : f.density === "spacious" ? "30px" : "22px";

  let body = "";
  if (layoutBlocks && layoutBlocks.length > 0) {
    const renderBlockItem = (b: SceneBlockInstance, idx: number, total: number = layoutBlocks.length) => {
      let comp: Sample | undefined;
      if (b.componentId) {
        comp = samples.find((s) => s.id === b.componentId);
      }
      if (!comp && slots[b.id]) {
        comp = samples.find((s) => s.id === slots[b.id]);
      }
      if (!comp) {
        const slotDef = S.find((s) => s.id === b.type) ?? { id: b.type, label: b.label, expects: b.type, match: [b.type.toLowerCase()], query: b.type };
        comp = fallback(slotDef);
      }

      let inner = "";

      // --- CMS: Renderizado dinámico de proyectos desde entidades estructuradas ---
      const routeInfo = matchProjectRoute(activeRoutePath);
      const isProjectsBlock = Boolean(
        (b.dataBinding?.source === "portfolio-projects" && b.dataBinding?.layout !== "detail") ||
        Boolean(b.componentId?.includes("projects")) ||
        (b.type === "cards" && (b.label.toLowerCase().includes("proyecto") || b.label.toLowerCase().includes("portfolio")))
      );
      const isDetailBlock = isProjectDetailBlock(b);

      if (routeInfo.isDetail && isDetailBlock) {
        // Ruta dinámica /proyectos/[slug] → renderizar detalle del proyecto
        const targetSlug = routeInfo.slug || (b.props as any)?.slug || "";
        const baseProject = portfolioProjects?.find((p) => p.slug.toLowerCase() === targetSlug.toLowerCase());
        if (baseProject) {
          const detailProps = (b.props as any) || {};
          const mergedProject = {
            ...baseProject,
            layout: detailProps.layout,
          };
          inner = renderProjectDetailTemplate(mergedProject);
        } else {
          inner = renderProjectNotFound(targetSlug);
        }
      } else if (isProjectsBlock && portfolioProjects?.length) {
        // Bloque de colección de proyectos → renderizar grid dinámico desde CMS
        const pProps = (b.props as any) || {};
        inner = renderProjectsGrid(portfolioProjects, {
          includeDrafts: runtimeMode !== "production",
          limit: pProps.limit ?? b.dataBinding?.filter?.limit,
          category: pProps.category ?? b.dataBinding?.filter?.kind,
          featuredOnly: pProps.featuredOnly ?? b.dataBinding?.filter?.featuredOnly,
          heading: pProps.heading,
          highlightedWord: pProps.highlightedWord,
          eyebrow: pProps.eyebrow,
          subtitle: pProps.subtitle,
          layout: pProps.layout,
        });
      } else if (b.componentId === "comp_ivn_navbar" || b.type === "nav") {
        inner = renderNavbarTemplate((b.props as any) || {}, undefined, {
          isInteractivePreview: runtimeMode !== "production",
        });
      } else if (b.componentId === "comp_ivn_hero" || (b.type === "hero" && (b.props || b.label.toLowerCase().includes("iván") || b.label.toLowerCase().includes("hero")))) {
        inner = renderHeroTemplate((b.props as any) || {}, undefined, {
          isInteractivePreview: runtimeMode !== "production",
        });
      } else if (b.componentId === "comp_ivn_metrics" || b.type === "stats" || b.type === "metrics") {
        inner = renderMetricsTemplate((b.props as any) || {}, undefined, {
          isInteractivePreview: runtimeMode !== "production",
        });
      } else if (b.componentId === "comp_ivn_bento_numbers" || b.type === "bento") {
        inner = renderBentoTemplate((b.props as any) || {}, undefined, {
          isInteractivePreview: runtimeMode !== "production",
        });
      } else if (b.componentId === "comp_ivn_contact" || b.type === "contact") {
        inner = renderContactTemplate((b.props as any) || {}, undefined, {
          isInteractivePreview: runtimeMode !== "production",
        });
      } else if (b.componentId === "comp_ivn_footer" || b.type === "footer") {
        inner = renderFooterTemplate((b.props as any) || {}, undefined, {
          isInteractivePreview: runtimeMode !== "production",
        });
      } else if (b.customHtml && b.customHtml.trim()) {
        inner = brandifyHtml(b.customHtml);
      } else if (comp) {
        used.add(comp.id);
        inner = htmlOf(comp);
      } else if (b.type === "hero") {
        inner = structural({ id: "hero", label: b.label, expects: "Hero", match: [], query: "hero" });
      } else if (b.type === "sidebar") {
        inner = `
          <aside class="w-full h-full p-4 flex flex-col gap-4 text-xs font-mono">
            <div class="flex items-center gap-2 pb-3 border-b border-white/10">
              <span class="w-2.5 h-2.5 rounded bg-[var(--color-accent,#f97316)]"></span>
              <span class="font-bold text-white uppercase tracking-wider">${esc(b.label)}</span>
            </div>
            <nav class="flex flex-col gap-1.5 text-zinc-300">
              <a href="#" class="px-3 py-2 rounded bg-white/10 text-white font-semibold flex items-center justify-between">
                <span>Principal</span>
                <span class="text-[10px] text-zinc-400">⌘1</span>
              </a>
              <a href="#" class="px-3 py-2 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
                <span>Vistas & Rutas</span>
              </a>
              <a href="#" class="px-3 py-2 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
                <span>Ajustes</span>
              </a>
            </nav>
            <div class="mt-auto pt-3 border-t border-white/10 text-[10px] text-zinc-500">
              Panel Lateral Activo
            </div>
          </aside>
        `;
      } else if (b.props && ((b.props as any).heading || (b.props as any).title || (b.props as any).items || (b.props as any).subtitle)) {
        // Bloque dinámico genérico configurable para cualquier web (features, cards, faq, cta...)
        const gp = b.props as any;
        const heading = gp.heading || gp.title || b.label;
        const eyebrow = gp.eyebrow || (b.type ? b.type.toUpperCase() : "SECCIÓN");
        const subtitle = gp.subtitle || gp.description || "";
        const items = Array.isArray(gp.items) ? gp.items : [];
        const cols = b.layoutConfig?.columns || gp.layout?.columns || gp.columns || (items.length > 2 ? 3 : 2);
        const gridCls = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 md:grid-cols-2" : cols === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

        const getCardSvgIcon = (iconName?: string): string => {
          const stroke = `stroke="var(--color-accent, #f0a470)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
          switch (iconName) {
            case "code":
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
            case "rocket":
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`;
            case "server":
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`;
            case "database":
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>`;
            case "shield":
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
            case "zap":
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
            case "globe":
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
            default:
              return `<svg width="18" height="18" viewBox="0 0 24 24" ${stroke}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
          }
        };

        const itemsHtml = items.map((it: any, i: number) => `
          <div class="p-6 rounded-2xl border border-white/10 bg-[#12141c]/80 backdrop-blur-sm space-y-3 hover:border-[var(--color-accent,#f0a470)]/40 transition-colors cursor-pointer" data-subnode="card" data-subnode-key="${i}">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              ${it.icon ? `<span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: rgba(240,164,112,0.1); border: 1px solid rgba(240,164,112,0.25);">${getCardSvgIcon(it.icon)}</span>` : "<span></span>"}
              ${it.badge ? `<span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-accent,#f0a470)]/15 text-[var(--color-accent,#f0a470)] border border-[var(--color-accent,#f0a470)]/30" data-subnode="badge">${esc(it.badge)}</span>` : ""}
            </div>
            <h3 class="text-base font-bold text-white tracking-tight" data-subnode="heading">${esc(it.title || it.label || `Elemento #${i + 1}`)}</h3>
            <p class="text-xs text-zinc-400 leading-relaxed" data-subnode="text">${esc(it.description || it.text || "")}</p>
            ${(it.ctaLabel || it.ctaText) ? `
              <div style="padding-top: 8px;">
                <a href="${esc(it.ctaHref || it.href || '#')}" style="color: var(--color-accent, #f0a470); font-size: 11px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                  <span>${esc(it.ctaLabel || it.ctaText)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              </div>
            ` : ""}
          </div>
        `).join("");

        inner = `
          <section class="w-full py-16 px-6 max-w-6xl mx-auto space-y-8">
            <div class="space-y-2 text-center max-w-2xl mx-auto">
              <span class="text-xs font-mono font-bold text-[var(--color-accent,#f0a470)] uppercase tracking-wider" data-subnode="eyebrow">// ${esc(eyebrow)}</span>
              <h2 class="text-3xl font-black text-white tracking-tight" data-subnode="heading">${esc(heading)}</h2>
              ${subtitle ? `<p class="text-sm text-zinc-400 leading-relaxed" data-subnode="text">${esc(subtitle)}</p>` : ""}
            </div>
            ${items.length > 0 ? `<div class="grid ${gridCls} gap-6">${itemsHtml}</div>` : ""}
          </section>
        `;
      } else {
        if (runtimeMode === "production") {
          inner = "";
        } else {
          inner = `<div class="ph">+ ${esc(b.label)}<span class="ph-sub">Haz clic para buscar en el catálogo o arrastra un componente aquí</span></div>`;
        }
      }

      inner = applyRoutingLinks(inner, resolveBlockActions(b), b.linkToScene);

      return wrapBlock(b, inner, idx, total, true);
    };

    const sidebarBlocks = layoutBlocks.filter((b) => b.type.toLowerCase() === "sidebar");
    const nonSidebarBlocks = layoutBlocks.filter((b) => b.type.toLowerCase() !== "sidebar");

    if (sidebarBlocks.length > 0) {
      const renderedSidebar = sidebarBlocks.map((b, i) => renderBlockItem(b, i)).join("");
      const renderedMain = nonSidebarBlocks.map((b, i) => renderBlockItem(b, sidebarBlocks.length + i)).join("");
      body = `
        <div class="gps-shell-layout" style="display:flex;min-height:100vh;width:100%;align-items:stretch;">
          <aside class="gps-sidebar-container" style="width:280px;flex-shrink:0;border-right:1px solid color-mix(in srgb,var(--color-text, #fff) 10%,transparent);background:color-mix(in srgb,var(--color-bg, #000) 80%,transparent);backdrop-filter:blur(12px);position:sticky;top:0;height:100vh;overflow-y:auto;z-index:20;">
            ${renderedSidebar}
          </aside>
          <main class="gps-main-container" style="flex:1;display:flex;flex-direction:column;gap:24px;padding:24px 20px;max-width:1200px;margin:0 auto;width:100%;overflow-x:hidden;">
            ${renderedMain}
          </main>
        </div>
      `;
    } else {
      const rendered = layoutBlocks.map((b, idx) => renderBlockItem(b, idx)).join("");
      body = `<div style="display:flex;flex-direction:column;width:100%;min-height:100vh;padding:24px 16px;gap:24px;max-width:1200px;margin:0 auto;">${rendered}</div>`;
    }
  } else if (scene === "landing") {
    body = `
      ${renderSlot(by("nav"))}
      <main class="mock-main">
        ${renderSlot(by("hero"))}
        <div class="row" style="justify-content:center;margin:24px 0">${renderSlot(by("cta"))}</div>
        <section style="margin-top:48px;width:100%"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">${renderSlot(by("features"))}</div></section>
        <section style="margin-top:48px;width:100%">${renderSlot(by("social"))}</section>
        <section style="margin-top:48px;width:100%;max-width:760px">${renderSlot(by("faq"))}</section>
      </main>
      ${renderSlot(by("footer"))}`;
  } else if (scene === "dashboard") {
    // Búsqueda como zona asignable DINÁMICA: ⌘K (triggered) o input persistente.
    const searchBar = f.isPalette && hasSlot("command") ? renderSlot(by("command"))
      : f.hasSearch && hasSlot("search") ? renderSlot(by("search"))
      : "";
    const pag = f.hasPagination ? `<div class="row" style="justify-content:flex-end;margin-top:2px">${["‹", "1", "2", "3", "›"].map((x) => `<span class="btn ghost" style="padding:4px 10px;font-size:11px">${x}</span>`).join("")}</div>` : "";
    body = `
      <div style="display:flex;min-height:600px;width:100%">
        ${f.hasShell ? `<aside style="width:220px;border-right:1px solid color-mix(in srgb,var(--color-text) 10%,transparent);padding:16px">${renderSlot(by("shell"))}</aside>` : ""}
        <main style="flex:1;padding:24px;display:flex;flex-direction:column;gap:18px">
          ${!f.hasShell ? `<div class="mock-header" style="position:static;border-radius:12px">${renderSlot(by("shell"))}</div>` : ""}
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <h2 style="font-size:1.2rem;flex:1;margin:0">${L("Panel", "Dashboard")}</h2>
            ${searchBar}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px">${renderSlot(by("kpis"))}</div>
          ${f.hasFilters ? renderSlot({ ...by("filters"), render: f.filtersMode === "drawer" ? "triggered" : "persistent" }) : ""}
          ${renderSlot(by("table"))}
          ${f.cardsData ? `<p class="muted" style="font-size:11px;margin:0">${L("Datos en formato tarjetas (resuelto por Datos).", "Data as cards (resolved by Data).")}</p>` : ""}
          ${pag}
        </main>
        <aside style="width:260px;border-left:1px solid color-mix(in srgb,var(--color-text) 10%,transparent);padding:16px">${renderSlot(by("side"))}</aside>
      </div>`;
  } else if (scene === "auth") {
    const warn = f.authCount === 0 ? `<div class="card" style="border-color:#f8717155;color:#f87171;font-size:12px">${L("Sin método de autenticación (required) — bloquea publicar.", "No auth method (required) — blocks publishing.")}</div>` : "";
    body = `
      <div class="scene-center" style="flex-direction:column;gap:20px">
        <div class="card" style="width:min(400px,100%);display:flex;flex-direction:column;gap:14px">
          <h2 style="text-align:center;font-size:1.4rem">${L("Iniciar sesión", "Sign in")}</h2>
          <p class="muted" style="text-align:center;font-size:11px;margin:0">${L("Sesión", "Session")}: ${esc(f.session)}</p>
          ${warn}
          ${f.hasPassword ? renderSlot(by("form")) : ""}
          ${(f.hasOAuth || f.hasMagic) ? renderSlot(by("oauth")) : ""}
          ${f.hasMagic ? `<p class="muted" style="font-size:11px;text-align:center;margin:0">${L("Enlace mágico / passwordless activo", "Magic link / passwordless on")}</p>` : ""}
        </div>
        <div style="width:min(400px,100%)">${renderSlot(by("footer"))}</div>
      </div>`;
  } else if (scene === "form") {
    // Wizard: zona asignable DINÁMICA (aparece solo cuando el formulario es multi-paso).
    // Si no hay componente fijado, su placeholder ya dibuja el stepper 1·2·3 como guía.
    const steps = f.multiStep && hasSlot("stepper") ? renderSlot(by("stepper")) : "";
    body = `
      <div class="scene-center">
        <div class="card" style="width:min(560px,100%);display:flex;flex-direction:column;gap:14px">
          ${renderSlot(by("header"))}
          ${steps}
          ${renderSlot(by("fields"))}
          <p class="muted" style="font-size:11px;margin:0">${L("Validación", "Validation")}: ${esc(f.formVal)}${f.inlineErr ? ` · ${L("errores inline", "inline errors")}` : ""}</p>
          ${renderSlot(by("validation"))}
          <div class="row">${renderSlot(by("actions"))}</div>
          <p class="muted" style="font-size:11px;margin:0">${L("Éxito", "Success")}: ${esc(f.successPat)}${f.multiStep ? ` · ${L("acción: Siguiente", "action: Next")}` : ""}</p>
          ${renderSlot(by("success"))}
        </div>
      </div>`;
  } else if (scene === "mobile") {
    const stack = f.cardsData
      ? `${renderSlot(by("cards"))}${renderSlot(by("list"))}`
      : `${renderSlot(by("list"))}${renderSlot(by("cards"))}`;
    body = `
      <div class="scene-center">
        <div style="width:360px;border:1px solid color-mix(in srgb,var(--color-text) 14%,transparent);border-radius:32px;overflow:hidden;background:var(--color-surface)">
          <div style="padding:16px;display:flex;flex-direction:column;gap:14px;min-height:520px">
            ${stack}
            <div style="flex:1"></div>
            ${renderSlot(by("sheet"))}
          </div>
          ${renderSlot(by("nav"))}
        </div>
      </div>`;
  } else if (scene === "states") {
    body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:24px;max-width:900px;margin:0 auto">
        ${renderSlot(by("empty"))}
        ${renderSlot(by("loading"))}
        ${renderSlot(by("error"))}
        ${renderSlot(by("success"))}
      </div>
      <p class="muted" style="text-align:center;font-size:11px;margin:8px 0 0">${L("Resueltos", "Resolved")}: loading=${esc(f.loadingPat)} · error=${esc(f.errorPat)} · success=${esc(f.successPat)}</p>`;
  } else if (scene === "marca") {
    // Marca UNIFICADA: mismo motor resuelto/slots que el resto de escenas.
    // La DISTRIBUCIÓN cambia según la navegación resuelta por la marca/preset:
    //  · app-shell/dashboard → escaparate con sidebar (producto/herramienta).
    //  · landing/tabbed      → escaparate con nav superior y hero centrado.
    const cardsGrid = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(${f.density === "compact" ? "220px" : "280px"},1fr));gap:${f.density === "compact" ? "16px" : "24px"}">${renderSlot(by("cards"))}</div>`;
    // Command palette (⌘K): zona asignable DINÁMICA, presente solo si la marca la usa.
    const palette = f.isPalette && hasSlot("command") ? renderSlot(by("command")) : "";
    if (f.hasShell) {
      body = `
      <div style="display:flex;min-height:600px;width:100%">
        <aside style="width:220px;flex-shrink:0;border-right:1px solid color-mix(in srgb,var(--color-text) 10%,transparent);padding:16px;display:flex;flex-direction:column;gap:14px">
          ${renderSlot(by("nav"))}
          ${palette}
          <div style="margin-top:auto">${renderSlot(by("actions"))}</div>
        </aside>
        <main style="flex:1;min-width:0;padding:32px;display:flex;flex-direction:column;gap:28px">
          ${renderSlot(by("hero"))}
          <section style="width:100%">${cardsGrid}</section>
          <section style="width:100%">${renderSlot(by("stats"))}</section>
          <section style="width:100%;max-width:800px">${renderSlot(by("faq"))}</section>
        </main>
      </div>
      ${renderSlot(by("footer"))}`;
    } else {
      body = `
      ${renderSlot(by("nav"))}
      ${palette ? `<div class="row" style="justify-content:center;margin-top:12px">${palette}</div>` : ""}
      <main class="mock-main">
        ${renderSlot(by("hero"))}
        <div class="row" style="justify-content:center;margin:24px 0">${renderSlot(by("actions"))}</div>
        <section style="margin-top:48px;width:100%">${cardsGrid}</section>
        <section style="margin-top:48px;width:100%">${renderSlot(by("stats"))}</section>
        <section style="margin-top:48px;width:100%;max-width:800px">${renderSlot(by("faq"))}</section>
      </main>
      ${renderSlot(by("footer"))}`;
    }
  } else {
    body = `<main class="mock-main">${S.map(renderSlot).join("")}</main>`;
  }

  const compCss = Array.from(used)
    .map((id) => samples.find((s) => s.id === id))
    .filter((s): s is Sample => Boolean(s))
    .map((s) => {
      const c = cssOf(s);
      return c ? `/* ${esc(s.name)} */\n${c}` : "";
    })
    .filter(Boolean)
    .join("\n");
  const dynCss = `<style>.btn,.slot,.card{transition:all ${speed} ease}.card{padding:${pad}}\n${compCss}</style>`;

  return sceneShell(css, theme, dynCss + body, interactions, runtimeMode);
}

export default function BrandEditor({
  initial,
  samples: initialSamples,
}: {
  initial: BrandDTO;
  samples: Sample[];
}) {
  const [tokens, setTokens] = useState<Doc>(initial.tokens);
  const [name, setName] = useState(initial.name);
  const [msg, setMsg] = useState<string | null>(null);
  const [raw, setRaw] = useState(() => JSON.stringify(initial.tokens, null, 2));
  const [rawErr, setRawErr] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ComponentDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [filterFramework, setFilterFramework] = useState("");

  // 3-column layout state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{ scene: SceneId; slot: string; label?: string; expects?: string } | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"dark"|"light">(() => {
    const bg = getResolvedValue(initial.tokens, "color.bg") || "#050505";
    if (bg.startsWith('#')) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luma > 128 ? "light" : "dark";
    }
    return "dark";
  });
  const [previewViewport, setPreviewViewport] = useState<"desktop"|"tablet"|"mobile">("desktop");
  // 5 Explicit Runtime Verification Modes: "design" | "interaction" | "data" | "a11y" | "production"
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("design");
  // Precision Responsive Viewports: "fluid" | "desktop" | "laptop" | "tablet" | "mobile" | "mobile_s"
  const [precisionViewport, setPrecisionViewport] = useState<PrecisionViewport>("fluid");
  // Toggle for Global System Archetypes collapsible section in Left Panel
  const [showArchetypes, setShowArchetypes] = useState(false);
  // Selected Block Node for Inspector & Breadcrumb
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  // Selected Subnode inside block (e.g. HeroImage, PrimaryCTA, Badges, Heading)
  const [selectedSubnode, setSelectedSubnode] = useState<SubnodeTarget | null>(null);
  // Left Zone subtab: "pages" | "layers" | "tokens"
  const [leftNavTab, setLeftNavTab] = useState<"pages" | "layers" | "tokens">("pages");
  // Data runtime mode state (source, state mode, records count)
  const [dataState, setDataState] = useState<{ mode: DataStateMode; count: number; source: string }>({
    mode: "success",
    count: 6,
    source: "mock/projects",
  });
  // Actionable Coverage Diagnostics Drawer
  const [coverageDrawerOpen, setCoverageDrawerOpen] = useState(false);
  // Undo deletion toast
  const [undoDeleteToast, setUndoDeleteToast] = useState<{
    block: SceneBlockInstance;
    scene: SceneId;
    index: number;
  } | null>(null);

  // Guard de Modo Producción
  const [prodGuardOpen, setProdGuardOpen] = useState(false);
  const [prodGuardAction, setProdGuardAction] = useState("editar o insertar componentes");

  // Resolvedor de conflictos de slots y composición estructural
  const [conflictState, setConflictState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    slotLabel: string;
    existingLabel?: string;
    incomingName: string;
    options: Array<{
      action: "replace" | "append_additional" | "adapt_content" | "cancel";
      label: string;
      description: string;
      isRecommended?: boolean;
    }>;
    onResolve: (action: "replace" | "append_additional" | "adapt_content" | "cancel") => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    slotLabel: "",
    incomingName: "",
    options: [],
    onResolve: () => {},
  });

  const [previewScene, setPreviewScene] = useState<SceneId>("landing");
  const [activeRoutePath, setActiveRoutePath] = useState<string>("/");
  const [previewViewId, setPreviewViewId] = useState<string | null>(null);
  const [visionFilter, setVisionFilter] = useState<DeficiencyType>("normal");
  const [tab, setTab] = useState<"visual" | "interaccion" | "estructura" | "datos" | "seguridad" | "sugerencias">("visual");
  
  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSource, setFilterSource] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [rightPanelTab, setRightPanelTab] = useState<"inspector" | "catalog" | "library">("catalog");
  const [brandSearch, setBrandSearch] = useState("");

  // Estados para exportación 1-Click y Puente IA
  const [pageExportModalOpen, setPageExportModalOpen] = useState(false);
  const [pageExportTab, setPageExportTab] = useState<"nextjs" | "astro" | "html" | "prompt">("nextjs");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Estados para Extractor Visual / Snippets personalizados en SQLite
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [snippetViewMode, setSnippetViewMode] = useState<"split" | "code" | "preview">("split");
  const [snippetDevice, setSnippetDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [snippetLeftBottomTab, setSnippetLeftBottomTab] = useState<"tokens" | "css">("tokens");
  const [snippetTargetSlot, setSnippetTargetSlot] = useState<string>("");
  const [snippetName, setSnippetName] = useState("");
  const [snippetCategory, setSnippetCategory] = useState("Hero");
  const [snippetFramework, setSnippetFramework] = useState("tailwind");
  const [snippetHtml, setSnippetHtml] = useState("");
  const [snippetCss, setSnippetCss] = useState("");
  const [savingSnippet, setSavingSnippet] = useState(false);

  // Estados para Constructor Visual y Libertad Topológica (Añadir / Enlazar secciones)
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [addSectionIndex, setAddSectionIndex] = useState<number | undefined>(undefined);
  const [newSectionType, setNewSectionType] = useState<string>("hero");
  const [newSectionLabel, setNewSectionLabel] = useState<string>("");
  const [newSectionLink, setNewSectionLink] = useState<string>("");
  const [linkModalBlockId, setLinkModalBlockId] = useState<string | null>(null);
  const [linkTargetScene, setLinkTargetScene] = useState<string>("");
  const [modalActions, setModalActions] = useState<Record<string, BlockActionBinding>>({});
  const [newActionId, setNewActionId] = useState<string>("");
  const [newActionLabel, setNewActionLabel] = useState<string>("");
  const [newActionKind, setNewActionKind] = useState<"scene" | "route" | "url" | "anchor">("scene");
  const [newActionVal, setNewActionVal] = useState<string>("");
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const lastPreviewScrollRef = useRef<number>(0);

  // Estados para Gestor de Nuevas Páginas y Vistas
  const [addPageModalOpen, setAddPageModalOpen] = useState(false);
  const [newPagePath, setNewPagePath] = useState("/proyectos/nuevo");
  const [newPageTitle, setNewPageTitle] = useState("Nuevo Proyecto");
  const [newPageSceneId, setNewPageSceneId] = useState<SceneId>("content");

  // Estado global de arrastre para resaltar zonas drop y permitir soltado directo en todo el editor
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [dragOverCanvasSlot, setDragOverCanvasSlot] = useState<string | null>(null);

  useEffect(() => {
    const onDragStart = () => setIsDraggingAny(true);
    const onDragEnd = () => {
      setIsDraggingAny(false);
      setDragOverCanvasSlot(null);
    };
    const onGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };
    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragover", onGlobalDragOver);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragover", onGlobalDragOver);
    };
  }, []);

  // Bloquear scroll de la página de fondo cuando cualquier modal esté abierto
  useEffect(() => {
    const isAnyModalOpen = snippetModalOpen || pageExportModalOpen || guidedOpen || auditOpen || addSectionModalOpen || Boolean(linkModalBlockId);
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [snippetModalOpen, pageExportModalOpen, guidedOpen, auditOpen, addSectionModalOpen, linkModalBlockId]);

  // Micro-interacciones nativas de fondo y componentes
  const [microInteractions, setMicroInteractions] = useState({
    cursorGlow: true,
    glowBorders: true,
    staggerReveal: true,
  });

  // Idioma reactivo
  const [lang, setLang] = useState<'es'|'en'>(() => {
    if (typeof window !== 'undefined') {
      return ((localStorage.getItem('lang') || 'es') as 'es'|'en');
    }
    return 'es';
  });
  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent).detail as 'es'|'en');
    window.addEventListener('app:lang-change', handler);
    return () => window.removeEventListener('app:lang-change', handler);
  }, []);
  const tr = (key: string) => t(key, lang);

  const compiled = useMemo(() => compileBrand(tokens), [tokens]);
  const fx = effectsOf(tokens);
  const font = getResolvedValue(tokens, "font.body") || "Inter";

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3500); };

  // Estado de sincronización en vivo y guardado reactivo
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Historial de cambios para Deshacer / Rehacer (Undo / Redo en sesión)
  const historyRef = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Control de versiones y snapshots
  const [auditTab, setAuditTab] = useState<"coverage" | "publish" | "versions">("coverage");
  const [versionCount, setVersionCount] = useState<number>(0);

  const loadVersionCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${initial.id}/versions`);
      const data = await res.json();
      if (Array.isArray(data.versions)) setVersionCount(data.versions.length);
    } catch {}
  }, [initial.id]);

  useEffect(() => {
    void loadVersionCount();
  }, [loadVersionCount]);

  const pushState = useCallback((currentDoc: Doc) => {
    const s = JSON.stringify(currentDoc);
    const past = historyRef.current.past;
    if (past.length === 0 || past[past.length - 1] !== s) {
      past.push(s);
      if (past.length > 50) past.shift();
      historyRef.current.future = [];
      setCanUndo(true);
      setCanRedo(false);
    }
  }, []);

  const handleUndo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (past.length === 0) return;
    const currentSerialized = JSON.stringify(tokens);
    future.push(currentSerialized);
    const previousSerialized = past.pop()!;
    const prevTokens = JSON.parse(previousSerialized) as Doc;
    setTokens(prevTokens);
    setRaw(JSON.stringify(prevTokens, null, 2));
    setCanUndo(past.length > 0);
    setCanRedo(true);
    flash("Deshecho: vuelto al estado anterior");
  }, [tokens]);

  const handleRedo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;
    const currentSerialized = JSON.stringify(tokens);
    past.push(currentSerialized);
    const nextSerialized = future.pop()!;
    const nextTokens = JSON.parse(nextSerialized) as Doc;
    setTokens(nextTokens);
    setRaw(JSON.stringify(nextTokens, null, 2));
    setCanUndo(true);
    setCanRedo(future.length > 0);
    flash("Rehecho");
  }, [tokens]);

  // Atajos de teclado universales: Ctrl+Z para Deshacer, Ctrl+Y o Ctrl+Shift+Z para Rehacer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        (target as HTMLInputElement).type !== "color";
      if (isTextInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Estados para añadir tokens de color dinámicos
  const [showAddToken, setShowAddToken] = useState(false);
  const [newCustomTokenPath, setNewCustomTokenPath] = useState("");
  const [newCustomTokenVal, setNewCustomTokenVal] = useState("#2a2e39");

  // Tokens adicionales de color (que no forman parte de los SLOTS predeterminados)
  const extraColorTokens = useMemo(() => {
    const resolved = resolveTokens(tokens);
    const standardPaths = new Set(SLOTS.map((s) => s.path));
    return resolved.filter((t) => t.path.startsWith("color.") && !standardPaths.has(t.path));
  }, [tokens]);

  // Guardado reactivo debounced automático (1.2s tras cualquier edición de tokens o nombre)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/brands/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tokens, previewIds: samples.map((s) => s.id) }),
        });
        setSaveStatus(res.ok ? "saved" : "unsaved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 1200);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [tokens, name, samples, initial.id]);

  // Sincronización en vivo a 0ms sin recargar el iframe cuando cambian tokens CSS o tema
  useEffect(() => {
    if (previewIframeRef.current?.contentWindow) {
      previewIframeRef.current.contentWindow.postMessage({
        type: "UPDATE_TOKENS_CSS",
        css: `:root{color-scheme:${previewTheme};}${compiled.css}${SCENE_STYLES}`,
      }, "*");
      previewIframeRef.current.contentWindow.postMessage({
        type: "SET_THEME",
        theme: previewTheme,
      }, "*");
    }
  }, [compiled.css, previewTheme]);

  const handleScrollToBlock = useCallback((blockId: string) => {
    previewIframeRef.current?.contentWindow?.postMessage({
      type: "SCROLL_TO_BLOCK",
      blockId,
    }, "*");
  }, []);

  const handleIframeLoad = useCallback(() => {
    if (previewIframeRef.current?.contentWindow) {
      previewIframeRef.current.contentWindow.postMessage({
        type: "UPDATE_TOKENS_CSS",
        css: `:root{color-scheme:${previewTheme};}${compiled.css}${SCENE_STYLES}`,
      }, "*");
      previewIframeRef.current.contentWindow.postMessage({
        type: "SET_THEME",
        theme: previewTheme,
      }, "*");
      if (lastPreviewScrollRef.current > 0) {
        previewIframeRef.current.contentWindow.postMessage({
          type: "RESTORE_SCROLL",
          scrollY: lastPreviewScrollRef.current,
        }, "*");
      }
    }
  }, [compiled.css, previewTheme]);

  useEffect(() => {
    lastPreviewScrollRef.current = 0;
  }, [previewScene]);

  const setSlot = (path: string, value: string) => {
    pushState(tokens);
    setTokens((prev) => { const next = setTokenValue(prev, path, value) as Doc; setRaw(JSON.stringify(next, null, 2)); return next; });
  };

  const handleApplyWcagFix = async (path: string, val: string) => {
    pushState(tokens);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const nextDoc = setTokenValue(tokens, path, val) as Doc;
    setTokens(nextDoc);
    setRaw(JSON.stringify(nextDoc, null, 2));
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/brands/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tokens: nextDoc, previewIds: samples.map((s) => s.id) }),
      });
      setSaveStatus(res.ok ? "saved" : "unsaved");
      flash(res.ok ? `Token ${path} optimizado y guardado: ${val}` : "Error al guardar ajuste.");
    } catch {
      setSaveStatus("unsaved");
    }
  };

  const handleApplyMultipleWcagFixes = async (fixes: Array<{ path: string; value: string }>) => {
    pushState(tokens);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    let nextDoc = structuredClone(tokens);
    for (const fix of fixes) {
      nextDoc = setTokenValue(nextDoc, fix.path, fix.value) as Doc;
    }
    setTokens(nextDoc);
    setRaw(JSON.stringify(nextDoc, null, 2));
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/brands/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tokens: nextDoc, previewIds: samples.map((s) => s.id) }),
      });
      setSaveStatus(res.ok ? "saved" : "unsaved");
      flash(res.ok ? `${fixes.length} tokens certificados a AAA y guardados en la marca.` : "Error al certificar.");
    } catch {
      setSaveStatus("unsaved");
    }
  };
  const blueprint = ((tokens as unknown as { blueprint?: Blueprint }).blueprint) ?? {};

  // Slots explícitos por escena: tokens.blueprint.slots[scene][slotId] = componentId
  const getSceneSlots = useCallback((scene: SceneId): Record<string, string> => {
    const bpSlots = (blueprint as { slots?: Record<string, Record<string, string>> }).slots;
    return (bpSlots && bpSlots[scene]) ? bpSlots[scene] : {};
  }, [blueprint]);

  const visualResolution = useMemo(() => resolveBlueprint(blueprint, brandVisualTokensForResolve(tokens)), [blueprint, tokens]);
  // Topología de slots derivada del resolvedConfig (una sola fuente para preview,
  // builder y resumen de cobertura). Decide qué zonas dinámicas existen ahora.
  const slotFlags = useMemo<SlotFlags>(() => sceneResolvedFlags(visualResolution.resolvedConfig), [visualResolution]);

  // Lista ordenada de bloques de la escena activa con libertad topológica y enlaces
  const currentSceneBlocks = useMemo<SceneBlockInstance[]>(() => {
    const sceneLayouts = (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts;
    const bpSlots = (blueprint as { slots?: Record<string, Record<string, string>> }).slots;
    const compProps = (blueprint as { componentProps?: Record<string, Record<string, unknown>> }).componentProps;
    return resolveSceneLayout(
      previewScene as SceneId,
      sceneLayouts,
      bpSlots?.[previewScene],
      slotFlags,
      compProps,
    );
  }, [blueprint, previewScene, slotFlags]);

  // Nodo de bloque seleccionado actualmente para el Inspector
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    return currentSceneBlocks.find((b) => b.id === selectedBlockId) || null;
  }, [currentSceneBlocks, selectedBlockId]);

  // Preview HTML memoizado: no recarga el iframe ante cambios puros de CSS (se sincronizan a 0ms por postMessage)
  const previewSrcDoc = useMemo(() => {
    return sceneDoc(
      previewScene as SceneId,
      compiled.css,
      previewTheme,
      samples,
      getSceneSlots(previewScene as SceneId),
      visualResolution.resolvedConfig,
      lang,
      microInteractions,
      currentSceneBlocks,
      runtimeMode,
      selectedBlockId,
      dataState,
      resolveProjectCollection(blueprint, { runtimeMode, includeDrafts: runtimeMode !== "production" }),
      activeRoutePath,
    );
  }, [
    previewScene,
    samples,
    previewTheme,
    visualResolution.resolvedConfig,
    lang,
    microInteractions,
    currentSceneBlocks,
    runtimeMode,
    selectedBlockId,
    dataState,
    getSceneSlots,
    compiled.css,
    blueprint,
    activeRoutePath,
  ]);

  // Forzar sincronización inmediata del DOM del iframe cuando previewSrcDoc cambie por cualquier edición
  useEffect(() => {
    if (previewIframeRef.current && previewIframeRef.current.srcdoc !== previewSrcDoc) {
      previewIframeRef.current.srcdoc = previewSrcDoc;
    }
  }, [previewSrcDoc]);

  const setBpField = (path: string, value: unknown) => {
    pushState(tokens);
    setTokens((prev) => {
      const next: Doc = structuredClone(prev);
      const root = next as unknown as { blueprint?: Record<string, unknown> };
      if (!root.blueprint) root.blueprint = {};
      const parts = path.split(".");
      let o = root.blueprint as Record<string, unknown>;
      for (let k = 0; k < parts.length - 1; k++) {
        if (!o[parts[k]] || typeof o[parts[k]] !== "object") o[parts[k]] = {};
        o = o[parts[k]] as Record<string, unknown>;
      }
      o[parts[parts.length - 1]] = value;
      // Trazabilidad: una edición del usuario marca el campo como "manual" (verdad
      // actual), por encima de detected/seeded previos. Clave en convención resolve.
      const provKey = path.startsWith("architecture.") ? "structure." + path.slice("architecture.".length) : path;
      if (/^(interaction|structure|data)\./.test(provKey)) {
        const bpRoot = root.blueprint as { provenance?: Record<string, unknown> };
        bpRoot.provenance = { ...(bpRoot.provenance ?? {}), [provKey]: { origin: "manual" } };
      }
      setRaw(JSON.stringify(next, null, 2));
      return next;
    });
  };
  const getBp = (path: string): unknown => {
    let o: unknown = blueprint;
    for (const seg of path.split(".")) {
      if (o && typeof o === "object") o = (o as Record<string, unknown>)[seg];
      else return undefined;
    }
    return o;
  };
  // Trazabilidad VISIBLE: procedencia por campo para el editor. resolve.ts decide
  // default/heredado (verdad de sistema); `blueprint.provenance` refina el caso
  // "custom" en detectado / sembrado / manual.
  const originOf = (domain: "interaction" | "structure" | "data", key: string): OriginInfo => {
    const f = visualResolution.validationReport.domains[domain]?.fields.find((x) => x.key === key);
    const ro = f?.origin;
    const prov = ((blueprint as { provenance?: Record<string, { origin: string; source?: string; confidence?: string }> }).provenance ?? {})[`${domain}.${key}`];
    if (ro === "default") return { state: "default" };
    if (ro === "preset" || ro === "template") return { state: "inherited" };
    if (ro === "custom") {
      if (prov?.origin === "seeded") return { state: "seeded", source: prov.source, confidence: prov.confidence };
      if (prov?.origin === "detected") return { state: "detected", source: prov.source, confidence: prov.confidence };
      return { state: "manual" };
    }
    return { state: "missing" };
  };
  // PUENTE modelo → UI: vuelca las señales del análisis a los controles editables
  // (arquitectura/árbol, datos, interacción) SOLO en los campos vacíos — nunca
  // machaca lo que ya tocaste. Idempotente. Deja traza en `blueprint.seeded`.
  const applyAnalysisToEditor = () => {
    pushState(tokens);
    const { bp, applied } = seedEditableFromBlueprint(blueprint);
    setTokens((prev) => {
      const next: Doc = structuredClone(prev);
      (next as unknown as { blueprint?: Blueprint }).blueprint = bp;
      setRaw(JSON.stringify(next, null, 2));
      return next;
    });
    flash(applied.length
      ? (lang === "en" ? `Applied ${applied.length} field(s) from the analysis (empty controls only).` : `Aplicados ${applied.length} campo(s) del análisis (solo controles vacíos).`)
      : (lang === "en" ? "Nothing to apply — controls already set." : "Nada que aplicar — los controles ya estaban definidos."));
  };
  const toggleBpArray = (path: string, item: string) => {
    const cur = getBp(path);
    const arr = Array.isArray(cur) ? (cur as string[]).slice() : [];
    const at = arr.indexOf(item);
    if (at >= 0) arr.splice(at, 1);
    else arr.push(item);
    setBpField(path, arr);
  };
  const addIdea = (idea: { title: string; source?: string; url?: string }) => {
    const cur = getBp("ideas");
    const arr = Array.isArray(cur) ? (cur as unknown[]).slice() : [];
    arr.push(idea);
    setBpField("ideas", arr);
  };
  const removeIdea = (at: number) => {
    const cur = getBp("ideas");
    const arr = Array.isArray(cur) ? (cur as unknown[]).slice() : [];
    arr.splice(at, 1);
    setBpField("ideas", arr);
  };
  const applyRuleLine = (line: string) => {
    const cur = String(getBp("agents.rules") ?? "");
    setBpField("agents.rules", (cur ? cur + "\n" : "") + "- " + line);
    flash("Añadido a reglas para agentes.");
  };
  const applyBrandPreset = (id: string) => {
    pushState(tokens);
    setTokens((prev) => {
      const next = applyPresetToDoc(prev, id) as Doc;
      setRaw(JSON.stringify(next, null, 2));
      return next;
    });
    const pr = PRESETS.find((x) => x.id === id);
    logEvent("preset.apply", { id });
    // Salta a la escena representativa del preset (composición, no solo colores) y a Visual.
    if (pr?.defaultScene) { setPreviewScene(pr.defaultScene as SceneId); setTab("visual"); }
    flash(pr ? "Preset aplicado: " + pr.name + " (visual + comportamiento)" : "Preset aplicado");
  };
  // Modo Starter: aplica un golden path COMPLETO (arquitectura, árbol, librerías,
  // reglas de agente, interacción, datos, seguridad + visual del preset asociado).
  const applyBrandTemplate = (id: string, parts?: TemplatePart[]) => {
    pushState(tokens);
    setTokens((prev) => {
      const next = applyTemplateToDoc(prev, id, parts) as Doc;
      setRaw(JSON.stringify(next, null, 2));
      return next;
    });
    const tpl = PROJECT_TEMPLATES.find((x) => x.id === id);
    logEvent(parts && parts.length ? "template.applyPartial" : "template.apply", { id, parts: parts ?? "full" });
    const isFull = !parts || parts.length === 0;
    // Aplicación completa: salta a la escena por defecto de la plantilla y a la
    // pestaña Visual para que se vea de inmediato su identidad propia.
    if (isFull && tpl?.defaultScene) { setPreviewScene(tpl.defaultScene); setTab("visual"); }
    const scopeTxt = parts && parts.length ? parts.join(" · ") : "arquitectura · árbol · librerías · reglas · datos · seguridad";
    flash(tpl ? `Plantilla aplicada: ${tpl.name} (${scopeTxt}). Revisa y pulsa Guardar.` : "Plantilla aplicada");
  };
  // Modo Guided: aplica una base completa + los overrides del recorrido corto.
  const applyGuided = (baseId: string, ans: GuidedAnswers) => {
    pushState(tokens);
    logEvent("guided.finish", { baseId, ans });
    setTokens((prev) => {
      const next = applyGuidedToDoc(prev, baseId, ans) as Doc;
      setRaw(JSON.stringify(next, null, 2));
      return next;
    });
    setTab("visual");
    const tpl = PROJECT_TEMPLATES.find((x) => x.id === baseId);
    if (tpl?.defaultScene) setPreviewScene(tpl.defaultScene);
    flash(tpl ? `Base guiada aplicada: ${tpl.name}. Revisa y pulsa Guardar.` : "Base aplicada");
  };
  const setEffect = (section: keyof EffectsConfig, key: string, value: unknown) => {
    pushState(tokens);
    setTokens((prev) => {
      const next: Doc = structuredClone(prev); const base = effectsOf(prev);
      next.effects = { ...base, [section]: { ...(base[section] as object), [key]: value } };
      setRaw(JSON.stringify(next, null, 2)); return next;
    });
  };
  const applyPreset = (presetName: string) => {
    const preset = EFFECT_PRESETS[presetName]; if (!preset) return;
    pushState(tokens);
    setTokens((prev) => {
      const next: Doc = structuredClone(prev); next.effects = { ...effectsOf(prev), ...structuredClone(preset) };
      setRaw(JSON.stringify(next, null, 2)); return next;
    });
  };
  const applyRaw = (text: string) => {
    setRaw(text); try { setTokens(JSON.parse(text)); setRawErr(null); } catch (e) { setRawErr("JSON inválido: " + (e as Error).message); }
  };

  const patch = async (body: Record<string, unknown>) => {
    await fetch(`/api/brands/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  };
  const addComponent = (c: ComponentDTO) => {
    if (samples.some((s) => s.id === c.id)) return;
    pushState(tokens);
    logEvent("component.add", { componentId: c.id, category: c.category });
    const next = [...samples, toSample(c)]; setSamples(next); patch({ previewIds: next.map((s) => s.id) });
  };
  const removeComponent = (id: string) => {
    pushState(tokens);
    logEvent("component.remove", { componentId: id });
    const nextSamples = samples.filter((s) => s.id !== id);
    const nextTokens: Doc = structuredClone(tokens);
    const root = nextTokens as unknown as { blueprint?: { slots?: Record<string, Record<string, string>> } };
    if (root.blueprint?.slots) {
      for (const sc of Object.keys(root.blueprint.slots)) {
        for (const [sId, cId] of Object.entries(root.blueprint.slots[sc] ?? {})) {
          if (cId === id) delete root.blueprint.slots[sc][sId];
        }
      }
    }
    setSamples(nextSamples);
    setTokens(nextTokens);
    setRaw(JSON.stringify(nextTokens, null, 2));
    patch({ tokens: nextTokens, previewIds: nextSamples.map((s) => s.id) });
    flash("Componente quitado de la marca.");
  };


  const assignToSlot = (scene: SceneId, slotId: string, c: ComponentDTO) => {
    pushState(tokens);
    logEvent("slot.assign", { scene, slotId, componentId: c.id, category: c.category });
    let nextSamples = samples;
    if (!samples.some((s) => s.id === c.id)) nextSamples = [...samples, toSample(c)];
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as { blueprint?: { slots?: Record<string, Record<string, string>> } };
    root.blueprint = root.blueprint ?? {};
    root.blueprint.slots = root.blueprint.slots ?? {};
    root.blueprint.slots[scene] = { ...(root.blueprint.slots[scene] ?? {}), [slotId]: c.id };
    setSamples(nextSamples);
    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next, previewIds: nextSamples.map((s) => s.id) });
  };
  const clearSlot = (scene: SceneId, slotId: string) => {
    pushState(tokens);
    const next: Doc = structuredClone(tokens);
    const slots = (next as unknown as { blueprint?: { slots?: Record<string, Record<string, string>> } }).blueprint?.slots?.[scene];
    if (!slots || !(slotId in slots)) return;
    logEvent("slot.clear", { scene, slotId });
    delete slots[slotId];
    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next });
    flash("Zona liberada.");
  };
  // Ref siempre-actual de clearSlot: el listener de mensajes tiene deps [] y si
  // llamara a clearSlot directamente capturaría un `tokens` viejo (stale closure).
  const clearSlotRef = useRef(clearSlot);
  clearSlotRef.current = clearSlot;
  // Reutilizar un componente que YA está en la biblioteca de marca en un slot.
  const assignExistingToSlot = (scene: SceneId, slotId: string, componentId: string) => {
    pushState(tokens);
    logEvent("slot.assignExisting", { scene, slotId, componentId });
    if (!samples.some((s) => s.id === componentId)) return;
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as { blueprint?: { slots?: Record<string, Record<string, string>> } };
    root.blueprint = root.blueprint ?? {};
    root.blueprint.slots = root.blueprint.slots ?? {};
    root.blueprint.slots[scene] = { ...(root.blueprint.slots[scene] ?? {}), [slotId]: componentId };
    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next });
    flash("Reutilizado y fijado en esta escena.");
  };

  // Modificación y persistencia de layout ordenado por escena
  const updateSceneLayout = useCallback((scene: SceneId, newBlocks: SceneBlockInstance[]) => {
    pushState(tokens);
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as {
      blueprint?: {
        sceneLayouts?: Record<string, SceneBlockInstance[]>;
        slots?: Record<string, Record<string, string>>;
      };
    };
    root.blueprint = root.blueprint ?? {};
    root.blueprint.sceneLayouts = root.blueprint.sceneLayouts ?? {};
    root.blueprint.sceneLayouts[scene] = newBlocks;

    // Sincronizar también los slots primarios para compatibilidad retroactiva
    root.blueprint.slots = root.blueprint.slots ?? {};
    root.blueprint.slots[scene] = root.blueprint.slots[scene] ?? {};
    for (const b of newBlocks) {
      if (b.componentId) {
        root.blueprint.slots[scene][b.id] = b.componentId;
      }
    }

    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next });
  }, [tokens, pushState]);

  const handleMoveBlock = useCallback((scene: SceneId, from: number, to: number) => {
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const updated = reorderSceneBlocks(blocks, from, to);
    updateSceneLayout(scene, updated);
    flash(lang === "en" ? "Section reordered." : "Sección reordenada.");
  }, [blueprint, slotFlags, updateSceneLayout, lang]);

  const handleDuplicateBlock = useCallback((scene: SceneId, blockId: string) => {
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const updated = duplicateSceneBlock(blocks, blockId);
    updateSceneLayout(scene, updated);
    flash(lang === "en" ? "Section duplicated." : "Sección duplicada con éxito.");
  }, [blueprint, slotFlags, updateSceneLayout, lang]);

  const handleRemoveBlock = useCallback((scene: SceneId, blockId: string) => {
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const idx = blocks.findIndex((b) => b.id === blockId);
    const deleted = blocks[idx];
    const updated = removeSceneBlock(blocks, blockId);
    updateSceneLayout(scene, updated);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    if (deleted && idx !== -1) {
      setUndoDeleteToast({ block: deleted, scene, index: idx });
    }
  }, [blueprint, slotFlags, updateSceneLayout, selectedBlockId]);

  const handleUndoDelete = useCallback(() => {
    if (!undoDeleteToast) return;
    const { block, scene, index } = undoDeleteToast;
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const restored = insertSceneBlock(blocks, block, index);
    updateSceneLayout(scene, restored);
    setUndoDeleteToast(null);
    flash(lang === "en" ? `Restored "${block.label}".` : `Restaurada la sección "${block.label}".`);
  }, [undoDeleteToast, blueprint, slotFlags, updateSceneLayout, lang]);

  const handleUpdateBlock = useCallback((updatedBlock: SceneBlockInstance) => {
    pushState(tokens);
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as {
      blueprint?: {
        sceneLayouts?: Record<string, SceneBlockInstance[]>;
        slots?: Record<string, Record<string, string>>;
        componentProps?: Record<string, Record<string, unknown>>;
      };
    };
    root.blueprint = root.blueprint ?? {};
    root.blueprint.sceneLayouts = root.blueprint.sceneLayouts ?? {};
    root.blueprint.componentProps = root.blueprint.componentProps ?? {};

    // 1. Guardar props globales del componente master
    if (updatedBlock.componentId && updatedBlock.props) {
      root.blueprint.componentProps[updatedBlock.componentId] = structuredClone(updatedBlock.props);
    }

    // 2. Actualizar en la escena activa
    const scene = previewScene as SceneId;
    const currentBlocks = resolveSceneLayout(
      scene,
      root.blueprint.sceneLayouts,
      root.blueprint.slots?.[scene],
      slotFlags,
      root.blueprint.componentProps,
    );
    root.blueprint.sceneLayouts[scene] = currentBlocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));

    // 3. Sincronización Global Master Component: propagar cambios a todas las demás páginas
    if (updatedBlock.componentId) {
      for (const [scKey, scList] of Object.entries(root.blueprint.sceneLayouts)) {
        if (scKey === scene) continue;
        root.blueprint.sceneLayouts[scKey] = (scList || []).map((b) => {
          if (b.componentId === updatedBlock.componentId) {
            return {
              ...b,
              props: updatedBlock.props ? structuredClone(updatedBlock.props) : b.props,
              dataBinding: updatedBlock.dataBinding ? structuredClone(updatedBlock.dataBinding) : b.dataBinding,
              actionBindings: updatedBlock.actionBindings ? structuredClone(updatedBlock.actionBindings) : b.actionBindings,
              styleConfig: updatedBlock.styleConfig ? structuredClone(updatedBlock.styleConfig) : b.styleConfig,
              layoutConfig: updatedBlock.layoutConfig ? structuredClone(updatedBlock.layoutConfig) : b.layoutConfig,
              a11y: updatedBlock.a11y ? structuredClone(updatedBlock.a11y) : b.a11y,
              advancedConfig: updatedBlock.advancedConfig ? structuredClone(updatedBlock.advancedConfig) : b.advancedConfig,
            };
          }
          return b;
        });
      }
    }

    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next });
  }, [tokens, previewScene, slotFlags, pushState, patch, setRaw, setTokens]);

  const handleUpdateProject = useCallback((slug: string, changes: Partial<PortfolioProject>) => {
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as { blueprint?: Blueprint };
    root.blueprint = root.blueprint ?? {};
    const source = Array.isArray(root.blueprint.projects) ? root.blueprint.projects : INITIAL_PORTFOLIO_PROJECTS;
    if (!source.some((project) => project.slug.toLowerCase() === slug.toLowerCase())) return;
    pushState(tokens);
    root.blueprint.projects = updateProjectBySlug(source, slug, changes);
    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next });
  }, [tokens, pushState, setTokens, setRaw, patch]);

  const handleSetBlockLink = useCallback((scene: SceneId, blockId: string, targetScene?: string) => {
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const updated = updateSceneBlockLink(blocks, blockId, targetScene || undefined);
    updateSceneLayout(scene, updated);
    flash(targetScene ? (lang === "en" ? `Linked to ${targetScene}.` : `Enlazado hacia la página ${targetScene}.`) : (lang === "en" ? "Link removed." : "Enlace eliminado."));
  }, [blueprint, slotFlags, updateSceneLayout, lang]);

  const handleInsertNewSection = useCallback((
    scene: SceneId,
    type: string,
    label: string,
    targetScene?: string,
    atIndex?: number,
  ) => {
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const newId = `${type}_${Date.now().toString(36)}`;
    
    let autoBinding = undefined;
    let componentId: string | undefined = undefined;
    let defaultProps: Record<string, any> = {};

    if (type === "projects") {
      autoBinding = { source: "portfolio-projects" as const, layout: "grid" as const, filter: { limit: 6, featuredOnly: false } };
      componentId = "comp_ivn_projects";
      defaultProps = {
        heading: "Proyectos Destacados",
        highlightedWord: "Destacados",
        eyebrow: "PORTFOLIO SELECCIONADO",
        subtitle: "Sistemas web completos, arquitecturas frontend y plataformas escalables.",
        limit: 6,
        featuredOnly: false,
        layout: "grid",
      };
    } else if (type === "detail") {
      autoBinding = { source: "portfolio-projects" as const, layout: "detail" as const };
      componentId = "comp_ivn_project_detail_oposapp";
      defaultProps = {
        slug: "oposapp",
        title: "OposApp · Plataforma EdTech",
        subtitle: "Arquitectura frontend ultra escalable para estudiantes de oposiciones con tests interactivos y análisis en tiempo real.",
        badge: "CASO DE ESTUDIO",
      };
    } else if (type === "hero") {
      componentId = "comp_ivn_hero";
      defaultProps = {
        headline: "Arquitectura & Desarrollo Web Ultra Rápido",
        highlightWord: "Ultra Rápido",
        subheadline: "Creamos experiencias digitales memorables con diseño de vanguardia y rendimiento de clase mundial.",
        ctaLabel: "Ver Proyectos",
        ctaSecondaryLabel: "Descargar CV",
        badgeText: "DISPONIBLE PARA TRABAJAR",
        portrait: {
          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
          alt: "Retrato Profesional"
        }
      };
    } else if (type === "bento") {
      componentId = "comp_ivn_bento_numbers";
      defaultProps = {
        title: "Ecosistema & Métricas en Números",
        eyebrow: "INNOVACIÓN CONTINUA",
        subtitle: "Infraestructura cloud, automatizaciones CI/CD y diseño procedural comprobado.",
        items: [
          { title: "6+ Años", badge: "Experiencia", description: "Liderando proyectos web de alta complejidad" },
          { title: "10+ Proyectos", badge: "Producción", description: "Entregados con éxito a clientes globales" },
          { title: "99.9% Uptime", badge: "Disponibilidad", description: "Infraestructura resiliente y monitoreada" },
        ]
      };
    } else if (type === "stats") {
      componentId = "comp_ivn_metrics";
      defaultProps = {
        title: "Resultados Cuantificables",
        eyebrow: "MÉTRICAS CLAVE",
        subtitle: "Rendimiento y velocidad comprobados en cada entrega.",
        items: [
          { title: "6+", badge: "Años en Tech", description: "Evolución constante de stack" },
          { title: "6", badge: "Proyectos Prod", description: "Actualmente en vivo" },
          { title: "10+", badge: "Entregados", description: "Soluciones a medida" },
          { title: "~30", badge: "Servicios", description: "Autoalojados y optimizados" },
        ]
      };
    } else if (type === "contact") {
      componentId = "comp_ivn_contact";
      defaultProps = {
        title: "¿Hablamos de tu próximo proyecto?",
        eyebrow: "DISPONIBILIDAD INMEDIATA",
        subtitle: "Cuéntame qué necesitas construir y te responderé en menos de 24 horas con una propuesta clara.",
        email: "ivan@goldenpath.studio",
        buttonText: "Enviar Mensaje",
      };
    } else if (type === "nav") {
      componentId = "comp_ivn_navbar";
      defaultProps = {
        brandName: "IVN · Golden Path",
        links: [
          { label: "Inicio", href: "#hero" },
          { label: "Proyectos", href: "#proyectos" },
          { label: "Métricas", href: "#metricas" },
          { label: "Contacto", href: "#contacto" },
        ]
      };
    } else if (type === "footer") {
      componentId = "comp_ivn_footer";
      defaultProps = {
        brandName: "IVN Studio",
        copyright: "© 2026 Iván Jonás. Todos los derechos reservados.",
        tagline: "Desarrollo web moderno con obsesión por la calidad y el detalle.",
      };
    } else {
      // Personalizado / Custom: bloque dinámico listo para usarse
      defaultProps = {
        title: label.trim() || "Nueva Sección Personalizada",
        heading: label.trim() || "Nueva Sección Personalizada",
        eyebrow: "BLOQUE MODULAR",
        subtitle: "Personaliza este bloque desde el inspector: edita títulos, añade tarjetas o ajusta el diseño.",
        items: [
          { title: "Velocidad Extrema", badge: "Core", description: "Optimizado para carga instantánea y SEO superior." },
          { title: "Componentes Vivos", badge: "Reactivo", description: "Modificaciones en caliente con sincronización total." },
          { title: "Diseño Adaptable", badge: "Responsive", description: "Fluido en móviles, tablets y escritorios." },
        ]
      };
    }

    const updated = insertSceneBlock(blocks, {
      id: newId,
      type: type === "projects" ? "cards" : type === "detail" ? "hero" : type,
      label: label.trim() || type,
      componentId,
      dataBinding: autoBinding,
      linkToScene: targetScene || undefined,
      props: defaultProps,
    }, atIndex);

    updateSceneLayout(scene, updated);
    setSelectedBlockId(newId);
    setSelectedSubnode({ blockId: newId, subnodeType: "root" });
    setRightPanelTab("inspector");
    setRightPanelOpen(true);
    setTimeout(() => {
      handleScrollToBlock(newId);
    }, 150);
    flash(lang === "en" ? `New section "${label || type}" added.` : `Nueva sección "${label || type}" insertada.`);
  }, [blueprint, slotFlags, updateSceneLayout, lang, handleScrollToBlock]);

  const handleNavigateToScene = useCallback((targetScene: string) => {
    const resolved = sceneForRoute(targetScene);
    if (resolved) {
      setPreviewScene(resolved);
      flash(lang === "en" ? `Navigated to ${SCENE_LABEL[resolved]} (${routeForScene(resolved)})` : `Navegando a la página ${SCENE_LABEL[resolved]} (${routeForScene(resolved)})`);
    } else {
      flash(lang === "en" ? `Route ${targetScene} clicked.` : `Ruta ${targetScene} pulsada en preview.`);
    }
  }, [lang]);

  const customRoutesList = useMemo<PageRoute[]>(() => {
    const rawCustom = (blueprint as { customRoutes?: PageRoute[] }).customRoutes;
    return Array.isArray(rawCustom) ? rawCustom : [];
  }, [blueprint]);

  // Páginas del Proyecto: resolución dinámica, jerárquica y global para CUALQUIER proyecto actual o futuro
  const projectRoutes = useMemo<PageRoute[]>(() => {
    let list: PageRoute[] = [];
    if (customRoutesList && customRoutesList.length > 0) {
      list = [...customRoutesList];
    } else {
      const sceneLayouts = (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts ?? {};
      const configuredScenes = Object.keys(sceneLayouts);
      if (configuredScenes.length > 0) {
        list = CANONICAL_PROJECT_ROUTES.filter((r) => configuredScenes.includes(r.sceneId));
      } else {
        list = [...CANONICAL_PROJECT_ROUTES];
      }
    }

    // 0. Resolver dinámicamente TODOS los proyectos CMS de la marca para que cada uno tenga su página dedicada
    const cmsProjects = resolveProjectCollection(blueprint as Blueprint, { includeDrafts: true });
    if (cmsProjects && cmsProjects.length > 0) {
      cmsProjects.forEach((proj) => {
        const projPath = `/proyectos/${proj.slug}`;
        if (!list.some((r) => r.path === projPath)) {
          list.push({
            path: projPath,
            sceneId: "content" as SceneId,
            title: proj.title || proj.slug,
            icon: "file-text",
            parentPath: "/portfolio",
            description: proj.summary || `Detalle técnico de ${proj.title}`,
          });
        }
      });
    }

    // 1. Inclusión OBLIGATORIA de la raíz "/" si no existe
    if (!list.some((r) => r.path === "/")) {
      list.unshift({
        path: "/",
        sceneId: "landing",
        title: "Inicio (Principal)",
        icon: "home",
        description: "Página principal y portada de la web",
      });
    }

    // 2. Normalización de sceneId: NINGUNA subpágina o contacto debe secuestrar sceneId: "landing"
    list = list.map((r) => {
      if (r.path !== "/" && r.sceneId === "landing") {
        return {
          ...r,
          sceneId: r.path.includes("contact") ? ("form" as SceneId) : ("content" as SceneId),
        };
      }
      return r;
    });

    // 3. Ordenación jerárquica canónica y natural:
    //    - "/" SIEMPRE PRIMERO (#1)
    //    - /portfolio
    //    - /proyectos/[slug] (plantilla)
    //    - /proyectos/:slug (fichas individuales)
    //    - Páginas finales / utilidades (/contacto, /auth...)
    return list.sort((a, b) => {
      if (a.path === "/") return -1;
      if (b.path === "/") return 1;

      const aIsContact = a.path.includes("contact");
      const bIsContact = b.path.includes("contact");
      if (aIsContact && !bIsContact) return 1;
      if (!aIsContact && bIsContact) return -1;

      if (a.path === "/portfolio" && b.path.startsWith("/proyectos/")) return -1;
      if (b.path === "/portfolio" && a.path.startsWith("/proyectos/")) return 1;

      if (a.path === "/proyectos/[slug]" && b.path.startsWith("/proyectos/")) return -1;
      if (b.path === "/proyectos/[slug]" && a.path.startsWith("/proyectos/")) return 1;

      const aDepth = a.path.split("/").filter(Boolean).length;
      const bDepth = b.path.split("/").filter(Boolean).length;
      if (aDepth !== bDepth) return aDepth - bDepth;

      return a.path.localeCompare(b.path);
    });
  }, [blueprint, customRoutesList]);

  const allProjectRoutes = useMemo<PageRoute[]>(() => {
    return projectRoutes;
  }, [projectRoutes]);

  const handleCreateNewPage = useCallback((path: string, title: string, sceneId: SceneId) => {
    const cleanPath = path.startsWith("/") ? path.trim() : `/${path.trim()}`;
    const newRoute: PageRoute = {
      path: cleanPath,
      sceneId,
      title: title.trim() || cleanPath,
      icon: "file-text",
      isDynamic: cleanPath.includes("["),
      description: `Página personalizada ${title.trim()}`,
    };
    pushState(tokens);
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as { blueprint?: { customRoutes?: PageRoute[] } };
    root.blueprint = root.blueprint ?? {};
    const existing = root.blueprint.customRoutes ?? [];
    root.blueprint.customRoutes = [...existing.filter((r) => r.path !== cleanPath), newRoute];
    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next });
    setPreviewScene(sceneId);
    setActiveRoutePath(cleanPath);
    setAddPageModalOpen(false);
    flash(lang === "en" ? `Page "${title}" created at ${cleanPath}.` : `Página "${title}" creada con éxito en ${cleanPath}.`);
  }, [tokens, pushState, lang]);

  const handleDeleteCustomRoute = useCallback((pathToDelete: string) => {
    pushState(tokens);
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as { blueprint?: { customRoutes?: PageRoute[] } };
    if (!root.blueprint?.customRoutes) return;
    root.blueprint.customRoutes = root.blueprint.customRoutes.filter((r) => r.path !== pathToDelete);
    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next });
    flash(lang === "en" ? `Route ${pathToDelete} deleted.` : `Ruta ${pathToDelete} eliminada.`);
  }, [tokens, pushState, lang]);

  const handlePromptLink = useCallback((scene: SceneId, blockId: string) => {
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const blk = blocks.find((b) => b.id === blockId);
    setLinkModalBlockId(blockId);
    setLinkTargetScene(blk?.linkToScene || "");
    setModalActions(blk ? resolveBlockActions(blk) : {});
    setNewActionId("");
    setNewActionLabel("");
    setNewActionKind("scene");
    setNewActionVal("");
  }, [blueprint, slotFlags]);

  const handleSaveBlockActions = useCallback((scene: SceneId, blockId: string, actions: Record<string, BlockActionBinding>) => {
    const blocks = resolveSceneLayout(
      scene,
      (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
      (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
      slotFlags,
    );
    const primaryTarget = actions["primary"]?.target;
    const legacyLink = primaryTarget && primaryTarget.kind === "scene" ? primaryTarget.sceneId : undefined;
    const updated = blocks.map((b) => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        actionBindings: actions,
        linkToScene: legacyLink,
      };
    });
    updateSceneLayout(scene, updated);
    flash(lang === "en" ? "Action bindings and routes saved." : "Acciones, bindings y rutas guardadas con éxito.");
  }, [blueprint, slotFlags, updateSceneLayout, lang]);

  // Refs siempre actuales para el listener de mensajes sin problemas de closures
  const handleMoveBlockRef = useRef(handleMoveBlock);
  handleMoveBlockRef.current = handleMoveBlock;
  const handleDuplicateBlockRef = useRef(handleDuplicateBlock);
  handleDuplicateBlockRef.current = handleDuplicateBlock;
  const handleRemoveBlockRef = useRef(handleRemoveBlock);
  handleRemoveBlockRef.current = handleRemoveBlock;
  const handlePromptLinkRef = useRef(handlePromptLink);
  handlePromptLinkRef.current = handlePromptLink;
  const handleNavigateToSceneRef = useRef(handleNavigateToScene);
  handleNavigateToSceneRef.current = handleNavigateToScene;
  const handleIframeLoadRef = useRef(handleIframeLoad);
  handleIframeLoadRef.current = handleIframeLoad;

  const handleSaveSnippet = async () => {
    if (!snippetName.trim() || !snippetHtml.trim()) {
      flash(lang === "en" ? "Name and HTML are required." : "El nombre y el HTML son obligatorios.");
      return;
    }
    setSavingSnippet(true);
    try {
      const res = await fetch("/api/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: snippetName.trim(),
          category: snippetCategory.trim(),
          html: snippetHtml.trim(),
          css: snippetCss.trim(),
          framework: snippetFramework,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al guardar snippet");
      }
      const sample: Sample = {
        id: data.id,
        name: data.name,
        framework: data.framework || "tailwind",
        files: [
          { path: "index.html", content: snippetHtml.trim() },
          ...(snippetCss.trim() ? [{ path: "style.css", content: snippetCss.trim() }] : []),
        ],
        previewHtml: data.previewHtml,
        category: data.category,
      };
      const nextSamples = [...samples, sample];
      setSamples(nextSamples);
      pushState(tokens);
      const next: Doc = structuredClone(tokens);
      const root = next as unknown as { blueprint?: { slots?: Record<string, Record<string, string>> } };
      root.blueprint = root.blueprint ?? {};
      root.blueprint.slots = root.blueprint.slots ?? {};
      const targetSlotId = snippetTargetSlot || (activeSlot && activeSlot.scene === previewScene ? activeSlot.slot : undefined);
      if (targetSlotId) {
        root.blueprint.slots[previewScene] = {
          ...(root.blueprint.slots[previewScene] ?? {}),
          [targetSlotId]: sample.id,
        };
      }
      setTokens(next);
      setRaw(JSON.stringify(next, null, 2));
      patch({ tokens: next, previewIds: nextSamples.map((s) => s.id) });
      setSnippetModalOpen(false);
      setSnippetName("");
      setSnippetHtml("");
      setSnippetCss("");
      setSnippetTargetSlot("");
      flash(lang === "en" ? `Snippet "${sample.name}" saved to vault and linked to brand!` : `¡Snippet "${sample.name}" guardado en la base de datos y enlazado a la marca!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      flash(`Error: ${msg}`);
    } finally {
      setSavingSnippet(false);
    }
  };

  const handleDropOnSlot = useCallback((slotId: string, compId: string, compData?: ComponentDTO | Sample) => {
    if (samples.some((s) => s.id === compId)) {
      assignExistingToSlot(previewScene as SceneId, slotId, compId);
      flash(lang === "en" ? `Component pinned to ${slotId}.` : `Componente fijado en la zona ${slotId}.`);
    } else if (compData) {
      assignToSlot(previewScene as SceneId, slotId, compData as ComponentDTO);
      flash(lang === "en" ? `Component added to brand and pinned to ${slotId}.` : `Componente añadido a la marca y fijado en ${slotId}.`);
    }
    setSelectedBlockId(slotId);
    setSelectedSubnode({ blockId: slotId, subnodeType: "root" });
    setRightPanelTab("inspector");
    setRightPanelOpen(true);
  }, [samples, previewScene, assignExistingToSlot, assignToSlot, lang]);

  const handleDropOnSlotRef = useRef(handleDropOnSlot);
  handleDropOnSlotRef.current = handleDropOnSlot;

  const downloadExportFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canonicalDoc = useMemo<Partial<ProjectDocument>>(() => {
    const nodesRecord: Record<string, PageNode> = {};
    const rootIds: string[] = [];

    currentSceneBlocks.forEach((b) => {
      nodesRecord[b.id] = {
        id: b.id,
        parentId: null,
        kind: "component",
        type: b.type,
        label: b.label,
        slotId: b.type,
        childIds: [],
        order: b.order,
        componentId: b.componentId,
        actionBindings: b.actionBindings,
        visibility: b.visibility,
        props: b.props,
      };
      rootIds.push(b.id);
    });

    return {
      projectId: initial.id,
      projectName: name,
      brandId: initial.id,
      revision: versionCount + 1,
      activeRoute: routeForScene(previewScene),
      activeSceneId: previewScene,
      theme: previewTheme,
      pages: {
        [previewScene]: {
          id: `page_${previewScene}`,
          route: routeForScene(previewScene),
          title: SCENE_LABEL[previewScene] || previewScene,
          sceneId: previewScene,
          rootNodeIds: rootIds,
          nodes: nodesRecord,
        },
      },
    };
  }, [initial.id, name, versionCount, previewScene, previewTheme, currentSceneBlocks]);

  const documentHash = useMemo(() => computeDocumentHash(canonicalDoc as unknown as import("@/lib/projectDocument").ProjectDocument), [canonicalDoc]);

  const requestAssignToSlot = useCallback(
    (scene: SceneId, slotDef: SceneSlot, component: { id: string; name: string; category?: string }) => {
      if (runtimeMode === "production") {
        setProdGuardAction("asignar componentes a zonas");
        setProdGuardOpen(true);
        return;
      }

      const currentSlots = (blueprint as { slots?: Record<string, Record<string, string>> })?.slots?.[scene] || {};
      const existingId = currentSlots[slotDef.id];
      const existingSample = existingId ? samples.find((x) => x.id === existingId) : undefined;
      const existingNodes: PageNode[] = existingSample
        ? [{ id: slotDef.id, parentId: null, kind: "component" as const, type: slotDef.id, label: existingSample.name, slotId: slotDef.id, childIds: [], order: 0 }]
        : [];

      // C3: Cardinalidad viene del SlotDefinition, no de una lista hardcodeada de nombres
      const slotDefNorm: SlotDefinition = {
        id: slotDef.id,
        label: slotDef.label,
        expects: slotDef.expects,
        accepts: slotDef.match,
        cardinality: slotDef.cardinality || "zero-or-more",
        maxItems: slotDef.maxItems,
        insertionPolicy: slotDef.insertionPolicy || "append",
        match: slotDef.match,
        query: slotDef.query,
      };

      const conflict = checkSlotInsertionConflict(
        slotDefNorm,
        existingNodes,
        component,
        routeForScene(scene)
      );

      if (conflict.hasConflict) {
        setConflictState({
          isOpen: true,
          title: conflict.title || `Conflicto de asignación en ${slotDef.label}`,
          description: conflict.description || `Ya existe un componente en ${slotDef.label}.`,
          slotLabel: slotDef.label,
          existingLabel: existingSample?.name,
          incomingName: component.name,
          options: conflict.resolutionOptions,
          onResolve: (action) => {
            if (action === "replace") {
              assignExistingToSlot(scene, slotDef.id, component.id);
            } else if (action === "append_additional") {
              const blocks = resolveSceneLayout(
                scene,
                (blueprint as { sceneLayouts?: Record<string, SceneBlockInstance[]> }).sceneLayouts,
                (blueprint as { slots?: Record<string, Record<string, string>> }).slots?.[scene],
                slotFlags,
              );
              const newBlock: Omit<SceneBlockInstance, "order"> = {
                id: `${slotDef.id}_${Date.now().toString(36)}`,
                type: slotDef.id,
                label: slotDef.id === "nav" ? `${component.name} (Barra secundaria)` : `${component.name} (Adicional)`,
                componentId: component.id,
              };
              const next = insertSceneBlock(blocks, newBlock);
              updateSceneLayout(scene, next);
            } else if (action === "adapt_content") {
              assignExistingToSlot(scene, slotDef.id, component.id);
              flash("Componente insertado. Adapta las métricas en el Inspector.");
            }
            setConflictState((prev) => ({ ...prev, isOpen: false }));
          },
        });
        return;
      }

      assignExistingToSlot(scene, slotDef.id, component.id);
    },
    [runtimeMode, blueprint, samples, slotFlags, assignExistingToSlot, updateSceneLayout, flash]
  );

  const getAssemblerInputs = useCallback(() => {
    return {
      scene: previewScene as SceneId,
      brandName: name || "Mi Marca",
      tokens,
      resolvedConfig: visualResolution.resolvedConfig,
      samples,
      slots: getSceneSlots(previewScene as SceneId),
      cssTokens: compiled.css,
      font,
      theme: previewTheme,
      layoutBlocks: currentSceneBlocks,
      portfolioProjects: resolveProjectCollection(blueprint, { runtimeMode, includeDrafts: runtimeMode !== "production" }),
      activeRoutePath,
      runtimeMode,
      revision: versionCount + 1,
      documentHash: "sha256:" + documentHash,
    };
  }, [previewScene, name, tokens, visualResolution.resolvedConfig, samples, compiled.css, font, previewTheme, currentSceneBlocks, blueprint, runtimeMode, activeRoutePath, versionCount, documentHash]);

  const handleCopyMasterPrompt = useCallback(() => {
    const inp = getAssemblerInputs();
    const promptText = generateSceneMasterPrompt(inp);
    navigator.clipboard.writeText(promptText).then(() => {
      setCopiedPrompt(true);
      flash(lang === "en" ? "Master AI Prompt copied! Paste in Claude 3.7 / Cursor." : "¡Prompt Maestro copiado! Pégalo en Claude 3.7, Cursor o Antigravity.");
      setTimeout(() => setCopiedPrompt(false), 3000);
    }).catch(() => {
      flash("Error al copiar al portapapeles.");
    });
  }, [getAssemblerInputs, lang]);

  const currentExport = useMemo(() => {
    const inp = getAssemblerInputs();
    if (pageExportTab === "nextjs") {
      return {
        fileName: `${inp.scene}-page.tsx`,
        code: assembleNextJsPage(inp),
        desc: "Next.js 15 (App Router / page.tsx autocontenido)",
      };
    } else if (pageExportTab === "astro") {
      return {
        fileName: `${inp.scene}.astro`,
        code: assembleAstroPage(inp),
        desc: "Astro (index.astro para static o SSR ultrarrápido)",
      };
    } else if (pageExportTab === "html") {
      return {
        fileName: `${inp.scene}.html`,
        code: assembleHtmlPage(inp),
        desc: "HTML5 puro autosuficiente sin dependencias",
      };
    } else {
      return {
        fileName: `PROMPT_MAESTRO_${inp.scene.toUpperCase()}.md`,
        code: generateSceneMasterPrompt(inp),
        desc: "Prompt Maestro Estructurado con tokens WCAG AAA y código real para IA",
      };
    }
  }, [getAssemblerInputs, pageExportTab]);
  // Siembra AUTO (sugerida) de la escena: rellena solo slots COMPATIBLES y VACÍOS
  // con componentes representativos del catálogo (fuente única: SCENE_SLOTS.query/
  // match — no hay hardcode por preset). Entran a la biblioteca marcados en
  // blueprint.autoSeeded (origen "sugerido", NO fijado); el motor unificado los
  // coloca como `auto`. Editable con lo de siempre: fijar / quitar / reemplazar.
  const seedScene = async (scene: SceneId, cap = 5) => {
    // Usa el helper COMPARTIDO (misma lógica que la importación): slots
    // compatibles y vacíos, componentes sugeridos del catálogo, origen `auto`.
    const { added, autoSeeded } = await seedScenes<ComponentDTO>(
      [scene],
      samples,
      async (q) => {
        const r = await fetch(`/api/components?q=${encodeURIComponent(q)}&limit=1`);
        const j = await r.json();
        return (((j.items ?? [])[0]) as ComponentDTO) ?? null;
      },
      { perScene: cap, total: cap },
    );
    if (!added.length) { flash("Nada que sembrar: esta escena ya está cubierta."); return; }
    pushState(tokens);
    const next: Doc = structuredClone(tokens);
    const root = next as unknown as { blueprint?: { autoSeeded?: string[] } };
    root.blueprint = root.blueprint ?? {};
    root.blueprint.autoSeeded = Array.from(new Set([...(root.blueprint.autoSeeded ?? []), ...autoSeeded]));
    const nextSamples = [...samples, ...added.map(toSample)];
    setSamples(nextSamples);
    setTokens(next);
    setRaw(JSON.stringify(next, null, 2));
    patch({ tokens: next, previewIds: nextSamples.map((s) => s.id) });
    logEvent("scene.seed", { scene, count: autoSeeded.length });
    flash(`Sembrados ${autoSeeded.length} sugeridos (auto) en ${SCENE_LABEL[scene]}. Fíjalos o quítalos a tu gusto.`);
  };
  // "+ Añadir" del catálogo: si hay slot activo, asigna a ese slot; si no, asigna inteligentemente a la escena o a la biblioteca.
  const addFromCatalog = (c: ComponentDTO) => {
    if (runtimeMode === "production") {
      setProdGuardAction("añadir componentes desde el catálogo");
      setProdGuardOpen(true);
      return;
    }

    // Caso 1: Hay un slot activo explícitamente seleccionado
    if (activeSlot) {
      const def = sceneSlotsResolved(activeSlot.scene, slotFlags).find(d => d.id === activeSlot.slot);
      if (def) {
        requestAssignToSlot(activeSlot.scene, def, c);
        return;
      }
      assignToSlot(activeSlot.scene, activeSlot.slot, c);
      flash(`Asignado a “${activeSlot.label ?? activeSlot.slot}”.`);
      setActiveSlot(null);
      return;
    }

    // Caso 2: Asignación contextual inteligente a la escena actual
    const currentDefs = sceneSlotsResolved(previewScene as SceneId, slotFlags);
    const currentSlots = getSceneSlots(previewScene as SceneId);

    // Buscar slots de la escena que acepten esta categoría
    const matchingDefs = currentDefs.filter((slot) => categoryMatchesSlot(slot, c.category));

    // A) Si hay una zona compatible que esté VACÍA, asignarla de inmediato
    const emptyDef = matchingDefs.find((slot) => slotStateOf(slot, currentSlots[slot.id], samples) === "empty");
    if (emptyDef) {
      assignToSlot(previewScene as SceneId, emptyDef.id, c);
      flash(`Asignado automáticamente a “${emptyDef.label}” en ${SCENE_LABEL[previewScene as SceneId]}.`);
      return;
    }

    // B) Si hay una zona compatible en estado AUTO (relleno genérico), fijarla con este componente
    const autoDef = matchingDefs.find((slot) => slotStateOf(slot, currentSlots[slot.id], samples) === "auto");
    if (autoDef) {
      assignToSlot(previewScene as SceneId, autoDef.id, c);
      flash(`Fijado en “${autoDef.label}” en ${SCENE_LABEL[previewScene as SceneId]}.`);
      return;
    }

    // C) Si no encaja en la escena actual o ya están fijados, guardar en la biblioteca común de la marca
    addComponent(c);
    const scenesWithCat = (Object.keys(SCENE_SLOTS) as SceneId[]).filter((sc) =>
      (SCENE_SLOTS[sc] ?? []).some((s) => categoryMatchesSlot(s, c.category))
    );
    if (scenesWithCat.length > 0) {
      flash(`Añadido a Biblioteca de Marca. Compatible con: ${scenesWithCat.map((s) => SCENE_LABEL[s]).slice(0, 3).join(", ")}.`);
    } else {
      flash(`Añadido a Biblioteca de Marca (${c.name}).`);
    }
  };
  
  // Modificado: Búsqueda avanzada con paginación
  const doSearch = async (append = false, overrideQ?: string) => {
    setSearching(true);
    const offset = append ? results.length : 0;
    const fwParam = filterFramework ? `&framework=${encodeURIComponent(filterFramework)}` : "";
    const srcParam = filterSource ? `&source=${encodeURIComponent(filterSource)}` : "";
    const catParam = filterCategory ? `&category=${encodeURIComponent(filterCategory)}` : "";
    const activeQ = overrideQ !== undefined ? overrideQ : q;
    const query = activeQ.trim() 
      ? `q=${encodeURIComponent(activeQ)}&limit=12&offset=${offset}${fwParam}${srcParam}${catParam}` 
      : `limit=12&offset=${offset}${fwParam}${srcParam}${catParam}`;
    const r = await fetch(`/api/components?${query}`);
    const j = await r.json();
    if (append) {
      setResults(prev => [...prev, ...(j.items ?? [])]);
    } else {
      setResults(j.items ?? []);
    }
    setTotalResults(j.total ?? 0);
    setSearching(false);
  };

  // Buscar en el catálogo desde un slot de la escena activa (abre panel derecho).
  const searchInCatalog = (query: string) => {
    setQ(query);
    setRightPanelOpen(true);
    doSearch(false, query);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PRODUCTION_CLICK_GUARD') {
        setProdGuardAction((event.data.action as string) || "seleccionar o inspeccionar componentes");
        setProdGuardOpen(true);
        return;
      }
      if (runtimeMode === "production" && ['BLOCK_SELECT', 'SLOT_SELECT', 'BLOCK_MOVE', 'BLOCK_DUPLICATE', 'BLOCK_REMOVE', 'SLOT_CLEAR', 'FOCUS_BLOCK'].includes(event.data?.type)) {
        setProdGuardAction("modificar o inspeccionar componentes");
        setProdGuardOpen(true);
        return;
      }
      if (event.data?.type === 'SEARCH' && event.data?.query) {
        setActiveSlot(null);
        setQ(event.data.query);
        setRightPanelOpen(true);
        doSearch(false, event.data.query);
      }
      if (event.data?.type === 'SUBNODE_SELECT' && event.data?.blockId) {
        setSelectedBlockId(event.data.blockId as string);
        setSelectedSubnode({
          blockId: event.data.blockId as string,
          subnodeType: event.data.subnodeType as any,
          subnodeKey: event.data.subnodeKey as string,
        });
        setRightPanelTab("inspector");
        setRightPanelOpen(true);
      }
      if (event.data?.type === 'BLOCK_SELECT' && event.data?.blockId) {
        setSelectedBlockId(event.data.blockId as string);
        setSelectedSubnode({
          blockId: event.data.blockId as string,
          subnodeType: "root",
        });
        setRightPanelTab("inspector");
        setRightPanelOpen(true);
      }
      if (event.data?.type === 'SLOT_SELECT' && event.data?.slot) {
        const { scene, slot, query, label, expects } = event.data;
        logEvent("slot.select", { scene, slot });
        setActiveSlot({ scene, slot, label, expects });
        setSelectedBlockId(slot);
        setRightPanelTab("inspector");
        setRightPanelOpen(true);
        if (query) { setQ(query); doSearch(false, query); }
      }
      // Borrar desde el preview: "×" de una zona fijada → libera el slot (mismo clearSlot).
      if (event.data?.type === 'SLOT_CLEAR' && event.data?.slot) {
        clearSlotRef.current(event.data.scene as SceneId, event.data.slot as string);
      }
      if (event.data?.type === 'BLOCK_MOVE') {
        handleMoveBlockRef.current?.(event.data.scene as SceneId, event.data.from as number, event.data.to as number);
      }
      if (event.data?.type === 'BLOCK_DUPLICATE') {
        handleDuplicateBlockRef.current?.(event.data.scene as SceneId, event.data.blockId as string);
      }
      if (event.data?.type === 'BLOCK_REMOVE') {
        handleRemoveBlockRef.current?.(event.data.scene as SceneId, event.data.blockId as string);
      }
      if (event.data?.type === 'BLOCK_PROMPT_LINK') {
        handlePromptLinkRef.current?.(event.data.scene as SceneId, event.data.blockId as string);
      }
      if (event.data?.type === 'NAVIGATE_TO_SCENE') {
        handleNavigateToSceneRef.current?.(event.data.targetScene as string);
      }
      if (event.data?.type === 'PREVIEW_SCROLL' && typeof event.data.scrollY === 'number') {
        lastPreviewScrollRef.current = event.data.scrollY;
      }
      if (event.data?.type === 'PREVIEW_READY') {
        handleIframeLoadRef.current?.();
      }
      if (event.data?.type === 'IFRAME_DROP_COMPONENT') {
        const { targetId, compId, compJson } = event.data;
        let compData = undefined;
        if (compJson) {
          try { compData = JSON.parse(compJson); } catch {}
        }
        const effectiveTarget = targetId || (activeSlot ? activeSlot.slot : (currentSceneBlocks[0]?.id || "hero"));
        if (effectiveTarget && (compId || compData)) {
          handleDropOnSlotRef.current?.(effectiveTarget, compId, compData);
        }
      }
      if (event.data?.type === 'FOCUS_BLOCK') {
        const slotId = (event.data.slot || event.data.blockId) as string;
        if (slotId) {
          setSelectedBlockId(slotId);
          setActiveSlot({
            scene: previewScene as SceneId,
            slot: slotId,
            label: (event.data.label || slotId) as string,
            expects: (event.data.expects || slotId) as string,
          });
          setRightPanelTab("inspector");
          setRightPanelOpen(true);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [previewScene, runtimeMode, activeSlot, currentSceneBlocks]);
  
  // Autocompletado debounced
  useEffect(() => {
    const handler = setTimeout(() => {
      // Evitar búsqueda redundante si ya se cargó inicialmente
      doSearch(false);
    }, 400);
    return () => clearTimeout(handler);
  }, [q]);

  const applyThemeToggle = (targetTheme: "dark" | "light") => {
    if (previewTheme === targetTheme) return;
    setPreviewTheme(targetTheme);
    
    setTokens((prev) => {
      let next = structuredClone(prev);
      const structuralPaths = ["color.bg", "color.surface", "color.text", "color.muted"];
      for (const path of structuralPaths) {
        const v = getResolvedValue(next, path);
        if (v && (v.startsWith('#') || v.startsWith('rgb'))) {
          next = setTokenValue(next, path, invertHex(v)) as Doc;
        }
      }
      if (next.effects?.pattern?.color) {
        next.effects.pattern.color = invertHex(next.effects.pattern.color);
      }
      setRaw(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const save = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    logEvent("draft.save", { previewIds: samples.length, templateId: (blueprint as Blueprint).templateId });
    const res = await fetch(`/api/brands/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, tokens, previewIds: samples.map((s) => s.id) }) });
    if (!res.ok) logEvent("error", { where: "draft.save", status: res.status });
    setSaveStatus(res.ok ? "saved" : "unsaved");
    flash(res.ok ? "Marca guardada y sincronizada." : "Error al guardar.");
  };
  // Restore EN VIVO: re-hidrata TODO el estado del editor desde el snapshot
  // restaurado (tokens+previewIds), sin recarga manual. blueprint, slots,
  // resolvedConfig, preview y paneles derivan de `tokens` -> se refrescan solos.
  // El endpoint /restore ya persistio el draft en BD; aqui solo sincronizamos UI.
  const handleRestored = async (b: RestoredBrand) => {
    const nt = b.tokens as Doc;
    const ids = Array.isArray(b.previewIds) ? b.previewIds : [];
    // Reutiliza samples ya cargados; trae los que falten (nuevos del snapshot).
    const byId = new Map(samples.map((s) => [s.id, s] as const));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) {
      const fetched = await Promise.all(missing.map(async (id) => {
        try {
          const r = await fetch(`/api/components/${encodeURIComponent(id)}`);
          if (!r.ok) return null;
          return toSample((await r.json()) as ComponentDTO);
        } catch { return null; }
      }));
      for (const s of fetched) if (s) byId.set(s.id, s);
    }
    const nextSamples: Sample[] = [];
    for (const id of ids) { const s = byId.get(id); if (s) nextSamples.push(s); }

    pushState(tokens);
    setTokens(nt);
    setName(b.name);
    setRaw(JSON.stringify(nt, null, 2));
    setRawErr(null);
    setSamples(nextSamples);
    setActiveSlot(null); // descarta seleccion de slot del draft anterior

    const bg = getResolvedValue(nt, "color.bg") || "";
    if (/^#[0-9a-f]{6}$/i.test(bg)) {
      const r = parseInt(bg.slice(1, 3), 16), g = parseInt(bg.slice(3, 5), 16), bl = parseInt(bg.slice(5, 7), 16);
      setPreviewTheme(0.2126 * r + 0.7152 * g + 0.0722 * bl > 128 ? "light" : "dark");
    }
    void loadVersionCount();
    flash("Versión restaurada — editor actualizado en vivo.");
  };
  const copy = (text: string, label: string) => {
    try { navigator.clipboard.writeText(text); flash(`Copiado: ${label}`); } catch (e) { flash("Portapapeles bloqueado."); }
  };
  const exportDisk = async (mode: "theme" | "docs" | "full" = "full") => {
    // Persistir el draft VISIBLE antes de exportar: el export lee el estado guardado
    // en BD, y las ediciones de tokens/efectos/preset/plantilla no se persisten hasta
    // guardar. Sin esto, el export podria reflejar un estado anterior al visible.
    await patch({ name, tokens, previewIds: samples.map((s) => s.id) });
    logEvent("export", { mode, previewIds: samples.length, templateId: (blueprint as Blueprint).templateId });
    const res = await fetch(`/api/brands/${initial.id}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
    const j = await res.json();
    if (!res.ok) logEvent("error", { where: "export", status: res.status });
    flash(j.dir ? `Exportado (${mode}) a ${j.dir}` : "Error al exportar.");
  };

  const field = "rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-sm outline-none w-full";

  const resultsByCategory = useMemo(() => {
    const map = new Map<string, ComponentDTO[]>();
    for (const c of results) {
      const cat = c.category || "Otros";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return Array.from(map.entries());
  }, [results]);

  // Definición del slot activo (para priorizar el catálogo por sus categorías).
  const activeSlotDef = useMemo<SceneSlot | null>(() => {
    if (!activeSlot) return null;
    return (SCENE_SLOTS[activeSlot.scene] ?? []).find((s) => s.id === activeSlot.slot) ?? null;
  }, [activeSlot]);
  const catMatchesActiveSlot = (cat: string): boolean =>
    !!activeSlotDef && activeSlotDef.match.some((m) => cat.toLowerCase().includes(m));
  // Con slot activo, las categorías compatibles van primero (priorizar, no ocultar).
  const orderedResults = useMemo(() => {
    if (!activeSlotDef || activeSlotDef.match.length === 0) return resultsByCategory;
    return [...resultsByCategory].sort((a, b) => (catMatchesActiveSlot(b[0]) ? 1 : 0) - (catMatchesActiveSlot(a[0]) ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsByCategory, activeSlotDef]);

  return (
    <div className="h-full flex flex-col w-full">
      {msg && (
        <div className="mb-4 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-center">
          {msg}
        </div>
      )}

      {/* TOOLBAR SUPERIOR CENTRALIZADO */}
      <div className="mb-4 flex w-full items-center justify-center">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-black/20 p-2 shadow-sm backdrop-blur">
          {/* Presets visuales (identidad + comportamiento base). Las PLANTILLAS
              profesionales se eligen SOLO desde la galería inferior. */}
          <CustomSelect
            value=""
            size="md"
            placeholder={tr('Empezar desde preset…')}
            options={PRESETS.map((pr) => ({ label: pr.name, value: pr.id }))}
            onChange={(v) => { if (v) applyBrandPreset(v); }}
            title={lang === 'en' ? 'Fill in visual identity + behavior from a base profile' : 'Rellena identidad visual + comportamiento desde un perfil base'}
            className="w-[200px]"
          />
          <button
            onClick={() => { logEvent("guided.start"); setGuidedOpen(true); }}
            title={lang === 'en' ? 'Guided: pick a base and answer 5 questions' : 'Guiado: elige una base y responde 5 preguntas'}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-bold text-black hover:scale-105 transition-transform whitespace-nowrap"
          >
            {tr('Guiado')}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field + " w-[180px]"} />
          <button
            onClick={save}
            className="rounded-lg bg-[var(--color-panel-2)] px-3.5 py-2 text-xs font-medium hover:bg-white/10 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            {saveStatus === "saving" ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="text-amber-300 font-mono text-[11px]">Guardando…</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-mono text-[11px]">Sincronizado</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                <span className="text-white/80 font-mono text-[11px]">{tr('Guardar')}</span>
              </>
            )}
          </button>

          {/* Deshacer / Rehacer en sesión */}
          <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="rounded-lg bg-[var(--color-panel-2)] p-2 text-xs font-medium text-[var(--color-text)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Deshacer cambio (Ctrl+Z)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="rounded-lg bg-[var(--color-panel-2)] p-2 text-xs font-medium text-[var(--color-text)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Rehacer cambio (Ctrl+Y o Ctrl+Shift+Z)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
              </svg>
            </button>
          </div>

          {/* Cápsula unificada: Cobertura + Versiones */}
          <div className="border-l border-[var(--color-border)] pl-2">
            <StatusPill
              report={visualResolution.validationReport}
              versionCount={versionCount}
              onOpen={() => {
                setCoverageDrawerOpen(true);
              }}
              onOpenVersions={() => {
                setAuditTab("versions");
                setAuditOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6 w-full items-start">
        {/* PANEL IZQUIERDO: CONTROLES (solo en vista Visual) */}
        {tab === "visual" && (leftPanelOpen ? (
        <div className="w-[340px] xl:w-[370px] shrink-0 space-y-4">
          <div className="card-surface rounded-xl p-3.5">
            <div className="mb-3 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 rounded-lg bg-black/40 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setLeftNavTab("pages")}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    leftNavTab === "pages" ? "bg-[var(--color-accent)] text-black shadow" : "text-white/60 hover:text-white"
                  }`}
                >
                  Páginas
                </button>
                <button
                  type="button"
                  onClick={() => setLeftNavTab("layers")}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                    leftNavTab === "layers" ? "bg-[var(--color-accent)] text-black shadow" : "text-white/60 hover:text-white"
                  }`}
                >
                  Capas
                  <span className={`px-1 rounded-full text-[9px] ${leftNavTab === "layers" ? "bg-black/20" : "bg-white/10"}`}>
                    {currentSceneBlocks.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftNavTab("tokens")}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    leftNavTab === "tokens" ? "bg-[var(--color-accent)] text-black shadow" : "text-white/60 hover:text-white"
                  }`}
                >
                  Tokens
                </button>
              </div>
              <button onClick={() => setLeftPanelOpen(false)} className="text-[var(--color-muted)] hover:text-white p-1 rounded hover:bg-white/10 transition-colors shrink-0" title={tr('Ocultar panel')}>
                ◀
              </button>
            </div>

            {/* TAB 1: PÁGINAS (Explorador de Rutas y Vistas del Proyecto) */}
            {leftNavTab === "pages" && (
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {/* Sección 1: Páginas Reales de este Proyecto */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                      <span>Páginas del Proyecto ({projectRoutes.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPagePath("/proyectos/nuevo-proyecto");
                        setNewPageTitle("Nuevo Proyecto");
                        setNewPageSceneId("content");
                        setAddPageModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)] text-[var(--color-accent)] hover:text-black px-2 py-0.5 text-[10px] font-bold uppercase transition-all"
                      title="Crear nueva página o vista de proyecto"
                    >
                      <span>+ Nueva Página</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {projectRoutes.map((route) => {
                      const isActive = activeRoutePath === route.path || (!activeRoutePath && route.path === "/" && (previewScene === "landing" || previewScene === "marca"));
                      const isCustom = customRoutesList.some((r) => r.path === route.path);
                      const isSubRoute = route.path !== "/" && route.path.split("/").filter(Boolean).length > 1;

                      return (
                        <div
                          key={route.path}
                          className={`group relative w-full text-left p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                            isSubRoute ? "ml-3 w-[calc(100%-12px)] border-l-2 border-l-[var(--color-accent)]/40" : ""
                          } ${
                            isActive
                              ? "bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-white shadow-[0_0_15px_rgba(240,164,112,0.15)]"
                              : "bg-black/20 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRoutePath(route.path);
                              setPreviewScene(route.sceneId);
                              const sceneBlocks = (blueprint as any)?.sceneLayouts?.[route.sceneId] || [];
                              const targetBlock = route.path.startsWith("/proyectos/")
                                ? (sceneBlocks.find((b: any) => 
                                    (b.dataBinding?.source === "portfolio-projects" && b.dataBinding?.layout === "detail") ||
                                    Boolean(b.componentId?.includes("detail")) ||
                                    b.type === "hero"
                                  ) || sceneBlocks[1] || sceneBlocks[0])
                                : (sceneBlocks[0] || null);
                              if (targetBlock) {
                                setSelectedBlockId(targetBlock.id);
                                setSelectedSubnode(null);
                                setRightPanelTab("inspector");
                                setRightPanelOpen(true);
                              } else {
                                setSelectedBlockId(null);
                              }
                              logEvent("scene.change", { scene: route.sceneId, path: route.path });
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-[var(--color-accent)] animate-pulse" : "bg-zinc-600"}`} />
                              <span className="font-mono text-xs font-bold text-white truncate">{route.path}</span>
                              {route.path === "/" && (
                                <span className="text-[8px] font-bold uppercase px-1 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">Principal</span>
                              )}
                              {isSubRoute && (
                                <span className="text-[8px] font-mono px-1 rounded bg-white/5 text-zinc-400">Subpágina</span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{route.title}</p>
                          </button>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5 uppercase">
                              {route.sceneId}
                            </span>
                            {isCustom && route.path !== "/" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomRoute(route.path);
                                }}
                                className="text-zinc-500 hover:text-red-400 p-0.5 text-xs transition-colors flex items-center justify-center"
                                title="Eliminar ruta personalizada"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CAPAS (Árbol Jerárquico de Componentes de la Página) */}
            {leftNavTab === "layers" && (
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 px-1">
                  <span className="truncate">Árbol: {activeRoutePath || routeForScene(previewScene)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (runtimeMode === "production") {
                        setProdGuardAction("añadir un nuevo bloque");
                        setProdGuardOpen(true);
                        return;
                      }
                      setAddSectionIndex(currentSceneBlocks.length);
                      setNewSectionType("features");
                      setNewSectionLabel("");
                      setNewSectionLink("");
                      setAddSectionModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
                  >
                    + Bloque
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 px-2 py-1.5 rounded bg-black/40 border border-white/5">
                    <span className="w-2 h-2 rounded bg-violet-400 shrink-0" />
                    <span className="font-bold text-zinc-200">Página ({activeRoutePath || routeForScene(previewScene)})</span>
                  </div>

                  <div className="pl-3 border-l border-white/10 space-y-1 my-1">
                    {currentSceneBlocks.map((block, idx) => {
                      const isSelected = block.id === selectedBlockId;
                      const incompNotice = detectBlockIncompatibilities(previewScene, block);
                      const isDemo = block.isDemoData || incompNotice.isIncompatible;
                      
                      return (
                        <div
                          key={block.id}
                          onClick={() => {
                            setSelectedBlockId(block.id);
                            handleScrollToBlock(block.id);
                            setRightPanelTab("inspector");
                            setRightPanelOpen(true);
                          }}
                          className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border text-xs transition-all ${
                            isSelected
                              ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-white shadow-[0_0_12px_rgba(240,164,112,0.15)] ring-1 ring-[var(--color-accent)]/50"
                              : "bg-black/30 border-white/5 text-zinc-300 hover:bg-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="shrink-0" title={block.type}>
                              <BlockTypeIcon type={block.type} className="w-3.5 h-3.5 shrink-0 text-[var(--color-accent)]" />
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">#{idx + 1}</span>
                            <span className="font-medium truncate" title={block.label}>{block.label}</span>
                            {isDemo && (
                              <span className="shrink-0 text-[8px] font-bold px-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30" title="Contenido demo de muestra">
                                Demo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveBlock(previewScene, idx, idx - 1);
                                }}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                                title="Subir bloque"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="m18 15-6-6-6 6" />
                                </svg>
                              </button>
                            )}
                            {idx < currentSceneBlocks.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveBlock(previewScene, idx, idx + 1);
                                }}
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                                title="Bajar bloque"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateBlock(previewScene, block.id);
                              }}
                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                              title="Duplicar bloque"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect width="14" height="14" x="8" y="8" rx="2" />
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBlock(previewScene, block.id);
                              }}
                              className="p-1 rounded hover:bg-red-500/20 text-red-400 flex items-center justify-center"
                              title="Eliminar bloque"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TOKENS (Tokens semánticos y colores de marca) */}
            {leftNavTab === "tokens" && (
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {SLOTS.map((s) => {
                  const val = getResolvedValue(tokens, s.path) ?? "";
                  return (
                    <div key={s.path} className="flex items-center gap-2">
                      <label className="w-28 shrink-0 text-[11px] text-[var(--color-muted)] truncate" title={tr(s.label)}>{tr(s.label)}</label>
                      {s.kind === "color" ? (
                        <>
                          <input type="color" value={/^#[0-9a-f]{6}$/i.test(val) ? val : "#000000"} onChange={(e) => setSlot(s.path, e.target.value)} className="h-7 w-8 shrink-0 cursor-pointer rounded border border-[var(--color-border)] bg-transparent" />
                          <input value={val} onChange={(e) => setSlot(s.path, e.target.value)} className={field + " text-xs py-1 px-2 font-mono"} />
                        </>
                      ) : s.kind === "font" ? (
                        <CustomSelect 
                          value={val} 
                          onChange={(v) => setSlot(s.path, v)} 
                          options={FONTS.map(f => ({ label: f, value: f }))} 
                          className="w-full text-xs" 
                        />
                      ) : (
                        <input value={val} onChange={(e) => setSlot(s.path, e.target.value)} className={field + " text-xs py-1 px-2 font-mono"} />
                      )}
                    </div>
                  );
                })}

                {/* Tokens adicionales de color creados dinámicamente */}
                {extraColorTokens.map((t) => (
                  <div key={t.path} className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <label className="w-28 shrink-0 text-[11px] text-sky-400 font-mono truncate" title={t.path}>
                      {t.path.replace(/^color\./, "")}
                    </label>
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(t.value) ? t.value : "#000000"}
                      onChange={(e) => setSlot(t.path, e.target.value)}
                      className="h-7 w-8 shrink-0 cursor-pointer rounded border border-[var(--color-border)] bg-transparent"
                    />
                    <input
                      value={t.value}
                      onChange={(e) => setSlot(t.path, e.target.value)}
                      className={field + " text-xs py-1 px-2 font-mono"}
                    />
                  </div>
                ))}

                {/* Formulario compacto para añadir nuevos tokens de color */}
                <div className="pt-2 border-t border-white/5">
                  {!showAddToken ? (
                    <button
                      onClick={() => setShowAddToken(true)}
                      className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 font-mono transition-colors"
                    >
                      <span>+ Añadir token de color</span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1.5 rounded-lg bg-black/30 p-2 border border-white/5">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-white/40">color.</span>
                        <input
                          placeholder="ej: border, glow"
                          value={newCustomTokenPath}
                          onChange={(e) => setNewCustomTokenPath(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                          className={field + " text-[11px] py-0.5 px-1.5 font-mono"}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={newCustomTokenVal}
                          onChange={(e) => setNewCustomTokenVal(e.target.value)}
                          className="h-6 w-7 shrink-0 cursor-pointer rounded border border-[var(--color-border)] bg-transparent"
                        />
                        <input
                          value={newCustomTokenVal}
                          onChange={(e) => setNewCustomTokenVal(e.target.value)}
                          className={field + " text-[11px] py-0.5 px-1.5 font-mono"}
                        />
                        <button
                          onClick={() => {
                            if (!newCustomTokenPath.trim()) return;
                            const p = `color.${newCustomTokenPath.trim()}`;
                            setSlot(p, newCustomTokenVal);
                            setNewCustomTokenPath("");
                            setShowAddToken(false);
                            flash(`Token ${p} añadido.`);
                          }}
                          className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold text-black hover:opacity-90"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setShowAddToken(false)}
                          className="rounded px-1.5 py-0.5 text-[10px] text-white/40 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AUDITOR DE CONTRASTE WCAG 2.1 AAA EN VIVO */}
          <WcagLiveAuditor
            tokens={tokens}
            onApplyFix={handleApplyWcagFix}
            onApplyMultipleFixes={handleApplyMultipleWcagFixes}
            visionFilter={visionFilter}
            onVisionFilterChange={setVisionFilter}
          />

          <div className="card-surface rounded-xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-[var(--color-muted)]">Fondo y efectos</h2>
              <CustomSelect
                value=""
                placeholder="Preset"
                size="sm"
                options={Object.keys(EFFECT_PRESETS).map((p) => ({ label: p, value: p }))}
                onChange={(v) => { if (v) applyPreset(v); }}
                className="ml-auto w-[130px]"
              />
            </div>
            
            <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Base</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] text-[var(--color-muted)]">Tipo
                <CustomSelect 
                  value={fx.background?.type || "solid"} 
                  onChange={(v) => setEffect("background", "type", v)} 
                  options={[
                    {label: "Sólido", value: "solid"},
                    {label: "Lineal", value: "linear"},
                    {label: "Radial", value: "radial"}
                  ]}
                  className="mt-1"
                />
              </label>
              {fx.background.type !== "solid" && (
                <LabeledInput label="Ángulo" value={String(fx.background.angle)} onChange={(v) => setEffect("background", "angle", v)} />
              )}
            </div>

            <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Patrón</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] text-[var(--color-muted)]">Tipo
                <CustomSelect 
                  value={fx.pattern?.type || "none"} 
                  onChange={(v) => setEffect("pattern", "type", v)} 
                  options={[
                    {label: "Sin patrón", value: "none"},
                    {label: "Rejilla", value: "grid"},
                    {label: "Puntos", value: "dots"}
                  ]}
                  className="mt-1"
                />
              </label>
              {fx.pattern.type !== "none" && <LabeledInput label="Tamaño" value={String(fx.pattern.size)} onChange={(v) => setEffect("pattern", "size", v)} />}
            </div>
            
            <FxToggle label="Luz / glow" on={!!fx.glow.enabled} onChange={(v) => setEffect("glow", "enabled", v)} />
            {fx.glow.enabled && (
              <div className="mb-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(String(fx.glow.color)) ? String(fx.glow.color) : "#f0a470"} onChange={(e) => setEffect("glow", "color", e.target.value)} className="h-8 w-9 shrink-0 cursor-pointer rounded border border-[var(--color-border)] bg-transparent" />
                  <input type="range" min={0} max={0.4} step={0.01} value={Number(fx.glow.intensity)} onChange={(e) => setEffect("glow", "intensity", parseFloat(e.target.value))} className="flex-1" />
                </div>
                <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <input type="checkbox" checked={!!fx.glow.animated} onChange={(e) => setEffect("glow", "animated", e.target.checked)} /> Animada
                </label>
              </div>
            )}

            <FxToggle label="Grano" on={!!fx.grain.enabled} onChange={(v) => setEffect("grain", "enabled", v)} />
            {fx.grain.enabled && (
              <div className="mb-2 flex items-center gap-2">
                <input type="range" min={0} max={0.15} step={0.005} value={Number(fx.grain.opacity)} onChange={(e) => setEffect("grain", "opacity", parseFloat(e.target.value))} className="flex-1" />
              </div>
            )}

            <div className="pt-3 border-t border-[var(--color-border)] mt-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Micro-interacciones Nativas</p>
              <FxToggle
                label="Spotlight / Cursor glow"
                on={microInteractions.cursorGlow}
                onChange={(v) => setMicroInteractions((prev) => ({ ...prev, cursorGlow: v }))}
              />
              <FxToggle
                label="Bordes resplandecientes"
                on={microInteractions.glowBorders}
                onChange={(v) => setMicroInteractions((prev) => ({ ...prev, glowBorders: v }))}
              />
              <FxToggle
                label="Entrada escalonada (stagger)"
                on={microInteractions.staggerReveal}
                onChange={(v) => setMicroInteractions((prev) => ({ ...prev, staggerReveal: v }))}
              />
            </div>
          </div>

          <div className="card-surface rounded-xl p-4">
            <h2 className="mb-3 text-sm font-medium text-[var(--color-muted)]">Exportar</h2>

            {/* Ensamblador de Páginas 1-Click */}
            <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-br from-[var(--color-accent)]/15 via-white/[0.02] to-transparent border border-[var(--color-accent)]/30 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--color-accent)]">
                  Ensamblador 1-Click
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-mono font-semibold">
                  Next.js · Astro · HTML
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug">
                Exporta la escena activa (<span className="text-white font-semibold">{SCENE_LABEL[previewScene]}</span>) con sus componentes, tokens y micro-interacciones a una página completa autoválida.
              </p>
              <button
                type="button"
                onClick={() => setPageExportModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--color-accent)] hover:brightness-110 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span>Ensamblador de Páginas (1-Click)</span>
              </button>
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]/70">Copiar tema</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => copy(compiled.css, "CSS")} aria-label="Copiar CSS variables" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">CSS variables<Tip>Copia las variables CSS (:root) al portapapeles.</Tip></button>
              <button onClick={() => copy(compiled.tailwind, "Tailwind")} aria-label="Copiar Tailwind @theme" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Tailwind @theme<Tip>Copia el bloque @theme de Tailwind.</Tip></button>
              <button onClick={() => copy(compiled.androidColors, "Android")} aria-label="Copiar Android XML" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Android<Tip>Copia los colores Android (XML).</Tip></button>
              <button onClick={() => copy(compiled.swiftUI, "SwiftUI")} aria-label="Copiar SwiftUI Tokens" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">SwiftUI<Tip>Copia tokens nativos para iOS/macOS (Color, Font, CGFloat).</Tip></button>
              <button onClick={() => copy(compiled.jetpackCompose, "Compose")} aria-label="Copiar Jetpack Compose" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Compose<Tip>Copia el objeto Kotlin BrandTokens para Jetpack Compose.</Tip></button>
              <button onClick={() => copy(JSON.stringify(tokens, null, 2), "DTCG")} aria-label="Copiar DTCG JSON" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">DTCG JSON<Tip>Copia los tokens en formato DTCG (JSON).</Tip></button>
            </div>
            <p className="mt-3 mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]/70">Exportar a disco</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => exportDisk("theme")} aria-label="Exportar tema a disco" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Tema<Tip>Exporta a disco solo los tokens: CSS, Tailwind @theme, Android XML y DTCG.</Tip></button>
              <button onClick={() => exportDisk("docs")} aria-label="Exportar documentación a disco" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Documentación<Tip>Exporta docs legibles: README, BRAND, BLUEPRINT, DECISIONS, AGENTS y auditoría.</Tip></button>
              <button onClick={() => exportDisk("full")} aria-label="Exportar pack completo a disco" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Pack completo (IA)<Tip>Contrato completo para IA/build: tokens + resolved + escenas/slots + componentes + estructura + docs. Para trazabilidad estable, exporta una versión publicada desde Estado → Versiones.</Tip></button>
              <button onClick={() => setPageExportModalOpen(true)} aria-label="Ensamblar página 1-click" className="group relative rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold text-black hover:brightness-110">Página (.tsx / .astro)<Tip>Abre el Ensamblador 1-Click para descargar la escena completa en código listo para producción.</Tip></button>
            </div>
          </div>
        </div>
        ) : (
          <div 
            onClick={() => setLeftPanelOpen(true)}
            className="w-12 shrink-0 bg-black/20 rounded-xl border border-[var(--color-border)] flex items-center justify-center cursor-pointer hover:bg-white/5 hover:border-[var(--color-accent)] transition-all h-[calc(100vh-120px)] sticky top-4"
            title="Mostrar Ajustes"
          >
            <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-muted)] hover:text-white transition-colors">
              Ajustes
            </span>
          </div>
        ))}

        {/* COLUMNA CENTRAL */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Pestañas de "Tu Marca": Visual + comportamiento por áreas. */}
          <div className="flex justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] bg-black/20 p-1">
              {([["visual", "Visual"], ["interaccion", "Interacción"], ["estructura", "Estructura"], ["datos", "Datos"], ["seguridad", "Seguridad"], ["sugerencias", "Sugerencias"]] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={"rounded-md px-4 py-2 text-sm font-medium transition-colors " + (tab === id ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-muted)] hover:text-white")}>{tr(label)}</button>
              ))}
            </div>
          </div>

          {tab !== "visual" && (
            <>
              {(tab === "estructura" || tab === "seguridad") && (
                <TemplatesGallery scope={tab} activeTemplateId={(blueprint as Blueprint).templateId} onApply={applyBrandTemplate} lang={lang} />
              )}
              {tab === "estructura" && (
                <DerivedViews views={(blueprint as Blueprint).views ?? []} lang={lang} />
              )}
              {(tab === "datos" || tab === "interaccion") && (
                <DerivedSignals views={(blueprint as Blueprint).views ?? []} dimension={tab === "datos" ? "data" : "interaction"} lang={lang} />
              )}
              {(tab === "estructura" || tab === "datos" || tab === "interaccion") && (((blueprint as Blueprint).views?.length ?? 0) > 0) && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-black/10 px-3 py-2">
                  <span className="text-[11px] text-[var(--color-muted)]">
                    {lang === "en"
                      ? "Populate the empty controls below from the detected analysis. Won't overwrite anything you've already set."
                      : "Rellena los controles vacíos de abajo desde el análisis detectado. No machaca lo que ya hayas tocado."}
                  </span>
                  <button type="button" onClick={applyAnalysisToEditor} className="shrink-0 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:opacity-90">
                    {tr("Aplicar análisis al editor")}
                  </button>
                </div>
              )}
              <BrandBehavior tab={tab} bp={blueprint} setField={setBpField} toggleArray={toggleBpArray} addIdea={addIdea} removeIdea={removeIdea} applyToRules={applyRuleLine} originOf={originOf} />
            </>
          )}

          {tab === "visual" && (<>
          {(() => {
            const _views = (blueprint as Blueprint).views ?? [];
            return _views.length ? (
              <>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{lang === "en" ? "Views" : "Vistas"}</span>
                {_views.map((v) => (
                  <button key={v.id} type="button"
                    onClick={() => { setPreviewViewId(v.id); setPreviewScene(v.previewArchetype); logEvent("scene.change", { scene: v.previewArchetype }); }}
                    title={`${v.route} -> ${SCENE_LABEL[v.previewArchetype]}`}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${previewViewId === v.id ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-panel-2)] text-[var(--color-muted)] hover:text-white"}`}>
                    {v.title || v.route}
                  </button>
                ))}
                <span className="text-[10px] text-[var(--color-muted)]/70">{lang === "en" ? "preview uses each view's archetype" : "el preview usa el arquetipo de cada vista"}</span>
              </div>
              {(() => {
                const _av = _views.find((x) => x.id === previewViewId);
                return _av?.sections?.length ? (
                  <div className="mb-3 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{lang === "en" ? "Sections" : "Secciones"}</span>
                    {_av.sections.map((sec) => (
                      <span key={sec.id} title={`${sec.kind}${sec.source ? " · " + sec.source : ""}`} className={`rounded px-1.5 py-0.5 text-[10px] border ${sec.confidence === "strong" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-[var(--color-muted)]"}`}>{sec.kind}</span>
                    ))}
                  </div>
                ) : null;
              })()}
              {(() => {
                const _dv = _views.find((x) => x.id === previewViewId);
                return _dv?.data?.length ? (
                  <div className="mb-3 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{lang === "en" ? "Data" : "Datos"}</span>
                    {_dv.data.map((d) => (
                      <span key={d.kind} title={`${d.kind}${d.source ? " · " + d.source : ""}`} className={`rounded px-1.5 py-0.5 text-[10px] border ${d.confidence === "strong" ? "border-sky-400/30 bg-sky-400/10 text-sky-300" : "border-white/10 bg-white/5 text-[var(--color-muted)]"}`}>{d.kind}</span>
                    ))}
                  </div>
                ) : null;
              })()}
              {(() => {
                const _iv = _views.find((x) => x.id === previewViewId);
                return _iv?.interaction?.length ? (
                  <div className="mb-3 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{lang === "en" ? "Interaction" : "Interacción"}</span>
                    {_iv.interaction.map((it) => (
                      <span key={it.kind} title={`${it.kind}${it.source ? " · " + it.source : ""}`} className={`rounded px-1.5 py-0.5 text-[10px] border ${it.confidence === "strong" ? "border-violet-400/30 bg-violet-400/10 text-violet-300" : "border-white/10 bg-white/5 text-[var(--color-muted)]"}`}>{it.kind}</span>
                    ))}
                  </div>
                ) : null;
              })()}
              </>
            ) : null;
          })()}
          <div className="card-surface overflow-hidden rounded-xl">
              {/* FILA 1: Modos del Runtime + Viewports de Precisión + Acciones */}
              <div className="flex items-center justify-between p-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector de Modos Explícitos del Runtime */}
                  <div className="flex items-center gap-1 rounded-lg bg-black/50 p-1 border border-white/10 shadow-inner">
                    {(["design", "interaction", "data", "a11y", "production"] as const).map((m) => {
                      const labels: Record<RuntimeMode, { title: string; hint: string }> = {
                        design: { title: "Diseño", hint: "Edita bloques, selecciona nodos y ajusta layout" },
                        interaction: { title: "Interacción", hint: "Runtime activo: prueba navegación, modales y enlaces" },
                        data: { title: "Datos", hint: "Simula estados vacío, cargando, error y diferentes registros" },
                        a11y: { title: "Accesibilidad", hint: "Auditoría visual WCAG: headings, contrastes y roles" },
                        production: { title: "Producción", hint: "Fidelidad 100% limpia sin outlines ni barras" },
                      };
                      const isActive = runtimeMode === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setRuntimeMode(m);
                            if (m === "production") setSelectedBlockId(null);
                          }}
                          title={labels[m].hint}
                          className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                            isActive
                              ? "bg-[var(--color-accent)] text-black shadow-md"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {m === "interaction" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {m === "a11y" && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                          <span>{labels[m].title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector de Viewports de Precisión Responsiva */}
                  <div className="flex items-center gap-1 rounded-lg bg-black/50 p-1 border border-white/10">
                    {(["fluid", "desktop", "laptop", "tablet", "mobile", "mobile_s"] as const).map((vp) => {
                      const spec = PRECISION_VIEWPORTS[vp];
                      const isActive = precisionViewport === vp;
                      return (
                        <button
                          key={vp}
                          type="button"
                          onClick={() => setPrecisionViewport(vp)}
                          title={`${spec.label} ${spec.width ? `(${spec.width} × ${spec.height}px)` : "(100% Fluido)"}`}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                            isActive
                              ? "bg-white/20 text-white shadow border border-white/20"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {spec.label.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Toggle Tema Claro / Oscuro */}
                  <div className="flex items-center gap-1 rounded-lg bg-black/50 p-1 border border-white/10">
                    <button onClick={() => applyThemeToggle("light")} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${previewTheme === "light" ? "bg-[var(--color-accent)] text-black font-extrabold" : "text-zinc-400 hover:text-white"}`}>{tr('Claro')}</button>
                    <button onClick={() => applyThemeToggle("dark")} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${previewTheme === "dark" ? "bg-[var(--color-accent)] text-black font-extrabold" : "text-zinc-400 hover:text-white"}`}>{tr('Oscuro')}</button>
                  </div>

                  <button
                    type="button"
                    onClick={() => seedScene(previewScene as SceneId)}
                    title={lang === 'en' ? 'Fill compatible empty zones with suggested components (auto).' : 'Rellena zonas vacías compatibles con componentes sugeridos (auto).'}
                    className="rounded bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {tr('Sembrar')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMasterPrompt}
                    title="Copia el Prompt Maestro completo con tokens WCAG AAA y topología para Antigravity / Claude 3.7"
                    className="flex items-center rounded bg-violet-600/20 border border-violet-500/40 px-2.5 py-1 text-[10px] uppercase font-bold text-violet-300 hover:bg-violet-600/40 hover:text-white transition-all shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                  >
                    {copiedPrompt ? "Copiado" : "Prompt IA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageExportModalOpen(true)}
                    title="Ensambla y exporta la escena completa a Next.js (page.tsx), Astro (index.astro) o HTML"
                    className="flex items-center gap-1.5 rounded bg-[var(--color-accent)] px-2.5 py-1 text-[10px] uppercase font-bold text-black hover:brightness-110 transition-all shadow-[0_0_12px_rgba(240,164,112,0.3)]"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <span>Ensamblador</span>
                  </button>
                </div>
              </div>

              {/* FILA 2: Franja Contextual según el modo del runtime activo */}
              {runtimeMode === "interaction" && (
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-emerald-500/10 border-t border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 font-semibold text-[11px]">
                      Modo Interacción Activo: Los enlaces navegan entre rutas reales y los disparadores se ejecutan de forma reproducible.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      lastPreviewScrollRef.current = 0;
                      handleIframeLoad();
                      flash("Estado del preview restablecido al origen.");
                    }}
                    className="px-2.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase transition-all"
                  >
                    Restablecer preview
                  </button>
                </div>
              )}

              {runtimeMode === "data" && (
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-sky-500/10 border-t border-sky-500/20 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400 text-[10px] font-bold uppercase">Fuente:</span>
                      <select
                        value={dataState.source}
                        onChange={(e) => setDataState((prev) => ({ ...prev, source: e.target.value }))}
                        className="bg-black/60 border border-sky-500/30 text-sky-200 text-[11px] rounded px-2 py-0.5 font-mono outline-none"
                      >
                        <option value="mock/projects">mock/projects</option>
                        <option value="mock/users">mock/users</option>
                        <option value="mock/analytics">mock/analytics</option>
                        <option value="mock/orders">mock/orders</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-[10px] font-bold uppercase">Estado:</span>
                      {(["success", "loading", "empty", "error", "forbidden"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setDataState((prev) => ({ ...prev, mode: st }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                            dataState.mode === st
                              ? "bg-sky-500 text-black shadow"
                              : "bg-black/40 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {st === "success" ? "Éxito" : st === "loading" ? "Cargando" : st === "empty" ? "Vacío" : st === "error" ? "Error" : "403"}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-[10px] font-bold uppercase">Registros:</span>
                      {[0, 1, 6, 12, 100].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDataState((prev) => ({ ...prev, count: n, mode: n === 0 ? "empty" : "success" }))}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                            dataState.count === n
                              ? "bg-sky-500/30 text-sky-300 border border-sky-400/40"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(runtimeMode === "design" || runtimeMode === "a11y") && (
                <div className="flex items-center justify-between px-3 py-1 bg-black/60 border-t border-white/5 text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono min-w-0">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Jerarquía:</span>
                    <span className="text-zinc-300 font-bold">Página ({activeRoutePath || routeForScene(previewScene)})</span>
                    {selectedBlock ? (
                      <>
                        <span className="text-zinc-600">›</span>
                        <span className="text-[var(--color-accent)] font-bold truncate max-w-[200px]">{selectedBlock.label}</span>
                        <span className="text-zinc-500 text-[10px]">({selectedBlock.type})</span>
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-600">›</span>
                        <span className="text-zinc-500 italic text-[10px]">Haz clic en cualquier bloque para seleccionar e inspeccionar</span>
                      </>
                    )}
                  </div>
                  {selectedBlock && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRightPanelTab("inspector");
                          setRightPanelOpen(true);
                        }}
                        className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
                      >
                        Abrir Inspector ↗
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBlockId(null)}
                        className="text-[10px] text-zinc-500 hover:text-white"
                      >
                        Deseleccionar
                      </button>
                    </div>
                  )}
                </div>
              )}

            {/* Simulación visual de daltonismo si está activa */}
            {visionFilter !== "normal" && (
              <div className="flex items-center justify-between bg-sky-500/15 border-b border-sky-500/30 px-3 py-1.5 text-xs text-sky-200">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
                  <span className="font-semibold">
                    Simulación activa: <span className="font-mono capitalize text-white">{visionFilter}</span>
                  </span>
                  <span className="text-white/60 text-[11px] hidden sm:inline">— Visualizando el producto tal como lo percibe un usuario con esta condición</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVisionFilter("normal")}
                  className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/40 text-[10px] font-bold text-white transition-colors"
                >
                  Restablecer a Normal
                </button>
              </div>
            )}

            {/* Filtros SVG para simulación real de deficiencias visuales (daltonismo) */}
            <svg className="sr-only" aria-hidden="true" width="0" height="0">
              <defs>
                <filter id="wcag-protanopia">
                  <feColorMatrix type="matrix" values="0.56667 0.43333 0 0 0  0.55833 0.44167 0 0 0  0 0.24167 0.75833 0 0  0 0 0 1 0" />
                </filter>
                <filter id="wcag-deuteranopia">
                  <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" />
                </filter>
                <filter id="wcag-tritanopia">
                  <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.43333 0.56667 0 0  0 0.475 0.525 0 0  0 0 0 1 0" />
                </filter>
                <filter id="wcag-achromatopsia">
                  <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
                </filter>
              </defs>
            </svg>

            {/* LIENZO RESPONSIVO CON MEDIDAS DE PRECISIÓN Y ZONA DROP INTERACTIVA */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingAny(false);
                setDragOverCanvasSlot(null);
                const compId = e.dataTransfer.getData("text/plain");
                const compJson = e.dataTransfer.getData("application/json");
                let compData: ComponentDTO | Sample | undefined;
                if (compJson) {
                  try { compData = JSON.parse(compJson); } catch {}
                }
                const target = dragOverCanvasSlot && dragOverCanvasSlot !== "__new_section__" ? dragOverCanvasSlot : (activeSlot?.slot || currentSceneBlocks[0]?.id || "hero");
                if (compId || compData) {
                  handleDropOnSlot(target, compId, compData);
                }
              }}
              className={`relative mx-auto transition-all duration-300 ${
              precisionViewport === "mobile_s" ? "w-[360px] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-[var(--color-border)] my-4 overflow-hidden bg-black/40 ring-1 ring-white/10" : 
              precisionViewport === "mobile" ? "w-[390px] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-[var(--color-border)] my-4 overflow-hidden bg-black/40 ring-1 ring-white/10" : 
              precisionViewport === "tablet" ? "w-[768px] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-[var(--color-border)] my-4 overflow-hidden bg-black/40 ring-1 ring-white/10" : 
              precisionViewport === "laptop" ? "w-[1280px] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-[var(--color-border)] my-4 overflow-hidden bg-black/40 ring-1 ring-white/10" :
              precisionViewport === "desktop" ? "w-full max-w-[1440px]" :
              "w-full max-w-none"
            }`}>
              {/* Overlay de zonas de soltado interactivo cuando se arrastra cualquier componente */}
              {isDraggingAny && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  className="absolute inset-0 z-30 bg-black/80 backdrop-blur-[2px] p-6 flex flex-col gap-3 overflow-y-auto animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-white/20 pb-2.5 text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                        {lang === "en" ? "Drop on any section to assign" : "Suelta sobre la sección donde quieras colocarlo"}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {SCENE_LABEL[previewScene as SceneId]} · {currentSceneBlocks.length} {lang === "en" ? "zones" : "zonas"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 items-start">
                    {currentSceneBlocks.map((b, i) => {
                      const isHovered = dragOverCanvasSlot === b.id;
                      return (
                        <div
                          key={b.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = "copy";
                            if (dragOverCanvasSlot !== b.id) setDragOverCanvasSlot(b.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverCanvasSlot === b.id) setDragOverCanvasSlot(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingAny(false);
                            setDragOverCanvasSlot(null);
                            const compId = e.dataTransfer.getData("text/plain");
                            const compJson = e.dataTransfer.getData("application/json");
                            let compData: ComponentDTO | Sample | undefined;
                            if (compJson) {
                              try { compData = JSON.parse(compJson); } catch {}
                            }
                            if (compId || compData) {
                              handleDropOnSlot(b.id, compId, compData);
                            }
                          }}
                          className={`rounded-xl border p-4 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-150 min-h-[95px] ${
                            isHovered
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/25 scale-[1.02] shadow-[0_0_25px_rgba(240,164,112,0.4)] ring-2 ring-[var(--color-accent)] text-white"
                              : "border-dashed border-white/30 bg-black/50 hover:border-white/60 text-zinc-300"
                          }`}
                        >
                          <span className="text-[10px] font-mono text-zinc-400 uppercase">#{i + 1} · {b.type}</span>
                          <span className="text-xs font-bold text-white mt-0.5">{b.label}</span>
                          <span className="text-[10px] text-[var(--color-accent)] mt-1 font-semibold">
                            {isHovered ? (lang === "en" ? "✓ Drop here to assign" : "✓ Soltar aquí para asignar") : (lang === "en" ? "Drop here" : "Soltar aquí")}
                          </span>
                        </div>
                      );
                    })}

                    {/* Zona para añadir como nueva sección al final */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "copy";
                        if (dragOverCanvasSlot !== "__new_section__") setDragOverCanvasSlot("__new_section__");
                      }}
                      onDragLeave={() => {
                        if (dragOverCanvasSlot === "__new_section__") setDragOverCanvasSlot(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingAny(false);
                        setDragOverCanvasSlot(null);
                        const compId = e.dataTransfer.getData("text/plain");
                        const compJson = e.dataTransfer.getData("application/json");
                        let compData: ComponentDTO | Sample | undefined;
                        if (compJson) {
                          try { compData = JSON.parse(compJson); } catch {}
                        }
                        const label = (compData as ComponentDTO)?.name || "Nueva Sección";
                        const type = (compData as ComponentDTO)?.category?.toLowerCase() || "custom";
                        handleInsertNewSection(previewScene as SceneId, type, label);
                        if (compId || compData) {
                          setTimeout(() => {
                            const lastBlock = currentSceneBlocks[currentSceneBlocks.length - 1];
                            if (lastBlock) handleDropOnSlot(lastBlock.id, compId, compData);
                          }, 100);
                        }
                      }}
                      className={`rounded-xl border p-4 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-150 min-h-[95px] col-span-full ${
                        dragOverCanvasSlot === "__new_section__"
                          ? "border-emerald-400 bg-emerald-400/25 scale-[1.02] shadow-[0_0_25px_rgba(52,211,153,0.4)] ring-2 ring-emerald-400 text-white"
                          : "border-dashed border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400/60 text-emerald-300"
                      }`}
                    >
                      <span className="text-xs font-bold text-emerald-300">+ {lang === "en" ? "Add as a new section at bottom" : "Añadir como nueva sección al final"}</span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">{lang === "en" ? "Drop to create and insert new section" : "Suelta para crear e insertar una sección nueva"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-3 py-1.5 bg-black/70 border-b border-[var(--color-border)] text-[10px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {precisionViewport === "fluid"
                      ? "Fluido · 100% Ancho Total Adaptable (Responsive)"
                      : `${PRECISION_VIEWPORTS[precisionViewport].label} · ${PRECISION_VIEWPORTS[precisionViewport].width} × ${PRECISION_VIEWPORTS[precisionViewport].height} px (${PRECISION_VIEWPORTS[precisionViewport].breakpoint})`}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono text-[10px] bg-black/60 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-zinc-300 font-bold">r{versionCount + 1}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-400 font-mono" title={`DocumentHash: sha256:${documentHash}`}>
                      {documentHash.slice(0, 7)}
                    </span>
                    <span className="text-emerald-400 text-[9px] font-bold">Exportación compatible ✓</span>
                  </span>
                  <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider">
                    {runtimeMode === "production" ? "Modo Producción" : "Runtime de Verificación"}
                  </span>
                </div>
              </div>

              {/* Un solo motor de preview para TODAS las escenas (incl. Marca). */}
              <iframe
                ref={previewIframeRef}
                title={`scene-${previewScene}`}
                loading="lazy"
                srcDoc={previewSrcDoc}
                onLoad={handleIframeLoad}
                sandbox="allow-scripts"
                style={visionFilter !== "normal" ? { filter: `url(#wcag-${visionFilter})` } : undefined}
                className="h-[80vh] min-h-[700px] w-full border-0 bg-[var(--color-bg)] transition-colors duration-300 rounded-b-xl"
              />
            </div>
          </div>

          {/* Hint: qué decisiones resueltas están dando forma a esta escena. */}
          {previewScene !== "marca" && (() => {
            const rf = sceneResolvedFlags(visualResolution.resolvedConfig);
            return (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-[var(--color-muted)]">
                <span className="font-semibold uppercase tracking-wider">{tr('Adaptado por')}:</span>
                <span>nav=<b className="text-[var(--color-text)]">{String(visualResolution.resolvedConfig.interaction.navigationPattern ?? "—")}</b></span>
                {rf.hasSearch && <span>{rf.isPalette ? "⌘K" : tr('búsqueda')}</span>}
                {rf.hasFilters && <span>{tr('filtros')}</span>}
                {rf.hasPagination && <span>{tr('paginación')}</span>}
                {rf.cardsData && <span>cards</span>}
                {rf.multiStep && <span>wizard</span>}
                <span>motion={rf.motion}</span>
                {previewScene === "auth" && <span>auth={rf.authCount}</span>}
              </div>
            );
          })()}

          {/* Debajo del preview: franja compacta de slots activos de la escena */}
          {runtimeMode !== "production" && (
            <SceneSlotsStrip
              scene={previewScene as SceneId}
              samples={samples}
              slots={getSceneSlots(previewScene as SceneId)}
              allSlots={(blueprint as { slots?: Partial<Record<SceneId, Record<string, string>>> }).slots ?? {}}
              hiddenSlots={hiddenSlotsFor(previewScene as SceneId, visualResolution.resolvedConfig)}
              flags={slotFlags}
              css={compiled.css}
              font={font}
              lang={lang}
              activeSlot={activeSlot && activeSlot.scene === previewScene ? activeSlot.slot : null}
              onRemove={removeComponent}
              onClear={(slotId: string) => clearSlot(previewScene as SceneId, slotId)}
              onPick={(slot: SceneSlot) => { setActiveSlot({ scene: previewScene as SceneId, slot: slot.id, label: slot.label, expects: slot.expects }); setRightPanelTab("catalog"); setRightPanelOpen(true); searchInCatalog(slot.query); }}
              onAssignExisting={(slotId: string, componentId: string) => assignExistingToSlot(previewScene as SceneId, slotId, componentId)}
              isDraggingAny={isDraggingAny}
              onAssignDrop={handleDropOnSlot}
              layoutBlocks={currentSceneBlocks}
              onMoveBlock={(from, to) => handleMoveBlock(previewScene as SceneId, from, to)}
              onDuplicateBlock={(blockId) => handleDuplicateBlock(previewScene as SceneId, blockId)}
              onRemoveBlock={(blockId) => handleRemoveBlock(previewScene as SceneId, blockId)}
              onSelectBlock={handleScrollToBlock}
              onOpenLinkModal={(blockId) => {
                const blk = currentSceneBlocks.find((b) => b.id === blockId);
                setLinkModalBlockId(blockId);
                setLinkTargetScene(blk?.linkToScene || "");
              }}
              onOpenAddSectionModal={(atIndex) => {
                setAddSectionIndex(atIndex);
                setNewSectionType("features");
                setNewSectionLabel("");
                setNewSectionLink("");
                setAddSectionModalOpen(true);
              }}
            />
          )}
          </>)}
        </div>

        {/* PANEL DERECHO: CATÁLOGO + MI MARCA (solo en vista Visual) */}
        {tab === "visual" && runtimeMode !== "production" && (rightPanelOpen ? (
        <div className="w-[380px] lg:w-[440px] xl:w-[480px] shrink-0 h-[calc(100vh-120px)] sticky top-4">
          <div className="card-surface rounded-xl p-4 flex flex-col h-full">
            {/* Cabecera del panel */}
            <div className="mb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 rounded-lg bg-black/30 p-1">
                {selectedBlock && (
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("inspector")}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 ${
                      rightPanelTab === "inspector" ? "bg-[var(--color-accent)] text-black font-extrabold" : "text-[var(--color-muted)] hover:text-white"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    Inspector
                  </button>
                )}
                <button
                  onClick={() => setRightPanelTab("catalog")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    rightPanelTab === "catalog" ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-muted)] hover:text-white"
                  }`}
                >
                  {tr('Catálogo')}
                </button>
                <button
                  onClick={() => setRightPanelTab("library")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
                    rightPanelTab === "library" ? "bg-[var(--color-accent)] text-black" : "text-[var(--color-muted)] hover:text-white"
                  }`}
                >
                  Mi Marca
                  {samples.length > 0 && <span className={`rounded-full px-1 py-0 text-[9px] font-bold ${rightPanelTab === "library" ? "bg-black/20" : "bg-white/10"}`}>{samples.length}</span>}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSnippetModalOpen(true)}
                  className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300 hover:bg-emerald-500/30 hover:text-white transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                  title="Importar o pegar un componente o snippet personalizado en la base de datos local"
                >
                  <span>+</span>
                  <span>Snippet</span>
                </button>
                <button onClick={() => setRightPanelOpen(false)} className="text-[var(--color-muted)] hover:text-white p-1 rounded hover:bg-white/10 transition-colors" title={tr('Ocultar panel')}>
                  ▶
                </button>
              </div>
            </div>

            {/* Slot activo (contexto de asignación) */}
            {activeSlot && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-2 shrink-0">
                <span className="text-[11px] leading-tight text-[var(--color-text)]">
                  {tr('Añadiendo a')} <b>{activeSlot.label ?? activeSlot.slot}</b>
                  {activeSlot.expects && <span className="text-[var(--color-muted)]"> · {activeSlot.expects}</span>}
                </span>
                <button onClick={() => setActiveSlot(null)} className="ml-auto rounded-md bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:text-white" title={tr('Cancelar')}>✕</button>
              </div>
            )}

            {/* TAB: INSPECTOR DE NODO */}
            {rightPanelTab === "inspector" && selectedBlock && (
              <div className="flex-1 overflow-y-auto pr-1">
                <BlockInspector
                  block={selectedBlock}
                  scene={previewScene as SceneId}
                  selectedSubnode={selectedSubnode}
                  onSelectSubnode={setSelectedSubnode}
                  allBlocks={currentSceneBlocks}
                  customRoutes={customRoutesList}
                  activeRoutePath={activeRoutePath}
                  portfolioProjects={resolveProjectCollection(blueprint, { includeDrafts: true })}
                  portfolioProjectsCount={resolveProjectCollection(blueprint, { includeDrafts: true }).length}
                  onUpdateProject={handleUpdateProject}
                  onNavigateRoute={(newPath) => {
                    setActiveRoutePath(newPath);
                    const matched = projectRoutes.find((r) => r.path === newPath);
                    if (matched) {
                      setPreviewScene(matched.sceneId);
                    }
                  }}
                  lang={lang}
                  onUpdateBlock={handleUpdateBlock}
                  onClose={() => {
                    setSelectedBlockId(null);
                    setSelectedSubnode(null);
                    setRightPanelTab("catalog");
                  }}
                  onPickCatalog={(type) => {
                    setActiveSlot({
                      scene: previewScene as SceneId,
                      slot: selectedBlock.id,
                      label: selectedBlock.label,
                      expects: selectedBlock.type,
                    });
                    setRightPanelTab("catalog");
                    setQ(type || "");
                    doSearch(false, type || "");
                  }}
                  onMoveUp={
                    currentSceneBlocks.findIndex((b) => b.id === selectedBlock.id) > 0
                      ? () => {
                          const idx = currentSceneBlocks.findIndex((b) => b.id === selectedBlock.id);
                          handleMoveBlock(previewScene as SceneId, idx, idx - 1);
                        }
                      : undefined
                  }
                  onMoveDown={
                    currentSceneBlocks.findIndex((b) => b.id === selectedBlock.id) < currentSceneBlocks.length - 1
                      ? () => {
                          const idx = currentSceneBlocks.findIndex((b) => b.id === selectedBlock.id);
                          handleMoveBlock(previewScene as SceneId, idx, idx + 1);
                        }
                      : undefined
                  }
                  onDuplicate={() => handleDuplicateBlock(previewScene as SceneId, selectedBlock.id)}
                  onDelete={() => handleRemoveBlock(previewScene as SceneId, selectedBlock.id)}
                  isFirst={currentSceneBlocks.findIndex((b) => b.id === selectedBlock.id) === 0}
                  isLast={currentSceneBlocks.findIndex((b) => b.id === selectedBlock.id) === currentSceneBlocks.length - 1}
                />
              </div>
            )}

            {/* TAB: CATÁLOGO */}
            {rightPanelTab === "catalog" && (
              <>
                <div className="mb-3 flex gap-2 shrink-0">
                  <div className="relative flex-1">
                    <input
                      value={q}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && doSearch(false)}
                      placeholder={tr('Buscar...')}
                      className="w-full rounded-lg bg-[var(--color-panel-2)] px-3 py-2 pr-16 text-sm outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-colors"
                    />
                    <div className="absolute right-2 top-1.5 flex gap-1">
                      <button onClick={() => setShowFilters(!showFilters)} className={`rounded bg-white/5 px-2 py-1 text-[10px] font-bold uppercase hover:bg-[var(--color-accent)] hover:text-black transition-colors ${showFilters ? 'bg-[var(--color-accent)] text-black' : 'text-[var(--color-muted)]'}`}>
                        {tr('Filtros')}
                      </button>
                      <button onClick={() => doSearch(false)} className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white hover:bg-[var(--color-accent)] hover:text-black transition-colors">
                        {tr('Buscar')}
                      </button>
                    </div>
                    {searching && <div className="absolute right-28 top-2 text-xs text-[var(--color-accent)] animate-pulse">...</div>}
                    {searchFocused && !q.trim() && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#151518] border border-[var(--color-border)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-2 flex flex-wrap gap-1.5">
                        <p className="w-full text-[10px] font-semibold text-[var(--color-muted)] uppercase mb-1 px-1">{tr('Sugerencias populares')}</p>
                        {["Buttons", "Cards", "Forms", "Checkboxes", "Loaders", "Navbars", "Toggles", "Inputs"].map(cat => (
                          <button key={cat} onClick={() => setQ(cat)} className="text-[11px] bg-white/5 hover:bg-[var(--color-accent)] hover:text-black text-[var(--color-muted)] px-2 py-1 rounded transition-colors border border-[var(--color-border)]">
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {showFilters && (
                  <div className="mb-4 flex gap-2 shrink-0 bg-black/20 p-2 rounded-xl border border-[var(--color-border)]">
                    <CustomSelect placeholder="Fuente" value={filterSource} onChange={(v) => { setFilterSource(v); setTimeout(() => doSearch(false), 50); }} options={[{label: "Todo", value: ""}, {label: "Uiverse", value: "uiverse"}, {label: "HyperUI", value: "hyperui"}, {label: "Flowbite", value: "flowbite"}]} className="flex-1" />
                    <CustomSelect placeholder="Cat." value={filterCategory} onChange={(v) => { setFilterCategory(v); setTimeout(() => doSearch(false), 50); }} options={[{label: "Todo", value: ""}, {label: "Buttons", value: "Buttons"}, {label: "Cards", value: "Cards"}, {label: "Inputs", value: "Inputs"}, {label: "Loaders", value: "Loaders"}]} className="flex-1" />
                    <CustomSelect placeholder="FW" value={filterFramework} onChange={(v) => { setFilterFramework(v); setTimeout(() => doSearch(false), 50); }} options={[{label: "Todo", value: ""}, {label: "CSS", value: "css"}, {label: "Tailwind", value: "tailwind"}, {label: "React", value: "react"}]} className="flex-1" />
                  </div>
                )}
                {results.length > 0 ? (
                  <div className="flex-1 overflow-y-auto pr-1">
                    <div className="border-b border-[var(--color-border)] px-1 py-1.5 mb-2 flex items-center">
                      <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">{lang === 'en' ? `${totalResults} results` : `${totalResults} resultados`}</span>
                    </div>
                    <div className="space-y-5 pb-4">
                      {orderedResults.map(([cat, list]) => (
                        <div key={cat}>
                          <div className="text-[10px] uppercase text-[var(--color-muted)] mb-2 font-semibold border-b border-[var(--color-border)] pb-1.5 flex items-center gap-2">
                            <span>{cat}</span>
                            {catMatchesActiveSlot(cat) && <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[var(--color-accent)]">{tr('Compatible')}</span>}
                          </div>
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
                            {list.map((c) => (
                              <div
                                key={c.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", c.id);
                                  e.dataTransfer.setData("application/json", JSON.stringify(c));
                                  e.dataTransfer.effectAllowed = "copy";
                                }}
                                className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/20 hover:border-[var(--color-accent)] transition-all cursor-grab active:cursor-grabbing"
                              >
                                <iframe title={c.name} loading="lazy" srcDoc={realDoc(toSample(c), compiled.css, font)} sandbox="allow-scripts" scrolling="no" className="h-24 w-full border-0 opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="absolute top-1 left-1.5 opacity-0 group-hover:opacity-100 bg-black/70 px-1 py-0.5 rounded text-[8px] text-white/70 select-none pointer-events-none transition-opacity">
                                  Arrastrar
                                </div>
                                <div className="absolute bottom-1 right-1 z-10">
                                  <button onClick={() => addFromCatalog(c)} className="bg-[var(--color-accent)] text-black px-2 py-0.5 rounded text-[9px] font-bold shadow-lg opacity-0 group-hover:opacity-100 hover:scale-105 transition-all">
                                    + {activeSlot ? tr('Asignar') : tr('Añadir')}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {results.length < totalResults && (
                      <div className="pb-6 flex justify-center border-t border-[var(--color-border)] pt-3">
                        <button onClick={() => doSearch(true)} className="px-4 py-1.5 bg-white/10 hover:bg-[var(--color-accent)] hover:text-black rounded text-[10px] font-bold transition-colors">
                          {lang === 'en' ? `Load more (${totalResults - results.length})` : `Cargar más (${totalResults - results.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-60 border border-dashed border-[var(--color-border)] rounded-lg">
                    <p className="text-sm font-medium mb-2 text-white">{tr('Catálogo Universal')}</p>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      {lang === 'en'
                        ? <>{`Search (e.g. `}<em>card</em>{`, `}<em>button</em>{`) or hit Buscar for random picks.`}</>
                        : <>{`Busca (ej. `}<em>card</em>{`, `}<em>button</em>{`) o pulsa Buscar para una selección aleatoria.`}</>
                      }
                    </p>
                  </div>
                )}
              </>
            )}

            {/* TAB: MI MARCA (Biblioteca) */}
            {rightPanelTab === "library" && (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0">
                {samples.length > 0 && (
                  <div className="mb-2 shrink-0">
                    <input
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder={lang === 'en' ? 'Filter brand components...' : 'Filtrar componentes de la marca...'}
                      className="w-full rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-colors text-[var(--color-text)]"
                    />
                  </div>
                )}
                {samples.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60 border border-dashed border-[var(--color-border)] rounded-lg">
                    <p className="text-sm font-medium mb-2 text-white">{lang === 'en' ? 'No components in brand' : 'Sin componentes en la marca'}</p>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      {lang === 'en' ? 'Add components from the Catalog tab.' : 'Añade componentes desde la pestaña Catálogo.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pb-4 flex-1">
                    {(() => {
                      const allSlotsMap = (blueprint as { slots?: Partial<Record<SceneId, Record<string, string>>> }).slots ?? {};
                      const activeSlotDef2 = activeSlot ? sceneSlotsResolved(previewScene as SceneId, slotFlags).find(d => d.id === activeSlot.slot) ?? null : null;
                      const defs2 = sceneSlotsResolved(previewScene as SceneId, slotFlags);
                      const filtered = brandSearch.trim()
                        ? samples.filter(s => s.name.toLowerCase().includes(brandSearch.toLowerCase()) || (s.category && s.category.toLowerCase().includes(brandSearch.toLowerCase())))
                        : samples;
                      if (filtered.length === 0) {
                        return (
                          <div className="py-8 text-center text-xs text-[var(--color-muted)]">
                            {lang === 'en' ? 'No components match your search.' : 'Ningún componente coincide con la búsqueda.'}
                          </div>
                        );
                      }
                      return filtered.map((s) => {
                        const usage = componentUsage(s.id, allSlotsMap);
                        const compatible = !!activeSlotDef2 && categoryMatchesSlot(activeSlotDef2, s.category);
                        const matchSlots = defs2.filter(d => categoryMatchesSlot(d, s.category));
                        return (
                          <div
                            key={s.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", s.id);
                              e.dataTransfer.setData("application/json", JSON.stringify(s));
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            className="group relative rounded-xl border border-[var(--color-border)] bg-black/20 hover:border-[var(--color-accent)] transition-all overflow-hidden cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[var(--color-border)]">
                              <span className="text-[10px] text-white/30 group-hover:text-white/70 select-none cursor-grab" title="Arrastrar para asignar a una zona">⠿</span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[11px] font-semibold text-[var(--color-text)]">{s.name}</div>
                                {s.category && <div className="text-[9px] text-[var(--color-muted)]">{s.category}</div>}
                              </div>
                              {usage.length > 0 ? (
                                <div className="flex flex-wrap gap-1 shrink-0">
                                  {usage.slice(0,2).map(u => <span key={u.scene + u.slotId} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1 py-0 text-[8px] font-medium text-emerald-300">{SCENE_LABEL[u.scene]}</span>)}
                                  {usage.length > 2 && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1 py-0 text-[8px] font-medium text-emerald-300">+{usage.length - 2}</span>}
                                </div>
                              ) : <span className="text-[9px] text-[var(--color-muted)]/60 shrink-0">{lang === 'en' ? 'unused' : 'sin usar'}</span>}
                              <button onClick={() => removeComponent(s.id)} title={lang === 'en' ? 'Remove from brand' : 'Quitar de la marca'} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-[var(--color-muted)] opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">✕</button>
                            </div>
                            <iframe title={s.name} loading="lazy" srcDoc={realDoc(s, compiled.css, font)} sandbox="allow-scripts" scrolling="no" className="h-20 w-full border-0 pointer-events-none" />
                            <div className="px-2 py-1.5 space-y-1">
                              {activeSlotDef2 ? (compatible ? (
                                <button
                                  onClick={() => requestAssignToSlot(previewScene as SceneId, activeSlotDef2, s)}
                                  className="w-full rounded bg-[var(--color-accent)] px-2 py-1 text-[9px] font-bold uppercase text-black hover:scale-[1.02] transition-transform"
                                >
                                  + {lang === 'en' ? 'Assign to' : 'Asignar a'} {activeSlotDef2.label}
                                </button>
                              ) : (
                                <div className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-center text-[8px] text-[var(--color-muted)]/60">
                                  {lang === 'en' ? 'Not compatible with' : 'No compatible con'} {activeSlotDef2.label}
                                </div>
                              )) : matchSlots.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {matchSlots.map((d) => (
                                    <button
                                      key={d.id}
                                      onClick={() => requestAssignToSlot(previewScene as SceneId, d, s)}
                                      className="rounded bg-white/10 hover:bg-[var(--color-accent)] hover:text-black px-1.5 py-0.5 text-[8px] font-bold text-[var(--color-muted)] transition-colors"
                                    >
                                      + {d.label}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        ) : (
          <div 
            onClick={() => setRightPanelOpen(true)}
            className="w-12 shrink-0 bg-black/20 rounded-xl border border-[var(--color-border)] flex items-center justify-center cursor-pointer hover:bg-white/5 hover:border-[var(--color-accent)] transition-all h-[calc(100vh-120px)] sticky top-4"
            title="Mostrar Catálogo"
          >
            <span className="[writing-mode:vertical-rl] text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-muted)] hover:text-white transition-colors">
              {tr('Catálogo')}
            </span>
          </div>
        ))}
      </div>

      <AuditDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        report={visualResolution.validationReport}
        brandId={initial.id}
        slotsSummary={SCENE_ORDER.map((sc) => ({ scene: sc, label: SCENE_LABEL[sc], ...statsFromDefs(sceneSlotsResolved(sc, slotFlags), getSceneSlots(sc), samples) }))}
        getDraft={() => ({ name, tokens, previewIds: samples.map((s) => s.id) })}
        onRestored={handleRestored}
        initialView={auditTab}
        onPublished={() => void loadVersionCount()}
      />

      <ActionableCoverageDrawer
        isOpen={coverageDrawerOpen}
        onClose={() => setCoverageDrawerOpen(false)}
        score={Math.round((visualResolution.validationReport.coverage ?? 0) * 100)}
        blocks={currentSceneBlocks}
        scene={previewScene as SceneId}
        onSelectBlock={(blockId) => {
          setSelectedBlockId(blockId);
          handleScrollToBlock(blockId);
          setRightPanelTab("inspector");
          setRightPanelOpen(true);
        }}
        onNavigateScene={(sc: SceneId) => {
          setPreviewScene(sc);
          setSelectedBlockId(null);
        }}
        lang={lang}
      />

      {undoDeleteToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-2">
          <span className="text-sm text-zinc-200">
            Se eliminó <b className="text-white">"{undoDeleteToast.block.label}"</b>
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-1 text-xs font-bold text-black hover:brightness-110 transition-all shadow"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={() => setUndoDeleteToast(null)}
            className="text-zinc-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      <GuidedSetup open={guidedOpen} onClose={() => setGuidedOpen(false)} onApply={applyGuided} lang={lang} />

      <ConflictResolverModal
        isOpen={conflictState.isOpen}
        onClose={() => setConflictState((prev) => ({ ...prev, isOpen: false }))}
        title={conflictState.title}
        description={conflictState.description}
        slotLabel={conflictState.slotLabel}
        existingLabel={conflictState.existingLabel}
        incomingName={conflictState.incomingName}
        options={conflictState.options}
        onSelectOption={(action) => conflictState.onResolve(action)}
      />

      <ProductionModeGuardModal
        isOpen={prodGuardOpen}
        onClose={() => setProdGuardOpen(false)}
        onSwitchToDesign={() => {
          setProdGuardOpen(false);
          setRuntimeMode("design");
        }}
        actionAttempted={prodGuardAction}
      />

      {/* MODAL: EXPORTACIÓN 1-CLICK DE PÁGINAS Y PUENTE IA */}
      {pageExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#121316] text-[#f2f2f5] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden">
            {/* Cabecera */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Ensamblador de Páginas 1-Click
                    </h3>
                    <span className="rounded-full bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 px-2.5 py-0.5 text-[11px] text-[var(--color-accent)] font-mono font-semibold">
                      Escena: {SCENE_LABEL[previewScene]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Código limpio autoválido para producción con tokens WCAG AAA y cero dependencias de servidor.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPageExportModalOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Selector de Escena Inline para alternar sin salir */}
            <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex flex-wrap items-center gap-1.5 text-xs shrink-0 no-scrollbar">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 shrink-0 mr-1.5">
                Escena a exportar:
              </span>
              {SCENE_ORDER.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setPreviewScene(sc)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${
                    previewScene === sc
                      ? "bg-[var(--color-accent)] text-black font-bold shadow-sm ring-1 ring-white/20"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
                  }`}
                >
                  {SCENE_LABEL[sc]}
                </button>
              ))}
            </div>

            {/* Pestañas de Formato y Acciones de Copiado */}
            <div className="px-4 py-2.5 border-b border-white/10 bg-black/25 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 rounded-lg bg-black/50 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setPageExportTab("nextjs")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    pageExportTab === "nextjs"
                      ? "bg-white text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Next.js 15 (page.tsx)
                </button>
                <button
                  type="button"
                  onClick={() => setPageExportTab("astro")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    pageExportTab === "astro"
                      ? "bg-white/20 text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Astro (index.astro)
                </button>
                <button
                  type="button"
                  onClick={() => setPageExportTab("html")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    pageExportTab === "html"
                      ? "bg-white/20 text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  HTML Puro (index.html)
                </button>
                <button
                  type="button"
                  onClick={() => setPageExportTab("prompt")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    pageExportTab === "prompt"
                      ? "bg-white/20 text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Prompt Maestro IA
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentExport.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2500);
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                >
                  {copiedCode ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  <span>{copiedCode ? "Copiado al portapapeles" : "Copiar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadExportFile(currentExport.fileName, currentExport.code)}
                  className="rounded-lg bg-[var(--color-accent)] hover:brightness-110 px-3.5 py-1.5 text-xs font-bold text-black transition-all flex items-center gap-1.5 shadow"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Descargar {currentExport.fileName}</span>
                </button>
              </div>
            </div>

            {/* Código generado */}
            <div className="flex-1 min-h-0 p-4 bg-[#090a0d] overflow-auto">
              <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400 font-mono border-b border-white/5 pb-1.5">
                <span>{currentExport.desc}</span>
                <span className="text-zinc-500">{currentExport.fileName}</span>
              </div>
              <pre className="font-mono text-xs text-zinc-300 whitespace-pre leading-relaxed select-all selection:bg-[var(--color-accent)] selection:text-black">
                {currentExport.code}
              </pre>
            </div>

            {/* Pie */}
            <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Sin dependencias runtime externas. Estilos de marca integrados en línea.</span>
              </div>
              <button
                type="button"
                onClick={() => setPageExportModalOpen(false)}
                className="rounded-md px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GUARDAR SNIPPET / COMPONENTE PERSONALIZADO EN SQLITE CON VISTA LADO A LADO */}
      {snippetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 overscroll-contain">
          <div className="bg-[#121316] text-[#f2f2f5] w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden overscroll-contain">
            {/* Cabecera */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Añadir Componente o Snippet</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                      Editor & Vista en Vivo
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Escribe código HTML/Tailwind y visualiza el render instantáneo con tokens WCAG AAA de tu marca.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSnippetModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Barra de herramientas: Plantillas de inicio rápido + Selector de Modo de Vista */}
            <div className="px-5 py-2 bg-black/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 shrink-0 mr-1">
                  Plantillas rápidas:
                </span>
                {[
                  {
                    label: "Hero Moderno",
                    name: "Hero Moderno Glow",
                    category: "Hero",
                    slot: "hero",
                    html: `<section class="relative py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto text-center overflow-hidden">\n  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-action-primary)]/10 border border-[var(--color-action-primary)]/30 text-xs text-[var(--color-action-primary)] font-semibold mb-5 shadow-sm">\n    <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-action-primary)] animate-pulse"></span>\n    Novedad 2026\n  </div>\n  <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">\n    Construye experiencias web <span class="text-[var(--color-action-primary)]">sin fricción</span>\n  </h1>\n  <p class="mt-4 text-sm sm:text-base text-[var(--color-muted)] max-w-xl mx-auto leading-relaxed">\n    Diseñado con tokens de marca WCAG AAA, variables CSS nativas y componentes interactivos reutilizables.\n  </p>\n  <div class="mt-8 flex flex-wrap items-center justify-center gap-3">\n    <button class="px-6 py-3 rounded-lg bg-[var(--color-action-primary)] text-white font-bold hover:opacity-90 transition-all shadow-lg text-sm">\n      Comenzar ahora\n    </button>\n    <button class="px-6 py-3 rounded-lg border border-white/15 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors text-sm">\n      Explorar funciones\n    </button>\n  </div>\n</section>`,
                    css: `/* Animación de entrada */\nsection { animation: fadeIn 0.4s ease-out; }\n@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`
                  },
                  {
                    label: "Tarjeta Hover",
                    name: "Tarjeta de Características Glow",
                    category: "Cards",
                    slot: "features",
                    html: `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">\n  <div class="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[var(--color-action-primary)]/60 transition-all hover:-translate-y-1 shadow-lg group">\n    <div class="w-10 h-10 rounded-xl bg-[var(--color-action-primary)]/15 border border-[var(--color-action-primary)]/30 flex items-center justify-center text-[var(--color-action-primary)] font-bold text-sm mb-4 group-hover:scale-105 transition-transform">01</div>\n    <h3 class="text-base font-bold text-white mb-2">Diseño Consistente</h3>\n    <p class="text-xs text-[var(--color-muted)] leading-relaxed">Alinea tokens de color, tipografía y radios dinámicamente con cero configuración externa.</p>\n  </div>\n  <div class="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[var(--color-action-primary)]/60 transition-all hover:-translate-y-1 shadow-lg group">\n    <div class="w-10 h-10 rounded-xl bg-[var(--color-action-primary)]/15 border border-[var(--color-action-primary)]/30 flex items-center justify-center text-[var(--color-action-primary)] font-bold text-sm mb-4 group-hover:scale-105 transition-transform">02</div>\n    <h3 class="text-base font-bold text-white mb-2">Exportación Limpia</h3>\n    <p class="text-xs text-[var(--color-muted)] leading-relaxed">Vuelca páginas listas para producción en Next.js 15, Astro o HTML puro en un clic.</p>\n  </div>\n</div>`,
                    css: ``
                  },
                  {
                    label: "Navbar Flotante",
                    name: "Navbar Flotante Glass",
                    category: "Navbars",
                    slot: "header",
                    html: `<nav class="sticky top-0 z-40 w-full max-w-4xl mx-auto px-5 py-3 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 flex items-center justify-between shadow-2xl transition-all">\n  <div class="flex items-center gap-2.5">\n    <div class="w-6 h-6 rounded-lg bg-[var(--color-action-primary)]/20 border border-[var(--color-action-primary)]/40 flex items-center justify-center text-[10px] font-black text-[var(--color-action-primary)]">\n      ${(name || "M").slice(0, 2).toUpperCase()}\n    </div>\n    <span class="text-sm font-bold tracking-tight text-white">${name || "Mi Marca"}</span>\n  </div>\n  <div class="flex items-center gap-4 sm:gap-6 text-xs text-[var(--color-muted)]">\n    <a href="#" class="text-white hover:text-[var(--color-action-primary)] transition-colors font-medium">Inicio</a>\n    <a href="#" class="hover:text-white transition-colors">Características</a>\n    <a href="#" class="hover:text-white transition-colors">Precios</a>\n  </div>\n  <button class="px-3.5 py-1.5 rounded-lg bg-[var(--color-action-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow">\n    Exportar\n  </button>\n</nav>`,
                    css: `nav { backdrop-filter: blur(16px); }`
                  },
                  {
                    label: "CTA Banner",
                    name: "Banner Llamado a la Acción",
                    category: "Buttons",
                    slot: "cta",
                    html: `<div class="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[var(--color-action-primary)]/20 via-white/[0.04] to-transparent border border-[var(--color-action-primary)]/30 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-5 max-w-2xl mx-auto shadow-xl">\n  <div>\n    <span class="text-[10px] font-mono uppercase tracking-wider text-[var(--color-action-primary)] font-bold">Producción 2026</span>\n    <h3 class="text-lg sm:text-xl font-bold text-white mt-1">¿Listo para exportar tu proyecto?</h3>\n    <p class="text-xs text-[var(--color-muted)] mt-1.5 max-w-md">Tokens WCAG AAA y cero dependencias externas integradas en tu código.</p>\n  </div>\n  <button class="px-5 py-2.5 rounded-xl bg-[var(--color-action-primary)] text-white font-bold text-xs shrink-0 hover:scale-105 transition-transform shadow-lg hover:shadow-[var(--color-action-primary)]/30">\n    Descargar Código\n  </button>\n</div>`,
                    css: ``
                  }
                ].map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => {
                      setSnippetName(tpl.name);
                      setSnippetCategory(tpl.category);
                      setSnippetHtml(tpl.html);
                      setSnippetCss(tpl.css);
                      if (tpl.slot) setSnippetTargetSlot(tpl.slot);
                    }}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] text-zinc-300 hover:text-white transition-colors shrink-0"
                  >
                    + {tpl.label}
                  </button>
                ))}
              </div>

              {/* Selector de modo de pantalla: Dividido (50/50), Solo Código, Solo Vista */}
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setSnippetViewMode("split")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    snippetViewMode === "split"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Ver código y resultado lado a lado"
                >
                  Lado a lado
                </button>
                <button
                  type="button"
                  onClick={() => setSnippetViewMode("code")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    snippetViewMode === "code"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Solo editor de código"
                >
                  Solo código
                </button>
                <button
                  type="button"
                  onClick={() => setSnippetViewMode("preview")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    snippetViewMode === "preview"
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Solo vista previa en vivo"
                >
                  Solo vista
                </button>
              </div>
            </div>

            {/* Contenedor Principal: LADO A LADO */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 overflow-hidden">
              {/* PANEL IZQUIERDO: FORMULARIO Y EDITOR DE CÓDIGO */}
              {(snippetViewMode === "split" || snippetViewMode === "code") && (
                <div className={`flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[#101114] ${snippetViewMode === "code" ? "col-span-full" : ""}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Nombre del Componente *
                      </label>
                      <input
                        type="text"
                        value={snippetName}
                        onChange={(e) => setSnippetName(e.target.value)}
                        placeholder="Ej. Hero Moderno Glow"
                        className="w-full rounded-lg bg-black/50 px-3 py-1.5 text-xs border border-white/15 focus:border-[var(--color-accent)] outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Categoría
                      </label>
                      <select
                        value={snippetCategory}
                        onChange={(e) => setSnippetCategory(e.target.value)}
                        className="w-full rounded-lg bg-black/50 px-3 py-1.5 text-xs border border-white/15 focus:border-[var(--color-accent)] outline-none text-white"
                      >
                        <option value="Hero">Hero / Cabecera</option>
                        <option value="Navbars">Navbar / Navegación</option>
                        <option value="Buttons">Botones / CTA</option>
                        <option value="Cards">Tarjetas / Grillas</option>
                        <option value="Pricing">Precios / Tablas</option>
                        <option value="Features">Características / Beneficios</option>
                        <option value="Forms">Formularios / Inputs</option>
                        <option value="Footers">Footer / Pie de página</option>
                        <option value="Custom">Personalizado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Asignar a zona del Preview
                      </label>
                      <select
                        value={snippetTargetSlot}
                        onChange={(e) => setSnippetTargetSlot(e.target.value)}
                        className="w-full rounded-lg bg-black/50 px-3 py-1.5 text-xs border border-white/15 focus:border-[var(--color-accent)] outline-none text-white"
                      >
                        <option value="">Guardar en biblioteca (sin asignar)</option>
                        {sceneSlotsResolved(previewScene as SceneId, slotFlags).map((sl) => (
                          <option key={sl.id} value={sl.id}>
                            {sl.label} ({SCENE_LABEL[previewScene]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Editor HTML */}
                  <div className="flex-1 flex flex-col min-h-[200px]">
                    <div className="flex items-center justify-between mb-1 shrink-0">
                      <label className="block text-[11px] font-semibold text-zinc-400">
                        Código HTML / Tailwind *
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Edita y observa la vista en tiempo real a la derecha
                      </span>
                    </div>
                    <textarea
                      rows={snippetViewMode === "code" ? 16 : 10}
                      value={snippetHtml}
                      onChange={(e) => setSnippetHtml(e.target.value)}
                      placeholder={`<section class="py-16 px-6 max-w-5xl mx-auto text-center">\n  <h1 class="text-4xl font-bold tracking-tight">Construye más rápido</h1>\n  <p class="mt-4 text-lg text-white/70">Diseñado con tokens de marca en local.</p>\n  <button class="mt-6 px-6 py-2.5 rounded-lg bg-[var(--color-action-primary)] text-white font-semibold">Empezar</button>\n</section>`}
                      className="w-full flex-1 rounded-lg bg-black/60 font-mono text-xs p-3 border border-white/15 focus:border-[var(--color-accent)] outline-none text-zinc-200 leading-relaxed resize-none"
                      spellCheck={false}
                    />
                  </div>

                  {/* Sección Inferior Izquierda: Tokens de Marca y CSS */}
                  <div className="shrink-0 space-y-2 pt-2 border-t border-white/10">
                    {/* Selector de pestaña inferior izquierda: Tokens vs CSS */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => setSnippetLeftBottomTab("tokens")}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            snippetLeftBottomTab === "tokens"
                              ? "bg-white/20 text-white font-semibold shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          Tokens de la Marca
                        </button>
                        <button
                          type="button"
                          onClick={() => setSnippetLeftBottomTab("css")}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            snippetLeftBottomTab === "css"
                              ? "bg-white/20 text-white font-semibold shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          CSS Personalizado {snippetCss.trim() ? "•" : ""}
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {snippetLeftBottomTab === "tokens" ? "Ajusta tokens en vivo" : "var(--color-*) disponibles"}
                      </span>
                    </div>

                    {snippetLeftBottomTab === "tokens" ? (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          {/* Color Primario */}
                          <label className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors cursor-pointer" title="Color primario de acción (haz clic para cambiarlo)">
                            <div className="min-w-0">
                              <span className="block text-[10px] text-zinc-400 font-mono leading-tight">Primario</span>
                              <span className="block text-xs font-bold text-white uppercase font-mono truncate">
                                {getResolvedValue(tokens, "action.primary") || "#FF0055"}
                              </span>
                            </div>
                            <div className="relative shrink-0">
                              <span className="block w-5 h-5 rounded-md border border-white/30 shadow-sm" style={{ backgroundColor: getResolvedValue(tokens, "action.primary") || "#FF0055" }} />
                              <input
                                type="color"
                                value={getResolvedValue(tokens, "action.primary") || "#FF0055"}
                                onChange={(e) => setSlot("action.primary", e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </label>

                          {/* Color Fondo */}
                          <label className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors cursor-pointer" title="Color de fondo de la marca">
                            <div className="min-w-0">
                              <span className="block text-[10px] text-zinc-400 font-mono leading-tight">Fondo</span>
                              <span className="block text-xs font-bold text-white uppercase font-mono truncate">
                                {getResolvedValue(tokens, "color.bg") || "#0d0e11"}
                              </span>
                            </div>
                            <div className="relative shrink-0">
                              <span className="block w-5 h-5 rounded-md border border-white/30 shadow-sm" style={{ backgroundColor: getResolvedValue(tokens, "color.bg") || "#0d0e11" }} />
                              <input
                                type="color"
                                value={getResolvedValue(tokens, "color.bg") || "#0d0e11"}
                                onChange={(e) => setSlot("color.bg", e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </label>

                          {/* Color Superficie */}
                          <label className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors cursor-pointer" title="Color de superficie de tarjetas">
                            <div className="min-w-0">
                              <span className="block text-[10px] text-zinc-400 font-mono leading-tight">Superficie</span>
                              <span className="block text-xs font-bold text-white uppercase font-mono truncate">
                                {getResolvedValue(tokens, "color.surface") || "#17181c"}
                              </span>
                            </div>
                            <div className="relative shrink-0">
                              <span className="block w-5 h-5 rounded-md border border-white/30 shadow-sm" style={{ backgroundColor: getResolvedValue(tokens, "color.surface") || "#17181c" }} />
                              <input
                                type="color"
                                value={getResolvedValue(tokens, "color.surface") || "#17181c"}
                                onChange={(e) => setSlot("color.surface", e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                          </label>
                        </div>

                        {/* Radio de Bordes */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                          <span className="text-[10px] text-zinc-400 font-mono">Curvatura (Radio):</span>
                          <div className="flex items-center gap-1">
                            {(["4px", "8px", "12px", "16px", "9999px"] as const).map((r) => {
                              const curR = getResolvedValue(tokens, "radius.button") || "8px";
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setSlot("radius.button", r)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                    curR === r
                                      ? "bg-[var(--color-accent)] text-black font-bold shadow-sm"
                                      : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
                                  }`}
                                >
                                  {r === "9999px" ? "pill" : r}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={snippetCss}
                        onChange={(e) => setSnippetCss(e.target.value)}
                        placeholder={`/* Estilos personalizados o animaciones keyframe */`}
                        className="w-full rounded-lg bg-black/60 font-mono text-xs px-3 py-2 border border-white/15 focus:border-[var(--color-accent)] outline-none text-zinc-200 leading-relaxed resize-none"
                        spellCheck={false}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* PANEL DERECHO: VISTA PREVIA EN VIVO — SOLO EL PREVIEW NADA MÁS */}
              {(snippetViewMode === "split" || snippetViewMode === "preview") && (
                <div className={`flex flex-col h-full bg-[#08090c] p-3 sm:p-4 overflow-hidden ${snippetViewMode === "preview" ? "col-span-full" : ""}`}>
                  {/* Barra superior limpia: estado y selector de dispositivo */}
                  <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400 font-mono shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-zinc-300 font-medium">Render en vivo ({name || "Marca"})</span>
                    </div>

                    {/* Dispositivos de previsualización */}
                    <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded border border-white/10">
                      <button
                        type="button"
                        onClick={() => setSnippetDevice("desktop")}
                        className={`px-2.5 py-0.5 rounded text-[10px] transition-all ${
                          snippetDevice === "desktop"
                            ? "bg-white/20 text-white font-semibold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                        title="Escritorio (ancho completo)"
                      >
                        Escritorio
                      </button>
                      <button
                        type="button"
                        onClick={() => setSnippetDevice("tablet")}
                        className={`px-2.5 py-0.5 rounded text-[10px] transition-all ${
                          snippetDevice === "tablet"
                            ? "bg-white/20 text-white font-semibold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                        title="Tablet (640px)"
                      >
                        Tablet
                      </button>
                      <button
                        type="button"
                        onClick={() => setSnippetDevice("mobile")}
                        className={`px-2.5 py-0.5 rounded text-[10px] transition-all ${
                          snippetDevice === "mobile"
                            ? "bg-white/20 text-white font-semibold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                        title="Móvil (375px)"
                      >
                        Móvil
                      </button>
                    </div>
                  </div>

                  {/* Contenedor del Iframe: limpio, sin estorbos, scroll fluido */}
                  <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-[#0c0d10] relative flex items-center justify-center">
                    {snippetHtml.trim() ? (
                      <div
                        className="h-full transition-all duration-200 shadow-2xl overflow-hidden flex flex-col"
                        style={{
                          width: snippetDevice === "mobile" ? "375px" : snippetDevice === "tablet" ? "640px" : "100%",
                          maxWidth: "100%",
                        }}
                      >
                        <iframe
                          key={`snippet-preview-${snippetDevice}-${compiled.css.length}`}
                          className="w-full h-full border-0 bg-transparent"
                          title="Live Snippet Preview"
                          sandbox="allow-scripts"
                          srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${GUARD}
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { ${compiled.css} }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background-color: var(--color-bg, #090a0d);
      color: var(--color-text, #f0f0f3);
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
      overflow-x: hidden;
      overflow-y: auto;
      scroll-behavior: smooth;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
    ${snippetCss}
  </style>
</head>
<body class="p-4 sm:p-6 flex flex-col min-h-full">
  <div class="w-full flex-1 flex flex-col ${snippetCategory === 'Navbars' ? 'justify-start' : 'justify-center'}">
    ${snippetHtml}
  </div>
</body>
</html>`}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 text-xs p-6 text-center">
                        <svg className="w-8 h-8 text-zinc-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        <p className="font-medium text-zinc-400">Sin contenido que mostrar</p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Selecciona una plantilla rápida arriba o escribe código HTML en el editor izquierdo para verlo en vivo.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pie */}
            <div className="p-3.5 sm:px-5 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-400">
                {snippetTargetSlot ? (
                  <>Se asignará directamente a la zona <span className="text-[var(--color-accent)] font-semibold">{sceneSlotsResolved(previewScene as SceneId, slotFlags).find(s => s.id === snippetTargetSlot)?.label || snippetTargetSlot}</span></>
                ) : activeSlot ? (
                  <>Se asignará a la zona activa <span className="text-[var(--color-accent)] font-semibold">{activeSlot.label || activeSlot.slot}</span></>
                ) : (
                  "Se guardará en la biblioteca local de componentes de la marca"
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSnippetModalOpen(false)}
                  className="rounded-lg px-3.5 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingSnippet || !snippetName.trim() || !snippetHtml.trim()}
                  onClick={handleSaveSnippet}
                  className="rounded-lg bg-[var(--color-accent)] hover:brightness-110 disabled:opacity-50 px-4 py-2 text-xs font-bold text-black transition-all shadow"
                >
                  {savingSnippet ? "Guardando en SQLite..." : "Guardar y Asignar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AÑADIR NUEVA SECCIÓN */}
      {addSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101218]/95 backdrop-blur-xl text-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent,#f97316)] shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  {lang === "en" ? "Add New Section" : "Añadir Nueva Sección"}
                </h3>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                  {SCENE_LABEL[previewScene as SceneId] || previewScene}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {lang === "en" ? "Select Section Archetype" : "Seleccionar Arquetipo de Sección"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: "hero",
                      label: "Hero Principal",
                      badge: "Portada & CTA",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    },
                    {
                      id: "projects",
                      label: "Catálogo CMS",
                      badge: "10 Proyectos Dinámicos",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    },
                    {
                      id: "detail",
                      label: "Ficha Detalle CMS",
                      badge: "Showcase & Métricas",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    },
                    {
                      id: "bento",
                      label: "Bento Grid",
                      badge: "Terminal & GitHub",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    },
                    {
                      id: "stats",
                      label: "Métricas / KPIs",
                      badge: "Contadores & Uptime",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    },
                    {
                      id: "contact",
                      label: "Terminal Contacto",
                      badge: "Formulario & Canales",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    },
                    {
                      id: "nav",
                      label: "Navbar / Cabecera",
                      badge: "Navegación",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                    },
                    {
                      id: "footer",
                      label: "Pie de Página",
                      badge: "Enlaces & Copyright",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="16" width="18" height="5" rx="1"/><path d="M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10"/></svg>
                    },
                    {
                      id: "custom",
                      label: "Personalizado",
                      badge: "HTML a Medida",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    },
                  ].map((t) => {
                    const isSelected = newSectionType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setNewSectionType(t.id);
                          if (!newSectionLabel) setNewSectionLabel(t.label);
                        }}
                        className={`p-3 rounded-xl border text-left font-medium transition-all flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white shadow-lg shadow-[rgba(240,164,112,0.1)]"
                            : "border-white/10 bg-black/30 text-zinc-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-accent,#f0a470)] shrink-0">{t.iconSvg}</span>
                          <span className="text-xs font-bold text-white truncate">{t.label}</span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-400 truncate">{t.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  {lang === "en" ? "Section Name / Label" : "Nombre Visible de la Sección"}
                </label>
                <input
                  type="text"
                  value={newSectionLabel}
                  onChange={(e) => setNewSectionLabel(e.target.value)}
                  placeholder={lang === "en" ? "e.g. Featured Projects, Contact Terminal" : "ej. Proyectos Destacados, Terminal de Contacto"}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-[var(--color-accent,#f97316)] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  {lang === "en" ? "Connect / Route to Scene (Optional)" : "Conectar / Enlazar hacia Escena (Opcional)"}
                </label>
                <select
                  value={newSectionLink}
                  onChange={(e) => setNewSectionLink(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white focus:border-[var(--color-accent,#f97316)] focus:outline-none"
                >
                  <option value="">{lang === "en" ? "No link (standard section)" : "Sin enlace (sección estándar)"}</option>
                  {SCENE_ORDER.map((sc) => (
                    <option key={sc} value={sc}>
                      {SCENE_LABEL[sc]} (/{sc})
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  {lang === "en"
                    ? "Interactive buttons or links inside this section will navigate to the chosen scene."
                    : "Los botones y enlaces dentro de esta sección redirigirán a la escena seleccionada en el preview y en el código exportado."}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-zinc-400 flex items-center justify-between">
                <span className="font-semibold text-zinc-300">
                  {lang === "en" ? "Position: " : "Ubicación: "}
                </span>
                <span className="font-mono text-white font-bold">
                  {typeof addSectionIndex === "number"
                    ? (lang === "en" ? `Insert at position #${addSectionIndex + 1}` : `Insertar en posición #${addSectionIndex + 1}`)
                    : (lang === "en" ? "Insert at the end of page" : "Insertar al final de la página")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 bg-black/40">
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {lang === "en" ? "Cancel" : "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleInsertNewSection(
                    previewScene as SceneId,
                    newSectionType,
                    newSectionLabel || newSectionType,
                    newSectionLink || undefined,
                    addSectionIndex,
                  );
                  setAddSectionModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[var(--color-accent,#f97316)] text-black font-extrabold text-xs hover:brightness-110 transition-all shadow-lg shadow-orange-500/20"
              >
                {lang === "en" ? "Insert Section" : "Insertar Sección"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACCIONES, ENLACES Y RUTAS DE LA SECCIÓN */}
      {linkModalBlockId && (() => {
        const blk = currentSceneBlocks.find((b) => b.id === linkModalBlockId);
        const primaryTarget = modalActions["primary"]?.target ?? { kind: "none" };
        const secondaryTarget = modalActions["secondary"]?.target ?? { kind: "none" };
        const customActionKeys = Object.keys(modalActions).filter((k) => k !== "primary" && k !== "secondary");

        const setTarget = (actionId: string, label: string, target: LinkTarget) => {
          setModalActions((prev) => {
            const next = { ...prev };
            if (target.kind === "none") {
              delete next[actionId];
            } else {
              next[actionId] = { actionId, label, target };
            }
            return next;
          });
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-xl max-h-[85vh] rounded-2xl border border-white/10 bg-[#121316] text-white shadow-2xl overflow-hidden flex flex-col">
              {/* Encabezado */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold text-xs">↗</span>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      {lang === "en" ? "Section Actions & Routing" : "Acciones y Rutas de la Sección"}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {blk ? `${blk.label} (#${blk.id})` : linkModalBlockId}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkModalBlockId(null)}
                  className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              {/* Contenido con scroll */}
              <div className="p-5 space-y-5 overflow-y-auto text-xs flex-1">
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  {lang === "en"
                    ? "Configure granular links for every button or interactive element in this section. Bindings automatically route during preview and compile cleanly to Next.js, Astro, or HTML targets."
                    : "Configura enlaces granulares para cada botón o elemento interactivo de esta sección. Los bindings navegan automáticamente en el preview interactivo y se compilan limpiamente a Next.js, Astro y HTML."}
                </p>

                {/* 1. ACCIÓN PRINCIPAL (CTA PRIMARIO) */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--color-accent)]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-accent)]">
                        {lang === "en" ? "Primary CTA" : "CTA Principal"}
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        {lang === "en" ? "Main button / Call to action" : "Botón principal / Llamada a la acción"}
                      </span>
                    </div>
                    {primaryTarget.kind !== "none" && (
                      <button
                        type="button"
                        onClick={() => setTarget("primary", "CTA Principal", { kind: "none" })}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        {lang === "en" ? "Clear" : "Desactivar"}
                      </button>
                    )}
                  </div>

                  {/* Selector de tipo de target */}
                  <div className="grid grid-cols-5 gap-1.5 p-1 rounded-lg bg-black/40 border border-white/5 text-[11px]">
                    {(["none", "scene", "route", "url", "anchor"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          if (k === "none") setTarget("primary", "CTA Principal", { kind: "none" });
                          else if (k === "scene") setTarget("primary", "CTA Principal", { kind: "scene", sceneId: previewScene === "auth" ? "dashboard" : "auth" });
                          else if (k === "route") setTarget("primary", "CTA Principal", { kind: "route", routeId: "custom", path: "/pricing" });
                          else if (k === "url") setTarget("primary", "CTA Principal", { kind: "url", href: "https://", newTab: true });
                          else if (k === "anchor") setTarget("primary", "CTA Principal", { kind: "anchor", blockId: "faq" });
                        }}
                        className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                          primaryTarget.kind === k
                            ? "bg-[var(--color-accent)] text-black font-bold shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {k === "none" ? (lang === "en" ? "None" : "Ninguno") : k === "scene" ? (lang === "en" ? "Scene" : "Escena") : k === "route" ? (lang === "en" ? "Route" : "Ruta") : k === "url" ? "URL" : (lang === "en" ? "Anchor" : "Ancla")}
                      </button>
                    ))}
                  </div>

                  {/* Configuración según tipo */}
                  {primaryTarget.kind === "scene" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "Target Scene / Page:" : "Página o Escena Interna:"}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {SCENE_ORDER.map((sc) => {
                          const def = SCENE_DEFINITIONS[sc];
                          const active = primaryTarget.sceneId === sc;
                          return (
                            <button
                              key={sc}
                              type="button"
                              onClick={() => setTarget("primary", "CTA Principal", { kind: "scene", sceneId: sc })}
                              className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                                active
                                  ? "border-violet-400 bg-violet-400/20 text-white font-bold"
                                  : "border-white/10 bg-black/20 text-zinc-400 hover:text-white hover:border-white/20"
                              }`}
                            >
                              <span className="text-xs">{SCENE_LABEL[sc]}</span>
                              <span className="text-[9px] font-mono text-zinc-500">{def.route}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {primaryTarget.kind === "route" && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "Explicit Path (e.g. /auth/register, /pricing):" : "Ruta Web Explícita (p.ej. /auth/register, /pricing):"}
                      </label>
                      <input
                        type="text"
                        value={primaryTarget.path}
                        onChange={(e) => setTarget("primary", "CTA Principal", { kind: "route", routeId: e.target.value, path: e.target.value })}
                        placeholder="/auth/register"
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent)] font-mono"
                      />
                    </div>
                  )}

                  {primaryTarget.kind === "url" && (
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "External URL (e.g. https://github.com/...):" : "URL Externa (p.ej. https://github.com/...):"}
                      </label>
                      <input
                        type="url"
                        value={primaryTarget.href}
                        onChange={(e) => setTarget("primary", "CTA Principal", { ...primaryTarget, href: e.target.value })}
                        placeholder="https://github.com/..."
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent)] font-mono"
                      />
                      <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={primaryTarget.newTab !== false}
                          onChange={(e) => setTarget("primary", "CTA Principal", { ...primaryTarget, newTab: e.target.checked })}
                          className="rounded border-white/20 bg-black/40"
                        />
                        <span className="text-[11px]">{lang === "en" ? "Open in new tab (target='_blank')" : "Abrir en nueva pestaña (target='_blank')"}</span>
                      </label>
                    </div>
                  )}

                  {primaryTarget.kind === "anchor" && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "Target Block ID / Anchor:" : "ID del Bloque o Ancla en la misma página:"}
                      </label>
                      <input
                        type="text"
                        value={primaryTarget.blockId}
                        onChange={(e) => setTarget("primary", "CTA Principal", { kind: "anchor", blockId: e.target.value.replace(/^#/, "") })}
                        placeholder="faq"
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--color-accent)] font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* 2. ACCIÓN SECUNDARIA (CTA SECUNDARIO) */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-300">
                        {lang === "en" ? "Secondary CTA" : "CTA Secundario"}
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        {lang === "en" ? "Ghost / Outline / Secondary button" : "Botón secundario / ghost / enlace"}
                      </span>
                    </div>
                    {secondaryTarget.kind !== "none" && (
                      <button
                        type="button"
                        onClick={() => setTarget("secondary", "CTA Secundario", { kind: "none" })}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        {lang === "en" ? "Clear" : "Desactivar"}
                      </button>
                    )}
                  </div>

                  {/* Selector de tipo de target secundario */}
                  <div className="grid grid-cols-5 gap-1.5 p-1 rounded-lg bg-black/40 border border-white/5 text-[11px]">
                    {(["none", "scene", "route", "url", "anchor"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          if (k === "none") setTarget("secondary", "CTA Secundario", { kind: "none" });
                          else if (k === "scene") setTarget("secondary", "CTA Secundario", { kind: "scene", sceneId: previewScene === "commerce" ? "portfolio" : "commerce" });
                          else if (k === "route") setTarget("secondary", "CTA Secundario", { kind: "route", routeId: "secondary", path: "/docs" });
                          else if (k === "url") setTarget("secondary", "CTA Secundario", { kind: "url", href: "https://", newTab: true });
                          else if (k === "anchor") setTarget("secondary", "CTA Secundario", { kind: "anchor", blockId: "features" });
                        }}
                        className={`py-1.5 px-2 rounded-md font-medium text-center transition-all ${
                          secondaryTarget.kind === k
                            ? "bg-violet-500 text-white font-bold shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {k === "none" ? (lang === "en" ? "None" : "Ninguno") : k === "scene" ? (lang === "en" ? "Scene" : "Escena") : k === "route" ? (lang === "en" ? "Route" : "Ruta") : k === "url" ? "URL" : (lang === "en" ? "Anchor" : "Ancla")}
                      </button>
                    ))}
                  </div>

                  {/* Configuración según tipo secundario */}
                  {secondaryTarget.kind === "scene" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "Target Scene / Page:" : "Página o Escena Interna:"}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {SCENE_ORDER.map((sc) => {
                          const def = SCENE_DEFINITIONS[sc];
                          const active = secondaryTarget.sceneId === sc;
                          return (
                            <button
                              key={sc}
                              type="button"
                              onClick={() => setTarget("secondary", "CTA Secundario", { kind: "scene", sceneId: sc })}
                              className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 ${
                                active
                                  ? "border-violet-400 bg-violet-400/20 text-white font-bold"
                                  : "border-white/10 bg-black/20 text-zinc-400 hover:text-white hover:border-white/20"
                              }`}
                            >
                              <span className="text-xs">{SCENE_LABEL[sc]}</span>
                              <span className="text-[9px] font-mono text-zinc-500">{def.route}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {secondaryTarget.kind === "route" && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "Explicit Path:" : "Ruta Web Explícita:"}
                      </label>
                      <input
                        type="text"
                        value={secondaryTarget.path}
                        onChange={(e) => setTarget("secondary", "CTA Secundario", { kind: "route", routeId: e.target.value, path: e.target.value })}
                        placeholder="/docs"
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-400 font-mono"
                      />
                    </div>
                  )}

                  {secondaryTarget.kind === "url" && (
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "External URL:" : "URL Externa:"}
                      </label>
                      <input
                        type="url"
                        value={secondaryTarget.href}
                        onChange={(e) => setTarget("secondary", "CTA Secundario", { ...secondaryTarget, href: e.target.value })}
                        placeholder="https://..."
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-400 font-mono"
                      />
                      <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={secondaryTarget.newTab !== false}
                          onChange={(e) => setTarget("secondary", "CTA Secundario", { ...secondaryTarget, newTab: e.target.checked })}
                          className="rounded border-white/20 bg-black/40"
                        />
                        <span className="text-[11px]">{lang === "en" ? "Open in new tab (target='_blank')" : "Abrir en nueva pestaña (target='_blank')"}</span>
                      </label>
                    </div>
                  )}

                  {secondaryTarget.kind === "anchor" && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400">
                        {lang === "en" ? "Target Block ID / Anchor:" : "ID del Bloque o Ancla en la misma página:"}
                      </label>
                      <input
                        type="text"
                        value={secondaryTarget.blockId}
                        onChange={(e) => setTarget("secondary", "CTA Secundario", { kind: "anchor", blockId: e.target.value.replace(/^#/, "") })}
                        placeholder="features"
                        className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-400 font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* 3. ACCIONES ADICIONALES (NAVBAR, CARDS, TEXT LINKS) */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      {lang === "en" ? "Additional Action Bindings" : "Enlaces y Acciones Adicionales (Navbar / Cards)"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      data-action="id"
                    </span>
                  </div>

                  {customActionKeys.length > 0 ? (
                    <div className="space-y-2">
                      {customActionKeys.map((actId) => {
                        const act = modalActions[actId];
                        let desc = "";
                        if (act.target.kind === "scene") desc = `Escena /${act.target.sceneId}`;
                        else if (act.target.kind === "route") desc = `Ruta ${act.target.path}`;
                        else if (act.target.kind === "url") desc = `URL ${act.target.href}`;
                        else if (act.target.kind === "anchor") desc = `Ancla #${act.target.blockId}`;
                        return (
                          <div key={actId} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-white">{actId}</span>
                                {act.label && <span className="text-[10px] text-zinc-400">({act.label})</span>}
                              </div>
                              <span className="text-[10px] text-violet-300 truncate block">{desc}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTarget(actId, "", { kind: "none" })}
                              className="text-red-400 hover:text-red-300 p-1 text-xs"
                              title={lang === "en" ? "Delete action" : "Eliminar acción"}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 italic">
                      {lang === "en" ? "No custom action bindings yet." : "No hay bindings adicionales configurados."}
                    </p>
                  )}

                  {/* Formulario para añadir nueva acción */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                      {lang === "en" ? "+ Add Action Binding" : "+ Añadir Binding de Acción (data-action)"}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newActionId}
                        onChange={(e) => setNewActionId(e.target.value)}
                        placeholder="actionId (ej. nav-login, card-1)"
                        className="rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white outline-none focus:border-[var(--color-accent)] font-mono"
                      />
                      <input
                        type="text"
                        value={newActionLabel}
                        onChange={(e) => setNewActionLabel(e.target.value)}
                        placeholder="Etiqueta visible (ej. Iniciar sesión)"
                        className="rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={newActionKind}
                        onChange={(e) => setNewActionKind(e.target.value as "scene" | "route" | "url" | "anchor")}
                        className="rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white outline-none"
                      >
                        <option value="scene">Escena</option>
                        <option value="route">Ruta</option>
                        <option value="url">URL externa</option>
                        <option value="anchor">Ancla</option>
                      </select>
                      <input
                        type="text"
                        value={newActionVal}
                        onChange={(e) => setNewActionVal(e.target.value)}
                        placeholder={newActionKind === "scene" ? "auth" : newActionKind === "route" ? "/pricing" : newActionKind === "url" ? "https://..." : "faq"}
                        className="flex-1 rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-white outline-none focus:border-[var(--color-accent)] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newActionId.trim()) return;
                          const cleanId = newActionId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
                          let tgt: LinkTarget = { kind: "none" };
                          if (newActionKind === "scene") tgt = { kind: "scene", sceneId: newActionVal || "auth" };
                          else if (newActionKind === "route") tgt = { kind: "route", routeId: cleanId, path: newActionVal.startsWith("/") ? newActionVal : `/${newActionVal}` };
                          else if (newActionKind === "url") tgt = { kind: "url", href: newActionVal || "https://", newTab: true };
                          else if (newActionKind === "anchor") tgt = { kind: "anchor", blockId: newActionVal.replace(/^#/, "") };
                          setTarget(cleanId, newActionLabel.trim() || cleanId, tgt);
                          setNewActionId("");
                          setNewActionLabel("");
                          setNewActionVal("");
                        }}
                        disabled={!newActionId.trim()}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-[var(--color-accent)] hover:text-black text-white font-bold text-xs disabled:opacity-40 transition-colors"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de modal */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-black/40">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveBlockActions(previewScene as SceneId, linkModalBlockId, {});
                    setLinkModalBlockId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  {lang === "en" ? "Unlink All" : "Quitar Todos los Enlaces"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkModalBlockId(null)}
                    className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    {lang === "en" ? "Cancel" : "Cancelar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveBlockActions(previewScene as SceneId, linkModalBlockId, modalActions);
                      setLinkModalBlockId(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[var(--color-accent)] text-black font-bold text-xs hover:brightness-110 transition-all shadow"
                  >
                    {lang === "en" ? "Save Actions & Routes" : "Guardar Acciones y Rutas"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL PARA CREAR NUEVAS PÁGINAS Y RUTAS */}
      {addPageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#101218]/95 backdrop-blur-2xl p-6 sm:p-7 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent,#f97316)] shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {lang === "en" ? "Create New Page / Route" : "Crear Nueva Página / Ruta"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddPageModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Selector Visual de Arquetipo de Página */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  {lang === "en" ? "Page Architecture Type" : "Tipo de Arquitectura de la Página"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: "landing",
                      label: "Página Estática",
                      badge: "Diseño & Portada",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>,
                      desc: "Secciones libres y personalizadas"
                    },
                    {
                      id: "portfolio",
                      label: "Colección CMS",
                      badge: "Catálogo Dinámico",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
                      desc: "Grid de proyectos conectado a datos"
                    },
                    {
                      id: "content",
                      label: "Ficha de Detalle",
                      badge: "/proyectos/[slug]",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                      desc: "Plantilla única con métricas y stack"
                    },
                    {
                      id: "dashboard",
                      label: "Dashboard / Consola",
                      badge: "App Shell + Sidebar",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
                      desc: "Panel de control con navegación lateral"
                    },
                    {
                      id: "form",
                      label: "Contacto / Form",
                      badge: "Terminal & Redes",
                      iconSvg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
                      desc: "Captación y validación interactiva"
                    },
                  ].map((arch) => {
                    const isSelected = newPageSceneId === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => {
                          setNewPageSceneId(arch.id as SceneId);
                          if (arch.id === "content" && !newPagePath.includes("/proyectos/")) {
                            setNewPagePath("/proyectos/nuevo-proyecto");
                            setNewPageTitle("Ficha de Proyecto");
                          } else if (arch.id === "portfolio" && newPagePath === "") {
                            setNewPagePath("/portfolio");
                            setNewPageTitle("Portfolio & Proyectos");
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 ${
                          isSelected
                            ? "border-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/15 text-white shadow-lg shadow-[rgba(240,164,112,0.1)]"
                            : "border-white/10 bg-black/30 text-zinc-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-accent,#f0a470)]">{arch.iconSvg}</span>
                          <span className="text-[9px] font-mono font-bold text-[var(--color-accent,#f0a470)] bg-[var(--color-accent,#f0a470)]/10 px-1.5 py-0.5 rounded border border-[var(--color-accent,#f0a470)]/20">{arch.badge}</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white mt-1">{arch.label}</div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">{arch.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  {lang === "en" ? "Page Title" : "Título Visible de la Página"}
                </label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPagePath || newPagePath === "/proyectos/nuevo-proyecto" || newPagePath === "/") {
                      const cleanSlug = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
                      if (newPageSceneId === "content") {
                        setNewPagePath(`/proyectos/${cleanSlug || "nuevo-proyecto"}`);
                      } else if (cleanSlug) {
                        setNewPagePath(`/${cleanSlug}`);
                      }
                    }
                  }}
                  placeholder="ej. Arquitectura Distribuida, Servicios Cloud"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--color-accent,#f97316)] font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    {lang === "en" ? "Route Path URL" : "Ruta URL Canónica (Path)"}
                  </label>
                  {newPagePath.startsWith("/proyectos/") && (
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ● Ruta Dinámica CMS
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={newPagePath}
                  onChange={(e) => setNewPagePath(e.target.value)}
                  placeholder="/proyectos/mi-nuevo-proyecto"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-[var(--color-accent,#f97316)]"
                />
              </div>

              {/* Plantillas de un clic */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] text-zinc-400 font-mono block">Plantillas de ruta rápida:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { p: "/proyectos/nuevo-proyecto", t: "Ficha de Proyecto CMS", s: "content" },
                    { p: "/portfolio", t: "Catálogo de Proyectos", s: "portfolio" },
                    { p: "/dashboard", t: "Consola Dashboard", s: "dashboard" },
                    { p: "/servicios", t: "Servicios y Soluciones", s: "landing" },
                    { p: "/contacto", t: "Terminal de Contacto", s: "form" },
                    { p: "/blog", t: "Blog & Artículos", s: "content" },
                  ].map((sug) => (
                    <button
                      key={sug.p}
                      type="button"
                      onClick={() => {
                        setNewPagePath(sug.p);
                        setNewPageTitle(sug.t);
                        setNewPageSceneId(sug.s as SceneId);
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-300 hover:text-white hover:border-[var(--color-accent,#f97316)]/50 transition-colors font-mono"
                    >
                      {sug.t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddPageModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {lang === "en" ? "Cancel" : "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newPagePath.trim() || !newPageTitle.trim()) return;
                  handleCreateNewPage(newPagePath, newPageTitle, newPageSceneId);
                }}
                disabled={!newPagePath.trim() || !newPageTitle.trim()}
                className="px-6 py-2.5 rounded-xl bg-[var(--color-accent,#f97316)] text-black font-extrabold text-xs hover:brightness-110 disabled:opacity-40 transition-all shadow-lg shadow-orange-500/20"
              >
                {lang === "en" ? "Create Page" : "Crear Página"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Tooltip al pasar el raton (mismo patron que los botones de la barra superior:
   group relative + burbuja negra con flecha, aparece en group-hover). */
function DerivedViews({ views, lang }: { views: ProjectView[]; lang: "es" | "en" }) {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  if (!views.length) {
    return <div className="rounded-xl border border-[var(--color-border)] bg-black/20 p-4 text-sm text-[var(--color-muted)]">{L("Importa un proyecto (“Proyecto completo”) para ver sus vistas y secciones detectadas.", "Import a project to see its detected views and sections.")}</div>;
  }
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{L("Vistas del proyecto", "Project views")} · {views.length}</span>
        <span className="ml-auto text-[10px] text-[var(--color-muted)]/70">{L("derivado del modelo · solo lectura", "derived from the model · read-only")}</span>
      </div>
      <div className="space-y-2.5">
        {views.map((v) => (
          <div key={v.id} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-[var(--color-text)]">{v.title || v.route}</span>
              <span className="font-mono text-[10px] text-[var(--color-muted)]/70">{v.route}{v.dynamic ? " · dinámica" : ""}</span>
              <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)]">{SCENE_LABEL[v.previewArchetype]}</span>
            </div>
            {v.sections?.length ? (
              <div className="flex flex-wrap items-center gap-1">
                {v.sections.map((s) => (
                  <span key={s.id} title={s.source} className={`rounded border px-1.5 py-0.5 text-[10px] ${s.confidence === "strong" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-[var(--color-muted)]"}`}>{s.kind}<span className="ml-1 opacity-60">{s.confidence === "strong" ? "●" : "○"}</span></span>
                ))}
              </div>
            ) : <span className="text-[10px] text-[var(--color-muted)]/70">{L("sin secciones detectadas", "no sections detected")}</span>}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--color-muted)]/70">{L("● evidencia directa · ○ inferido por nombre", "● direct evidence · ○ inferred by name")}</p>
    </div>
  );
}

function DerivedSignals({ views, dimension, lang }: { views: ProjectView[]; dimension: "data" | "interaction"; lang: "es" | "en" }) {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const strongCls = dimension === "data"
    ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
    : "border-violet-400/30 bg-violet-400/10 text-violet-300";
  const sigsOf = (v: ProjectView) => (dimension === "data" ? v.data : v.interaction) ?? [];
  if (!views.length) {
    return <div className="rounded-xl border border-[var(--color-border)] bg-black/20 p-4 text-sm text-[var(--color-muted)]">{L("Importa un proyecto (“Proyecto completo”) para derivar señales por vista.", "Import a project to derive per-view signals.")}</div>;
  }
  const withSig = views.filter((v) => sigsOf(v).length);
  const isDynamic = dimension === "data" && views.some((v) => (v.data ?? []).some((d) => ["dynamic", "fetch", "backend", "collections", "tables"].includes(d.kind)));
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{dimension === "data" ? L("Datos", "Data") : L("Interacción", "Interaction")} · {L("derivado de", "derived from")} {views.length} {L("vista(s)", "view(s)")}</span>
        {dimension === "data" && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${isDynamic ? "border-sky-400/40 bg-sky-400/10 text-sky-300" : "border-white/15 bg-white/5 text-[var(--color-muted)]"}`}>{isDynamic ? L("dinámico", "dynamic") : L("estático", "static")}</span>
        )}
        <span className="ml-auto text-[10px] text-[var(--color-muted)]/70">{L("derivado del modelo · solo lectura", "derived from the model · read-only")}</span>
      </div>
      {!withSig.length ? (
        <p className="text-[12px] text-[var(--color-muted)]">{L("Sin señales detectadas en las vistas.", "No signals detected in the views.")}</p>
      ) : (
        <div className="space-y-2">
          {withSig.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-1.5">
              <span className="min-w-[120px] font-mono text-[11px] text-[var(--color-text)]">{v.title || v.route}</span>
              {sigsOf(v).map((sg) => (
                <span key={sg.kind} title={sg.source} className={`rounded border px-1.5 py-0.5 text-[10px] ${sg.confidence === "strong" ? strongCls : "border-white/10 bg-white/5 text-[var(--color-muted)]"}`}>{sg.kind}<span className="ml-1 opacity-60">{sg.confidence === "strong" ? "●" : "○"}</span></span>
              ))}
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[var(--color-muted)]/70">{L("● evidencia directa (dep/API/tag) · ○ inferido por nombre/keyword", "● direct evidence · ○ inferred by name")}</p>
    </div>
  );
}

function Tip({ children }: { children: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-max max-w-[240px] -translate-x-1/2 whitespace-normal rounded-lg bg-black/90 px-3 py-1.5 text-center text-[11px] font-semibold leading-snug text-white opacity-0 shadow-[0_0_20px_rgba(240,164,112,0.25)] transition-all duration-200 group-hover:mt-2.5 group-hover:opacity-100">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-black/90" />
    </span>
  );
}

function FxToggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mb-1 flex items-center justify-between gap-2 text-sm">
      <span className="text-[12px] text-[var(--color-muted)]">{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[11px] text-[var(--color-muted)]">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-[var(--color-panel-2)] px-2 py-1.5 text-xs outline-none" />
    </label>
  );
}

function PresetSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="mb-2 flex items-center justify-between text-sm">
      <span className="text-[12px] text-[var(--color-muted)] font-medium">{label}</span>
      <CustomSelect 
        value={value} 
        onChange={onChange} 
        options={[{label: "Personalizado", value: ""}, ...options.map(o => ({label: o, value: o}))]} 
        className="w-32" 
      />
    </label>
  );
}

function ColorMini({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[11px] text-[var(--color-muted)]">
      {label}
      <div className="mt-1 flex items-center gap-1">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-7 w-8 shrink-0 cursor-pointer rounded border border-[var(--color-border)] bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg bg-[var(--color-panel-2)] px-2 py-1.5 text-xs outline-none" />
      </div>
    </label>
  );
}


/* ==========================================================================
   SceneSlotsStrip — franja compacta bajo el preview centrada en la ESCENA ACTIVA.
   Muestra ÚNICAMENTE lo útil y lo que está siendo usado en la escena que ves:
   cada zona (slot) activa con su componente en uso (fijado o auto-resuelto con preview),
   su estado y acciones directas (Cambiar, Fijar, Quitar, Añadir).
   ========================================================================== */
function SceneSlotsStrip({
  scene,
  samples,
  slots,
  allSlots,
  hiddenSlots,
  flags,
  css,
  font,
  lang,
  activeSlot,
  onRemove,
  onClear,
  onPick,
  onAssignExisting,
  isDraggingAny,
  onAssignDrop,
  layoutBlocks,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onOpenLinkModal,
  onOpenAddSectionModal,
  onSelectBlock,
}: {
  scene: SceneId;
  samples: Sample[];
  slots: Record<string, string>;
  allSlots: Partial<Record<SceneId, Record<string, string>>>;
  hiddenSlots: string[];
  flags: SlotFlags;
  css: string;
  font: string;
  lang: "es" | "en";
  activeSlot: string | null;
  onRemove: (id: string) => void;
  onClear: (slotId: string) => void;
  onPick: (slot: SceneSlot) => void;
  onAssignExisting: (slotId: string, componentId: string) => void;
  isDraggingAny?: boolean;
  onAssignDrop?: (slotId: string, componentId: string, compData?: ComponentDTO | Sample) => void;
  layoutBlocks?: SceneBlockInstance[];
  onMoveBlock?: (from: number, to: number) => void;
  onDuplicateBlock?: (blockId: string) => void;
  onRemoveBlock?: (blockId: string) => void;
  onOpenLinkModal?: (blockId: string) => void;
  onOpenAddSectionModal?: (atIndex?: number) => void;
  onSelectBlock?: (blockId: string) => void;
}) {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const defs = sceneSlotsResolved(scene, flags);
  const activeIds = new Set(defs.map((d) => d.id));
  const known = new Set(allSlotIdsFor(scene));
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const assignedSample = (slotId: string): Sample | undefined => {
    const id = slots?.[slotId];
    return id ? samples.find((s) => s.id === id) : undefined;
  };

  const stats = statsFromDefs(defs, slots, samples);

  const pendingDyn = Object.entries(slots)
    .filter(([sid]) => known.has(sid) && !activeIds.has(sid))
    .map(([sid, cid]) => ({ slot: dynamicSlotDef(scene, sid), comp: samples.find((s) => s.id === cid) }))
    .filter((x): x is { slot: SceneSlot; comp: Sample | undefined } => Boolean(x.slot));

  const orphans = Object.entries(slots)
    .filter(([sid]) => !known.has(sid))
    .map(([sid, cid]) => ({ slotId: sid, comp: samples.find((s) => s.id === cid) }));

  return (
    <div className={`card-surface rounded-xl p-3.5 space-y-3 transition-all ${isDraggingAny ? "ring-1 ring-[var(--color-accent)]/50 bg-[var(--color-accent)]/[0.03]" : ""}`}>
      {/* Cabecera compacta: Escena + conteo de lo usado + Botón Añadir Sección */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{L("Zonas y Estructura", "Zones & Structure")}:</span>
          <span className="text-xs font-bold text-white tracking-wide">{SCENE_LABEL[scene]}</span>
          {layoutBlocks && layoutBlocks.length > 0 && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
              {layoutBlocks.length} {L("bloques", "blocks")}
            </span>
          )}
          {isDraggingAny && (
            <span className="ml-2 rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 px-2.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)] animate-pulse">
              {L("Suelta sobre una zona para asignar", "Drop on a zone to assign")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">{stats.assigned} {L("fijados", "pinned")}</span>
            <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[var(--color-accent)]">{stats.auto} {L("automáticos", "auto")}</span>
            {stats.empty > 0 && <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-amber-300">{stats.empty} {L("vacíos", "empty")}</span>}
          </div>
          {onOpenAddSectionModal && (
            <button
              type="button"
              onClick={() => onOpenAddSectionModal()}
              className="flex items-center gap-1 rounded-lg bg-[var(--color-accent)] hover:brightness-110 text-black px-2.5 py-1 text-[11px] font-bold transition-all shadow"
            >
              <span>+</span>
              <span>{L("Añadir Sección", "Add Section")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de lo que compone la escena actual con libertad topológica */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5">
        {layoutBlocks && layoutBlocks.length > 0 ? (
          layoutBlocks.map((block, idx) => {
            const slotDef = defs.find((d) => d.id === block.type) ?? {
              id: block.id,
              label: block.label,
              expects: block.type,
              match: [block.type.toLowerCase()],
              query: block.type,
            };
            const asg = block.componentId ? samples.find((s) => s.id === block.componentId) : assignedSample(block.id);
            const autoSample = !asg ? samplesForSlot(slotDef, samples)[0] : undefined;
            const activeComp = asg || autoSample;
            const st: "assigned" | "auto" | "empty" = asg ? "assigned" : (autoSample ? "auto" : "empty");
            const isActive = activeSlot === block.id;
            const isDragOver = dragOverSlot === block.id;

            const border =
              isDragOver
                ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] bg-[var(--color-accent)]/15 scale-[1.02] shadow-[0_0_20px_rgba(240,164,112,0.3)]"
                : st === "assigned"
                ? "border-emerald-400/40 hover:border-emerald-400/60"
                : st === "auto"
                ? "border-[var(--color-accent)]/40 hover:border-[var(--color-accent)]/60"
                : "border-dashed border-amber-400/40 hover:border-amber-400/60";

            return (
              <div
                key={block.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  if (dragOverSlot !== block.id) setDragOverSlot(block.id);
                }}
                onDragLeave={() => {
                  if (dragOverSlot === block.id) setDragOverSlot(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSlot(null);
                  const compId = e.dataTransfer.getData("text/plain");
                  const compJson = e.dataTransfer.getData("application/json");
                  let compData: ComponentDTO | Sample | undefined;
                  if (compJson) {
                    try { compData = JSON.parse(compJson); } catch {}
                  }
                  if (compId && onAssignDrop) {
                    onAssignDrop(block.id, compId, compData);
                  }
                }}
                className={"flex flex-col rounded-xl border bg-black/20 overflow-hidden transition-all cursor-pointer " + border + (isActive ? " ring-2 ring-[var(--color-accent)] shadow-lg" : "")}
                onClick={() => onSelectBlock?.(block.id)}
              >
                {/* Encabezado del bloque con orden y acciones topológicas */}
                <div className="flex items-center justify-between gap-1.5 border-b border-[var(--color-border)] px-2.5 py-1.5 bg-black/30">
                  <div className="min-w-0 flex items-center gap-1.5 flex-1">
                    <span className="shrink-0 rounded bg-white/10 px-1 py-0.2 text-[9px] font-mono text-zinc-300">
                      #{idx + 1}
                    </span>
                    <span className="truncate text-xs font-semibold text-white" title={block.label}>
                      {block.label}
                    </span>
                    {(() => {
                      const actions = resolveBlockActions(block);
                      const keys = Object.keys(actions);
                      if (keys.length === 0) return null;
                      return (
                        <div className="flex items-center gap-1 shrink-0 flex-wrap">
                          {keys.slice(0, 2).map((k) => {
                            const act = actions[k];
                            let text = k === "primary" ? "CTA" : k === "secondary" ? "Sec" : k;
                            if (act.target.kind === "scene") text += ` ↗ /${act.target.sceneId}`;
                            else if (act.target.kind === "route") text += ` ↗ ${act.target.path}`;
                            else if (act.target.kind === "url") text += ` ↗ url`;
                            else if (act.target.kind === "anchor") text += ` #${act.target.blockId}`;
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenLinkModal?.(block.id);
                                }}
                                className="shrink-0 rounded border border-violet-400/50 bg-violet-400/20 px-1.5 py-0 text-[8px] font-bold text-violet-300 hover:bg-violet-400/30 transition-colors"
                                title={`${act.label || k}: ${text}`}
                              >
                                {text}
                              </button>
                            );
                          })}
                          {keys.length > 2 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenLinkModal?.(block.id);
                              }}
                              className="text-[8px] font-bold text-violet-400 font-mono hover:underline"
                              title={L("Ver todas las acciones", "View all actions")}
                            >
                              +{keys.length - 2}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Acciones de sección: subir, bajar, duplicar, enlazar, centrar, eliminar */}
                  <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {onSelectBlock && (
                      <button
                        type="button"
                        onClick={() => onSelectBlock(block.id)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-sky-500/30 text-zinc-300 hover:text-sky-200 text-[10px] transition-colors"
                        title={L("Centrar en preview", "Focus in preview")}
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="7" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      </button>
                    )}
                    {idx > 0 && onMoveBlock && (
                      <button
                        type="button"
                        onClick={() => onMoveBlock(idx, idx - 1)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/20 text-zinc-300 hover:text-white text-[10px] transition-colors"
                        title={L("Subir sección", "Move section up")}
                      >
                        ↑
                      </button>
                    )}
                    {idx < layoutBlocks.length - 1 && onMoveBlock && (
                      <button
                        type="button"
                        onClick={() => onMoveBlock(idx, idx + 1)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/20 text-zinc-300 hover:text-white text-[10px] transition-colors"
                        title={L("Bajar sección", "Move section down")}
                      >
                        ↓
                      </button>
                    )}
                    {onDuplicateBlock && (
                      <button
                        type="button"
                        onClick={() => onDuplicateBlock(block.id)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/20 text-zinc-300 hover:text-white text-[10px] transition-colors"
                        title={L("Duplicar sección", "Duplicate section")}
                      >
                        ⧉
                      </button>
                    )}
                    {onOpenLinkModal && (
                      <button
                        type="button"
                        onClick={() => onOpenLinkModal(block.id)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-violet-500/30 text-zinc-300 hover:text-violet-200 text-[10px] transition-colors"
                        title={L("Conectar con otra página", "Link to another page")}
                      >
                        ↗
                      </button>
                    )}
                    {onRemoveBlock && (
                      <button
                        type="button"
                        onClick={() => onRemoveBlock(block.id)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-red-500/30 text-zinc-400 hover:text-red-300 text-[10px] transition-colors"
                        title={L("Eliminar sección", "Remove section")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido / Mini preview o zona drop activa */}
                {isDragOver ? (
                  <div className="p-4 flex-1 flex flex-col items-center justify-center text-center bg-[var(--color-accent)]/15 border-2 border-dashed border-[var(--color-accent)] rounded-lg m-1.5 animate-pulse min-h-[90px]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                      {L("Soltar para asignar aquí", "Drop to assign here")}
                    </span>
                    <span className="text-[9px] text-white/60 mt-0.5">{block.label}</span>
                  </div>
                ) : (
                  <div className="p-2 flex-1 flex flex-col justify-between gap-2">
                    {activeComp ? (
                      <>
                        <div className="truncate text-[10px] text-[var(--color-muted)] font-mono">
                          {activeComp.name}
                        </div>
                        <div className="relative rounded-lg border border-[var(--color-border)] overflow-hidden bg-black/30">
                          <iframe
                            title={activeComp.name}
                            loading="lazy"
                            srcDoc={realDoc(activeComp, css, font)}
                            sandbox="allow-scripts"
                            scrolling="no"
                            className="h-16 w-full border-0 pointer-events-none opacity-85"
                          />
                        </div>
                        <div className="flex gap-1.5 pt-0.5">
                          {st === "auto" && (
                            <button
                              type="button"
                              onClick={() => onAssignExisting(block.id, activeComp.id)}
                              className="flex-1 rounded-md bg-[var(--color-accent)] px-2 py-1 text-[9px] font-bold uppercase text-black hover:scale-[1.02] transition-transform"
                              title={L("Fijar este componente a la sección", "Pin this component to section")}
                            >
                              {L("Fijar", "Pin")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onPick(slotDef)}
                            className="flex-1 rounded-md bg-white/10 hover:bg-[var(--color-accent)] hover:text-black px-2 py-1 text-[9px] font-bold uppercase text-white transition-colors"
                            title={L("Buscar otro en el catálogo", "Search another in catalog")}
                          >
                            {st === "assigned" ? L("Cambiar", "Change") : L("Elegir otro", "Pick other")}
                          </button>
                          {st === "assigned" && (
                            <button
                              type="button"
                              onClick={() => onClear(block.id)}
                              className="rounded-md bg-white/5 px-2 py-1 text-[9px] font-bold uppercase text-[var(--color-muted)] hover:text-red-400 transition-colors"
                              title={L("Quitar asignación fijada", "Unpin assignment")}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center py-3 text-center">
                        <p className="text-[10px] text-[var(--color-muted)] mb-2">{slotDef.expects || L("Sin componente", "No component")}</p>
                        <button
                          type="button"
                          onClick={() => onPick(slotDef)}
                          className="w-full rounded-md border border-dashed border-amber-400/40 bg-amber-400/5 px-2 py-1.5 text-[10px] font-bold uppercase text-amber-300 hover:bg-amber-400/15 transition-colors"
                        >
                          + {L("Añadir", "Add")} {block.label}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          defs.map((slot) => {
            const st = slotStateOf(slot, slots[slot.id], samples);
            const asg = assignedSample(slot.id);
            const autoSample = st === "auto" ? samplesForSlot(slot, samples)[0] : undefined;
            const activeComp = asg || autoSample;
            const isActive = activeSlot === slot.id;
            const isDragOver = dragOverSlot === slot.id;

            const border =
              isDragOver
                ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] bg-[var(--color-accent)]/15 scale-[1.02] shadow-[0_0_20px_rgba(240,164,112,0.3)]"
                : st === "assigned"
                ? "border-emerald-400/40 hover:border-emerald-400/60"
                : st === "auto"
                ? "border-[var(--color-accent)]/40 hover:border-[var(--color-accent)]/60"
                : st === "empty"
                ? "border-dashed border-amber-400/40 hover:border-amber-400/60"
                : "border-[var(--color-border)]";

            return (
              <div
                key={slot.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  if (dragOverSlot !== slot.id) setDragOverSlot(slot.id);
                }}
                onDragLeave={() => {
                  if (dragOverSlot === slot.id) setDragOverSlot(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSlot(null);
                  const compId = e.dataTransfer.getData("text/plain");
                  const compJson = e.dataTransfer.getData("application/json");
                  let compData: ComponentDTO | Sample | undefined;
                  if (compJson) {
                    try { compData = JSON.parse(compJson); } catch {}
                  }
                  if (compId && onAssignDrop) {
                    onAssignDrop(slot.id, compId, compData);
                  }
                }}
                className={"flex flex-col rounded-xl border bg-black/20 overflow-hidden transition-all " + border + (isActive ? " ring-2 ring-[var(--color-accent)] shadow-lg" : "")}
              >
                {/* Encabezado del slot */}
                <div className="flex items-center justify-between gap-1.5 border-b border-[var(--color-border)] px-2.5 py-1.5 bg-black/20">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-white">{slot.label}</span>
                    {slot.dyn && <span className="shrink-0 rounded-full border border-violet-400/40 bg-violet-400/10 px-1 py-0 text-[8px] font-bold uppercase text-violet-300">{L("din", "dyn")}</span>}
                  </div>
                  {st === "assigned" && <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-300">{L("fijado", "set")}</span>}
                  {st === "auto" && <span className="shrink-0 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[var(--color-accent)]">auto</span>}
                  {st === "empty" && <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">{L("vacío", "empty")}</span>}
                  {st === "structural" && <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[var(--color-muted)]">auto</span>}
                </div>

                {/* Contenido / Mini preview o zona drop activa */}
                {isDragOver ? (
                  <div className="p-4 flex-1 flex flex-col items-center justify-center text-center bg-[var(--color-accent)]/15 border-2 border-dashed border-[var(--color-accent)] rounded-lg m-1.5 animate-pulse min-h-[90px]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                      {L("Soltar para asignar aquí", "Drop to assign here")}
                    </span>
                    <span className="text-[9px] text-white/60 mt-0.5">{slot.label}</span>
                  </div>
                ) : (
                  <div className="p-2 flex-1 flex flex-col justify-between gap-2">
                    {activeComp ? (
                      <>
                        <div className="truncate text-[10px] text-[var(--color-muted)] font-mono">
                          {activeComp.name}
                        </div>
                        <div className="relative rounded-lg border border-[var(--color-border)] overflow-hidden bg-black/30">
                          <iframe
                            title={activeComp.name}
                            loading="lazy"
                            srcDoc={realDoc(activeComp, css, font)}
                            sandbox="allow-scripts"
                            scrolling="no"
                            className="h-16 w-full border-0 pointer-events-none opacity-85"
                          />
                        </div>
                        <div className="flex gap-1.5 pt-0.5">
                          {st === "auto" && (
                            <button
                              type="button"
                              onClick={() => onAssignExisting(slot.id, activeComp.id)}
                              className="flex-1 rounded-md bg-[var(--color-accent)] px-2 py-1 text-[9px] font-bold uppercase text-black hover:scale-[1.02] transition-transform"
                              title={L("Fijar este componente a la escena", "Pin this component to scene")}
                            >
                              {L("Fijar", "Pin")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onPick(slot)}
                            className="flex-1 rounded-md bg-white/10 hover:bg-[var(--color-accent)] hover:text-black px-2 py-1 text-[9px] font-bold uppercase text-white transition-colors"
                            title={L("Buscar otro en el catálogo", "Search another in catalog")}
                          >
                            {st === "assigned" ? L("Cambiar", "Change") : L("Elegir otro", "Pick other")}
                          </button>
                          {st === "assigned" && (
                            <button
                              type="button"
                              onClick={() => onClear(slot.id)}
                              className="rounded-md bg-white/5 px-2 py-1 text-[9px] font-bold uppercase text-[var(--color-muted)] hover:text-red-400 transition-colors"
                              title={L("Quitar asignación fijada", "Unpin assignment")}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </>
                    ) : st === "empty" ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-3 text-center">
                        <p className="text-[10px] text-[var(--color-muted)] mb-2">{slot.expects || L("Sin componente", "No component")}</p>
                        <button
                          type="button"
                          onClick={() => onPick(slot)}
                          className="w-full rounded-md border border-dashed border-amber-400/40 bg-amber-400/5 px-2 py-1.5 text-[10px] font-bold uppercase text-amber-300 hover:bg-amber-400/15 transition-colors"
                        >
                          + {L("Añadir", "Add")} {slot.label}
                        </button>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-[10px] text-[var(--color-muted)]">
                        {L("Estructural (resuelto por el layout)", "Structural (resolved by layout)")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Alertas compactas solo si hay asignaciones pendientes u huérfanas */}
      {(pendingDyn.length > 0 || orphans.length > 0) && (
        <details className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-2 text-xs">
          <summary className="cursor-pointer font-bold uppercase text-[10px] tracking-wider text-amber-300 flex items-center gap-1.5">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{L("Asignaciones pendientes de revisión", "Assignments needing review")}</span>
            </span>
            <span className="rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[9px]">{pendingDyn.length + orphans.length}</span>
          </summary>
          <div className="pt-2 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {pendingDyn.map(({ slot, comp }) => (
              <div key={slot.id} className="rounded border border-violet-400/30 bg-black/30 p-2 text-[10px]">
                <div className="font-bold text-violet-300">{slot.label} (dinámico apagado)</div>
                {comp && <div className="text-[var(--color-muted)] truncate">{comp.name}</div>}
                <button onClick={() => onClear(slot.id)} className="mt-1 text-red-400 hover:underline">{L("Descartar", "Discard")}</button>
              </div>
            ))}
            {orphans.map(({ slotId, comp }) => (
              <div key={slotId} className="rounded border border-amber-400/30 bg-black/30 p-2 text-[10px]">
                <div className="font-bold text-amber-300">{slotId} (zona retirada)</div>
                {comp && <div className="text-[var(--color-muted)] truncate">{comp.name}</div>}
                <button onClick={() => onClear(slotId)} className="mt-1 text-red-400 hover:underline">{L("Descartar", "Discard")}</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
