"use client";

import { useMemo, useState, useEffect } from "react";
import {
  compileBrand,
  getResolvedValue,
  setTokenValue,
  DEFAULT_EFFECTS,
  EFFECT_PRESETS,
  type TokenGroup,
  type EffectsConfig,
} from "@/lib/tokens";
import type { ComponentDTO, ComponentFile } from "@/lib/types";
import BrandBehavior from "./BrandBehavior";
import { PRESETS, applyPresetToDoc, type Blueprint } from "@/lib/blueprint";
import { t } from "@/lib/i18n";
import { resolveBlueprint, type ResolvedConfig } from "@/lib/resolve";
import { StatusPill, AuditDrawer } from "./BrandSynthesis";
import { SCENE_SLOTS, SCENE_LABEL, SCENE_ORDER, samplesForSlot, slotStateOf, statsFromDefs, componentUsage, categoryMatchesSlot, sceneSlotsResolved, dynamicSlotDef, allSlotIdsFor, type SceneId, type SceneSlot, type SlotFlags } from "@/lib/scenes";
import { PROJECT_TEMPLATES, applyTemplateToDoc, applyGuidedToDoc, type TemplatePart, type GuidedAnswers } from "@/lib/templates";
import { seedScenes } from "@/lib/seed";
import { TemplatesGallery } from "./TemplatesGallery";
import { GuidedSetup } from "./GuidedSetup";
import { CustomSelect } from "./CustomSelect";
import { logEvent } from "@/lib/log";
import type { RestoredBrand } from "./BrandVersions";

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
  let res = html.replace(/#(?:[0-9a-fA-F]{3,6})/gi, 'var(--color-action-primary)');
  const colors = ['blue', 'indigo', 'violet', 'purple', 'sky', 'cyan', 'teal', 'emerald', 'green', 'red', 'rose', 'pink', 'orange', 'amber', 'yellow', 'fuchsia'];
  for (const c of colors) {
    res = res.replace(new RegExp(`text-${c}-(?:[1-9]00|50)`, 'g'), 'text-[var(--color-action-primary)]');
    res = res.replace(new RegExp(`bg-${c}-(?:[1-9]00|50)`, 'g'), 'bg-[var(--color-action-primary)]');
    res = res.replace(new RegExp(`border-${c}-(?:[1-9]00|50)`, 'g'), 'border-[var(--color-action-primary)]');
    res = res.replace(new RegExp(`ring-${c}-(?:[1-9]00|50)`, 'g'), 'ring-[var(--color-action-primary)]');
    res = res.replace(new RegExp(`hover:bg-${c}-(?:[1-9]00|50)`, 'g'), 'hover:bg-[var(--color-action-primary-hover)]');
    res = res.replace(new RegExp(`hover:text-${c}-(?:[1-9]00|50)`, 'g'), 'hover:text-[var(--color-action-primary-hover)]');
  }
  return res;
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
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;color:var(--color-text);font-family:var(--font-body),system-ui,sans-serif;min-height:100vh;background-color:var(--color-bg);}
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
`;

function esc(s: string): string { return String(s).replace(/'/g, ""); }

function sceneShell(css: string, theme: "dark" | "light", body: string): string {
  return `<!doctype html><html class="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={darkMode:'class'}</script>
