"use client";

import { useState, ReactNode } from "react";

interface BrowserMockupFrameProps {
  title: string;
  url?: string;
  category?: string;
  children: ReactNode;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onResetState?: () => void;
}

export default function BrowserMockupFrame({
  title,
  url,
  category,
  children,
  isFullscreen = false,
  onToggleFullscreen,
  onResetState,
}: BrowserMockupFrameProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const cleanSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);
  const displayUrl = url || `https://${cleanSlug || "app"}.design/preview`;

  const copyUrl = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    if (onResetState) onResetState();
  };

  return (
    <div className="flex flex-col w-full rounded-2xl border border-white/15 bg-[#090b11] shadow-2xl overflow-hidden transition-all duration-300">
      {/* Browser Chrome Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#121624] px-4 py-2.5 select-none">
        {/* Left: Traffic Lights & Navigation Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56] opacity-80" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e] opacity-80" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f] opacity-80" />
          </div>

          <div className="hidden sm:flex items-center gap-1 text-white/40">
            <button
              onClick={handleRefresh}
              title="Recargar componente"
              className="rounded p-1 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Center: Address Bar with SSL Lock & URL */}
        <div className="flex flex-1 max-w-md items-center justify-between rounded-lg border border-white/10 bg-black/50 px-3 py-1 text-xs text-white/80 shadow-inner">
          <div className="flex items-center gap-2 truncate">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="font-mono text-[11px] text-white/90 truncate">{displayUrl}</span>
          </div>

          <button
            onClick={copyUrl}
            title="Copiar URL"
            className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            {copiedUrl ? "Copiada" : "Copiar"}
          </button>
        </div>

        {/* Right: Viewport Device Switcher & Fullscreen Toggle */}
        <div className="flex items-center gap-2">
          {/* Device Switcher without Emojis */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-0.5 text-xs text-white/70">
            <button
              onClick={() => setViewport("desktop")}
              title="Escritorio (100%)"
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewport === "desktop" ? "bg-white/20 text-white shadow-sm font-bold" : "hover:text-white"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Escritorio</span>
            </button>

            <button
              onClick={() => setViewport("tablet")}
              title="Tablet (768px)"
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewport === "tablet" ? "bg-white/20 text-white shadow-sm font-bold" : "hover:text-white"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Tablet</span>
            </button>

            <button
              onClick={() => setViewport("mobile")}
              title="Móvil (390px)"
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
                viewport === "mobile" ? "bg-white/20 text-white shadow-sm font-bold" : "hover:text-white"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Móvil</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Restaurar tamaño normal" : "Expandir a pantalla completa"}
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70 hover:bg-white/15 hover:text-white transition-all"
            >
              {isFullscreen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="w-full bg-[#04060a] p-2 sm:p-4 overflow-x-auto min-h-[500px]">
        <div
          key={refreshKey}
          className={`mx-auto transition-all duration-300 ${
            viewport === "mobile"
              ? "w-[390px] rounded-3xl border-4 border-slate-700/60 shadow-2xl overflow-hidden"
              : viewport === "tablet"
              ? "w-[768px] rounded-2xl border-2 border-slate-700/50 shadow-2xl overflow-hidden"
              : "w-full rounded-xl overflow-hidden"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
