"use client";

import { useState } from "react";

export default function PricingMatrixPreview() {
  const [annualBilling, setAnnualBilling] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");

  const plans = [
    {
      id: "starter",
      name: "Starter",
      monthlyPrice: 19,
      annualPrice: 15,
      desc: "Ideal para desarrolladores independientes y prototipos ágiles.",
      features: [
        "Hasta 3 proyectos activos",
        "10,000 llamadas API al mes",
        "Soporte por comunidad en Discord",
        "Tokens de marca básicos",
      ],
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      monthlyPrice: 49,
      annualPrice: 39,
      desc: "Para equipos en crecimiento que construyen aplicaciones en producción.",
      features: [
        "Proyectos ilimitados",
        "500,000 llamadas API al mes",
        "Telemetría en tiempo real y logs",
        "Exportación a Next.js y Tailwind v4",
        "Soporte prioritario por correo en < 4h",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      monthlyPrice: 199,
      annualPrice: 159,
      desc: "Para corporaciones que requieren infraestructura dedicada y SLA.",
      features: [
        "Llamadas API sin límites",
        "Nodos Edge dedicados y multi-región",
        "SLA garantizado del 99.99%",
        "Auditoría de seguridad SOC2 y SSO SAML",
        "Canal de Slack directo con ingenieros",
      ],
      popular: false,
    },
  ];

  return (
    <div className="flex flex-col w-full bg-[#080a12] text-white p-6 sm:p-12 font-sans select-none min-h-[580px]">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
          PRECIOS TRANSPARENTES
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
          Planes Diseñados para Escalar Contigo
        </h2>
        <p className="text-xs sm:text-sm text-white/60 mt-2">
          Sin costes ocultos. Cancela o cambia de plan en cualquier momento.
        </p>

        {/* Toggle Switch */}
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
          <button
            onClick={() => setAnnualBilling(false)}
            className={`rounded-full px-4 py-1.5 font-bold transition-all ${
              !annualBilling ? "bg-white text-black shadow-md" : "text-white/60 hover:text-white"
            }`}
          >
            Facturación Mensual
          </button>
          <button
            onClick={() => setAnnualBilling(true)}
            className={`rounded-full px-4 py-1.5 font-bold transition-all flex items-center gap-1.5 ${
              annualBilling ? "bg-sky-400 text-black shadow-md" : "text-white/60 hover:text-white"
            }`}
          >
            <span>Facturación Anual</span>
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-extrabold text-black">
              -20% Ahorro
            </span>
          </button>
        </div>
      </div>

      {/* 3 Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
        {plans.map((p) => {
          const isSelected = selectedPlan === p.id;
          const price = annualBilling ? p.annualPrice : p.monthlyPrice;

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`rounded-2xl border p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative ${
                isSelected
                  ? "border-sky-400 bg-sky-950/20 shadow-2xl scale-[1.02]"
                  : "border-white/10 bg-[#0e111c] hover:border-white/20"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-400 px-3 py-0.5 text-[10px] font-black uppercase text-black shadow-lg">
                  Más Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  <div className="h-4 w-4 rounded-full border border-white/30 flex items-center justify-center">
                    {isSelected && <div className="h-2 w-2 rounded-full bg-sky-400" />}
                  </div>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">${price}</span>
                  <span className="text-xs text-white/50">/usuario/mes</span>
                </div>

                <p className="mt-3 text-xs text-white/60 leading-relaxed min-h-[36px]">
                  {p.desc}
                </p>

                <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Incluye:
                  </span>
                  {p.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/80">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 shrink-0 mt-0.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className={`mt-8 w-full rounded-xl py-3 text-xs font-bold transition-all shadow-md ${
                  isSelected
                    ? "bg-sky-400 text-black hover:bg-sky-300"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {isSelected ? "Plan Activo" : `Elegir ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
