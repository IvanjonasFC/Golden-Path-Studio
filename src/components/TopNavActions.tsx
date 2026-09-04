"use client";

import { useEffect, useState } from "react";
import { applyLang } from "@/lib/i18n";

// Iconos idénticos al portfolio (18×18, stroke-width 2, Lucide/feather)
const IconGlobe = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
);

const IconGitHub = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="currentColor" aria-hidden>
    <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.74-1.56-2.56-.29-5.26-1.28-5.26-5.71 0-1.26.45-2.3 1.2-3.11-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.19a11.1 11.1 0 0 1 5.83 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.59.23 2.76.11 3.05.75.81 1.2 1.85 1.2 3.11 0 4.44-2.7 5.42-5.27 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/>
  </svg>
);

// Idéntico al portfolio Header.astro
const IconMoon = () => (
  <svg id="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
);

const IconSun = () => (
  <svg id="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);

// Clase base de los botones de acción — igual que el portfolio: p-2 text-gray-400 hover:text-primary
const BTN = "p-2 text-white/50 hover:text-[#f0a470] transition-colors flex items-center";

export function TopNavActions() {
  const [lang, setLang] = useState("EN");
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    try {
      const stored = (localStorage.getItem("lang") || "es") as "es" | "en";
      setLang(stored === "en" ? "ES" : "EN");
      if (stored === "en") applyLang("en");
    } catch (e) {}

    // Sync theme icon on mount
    setIsLight(document.documentElement.classList.contains("light"));
  }, []);

  const handleLangToggle = () => {
    try {
      const curr = (localStorage.getItem("lang") || "es") as "es" | "en";
      const next = curr === "en" ? "es" : "en";
      applyLang(next);
      setLang(next === "en" ? "ES" : "EN");
    } catch (e) {}
  };

  const handleThemeToggle = () => {
    if (typeof document !== "undefined") {
      const light = document.documentElement.classList.toggle("light");
      setIsLight(light);
      try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (err) {}
    }
  };

  return (
    <>
      {/* Toggle idioma — mismo estilo pill que el portfolio */}
      <button
        type="button"
        id="lang-toggle"
        onClick={handleLangToggle}
        aria-label="Cambiar idioma"
        className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white/60 transition-colors hover:border-[#f0a470]/50 hover:text-[#f0a470]"
      >
        {lang}
      </button>

      {/* Portfolio — globo idéntico al del portfolio */}
      <a
        href="https://portfolio.ivanjonasfc.dev"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Portfolio"
        data-no-i18n
        className={`${BTN} group relative`}
      >
        <IconGlobe />
        {/* Tooltip estilo portfolio */}
        <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/90 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[0_0_20px_rgba(240,164,112,0.25)] transition-all duration-200 group-hover:mt-2.5 group-hover:opacity-100">
          Ir al portfolio
          <span className="absolute left-1/2 bottom-full -translate-x-1/2 border-[5px] border-transparent border-b-black/90" />
        </span>
      </a>

      {/* GitHub — idéntico al portfolio Header.astro */}
      <a
        href="https://github.com/IvanjonasFC"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
        className={`${BTN} group relative`}
      >
        <IconGitHub />
        <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/90 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-[0_0_20px_rgba(240,164,112,0.25)] transition-all duration-200 group-hover:mt-2.5 group-hover:opacity-100">
          Ver código
          <span className="absolute left-1/2 bottom-full -translate-x-1/2 border-[5px] border-transparent border-b-black/90" />
        </span>
      </a>

      {/* Toggle tema — luna/sol idénticos al portfolio (18×18, stroke-width 2) */}
      <button
        type="button"
        id="theme-toggle"
        onClick={handleThemeToggle}
        aria-label="Cambiar tema"
        className={BTN}
      >
        {isLight ? <IconSun /> : <IconMoon />}
      </button>
    </>
  );
}
