"use client";

import { useState } from "react";

export default function BentoGridPreview() {
  const [activeTab, setActiveTab] = useState<"api" | "webhook" | "graphql">("api");
  const [metricsCount, setMetricsCount] = useState(14820);
  const [isCopied, setIsCopied] = useState(false);

  return (
    <div className="flex flex-col w-full bg-[#07080d] text-white p-6 sm:p-10 font-sans select-none min-h-[580px]">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-bold text-sky-300 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          ARQUITECTURA DE ALTA DENSIDAD
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Potencia Extrema en Cada Dimensión
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-white/60">
          Diseñado con bordes hairline de 1px, aceleración por GPU y widgets interactivos en tiempo real.
        </p>
      </div>

      {/* 6-Column Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-6xl mx-auto w-full">
        {/* Card 1: 4 columns - Real-time Throughput with interactive counter */}
        <div className="md:col-span-4 rounded-2xl border border-white/10 bg-[#0e111c] p-6 flex flex-col justify-between hover:border-sky-400/40 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">TELEMETRÍA GLOBAL</span>
              <h3 className="text-xl font-bold text-white mt-1">Procesamiento Edge a 60 FPS</h3>
            </div>
            <button
              onClick={() => setMetricsCount((c) => c + 150)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-sky-300 hover:bg-white/10 active:scale-95"
            >
              + Simular Peticiones
            </button>
          </div>

          <div className="my-6">
            <div className="text-4xl font-black text-white font-mono tracking-tight">
              {metricsCount.toLocaleString()} <span className="text-sm font-normal text-white/50">req/seg</span>
            </div>
            {/* SVG Sparkline Curve */}
            <div className="mt-4 h-16 w-full">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 400 60">
                <defs>
                  <linearGradient id="bentoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,45 Q50,15 100,35 T200,20 T300,40 T400,10 L400,60 L0,60 Z"
                  fill="url(#bentoGrad)"
                />
                <path
                  d="M0,45 Q50,15 100,35 T200,20 T300,40 T400,10"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-3">
            <span>Latencia p99: 14ms</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Todos los nodos óptimos
            </span>
          </div>
        </div>

        {/* Card 2: 2 columns - Security & Encryption */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#0e111c] p-6 flex flex-col justify-between hover:border-purple-400/40 transition-all shadow-xl">
          <div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3 className="text-lg font-bold text-white">Encriptación E2E 256-bit</h3>
            <p className="mt-2 text-xs text-white/60 leading-relaxed">
              Tus llaves privadas nunca tocan los discos físicos. Cumplimiento SOC2 Type II y GDPR automático.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
            <span className="text-white/40">RFC 8446</span>
            <span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 font-bold">Auditado</span>
          </div>
        </div>

        {/* Card 3: 3 columns - Interactive Code Snippet */}
        <div className="md:col-span-3 rounded-2xl border border-white/10 bg-[#0e111c] p-6 flex flex-col justify-between hover:border-emerald-400/40 transition-all shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex gap-2">
                {(["api", "webhook", "graphql"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded px-2.5 py-1 text-xs font-mono font-bold uppercase ${
                      activeTab === tab ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText("await client.deploy({ instant: true });");
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="text-[10px] text-white/50 hover:text-white"
              >
                {isCopied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>

            <pre className="font-mono text-xs text-emerald-400 p-3 rounded-lg bg-black/60 overflow-x-auto leading-relaxed">
              {activeTab === "api" && `const res = await vault.dispatch({\n  event: "user.synced",\n  target: "cluster-us-east"\n});`}
              {activeTab === "webhook" && `app.on("webhook.received", (ctx) => {\n  ctx.verifyHMAC(signature);\n  ctx.commit();\n});`}
              {activeTab === "graphql" && `query GetMetrics {\n  telemetry(range: "1h") {\n    p99Latency\n    activeNodes\n  }\n}`}
            </pre>
          </div>

          <div className="text-xs text-white/40 pt-2">SDK disponible en TypeScript, Python y Go</div>
        </div>

        {/* Card 4: 3 columns - Design System & Tokens */}
        <div className="md:col-span-3 rounded-2xl border border-white/10 bg-[#0e111c] p-6 flex flex-col justify-between hover:border-amber-400/40 transition-all shadow-xl">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">DISEÑO Y MARCA</span>
            <h3 className="text-lg font-bold text-white mt-1">Variables y Tokens Semánticos</h3>
            <p className="mt-2 text-xs text-white/60 leading-relaxed">
              Sincronización instantánea con Figma Variables y Tailwind CSS v4. Cambia de tema sin recargar el DOM.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 pt-3 border-t border-white/5">
            <div className="flex -space-x-2">
              {["#38bdf8", "#818cf8", "#f43f5e", "#10b981", "#f59e0b"].map((c, i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-full border-2 border-[#0e111c] shadow"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="text-xs text-white/60 font-mono">140+ Tokens sincronizados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
