"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import AddToCollection from "@/components/AddToCollection";
import PROMPTS_DATA from "../../../data/prompts-catalog.json";
import BrowserMockupFrame from "@/components/prompts/BrowserMockupFrame";
import JaxonPreview from "@/components/prompts/JaxonPreview";
import VideoLandingHeroPreview from "@/components/prompts/VideoLandingHeroPreview";
import KanbanBoardPreview from "@/components/prompts/KanbanBoardPreview";
import DataTablePreview from "@/components/prompts/DataTablePreview";
import BentoGridPreview from "@/components/prompts/BentoGridPreview";
import SplitAuthPreview from "@/components/prompts/SplitAuthPreview";
import TelemetryDashboardPreview from "@/components/prompts/TelemetryDashboardPreview";
import PricingMatrixPreview from "@/components/prompts/PricingMatrixPreview";
import AuroraHeroPreview from "@/components/prompts/AuroraHeroPreview";
import PromptStudioView from "@/components/prompts/PromptStudioView";

function formatSourceLabel(src: string): string {
  const s = src.toLowerCase();
  if (s.includes("vibecoding")) return "Reddit · vibecoding";
  if (s.includes("awesome-v0")) return "GitHub · v0";
  if (s.includes("claude-ui")) return "GitHub · Claude";
  if (s.includes("ui-prompt")) return "GitHub · UI Lib";
  if (s.includes("sceneai")) return "SceneAI";
  if (s.includes("ipromptui")) return "iPromptUI";
  return src.length > 18 ? src.slice(0, 16) + "..." : src;
}

interface PromptItem {
  id: string;
  title: string;
  category: string;
  type?: string;
  description?: string | null;
  thumbnail?: string | null;
  animatedVideo?: string | null;
  hasPrompt: boolean;
  prompt?: string | null;
  source?: string;
  isAuthenticPrompt?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  sceneai: "#38bdf8",
  ipromptui: "#818cf8",
  vibecoding: "#ec4899",
  "github / vibecoding": "#ec4899",
  "github ui library": "#34d399",
};

