"use client";

import { useMemo, useState, useEffect } from "react";
import { getResolvedValue, type TokenGroup } from "@/lib/tokens";
import {
  getContrastRatio,
  suggestAccessibleColor,
  checkButtonContrast,
  simulateHex,
  adjustLightness,
  type PairAudit,
  type DeficiencyType,
} from "@/lib/contrast";

interface WcagLiveAuditorProps {
  tokens: TokenGroup;
  onApplyFix?: (path: string, newValue: string) => void;
  onApplyMultipleFixes?: (fixes: Array<{ path: string; value: string }>) => void;
  visionFilter?: DeficiencyType;
  onVisionFilterChange?: (filter: DeficiencyType) => void;
}

export default function WcagLiveAuditor({
  tokens,
  onApplyFix,
  onApplyMultipleFixes,
  visionFilter = "normal",
  onVisionFilterChange,
}: WcagLiveAuditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"matrix" | "sandbox" | "simulation">("matrix");
  const [fixedKey, setFixedKey] = useState<string | null>(null);

  // Par expandido para edición manual directa en "Pares"
  const [editingPairId, setEditingPairId] = useState<string | null>(null);
  const [editFg, setEditFg] = useState<string>("#ffffff");
  const [editBg, setEditBg] = useState<string>("#050505");

  // Estado del Sandbox Libre con controles manuales
  const [sandboxFg, setSandboxFg] = useState<string>("#ffffff");
  const [sandboxBg, setSandboxBg] = useState<string>("#7b4c30");
  const [sandboxSaveFgTarget, setSandboxSaveFgTarget] = useState<string>("color.text");
  const [sandboxSaveBgTarget, setSandboxSaveBgTarget] = useState<string>("color.action.primary");

  // Extraer valores resueltos de los tokens clave
  const bg = getResolvedValue(tokens, "color.bg") || "#050505";
  const surface = getResolvedValue(tokens, "color.surface") || "#0b0b0f";
  const text = getResolvedValue(tokens, "color.text") || "#f2f2f5";
  const muted = getResolvedValue(tokens, "color.muted") || "#a0a0a0";
  const primary = getResolvedValue(tokens, "color.action.primary") || "#f0a470";
  const accent = getResolvedValue(tokens, "color.action.accent") || "#f4ae7c";
  const fontHeading = getResolvedValue(tokens, "font.heading") || "Space Grotesk";

  // Inicializar sandbox con valores actuales al montar
  useEffect(() => {
    setSandboxFg(text);
    setSandboxBg(primary);
  }, [text, primary]);

  // Diagnóstico para botones
  const buttonDiag = useMemo(() => checkButtonContrast(primary), [primary]);

  // Lista de los 7 pares de accesibilidad esenciales
  const pairs: PairAudit[] = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      desc: string;
      fgPath: string;
      bgPath: string;
      fg: string;
      bg: string;
      target: number;
    }> = [
      {
        id: "text_bg",
        name: "Texto / Fondo",
        desc: "color.text vs color.bg",
        fgPath: "color.text",
        bgPath: "color.bg",
        fg: text,
        bg: bg,
        target: 7.0,
      },
      {
        id: "text_surface",
        name: "Texto / Tarjeta",
        desc: "color.text vs color.surface",
        fgPath: "color.text",
        bgPath: "color.surface",
        fg: text,
        bg: surface,
        target: 7.0,
      },
      {
        id: "muted_bg",
        name: "Atenuado / Fondo",
        desc: "color.muted vs color.bg",
        fgPath: "color.muted",
        bgPath: "color.bg",
        fg: muted,
        bg: bg,
        target: 4.5,
      },
      {
        id: "muted_surface",
        name: "Atenuado / Tarjeta",
        desc: "color.muted vs color.surface",
        fgPath: "color.muted",
        bgPath: "color.surface",
        fg: muted,
        bg: surface,
        target: 4.5,
      },
      {
        id: "action_bg",
        name: "Botón / Fondo",
        desc: "color.action.primary vs color.bg",
        fgPath: "color.action.primary",
        bgPath: "color.bg",
        fg: primary,
        bg: bg,
        target: 3.0,
      },
      {
        id: "button_text",
        name: "Texto en Botón",
        desc: "Texto sobre botón primario",
        fgPath: buttonDiag.bestColor === "#ffffff" ? "color.text" : "color.bg",
        bgPath: "color.action.primary",
        fg: buttonDiag.bestColor,
        bg: primary,
        target: 4.5,
      },
      {
        id: "accent_surface",
        name: "Acento / Tarjeta",
        desc: "color.action.accent vs color.surface",
        fgPath: "color.action.accent",
        bgPath: "color.surface",
        fg: accent,
        bg: surface,
        target: 4.5,
      },
    ];

    return list.map((item) => {
      const contrast = getContrastRatio(item.fg, item.bg);
      const suggestedFg =
        contrast.ratio < item.target
          ? suggestAccessibleColor(item.fg, item.bg, item.target, "fg")
          : undefined;

      return {
        id: item.id,
        name: item.name,
        description: item.desc,
        fgPath: item.fgPath,
        bgPath: item.bgPath,
        fgColor: item.fg,
        bgColor: item.bg,
        contrast,
        suggestedFg,
      };
    });
  }, [text, bg, surface, muted, primary, accent, buttonDiag]);

  // Al abrir la edición de un par, inicializar valores
  const handleToggleEditPair = (p: PairAudit) => {
    if (editingPairId === p.id) {
      setEditingPairId(null);
    } else {
      setEditingPairId(p.id);
      setEditFg(p.fgColor);
      setEditBg(p.bgColor);
    }
  };

  // Contraste en vivo del par en edición manual
  const editingContrast = useMemo(() => {
    return getContrastRatio(editFg, editBg);
  }, [editFg, editBg]);

  // Sugerencias dinámicas para el par en edición
  const activeEditingPair = useMemo(() => {
    return pairs.find((p) => p.id === editingPairId);
  }, [pairs, editingPairId]);

  const editSuggestedFg = useMemo(() => {
    return suggestAccessibleColor(editFg, editBg, 7.0, "fg");
  }, [editFg, editBg]);

  const editSuggestedBg = useMemo(() => {
    return suggestAccessibleColor(editFg, editBg, 7.0, "bg");
  }, [editFg, editBg]);

  // Métricas
  const nonAaaPairs = pairs.filter((p) => p.contrast.ratio < 7.0 && p.suggestedFg);
  const passingAaCount = pairs.filter((p) => p.contrast.passesAaNormal || p.contrast.ratio >= 4.5).length;
  const passingAaaCount = pairs.filter((p) => p.contrast.passesAaaNormal || p.contrast.ratio >= 7.0).length;
  const allPassAaa = passingAaaCount === pairs.length;

  const handleFix = (path: string, suggested: string, key: string) => {
    if (onApplyFix) {
      onApplyFix(path, suggested);
      setFixedKey(key);
      setTimeout(() => setFixedKey(null), 2000);
    }
  };

  const handleSaveBothEdited = (fgPath: string, bgPath: string, key: string) => {
    if (onApplyMultipleFixes) {
      onApplyMultipleFixes([
        { path: fgPath, value: editFg },
        { path: bgPath, value: editBg },
      ]);
    } else if (onApplyFix) {
      onApplyFix(fgPath, editFg);
      onApplyFix(bgPath, editBg);
    }
    setFixedKey(key);
    setTimeout(() => setFixedKey(null), 2000);
  };

  const handleCertifyAllAaa = () => {
    const fixes: Array<{ path: string; value: string }> = [];
    for (const p of pairs) {
      if (p.contrast.ratio < 7.0 && p.suggestedFg) {
        fixes.push({ path: p.fgPath, value: p.suggestedFg });
      }
    }
    if (fixes.length === 0) return;

    if (onApplyMultipleFixes) {
      onApplyMultipleFixes(fixes);
    } else if (onApplyFix) {
      fixes.forEach((f) => onApplyFix(f.path, f.value));
    }
    setFixedKey("all_done");
    setTimeout(() => setFixedKey(null), 2500);
  };

  // Sandbox data manual
  const sandboxContrast = useMemo(() => getContrastRatio(sandboxFg, sandboxBg), [sandboxFg, sandboxBg]);
  const sandboxSuggestedFg = useMemo(() => suggestAccessibleColor(sandboxFg, sandboxBg, 7.0, "fg"), [sandboxFg, sandboxBg]);
  const sandboxSuggestedBg = useMemo(() => suggestAccessibleColor(sandboxFg, sandboxBg, 7.0, "bg"), [sandboxFg, sandboxBg]);

  // Diagnóstico de impacto bajo la deficiencia visual seleccionada
  const visionDeficiency = visionFilter;
  const simulatedPairs = useMemo(() => {
    if (visionDeficiency === "normal") return [];
    return pairs.map((p) => {
      const simFg = simulateHex(p.fgColor, visionDeficiency);
      const simBg = simulateHex(p.bgColor, visionDeficiency);
      const simContrast = getContrastRatio(simFg, simBg);
      const diffRatio = Math.round((simContrast.ratio - p.contrast.ratio) * 10) / 10;
      return {
        ...p,
        simFg,
        simBg,
        simContrast,
        diffRatio,
        dropsNoticeably: diffRatio < -0.8 || (!simContrast.passesAaNormal && p.contrast.passesAaNormal),
      };
    });
  }, [pairs, visionDeficiency]);

  return (
    <div className="card-surface rounded-xl border border-white/10 p-3 shadow-sm max-w-full overflow-hidden">
      {/* Cabecera compacta */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="m4.93 4.93 4.24 4.24" />
            <path d="m14.83 9.17 4.24-4.24" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-white truncate">
            WCAG 2.2
          </span>
          <span className="text-[9px] font-mono text-zinc-400">A+AA Baseline</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {passingAaCount === pairs.length ? (
            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 font-mono">
              AA ✓ {allPassAaa ? "· 100% AAA" : `· ${passingAaaCount}/${pairs.length} AAA`}
            </span>
          ) : (
            <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 font-mono">
              {pairs.length - passingAaCount} fallos AA
            </span>
          )}

          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="mt-2.5 flex flex-col gap-2 pt-2 border-t border-white/5">
          {/* Definición normativa WCAG 2.2 */}
          <div className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400">● Baseline exigible: A + AA</span>
              <span className="text-zinc-500 font-mono">4.5:1 texto · 3.0:1 UI</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-violet-300">○ Objetivo avanzado: AAA</span>
              <span className="text-zinc-500 font-mono">7.0:1 cuando aplique</span>
            </div>
          </div>
          {/* Pestañas de modo */}
          <div className="grid grid-cols-3 gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[10px]">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`py-1 rounded font-semibold transition-colors ${
                activeTab === "matrix" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              Pares ({pairs.length})
            </button>
            <button
              onClick={() => setActiveTab("sandbox")}
              className={`py-1 rounded font-semibold transition-colors ${
                activeTab === "sandbox" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              Probador
            </button>
            <button
              onClick={() => setActiveTab("simulation")}
              className={`py-1 rounded font-semibold transition-colors ${
                activeTab === "simulation" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              Visión {visionFilter !== "normal" && "•"}
            </button>
          </div>

          {/* Botón rápido si hay ajustes pendientes en la pestaña matriz */}
          {!allPassAaa && onApplyFix && activeTab === "matrix" && (
            <button
              onClick={handleCertifyAllAaa}
              className="w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{fixedKey === "all_done" ? "Ajustes Guardados" : `Auto-Ajustar ${nonAaaPairs.length} a AAA`}</span>
            </button>
          )}

          {/* ========================================================
              PESTAÑA 1: PARES CON EDICIÓN MANUAL DIRECTA
              ======================================================== */}
          {activeTab === "matrix" && (
            <div className="flex flex-col gap-1.5 max-w-full">
              <div className="text-[10px] text-white/50 px-1">
                Haz clic en cualquier par para cambiar colores manualmente o guardar:
              </div>

              {pairs.map((p) => {
                const passesAaa = p.contrast.passesAaaNormal || p.contrast.ratio >= 7.0;
                const passesAa = p.contrast.passesAaNormal || p.contrast.ratio >= 4.5;
                const isEditing = editingPairId === p.id;

                const displayFg = simulateHex(p.fgColor, visionFilter);
                const displayBg = simulateHex(p.bgColor, visionFilter);

                return (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-lg border transition-all overflow-hidden ${
                      isEditing
                        ? "bg-black/40 border-sky-500/40 shadow-sm"
                        : "bg-black/20 hover:bg-white/5 border-white/5"
                    }`}
                  >
                    {/* Fila principal clicable */}
                    <div
                      onClick={() => handleToggleEditPair(p)}
                      className="flex items-center justify-between gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <div
                          className="h-5 w-5 rounded shrink-0 flex items-center justify-center text-[9px] font-bold shadow-inner border border-white/15"
                          style={{ backgroundColor: displayBg, color: displayFg, fontFamily: fontHeading }}
                        >
                          Aa
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-white/90 truncate leading-tight">
                            {p.name}
                          </span>
                          <span className="text-[9px] text-white/40 font-mono truncate leading-tight">
                            {p.fgColor} / {p.bgColor}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-mono font-bold text-white">
                          {p.contrast.ratio.toFixed(1)}
                        </span>

                        {passesAaa ? (
                          <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 text-[8px] font-bold font-mono">
                            AAA
                          </span>
                        ) : passesAa ? (
                          <span className="rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1 py-0.2 text-[8px] font-bold font-mono">
                            AA
                          </span>
                        ) : (
                          <span className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.2 text-[8px] font-bold font-mono">
                            FAIL
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleEditPair(p)}
                          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${
                            isEditing
                              ? "bg-sky-500/30 text-sky-200 border border-sky-500/50"
                              : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                          }`}
                        >
                          {isEditing ? "Cerrar" : "Cambiar"}
                        </button>
                      </div>
                    </div>

                    {/* Editor Manual Desplegable para este par */}
                    {isEditing && (
                      <div className="p-2.5 pt-1.5 border-t border-white/10 bg-black/50 flex flex-col gap-2.5">
                        {/* Control para Color de Texto (FG) */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-white/80 font-medium truncate">
                              Texto: <span className="font-mono text-sky-300">{p.fgPath}</span>
                            </span>
                            <div className="flex items-center gap-1 font-mono text-[9px] shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditFg(adjustLightness(editFg, -10))}
                                className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70"
                                title="Oscurecer texto"
                              >-10%</button>
                              <button
                                type="button"
                                onClick={() => setEditFg(adjustLightness(editFg, 10))}
                                className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70"
                                title="Aclarar texto"
                              >+10%</button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={/^#[0-9a-f]{6}$/i.test(editFg) ? editFg : "#ffffff"}
                              onChange={(e) => setEditFg(e.target.value)}
                              className="h-6 w-7 shrink-0 cursor-pointer rounded border border-white/20 bg-transparent"
                            />
                            <input
                              value={editFg}
                              onChange={(e) => setEditFg(e.target.value)}
                              className="flex-1 rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white outline-none border border-white/10"
                            />
                            {onApplyFix && (
                              <button
                                type="button"
                                onClick={() => handleFix(p.fgPath, editFg, `fg_${p.id}`)}
                                className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-[9px] font-bold text-black hover:opacity-90 transition-opacity whitespace-nowrap"
                              >
                                {fixedKey === `fg_${p.id}` ? "OK" : "Guardar"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Control para Color de Fondo (BG) */}
                        <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-white/80 font-medium truncate">
                              Fondo: <span className="font-mono text-sky-300">{p.bgPath}</span>
                            </span>
                            <div className="flex items-center gap-1 font-mono text-[9px] shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditBg(adjustLightness(editBg, -10))}
                                className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70"
                                title="Oscurecer fondo"
                              >-10%</button>
                              <button
                                type="button"
                                onClick={() => setEditBg(adjustLightness(editBg, 10))}
                                className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70"
                                title="Aclarar fondo"
                              >+10%</button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={/^#[0-9a-f]{6}$/i.test(editBg) ? editBg : "#000000"}
                              onChange={(e) => setEditBg(e.target.value)}
                              className="h-6 w-7 shrink-0 cursor-pointer rounded border border-white/20 bg-transparent"
                            />
                            <input
                              value={editBg}
                              onChange={(e) => setEditBg(e.target.value)}
                              className="flex-1 rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white outline-none border border-white/10"
                            />
                            {onApplyFix && (
                              <button
                                type="button"
                                onClick={() => handleFix(p.bgPath, editBg, `bg_${p.id}`)}
                                className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-[9px] font-bold text-black hover:opacity-90 transition-opacity whitespace-nowrap"
                              >
                                {fixedKey === `bg_${p.id}` ? "OK" : "Guardar"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Previsualización en vivo del ratio resultante */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-white/60">Ratio:</span>
                            <span className="font-bold text-white text-[11px]">{editingContrast.ratioFormatted}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold font-mono ${
                              editingContrast.grade === 'AAA'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : editingContrast.grade === 'AA'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {editingContrast.grade}
                            </span>
                          </div>

                          {/* Botón para guardar ambos a la vez */}
                          {onApplyFix && (
                            <button
                              type="button"
                              onClick={() => handleSaveBothEdited(p.fgPath, p.bgPath, `both_${p.id}`)}
                              className="rounded bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white transition-colors"
                            >
                              {fixedKey === `both_${p.id}` ? "Guardados" : "Guardar Ambos"}
                            </button>
                          )}
                        </div>

                        {/* Asistentes de ajuste automático en 1 clic */}
                        {editingContrast.ratio < 7.0 && (
                          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/5">
                            {editSuggestedFg && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditFg(editSuggestedFg);
                                  handleFix(p.fgPath, editSuggestedFg, `fg_${p.id}`);
                                }}
                                className="rounded border border-amber-400/30 bg-amber-400/10 py-1 text-[9px] font-bold text-amber-300 hover:bg-amber-400/20 truncate px-1 text-center"
                              >
                                Auto Texto ({editSuggestedFg})
                              </button>
                            )}
                            {editSuggestedBg && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditBg(editSuggestedBg);
                                  handleFix(p.bgPath, editSuggestedBg, `bg_${p.id}`);
                                }}
                                className="rounded border border-sky-400/30 bg-sky-400/10 py-1 text-[9px] font-bold text-sky-300 hover:bg-sky-400/20 truncate px-1 text-center"
                              >
                                Auto Fondo ({editSuggestedBg})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================
              PESTAÑA 2: PROBADOR MANUAL (LABORATORIO DE COLOR)
              ======================================================== */}
          {activeTab === "sandbox" && (
            <div className="flex flex-col gap-2.5">
              <div className="text-[10px] text-white/50 px-1">
                Prueba cualquier combinación libremente con el selector de color o importa tokens:
              </div>

              {/* Controles para Color de Texto (FG) */}
              <div className="flex flex-col gap-1 rounded-lg bg-black/25 p-2 border border-white/5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/80 font-semibold">Color de Texto (FG)</span>
                  <div className="flex items-center gap-1 font-mono text-[9px]">
                    <button type="button" onClick={() => setSandboxFg(adjustLightness(sandboxFg, -10))} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70">-10%</button>
                    <button type="button" onClick={() => setSandboxFg(adjustLightness(sandboxFg, 10))} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70">+10%</button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(sandboxFg) ? sandboxFg : "#ffffff"}
                    onChange={(e) => setSandboxFg(e.target.value)}
                    className="h-7 w-8 shrink-0 cursor-pointer rounded border border-white/20 bg-transparent"
                  />
                  <input
                    value={sandboxFg}
                    onChange={(e) => setSandboxFg(e.target.value)}
                    className="flex-1 rounded bg-white/5 px-2 py-1 text-[11px] font-mono text-white outline-none border border-white/10"
                    placeholder="#ffffff"
                  />
                  <select
                    onChange={(e) => {
                      const v = getResolvedValue(tokens, e.target.value);
                      if (v) setSandboxFg(v);
                    }}
                    className="rounded bg-white/5 px-1 py-1 text-[10px] text-white/70 outline-none border border-white/10 font-mono"
                    defaultValue=""
                  >
                    <option value="" disabled>Token…</option>
                    <option value="color.text">text</option>
                    <option value="color.muted">muted</option>
                    <option value="color.action.primary">primary</option>
                    <option value="color.action.accent">accent</option>
                  </select>
                </div>
              </div>

              {/* Botón para intercambiar colores FG ⇄ BG */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={() => {
                    const temp = sandboxFg;
                    setSandboxFg(sandboxBg);
                    setSandboxBg(temp);
                  }}
                  className="rounded-full bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-0.5 text-[9px] font-mono font-semibold text-white/80 flex items-center gap-1 transition-colors"
                  title="Intercambiar color de texto y fondo"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m7 15 5 5 5-5" />
                    <path d="m7 9 5-5 5 5" />
                  </svg>
                  <span>Invertir FG ⇄ BG</span>
                </button>
              </div>

              {/* Controles para Color de Fondo (BG) */}
              <div className="flex flex-col gap-1 rounded-lg bg-black/25 p-2 border border-white/5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/80 font-semibold">Color de Fondo (BG)</span>
                  <div className="flex items-center gap-1 font-mono text-[9px]">
                    <button type="button" onClick={() => setSandboxBg(adjustLightness(sandboxBg, -10))} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70">-10%</button>
                    <button type="button" onClick={() => setSandboxBg(adjustLightness(sandboxBg, 10))} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 rounded text-white/70">+10%</button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(sandboxBg) ? sandboxBg : "#000000"}
                    onChange={(e) => setSandboxBg(e.target.value)}
                    className="h-7 w-8 shrink-0 cursor-pointer rounded border border-white/20 bg-transparent"
                  />
                  <input
                    value={sandboxBg}
                    onChange={(e) => setSandboxBg(e.target.value)}
                    className="flex-1 rounded bg-white/5 px-2 py-1 text-[11px] font-mono text-white outline-none border border-white/10"
                    placeholder="#000000"
                  />
                  <select
                    onChange={(e) => {
                      const v = getResolvedValue(tokens, e.target.value);
                      if (v) setSandboxBg(v);
                    }}
                    className="rounded bg-white/5 px-1 py-1 text-[10px] text-white/70 outline-none border border-white/10 font-mono"
                    defaultValue=""
                  >
                    <option value="" disabled>Token…</option>
                    <option value="color.bg">bg</option>
                    <option value="color.surface">surface</option>
                    <option value="color.action.primary">primary</option>
                  </select>
                </div>
              </div>

              {/* Muestra tipográfica e interactiva con los colores manuales */}
              <div
                className="rounded-lg border border-white/15 p-3 flex flex-col gap-2 transition-colors shadow-inner"
                style={{ backgroundColor: sandboxBg }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase font-bold" style={{ color: sandboxFg }}>
                    Ratio {sandboxContrast.ratioFormatted}
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                    style={{ color: sandboxFg, borderColor: sandboxFg }}
                  >
                    {sandboxContrast.grade}
                  </span>
                </div>

                <div
                  className="text-sm font-bold leading-tight"
                  style={{ color: sandboxFg, fontFamily: fontHeading }}
                >
                  Texto de Titular
                </div>

                <p className="text-[10px] leading-relaxed opacity-90" style={{ color: sandboxFg }}>
                  Párrafo secundario. Ajusta manualmente con los selectores de color o los botones de luminosidad.
                </p>

                {/* Componente botón interactivo de muestra */}
                <div className="pt-1 flex items-center gap-2">
                  <div
                    className="rounded px-2.5 py-1 text-[10px] font-bold shadow-sm"
                    style={{ backgroundColor: sandboxFg, color: sandboxBg }}
                  >
                    Botón de Muestra
                  </div>
                  <div
                    className="rounded px-2 py-0.5 text-[9px] font-mono border"
                    style={{ color: sandboxFg, borderColor: sandboxFg }}
                  >
                    Etiqueta UI
                  </div>
                </div>
              </div>

              {/* Asistentes opcionales de auto-ajuste si el usuario los quiere */}
              {sandboxContrast.ratio < 7.0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {sandboxSuggestedFg && (
                    <button
                      type="button"
                      onClick={() => setSandboxFg(sandboxSuggestedFg)}
                      className="rounded border border-amber-400/30 bg-amber-400/10 py-1 text-[9px] font-bold text-amber-300 hover:bg-amber-400/20 truncate px-1 text-center"
                    >
                      Auto Texto AAA ({sandboxSuggestedFg})
                    </button>
                  )}
                  {sandboxSuggestedBg && (
                    <button
                      type="button"
                      onClick={() => setSandboxBg(sandboxSuggestedBg)}
                      className="rounded border border-sky-400/30 bg-sky-400/10 py-1 text-[9px] font-bold text-sky-300 hover:bg-sky-400/20 truncate px-1 text-center"
                    >
                      Auto Fondo AAA ({sandboxSuggestedBg})
                    </button>
                  )}
                </div>
              )}

              {/* Acciones explícitas para guardar Texto o Fondo en la marca */}
              {onApplyFix && (
                <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                  <span className="text-[10px] text-white/70 font-semibold">Guardar colores probados en la marca:</span>
                  
                  {/* Guardar Texto */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/50 w-12 shrink-0">Texto:</span>
                    <select
                      value={sandboxSaveFgTarget}
                      onChange={(e) => setSandboxSaveFgTarget(e.target.value)}
                      className="flex-1 rounded bg-white/5 px-2 py-1 text-[10px] text-white outline-none border border-white/10 font-mono"
                    >
                      <option value="color.text">color.text (Texto Principal)</option>
                      <option value="color.muted">color.muted (Atenuado)</option>
                      <option value="color.action.primary">color.action.primary (Botón)</option>
                      <option value="color.action.accent">color.action.accent (Acento)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyFix(sandboxSaveFgTarget, sandboxFg);
                        setFixedKey("save_fg");
                        setTimeout(() => setFixedKey(null), 2000);
                      }}
                      className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-bold text-black hover:opacity-90 whitespace-nowrap"
                    >
                      {fixedKey === "save_fg" ? "OK" : "Guardar"}
                    </button>
                  </div>

                  {/* Guardar Fondo */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/50 w-12 shrink-0">Fondo:</span>
                    <select
                      value={sandboxSaveBgTarget}
                      onChange={(e) => setSandboxSaveBgTarget(e.target.value)}
                      className="flex-1 rounded bg-white/5 px-2 py-1 text-[10px] text-white outline-none border border-white/10 font-mono"
                    >
                      <option value="color.action.primary">color.action.primary (Botón)</option>
                      <option value="color.bg">color.bg (Fondo)</option>
                      <option value="color.surface">color.surface (Tarjeta)</option>
                      <option value="color.action.accent">color.action.accent (Acento)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyFix(sandboxSaveBgTarget, sandboxBg);
                        setFixedKey("save_bg");
                        setTimeout(() => setFixedKey(null), 2000);
                      }}
                      className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-bold text-black hover:opacity-90 whitespace-nowrap"
                    >
                      {fixedKey === "save_bg" ? "OK" : "Guardar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              PESTAÑA 3: VISIÓN / DALTONISMO CON UTILIDAD REAL
              ======================================================== */}
          {activeTab === "simulation" && (
            <div className="flex flex-col gap-2.5">
              <div className="text-[10px] text-white/50 px-1">
                Simula cómo perciben tu marca usuarios con diferentes condiciones de daltonismo:
              </div>

              {/* Segmented selector de visión */}
              <div className="grid grid-cols-5 gap-0.5 text-center text-[9px] font-medium bg-black/30 p-0.5 rounded-lg border border-white/5">
                {[
                  { id: "normal", label: "Normal" },
                  { id: "protanopia", label: "Protan" },
                  { id: "deuteranopia", label: "Deutan" },
                  { id: "tritanopia", label: "Tritan" },
                  { id: "achromatopsia", label: "Gris" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onVisionFilterChange && onVisionFilterChange(item.id as DeficiencyType)}
                    className={`py-1 rounded transition-colors ${
                      visionFilter === item.id
                        ? "bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Estado de la simulación en lienzo */}
              {onVisionFilterChange && (
                <div className="rounded-lg bg-sky-500/10 border border-sky-500/25 p-2 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold text-white truncate">
                      {visionFilter === "normal" ? "Lienzo en Visión Normal" : `Simulando: ${visionFilter}`}
                    </span>
                    <span className="text-[9px] text-white/60 truncate">
                      {visionFilter === "normal"
                        ? "Haz clic en una opción arriba para ver el lienzo filtrado"
                        : "El producto central aplica este filtro visual en tiempo real"}
                    </span>
                  </div>
                  {visionFilter !== "normal" && (
                    <button
                      type="button"
                      onClick={() => onVisionFilterChange("normal")}
                      className="rounded bg-sky-500 px-2 py-1 text-[9px] font-bold text-black hover:bg-sky-400 shrink-0 transition-colors"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              )}

              {/* Muestra comparativa inmediata del botón primario */}
              <div className="rounded-lg bg-black/30 border border-white/5 p-2 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-white/70">Comparativa Botón Primario:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center gap-1 rounded bg-black/40 p-2 border border-white/5">
                    <span className="text-[9px] text-white/40">Visión Estándar</span>
                    <div
                      className="rounded px-2.5 py-1 text-[10px] font-bold text-center w-full truncate shadow-sm"
                      style={{ backgroundColor: primary, color: buttonDiag.bestColor }}
                    >
                      Acción
                    </div>
                    <span className="text-[8px] font-mono text-white/40">{primary}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 rounded bg-black/40 p-2 border border-sky-500/20">
                    <span className="text-[9px] text-sky-300">
                      {visionFilter === "normal" ? "Simulación" : visionFilter}
                    </span>
                    <div
                      className="rounded px-2.5 py-1 text-[10px] font-bold text-center w-full truncate shadow-sm"
                      style={{
                        backgroundColor: simulateHex(primary, visionFilter === "normal" ? "protanopia" : visionFilter),
                        color: simulateHex(buttonDiag.bestColor, visionFilter === "normal" ? "protanopia" : visionFilter),
                      }}
                    >
                      Acción
                    </div>
                    <span className="text-[8px] font-mono text-sky-300/60">
                      {simulateHex(primary, visionFilter === "normal" ? "protanopia" : visionFilter)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnóstico real de pérdida de contraste bajo esta deficiencia */}
              {visionFilter !== "normal" && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-white/70">
                    Diagnóstico de Contraste ({visionFilter}):
                  </span>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
                    {simulatedPairs.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-1.5 rounded text-[10px] border ${
                          p.dropsNoticeably
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-black/20 border-white/5 text-white/80"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div
                            className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: p.simBg }}
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[9px] shrink-0">
                          <span className="text-white/40">{p.contrast.ratio.toFixed(1)}</span>
                          <span>→</span>
                          <span className="font-bold">{p.simContrast.ratio.toFixed(1)}</span>
                          <span className={`px-1 rounded text-[8px] font-bold ${
                            p.simContrast.grade === 'FAIL'
                              ? 'bg-red-500/20 text-red-400'
                              : p.simContrast.grade === 'AAA'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-sky-500/20 text-sky-400'
                          }`}>
                            {p.simContrast.grade}
                          </span>
                          {/* Auto-ajuste para corregir contraste deficiente */}
                          {p.simContrast.grade === 'FAIL' && onApplyFix && p.suggestedFg && (
                            <button
                              type="button"
                              onClick={() => handleFix(p.fgPath, p.suggestedFg!, `sim_${p.id}`)}
                              className="ml-1 px-1.5 py-0.2 rounded bg-amber-400/20 hover:bg-amber-400/40 text-amber-300 text-[8px] font-bold font-sans"
                              title="Ajustar contraste accesible para esta condición"
                            >
                              {fixedKey === `sim_${p.id}` ? "OK" : "Ajustar"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
