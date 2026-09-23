"use client";

import { useState } from "react";

export default function AuroraHeroPreview() {
  const [promptInput, setPromptInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput) return;
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedResult(
        `✓ Arquitectura generada para "${promptInput}": 4 módulos creados, autenticación configurada y despliegue edge preparado.`
      );
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="relative w-full bg-[#05060a] text-white font-sans select-none overflow-hidden min-h-[580px] flex flex-col justify-between p-6 sm:p-12">
      {/* Aurora Mesh Gradient Animated Orbs */}
      <div className="absolute top-0 left-1/4 h-80 w-80 rounded-full bg-violet-600/30 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 right-10 h-80 w-80 rounded-full bg-cyan-500/25 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-rose-500/20 blur-[120px] pointer-events-none" />

      {/* Subtle Dot Matrix Overlay */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top Pill Announcement */}
      <div className="relative z-10 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md shadow-xl hover:border-white/30 cursor-pointer transition-colors">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>Presentando Agentes Autónomos v2.0</span>
          <span className="text-cyan-400 font-bold">→</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center my-auto flex flex-col items-center">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 leading-[1.08]">
          Construye software a la velocidad del pensamiento.
        </h1>

        <p className="mt-5 max-w-2xl text-sm sm:text-base text-white/70 leading-relaxed font-normal">
          Genera, despliega y escala flujos de trabajo inteligentes con agentes autónomos sin escribir código repetitivo. Totalmente integrado con tus APIs y bases de datos.
        </p>

        {/* Interactive Floating Prompt Capsule */}
        <form
          onSubmit={handleGenerate}
          className="mt-8 w-full max-w-2xl rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-center gap-2"
        >
          <div className="flex flex-1 items-center gap-2.5 px-3 py-1 w-full">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400 shrink-0">
              <polyline points="4 17 10 11 4 5"/>
              <line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            <input
              type="text"
              placeholder="Describe tu app o flujo de trabajo (ej: Dashboard de cobros Stripe)..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-white/40 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <span className="hidden sm:inline-block rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-mono text-white/70">
              Claude 3.7 Sonnet
            </span>
            <button
              type="submit"
              disabled={isGenerating}
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-slate-100 active:scale-95 transition-all shrink-0"
            >
              {isGenerating ? "Generando..." : "Generar App ↵"}
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[11px] text-white/40">Prueba rápida:</span>
          {["Agente de cobros Stripe", "CRM en tiempo real", "Bot de soporte Slack"].map((chip) => (
            <button
              key={chip}
              onClick={() => setPromptInput(chip)}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 hover:border-cyan-400 hover:text-white transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Generation Result Banner */}
        {generatedResult && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300 font-mono text-left max-w-2xl w-full">
            {generatedResult}
          </div>
        )}
      </div>

      {/* Social Proof Marquee */}
      <div className="relative z-10 pt-6 border-t border-white/5 flex flex-col items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          CONFIADO POR EQUIPOS DE INGENIERÍA EN
        </span>
        <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-mono font-bold text-white/60">
          <span>GITHUB</span>
          <span>VERCEL</span>
          <span>SUPABASE</span>
          <span>SCALE AI</span>
          <span>LINEAR</span>
        </div>
      </div>
    </div>
  );
}
