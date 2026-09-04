"use client";

/* ============================================================================
   Modo Guided — drawer lateral SÓLIDO (mismo lenguaje visual que el panel de
   Estado): elige una base, ajusta 5 decisiones de alto impacto, revisa qué
   cambió respecto a la base y "Parte de aquí". Pasos: Base / Ajustes / Resumen.
   ============================================================================ */
import { useState } from "react";
import {
  PROJECT_TEMPLATES, GUIDED_QUESTIONS, guidedChanges,
  type GuidedAnswers, type ProjectTemplate,
} from "@/lib/templates";

function baseAnswers(t: ProjectTemplate): GuidedAnswers {
  const b = t.blueprint;
  const auth = (b.security?.authMethods ?? []);
  const tl = String(b.data?.tableLayout ?? "");
  return {
    nav: String(b.interaction?.navigationPattern ?? "dashboard"),
    auth: auth.some((a) => /oauth/i.test(a)) ? "oauth" : auth.some((a) => /magic/i.test(a)) ? "magic-link" : "email-password",
    datos: tl === "cards-mobile" ? "cards" : tl === "simple-list" ? "simple" : "tabla",
    rigor: t.rigor,
    priority: b.data?.mobileData === "cards" ? "mobile" : "desktop",
  };
}

const STEPS = ["Base", "Ajustes", "Resumen"] as const;

export function GuidedSetup({
  open, onClose, onApply, lang,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (baseId: string, ans: GuidedAnswers) => void;
  lang: "es" | "en";
}) {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [ans, setAns] = useState<GuidedAnswers>({});

  if (!open) return null;
  const base = PROJECT_TEMPLATES.find((t) => t.id === baseId) ?? null;
  const changes = base ? guidedChanges(base.id, ans) : [];

  const pickBase = (t: ProjectTemplate) => { setBaseId(t.id); setAns(baseAnswers(t)); };
  const setA = (k: string, v: string) => setAns((p) => ({ ...p, [k]: v }));
  const reset = () => { setStep(0); setBaseId(null); setAns({}); };
  const close = () => { reset(); onClose(); };
  const finish = () => { if (base) { onApply(base.id, ans); reset(); onClose(); } };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={close} />

      <aside className="relative z-10 flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
        {/* Header sólido */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-panel-2)] px-5 py-4">
          <div className="flex items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent)]" />
              {L("Configuración guiada", "Guided setup")}
            </h3>
            <button type="button" onClick={close} className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-text)]" title={L("Cerrar", "Close")}>✕</button>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">{L("Una base senior en tres pasos. Ajustas lo importante; el resto lo pone la plantilla.", "A senior base in three steps. You tweak what matters; the template does the rest.")}</p>
          {/* Indicador de pasos */}
          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <span className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " + (i === step ? "bg-[var(--color-accent)] text-black" : i < step ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-[var(--color-muted)]")}>{i < step ? "✓" : i + 1}</span>
                <span className={"text-[10px] font-semibold uppercase tracking-wide " + (i === step ? "text-[var(--color-text)]" : "text-[var(--color-muted)]")}>{s}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-[var(--color-border)]" />}
              </div>
            ))}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--color-bg)] p-5 custom-scrollbar">
          {step === 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {PROJECT_TEMPLATES.map((t) => {
                const active = baseId === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => pickBase(t)}
                    className={"flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all " + (active ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]" : "border-[var(--color-border)] bg-[var(--color-panel-2)] hover:border-[var(--color-accent)]/60")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-[var(--color-text)]">{t.name}</span>
                      {active
                        ? <span className="shrink-0 rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-accent)]">✓</span>
                        : <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-muted)]">{t.rigor}</span>}
                    </div>
                    <span className="text-[11px] text-[var(--color-muted)]">{t.tagline}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.stack.slice(0, 4).map((s) => <span key={s} className="rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-[var(--color-muted)]">{s}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && base && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-[12px]">
                <span className="text-[var(--color-muted)]">{L("Base", "Base")}:</span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">{base.name}</span>
              </div>
              <div className="space-y-3">
                {GUIDED_QUESTIONS.map((q) => (
                  <div key={q.key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3">
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <span className="text-[12px] font-bold text-[var(--color-text)]">{q.label}</span>
                      <span className="text-[10px] text-[var(--color-muted)]">{q.help}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((o) => {
                        const active = (ans as Record<string, string>)[q.key] === o.v;
                        return (
                          <button key={o.v} type="button" onClick={() => setA(q.key, o.v)}
                            className={"rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors " + (active ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-black" : "border-[var(--color-border)] bg-black/30 text-[var(--color-muted)] hover:text-[var(--color-text)]")}>
                            {o.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && base && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-[12px]">
                <span className="text-[var(--color-muted)]">{L("Base", "Base")}:</span>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">{base.name}</span>
                <span className="ml-auto text-[10px] text-[var(--color-muted)]">{changes.length} {L("cambio(s)", "change(s)")}</span>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{L("Cambios sobre la base", "Changes vs base")}</div>
                {changes.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-muted)]">{L("Todo queda como la plantilla", "Everything stays as the template")} — <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">plantilla</span>.</p>
                ) : (
                  <ul className="space-y-1.5 text-[11px]">
                    {changes.map((c, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[var(--color-text)]">{c.label}:</span>
                        <span className="text-[var(--color-muted)] line-through">{c.from}</span>
                        <span className="text-[var(--color-muted)]">→</span>
                        <span className="font-semibold text-[var(--color-accent)]">{c.to}</span>
                        <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-300">custom</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 border-t border-[var(--color-border)] pt-2 text-[10px] text-[var(--color-muted)]">
                  {L("El resto se hereda de la base y queda marcado como", "The rest is inherited from the base and marked as")} <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">plantilla</span>. {L("Solo los required bloquean publicar.", "Only required fields block publishing.")}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer fijo sólido */}
        <div className="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-panel-2)] px-5 py-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
              className="rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">{L("Atrás", "Back")}</button>
          )}
          <button type="button" onClick={close} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">{L("Cancelar", "Cancel")}</button>
          {step < 2 ? (
            <button type="button" disabled={!base} onClick={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
              className="ml-auto rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition-transform enabled:hover:scale-[1.02] disabled:opacity-40">
              {L("Siguiente", "Next")}
            </button>
          ) : (
            <button type="button" onClick={finish}
              className="ml-auto rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-black shadow-[0_0_16px_var(--color-accent)] transition-transform hover:scale-[1.02]">
              {L("Partir de aquí", "Start from here")}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
