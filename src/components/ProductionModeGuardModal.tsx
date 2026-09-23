"use client";

import React from "react";

interface ProductionModeGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToDesign: () => void;
  actionAttempted?: string;
}

export function ProductionModeGuardModal({
  isOpen,
  onClose,
  onSwitchToDesign,
  actionAttempted = "editar o insertar componentes",
}: ProductionModeGuardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-[#121316] border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-5 flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent,#f0a470)]/15 border border-[var(--color-accent,#f0a470)]/30 flex items-center justify-center text-[var(--color-accent,#f0a470)] mb-3.5">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent,#f0a470)] font-mono mb-1">
          Modo Producción Activo
        </span>
        <h3 className="text-base font-bold text-white mb-2">
          El lienzo está en Modo de Verificación Limpia
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-6 max-w-xs">
          Para {actionAttempted}, debes cambiar al <b className="text-white">Modo Diseño</b>. Producción no permite alteraciones para garantizar una prueba de humo fiel a la exportación real.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
          <button
            type="button"
            onClick={() => {
              onSwitchToDesign();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-accent)] hover:brightness-110 font-bold text-black text-xs transition-all shadow-[0_0_20px_rgba(240,164,112,0.3)]"
          >
            Cambiar a Modo Diseño
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors"
          >
            Permanecer en Producción
          </button>
        </div>
      </div>
    </div>
  );
}