// Componente para tarjetas con visualización real y streaming de vídeo en hover
function PromptCardMedia({ item }: { item: PromptItem }) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = Boolean(item.animatedVideo && item.animatedVideo.endsWith(".mp4"));
  const thumbnailSrc = (!imgError && item.thumbnail) ? item.thumbnail : null;

  useEffect(() => {
    if (isHovered && hasVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered, hasVideo]);

  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden bg-[#090b12] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Imagen Real HD (CDN) */}
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className={`h-full w-full object-cover transition-all duration-500 ${
            isHovered && hasVideo ? "opacity-0" : "opacity-100 group-hover:scale-105"
          }`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0c101c] via-[#14192b] to-[#070910] p-4 text-center">
          <div className="rounded-full bg-white/5 p-3 text-[var(--color-accent)] border border-white/10 mb-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <span className="text-xs font-bold text-white line-clamp-1">{item.title}</span>
          <span className="text-[10px] text-[var(--color-muted)]">{item.category}</span>
        </div>
      )}

      {/* 2. Vídeo Real en Hover (autovideo streaming fluido) */}
      {hasVideo && (
        <video
          ref={videoRef}
          src={item.animatedVideo!}
          loop
          muted
          playsInline
          preload="none"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 pointer-events-none ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* 3. Indicador de Vídeo MP4 disponible */}
      {hasVideo && (
        <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white border border-white/15">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>VÍDEO MP4</span>
        </div>
      )}

      {/* 4. Overlay sutil */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-40 group-hover:opacity-10 transition-opacity pointer-events-none" />
    </div>
  );
}

// Componente de demostración interactiva que renderiza el producto REAL
function LiveProjectPreview({
  item,
  isFullscreen,
  onToggleFullscreen,
}: {
  item: PromptItem;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const t = (item.title + " " + (item.category || "") + " " + (item.description || "")).toLowerCase();

  let previewContent = null;

  // 1. Jaxon Portfolio Landing Page (Proyecto Real con Vídeo HD, Casos de Estudio y Calculadora de Presupuesto)
  if (t.includes("jaxon")) {
    previewContent = <JaxonPreview />;
  }
  // 2. Linear-Style Kanban Board
  else if (item.id === "comm_kanban_board_08" || t.includes("kanban")) {
    previewContent = <KanbanBoardPreview />;
  }
  // 3. User & Team Management Data Table
  else if (item.id === "comm_data_table_07" || (t.includes("table") && (t.includes("team") || t.includes("user") || t.includes("management")))) {
    previewContent = <DataTablePreview />;
  }
  // 4. Linear Dynamic Bento Grid
  else if (item.id === "comm_bento_linear_01" || t.includes("bento")) {
    previewContent = <BentoGridPreview />;
  }
  // 5. Editorial Split-Screen Auth Portal
  else if (item.id === "comm_auth_split_06" || (t.includes("split") && t.includes("auth"))) {
    previewContent = <SplitAuthPreview />;
  }
  // 6. Developer Telemetry & Analytics Dashboard
  else if (item.id === "comm_dashboard_telemetry_04" || t.includes("telemetry") || (t.includes("dashboard") && t.includes("analytics"))) {
    previewContent = <TelemetryDashboardPreview />;
  }
  // 7. SaaS 3-Tier Pricing Matrix
  else if (item.id === "comm_pricing_matrix_03" || (t.includes("pricing") && t.includes("matrix"))) {
    previewContent = <PricingMatrixPreview />;
  }
  // 8. Aurora Mesh Gradient AI Hero
  else if (item.id === "comm_aurora_hero_05" || t.includes("aurora")) {
    previewContent = <AuroraHeroPreview />;
  }
  // 9. Todos los demás componentes y Hero Sections con vídeo o visuales de alta fidelidad
  else {
    previewContent = <VideoLandingHeroPreview item={item} />;
  }

  return (
    <BrowserMockupFrame
      title={item.title}
      category={item.category}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    >
      {previewContent}
    </BrowserMockupFrame>
  );
}

export default function PromptsPage() {
  const [items] = useState<PromptItem[]>(PROMPTS_DATA as PromptItem[]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeModal, setActiveModal] = useState<PromptItem | null>(null);
  const [modalTab, setModalTab] = useState<"video" | "live" | "prompt" | "code">("live");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const copyPrompt = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast("Copiado al portapapeles");
  };

  const openModal = (item: PromptItem, tab: "video" | "live" | "prompt" | "code" = "live") => {
    setActiveModal(item);
    setModalTab(tab);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchQ =
        !q ||
        item.title.toLowerCase().includes(q.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(q.toLowerCase())) ||
        item.category.toLowerCase().includes(q.toLowerCase()) ||
        (item.source && item.source.toLowerCase().includes(q.toLowerCase()));

      if (!matchQ) return false;

      if (filter === "all") return true;
      if (filter === "authentic") return !!(item as any).isAuthenticPrompt;
      if (filter === "hero") return item.category.toLowerCase().includes("hero");
      if (filter === "dashboard") return item.category.toLowerCase().includes("dashboard");
      if (filter === "landing") return item.category.toLowerCase().includes("landing");
      if (filter === "bento") return item.category.toLowerCase().includes("bento") || item.category.toLowerCase().includes("card");
      if (filter === "form") return item.category.toLowerCase().includes("form") || item.category.toLowerCase().includes("table");
      if (filter === "nav") return item.category.toLowerCase().includes("nav") || item.category.toLowerCase().includes("footer");
      if (filter === "sceneai") return (item.source || "").toLowerCase().includes("sceneai");
      if (filter === "ipromptui") return (item.source || "").toLowerCase().includes("ipromptui");
      if (filter === "vibecoding") return (item.source || "").toLowerCase().includes("vibe") || (item.source || "").toLowerCase().includes("github");

      return true;
    });
  }, [items, q, filter]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-[var(--color-accent)] bg-black/90 px-4 py-3 text-sm font-semibold text-[var(--color-accent)] shadow-xl backdrop-blur-md">
          {toastMsg}
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-[1700px] px-6 py-6 flex flex-col gap-6">
        {/* Search & Header Bar */}
        <div className="card-surface flex flex-col gap-4 rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-muted)]">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por título, componente (Hero, Dashboard, Bento, Formulario, Viajes, Finanzas)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-[var(--color-muted)] outline-none"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-xs text-[var(--color-muted)] hover:text-white">
                  ✕
                </button>
              )}
            </div>
            <div className="text-xs font-medium text-[var(--color-muted)]">
              Mostrando <span className="text-white font-bold">{filteredItems.length}</span> de {items.length} componentes maestros
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {[
              { id: "all", label: `Todos (${items.length})` },
              { id: "authentic", label: `Prompts Originales (${items.filter((i: any) => i.isAuthenticPrompt).length})` },
              { id: "hero", label: "Hero Sections" },
              { id: "dashboard", label: "Dashboards" },
              { id: "landing", label: "Landing Pages" },
              { id: "bento", label: "Cards & Bento" },
              { id: "form", label: "Forms & Tables" },
              { id: "nav", label: "Navbars & Footers" },
              { id: "sceneai", label: "SceneAI" },
              { id: "ipromptui", label: "iPromptUI" },
              { id: "vibecoding", label: "VibeCoding / GitHub" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-md px-3 py-1.5 font-semibold transition-all ${
                  filter === f.id
                    ? "bg-[var(--color-accent)] text-black"
                    : "bg-white/5 text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((item) => {
            const srcKey = (item.source || "sceneai").toLowerCase();
            const badgeColor = SOURCE_COLORS[srcKey] || "#38bdf8";

            return (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-xl"
              >
                {/* Visual Preview Container con Video Hover y Captura Real */}
                <div onClick={() => openModal(item)} className="relative">
                  <PromptCardMedia item={item} />
                  
                  {/* Source & Category Badges (Top Left) */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none max-w-[calc(100%-60px)]">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm truncate max-w-[130px]"
                      style={{ backgroundColor: badgeColor }}
                    >
                      {formatSourceLabel(item.source || "SceneAI")}
                    </span>
                    <span className="rounded bg-black/75 backdrop-blur-md border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90 truncate max-w-[90px]">
                      {item.category}
                    </span>
                  </div>

                  {/* Authentic Prompt Pill (Bottom Left) */}
                  {(item as any).isAuthenticPrompt && (
                    <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
                      <span className="flex items-center gap-1 rounded bg-black/80 backdrop-blur-md border border-emerald-500/50 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase shadow-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        PROMPT ORIGINAL
                      </span>
                    </div>
                  )}

                  {/* Add to collection button */}
                  <div className="absolute top-2.5 right-2.5 z-10" onClick={(e) => e.stopPropagation()}>
                    <AddToCollection
                      componentId={`prompt_${item.id}`}
                      compact={true}
                    />
                  </div>

                  {/* View Details hover indicator */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="rounded-full bg-black/80 backdrop-blur-md border border-[var(--color-accent)] px-3.5 py-1.5 text-xs font-bold text-[var(--color-accent)] shadow-lg flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                      Ver Producto Real
                    </div>
                  </div>
                </div>

                {/* Card Info & Content */}
                <div className="flex flex-1 flex-col justify-between p-4 gap-3">
                  <div>
                    <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-[var(--color-accent)] transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">
                      {item.description || "Componente y arquitectura visual de alta fidelidad."}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={(e) => copyPrompt(item.prompt || "", e)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-bold text-black shadow-sm transition-all hover:opacity-90 active:scale-95"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copiar Prompt
                    </button>

                    <button
                      onClick={() => openModal(item)}
                      title="Abrir proyecto interactivo y especificaciones"
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-[var(--color-muted)] hover:border-white/20 hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail & Inspection Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className={`card-surface relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-2xl transition-all duration-300 ${
              isFullscreen
                ? "w-[98vw] max-w-[1750px] h-[96vh] max-h-[96vh]"
                : "w-full max-w-6xl max-h-[92vh]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[var(--color-panel-2)] px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{activeModal.title}</h2>
                  <span className="rounded bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40 px-2 py-0.5 text-[10px] font-bold text-[var(--color-accent)] uppercase">
                    PROYECTO COMPLETO
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {activeModal.category} · Fuente: {activeModal.source || "SceneAI"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AddToCollection
                  componentId={`prompt_${activeModal.id}`}
                />
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Restaurar tamaño normal" : "Pantalla completa"}
                  className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-white/10 hover:text-white transition-colors"
                >
                  {isFullscreen ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setIsFullscreen(false);
                  }}
                  className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-white/10 hover:text-white transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-black/40 px-6 py-2.5 text-xs font-semibold">
              <button
                onClick={() => setModalTab("video")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  modalTab === "video"
                    ? "bg-[var(--color-accent)] text-black"
                    : "text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Vídeo & Captura Real HD
              </button>

              <button
                onClick={() => setModalTab("live")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  modalTab === "live"
                    ? "bg-[var(--color-accent)] text-black"
                    : "text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Proyecto Interactivo React
              </button>

              <button
                onClick={() => setModalTab("prompt")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  modalTab === "prompt"
                    ? "bg-[var(--color-accent)] text-black"
                    : "text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Prompt Maestro para IA
              </button>

              <button
                onClick={() => setModalTab("code")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  modalTab === "code"
                    ? "bg-[var(--color-accent)] text-black"
                    : "text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Código React TSX
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Tab 1: Video & Real Capture */}
              {modalTab === "video" && (
                <div className="flex flex-col gap-3">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black flex items-center justify-center relative shadow-2xl min-h-[300px]">
                    {activeModal.animatedVideo ? (
                      <video
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        src={activeModal.animatedVideo}
                        className="max-h-[420px] w-full object-contain rounded-lg bg-black"
                      />
                    ) : activeModal.thumbnail ? (
                      <img
                        src={activeModal.thumbnail}
                        alt={activeModal.title}
                        className="max-h-[420px] w-full object-contain rounded-lg bg-black"
                      />
                    ) : (
                      <div className="p-12 text-center text-sm text-[var(--color-muted)]">
                        No hay vídeo o captura disponible para este componente.
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] flex items-center justify-between px-1">
                    <span>Grabación en funcionamiento real y captura de alta fidelidad.</span>
                    {activeModal.animatedVideo && (
                      <a
                        href={activeModal.animatedVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-accent)] hover:underline flex items-center gap-1"
                      >
                        Abrir vídeo en nueva pestaña ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Live Interactive Component */}
              {modalTab === "live" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-[var(--color-muted)] px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-white">Producto Real en Funcionamiento</span>
                      <span className="text-white/40">· React 19 + Tailwind CSS v4</span>
                    </div>
                    <span className="text-[var(--color-accent)] font-mono text-[11px]">
                      {isFullscreen ? "Modo Pantalla Completa" : "Vista Interactiva de Navegador"}
                    </span>
                  </div>
                  <LiveProjectPreview
                    item={activeModal}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                  />
                </div>
              )}

              {/* Tab 3: Prompt Maestro Studio */}
              {modalTab === "prompt" && (
                <PromptStudioView
                  item={activeModal}
                  onCopy={(text) => copyPrompt(text)}
                />
              )}

              {/* Tab 4: Code TSX */}
              {modalTab === "code" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
                      Componente React Funcional (Listo para importar):
                    </span>
                    <button
                      onClick={() => {
                        const codeSample = `// ${activeModal.title} - Golden Path Component\nexport default function ${activeModal.title.replace(/[^a-zA-Z0-9]/g, '')}() {\n  return (\n    <section className="relative w-full min-h-screen flex flex-col justify-center items-center bg-slate-950 text-white p-8">\n      <h1 className="text-4xl font-extrabold tracking-tight">${activeModal.title}</h1>\n      <p className="mt-3 text-slate-400 max-w-lg text-center">${activeModal.description}</p>\n      <div className="mt-6 flex gap-4">\n        <button className="rounded-lg bg-sky-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-sky-400">Iniciar</button>\n        <button className="rounded-lg border border-white/20 px-6 py-2.5 text-sm font-semibold hover:bg-white/10">Ver Demo</button>\n      </div>\n    </section>\n  );\n}`;
                        copyPrompt(codeSample);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold text-black shadow-sm hover:opacity-90 active:scale-95"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      Copiar Código TSX
                    </button>
                  </div>

                  <div className="relative rounded-xl border border-white/10 bg-black/80 p-4">
                    <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-sky-300">
{`// Componente: ${activeModal.title}
// Generado para React 19 y Tailwind CSS v4
// Compatible con tokens semánticos de Golden Path

export default function ${activeModal.title.replace(/[^a-zA-Z0-9]/g, '')}() {
  return (
    <section className="relative w-full min-h-screen flex flex-col justify-center items-center bg-[var(--color-bg,#0a0d14)] text-white p-8">
      <div className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300 mb-4">
        ${activeModal.category.toUpperCase()}
      </div>
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-center max-w-2xl">
        ${activeModal.title}
      </h1>
      <p className="mt-4 text-sm sm:text-base text-white/70 max-w-xl text-center leading-relaxed">
        ${activeModal.description}
      </p>
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <button className="rounded-lg bg-[var(--color-action-primary,#38bdf8)] px-6 py-3 text-sm font-bold text-black hover:opacity-90 transition-opacity">
          Empezar Ahora
        </button>
        <button className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-colors">
          Documentación
        </button>
      </div>
    </section>
  );
}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* Description */}
              {activeModal.description && (
                <div className="border-t border-white/5 pt-2">
                  <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-1">Descripción:</h4>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {activeModal.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-[var(--color-panel-2)] px-6 py-4">
              <div className="text-xs text-[var(--color-muted)]">
                Compatible con <span className="text-white font-semibold">Tailwind v4</span>, <span className="text-white font-semibold">React 19</span> y el sistema de marcas de Golden Path.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyPrompt(activeModal.prompt || "")}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-black shadow-sm hover:opacity-90 active:scale-95"
                >
                  Copiar Prompt Maestro
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
