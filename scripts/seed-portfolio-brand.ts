import { sqlite, initDb } from "../src/db/index";
import { defaultBrandTokens } from "../src/lib/tokens";
import { INITIAL_PORTFOLIO_PROJECTS } from "../src/lib/portfolioProjects";
import { HERO_COMPONENT_DEFINITION } from "../src/lib/componentContract";

initDb();

const now = Date.now();

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES COMPLETOS DE ALTA FIDELIDAD (portfolio.ivanjonasfc.dev)
// ─────────────────────────────────────────────────────────────────────────────

const components = [
  {
    id: "comp_ivn_navbar",
    name: "Navbar Developer IVN",
    slug: "navbar-developer-ivn",
    category: "Navigation",
    type: "navbar",
    framework: "tailwind",
    description: "Barra de navegación oscura con logo IVN, selector de idioma EN/ES y accesos a GitHub y consola.",
    html: `
<header class="w-full sticky top-0 z-50 backdrop-blur-xl bg-[#0d0e12]/85 border-b border-white/[0.08] transition-all">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <!-- Logo -->
    <a href="#inicio" data-route-to="/portfolio" class="flex items-center gap-1 text-lg font-black tracking-wider text-white hover:text-[var(--color-accent,#f97316)] transition-colors cursor-pointer">
      <span>IVN</span><span class="text-[var(--color-accent,#f97316)] text-xl leading-none">.</span>
    </a>

    <!-- Links principales -->
    <nav class="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wide text-zinc-300">
      <a href="#inicio" data-route-to="/portfolio" class="hover:text-white transition-colors cursor-pointer">Inicio</a>
      <a href="#panel" class="hover:text-white transition-colors cursor-pointer">Panel</a>
      <a href="#proyectos" class="hover:text-white transition-colors cursor-pointer">Proyectos</a>
      <a href="#contacto" class="hover:text-white transition-colors cursor-pointer">Contacto</a>
    </nav>

    <!-- Badges y controles de la derecha -->
    <div class="flex items-center gap-3">
      <button type="button" class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-300 hover:border-white/25 hover:text-white transition-all">
        EN
      </button>
      <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all" title="GitHub">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
      </a>
      <button type="button" class="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all" title="Terminal / Consola">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      </button>
      <button type="button" class="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all" title="Modo Oscuro">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
      </button>
    </div>
  </div>
</header>
`,
    css: ""
  },
  {
    id: "comp_ivn_hero",
    name: "Hero Developer Iván Jonás",
    slug: "hero-developer-ivan-jonas",
    category: "Hero",
    type: "hero",
    framework: "tailwind",
    description: "Hero principal con presentación, foto con badges flotantes (Full-Stack, DevOps, IA), disponible para trabajar y CTA gemelo.",
    html: `
<section id="inicio" class="w-full py-16 md:py-24 relative overflow-hidden bg-[#0d0e12]">
  <!-- Glow de fondo ambiental cálido -->
  <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[var(--color-accent,#f97316)]/12 blur-[140px] pointer-events-none rounded-full"></div>

  <div class="max-w-6xl mx-auto px-6 relative z-10">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      
      <!-- Columna Izquierda: Foto con Badges Flotantes -->
      <div class="lg:col-span-5 flex justify-center order-2 lg:order-1">
        <div class="relative group">
          <!-- Marco con resplandor -->
          <div class="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[var(--color-accent,#f97316)]/40 to-amber-500/20 blur-lg opacity-70 group-hover:opacity-100 transition-opacity"></div>
          
          <div class="relative w-64 h-80 sm:w-72 sm:h-92 rounded-2xl overflow-hidden border border-white/10 bg-[#161822] shadow-2xl">
            <!-- Imagen Avatar -->
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" 
              alt="Iván Jonás" 
              class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-700"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>

          <!-- Badges flotantes interactivos -->
          <div class="absolute -top-3 -left-4 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 px-3 py-1 shadow-xl text-[11px] font-mono font-bold text-white flex items-center gap-1.5 animate-bounce" style="animation-duration: 4s;">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            Full-Stack
          </div>

          <div class="absolute top-1/2 -right-6 -translate-y-1/2 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 px-3 py-1 shadow-xl text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            DevOps
          </div>

          <div class="absolute -bottom-3 -left-3 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 px-3 py-1 shadow-xl text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
            IA · RAG
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Copy y Acciones -->
      <div class="lg:col-span-7 space-y-6 order-1 lg:order-2">
        <!-- Pre-encabezado en consola -->
        <div class="flex items-center gap-2 font-mono text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          <span class="text-[var(--color-accent,#f97316)]">&lt; Hello World /&gt;</span>
          <span class="text-zinc-600">—</span>
          <span>Desarrollador Full-Stack & DevOps</span>
        </div>

        <!-- Badge Disponible -->
        <div>
          <span class="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-mono font-semibold text-orange-300">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            DISPONIBLE PARA TRABAJAR
          </span>
        </div>

        <!-- Título Principal -->
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
          Iván Jonás<span class="text-[var(--color-accent,#f97316)]">.</span>
        </h1>

        <!-- Párrafo descriptivo -->
        <p class="text-sm sm:text-base text-zinc-300/90 leading-relaxed font-normal max-w-xl">
          Construyo aplicaciones web completas, infraestructura self-hosted y soluciones con inteligencia artificial local. Apasionado del código limpio, la automatización y el rendimiento extremo.
        </p>

        <!-- Botones de Acción Gemelos -->
        <div class="flex flex-wrap items-center gap-4 pt-2">
          <a href="#proyectos" class="rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-6 py-3 text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer">
            <span>Ver Proyectos</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
          </a>

          <a href="mailto:contacto@ivanjonasfc.dev" class="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 text-xs transition-all flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Descargar CV</span>
          </a>
        </div>
      </div>

    </div>
  </div>
</section>
`,
    css: ""
  },
  {
    id: "comp_ivn_metrics",
    name: "Barra de Métricas Iván Jonás",
    slug: "barra-metricas-ivan-jonas",
    category: "Stats",
    type: "stats",
    framework: "tailwind",
    description: "Franja de métricas clave: 6+ años, 6 proyectos prod, 10+ entregados, ~30 self-hosted.",
    html: `
<section class="w-full py-8 border-y border-white/[0.08] bg-[#0d0e12]/60 backdrop-blur-sm">
  <div class="max-w-6xl mx-auto px-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      
      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">6+</div>
        <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">AÑOS EN TECNOLOGÍA</div>
      </div>

      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">6</div>
        <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">PROYECTOS EN PRODUCCIÓN</div>
      </div>

      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">10+</div>
        <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">PROYECTOS ENTREGADOS</div>
      </div>

      <div class="space-y-1">
        <div class="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">~30</div>
        <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">SERVICIOS SELF-HOSTED</div>
      </div>

    </div>
  </div>
</section>
`,
    css: ""
  },
  {
    id: "comp_ivn_bento_numbers",
    name: "Bento Grid Iván en Números (Interactivo)",
    slug: "bento-grid-ivan-en-numeros",
    category: "Bento",
    type: "bento",
    framework: "tailwind",
    description: "Sección Bento Grid con 3 pestañas 100% interactivas: GitHub (Terminal + Stats), Trayectoria (Timeline laboral y formación) e Infraestructura.",
    html: `
<section id="panel" class="w-full py-16 md:py-24 bg-[#0d0e12] border-t border-white/[0.08]">
  <div class="max-w-6xl mx-auto px-6 space-y-10">
    
    <!-- Título de la sección -->
    <div class="text-center space-y-2">
      <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
        Iván en <span class="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent,#f97316)] to-amber-300">números</span>
      </h2>
      <p class="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
        Mi actividad en GitHub, mi trayectoria y mi infraestructura · datos en vivo.
      </p>
    </div>

    <!-- Pestañas de categoría Interactivas -->
    <div class="flex justify-center">
      <div class="inline-flex rounded-full border border-white/10 bg-[#141620] p-1 gap-1 text-xs font-semibold" id="ivn-bento-tabs">
        <button type="button" onclick="switchIvnTab('github')" id="tab-btn-github" class="ivn-tab-btn rounded-full bg-[var(--color-accent,#f97316)] text-black px-5 py-2 font-bold shadow transition-all flex items-center gap-2 cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          GitHub
        </button>
        <button type="button" onclick="switchIvnTab('trayectoria')" id="tab-btn-trayectoria" class="ivn-tab-btn rounded-full text-zinc-400 hover:text-white px-5 py-2 transition-all flex items-center gap-2 cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          Trayectoria
        </button>
        <button type="button" onclick="switchIvnTab('infraestructura')" id="tab-btn-infraestructura" class="ivn-tab-btn rounded-full text-zinc-400 hover:text-white px-5 py-2 transition-all flex items-center gap-2 cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
          Infraestructura
        </button>
      </div>
    </div>

    <!-- PANEL 1: GITHUB (Activo por defecto) -->
    <div id="ivn-panel-github" class="ivn-tab-panel grid grid-cols-1 md:grid-cols-12 gap-4 transition-opacity duration-300">
      
      <!-- Card 1: Repositorios -->
      <div class="md:col-span-3 rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 flex flex-col justify-between hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="flex items-center justify-between text-zinc-400">
          <span class="text-[10px] font-mono uppercase font-bold tracking-wider">REPOSITORIOS</span>
          <svg class="w-4 h-4 text-zinc-400 group-hover:text-[var(--color-accent,#f97316)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        </div>
        <div class="py-4">
          <div class="text-4xl font-black font-mono text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">16</div>
          <span class="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold mt-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> +3 en 2026
          </span>
        </div>
      </div>

      <!-- Card 2: Terminal Interactiva -->
      <div class="md:col-span-6 rounded-2xl border border-white/[0.08] bg-[#0d0e14] p-6 font-mono text-xs flex flex-col justify-between shadow-2xl relative overflow-hidden group">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-green-500/70"></span>
            <span class="ml-2 text-[10px] text-zinc-500">ivan@pesoz:~$</span>
          </div>
          <span class="text-[9px] text-zinc-600 uppercase font-mono">bash 5.2</span>
        </div>
        <div class="space-y-2 py-4">
          <p class="text-zinc-400"><span class="text-emerald-400">$</span> uname -srmo</p>
          <p class="text-zinc-200">Linux 6.8.12-pve x86_64 GNU/Linux</p>
          <p class="text-zinc-400"><span class="text-emerald-400">$</span> docker ps --format "table {{.Names}}\t{{.Status}}"</p>
          <p class="text-[var(--color-accent,#f97316)] font-semibold">14 containers healthy (caddy, n8n, postgres...)</p>
        </div>
        <div class="text-[10px] text-zinc-500 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Cluster Homelab en funcionamiento continuo
        </div>
      </div>

      <!-- Card 3: Pull Requests -->
      <div class="md:col-span-3 rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 flex flex-col justify-between hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="flex items-center justify-between text-zinc-400">
          <span class="text-[10px] font-mono uppercase font-bold tracking-wider">PULL REQUESTS</span>
          <svg class="w-4 h-4 text-zinc-400 group-hover:text-[var(--color-accent,#f97316)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3" stroke-width="2"/><circle cx="6" cy="6" r="3" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"/></svg>
        </div>
        <div class="py-4">
          <div class="text-4xl font-black font-mono text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">5</div>
          <div class="text-[10px] text-zinc-400 font-mono mt-1">Contribuciones activas</div>
        </div>
      </div>

      <!-- Card 4: Stars Recibidas -->
      <div class="md:col-span-6 rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 flex items-center justify-between hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div>
          <span class="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400">STARS RECIBIDAS</span>
          <div class="text-3xl font-black font-mono text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors mt-1">3</div>
        </div>
        <svg class="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </div>

      <!-- Card 5: Miembro desde -->
      <div class="md:col-span-6 rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 flex items-center justify-between hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div>
          <span class="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400">EN GITHUB DESDE</span>
          <div class="text-3xl font-black font-mono text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors mt-1">2013</div>
        </div>
        <svg class="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      </div>

    </div>

    <!-- PANEL 2: TRAYECTORIA (Timeline de Experiencia & Formación) -->
    <div id="ivn-panel-trayectoria" class="ivn-tab-panel hidden space-y-10 transition-opacity duration-300">
      
      <!-- Encabezado de Trayectoria -->
      <div class="border-l-2 border-[var(--color-accent,#f97316)] pl-4">
        <h3 class="text-2xl font-black text-white">
          Experiencia &amp; <span class="text-[var(--color-accent,#f97316)]">Formación</span>
        </h3>
        <p class="text-xs text-zinc-400">Mi trayectoria profesional y académica.</p>
      </div>

      <!-- Timeline Vertical -->
      <div class="relative border-l border-white/10 ml-4 pl-8 space-y-8">
        
        <!-- Hito 1: ALTEN / IEO-CSIC -->
        <div class="relative group">
          <span class="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-[#181a24] border-2 border-orange-500/80 flex items-center justify-center text-xs text-orange-400">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </span>
          <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 space-y-2 hover:border-orange-500/40 transition-all">
            <div class="flex items-center gap-3">
              <span class="rounded-md bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-orange-400">2025 — 2026</span>
              <span class="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider">TRABAJO</span>
            </div>
            <h4 class="text-lg font-bold text-white">Técnico de Soporte de Sistemas</h4>
            <div class="text-xs font-semibold text-zinc-300">ALTEN · Centro Oceanográfico IEO-CSIC</div>
            <p class="text-xs text-zinc-400 leading-relaxed pt-1">
              Responsable de la infraestructura IT del centro (~50 usuarios del CSIC): red, Directorio Activo, VPN, instalación de equipos y resolución de incidencias, garantizando la continuidad operativa.
            </p>
          </div>
        </div>

        <!-- Hito 2: QuantumSec (Kompliance) -->
        <div class="relative group">
          <span class="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-[#181a24] border-2 border-amber-500/80 flex items-center justify-center text-xs text-amber-400">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </span>
          <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 space-y-2 hover:border-amber-500/40 transition-all">
            <div class="flex items-center gap-3">
              <span class="rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">2025</span>
              <span class="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider">TRABAJO</span>
            </div>
            <h4 class="text-lg font-bold text-white">Desarrollador Full-Stack (FCT)</h4>
            <div class="text-xs font-semibold text-zinc-300">QuantumSec · Proyecto Kompliance (remoto)</div>
            <p class="text-xs text-zinc-400 leading-relaxed pt-1">
              Prácticas para empresa de ciberseguridad con stack FastAPI + React + TypeScript. Migré su gestor de auditorías de la nube (Supabase) a self-hosted y desarrollé un gestor de contraseñas con claves de un solo uso cifradas.
            </p>
          </div>
        </div>

        <!-- Hito 3: DAM TuniverS -->
        <div class="relative group">
          <span class="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-[#181a24] border-2 border-emerald-500/80 flex items-center justify-center text-xs text-emerald-400">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
          </span>
          <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 space-y-2 hover:border-emerald-500/40 transition-all">
            <div class="flex items-center gap-3">
              <span class="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">2024 — 2026</span>
              <span class="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider">FORMACIÓN</span>
            </div>
            <h4 class="text-lg font-bold text-white">Técnico Superior en DAM</h4>
            <div class="text-xs font-semibold text-zinc-300">TuniverS, Gijón</div>
            <p class="text-xs text-zinc-400 leading-relaxed pt-1">
              Desarrollo de Aplicaciones Multiplataforma.
            </p>
          </div>
        </div>

        <!-- Hito 4: ASIR IES Nº1 -->
        <div class="relative group">
          <span class="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-[#181a24] border-2 border-sky-500/80 flex items-center justify-center text-xs text-sky-400">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
          </span>
          <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 space-y-2 hover:border-sky-500/40 transition-all">
            <div class="flex items-center gap-3">
              <span class="rounded-md bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-400">2017 — 2020</span>
              <span class="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider">FORMACIÓN</span>
            </div>
            <h4 class="text-lg font-bold text-white">Técnico Superior en ASIR</h4>
            <div class="text-xs font-semibold text-zinc-300">IES Nº1, Gijón</div>
            <p class="text-xs text-zinc-400 leading-relaxed pt-1">
              Administración de Sistemas Informáticos en Red.
            </p>
          </div>
        </div>

      </div>

      <!-- Formación Complementaria Cards -->
      <div class="space-y-4 pt-4">
        <div class="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
          <span>Formación complementaria (Certificados OpenWebinars)</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="rounded-xl border border-white/[0.08] bg-[#12141c] p-4 flex flex-col justify-between hover:border-sky-400/40 transition-all">
            <svg class="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <div class="mt-3">
              <div class="text-xs font-bold text-white">Docker</div>
              <div class="text-[10px] text-zinc-400">OpenWebinars</div>
            </div>
          </div>
          <div class="rounded-xl border border-white/[0.08] bg-[#12141c] p-4 flex flex-col justify-between hover:border-blue-400/40 transition-all">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
            <div class="mt-3">
              <div class="text-xs font-bold text-white">Cisco CCNA</div>
              <div class="text-[10px] text-zinc-400">OpenWebinars</div>
            </div>
          </div>
          <div class="rounded-xl border border-white/[0.08] bg-[#12141c] p-4 flex flex-col justify-between hover:border-emerald-400/40 transition-all">
            <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <div class="mt-3">
              <div class="text-xs font-bold text-white">Spring Boot &amp; MVC</div>
              <div class="text-[10px] text-zinc-400">OpenWebinars</div>
            </div>
          </div>
          <div class="rounded-xl border border-white/[0.08] bg-[#12141c] p-4 flex flex-col justify-between hover:border-cyan-400/40 transition-all">
            <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            <div class="mt-3">
              <div class="text-xs font-bold text-white">React Fundamentals</div>
              <div class="text-[10px] text-zinc-400">OpenWebinars</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- PANEL 3: INFRAESTRUCTURA (Self-Hosted Lab) -->
    <div id="ivn-panel-infraestructura" class="ivn-tab-panel hidden space-y-6 transition-opacity duration-300">
      <div class="border-l-2 border-emerald-500 pl-4">
        <h3 class="text-2xl font-black text-white">
          Infraestructura <span class="text-emerald-400">Self-Hosted</span>
        </h3>
        <p class="text-xs text-zinc-400">Servidores propios, contenedores Docker y red privada 24/7.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-zinc-400">HARDWARE PRINCIPAL</span>
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div class="text-xl font-bold text-white">NAS Synology</div>
          <p class="text-xs text-zinc-400">Almacenamiento RAID redundante y orquestación de servicios en casa.</p>
        </div>

        <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-zinc-400">DOCKER ENGINE</span>
            <span class="text-xs text-emerald-400 font-mono font-bold">30 Activos</span>
          </div>
          <div class="text-xl font-bold text-white">Microservicios</div>
          <p class="text-xs text-zinc-400">PostgreSQL, Redis, n8n, Ollama, Caddy Proxy, Pi-hole y WireGuard.</p>
        </div>

        <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-6 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-zinc-400">SEGURIDAD &amp; RED</span>
            <span class="text-xs text-emerald-400 font-mono font-bold">100% SSL</span>
          </div>
          <div class="text-xl font-bold text-white">Caddy + WireGuard</div>
          <p class="text-xs text-zinc-400">Certificados automáticos Let's Encrypt y túnel VPN cifrado peer-to-peer.</p>
        </div>
      </div>
    </div>

  </div>
</section>

<script>
function switchIvnTab(tabName) {
  var panels = document.querySelectorAll('.ivn-tab-panel');
  panels.forEach(function(p) { p.classList.add('hidden'); });
  var activePanel = document.getElementById('ivn-panel-' + tabName);
  if (activePanel) activePanel.classList.remove('hidden');

  var btns = document.querySelectorAll('.ivn-tab-btn');
  btns.forEach(function(b) {
    b.className = 'ivn-tab-btn rounded-full text-zinc-400 hover:text-white px-5 py-2 transition-all flex items-center gap-2 cursor-pointer';
  });
  var activeBtn = document.getElementById('tab-btn-' + tabName);
  if (activeBtn) {
    activeBtn.className = 'ivn-tab-btn rounded-full bg-[var(--color-accent,#f97316)] text-black px-5 py-2 font-bold shadow transition-all flex items-center gap-2 cursor-pointer';
  }
}
</script>
`,
    css: ""
  },
  {
    id: "comp_ivn_projects",
    name: "Proyectos Destacados Iván Jonás (9 Proyectos)",
    slug: "proyectos-destacados-ivan-jonas",
    category: "Cards",
    type: "projects",
    framework: "tailwind",
    description: "Grid completo con los 9 proyectos reales del portfolio de Iván Jonás, con badges, stacks, botones interactivos de 'Ver más' y enlaces.",
    html: `
<section id="proyectos" class="w-full py-16 md:py-24 bg-[#0d0e12] border-t border-white/[0.08]">
  <div class="max-w-6xl mx-auto px-6 space-y-12">
    
    <!-- Título de la sección -->
    <div class="space-y-2">
      <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
        Proyectos <span class="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent,#f97316)] to-amber-300">Destacados</span>
      </h2>
      <p class="text-xs sm:text-sm text-zinc-400 max-w-xl">
        Soluciones reales a problemas reales. Una selección de mis trabajos más recientes.
      </p>
    </div>

    <!-- Grid de 9 Proyectos -->
    <div class="space-y-8">
      
      <!-- Proyecto 1: Web Rutas Raíces -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
            <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" alt="Web Rutas Raíces" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <span class="absolute bottom-3 left-3 text-[11px] font-mono font-bold text-white bg-black/70 px-2.5 py-1 rounded-md backdrop-blur-sm">rutasllaneras.com</span>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span> CLIENTE REAL
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              Web Rutas Raíces
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Web de senderismo para cliente real en Asturias. Astro 7 + React 19 + Tailwind 4, mapas Leaflet con perfil de elevación a partir de GPX y versión bilingüe ES/EN. Alta de rutas automatizada con n8n + IA; WebP, CSP y cumplimiento RGPD.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Astro</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">React</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Leaflet</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">n8n</span>
            </div>

            <div class="pt-2">
              <a href="https://portfolio.ivanjonasfc.dev" target="_blank" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                <span>Visitar</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Proyecto 2: OposApp -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-7 space-y-4 order-2 lg:order-1">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> TFG
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              OposApp
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Mi Trabajo de Fin de Grado (DAM): app móvil en Flutter que automatiza el seguimiento de convocatorias del BOPA y genera tests de práctica con IA local (Ollama), con privacidad total por diseño.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Flutter</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Spring Boot</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">IA Local (Ollama)</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">PostgreSQL</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">RGPD</span>
            </div>

            <div class="pt-2 flex items-center gap-3">
              <a href="#detalle-oposapp" data-route-to="/projects/oposapp" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all cursor-pointer">
                <span>Ver más</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>

              <a href="https://github.com" target="_blank" class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2.5 text-xs transition-all">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                <span>Código</span>
              </a>
            </div>
          </div>

          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/60 p-4 aspect-video relative order-1 lg:order-2 group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors flex items-center justify-center">
            <img src="https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=800&q=80" alt="OposApp Screens" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>

      <!-- Proyecto 3: SubsForge -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
            <img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80" alt="SubsForge" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-violet-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-violet-400"></span> OPEN SOURCE
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              SubsForge — Subtítulos con IA, 100% en local
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              App de escritorio para traducir, generar, sincronizar, fusionar, limpiar, doblar, resumir e incrustar subtítulos de vídeo con IA — sin servicios de terceros y funcionando 100% en tu máquina. 9 herramientas en una con Whisper, Piper, Silero VAD y Tauri 2 + Rust.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Subtitles.rs</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Whisper</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Tauri 2</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Rust</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Python</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">100% local</span>
            </div>

            <div class="pt-2 flex items-center gap-3">
              <a href="#detalle-subsforge" data-route-to="/projects/subsforge" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all cursor-pointer">
                <span>Ver más</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>
              <a href="https://github.com" target="_blank" class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2.5 text-xs transition-all">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                <span>Código</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Proyecto 4: OrquestaGit -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-7 space-y-4 order-2 lg:order-1">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> OPEN SOURCE · EN DESARROLLO
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              OrquestaGit — Tu DevOps senior local con IA
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Una app de escritorio que automatiza el trabajo repetitivo de DevOps sobre tus repositorios: escanea su estado, bloquea secretos antes de cada commit, genera pipelines de CI/CD y audita dependencias, todo desde un único panel de control. La IA corre en local con Ollama.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Devops</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">IA Local</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Seguridad</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Tauri 2</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Python</span>
            </div>

            <div class="pt-2 flex items-center gap-3">
              <a href="#detalle-orquestagit" data-route-to="/projects/orquestagit" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all cursor-pointer">
                <span>Ver más</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>
              <a href="https://github.com" target="_blank" class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2.5 text-xs transition-all">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                <span>Código</span>
              </a>
            </div>
          </div>

          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative order-1 lg:order-2 group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
            <img src="https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=800&q=80" alt="OrquestaGit" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>

      <!-- Proyecto 5: Job-radar - Empleo CRM -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
            <img src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80" alt="Job-radar" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span> OPEN SOURCE
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              Job-radar - Empleo CRM
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              CRM web self-hosted que automatiza y centraliza mi búsqueda de empleo: reúne las ofertas, las puntúa con IA (DeepSeek/Qwen), genera cartas y ajustes de CV, y las sigue en un kanban. Astro SSR + React + PostgreSQL.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Astro SSR</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">React</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">PostgreSQL</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">IA Local</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">n8n</span>
            </div>

            <div class="pt-2 flex items-center gap-3">
              <a href="#detalle-jobradar" data-route-to="/projects/jobradar" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all cursor-pointer">
                <span>Ver más</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>
              <a href="https://github.com" target="_blank" class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2.5 text-xs transition-all">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                <span>Código</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Proyecto 6: LifeOS — Suite familiar con IA -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-7 space-y-4 order-2 lg:order-1">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> EN DESARROLLO
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              LifeOS — Suite familiar con IA
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Suite fiscal familiar autohospedada con IA propia ("Lifer"). Backend NestJS + PostgreSQL + BullMQ y app Angular 19 + Ionic. RAG sobre pgvector/Qdrant y LLMs vía Model Context Protocol (MCP).
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">NestJS</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Angular</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">IA RAG</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">MCP</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Docker</span>
            </div>

            <div class="pt-2">
              <a href="#detalle-lifeos" data-route-to="/projects/lifeos" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all cursor-pointer">
                <span>Ver más</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>
            </div>
          </div>

          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-8 aspect-video relative order-1 lg:order-2 group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors flex items-center justify-center">
            <div class="text-center space-y-2">
              <svg class="w-12 h-12 text-[var(--color-accent,#f97316)] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <div class="text-xl font-black font-mono text-white tracking-widest">LifeOS</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Proyecto 7: Infraestructura Pesoz -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
            <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80" alt="Infraestructura Pesoz" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> EN PRODUCCIÓN
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              Infraestructura Pesoz
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Home lab self-hosted en producción 24/7 sobre NAS Synology. ~30 servicios en Docker tras un único punto de entrada HTTPS (Caddy), con VPN WireGuard, MVP, 5kbps/CI-CD, observabilidad y backups automatizados.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Docker</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Caddy</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">WireGuard</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Synology</span>
            </div>

            <div class="pt-2 flex items-center gap-3">
              <a href="#detalle-pesoz" data-route-to="/projects/pesoz" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all cursor-pointer">
                <span>Ver más</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </a>
              <a href="https://portfolio.ivanjonasfc.dev" target="_blank" class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2.5 text-xs transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                <span>Visitar</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Proyecto 8: Hooklab -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-7 space-y-4 order-2 lg:order-1">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span> WEB APP
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              Hooklab
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Constructor, firmador y verificador de webhooks 100% en el navegador: crea payloads con variables dinámicas, firma y verifica HMAC (GitHub, Stripe, Shopify, Xandr), genera curl/js local y dispara un POST. Zero-backend.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Astro</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Zero-backend</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Web Crypto</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">HMAC</span>
            </div>

            <div class="pt-2">
              <a href="https://portfolio.ivanjonasfc.dev" target="_blank" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                <span>Visitar</span>
              </a>
            </div>
          </div>

          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative order-1 lg:order-2 group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
            <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80" alt="Hooklab" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>

      <!-- Proyecto 9: Acopio de Código -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-5 rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
            <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80" alt="Acopio de Código" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span> WEB APP
              </span>
            </div>

            <h3 class="text-2xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
              Acopio de Código
            </h3>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Página web interactiva con snippets de código de varios lenguajes: busca, copia y ten todo a mano. Autohospedada en mi propia infraestructura.
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">React</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Snippets</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Self-hosted</span>
            </div>

            <div class="pt-2">
              <a href="https://portfolio.ivanjonasfc.dev" target="_blank" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                <span>Visitar</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Proyecto 10: Portfolio Web (META) -->
      <div class="rounded-3xl border border-white/[0.08] bg-[#12141c] p-6 sm:p-8 hover:border-[var(--color-accent,#f97316)]/40 transition-all group">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider">
                <span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> META
              </span>
            </div>

            <div>
              <h3 class="text-2xl sm:text-3xl font-black text-white group-hover:text-[var(--color-accent,#f97316)] transition-colors">
                Portfolio Web
              </h3>
              <div class="flex items-center gap-1.5 mt-2">
                <span class="w-6 h-1 rounded-full bg-[var(--color-accent,#f97316)]"></span>
                <span class="w-6 h-1 rounded-full bg-zinc-600"></span>
                <span class="w-6 h-1 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            <p class="text-xs sm:text-sm text-zinc-300/90 leading-relaxed">
              Este mismo sitio. Astro 7 + React (Islas) + Tailwind, self-hosted con Docker y Caddy. Cada proyecto es una carpeta con su contenido y se da de alta con un script (npm run proyecto:add).
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Astro</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">React</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Tailwind</span>
              <span class="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-mono font-bold text-zinc-300">Self-hosted</span>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <a href="https://portfolio.ivanjonasfc.dev" target="_blank" class="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold px-5 py-2.5 text-xs shadow transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                <span>Visitar</span>
              </a>
              <a href="https://github.com/IvanjonasFC/portfolio-astro" target="_blank" class="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold px-5 py-2.5 text-xs border border-white/10 transition-all">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span>Código</span>
              </a>
            </div>
          </div>

          <div class="lg:col-span-5 relative p-2">
            <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-orange-500/80"></div>
            <div class="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-orange-500/80"></div>
            <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-orange-500/80"></div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-orange-500/80"></div>
            <div class="rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video relative group-hover:border-[var(--color-accent,#f97316)]/50 transition-colors">
              <img src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80" alt="Portfolio Web Preview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>
`,
    css: ""
  },
  {
    id: "comp_ivn_project_detail_oposapp",
    name: "Detalle de Proyecto: OposApp",
    slug: "detalle-proyecto-oposapp",
    category: "Content",
    type: "project_detail",
    framework: "tailwind",
    description: "Página completa de detalle para OposApp: benchmarks (187ms, 11.3s, 312ms), galería, ROL/AÑO/CICLO y arquitectura.",
    html: `
<section id="detalle-oposapp" class="w-full py-12 md:py-20 bg-[#0d0e12]">
  <div class="max-w-4xl mx-auto px-6 space-y-10">
    
    <!-- Botón Volver -->
    <div>
      <a href="#inicio" data-route-to="/portfolio" class="inline-flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 hover:text-[var(--color-accent,#f97316)] transition-colors cursor-pointer">
        <span>← Volver a proyectos</span>
      </a>
    </div>

    <!-- Cabecera de Proyecto -->
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-mono font-bold text-emerald-400">
          TFG
        </span>
      </div>

      <h1 class="text-4xl sm:text-5xl font-black text-white tracking-tight">
        OposApp
      </h1>

      <p class="text-sm sm:text-base text-zinc-300/90 leading-relaxed font-normal">
        Mi Trabajo de Fin de Grado (DAM): app móvil en Flutter que automatiza el seguimiento de convocatorias del BOPA y genera tests de práctica con IA local (Ollama), con privacidad total por diseño.
      </p>

      <!-- Tech stack pills -->
      <div class="flex flex-wrap gap-2 pt-2">
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">Flutter</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">Spring Boot</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">IA Local (Ollama)</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">PostgreSQL</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">RGPD</span>
      </div>

      <!-- Fila de metadatos ROL | AÑO | CICLO | LICENCIA -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-white/[0.08] text-xs font-mono">
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">ROL</span>
          <span class="text-white font-bold mt-0.5 block">Full-stack + Infra</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">AÑO</span>
          <span class="text-white font-bold mt-0.5 block">2025–2026</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">CICLO</span>
          <span class="text-white font-bold mt-0.5 block">DAM (TFG)</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 uppercase font-bold block">LICENCIA</span>
          <span class="text-white font-bold mt-0.5 block">MIT</span>
        </div>
      </div>
    </div>

    <!-- Banner Galería App Mockup -->
    <div class="rounded-3xl overflow-hidden border border-white/10 bg-[#161822] p-6 shadow-2xl">
      <img src="https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1200&q=80" alt="OposApp Full Showcase" class="w-full h-auto rounded-xl object-cover" />
    </div>

    <!-- Fila de Rendimiento / Benchmarks -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 text-center space-y-1">
        <div class="text-3xl font-black font-mono text-[var(--color-accent,#f97316)]">187 ms</div>
        <div class="text-[10px] text-zinc-400 font-mono">Listado de 200 convocatorias</div>
      </div>
      <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 text-center space-y-1">
        <div class="text-3xl font-black font-mono text-[var(--color-accent,#f97316)]">11,3 s</div>
        <div class="text-[10px] text-zinc-400 font-mono">Test IA (10 preguntas)</div>
      </div>
      <div class="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 text-center space-y-1">
        <div class="text-3xl font-black font-mono text-[var(--color-accent,#f97316)]">312 ms</div>
        <div class="text-[10px] text-zinc-400 font-mono">Login con BCrypt</div>
      </div>
    </div>

    <!-- Sección Qué hace y detalles técnicos -->
    <div class="space-y-4 pt-4">
      <h3 class="text-xl font-black text-white">Qué hace</h3>
      <ul class="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed list-disc list-inside">
        <li><strong class="text-white">Seguimiento automático del BOPA:</strong> un workflow de n8n rastrea el boletín oficial cada día a las 07:00 y guarda convocatorias nuevas en PostgreSQL.</li>
        <li><strong class="text-white">Tests con IA local:</strong> modelo en local (Ollama) genera tests personalizados sin enviar ningún dato a servicios externos.</li>
        <li><strong class="text-white">Dashboard de progreso:</strong> KPIs en tiempo real (tests completados, tasa de aciertos y racha de estudio).</li>
      </ul>
    </div>

  </div>
</section>
`,
    css: ""
  },
  {
    id: "comp_ivn_project_detail_subsforge",
    name: "Detalle de Proyecto: SubsForge",
    slug: "detalle-proyecto-subsforge",
    category: "Content",
    type: "project_detail",
    framework: "tailwind",
    description: "Ficha de detalle para SubsForge (Tauri 2, Rust, Whisper local, Piper TTS, Silero VAD).",
    html: `
<section id="detalle-subsforge" class="w-full py-12 md:py-20 bg-[#0d0e12]">
  <div class="max-w-4xl mx-auto px-6 space-y-10">
    
    <!-- Botón Volver -->
    <div>
      <a href="#inicio" data-route-to="/portfolio" class="inline-flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 hover:text-[var(--color-accent,#f97316)] transition-colors cursor-pointer">
        <span>← Volver a proyectos</span>
      </a>
    </div>

    <!-- Cabecera de Proyecto -->
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-0.5 text-xs font-mono font-bold text-violet-400">
          OPEN SOURCE · 100% LOCAL
        </span>
      </div>

      <h1 class="text-4xl sm:text-5xl font-black text-white tracking-tight">
        SubsForge — Subtítulos con IA
      </h1>

      <p class="text-sm sm:text-base text-zinc-300/90 leading-relaxed font-normal">
        Suite de escritorio para traducción, síntesis de voz, sincronización milimétrica e incrustación de subtítulos con modelos locales Whisper y Piper en tu GPU/CPU.
      </p>

      <div class="flex flex-wrap gap-2 pt-2">
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">Tauri 2</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">Rust</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">Python</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">Whisper.cpp</span>
        <span class="rounded-lg bg-[#141620] border border-white/10 px-3 py-1 text-xs font-mono font-semibold text-zinc-300">Silero VAD</span>
      </div>
    </div>

    <!-- Banner Imagen -->
    <div class="rounded-3xl overflow-hidden border border-white/10 bg-[#161822] p-6 shadow-2xl">
      <img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80" alt="SubsForge Showcase" class="w-full h-auto rounded-xl object-cover" />
    </div>

  </div>
</section>
`,
    css: ""
  },
  {
    id: "comp_ivn_contact",
    name: "Terminal de Contacto Iván Jonás",
    slug: "terminal-contacto-ivan-jonas",
    category: "Contact",
    type: "contact",
    framework: "tailwind",
    description: "Caja de contacto estilo terminal interactiva con selector de motivos y formulario directo.",
    html: `
<section id="contacto" class="w-full py-16 px-6 relative overflow-hidden bg-transparent">
  <div class="max-w-4xl mx-auto relative z-10">
    <div class="text-center mb-10">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-semibold mb-3">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        DISPONIBLE PARA NUEVOS RETOS
      </div>
      <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Trabajemos juntos<span class="text-[var(--color-accent,#f97316)]">.</span></h2>
      <p class="text-sm sm:text-base text-zinc-400 mt-2 max-w-xl mx-auto">
        ¿Buscas un perfil full-stack / DevOps, un colaborador o un freelance? Cuéntame qué necesitas y te respondo en menos de 24 h.
      </p>
    </div>

    <div class="rounded-2xl border border-white/10 bg-[#0d0e14]/90 backdrop-blur-xl shadow-2xl overflow-hidden font-mono text-sm">
      <div class="h-10 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
        <span class="w-3 h-3 rounded-full bg-red-500/60"></span>
        <span class="w-3 h-3 rounded-full bg-yellow-500/60"></span>
        <span class="w-3 h-3 rounded-full bg-green-500/60"></span>
        <span class="ml-3 text-xs text-zinc-400 font-mono">ivan@pesoz:~/contacto</span>
      </div>

      <form class="p-6 sm:p-8 space-y-6" onsubmit="event.preventDefault(); alert('¡Mensaje enviado con éxito a Iván Jonás!');">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
            <span class="text-[var(--color-accent,#f97316)] font-bold">#</span> ¿Qué te trae por aquí?
          </p>
          <div class="flex flex-wrap gap-2">
            <label class="cursor-pointer">
              <input type="radio" name="motivo" value="laboral" checked class="peer sr-only" />
              <span class="inline-block rounded-lg border border-white/10 px-3.5 py-1.5 text-xs text-zinc-400 transition-all peer-checked:border-[var(--color-accent,#f97316)] peer-checked:bg-orange-500/15 peer-checked:text-[var(--color-accent,#f97316)] peer-checked:font-bold hover:border-white/30">
                Oportunidad laboral
              </span>
            </label>
            <label class="cursor-pointer">
              <input type="radio" name="motivo" value="colaboracion" class="peer sr-only" />
              <span class="inline-block rounded-lg border border-white/10 px-3.5 py-1.5 text-xs text-zinc-400 transition-all peer-checked:border-[var(--color-accent,#f97316)] peer-checked:bg-orange-500/15 peer-checked:text-[var(--color-accent,#f97316)] peer-checked:font-bold hover:border-white/30">
                Colaboración
              </span>
            </label>
            <label class="cursor-pointer">
              <input type="radio" name="motivo" value="freelance" class="peer sr-only" />
              <span class="inline-block rounded-lg border border-white/10 px-3.5 py-1.5 text-xs text-zinc-400 transition-all peer-checked:border-[var(--color-accent,#f97316)] peer-checked:bg-orange-500/15 peer-checked:text-[var(--color-accent,#f97316)] peer-checked:font-bold hover:border-white/30">
                Proyecto freelance
              </span>
            </label>
            <label class="cursor-pointer">
              <input type="radio" name="motivo" value="otro" class="peer sr-only" />
              <span class="inline-block rounded-lg border border-white/10 px-3.5 py-1.5 text-xs text-zinc-400 transition-all peer-checked:border-[var(--color-accent,#f97316)] peer-checked:bg-orange-500/15 peer-checked:text-[var(--color-accent,#f97316)] peer-checked:font-bold hover:border-white/30">
                Otro
              </span>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label class="text-xs text-zinc-400 block mb-1.5"><span class="text-emerald-400 font-bold font-mono">$</span> ¿Cómo te llamas?</label>
            <div class="flex items-center gap-2 border-b border-white/15 pb-1 focus-within:border-[var(--color-accent,#f97316)]">
              <span class="text-[var(--color-accent,#f97316)] font-mono font-bold">↳</span>
              <input type="text" placeholder="Nombre / Empresa" required class="w-full bg-transparent text-white text-xs placeholder-zinc-600 outline-none font-mono" />
            </div>
          </div>
          <div>
            <label class="text-xs text-zinc-400 block mb-1.5"><span class="text-emerald-400 font-bold font-mono">$</span> ¿Tu correo?</label>
            <div class="flex items-center gap-2 border-b border-white/15 pb-1 focus-within:border-[var(--color-accent,#f97316)]">
              <span class="text-[var(--color-accent,#f97316)] font-mono font-bold">↳</span>
              <input type="email" placeholder="tu@correo.com" required class="w-full bg-transparent text-white text-xs placeholder-zinc-600 outline-none font-mono" />
            </div>
          </div>
        </div>

        <div>
          <label class="text-xs text-zinc-400 block mb-1.5"><span class="text-[var(--color-accent,#f97316)] font-bold font-mono">#</span> Cuéntame los detalles</label>
          <div class="flex items-start gap-2 border-b border-white/15 pb-1 focus-within:border-[var(--color-accent,#f97316)]">
            <span class="text-[var(--color-accent,#f97316)] font-mono font-bold pt-1">↳</span>
            <textarea rows="3" placeholder="Rol, proyecto, stack tecnológico, plazos..." required class="w-full bg-transparent text-white text-xs placeholder-zinc-600 outline-none resize-none font-mono"></textarea>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <button type="submit" class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-accent,#f97316)] hover:brightness-110 text-black font-extrabold text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            <span>Enviar mensaje</span>
          </button>
          <p class="text-[11px] text-zinc-500">Sin spam. Tus datos solo se usan para responderte.</p>
        </div>
      </form>
    </div>
  </div>
</section>
`,
    css: ""
  },
  {
    id: "comp_ivn_footer",
    name: "Footer Minimalista Iván Jonás",
    slug: "footer-minimalista-ivan-jonas",
    category: "Footer",
    type: "footer",
    framework: "tailwind",
    description: "Pie de página oscuro con enlaces a redes y copyright.",
    html: `
<footer id="contacto-footer" class="w-full py-10 border-t border-white/[0.08] bg-[#08090d] text-zinc-400 text-xs">
  <div class="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-2">
      <span class="text-white font-bold font-mono tracking-wider">IVN.</span>
      <span class="text-zinc-600">•</span>
      <span>© 2026 Iván Jonás Fernández Correa</span>
    </div>

    <div class="flex items-center gap-6 font-semibold">
      <div class="flex items-center gap-4 text-zinc-400">
        <a href="https://github.com/IvanjonasFC" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors" title="GitHub">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </a>
        <a href="https://linkedin.com/in/ivanjonasfc" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors" title="LinkedIn">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.762-2.239-5-2.239zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        </a>
        <a href="mailto:contacto@ivanjonasfc.dev" class="hover:text-white transition-colors" title="contacto@ivanjonasfc.dev">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </a>
      </div>
      <span class="text-white/20">|</span>
      <button onclick="window.scrollTo({top:0,behavior:'smooth'})" class="hover:text-white transition-colors text-zinc-400 flex items-center gap-1 cursor-pointer">
        <span>Volver arriba</span>
        <span>↑</span>
      </button>
    </div>
  </div>
</footer>
`,
    css: ""
  }
];

