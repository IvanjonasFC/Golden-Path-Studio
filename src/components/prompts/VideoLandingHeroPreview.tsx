"use client";

import { useState, useRef } from "react";

interface PromptItem {
  id: string;
  title: string;
  category: string;
  type?: string;
  description?: string | null;
  thumbnail?: string | null;
  animatedVideo?: string | null;
  hasPrompt?: boolean;
  prompt?: string | null;
  source?: string;
}

export default function VideoLandingHeroPreview({ item }: { item: PromptItem }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // States for interactive travel
  const [origin, setOrigin] = useState("Madrid (MAD)");
  const [dest, setDest] = useState("Tokyo (HND)");
  const [flightClass, setFlightClass] = useState("Business");
  const [travelSearched, setTravelSearched] = useState(false);

  // States for Neurolink memorial
  const [candlesCount, setCandlesCount] = useState(142);
  const [candleLit, setCandleLit] = useState(false);
  const [tributeText, setTributeText] = useState("");
  const [tributesList, setTributesList] = useState([
    { name: "Familia Vance", text: "Tu luz sigue inspirando cada paso de nuestro camino.", time: "Hace 10 min" },
    { name: "Dr. Alexander Chen", text: "Un mentor inigualable y una mente brillante.", time: "Hace 1 hora" },
    { name: "Sarah & Leo", text: "Siempre en nuestros corazones y en nuestras memorias.", time: "Hace 3 horas" },
  ]);

  // States for Easytax & Fintech
  const [annualIncome, setAnnualIncome] = useState(85000);
  const [deductions, setDeductions] = useState<string[]>(["home_office", "software"]);
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");

  // States for ClarionAI
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponses, setAiResponses] = useState([
    { role: "assistant", text: "Hola. El motor multimodal de ClarionAI está listo. ¿Qué arquitectura o flujo deseas analizar?" },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // States for Velora Supercars
  const [selectedCar, setSelectedCar] = useState(0);
  const cars = [
    { name: "Porsche 911 GT3 RS", hp: "525 CV", accel: "3.2s", top: "296 km/h", price: 850, img: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80" },
    { name: "Ferrari SF90 Stradale", hp: "1000 CV", accel: "2.5s", top: "340 km/h", price: 1650, img: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=800&auto=format&fit=crop&q=80" },
    { name: "McLaren 720S Performance", hp: "720 CV", accel: "2.9s", top: "341 km/h", price: 1200, img: "https://images.unsplash.com/photo-1621135802920-133df287f89c?w=800&auto=format&fit=crop&q=80" },
  ];

  // States for Spotlight photo
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const photoContainerRef = useRef<HTMLDivElement>(null);

  // General Tabs
  const [activeTourTab, setActiveTourTab] = useState(0);
  const [subEmail, setSubEmail] = useState("");
  const [subSuccess, setSubSuccess] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!photoContainerRef.current) return;
    const rect = photoContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSpotlightPos({ x, y });
  };

  const t = (item.title + " " + (item.category || "") + " " + (item.description || "")).toLowerCase();
  const isTravel = t.includes("travel") || t.includes("flight") || t.includes("airline") || t.includes("travora");
  const isNeurolink = t.includes("neuro") || t.includes("memorial");
  const isFintech = t.includes("tax") || t.includes("easytax") || t.includes("crypto") || t.includes("fintech") || t.includes("bank");
  const isClarion = t.includes("clarion") || t.includes("ai") || t.includes("plety") || t.includes("agent");
  const isAutomotive = t.includes("velora") || t.includes("car") || t.includes("auto") || t.includes("vehicle");
  const isPhoto = t.includes("photo") || t.includes("light") || t.includes("camera") || t.includes("stories in light");

  // Calculations for Fintech
  const calculatedDeductionsTotal = deductions.length * 3200;
  const taxableIncome = Math.max(0, annualIncome - calculatedDeductionsTotal);
  const taxOwed = taxableIncome * 0.22;
  const taxSaved = calculatedDeductionsTotal * 0.22;
  const netIncome = annualIncome - taxOwed;

  return (
    <div className="relative w-full bg-[#05070d] text-white font-sans overflow-hidden select-none">
      {/* 1. TOP BRAND HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070d]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/20 font-black text-xs text-white">
              {item.title.charAt(0)}
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase">
                {item.title.split(" ")[0]}
              </span>
              <span className="text-[10px] ml-2 px-2 py-0.5 rounded bg-white/10 text-white/70 font-semibold">
                {item.category}
              </span>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-6 text-xs font-semibold text-white/70">
            <span className="text-white hover:text-white cursor-pointer">Experiencia</span>
            <span className="hover:text-white cursor-pointer">Módulos</span>
            <span className="hover:text-white cursor-pointer">Especificaciones</span>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Demo
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN HERO WITH REAL BACKGROUND VIDEO */}
      <section className="relative min-h-[500px] sm:min-h-[580px] flex flex-col justify-between overflow-hidden px-6 py-12 border-b border-white/10">
        {/* Real Video Integration */}
        {item.animatedVideo ? (
          <video
            ref={videoRef}
            src={item.animatedVideo}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-45 scale-105"
          />
        ) : item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-40 scale-105"
          />
        ) : null}

        {/* Ambient Dark Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-[#05070d]/75 to-[#05070d]/30 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,7,13,0.85)_100%)] pointer-events-none" />

        {/* Video Overlay Controls */}
        <div className="relative z-20 flex justify-end gap-2 max-w-7xl mx-auto w-full">
          {item.animatedVideo && (
            <>
              <button
                onClick={togglePlay}
                className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-bold text-white hover:bg-black/80"
              >
                {isPlaying ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    <span>Pausar Vídeo</span>
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <span>Reanudar Vídeo</span>
                  </>
                )}
              </button>
              <button
                onClick={toggleMute}
                className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-bold text-white hover:bg-black/80"
              >
                {isMuted ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
                    <span>Vídeo Silenciado</span>
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    <span>Audio Activo</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Hero Title & Subtitle */}
        <div className="relative z-10 max-w-3xl mx-auto text-center my-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-md mb-4 shadow-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            {item.category.toUpperCase()} · RECURSO PREMIUM
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-white">
            {item.title}
          </h1>

          <p className="mt-4 max-w-xl text-sm sm:text-base text-white/80 leading-relaxed font-normal">
            {item.description || "Diseño visual de alta fidelidad con micro-interacciones cinematográficas optimizado para producción en Next.js y Tailwind CSS."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#interactive-tool"
              className="rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-black shadow-xl hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
            >
              Probar Módulo Interactivo ↓
            </a>
            <button
              onClick={() => {
                if (item.prompt) {
                  navigator.clipboard.writeText(item.prompt);
                  alert("Prompt copiado al portapapeles");
                }
              }}
              className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-md px-6 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Copiar Prompt Técnico
            </button>
          </div>
        </div>

        {/* Scroll down tip */}
        <div className="relative z-10 text-center pt-4 text-xs text-white/40">
          ↓ Interactúa con las funciones en vivo de este producto a continuación
        </div>
      </section>

      {/* 3. PRODUCT-SPECIFIC INTERACTIVE MODULE */}
      <section id="interactive-tool" className="py-12 px-6 max-w-7xl mx-auto">
        {/* A. TRAVEL / FLIGHTS / AIRLINES */}
        {isTravel && (
          <div className="flex flex-col gap-6 rounded-2xl border border-sky-500/30 bg-[#081324] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase">MOTOR DE RESERVA EN TIEMPO REAL</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Buscador y Disponibilidad de Vuelos</h3>
              </div>
              <div className="flex gap-2">
                {["Economy", "Business", "First Class"].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setFlightClass(cls)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                      flightClass === cls ? "bg-sky-400 text-black font-bold" : "bg-white/5 text-white/70"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-white/50">Origen</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-white/50">Destino</label>
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sky-300 font-semibold outline-none focus:border-sky-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-white/50">Fechas</label>
                <input
                  type="text"
                  defaultValue="24 Oct 2026 - 31 Oct 2026"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setTravelSearched(true)}
                  className="w-full rounded-lg bg-sky-400 py-2.5 text-xs font-bold text-black hover:bg-sky-300 active:scale-95 transition-all shadow-lg"
                >
                  Buscar Rutas y Tarifas ↵
                </button>
              </div>
            </div>

            {travelSearched ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-emerald-300">✓ Vuelo Directo Confirmado</div>
                  <div className="text-sm font-bold text-white mt-0.5">{origin} ➔ {dest} ({flightClass})</div>
                  <div className="text-xs text-white/60">Salida 08:30 · Boeing 787-9 Dreamliner · Wi-Fi de alta velocidad incluido</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-black text-white">{flightClass === "Business" ? "$1,420" : "$680"}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">Tasas incluidas</div>
                  </div>
                  <button className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-300">
                    Elegir Asiento
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { city: "Tokyo, Haneda", code: "HND", price: "$680", direct: "Directo · 12h" },
                  { city: "New York, JFK", code: "JFK", price: "$490", direct: "Directo · 8h" },
                  { city: "Reykjavik, Islandia", code: "KEF", price: "$320", direct: "Directo · 4h" },
                ].map((c) => (
                  <div
                    key={c.code}
                    onClick={() => {
                      setDest(c.city);
                      setTravelSearched(true);
                    }}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-sky-400 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between text-xs font-bold text-white/60">
                      <span>{c.code}</span>
                      <span className="text-sky-400">{c.price}</span>
                    </div>
                    <div className="font-bold text-white mt-1 text-sm">{c.city}</div>
                    <div className="text-[10px] text-white/40 mt-1">{c.direct}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* B. NEUROLINK MEMORIAL */}
        {isNeurolink && (
          <div className="flex flex-col gap-6 rounded-2xl border border-amber-500/30 bg-[#0d1017] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase">SANTUARIO VIRTUAL CONMEMORATIVO</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Donde las Memorias Viven por Siempre</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCandlesCount((c) => c + 1);
                    setCandleLit(true);
                  }}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    candleLit
                      ? "bg-amber-400 text-black shadow-lg shadow-amber-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/></svg>
                  <span>{candleLit ? "Homenaje Registrado" : "Dejar un Homenaje"}</span>
                  <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px]">{candlesCount}</span>
                </button>
              </div>
            </div>

            {/* Dedications Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 flex flex-col gap-3">
                <span className="text-xs font-bold uppercase text-white/60">Muro de Homenajes Recientes</span>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {tributesList.map((tr, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs">
                      <div className="flex justify-between items-center text-amber-300/90 font-bold mb-1">
                        <span>{tr.name}</span>
                        <span className="text-[10px] text-white/40 font-normal">{tr.time}</span>
                      </div>
                      <p className="text-white/80 italic">"{tr.text}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase">Añadir Tributo</span>
                  <textarea
                    rows={3}
                    placeholder="Escribe unas palabras para honrar su memoria..."
                    value={tributeText}
                    onChange={(e) => setTributeText(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white outline-none focus:border-amber-400 resize-none"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!tributeText) return;
                    setTributesList([
                      { name: "Tú", text: tributeText, time: "Justo ahora" },
                      ...tributesList,
                    ]);
                    setTributeText("");
                  }}
                  className="mt-3 w-full rounded-lg bg-amber-400 py-2 text-xs font-bold text-black hover:bg-amber-300"
                >
                  Publicar Homenaje
                </button>
              </div>
            </div>
          </div>
        )}

        {/* C. EASYTAX / FINTECH */}
        {isFintech && (
          <div className="flex flex-col gap-6 rounded-2xl border border-emerald-500/30 bg-[#06170f] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase">SIMULADOR FISCAL INTELIGENTE</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Optimización Automática de Deducciones</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrency("USD")}
                  className={`rounded px-2.5 py-1 text-xs font-bold ${currency === "USD" ? "bg-emerald-400 text-black" : "bg-white/10 text-white"}`}
                >
                  USD ($)
                </button>
                <button
                  onClick={() => setCurrency("EUR")}
                  className={`rounded px-2.5 py-1 text-xs font-bold ${currency === "EUR" ? "bg-emerald-400 text-black" : "bg-white/10 text-white"}`}
                >
                  EUR (€)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-white/70">Ingreso Bruto Anual</span>
                    <span className="text-emerald-400 text-sm">
                      {currency === "USD" ? "$" : "€"}
                      {annualIncome.toLocaleString("en-US")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30000}
                    max={250000}
                    step={5000}
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-white/70 uppercase">Deducciones Aplicables</span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { id: "home_office", label: "Espacio de Teletrabajo ($3,200)", amt: 3200 },
                      { id: "software", label: "Software & Licencias ($3,200)", amt: 3200 },
                      { id: "pension", label: "Plan de Pensiones ($3,200)", amt: 3200 },
                      { id: "crypto", label: "Compensación Pérdidas ($3,200)", amt: 3200 },
                    ].map((d) => {
                      const isSel = deductions.includes(d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => {
                            if (isSel) setDeductions(deductions.filter((x) => x !== d.id));
                            else setDeductions([...deductions, d.id]);
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs ${
                            isSel ? "border-emerald-400 bg-emerald-500/20 text-white font-semibold" : "border-white/10 bg-white/5 text-white/60"
                          }`}
                        >
                          <span>{isSel ? "☑" : "☐"}</span>
                          <span>{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Real-time Tax Results */}
              <div className="rounded-xl border border-emerald-500/30 bg-black/50 p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-white/50">Cálculo de Ahorro</span>
                  <div className="mt-3">
                    <div className="text-[11px] text-white/60">Impuesto Estimado:</div>
                    <div className="text-2xl font-black text-white">${taxOwed.toFixed(0)}</div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[11px] text-white/60">Ahorro Fiscal en Deducciones:</div>
                    <div className="text-xl font-black text-emerald-400">+${taxSaved.toFixed(0)}</div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[11px] text-white/60">Sueldo Neto Limpio:</div>
                    <div className="text-2xl font-black text-sky-400">${netIncome.toFixed(0)}</div>
                  </div>
                </div>
                <button className="mt-4 w-full rounded-lg bg-emerald-400 py-2 text-xs font-bold text-black hover:bg-emerald-300">
                  Exportar Declaración ↵
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D. CLARIONAI / PLETY */}
        {isClarion && (
          <div className="flex flex-col gap-6 rounded-2xl border border-purple-500/30 bg-[#10091d] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase">CAPA DE INTELIGENCIA CLARION</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Terminal Multimodal y Transcripción</h3>
              </div>
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                {isPlayingAudio ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    <span>Pausar Audio</span>
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <span>Escuchar Transcripción</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chat Terminal */}
              <div className="rounded-xl border border-white/10 bg-black/60 p-4 flex flex-col justify-between min-h-[280px]">
                <div className="flex flex-col gap-2.5 max-h-52 overflow-y-auto">
                  {aiResponses.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-xs leading-relaxed ${
                        msg.role === "assistant"
                          ? "bg-purple-950/40 border border-purple-500/30 text-purple-200"
                          : "bg-white/10 text-white self-end ml-8"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="p-2 text-xs text-purple-400 animate-pulse font-mono">
                      ClarionAI está sintetizando respuesta...
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                  <input
                    type="text"
                    placeholder="Haz una pregunta o pide una estructura de código..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && aiPrompt) {
                        const userText = aiPrompt;
                        setAiResponses([...aiResponses, { role: "user", text: userText }]);
                        setAiPrompt("");
                        setAiLoading(true);
                        setTimeout(() => {
                          setAiResponses((prev) => [
                            ...prev,
                            { role: "assistant", text: `Respuesta instantánea para "${userText}": Flujo generado con latencia de 38ms y cobertura de casos extremos.` },
                          ]);
                          setAiLoading(false);
                        }, 600);
                      }
                    }}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={() => {
                      if (!aiPrompt) return;
                      const userText = aiPrompt;
                      setAiResponses([...aiResponses, { role: "user", text: userText }]);
                      setAiPrompt("");
                      setAiLoading(true);
                      setTimeout(() => {
                        setAiResponses((prev) => [
                          ...prev,
                          { role: "assistant", text: `Respuesta instantánea para "${userText}": Flujo generado con latencia de 38ms y cobertura de casos extremos.` },
                        ]);
                        setAiLoading(false);
                      }, 600);
                    }}
                    className="rounded-lg bg-purple-500 px-4 py-2 text-xs font-bold text-white hover:bg-purple-400"
                  >
                    Enviar
                  </button>
                </div>
              </div>

              {/* Transcription & Audio Waveform */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-white/60 uppercase">Transcripción Neural en Vivo</span>
                  <div className="mt-3 flex items-center gap-1.5 h-12 bg-white/5 rounded-lg px-3 border border-white/10">
                    {[40, 65, 30, 90, 80, 50, 70, 95, 30, 60, 85, 40, 75, 90, 50, 60, 30, 80].map((h, idx) => (
                      <span
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          isPlayingAudio ? "bg-purple-400 animate-pulse" : "bg-white/20"
                        }`}
                        style={{ height: isPlayingAudio ? `${h}%` : "30%" }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-white/80 font-mono leading-relaxed bg-black/60 p-3 rounded-lg border border-white/5">
                    "11:04 AM — El sistema ha reconocido la firma espectral de voz. Precisión del modelo: 99.82%. Convertido a texto sin pérdidas."
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/5 text-xs text-white/50">
                  <span>Modelo: Whisper Turbo v3</span>
                  <span className="text-emerald-400 font-bold">● En Directo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* E. VELORA SUPERCARS */}
        {isAutomotive && (
          <div className="flex flex-col gap-6 rounded-2xl border border-red-500/30 bg-[#140808] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-red-400 uppercase">FLOTA EXCLUSIVA VELORA</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Selección de Vehículo y Reserva Inmediata</h3>
              </div>
              <div className="text-xs text-white/50">Tarifas por día con seguro a todo riesgo</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cars.map((car, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedCar(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedCar === idx
                      ? "border-red-500 bg-red-950/30 shadow-xl"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div>
                    <div className="aspect-[16/10] rounded-lg overflow-hidden mb-3 border border-white/10">
                      <img src={car.img} alt={car.name} className="w-full h-full object-cover" />
                    </div>
                    <h4 className="text-base font-bold text-white">{car.name}</h4>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-white/10 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-white/40">Potencia</div>
                        <div className="font-bold text-red-300">{car.hp}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/40">0-100</div>
                        <div className="font-bold text-white">{car.accel}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/40">Vel. Max</div>
                        <div className="font-bold text-white">{car.top}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-black text-white">${car.price}</span>
                      <span className="text-xs text-white/50">/día</span>
                    </div>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        selectedCar === idx ? "bg-red-500 text-white" : "bg-white/10 text-white"
                      }`}
                    >
                      {selectedCar === idx ? "Seleccionado ✓" : "Elegir"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* F. STORIES IN LIGHT PHOTO SPOTLIGHT */}
        {isPhoto && (
          <div
            ref={photoContainerRef}
            onMouseMove={handleMouseMove}
            className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0c0908] p-8 text-white min-h-[380px] flex flex-col justify-between cursor-crosshair select-none"
          >
            {/* Spotlight Beam Tracking Cursor */}
            <div
              className="pointer-events-none absolute -inset-full opacity-50 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle 260px at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(245, 158, 11, 0.45) 0%, transparent 80%)`,
              }}
            />

            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-sm font-bold tracking-widest text-amber-400 uppercase">STORIES IN LIGHT STUDIO</span>
              <span className="text-xs font-semibold text-white/50">Mueve el cursor para iluminar la fotografía con lente anamórfica</span>
            </div>

            <div className="relative z-10 my-auto text-center max-w-xl mx-auto py-6">
              <h3 className="text-3xl font-black text-white sm:text-4xl tracking-tight">Historias Reveladas por la Luz</h3>
              <p className="mt-3 text-xs text-white/70 leading-relaxed">
                Cada disparo captura la esencia de un instante irrepetible. Explora nuestra colección curada con máscara dinámica de iluminación.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button className="rounded-full bg-amber-500 px-6 py-2.5 text-xs font-bold text-black hover:bg-amber-400">
                  Ver Colección Completa
                </button>
                <button className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-semibold text-white hover:bg-white/10">
                  Agendar Sesión Privada
                </button>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/10">
              <span>Resolución Nativa 8K · Ópticas Master Prime</span>
              <span>Galería Interactiva con Aceleración GPU</span>
            </div>
          </div>
        )}

        {/* G. GENERAL FALLBACK FEATURE TOUR */}
        {!isTravel && !isNeurolink && !isFintech && !isClarion && !isAutomotive && !isPhoto && (
          <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#0c101c] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase">EXPLORADOR DE CAPACIDADES</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Demostración Interactiva del Producto</h3>
              </div>
              <div className="flex gap-1.5 text-xs font-semibold">
                {["Visión General", "Métricas en Tiempo Real", "Integración"].map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTourTab(i)}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      activeTourTab === i ? "bg-white/20 text-white font-bold" : "bg-white/5 text-white/60 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTourTab === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: "Arquitectura React 19", desc: "Hooks reactivos nativos, Server Components y optimización extrema de renderizado." },
                  { title: "Estilos Tailwind v4", desc: "Configuración moderna @theme sin configuraciones superfluas y con tokens limpios." },
                  { title: "Vídeo 60 FPS HD", desc: "Streaming sin pausas, compatible con dispositivos móviles y modo ahorro de batería." },
                ].map((c, i) => (
                  <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/5">
                    <h4 className="font-bold text-white text-sm">{c.title}</h4>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTourTab === 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="text-2xl font-black text-emerald-400">99.8%</div>
                  <div className="text-xs text-white/60 mt-1">Uptime de Plataforma</div>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="text-2xl font-black text-sky-400">&lt; 35ms</div>
                  <div className="text-xs text-white/60 mt-1">Latencia Global</div>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="text-2xl font-black text-purple-400">100%</div>
                  <div className="text-xs text-white/60 mt-1">Compatibilidad TypeScript</div>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="text-2xl font-black text-amber-400">0 KB</div>
                  <div className="text-xs text-white/60 mt-1">Dependencias No Necesarias</div>
                </div>
              </div>
            )}

            {activeTourTab === 2 && (
              <div className="p-4 rounded-xl border border-white/10 bg-black/60 font-mono text-xs text-emerald-400">
                <code>
                  {`import { ${item.title.replace(/[^a-zA-Z0-9]/g, '')} } from "@/components/vault";\n\nexport default function App() {\n  return <${item.title.replace(/[^a-zA-Z0-9]/g, '')} theme="dark" interactive={true} />;\n}`}
                </code>
              </div>
            )}

            {/* Newsletter Subscription */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-white/70">Recibe actualizaciones de nuevos componentes y mejoras para esta arquitectura:</span>
              {subSuccess ? (
                <span className="text-xs font-bold text-emerald-400">✓ ¡Suscrito con éxito!</span>
              ) : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={() => {
                      if (subEmail) setSubSuccess(true);
                    }}
                    className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-sky-300"
                  >
                    Suscribir
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. FOOTER */}
      <footer className="border-t border-white/10 bg-[#05070d] py-6 px-6 text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <div>{item.title} · Arquitectura de componente de alta fidelidad</div>
        <div>Golden Path Vault · Renderizado en vivo</div>
      </footer>
    </div>
  );
}
