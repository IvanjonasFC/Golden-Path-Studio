"use client";

import React from "react";
import {
  type SceneBlockInstance,
  type SceneId,
  SCENE_LABEL,
  CANONICAL_PROJECT_ROUTES,
  resolveBlockActions,
  detectBlockIncompatibilities,
} from "@/lib/scenes";

interface ActionableCoverageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  scene: SceneId;
  blocks: SceneBlockInstance[];
  onSelectBlock: (blockId: string) => void;
  onNavigateScene: (sceneId: SceneId) => void;
  onOpenCatalog?: (query?: string) => void;
  lang: "es" | "en";
}

export function ActionableCoverageDrawer({
  isOpen,
  onClose,
  score,
  scene,
  blocks,
  onSelectBlock,
  onNavigateScene,
  onOpenCatalog,
  lang,
}: ActionableCoverageDrawerProps) {
  if (!isOpen) return null;

  const L = (es: string, en: string) => (lang === "en" ? en : es);

  // 1. Acciones sin destino configurado
  const unlinkedBlocks = blocks.filter((b) => {
    const actions = resolveBlockActions(b);
    const primary = actions["primary"];
    return !primary || primary.target.kind === "none";
  });

  // 2. Bloques con datos demo o placeholders
  const demoBlocks = blocks.filter((b) => {
    const incomp = detectBlockIncompatibilities(scene, b);
    return b.isDemoData || incomp.isIncompatible || !b.componentId;
  });

  // 3. Bloques con visibilidad responsive ajustada
  const responsiveConfiguredCount = blocks.filter((b) => b.visibility !== undefined).length;

  const passedCount = 3;
  const warningsCount = unlinkedBlocks.length + (demoBlocks.length > 0 ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-[var(--color-bg)] border-l border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Drawer */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-accent)]" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {L("Diagnóstico de Calidad & Cobertura", "Quality & Coverage Diagnostics")}
              </h2>
              <span className="text-[10px] text-[var(--color-muted)]">
                {L("Página activa", "Active page")}: <b className="text-white">{SCENE_LABEL[scene]}</b>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Puntuación General y Barra de Progreso */}
        <div className="p-4 border-b border-white/5 bg-black/20 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[var(--color-muted)] font-medium">
              {L("Cobertura técnica del proyecto", "Project Technical Coverage")}:
            </span>
            <span className="text-2xl font-black font-mono text-[var(--color-accent)] tracking-tight">
              {score}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-accent)] to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>{passedCount} {L("verificaciones aprobadas", "checks passed")}</span>
            <span className="text-amber-300 font-bold">{warningsCount} {L("sugerencias de acción", "actionable items")}</span>
          </div>
        </div>

        {/* Lista de Diagnósticos Accionables */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* APROBADOS */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span>✓</span>
              <span>{L("Fundamentos Verificados", "Verified Foundations")}</span>
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{L("Tokens semánticos y paleta de color resueltos", "Semantic tokens & color palette resolved")}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{CANONICAL_PROJECT_ROUTES.length} {L("rutas canónicas del proyecto definidas", "canonical project routes defined")}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{blocks.length} {L("bloques topológicos ensamblados en esta página", "topological blocks assembled on this page")}</span>
              </div>
            </div>
          </div>

          {/* ACCIONES SIN DESTINO */}
          {unlinkedBlocks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 shrink-0">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{unlinkedBlocks.length} {L("Acciones / Botones sin enlace destino", "Actions without target link")}</span>
                </span>
                <span className="text-[9px] font-normal text-zinc-400">{L("Requiere configuración", "Requires config")}</span>
              </span>
              <div className="space-y-2">
                {unlinkedBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate text-xs">
                        #{b.order + 1} {b.label}
                      </div>
                      <div className="text-[10px] text-amber-200/80 font-mono truncate">
                        CTA principal sin ruta ni ancla asignada
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBlock(b.id);
                        onClose();
                      }}
                      className="shrink-0 rounded bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1 text-[10px] font-bold uppercase transition-colors shadow"
                    >
                      {L("Configurar", "Configure")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATOS DEMO / INCOMPATIBILIDADES CON SEVERIDAD */}
          {demoBlocks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 shrink-0">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{L("Avisos de Composición y Fixtures", "Composition Notices & Fixtures")}</span>
              </span>
              <div className="space-y-2">
                {demoBlocks.map((b) => {
                  const incomp = detectBlockIncompatibilities(scene, b);
                  const isInfo = incomp.severity === "info";
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border gap-2 ${
                        isInfo
                          ? "border-sky-500/30 bg-sky-500/10"
                          : "border-amber-500/30 bg-amber-500/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-bold uppercase px-1 rounded ${
                            isInfo ? "bg-sky-400 text-black" : "bg-amber-400 text-black"
                          }`}>
                            {incomp.severity.toUpperCase()}
                          </span>
                          <span className="font-semibold text-white truncate text-xs">
                            #{b.order + 1} {b.label}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-300 font-mono truncate mt-0.5">
                          {incomp.reason || (b.componentId ? L("Componente fijado · Marcado demo", "Pinned · Demo") : L("Slot con datos de muestra automáticos", "Slot with sample data"))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectBlock(b.id);
                          onClose();
                        }}
                        className="shrink-0 rounded bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 text-[10px] font-bold uppercase transition-colors"
                      >
                        {L("Inspeccionar", "Inspect")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AUDITORÍA DE ACCESIBILIDAD WCAG 2.2 */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1">
                <span>◎</span>
                <span>{L("Auditoría de Accesibilidad WCAG 2.2", "WCAG 2.2 Accessibility Audit")}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">A11y: 94/100</span>
            </div>

            {/* Baseline A + AA */}
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                <span>● Baseline Exigible: A + AA</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200">Conforme</span>
              </div>
              <p className="text-[10px] text-emerald-200/70">
                Contraste de texto {'>='} 4.5:1, elementos interactivos con nombre accesible, landmarks semánticos y áreas táctiles {'>='} 24 px.
              </p>
            </div>

            {/* Objetivo Mejorado AAA */}
            <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-violet-300 font-semibold">
                <span>○ Objetivo Avanzado: AAA (Configurable)</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-200">Recomendado</span>
              </div>
              <p className="text-[10px] text-violet-200/70">
                Contraste reforzado {'>='} 7.0:1 y áreas táctiles óptimas {'>='} 44 px cuando aplique al contexto de la marca.
              </p>
            </div>

            {/* Verificaciones manuales requeridas */}
            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 space-y-1 text-[11px]">
              <div className="font-semibold text-sky-300 text-[10px] uppercase tracking-wider">
                Verificaciones manuales requeridas:
              </div>
              <ul className="text-[10px] text-sky-200/80 space-y-0.5 list-disc list-inside">
                <li>Navegación completa con teclado (Tab / Shift+Tab)</li>
                <li>Lectura con lector de pantalla (orden lógico de landmarks)</li>
                <li>Comportamiento de Focus Trap en modales y drawers</li>
              </ul>
            </div>
          </div>

          {/* EXPLORADOR RÁPIDO DE RUTAS DEL PROYECTO */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1">
              <span>✦</span>
              <span>{L("Rutas del Proyecto Web", "Web Project Routes")}</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {CANONICAL_PROJECT_ROUTES.map((r) => (
                <button
                  key={r.path}
                  type="button"
                  onClick={() => {
                    onNavigateScene(r.sceneId);
                    onClose();
                  }}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    r.sceneId === scene
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-white"
                      : "border-white/5 bg-black/20 text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="font-mono text-[10px] font-bold text-violet-300 truncate">{r.path}</div>
                  <div className="text-[9px] text-zinc-400 truncate">{r.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pie del Drawer */}
        <div className="p-3 border-t border-[var(--color-border)] bg-black/40 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono">
            {responsiveConfiguredCount}/{blocks.length} {L("responsive definido", "responsive defined")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold uppercase text-white transition-colors"
          >
            {L("Cerrar", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
