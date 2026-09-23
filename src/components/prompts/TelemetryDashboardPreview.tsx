"use client";

import { useState } from "react";

export default function TelemetryDashboardPreview() {
  const [timeRange, setTimeRange] = useState("24h");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const logs = [
    { time: "11:58:02.140", method: "POST", endpoint: "/api/v2/agent/dispatch", status: 200, latency: "38ms", ip: "192.168.1.42" },
    { time: "11:57:59.820", method: "GET", endpoint: "/api/v2/telemetry/nodes", status: 200, latency: "14ms", ip: "10.0.4.19" },
    { time: "11:57:48.310", method: "GET", endpoint: "/api/v1/auth/session", status: 304, latency: "8ms", ip: "172.16.0.8" },
    { time: "11:57:32.905", method: "POST", endpoint: "/api/v2/vector/query", status: 200, latency: "52ms", ip: "192.168.1.42" },
    { time: "11:57:15.110", method: "DELETE", endpoint: "/api/v1/cache/purge", status: 204, latency: "19ms", ip: "10.0.2.100" },
  ];

  return (
    <div className="flex flex-col w-full bg-[#07090f] text-white p-6 font-sans select-none min-h-[580px]">
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-emerald-400">EDGE CLUSTER PRODUCTION · US-EAST-1</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Telemetría y Rendimiento en Vivo</h2>
        </div>

        {/* Time range selector */}
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-1 text-xs font-semibold">
          {["1h", "24h", "7d", "30d"].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`rounded px-3 py-1 transition-all ${
                timeRange === r ? "bg-white/20 text-white font-bold" : "text-white/60 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { label: "Peticiones API Totales", val: "4.82M", change: "+12.4%", up: true, sub: "vs periodo previo", color: "text-sky-400" },
          { label: "Latencia Promedio", val: "42ms", change: "-8.1%", up: true, sub: "Tiempo de respuesta", color: "text-emerald-400" },
          { label: "Tasa de Error Global", val: "0.012%", change: "Nominal", up: false, sub: "99.988% éxito", color: "text-amber-400" },
          { label: "Nodos Edge Activos", val: "284 / 284", change: "100%", up: true, sub: "Capacidad total", color: "text-purple-400" },
        ].map((m, idx) => (
          <div key={idx} className="rounded-xl border border-white/10 bg-[#0e111c] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{m.label}</span>
              <span className={`font-bold ${m.color}`}>{m.change}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2 font-mono">{m.val}</div>
            <div className="text-[10px] text-white/40 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Interactive Chart & Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* SVG Throughput Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#0e111c] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">Rendimiento de Carga (Throughput)</span>
              <div className="text-[10px] text-white/50 mt-0.5">Muestreo en tiempo real cada 5 segundos</div>
            </div>
            <span className="font-mono text-sky-400 font-bold">Pico: 18,400 req/s</span>
          </div>

          <div className="my-6 relative h-40 w-full flex items-end">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 600 140" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,100 Q100,20 200,60 T400,30 T600,10 L600,140 L0,140 Z"
                fill="url(#chartGlow)"
              />
              <path
                d="M0,100 Q100,20 200,60 T400,30 T600,10"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
              />
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] text-white/40 font-mono border-t border-white/5 pt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>Ahora</span>
          </div>
        </div>

        {/* Heatmap / Activity Grid (1 col) */}
        <div className="rounded-xl border border-white/10 bg-[#0e111c] p-5 flex flex-col justify-between">
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Matriz de Actividad Anual</span>
            <div className="text-[10px] text-white/50 mt-0.5">52 semanas de commits y despliegues</div>

            <div className="grid grid-cols-12 gap-1.5 mt-4">
              {Array.from({ length: 72 }).map((_, i) => {
                const levels = ["bg-white/5", "bg-emerald-900/40", "bg-emerald-600/60", "bg-emerald-400"];
                const lvl = levels[i % levels.length];
                return (
                  <div
                    key={i}
                    title={`Día ${i + 1}: ${Math.floor(Math.random() * 40)} peticiones`}
                    className={`h-3 w-3 rounded-sm ${lvl} hover:scale-125 transition-transform cursor-pointer`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-white/40 pt-4 border-t border-white/5">
            <span>Menos</span>
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-sm bg-white/5" />
              <span className="h-2 w-2 rounded-sm bg-emerald-900/40" />
              <span className="h-2 w-2 rounded-sm bg-emerald-600/60" />
              <span className="h-2 w-2 rounded-sm bg-emerald-400" />
            </div>
            <span>Más actividad</span>
          </div>
        </div>
      </div>

      {/* Live Server Logs Stream */}
      <div className="mt-6 rounded-xl border border-white/10 bg-[#0e111c] p-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">Registro de Eventos en Tiempo Real</span>
          <span className="text-emerald-400 font-mono text-[10px]">● Conexión SSE Activa</span>
        </div>

        <div className="divide-y divide-white/5 mt-2 text-xs font-mono">
          {logs.map((log, i) => (
            <div key={i} className="py-2 flex items-center justify-between gap-4 text-[11px]">
              <span className="text-white/40">{log.time}</span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  log.method === "POST" ? "bg-blue-500/20 text-blue-300" :
                  log.method === "GET" ? "bg-emerald-500/20 text-emerald-300" :
                  "bg-red-500/20 text-red-300"
                }`}
              >
                {log.method}
              </span>
              <span className="text-white/90 truncate flex-1">{log.endpoint}</span>
              <span className="text-emerald-400 font-bold">{log.status}</span>
              <span className="text-white/60">{log.latency}</span>
              <span className="text-white/40 hidden sm:inline">{log.ip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