<style>:root{color-scheme:${theme};}${css}${SCENE_STYLES}</style>${GUARD}</head><body class="brand-bg">${body}</body></html>`;
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
  const htmlOf = (s: Sample) => brandifyHtml(s.files.find((f) => /\.html?$/i.test(f.path))?.content) || "";
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
  const wrap = (slot: SceneSlot, inner: string, clickable: boolean) => {
    const tag = `<span class="slot-tag">${esc(slot.label)} · ${esc(slot.expects)}</span>`;
    if (!clickable) return `<div class="slot">${inner}</div>`;
    return `<div class="slot slot--clickable" onclick="window.parent.postMessage({type:'SLOT_SELECT',scene:'${scene}',slot:'${slot.id}',query:'${esc(slot.query)}',label:'${esc(slot.label)}',expects:'${esc(slot.expects)}'},'*')">${tag}${inner}</div>`;
  };
  const placeholder = (slot: SceneSlot) => {
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
          ${wrap(slot, r.inner, r.clickable)}
        </div>
      </div>
    </div>`;
  };
  const renderSlot = (slot: SceneSlot): string => {
    const mode = slot.render ?? (slot.match.length === 0 ? "structural" : "persistent");
    const r = resolveInner(slot);
    if (mode === "triggered") return triggered(slot, r);
    return wrap(slot, r.inner, r.clickable);
  };
  // Fuente única de zonas de ESTA escena: base + dinámicas activas por resolvedConfig.
  const S = sceneSlotsResolved(scene, f);
  const by = (id: string) => S.find((s) => s.id === id)!;
  const hasSlot = (id: string) => S.some((s) => s.id === id);

  // Motion + densidad resueltos → afectan al lienzo (no solo colores).
  const speed = f.motion === "none" ? "0s" : f.motion === "minimal" ? "140ms" : "280ms";
  const pad = f.density === "compact" ? "14px" : f.density === "spacious" ? "30px" : "22px";
  const dynCss = `<style>.btn,.slot,.card{transition:all ${speed} ease}.card{padding:${pad}}</style>`;

  let body = "";
  if (scene === "landing") {
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
  return sceneShell(css, theme, dynCss + body);
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
  const [previewScene, setPreviewScene] = useState<SceneId>("marca");
  const [tab, setTab] = useState<"visual" | "interaccion" | "estructura" | "datos" | "seguridad" | "sugerencias">("visual");
  
  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSource, setFilterSource] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

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
  const setSlot = (path: string, value: string) => {
    setTokens((prev) => { const next = setTokenValue(prev, path, value) as Doc; setRaw(JSON.stringify(next, null, 2)); return next; });
  };
  const blueprint = ((tokens as unknown as { blueprint?: Blueprint }).blueprint) ?? {};
  const visualResolution = useMemo(() => resolveBlueprint(blueprint, brandVisualTokensForResolve(tokens)), [blueprint, tokens]);
  // Topología de slots derivada del resolvedConfig (una sola fuente para preview,
  // builder y resumen de cobertura). Decide qué zonas dinámicas existen ahora.
  const slotFlags = useMemo<SlotFlags>(() => sceneResolvedFlags(visualResolution.resolvedConfig), [visualResolution]);
  const setBpField = (path: string, value: unknown) => {
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
    setTokens((prev) => {
      const next: Doc = structuredClone(prev); const base = effectsOf(prev);
      next.effects = { ...base, [section]: { ...(base[section] as object), [key]: value } };
      setRaw(JSON.stringify(next, null, 2)); return next;
    });
  };
  const applyPreset = (presetName: string) => {
    const preset = EFFECT_PRESETS[presetName]; if (!preset) return;
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
    logEvent("component.add", { componentId: c.id, category: c.category });
    const next = [...samples, toSample(c)]; setSamples(next); patch({ previewIds: next.map((s) => s.id) });
  };
  const removeComponent = (id: string) => {
    logEvent("component.remove", { componentId: id });
    const next = samples.filter((s) => s.id !== id); setSamples(next); patch({ previewIds: next.map((s) => s.id) });
  };

  // Slots explícitos por escena: tokens.blueprint.slots[scene][slotId] = componentId
  const getSceneSlots = (scene: SceneId): Record<string, string> => {
    const bpSlots = (blueprint as { slots?: Record<string, Record<string, string>> }).slots;
    return (bpSlots && bpSlots[scene]) ? bpSlots[scene] : {};
  };
  const assignToSlot = (scene: SceneId, slotId: string, c: ComponentDTO) => {
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
  // Reutilizar un componente que YA está en la biblioteca de marca en un slot.
  const assignExistingToSlot = (scene: SceneId, slotId: string, componentId: string) => {
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
    flash("Reutilizado en esta escena.");
  };
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
  // "+ Añadir" del catálogo: si hay slot activo, asigna a ese slot; si no, añade suelto.
  const addFromCatalog = (c: ComponentDTO) => {
    if (activeSlot) { assignToSlot(activeSlot.scene, activeSlot.slot, c); flash(`Asignado a “${activeSlot.label ?? activeSlot.slot}”.`); }
    else addComponent(c);
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
      if (event.data?.type === 'SEARCH' && event.data?.query) {
        setActiveSlot(null);
        setQ(event.data.query);
        setRightPanelOpen(true);
        doSearch(false, event.data.query);
      }
      if (event.data?.type === 'SLOT_SELECT' && event.data?.slot) {
        const { scene, slot, query, label, expects } = event.data;
        logEvent("slot.select", { scene, slot });
        setActiveSlot({ scene, slot, label, expects });
        setRightPanelOpen(true);
        if (query) { setQ(query); doSearch(false, query); }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
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
    logEvent("draft.save", { previewIds: samples.length, templateId: (blueprint as Blueprint).templateId });
    const res = await fetch(`/api/brands/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, tokens, previewIds: samples.map((s) => s.id) }) });
    if (!res.ok) logEvent("error", { where: "draft.save", status: res.status });
    flash(res.ok ? "Marca guardada." : "Error al guardar.");
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
            ✦ {tr('Guiado')}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field + " w-[200px]"} />
          <button onClick={save} className="rounded-lg bg-[var(--color-panel-2)] px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors whitespace-nowrap">
            {tr('Guardar Borrador')}
          </button>
          
          <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-3">
            <StatusPill report={visualResolution.validationReport} onOpen={() => setAuditOpen(true)} />
          </div>
        </div>
      </div>

      <div className="flex gap-6 w-full items-start">
        {/* PANEL IZQUIERDO: CONTROLES (solo en vista Visual) */}
        {tab === "visual" && (leftPanelOpen ? (
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="card-surface rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--color-muted)]">{tr('Tokens semánticos')}</h2>
              <button onClick={() => setLeftPanelOpen(false)} className="text-[var(--color-muted)] hover:text-white p-1 rounded hover:bg-white/10 transition-colors" title={tr('Ocultar panel')}>
                ◀
              </button>
            </div>
            <div className="space-y-2.5">
              {SLOTS.map((s) => {
                const val = getResolvedValue(tokens, s.path) ?? "";
                return (
                  <div key={s.path} className="flex items-center gap-2">
                    <label className="w-32 shrink-0 text-xs text-[var(--color-muted)]">{tr(s.label)}</label>
                    {s.kind === "color" ? (
                      <>
                        <input type="color" value={/^#[0-9a-f]{6}$/i.test(val) ? val : "#000000"} onChange={(e) => setSlot(s.path, e.target.value)} className="h-8 w-9 shrink-0 cursor-pointer rounded border border-[var(--color-border)] bg-transparent" />
                        <input value={val} onChange={(e) => setSlot(s.path, e.target.value)} className={field + " text-xs"} />
                      </>
                    ) : s.kind === "font" ? (
                      <CustomSelect 
                        value={val} 
                        onChange={(v) => setSlot(s.path, v)} 
                        options={FONTS.map(f => ({ label: f, value: f }))} 
                        className="w-full" 
                      />
                    ) : (
                      <input value={val} onChange={(e) => setSlot(s.path, e.target.value)} className={field + " text-xs"} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

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
          </div>

          <div className="card-surface rounded-xl p-4">
            <h2 className="mb-3 text-sm font-medium text-[var(--color-muted)]">Exportar</h2>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]/70">Copiar tema</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => copy(compiled.css, "CSS")} aria-label="Copiar CSS variables" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">CSS variables<Tip>Copia las variables CSS (:root) al portapapeles.</Tip></button>
              <button onClick={() => copy(compiled.tailwind, "Tailwind")} aria-label="Copiar Tailwind @theme" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Tailwind @theme<Tip>Copia el bloque @theme de Tailwind.</Tip></button>
              <button onClick={() => copy(compiled.androidColors, "Android")} aria-label="Copiar Android XML" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Android<Tip>Copia los colores Android (XML).</Tip></button>
              <button onClick={() => copy(JSON.stringify(tokens, null, 2), "DTCG")} aria-label="Copiar DTCG JSON" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">DTCG JSON<Tip>Copia los tokens en formato DTCG (JSON).</Tip></button>
            </div>
            <p className="mt-3 mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]/70">Exportar a disco</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => exportDisk("theme")} aria-label="Exportar tema a disco" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Tema<Tip>Exporta a disco solo los tokens: CSS, Tailwind @theme, Android XML y DTCG.</Tip></button>
              <button onClick={() => exportDisk("docs")} aria-label="Exportar documentación a disco" className="group relative rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Documentación<Tip>Exporta docs legibles: README, BRAND, BLUEPRINT, DECISIONS, AGENTS y auditoría.</Tip></button>
              <button onClick={() => exportDisk("full")} aria-label="Exportar pack completo a disco" className="group relative rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold text-black hover:brightness-110">Pack completo (IA)<Tip>Contrato completo para IA/build: tokens + resolved + escenas/slots + componentes + estructura + docs. Para trazabilidad estable, exporta una versión publicada desde Estado → Versiones.</Tip></button>
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
              <BrandBehavior tab={tab} bp={blueprint} setField={setBpField} toggleArray={toggleBpArray} addIdea={addIdea} removeIdea={removeIdea} applyToRules={applyRuleLine} />
            </>
          )}

          {tab === "visual" && (<>
          {(() => {
            const _views = (blueprint as Blueprint).views ?? [];
            return _views.length ? (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{lang === "en" ? "Views" : "Vistas"}</span>
                {_views.map((v) => (
                  <button key={v.id} type="button"
                    onClick={() => { setPreviewScene(v.previewArchetype); logEvent("scene.change", { scene: v.previewArchetype }); }}
                    title={`${v.route} -> ${SCENE_LABEL[v.previewArchetype]}`}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${previewScene === v.previewArchetype ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-panel-2)] text-[var(--color-muted)] hover:text-white"}`}>
                    {v.title || v.route}
                  </button>
                ))}
                <span className="text-[10px] text-[var(--color-muted)]/70">{lang === "en" ? "preview uses each view's archetype" : "el preview usa el arquetipo de cada vista"}</span>
              </div>
            ) : null;
          })()}
          <div className="card-surface overflow-hidden rounded-xl">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-xs flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-1 rounded bg-black/30 p-1">
                {SCENE_ORDER.map((s) => [s, SCENE_LABEL[s]] as const).map(([id,label]) => (
                  <button key={id} type="button" onClick={() => { setPreviewScene(id); logEvent("scene.change", { scene: id }); }} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${previewScene === id ? "bg-[var(--color-accent)] text-black" : "text-white/50 hover:text-white"}`}>{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => seedScene(previewScene as SceneId)}
                  title={lang === 'en' ? 'Fill compatible empty zones with suggested components (auto). Editable: pin / remove / replace.' : 'Rellena zonas vacías compatibles con componentes sugeridos (auto). Editable: fijar / quitar / reemplazar.'}
                  className="rounded bg-[var(--color-panel-2)] px-2 py-0.5 text-[10px] uppercase font-bold text-[var(--color-muted)] transition-colors hover:bg-white/10 hover:text-white"
                >
                  ✦ {tr('Sembrar sugeridos')}
                </button>
                <div className="flex items-center gap-1 rounded bg-black/30 p-1">
                  <button onClick={() => applyThemeToggle("light")} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${previewTheme === "light" ? "bg-[var(--color-accent)] text-black" : "text-white/50"}`}>{tr('Claro')}</button>
                  <button onClick={() => applyThemeToggle("dark")} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${previewTheme === "dark" ? "bg-[var(--color-accent)] text-black" : "text-white/50"}`}>{tr('Oscuro')}</button>
                </div>
                <div className="flex items-center gap-1 rounded bg-black/30 p-1">
                  <button onClick={() => setPreviewViewport("mobile")} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${previewViewport === "mobile" ? "bg-[var(--color-accent)] text-black" : "text-white/50"}`}>{tr('Móvil')}</button>
                  <button onClick={() => setPreviewViewport("tablet")} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${previewViewport === "tablet" ? "bg-[var(--color-accent)] text-black" : "text-white/50"}`}>{tr('Tablet')}</button>
                  <button onClick={() => setPreviewViewport("desktop")} className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${previewViewport === "desktop" ? "bg-[var(--color-accent)] text-black" : "text-white/50"}`}>{tr('Escritorio')}</button>
                </div>
              </div>
            </div>
            <div className={`mx-auto transition-all duration-300 ${
              previewViewport === "mobile" ? "w-[375px] border-x border-[var(--color-border)]" : 
              previewViewport === "tablet" ? "w-[768px] border-x border-[var(--color-border)]" :
              "w-full"
            }`}>
              {/* Un solo motor de preview para TODAS las escenas (incl. Marca). */}
              <iframe title={`scene-${previewScene}`} loading="lazy" srcDoc={sceneDoc(previewScene as SceneId, compiled.css, previewTheme, samples, getSceneSlots(previewScene as SceneId), visualResolution.resolvedConfig, lang)} sandbox="allow-scripts" className="h-[80vh] min-h-[700px] w-full border-0 bg-[var(--color-bg)] transition-colors duration-300 rounded-b-xl" />
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

          {/* Debajo del preview: construcción de la ESCENA ACTIVA (slots + componentes). */}
          <SceneBuilder
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
            onClear={(slotId) => clearSlot(previewScene as SceneId, slotId)}
            onPick={(slot) => { setActiveSlot({ scene: previewScene as SceneId, slot: slot.id, label: slot.label, expects: slot.expects }); searchInCatalog(slot.query); }}
            onAssignExisting={(slotId, componentId) => assignExistingToSlot(previewScene as SceneId, slotId, componentId)}
          />
          </>)}
        </div>

        {/* PANEL DERECHO: CATÁLOGO (solo en vista Visual) */}
        {tab === "visual" && (rightPanelOpen ? (
        <div className="w-[320px] lg:w-[380px] shrink-0 h-[calc(100vh-120px)] sticky top-4">
          <div className="card-surface rounded-xl p-4 flex flex-col h-full">
            <div className="mb-2 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-medium text-[var(--color-muted)]">{tr('Buscador de Componentes')}</h2>
              <button onClick={() => setRightPanelOpen(false)} className="text-[var(--color-muted)] hover:text-white p-1 rounded hover:bg-white/10 transition-colors" title={tr('Ocultar panel')}>
                ▶
              </button>
            </div>
            {activeSlot && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-2 shrink-0">
                <span className="text-[11px] leading-tight text-[var(--color-text)]">
                  {tr('Añadiendo a')} <b>{activeSlot.label ?? activeSlot.slot}</b>
                  {activeSlot.expects && <span className="text-[var(--color-muted)]"> · {activeSlot.expects}</span>}
                </span>
                <button onClick={() => setActiveSlot(null)} className="ml-auto rounded-md bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:text-white" title={tr('Cancelar')}>✕</button>
              </div>
            )}
            <div className="mb-3 flex gap-2 shrink-0">
              <div className="relative flex-1">
                <input
                  value={q}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  onChange={(e) => setQ(e.target.value)}
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
                
                {/* Sugerencias de autocompletado (Fondo sólido) */}
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
            {/* Filtros avanzados desplegables */}
            {showFilters && (
              <div className="mb-4 flex gap-2 shrink-0 bg-black/20 p-2 rounded-xl border border-[var(--color-border)]">
                <CustomSelect 
                  placeholder="Fuente (Todo)"
                  value={filterSource}
                  onChange={(v) => { setFilterSource(v); setTimeout(() => doSearch(false), 50); }}
                  options={[{label: "Todo", value: ""}, {label: "Uiverse", value: "uiverse"}, {label: "HyperUI", value: "hyperui"}, {label: "Flowbite", value: "flowbite"}]}
                  className="flex-1"
                />
                <CustomSelect 
                  placeholder="Categoría (Todo)"
                  value={filterCategory}
                  onChange={(v) => { setFilterCategory(v); setTimeout(() => doSearch(false), 50); }}
                  options={[{label: "Todo", value: ""}, {label: "Buttons", value: "Buttons"}, {label: "Cards", value: "Cards"}, {label: "Inputs", value: "Inputs"}, {label: "Loaders", value: "Loaders"}]}
                  className="flex-1"
                />
                <CustomSelect 
                  placeholder="Framework (Todo)"
                  value={filterFramework}
                  onChange={(v) => { setFilterFramework(v); setTimeout(() => doSearch(false), 50); }}
                  options={[{label: "Todo", value: ""}, {label: "CSS", value: "css"}, {label: "Tailwind", value: "tailwind"}, {label: "React", value: "react"}]}
                  className="flex-1"
                />
              </div>
            )}
            {results.length > 0 ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="border-b border-[var(--color-border)] px-4 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">{lang === 'en' ? `RESULTS (${totalResults})` : `RESULTADOS (${totalResults})`}</span>
                </div>
                <div className="space-y-6 p-2">
                  {orderedResults.map(([cat, list]) => (
                    <div key={cat}>
                      <div className="text-[11px] uppercase text-[var(--color-muted)] mb-3 font-medium border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
                        <span>{cat}</span>
                        {catMatchesActiveSlot(cat) && <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-accent)]">{tr('Compatible')}</span>}
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                        {list.map((c) => (
                          <div key={c.id} className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/20 hover:border-[var(--color-accent)] transition-colors">
                            <iframe title={c.name} loading="lazy" srcDoc={realDoc(toSample(c), compiled.css, font)} sandbox="allow-scripts" scrolling="no" className="h-28 w-full border-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-1 right-1 z-10 pointer-events-auto">
                              <button onClick={() => addFromCatalog(c)} className="bg-[var(--color-accent)] text-black px-2 py-1 rounded text-[10px] font-bold shadow-lg opacity-70 hover:opacity-100 hover:scale-105 transition-all">
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
                  <div className="p-4 flex justify-center pb-8 border-t border-[var(--color-border)] mt-4">
                    <button onClick={() => doSearch(true)} className="px-4 py-2 bg-white/10 hover:bg-[var(--color-accent)] hover:text-black rounded text-[11px] font-bold transition-colors">
                      {lang === 'en' ? `Load more (${totalResults - results.length} remaining)` : `Cargar más (${totalResults - results.length} restantes)`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-60 border border-dashed border-[var(--color-border)] rounded-lg mt-2">
                <p className="text-sm font-medium mb-2 text-white">{tr('Catálogo Universal')}</p>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {lang === 'en' 
                    ? <>{`Search components (e.g. `}<em>card</em>{`, `}<em>button</em>{`). `}<br/><br/>{`If you don't search and click "Search", we'll show you a random featured selection for inspiration.`}</>
                    : <>{`Busca componentes (ej. `}<em>card</em>{`, `}<em>button</em>{`). `}<br/><br/>{`Si no buscas nada y le das a "Buscar", te mostraremos una selección aleatoria destacada para que te inspires.`}</>
                  }
                </p>
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
              Catálogo
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
      />

      <GuidedSetup open={guidedOpen} onClose={() => setGuidedOpen(false)} onApply={applyGuided} lang={lang} />
    </div>
  );
}

/* Tooltip al pasar el raton (mismo patron que los botones de la barra superior:
   group relative + burbuja negra con flecha, aparece en group-hover). */
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
   SceneBuilder — panel bajo el preview centrado en la ESCENA ACTIVA.
   Muestra las zonas (slots) de la escena con su estado (listo / vacío / auto)
   y solo los componentes relevantes a esa escena. Los slots vacíos ofrecen
   "+ Añadir" que lanza la búsqueda contextual en el catálogo de la derecha.
   (Fase 1: detección por categoría. Fase 2: asignación explícita por slot.)
   ========================================================================== */
function SceneBuilder({
  scene, samples, slots, allSlots, hiddenSlots, flags, css, font, lang, activeSlot, onRemove, onClear, onPick, onAssignExisting,
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
}) {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  // Zonas ACTIVAS ahora: base + dinámicas que el resolvedConfig ha encendido.
  const defs = sceneSlotsResolved(scene, flags);
  const activeIds = new Set(defs.map((d) => d.id));
  // Ids CONOCIDOS de la escena (base + TODOS los dinámicos): un id fuera de aquí
  // es un huérfano real (p.ej. slot renombrado). Un dinámico conocido pero inactivo
  // es un "pendiente", no un huérfano.
  const known = new Set(allSlotIdsFor(scene));
  const hidden = new Set(hiddenSlots);

  const assignedSample = (slotId: string): Sample | undefined => {
    const id = slots?.[slotId];
    return id ? samples.find((s) => s.id === id) : undefined;
  };
  const stats = statsFromDefs(defs, slots, samples);
  // Asignaciones reales de esta escena (fijados), en orden de definición de slots.
  const pinned = defs
    .map((d) => ({ slot: d, comp: assignedSample(d.id) }))
    .filter((x): x is { slot: SceneSlot; comp: Sample } => Boolean(x.comp));
  // Pendientes: asignados a una zona DINÁMICA conocida pero ahora inactiva (la
  // capacidad que la enciende está apagada). La asignación se conserva y vuelve
  // en cuanto reactives la capacidad. Nunca se borra sola.
  const pendingDyn = Object.entries(slots)
    .filter(([sid]) => known.has(sid) && !activeIds.has(sid))
    .map(([sid, cid]) => ({ slot: dynamicSlotDef(scene, sid), comp: samples.find((s) => s.id === cid) }))
    .filter((x): x is { slot: SceneSlot; comp: Sample | undefined } => Boolean(x.slot));
  // Huérfanos: asignaciones a ids desconocidos por la escena (nunca se borran solos).
  const orphans = Object.entries(slots)
    .filter(([sid]) => !known.has(sid))
    .map(([sid, cid]) => ({ slotId: sid, comp: samples.find((s) => s.id === cid) }));
  const activeSlotDef = activeSlot ? defs.find((d) => d.id === activeSlot) ?? null : null;

  return (
    <div className="card-surface rounded-xl p-4 space-y-5">
      {/* Cabecera de escena + contador fijado/auto/vacío */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
          <span className="text-[var(--color-muted)] font-medium normal-case tracking-normal">{L("Construyendo", "Building")}:</span>
          {SCENE_LABEL[scene]}
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">{stats.assigned} {L("fijado", "set")}</span>
          <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[var(--color-accent)]">{stats.auto} auto</span>
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-amber-300">{stats.empty} {L("vacío", "empty")}</span>
        </div>
      </div>

      {/* Slots de la escena */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{L("Zonas de la escena · pulsa una zona vacía en el preview o aquí", "Scene slots · click an empty zone in the preview or here")}</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {defs.map((slot) => {
            const st = slotStateOf(slot, slots[slot.id], samples);
            const asg = assignedSample(slot.id);
            const isActive = activeSlot === slot.id;
            const border =
              st === "assigned" ? "border-emerald-400/40"
              : st === "auto" ? "border-[var(--color-accent)]/40"
              : st === "empty" ? "border-dashed border-amber-400/40"
              : "border-[var(--color-border)]";
            return (
              <div key={slot.id} className={"rounded-xl border bg-black/20 p-3 " + border + (isActive ? " ring-2 ring-[var(--color-accent)]" : "")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{slot.label}</span>
                      {slot.dyn && <span className="shrink-0 rounded-full border border-violet-400/40 bg-violet-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-300" title={L("Zona dinámica: existe porque la marca activa esta capacidad.", "Dynamic zone: exists because the brand enables this capability.")}>{L("dinámico", "dynamic")}</span>}
                    </div>
                    <div className="truncate text-[11px] text-[var(--color-muted)]">{slot.expects}</div>
                  </div>
                  {st === "assigned" && <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">{L("fijado", "set")}</span>}
                  {st === "auto" && <span className="shrink-0 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-accent)]">auto</span>}
                  {st === "empty" && <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">{L("vacío", "empty")}</span>}
                  {st === "structural" && <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-muted)]">auto</span>}
                </div>

                {st === "assigned" && asg && (
                  <div className="mt-2.5">
                    <iframe title={asg.name} loading="lazy" srcDoc={realDoc(asg, css, font)} sandbox="allow-scripts" scrolling="no" className="h-20 w-full rounded-lg border border-[var(--color-border)]" />
                    <div className="mt-1.5 flex gap-1.5">
                      <button type="button" onClick={() => onPick(slot)} className="flex-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:bg-[var(--color-accent)] hover:text-black transition-colors">{L("Reemplazar", "Replace")}</button>
                      <button type="button" onClick={() => onClear(slot.id)} className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:text-red-400 transition-colors">{L("Quitar", "Remove")}</button>
                    </div>
                  </div>
                )}
                {st === "auto" && (
                  <div className="mt-2.5">
                    <p className="mb-1.5 text-[10px] leading-snug text-[var(--color-muted)]/80">{L("Relleno automático por categoría", "Auto-filled by category")} ({samplesForSlot(slot, samples).length})</p>
                    <button type="button" onClick={() => onPick(slot)} className="w-full rounded-lg border border-[var(--color-border)] bg-white/5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black">{L("Fijar componente", "Pin a component")}</button>
                  </div>
                )}
                {st === "empty" && (
                  <button type="button" onClick={() => onPick(slot)} className="mt-2.5 w-full rounded-lg border border-[var(--color-border)] bg-white/5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black">+ {L("Añadir", "Add")}</button>
                )}
                {st === "structural" && (
                  <p className="mt-2.5 text-[10px] leading-snug text-[var(--color-muted)]/80">{L("Lo resuelve el layout y los defaults.", "Resolved by layout and defaults.")}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fijados en esta escena (asignaciones reales de la escena) */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{L("Fijados en esta escena", "Pinned in this scene")}</div>
        {pinned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-black/10 px-4 py-5 text-center">
            <p className="mx-auto max-w-lg text-[12px] leading-relaxed text-[var(--color-muted)]">
              {L("Ninguna zona fijada aún. Pulsa una zona en el preview y asigna desde el catálogo o desde la biblioteca de abajo.", "No pinned zones yet. Click a zone in the preview and assign from the catalog or the library below.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {pinned.map(({ slot, comp }) => (
              <div key={slot.id} className={"group relative overflow-hidden rounded-xl border bg-black/20 " + (hidden.has(slot.id) ? "border-amber-400/40" : "border-emerald-400/30")}>
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-2.5 py-1.5">
                  <span className="truncate text-[11px] font-bold text-white">{slot.label}</span>
                  {hidden.has(slot.id)
                    ? <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300" title={L("La configuración actual oculta esta zona; la asignación se conserva.", "The current config hides this zone; the assignment is kept.")}>{L("pendiente · oculto", "pending · hidden")}</span>
                    : <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">{L("fijado", "set")}</span>}
                </div>
                <iframe title={comp.name} loading="lazy" srcDoc={realDoc(comp, css, font)} sandbox="allow-scripts" scrolling="no" className="h-28 w-full border-0" />
                <div className="flex gap-1.5 p-2">
                  <button onClick={() => onPick(slot)} className="flex-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:bg-[var(--color-accent)] hover:text-black transition-colors">{L("Reemplazar", "Replace")}</button>
                  <button onClick={() => onClear(slot.id)} className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:text-red-400 transition-colors">{L("Quitar", "Remove")}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pendientes: zonas DINÁMICAS con asignación pero ahora inactivas (capacidad apagada) */}
      {pendingDyn.length > 0 && (
        <div className="rounded-xl border border-violet-400/30 bg-violet-400/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-violet-300">
            {L("Pendiente · zonas dinámicas apagadas", "Pending · dynamic zones off")}
            <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-1.5 py-0.5 text-[9px]">{pendingDyn.length}</span>
          </div>
          <p className="mb-3 text-[11px] text-[var(--color-muted)]">{L("Estas zonas dependen de una capacidad que ahora está desactivada. Su asignación se conserva y volverá a mostrarse en cuanto reactives la capacidad. No se han borrado.", "These zones depend on a capability that is currently off. Their assignment is kept and returns as soon as you re-enable the capability. They were not deleted.")}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {pendingDyn.map(({ slot, comp }) => (
              <div key={slot.id} className="overflow-hidden rounded-xl border border-violet-400/30 bg-black/20">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-2.5 py-1.5">
                  <span className="truncate text-[11px] font-bold text-violet-100">{slot.label}</span>
                  <span className="shrink-0 rounded-full border border-violet-400/40 bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-300">{L("oculto", "hidden")}</span>
                </div>
                {comp
                  ? <iframe title={comp.name} loading="lazy" srcDoc={realDoc(comp, css, font)} sandbox="allow-scripts" scrolling="no" className="h-24 w-full border-0" />
                  : <div className="flex h-24 items-center justify-center text-[11px] text-[var(--color-muted)]">{L("componente no encontrado", "component not found")}</div>}
                <div className="p-2">
                  <button onClick={() => onClear(slot.id)} className="w-full rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:text-red-400 transition-colors">{L("Quitar asignación", "Remove assignment")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Huérfanos: asignaciones a zonas que ya no existen (requieren revisión, nunca se borran solas) */}
      {orphans.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            {L("Requiere revisión", "Needs review")}
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px]">{orphans.length}</span>
          </div>
          <p className="mb-3 text-[11px] text-[var(--color-muted)]">{L("Estas asignaciones apuntan a zonas que ya no existen en esta escena (cambió la configuración). No se han borrado.", "These assignments point to zones no longer present in this scene (config changed). They were not deleted.")}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {orphans.map(({ slotId, comp }) => (
              <div key={slotId} className="overflow-hidden rounded-xl border border-amber-400/30 bg-black/20">
                <div className="border-b border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-bold text-amber-200">{slotId}</div>
                {comp
                  ? <iframe title={comp.name} loading="lazy" srcDoc={realDoc(comp, css, font)} sandbox="allow-scripts" scrolling="no" className="h-24 w-full border-0" />
                  : <div className="flex h-24 items-center justify-center text-[11px] text-[var(--color-muted)]">{L("componente no encontrado", "component not found")}</div>}
                <div className="p-2">
                  <button onClick={() => onClear(slotId)} className="w-full rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-muted)] hover:text-red-400 transition-colors">{L("Quitar asignación", "Remove assignment")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biblioteca de marca: pool común reutilizable (las escenas solo referencian) */}
      <details className="rounded-xl border border-[var(--color-border)] bg-black/10">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
          <span>{L("Biblioteca de marca", "Brand library")}</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-muted)]">{samples.length}</span>
          <span className="font-normal normal-case tracking-normal text-[10px]">· {L("reutilizables en cualquier escena compatible", "reusable in any compatible scene")}</span>
        </summary>
        <div className="border-t border-white/10 p-3">
          {samples.length === 0 ? (
            <p className="px-1 py-4 text-center text-[12px] text-[var(--color-muted)]">{L("Aún no hay componentes en la marca. Búscalos en el catálogo de la derecha y pulsa “+ Añadir”.", "No components in the brand yet. Search the catalog on the right and click “+ Add”.")}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {samples.map((s) => {
                const usage = componentUsage(s.id, allSlots);
                const compatible = !!activeSlotDef && categoryMatchesSlot(activeSlotDef, s.category);
                return (
                  <div key={s.id} className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/20 transition-colors hover:border-[var(--color-accent)]">
                    <iframe title={s.name} loading="lazy" srcDoc={realDoc(s, css, font)} sandbox="allow-scripts" scrolling="no" className="h-28 w-full border-0" />
                    <div className="space-y-1.5 p-2">
                      <div className="truncate text-[11px] font-medium text-white">{s.name}{s.category && <span className="ml-1 text-[var(--color-muted)]">· {s.category}</span>}</div>
                      {usage.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {usage.map((u) => <span key={u.scene + u.slotId} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">{SCENE_LABEL[u.scene]}·{u.slotLabel}</span>)}
                        </div>
                      ) : <div className="text-[9px] text-[var(--color-muted)]/70">{L("sin usar", "unused")}</div>}
                      {activeSlotDef && (compatible ? (
                        <button onClick={() => onAssignExisting(activeSlotDef.id, s.id)} className="w-full rounded-md bg-[var(--color-accent)] px-2 py-1 text-[10px] font-bold uppercase text-black transition-transform hover:scale-[1.02]">+ {L("Asignar a", "Assign to")} {activeSlotDef.label}</button>
                      ) : (
                        <div className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-center text-[9px] text-[var(--color-muted)]/70">{L("no compatible con", "not compatible with")} {activeSlotDef.label}</div>
                      ))}
                    </div>
                    <button onClick={() => onRemove(s.id)} title={L("Quitar de la marca", "Remove from brand")} className="absolute right-2 top-2 z-10 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 shadow-md backdrop-blur transition hover:text-red-400 group-hover:opacity-100">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
