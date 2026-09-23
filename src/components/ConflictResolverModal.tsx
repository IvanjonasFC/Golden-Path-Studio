"use client";

import React from "react";

interface ConflictOption {
  action: "replace" | "append_additional" | "adapt_content" | "cancel";
  label: string;
  description: string;
  isRecommended?: boolean;
}

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  slotLabel: string;
  existingLabel?: string;
  incomingName: string;
  options: ConflictOption[];
  onSelectOption: (action: "replace" | "append_additional" | "adapt_content" | "cancel") => void;
}

export function ConflictResolverModal({
  isOpen,
  onClose,
  title,
  description,
  slotLabel,
  existingLabel,
  incomingName,
  options,
  onSelectOption,
}: ConflictResolverModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#121316] border border-amber-500/30 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con aviso */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 text-xs"
          >
            ✕
          </button>
        </div>

        {/* Resumen de componentes */}
        <div className="p-4 grid grid-cols-2 gap-3 bg-black/30 border-b border-white/5 text-xs">
          {existingLabel && (
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Componente actual en {slotLabel}:
              </span>
              <p className="font-semibold text-zinc-300 truncate">{existingLabel}</p>
            </div>
          )}
          <div className="p-2.5 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
            <span className="text-[10px] uppercase font-bold text-[var(--color-accent)] block mb-1">
              Componente a insertar:
            </span>
            <p className="font-semibold text-white truncate">{incomingName}</p>
          </div>
        </div>

        {/* Opciones de resolución */}
        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            ¿Qué acción deseas aplicar?
          </p>
          {options.map((opt) => (
            <button
              key={opt.action}
              type="button"
              onClick={() => onSelectOption(opt.action)}
              className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                opt.isRecommended
                  ? "bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-white shadow-[0_0_15px_rgba(240,164,112,0.15)] hover:bg-[var(--color-accent)]/25"
                  : opt.action === "cancel"
                  ? "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                  : "bg-black/40 border-white/10 text-zinc-200 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{opt.label}</span>
                  {opt.isRecommended && (
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-[var(--color-accent)] text-black">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{opt.description}</p>
              </div>
              <span className="text-xs text-zinc-500 font-mono shrink-0">→</span>
            </button>
          ))}
        </div>

        {/* Pie */}
        <div className="p-3 border-t border-white/10 bg-black/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar acción
          </button>
        </div>
      </div>
    </div>
  );
}
