"use client";

import { useState } from "react";

export default function SplitAuthPreview() {
  const [email, setEmail] = useState("developer@nexus-cloud.io");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 800);
  };

  return (
    <div className="flex w-full bg-[#07090e] text-white font-sans select-none min-h-[580px] rounded-2xl overflow-hidden border border-white/10">
      {/* Left Panel: Editorial & Generative Graphic (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0b0f19] p-12 flex-col justify-between border-r border-white/10 overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-600/20 blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-white text-black font-black flex items-center justify-center text-sm">
            N
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">NEXUS CLOUD</span>
        </div>

        {/* High-Impact Editorial Quote */}
        <div className="relative z-10 my-auto">
          <blockquote className="text-2xl font-semibold text-white/90 leading-snug">
            "La forma más rápida y elegante de llevar una idea desde el prompt inicial hasta un entorno de producción seguro."
          </blockquote>

          <div className="mt-6 flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt="Elena Vance"
              className="h-10 w-10 rounded-full object-cover border border-white/20"
            />
            <div>
              <div className="font-bold text-sm text-white">Elena Vance</div>
              <div className="text-xs text-white/50">Head of Product en Nexus Systems</div>
            </div>
          </div>
        </div>

        {/* Bottom Specs */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/5">
          <span>Protección E2E con Encriptación 256-bit</span>
          <span>SOC2 Type II Certified</span>
        </div>
      </div>

      {/* Right Panel: Sign-In Form */}
      <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center max-w-md mx-auto">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-white tracking-tight">Bienvenido de nuevo</h3>
          <p className="text-xs text-white/60 mt-1">Ingresa tus credenciales para acceder a tu workspace.</p>
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => alert("Autenticando con GitHub OAuth...")}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </button>
          <button
            onClick={() => alert("Autenticando con Google OAuth...")}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.5 0 2.8.5 3.9 1.4l2.9-2.9C17 1.8 14.6 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.5 2.7C6.1 7.2 8.8 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/><path fill="#FBBC05" d="M5.1 14.9c-.3-.8-.4-1.8-.4-2.9s.2-2.1.4-2.9L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.5-2.7z"/><path fill="#34A853" d="M12 23c3.3 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.9-2.2-6.9-5.1L1.6 15.9C3.5 19.7 7.4 23 12 23z"/></svg>
            Google
          </button>
        </div>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#07090e] px-3 text-[11px] font-semibold text-white/40 uppercase">O continúa con email</span>
        </div>

        {isSuccess ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-sm font-bold text-emerald-300">Sesion Iniciada con Exito</div>
            <p className="text-xs text-white/70 mt-1">Conectando con el entorno de trabajo...</p>
            <button
              onClick={() => setIsSuccess(false)}
              className="mt-3 rounded-lg bg-emerald-400 px-4 py-1.5 text-xs font-bold text-black hover:bg-emerald-300"
            >
              Reiniciar Formulario
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-white/60 uppercase text-[10px]">Correo Profesional</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="font-bold text-white/60 uppercase text-[10px]">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-indigo-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 p-3.5 text-xs font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Verificando Credenciales...</span>
                </>
              ) : (
                <span>Acceder al Espacio de Trabajo ↵</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
