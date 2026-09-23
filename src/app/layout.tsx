import type { Metadata } from "next";
import BackButton from "@/components/BackButton";
import ActivityConsole from "@/components/ActivityConsole";
import { TopNavActions } from "@/components/TopNavActions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golden Path Studio",
  description: "Gestor local y offline de componentes UI de multiples fuentes.",
};

// Se ejecuta antes de pintar: fija tema/idioma desde localStorage (evita flash).
const BOOT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');var l=localStorage.getItem('lang');if(l)document.documentElement.lang=l;}catch(e){}})();`;

const SCROLL_JS = `(function(){
  function updateNav(){
    var nav = document.getElementById('main-nav');
    var inner = document.getElementById('nav-inner');
    if(!nav || !inner) return;
    if(window.scrollY > 20){
      nav.setAttribute('data-scrolled', 'true');
      inner.setAttribute('data-scrolled', 'true');
    } else {
      nav.setAttribute('data-scrolled', 'false');
      inner.setAttribute('data-scrolled', 'false');
    }
  }
  window.addEventListener('scroll', updateNav);
  document.addEventListener('DOMContentLoaded', updateNav);
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <div className="grain" aria-hidden />
        <nav id="main-nav" data-scrolled="false" suppressHydrationWarning className="sticky z-50 mx-auto flex w-full justify-center transition-all duration-300 data-[scrolled=false]:top-0 data-[scrolled=false]:max-w-full data-[scrolled=false]:px-0 data-[scrolled=true]:top-6 data-[scrolled=true]:max-w-[850px] data-[scrolled=true]:px-4">
          <div id="nav-inner" data-scrolled="false" suppressHydrationWarning className="flex w-full items-center justify-between transition-all duration-300 data-[scrolled=false]:backdrop-blur-none data-[scrolled=false]:rounded-none data-[scrolled=false]:border-transparent data-[scrolled=false]:bg-transparent data-[scrolled=false]:px-8 data-[scrolled=false]:py-4 data-[scrolled=false]:shadow-none data-[scrolled=true]:rounded-full data-[scrolled=true]:backdrop-blur-xl data-[scrolled=true]:border-[var(--color-border)] data-[scrolled=true]:bg-[var(--color-bg)]/85 data-[scrolled=true]:px-8 data-[scrolled=true]:py-3.5 data-[scrolled=true]:shadow-2xl">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center">
                <span className="text-[18px] font-bold text-white tracking-tight" data-i18n="Golden Path Studio.">Golden Path Studio.</span>
              </a>
              <BackButton />
            </div>
            <div className="flex items-center gap-7">
              <a href="/" className="text-[13px] font-semibold text-white/70 transition-colors hover:text-white" data-i18n="Catálogo">
                Catálogo
              </a>
              <a href="/prompts" className="text-[13px] font-semibold text-white/70 transition-colors hover:text-white" data-i18n="Prompts">
                Prompts
              </a>
              <a href="/perfil" className="text-[13px] font-semibold text-white/70 transition-colors hover:text-white" data-i18n="Perfil">
                Perfil
              </a>

              <span className="mx-2 h-4 w-px bg-white/10" aria-hidden />

              <TopNavActions />
            </div>
          </div>
        </nav>
        {children}
        <ActivityConsole />
        <script dangerouslySetInnerHTML={{ __html: SCROLL_JS }} />
      </body>
    </html>
  );
}
