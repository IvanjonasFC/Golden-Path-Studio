"use client";

import { useState, useMemo, useEffect } from "react";
import { getResolvedValue, type TokenGroup } from "@/lib/tokens";

interface BrandItem {
  id: string;
  name: string;
  tokens: TokenGroup;
}

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
  isAuthenticPrompt?: boolean;
}

interface PromptStudioViewProps {
  item: PromptItem;
  onCopy: (text: string) => void;
}

export default function PromptStudioView({ item, onCopy }: PromptStudioViewProps) {
  // Target AI selection
  const [targetAi, setTargetAi] = useState<"cursor" | "v0" | "bolt" | "cursorrules" | "raw">("cursor");
  
  // Customizer options
  const [framework, setFramework] = useState<"react19" | "nextjs" | "vanilla">("react19");
  const [includeBrandTokens, setIncludeBrandTokens] = useState(true);
  const [animationLevel, setAnimationLevel] = useState<"advanced" | "lightweight" | "none">("advanced");
  const [strictTypes, setStrictTypes] = useState(true);

  // Real Brand Selection from Local Vault
  const [availableBrands, setAvailableBrands] = useState<BrandItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("default");

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => {
        if (data?.items && Array.isArray(data.items)) {
          setAvailableBrands(data.items);
        }
      })
      .catch(() => {});
  }, []);

  // View mode
  const [viewMode, setViewMode] = useState<"structured" | "raw">("structured");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const rawBasePrompt = useMemo(() => {
    const base = item.prompt || `Build a high-fidelity ${item.category} component titled "${item.title}".\n\n### Specifications:\n- Responsive layout with Tailwind CSS.\n- Modern dark aesthetic with 60 FPS micro-interactions.\n- Clean React component architecture.`;
    return base
      .replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/[✨✦★🔥▲▼⚡🤖📊📦📄📁🛡️🕯️⏸▶🔇🔊✔✓]/g, "");
  }, [item.prompt, item.category, item.title]);

  // Extract tokens from selected brand
  const activeBrandData = useMemo(() => {
    if (selectedBrandId === "default") return null;
    return availableBrands.find((b) => b.id === selectedBrandId) || null;
  }, [selectedBrandId, availableBrands]);

  // Dynamic Prompt Generator tailored to selected Target AI and Options
  const tailoredPrompt = useMemo(() => {
    let frameworkDirective = "";
    if (framework === "react19") {
      frameworkDirective = "Use React 19 functional component with modern hooks and Tailwind CSS v4 (using @theme CSS tokens).";
    } else if (framework === "nextjs") {
      frameworkDirective = "Generate a production-ready Next.js 15 (App Router) 'use client' component with clean TypeScript types and Tailwind CSS.";
    } else {
      frameworkDirective = "Build as a clean, dependency-free HTML5 + Vanilla CSS file with responsive clamp() spacing.";
    }

    let brandDirective = "";
    if (includeBrandTokens) {
      if (activeBrandData) {
        const bg = getResolvedValue(activeBrandData.tokens, "color.bg") || "#05060a";
        const surface = getResolvedValue(activeBrandData.tokens, "color.surface") || "#0e1322";
        const text = getResolvedValue(activeBrandData.tokens, "color.text") || "#ffffff";
        const primary = getResolvedValue(activeBrandData.tokens, "color.action.primary") || "#f0a470";
        const accent = getResolvedValue(activeBrandData.tokens, "color.action.accent") || "#38bdf8";
        const fontHead = getResolvedValue(activeBrandData.tokens, "font.heading") || "Inter";
        const fontBody = getResolvedValue(activeBrandData.tokens, "font.body") || "system-ui";
        const radBtn = getResolvedValue(activeBrandData.tokens, "radius.button") || "8px";
        const radCard = getResolvedValue(activeBrandData.tokens, "radius.card") || "12px";

        brandDirective = `\n### Brand & Design Tokens (Identidad Activa: ${activeBrandData.name}):\n- Canvas Background: ${bg}\n- Surface Panel: ${surface} with hairline border rgba(255,255,255,0.08)\n- Primary Action: ${primary}\n- Accent Highlight: ${accent}\n- Text Color: ${text}\n- Typography: Headings in "${fontHead}", Body text in "${fontBody}"\n- Border Radii: Buttons ${radBtn}, Cards ${radCard}`;
      } else {
        brandDirective = "\n### Brand & Design Tokens (Golden Path Studio):\n- Canvas Background: #05060a (Deep obsidian black)\n- Primary Accent: #f0a470 / #38bdf8 (Vibrant interactive highlights)\n- Border Hairline: rgba(255, 255, 255, 0.1)\n- Surface Panels: rgba(255, 255, 255, 0.03) with backdrop-blur-xl";
      }
    }

    let animDirective = "";
    if (animationLevel === "advanced") {
      animDirective = "\n### Micro-interactions & Animations:\n- 60 FPS GPU-accelerated transitions (transform, opacity).\n- Subtle hover elevation (-translate-y-1) and luminous border brightens on focus.\n- Smooth reactive state changes without layout shift.";
    } else if (animationLevel === "lightweight") {
      animDirective = "\n### Micro-interactions:\n- Minimal CSS transitions (transition-colors duration-200), keeping bundle size at minimum.";
    } else {
      animDirective = "\n### Animation:\n- Clean, static layout without decorative animations for maximum rendering performance.";
    }

    let typesDirective = strictTypes
      ? "\n### TypeScript Standards:\n- Export strict TypeScript interface types for all props and internal state models.\n- Zero 'any' types, full type-safety for event handlers."
      : "";

    if (targetAi === "raw") {
      return rawBasePrompt;
    }

    if (targetAi === "cursor") {
      return `/* =========================================================================\n   SYSTEM PROMPT FOR CURSOR / ANTIGRAVITY / CLAUDE 3.7 SONNET\n   Component: ${item.title}\n   Category: ${item.category}\n   ========================================================================= */\n\nYou are an elite Principal Frontend Engineer. Implement the following production-grade UI component with exceptional aesthetics and zero generic placeholders.\n\n### Technical Constraints:\n- ${frameworkDirective}${brandDirective}${animDirective}${typesDirective}\n\n### Architecture & Implementation Blueprint:\n${rawBasePrompt}\n\n### Code Quality Rules:\n- Accessible HTML5 semantic elements (aria labels, keyboard navigation).\n- Self-contained, copy-paste ready without broken imports.\n- Return ONLY the fully working component code with concise explanatory comments.`;
    }

    if (targetAi === "cursorrules") {
      return `# =========================================================================\n# AGENT RULES SPECIFICATION (.cursorrules / AGENTS.md)\n# Component: ${item.title}\n# Stack: ${frameworkDirective}\n# =========================================================================\n\n## 1. System Role & Architecture\nYou are an expert Lead Software Engineer building high-performance web applications with Next.js 15, React 19, and Tailwind CSS v4.\nYour goal is to build "${item.title}" adhering strictly to the design system and behavioral constraints below.\n\n## 2. Component Blueprint\n${rawBasePrompt}\n\n## 3. Design System & Brand Tokens\n${brandDirective}\n\n## 4. Engineering & Code Standards\n- Framework: ${frameworkDirective}\n- Typography & Layout: Fully fluid responsive layout across Mobile (390px), Tablet (768px), and Desktop (1440px).\n- State Management: React useState / useReducer without unnecessary global stores.${typesDirective}${animDirective}\n- Accessibility: Semantic HTML5 landmarks, role attributes, and keyboard navigability.\n- Deliverables: Self-contained component file with clean prop types ready to drop into src/components/.`;
    }

    if (targetAi === "v0") {
      return `Build a single-file, production-ready React component for v0.dev titled "${item.title}".\n\n- Framework: ${frameworkDirective}\n- Category: ${item.category}\n- Visual Theme: Ultra-sleek dark mode, generous padding, glowing glassmorphic panels.${brandDirective}${animDirective}\n\nSPECIFICATIONS:\n${rawBasePrompt}\n\nEnsure all SVGs are inline and responsive, interactive buttons have working React useState hooks, and layout is 100% responsive across mobile, tablet, and desktop.`;
    }

    if (targetAi === "bolt") {
      return `# Full-Stack Specification for Bolt.new / Lovable\n\n## Component: ${item.title}\n- Target: ${frameworkDirective}\n- Location: src/components/${item.title.replace(/[^a-zA-Z0-9]/g, '')}.tsx\n${brandDirective}${animDirective}${typesDirective}\n\n## Specifications:\n${rawBasePrompt}\n\n## Delivery Instructions:\nCreate the component file, import it into the main demo page, and verify TypeScript compilation without warnings.`;
    }

    return rawBasePrompt;
  }, [rawBasePrompt, targetAi, framework, includeBrandTokens, activeBrandData, animationLevel, strictTypes, item]);

  // Breakdown sections for Structured View
  const parsedSections = useMemo(() => {
    const lines = rawBasePrompt.split("\n");
    const sections: { title: string; content: string }[] = [];
    let currentTitle = "Descripcion General y Arquitectura";
    let currentBuffer: string[] = [];

    lines.forEach((line) => {
      if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("══════")) {
        if (currentBuffer.length > 0) {
          sections.push({
            title: currentTitle,
            content: currentBuffer.join("\n").trim(),
          });
          currentBuffer = [];
        }
        currentTitle = line.replace(/^[#═\s]+|[═\s]+$/g, "").trim() || "Especificaciones Tecnicas";
      } else {
        currentBuffer.push(line);
      }
    });

    if (currentBuffer.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentBuffer.join("\n").trim(),
      });
    }

    return sections;
  }, [rawBasePrompt]);

  const handleCopySection = (text: string, key: string) => {
    onCopy(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadMarkdown = () => {
    const isCursorRules = targetAi === "cursorrules";
    const filename = isCursorRules ? ".cursorrules" : `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-prompt.md`;
    const blob = new Blob([tailoredPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const estimatedTokens = Math.round(tailoredPrompt.length / 4);

  return (
    <div className="flex flex-col gap-4 w-full font-sans select-none text-white">
      {/* 1. TOP TARGET AI & CONTROLS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d101a] p-3.5 shadow-lg">
        {/* Target AI Preset Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider font-mono">
            Optimizar para:
          </span>
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-semibold">
            {[
              {
                id: "cursor",
                label: "Cursor / Claude 3.7",
                svg: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                ),
              },
              {
                id: "v0",
                label: "v0 by Vercel",
                svg: (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 22 20 2 20" />
                  </svg>
                ),
              },
              {
                id: "bolt",
                label: "Bolt / Lovable",
                svg: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                ),
              },
              {
                id: "cursorrules",
                label: ".cursorrules / AGENTS.md",
                svg: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                ),
              },
              {
                id: "raw",
                label: "Markdown Original",
                svg: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                ),
              },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTargetAi(p.id as any)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all text-xs font-semibold ${
                  targetAi === p.id
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="opacity-80">{p.svg}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-white/10 bg-black/50 p-1 text-xs">
            <button
              onClick={() => setViewMode("structured")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "structured" ? "bg-white/20 text-white font-bold" : "text-white/60 hover:text-white"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Vista Estructurada</span>
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "raw" ? "bg-white/20 text-white font-bold" : "text-white/60 hover:text-white"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>Codigo Fuente</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PROMPT CUSTOMIZATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-white/50 uppercase text-[10px] tracking-wider font-mono">
            Parametros de salida:
          </span>

          {/* Framework Chip */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
            {[
              { id: "react19", label: "React 19 + Tailwind" },
              { id: "nextjs", label: "Next.js 15" },
              { id: "vanilla", label: "HTML5 + CSS" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFramework(f.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  framework === f.id ? "bg-white/20 text-white font-bold" : "text-white/60 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Brand Tokens Switch & Brand Picker */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIncludeBrandTokens(!includeBrandTokens)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                includeBrandTokens
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-white/10 bg-white/5 text-white/50"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${includeBrandTokens ? "bg-amber-400" : "bg-white/30"}`} />
              <span>Tokens de Marca Activos</span>
            </button>

            {includeBrandTokens && availableBrands.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px]">
                <span className="text-[10px] font-mono font-bold text-white/50 uppercase">Marca:</span>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="bg-transparent text-white font-semibold outline-none cursor-pointer text-[11px]"
                >
                  <option value="default" className="bg-[#0f1422] text-white">Predeterminada (Obsidian)</option>
                  {availableBrands.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#0f1422] text-white">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Strict Types Switch */}
          <button
            onClick={() => setStrictTypes(!strictTypes)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
              strictTypes
                ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                : "border-white/10 bg-white/5 text-white/50"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${strictTypes ? "bg-sky-400" : "bg-white/30"}`} />
            <span>TypeScript Estricto</span>
          </button>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-3 text-white/50 font-mono text-[11px]">
          <span>~{estimatedTokens} Tokens</span>
          <span>·</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Especificacion Validada
          </span>
        </div>
      </div>

      {/* 3. MAIN CONTENT: STRUCTURED VIEW VS RAW VIEW */}
      {viewMode === "structured" ? (
        <div className="flex flex-col gap-3">
          {/* Quick Context Banner */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#0d1322] via-[#090e1a] to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">{item.title}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/70">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1">
                {item.description || "Componente maestro con especificaciones tecnicas para desarrollo asistido por IA."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopySection(tailoredPrompt, "all")}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-black shadow-lg hover:opacity-90 active:scale-95 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copiedKey === "all" ? "Copiado al portapapeles" : "Copiar Prompt Completo"}</span>
              </button>
            </div>
          </div>

          {/* Cards for each parsed section */}
          <div className="grid grid-cols-1 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
            {parsedSections.map((sec, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-[#090c14] p-4 flex flex-col gap-2 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <span className="h-5 px-1.5 rounded-md bg-white/10 flex items-center justify-center font-mono text-[10px] text-sky-400 font-bold">
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <span className="tracking-tight">{sec.title}</span>
                  </div>

                  <button
                    onClick={() => handleCopySection(sec.content, `sec_${idx}`)}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{copiedKey === `sec_${idx}` ? "Copiado" : "Copiar Seccion"}</span>
                  </button>
                </div>

                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300/90 pt-1">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* RAW CODE VIEW */
        <div className="relative rounded-xl border border-white/15 bg-[#07090f] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#101422] px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-mono text-white/60 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>prompt-blueprint.md</span>
              <span>· Formato Raw UTF-8</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopySection(tailoredPrompt, "raw_all")}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copiedKey === "raw_all" ? "Copiado" : "Copiar Codigo"}</span>
              </button>
            </div>
          </div>

          <pre className="max-h-[400px] overflow-y-auto p-5 font-mono text-xs leading-relaxed text-emerald-400 bg-black/90">
            {tailoredPrompt}
          </pre>
        </div>
      )}

      {/* 4. FOOTER ACTIONS & EXPORTS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-white/60">
          <span className="font-semibold text-white">Compatibilidad:</span>
          <span>Cursor</span>
          <span>·</span>
          <span>Claude 3.7 Sonnet</span>
          <span>·</span>
          <span>v0.dev</span>
          <span>·</span>
          <span>Bolt.new</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{targetAi === "cursorrules" ? "Descargar .cursorrules" : "Descargar Markdown"}</span>
          </button>

          <button
            onClick={() => handleCopySection(tailoredPrompt, "btn_footer")}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] hover:opacity-90 px-4 py-2 text-xs font-bold text-black shadow-md active:scale-95 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copiedKey === "btn_footer" ? "Copiado al portapapeles" : "Copiar Prompt Maestro"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