// 1. Insertar o actualizar componentes en SQLite
const insertComp = sqlite.prepare(`
  INSERT INTO components (
    id, source, platform, framework, name, slug, category, type, description, files, preview_html, ingested_at
  ) VALUES (
    @id, 'custom_portfolio', 'web', @framework, @name, @slug, @category, @type, @description, @files, @preview_html, @ingested_at
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    preview_html = excluded.preview_html,
    files = excluded.files,
    description = excluded.description
`);

for (const c of components) {
  insertComp.run({
    id: c.id,
    name: c.name,
    slug: c.slug,
    category: c.category,
    type: c.type,
    framework: c.framework,
    description: c.description,
    files: JSON.stringify([{ path: "index.html", content: c.html }]),
    preview_html: c.html,
    ingested_at: now
  });
}
console.log(`✓ Insertados ${components.length} componentes de portfolio en la base de datos.`);

// 2. Crear o actualizar la Marca Iván Jonás
const brandId = "brand_ivan_jonas";
const brandName = "Iván Jonás — Portfolio & Dev";
const brandSlug = "ivan-jonas-portfolio";

const brandTokens = {
  ...defaultBrandTokens(),
  "color.bg": { $value: "#0d0e12", $type: "color" },
  "color.surface": { $value: "#141720", $type: "color" },
  "color.text": { $value: "#f3f4f6", $type: "color" },
  "color.muted": { $value: "#9ca3af", $type: "color" },
  "color.border": { $value: "rgba(255, 255, 255, 0.08)", $type: "color" },
  "color.accent": { $value: "#f97316", $type: "color" },
  "color.action.primary": { $value: "#f97316", $type: "color" },
  "color.action.hover": { $value: "#ea580c", $type: "color" },
  "font.body": { $value: "Inter", $type: "fontFamily" },
  "font.code": { $value: "JetBrains Mono", $type: "fontFamily" },
  "radius.button": { $value: "9999px", $type: "dimension" },
  "radius.card": { $value: "16px", $type: "dimension" },
  blueprint: {
    templateId: "developer-portfolio",
    slots: {
      landing: {
        nav: "comp_ivn_navbar",
        hero: "comp_ivn_hero",
        stats: "comp_ivn_metrics",
        bento: "comp_ivn_bento_numbers",
        projects: "comp_ivn_projects",
        contact: "comp_ivn_contact",
        footer: "comp_ivn_footer",
      },
      portfolio: {
        nav: "comp_ivn_navbar",
        hero: "comp_ivn_hero",
        stats: "comp_ivn_metrics",
        bento: "comp_ivn_bento_numbers",
        projects: "comp_ivn_projects",
        contact: "comp_ivn_contact",
        footer: "comp_ivn_footer",
      },
      marca: {
        nav: "comp_ivn_navbar",
        hero: "comp_ivn_hero",
        stats: "comp_ivn_metrics",
        bento: "comp_ivn_bento_numbers",
        projects: "comp_ivn_projects",
        contact: "comp_ivn_contact",
        footer: "comp_ivn_footer",
      },
      content: {
        nav: "comp_ivn_navbar",
        hero: "comp_ivn_project_detail_oposapp",
        footer: "comp_ivn_footer",
      },
      form: {
        nav: "comp_ivn_navbar",
        contact: "comp_ivn_contact",
        footer: "comp_ivn_footer",
      }
    },
    sceneLayouts: {
      landing: [
        { id: "nav_1", type: "nav", label: "Navegación Principal", componentId: "comp_ivn_navbar", order: 0 },
        { id: "hero_1", type: "hero", label: "Hero Developer Iván Jonás", componentId: "comp_ivn_hero", props: HERO_COMPONENT_DEFINITION.defaultProps, order: 1 },
        { id: "stats_1", type: "stats", label: "Barra de Métricas (Años, Proyectos, Infra)", componentId: "comp_ivn_metrics", order: 2 },
        { id: "bento_1", type: "bento", label: "Iván en números (Terminal + GitHub + Trayectoria)", componentId: "comp_ivn_bento_numbers", order: 3 },
        { id: "projects_1", type: "cards", label: "Proyectos Destacados (10 Proyectos)", componentId: "comp_ivn_projects", dataBinding: { source: "portfolio-projects", layout: "grid" }, order: 4 },
        { id: "contact_1", type: "contact", label: "Terminal de Contacto (Trabajemos juntos)", componentId: "comp_ivn_contact", order: 5 },
        { id: "footer_1", type: "footer", label: "Pie de Página", componentId: "comp_ivn_footer", order: 6 },
      ],
      portfolio: [
        { id: "nav_1", type: "nav", label: "Navegación Principal", componentId: "comp_ivn_navbar", order: 0 },
        { id: "hero_1", type: "hero", label: "Hero Developer Iván Jonás", componentId: "comp_ivn_hero", props: HERO_COMPONENT_DEFINITION.defaultProps, order: 1 },
        { id: "stats_1", type: "stats", label: "Barra de Métricas (Años, Proyectos, Infra)", componentId: "comp_ivn_metrics", order: 2 },
        { id: "bento_1", type: "bento", label: "Iván en números (Terminal + GitHub + Trayectoria)", componentId: "comp_ivn_bento_numbers", order: 3 },
        { id: "projects_1", type: "cards", label: "Proyectos Destacados (10 Proyectos)", componentId: "comp_ivn_projects", dataBinding: { source: "portfolio-projects", layout: "grid" }, order: 4 },
        { id: "contact_1", type: "contact", label: "Terminal de Contacto (Trabajemos juntos)", componentId: "comp_ivn_contact", order: 5 },
        { id: "footer_1", type: "footer", label: "Pie de Página", componentId: "comp_ivn_footer", order: 6 },
      ],
      marca: [
        { id: "nav_1", type: "nav", label: "Navegación Principal", componentId: "comp_ivn_navbar", order: 0 },
        { id: "hero_1", type: "hero", label: "Hero Developer Iván Jonás", componentId: "comp_ivn_hero", props: HERO_COMPONENT_DEFINITION.defaultProps, order: 1 },
        { id: "stats_1", type: "stats", label: "Barra de Métricas (Años, Proyectos, Infra)", componentId: "comp_ivn_metrics", order: 2 },
        { id: "bento_1", type: "bento", label: "Iván en números (Terminal + GitHub + Trayectoria)", componentId: "comp_ivn_bento_numbers", order: 3 },
        { id: "projects_1", type: "cards", label: "Proyectos Destacados (10 Proyectos)", componentId: "comp_ivn_projects", dataBinding: { source: "portfolio-projects", layout: "grid" }, order: 4 },
        { id: "contact_1", type: "contact", label: "Terminal de Contacto (Trabajemos juntos)", componentId: "comp_ivn_contact", order: 5 },
        { id: "footer_1", type: "footer", label: "Pie de Página", componentId: "comp_ivn_footer", order: 6 },
      ],
      content: [
        { id: "nav_1", type: "nav", label: "Navegación Principal", componentId: "comp_ivn_navbar", order: 0 },
        { id: "detail_1", type: "hero", label: "Ficha Técnica de Proyecto (CMS)", componentId: "comp_project_detail", dataBinding: { source: "portfolio-projects", layout: "detail" }, order: 1 },
        { id: "footer_1", type: "footer", label: "Pie de Página", componentId: "comp_ivn_footer", order: 2 },
      ],
      form: [
        { id: "nav_1", type: "nav", label: "Navegación Principal", componentId: "comp_ivn_navbar", order: 0 },
        { id: "contact_1", type: "contact", label: "Terminal de Contacto (Trabajemos juntos)", componentId: "comp_ivn_contact", order: 1 },
        { id: "footer_1", type: "footer", label: "Pie de Página", componentId: "comp_ivn_footer", order: 2 },
      ]
    },
    customRoutes: [
      { path: "/", sceneId: "landing", title: "Inicio (Principal)", icon: "home", description: "Portada, bio interactiva y experiencia en vivo" },
      { path: "/portfolio", sceneId: "portfolio", title: "Portfolio & Proyectos", icon: "briefcase", description: "Catálogo completo de proyectos y stack" },
      { path: "/proyectos/[slug]", sceneId: "content", title: "Ficha de Proyecto", icon: "file-text", parentPath: "/portfolio", isDynamic: true, description: "Plantilla única de detalle dinámico para proyectos" },
      ...INITIAL_PORTFOLIO_PROJECTS.map((p) => ({
        path: `/proyectos/${p.slug}`,
        sceneId: "content" as const,
        title: p.title,
        icon: "file-text",
        parentPath: "/portfolio",
        description: p.summary || `Detalle técnico de ${p.title}`,
      })),
      { path: "/contacto", sceneId: "form", title: "Contacto & Redes", icon: "mail", description: "Terminal de contacto interactiva y canales oficiales" }
    ],
    schemaVersion: 2,
    projects: INITIAL_PORTFOLIO_PROJECTS,
  }
};

const previewIds = components.map((c) => c.id);

const upsertBrand = sqlite.prepare(`
  INSERT INTO brands (
    id, name, slug, description, tokens, preview_ids, created_at, updated_at
  ) VALUES (
    @id, @name, @slug, @description, @tokens, @preview_ids, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    tokens = excluded.tokens,
    preview_ids = excluded.preview_ids,
    updated_at = excluded.updated_at
`);

upsertBrand.run({
  id: brandId,
  name: brandName,
  slug: brandSlug,
  description: "Marca y Sistema de Diseño oficial de Iván Jonás (Full-Stack & DevOps). Reutilizable en apps, dashboards y landings.",
  tokens: JSON.stringify(brandTokens),
  preview_ids: JSON.stringify(previewIds),
  created_at: now,
  updated_at: now,
});

console.log(`✓ Marca creada con éxito: ${brandName} (ID: ${brandId}) con los 9 proyectos, pestañas de Bento Grid y páginas de detalle`);
