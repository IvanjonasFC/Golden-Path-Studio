"use client";

import { useState, useRef } from "react";

interface JaxonPreviewProps {
  onContactClick?: () => void;
}

export default function JaxonPreview({ onContactClick }: JaxonPreviewProps) {
  // Video controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Filter for Selected Works
  const [activeCategory, setActiveCategory] = useState<"all" | "ai" | "fintech" | "3d">("all");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  // Scope & Budget Calculator State
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "brand_system",
    "web_app",
  ]);

  // Contact Form State
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquirySent, setInquirySent] = useState(false);

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

  const projects = [
    {
      id: 1,
      title: "Synthetix AI Studio",
      client: "Synthetix Labs",
      year: "2026",
      category: "ai",
      categoryLabel: "AI & Developer Tools",
      metric: "+340% Developer Adoption",
      award: "Awwwards Site of the Day",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80",
      description: "End-to-end interface design and interactive canvas architecture for multimodal generative AI agents.",
      tags: ["Next.js 15", "WebGL", "Design System", "Tailwind CSS"],
    },
    {
      id: 2,
      title: "Krypton Global Liquidity",
      client: "Krypton Protocol",
      year: "2025",
      category: "fintech",
      categoryLabel: "Fintech & Web3",
      metric: "$4.2B Volume Processed",
      award: "FWA of the Month",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&auto=format&fit=crop&q=80",
      description: "Institutional DeFi trading terminal with ultra-low latency SVG telemetry and dark glassmorphic design system.",
      tags: ["High-Density UI", "Data Visualization", "Figma Tokens"],
    },
    {
      id: 3,
      title: "Aether Spatial Soundscapes",
      client: "Aether Audio",
      year: "2026",
      category: "3d",
      categoryLabel: "Spatial 3D",
      metric: "Apple Design Award Nominee",
      award: "CSS Design Awards Best UI",
      image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=900&auto=format&fit=crop&q=80",
      description: "Immersive 3D audio hardware showcase with real-time Three.js shaders and dynamic acoustic simulations.",
      tags: ["Three.js", "GLSL Shaders", "Audio API", "Micro-animations"],
    },
    {
      id: 4,
      title: "Nexus Engineering Command",
      client: "Nexus Cloud",
      year: "2025",
      category: "ai",
      categoryLabel: "AI & Developer Tools",
      metric: "Acquired by Vercel ($85M)",
      award: "Design Systems Excellence",
      image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=900&auto=format&fit=crop&q=80",
      description: "Cloud observability workspace and cluster telemetry dashboard for distributed microservices.",
      tags: ["React 19", "Telemetry", "Accessibility WCAG AAA"],
    },
  ];

  const filteredProjects = activeCategory === "all"
    ? projects
    : projects.filter((p) => p.category === activeCategory);

  const servicesList = [
    { id: "brand_system", label: "Brand Strategy & Design System", price: 4500, weeks: 2 },
    { id: "web_app", label: "Full-Stack Next.js 15 Web Application", price: 8000, weeks: 3 },
    { id: "motion_3d", label: "Interactive 3D WebGL & Custom Shaders", price: 5200, weeks: 2 },
    { id: "mobile_app", label: "Mobile iOS / React Native Experience", price: 6800, weeks: 3 },
  ];

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter((s) => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const calculatedTotal = servicesList
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const calculatedWeeks = servicesList
    .filter((s) => selectedServices.includes(s.id))
    .reduce((max, s) => Math.max(max, s.weeks), 0) + (selectedServices.length > 2 ? 1 : 0);

  return (
    <div className="relative w-full bg-[#05060a] text-white font-sans overflow-hidden select-none">
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-purple-950/40 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-300">DISPONIBLE PARA PROYECTOS Q4 2026</span>
          <span className="hidden sm:inline text-white/50">· 2 plazas restantes</span>
        </div>

        <div className="flex items-center gap-3 text-white/70">
          <span className="hidden md:inline font-mono text-[11px]">San Francisco, CA · GMT-7</span>
          <a
            href="#contact"
            className="rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white transition-colors"
          >
            Contactar ↗
          </a>
        </div>
      </div>

      {/* 2. NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060a]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 font-black text-black text-sm shadow-lg shadow-sky-500/20">
              J
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">JAXON</span>
              <span className="text-sky-400 font-bold ml-1">.STUDIO</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-white/70">
            <a href="#projects" className="hover:text-sky-400 transition-colors">Trabajos Seleccionados</a>
            <a href="#philosophy" className="hover:text-sky-400 transition-colors">Filosofía</a>
            <a href="#calculator" className="hover:text-sky-400 transition-colors">Calculadora de Proyecto</a>
            <a href="#testimonials" className="hover:text-sky-400 transition-colors">Testimonios</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="rounded-full bg-sky-400 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-sky-500/20 hover:bg-sky-300 active:scale-95 transition-all"
            >
              Reservar Llamada
            </a>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION WITH REAL VIDEO INTEGRATION */}
      <section className="relative min-h-[580px] sm:min-h-[640px] flex flex-col justify-between overflow-hidden px-6 py-12 sm:py-20 border-b border-white/10">
        {/* Background Real Video */}
        <video
          ref={videoRef}
          src="https://cdn.sceneai.art/landing-pages/6cbba9b2-dbb3-4a3d-8a25-59a0ce2fcdd5.mp4"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-45 scale-105"
        />

        {/* Ambient Gradient Overlays for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-[#05060a]/70 to-[#05060a]/40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,6,10,0.8)_100%)] pointer-events-none" />

        {/* Video Control Bar floating top right */}
        <div className="relative z-20 flex justify-end gap-2 max-w-7xl mx-auto w-full">
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
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center my-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-300 backdrop-blur-md mb-6 shadow-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            DIRECTOR CREATIVO & DESARROLLADOR FRONTEND
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white">
            Diseñando interfaces viscerales para productos que definen categorías.
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/80 leading-relaxed font-normal">
            Ayudo a fundadores y equipos de élite en Silicon Valley a transformar código complejo en productos intuitivos con identidad visual premium, animaciones a 60 FPS y sistemas de diseño escalables.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#projects"
              className="rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-black shadow-xl hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              Ver Trabajos Seleccionados
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            </a>
            <a
              href="#calculator"
              className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-md px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Calcular Presupuesto Live
            </a>
          </div>

          {/* Metric Badges */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl pt-8 border-t border-white/10 text-left">
            <div>
              <div className="text-2xl font-black text-white">48+</div>
              <div className="text-xs text-white/50">Productos Lanzados</div>
            </div>
            <div>
              <div className="text-2xl font-black text-sky-400">$180M+</div>
              <div className="text-xs text-white/50">Levantado por Clientes</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">12</div>
              <div className="text-xs text-white/50">Premios Awwwards & FWA</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">99.4%</div>
              <div className="text-xs text-white/50">Satisfacción de Clientes</div>
            </div>
          </div>
        </div>

        {/* Scroll down indicator */}
        <div className="relative z-10 text-center pt-6 text-xs text-white/40 flex items-center justify-center gap-2">
          <span>Desplaza para explorar proyectos e interactuar</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </section>

      {/* 4. CLIENT LOGO MARQUEE */}
      <section className="border-b border-white/10 bg-[#080a12] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">
            Colaborando con equipos en empresas innovadoras
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70">
            {["LINEAR", "VERCEL", "SUPABASE", "RAYCAST", "STRIPE", "OPENAI", "FIGMA"].map((brand) => (
              <span key={brand} className="font-mono text-sm sm:text-base font-black tracking-widest text-white/80 hover:text-sky-400 transition-colors cursor-pointer">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SELECTED WORKS GALLERY (INTERACTIVE) */}
      <section id="projects" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">
              PORTFOLIO DESTACADO
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Trabajos Seleccionados
            </h2>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { id: "all", label: "Todos (4)" },
              { id: "ai", label: "AI & DevTools" },
              { id: "fintech", label: "Fintech & Web3" },
              { id: "3d", label: "Spatial 3D" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`rounded-lg px-3.5 py-1.5 transition-all ${
                  activeCategory === cat.id
                    ? "bg-sky-400 text-black font-bold shadow-md"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d16] cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-400/50 hover:shadow-2xl"
            >
              {/* Project Image */}
              <div className="relative aspect-[16/10] overflow-hidden bg-black">
                <img
                  src={p.image}
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85 group-hover:opacity-100"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="rounded-md bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/15">
                    {p.categoryLabel}
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/20 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>{p.award}</span>
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 rounded-lg bg-sky-500/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver Detalles Interactivos ↗
                </div>
              </div>

              {/* Project Info */}
              <div className="p-6 flex flex-col justify-between flex-1 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                    <span>{p.client} · {p.year}</span>
                    <span className="text-emerald-400 font-bold">{p.metric}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs text-white/70 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                  {p.tags.map((tag) => (
                    <span key={tag} className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Project Detail Modal if clicked */}
        {selectedProject && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setSelectedProject(null)}
          >
            <div
              className="relative max-w-2xl w-full rounded-2xl border border-sky-400/40 bg-[#0d1220] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const prj = projects.find((p) => p.id === selectedProject)!;
                return (
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <span className="text-xs text-sky-400 font-bold uppercase">{prj.client} · {prj.categoryLabel}</span>
                        <h3 className="text-2xl font-bold text-white mt-1">{prj.title}</h3>
                      </div>
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-4 rounded-xl overflow-hidden aspect-[16/9] border border-white/10">
                      <img src={prj.image} alt={prj.title} className="w-full h-full object-cover" />
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-bold text-amber-300">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          <span>{prj.award}</span>
                        </span>
                        <span className="font-bold text-emerald-400">{prj.metric}</span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed">{prj.description}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {prj.tags.map((t) => (
                          <span key={t} className="rounded bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-xs text-sky-300 font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </section>

      {/* 6. INTERACTIVE SCOPE & BUDGET ESTIMATOR */}
      <section id="calculator" className="py-20 px-6 bg-[#080b14] border-y border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              TRANSPARENCIA TOTAL
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
              Calculadora Interactiva de Proyecto
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto mt-2">
              Selecciona los módulos que necesita tu empresa para ver una estimación inmediata de inversión y tiempo de entrega.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Service Checkboxes */}
            <div className="md:col-span-2 flex flex-col gap-3">
              {servicesList.map((service) => {
                const isChecked = selectedServices.includes(service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      isChecked
                        ? "border-sky-400 bg-sky-950/20 shadow-md"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded flex items-center justify-center border text-xs font-bold ${
                          isChecked ? "bg-sky-400 border-sky-400 text-black" : "border-white/30 bg-transparent"
                        }`}
                      >
                        {isChecked && "✓"}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{service.label}</div>
                        <div className="text-xs text-white/50">Entrega estimada: ~{service.weeks} semanas</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-sky-300">
                        ${service.price.toLocaleString("en-US")}
                      </div>
                      <div className="text-[10px] text-white/40">Inversión fija</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Summary Card */}
            <div className="rounded-2xl border border-sky-500/30 bg-black/60 p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Estimación en Tiempo Real
                </span>
                <div className="mt-4">
                  <div className="text-xs text-white/50">Presupuesto Estimado:</div>
                  <div className="text-3xl font-black text-sky-400 mt-0.5">
                    ${calculatedTotal.toLocaleString("en-US")}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-xs text-white/50">Cronograma de Entrega:</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {calculatedWeeks > 0 ? `~${calculatedWeeks} Semanas` : "Selecciona módulos"}
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-white/60 leading-relaxed">
                  Incluye arquitectura limpia en Next.js 15, soporte directo por Slack con Jaxon y 30 días de garantía post-lanzamiento.
                </div>
              </div>

              <a
                href="#contact"
                className="mt-6 w-full rounded-xl bg-sky-400 py-3 text-center text-xs font-bold text-black hover:bg-sky-300 active:scale-95 transition-all shadow-lg"
              >
                Solicitar Esta Propuesta ↵
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS */}
      <section id="testimonials" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
            CONFIANZA
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
            Lo que dicen los fundadores
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: "Jaxon rediseñó nuestra plataforma completa en 3 semanas. La tasa de conversión de registro aumentó un 68% la primera semana tras el despliegue.",
              author: "Marcus Thorne",
              role: "Fundador & CEO en Synthetix AI",
            },
            {
              quote: "Rara vez encuentras a un diseñador que también domine React y shaders GLSL a este nivel. Es el secreto mejor guardado de nuestro producto.",
              author: "Elena Rostova",
              role: "VP de Producto en Krypton Protocol",
            },
            {
              quote: "El sistema de diseño que creó para nosotros nos ahorró cientos de horas de ingeniería frontend. Cada componente es una obra de arte interactiva.",
              author: "David Vance",
              role: "CTO en Nexus Cloud (Acquired)",
            },
          ].map((t, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-[#0a0d16] p-6 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed italic">
                "{t.quote}"
              </p>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-bold text-xs text-sky-300">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{t.author}</div>
                  <div className="text-[10px] text-white/50">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. CONTACT & INQUIRY FORM */}
      <section id="contact" className="py-20 px-6 bg-[#080a12] border-t border-white/10">
        <div className="max-w-xl mx-auto rounded-2xl border border-sky-500/30 bg-[#0c101c] p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">¿TIENES UNA IDEA?</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">Empecemos a Construir</h3>
            <p className="text-xs text-white/60 mt-1">Respondo en menos de 24 horas laborables.</p>
          </div>

          {inquirySent ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <h4 className="text-sm font-bold text-emerald-300">¡Mensaje Enviado con Éxito!</h4>
              <p className="text-xs text-white/70 mt-1">
                Gracias {inquiryName || "por escribir"}. He recibido tu solicitud y agendaré una reunión introductoria a {inquiryEmail}.
              </p>
              <button
                onClick={() => setInquirySent(false)}
                className="mt-4 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-black"
              >
                Enviar Otro Mensaje
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setInquirySent(true);
              }}
              className="flex flex-col gap-4 text-xs"
            >
              <div className="flex flex-col gap-1">
                <label className="font-bold text-white/70 uppercase text-[10px]">Tu Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofía Martí"
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-white/70 uppercase text-[10px]">Correo Profesional</label>
                <input
                  type="email"
                  required
                  placeholder="sofia@tuempresa.com"
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-white/70 uppercase text-[10px]">Cuéntame sobre tu proyecto</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe brevemente el producto, plataforma y objetivos..."
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-sky-400 resize-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 rounded-xl bg-sky-400 py-3 text-xs font-bold text-black shadow-lg shadow-sky-500/20 hover:bg-sky-300 active:scale-95 transition-all"
              >
                Enviar Solicitud de Proyecto ↵
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-white/10 bg-[#05060a] py-8 px-6 text-xs text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">JAXON.STUDIO</span>
            <span>· Diseñado y construido con Next.js 15 y Tailwind CSS</span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer">Twitter / X</span>
            <span className="hover:text-white cursor-pointer">GitHub</span>
            <span className="hover:text-white cursor-pointer">Figma Community</span>
            <span className="hover:text-white cursor-pointer">LinkedIn</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
