"use client";

/* ============================================================================
   Galería de golden paths (plantillas de proyecto). Modo Starter visible:
   el usuario ve plantillas senior reales y aplica completa o por piezas.
   La aplicación completa marca origin=plantilla (trazabilidad); las piezas
   sueltas entran como decisión propia (custom).
   ============================================================================ */
import { useState } from "react";
import { PROJECT_TEMPLATES, type TemplatePart, type ProjectTemplate } from "@/lib/templates";
import { SCENE_LABEL, type SceneId } from "@/lib/scenes";

/** Colores de muestra de la identidad visual de la plantilla (para el swatch). */
function swatchColors(t: ProjectTemplate): string[] {
  const tk = t.visual?.tokens ?? {};
  const pick = (k: string, fb: string) => (tk[k] && String(tk[k]).startsWith("#") ? tk[k] : fb);
  return [
    pick("color.bg", "#0b0d10"),
    pick("color.surface", "#161a20"),
    pick("color.action.primary", t.accent ?? "#f0a470"),
    pick("color.action.accent", t.accent ?? "#f4ae7c"),
  ];
}

const RIGOR_META: Record<string, { label: string; cls: string }> = {
  rapido: { label: "Rápido", cls: "text-sky-300 border-sky-400/40 bg-sky-400/10" },
  equilibrado: { label: "Equilibrado", cls: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" },
  estricto: { label: "Estricto", cls: "text-amber-300 border-amber-400/40 bg-amber-400/10" },
  enterprise: { label: "Enterprise", cls: "text-violet-300 border-violet-400/40 bg-violet-400/10" },
};

function impact(t: ProjectTemplate): { arch: string; nav: string; auth: string; libs: number } {
  const b = t.blueprint;
  return {
    arch: String(b.architecture?.pattern ?? "—"),
    nav: String(b.interaction?.navigationPattern ?? "—"),
    auth: (b.security?.authMethods ?? []).join(", ") || "—",
    libs: b.libraries?.items?.length ?? 0,
  };
}

const PARTS: { key: TemplatePart; label: string }[] = [
  { key: "architecture", label: "Solo árbol" },
  { key: "libraries", label: "Solo librerías" },
  { key: "agents", label: "Solo reglas" },
  { key: "security", label: "Solo seguridad" },
];

export function TemplatesGallery({
  scope, activeTemplateId, onApply, lang,
}: {
  scope: "estructura" | "seguridad";
  activeTemplateId?: string;
  onApply: (id: string, parts?: TemplatePart[]) => void;
  lang: "es" | "en";
}) {
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const [open, setOpen] = useState(false);
  const [compare, setCompare] = useState(false);

  return (
    <div className="card-surface rounded-xl">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
        <span>{L("Plantillas profesionales", "Professional templates")}</span>
        <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] text-[var(--color-accent)]">golden paths</span>
        {activeTemplateId && <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">{L("aplicada", "applied")}: {activeTemplateId}</span>}
        <span className="ml-auto text-[var(--color-muted)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--color-muted)]">
              {L("Bases senior listas: aplica completa o solo la pieza que necesites. Lo aplicado por completo se marca como",
                 "Senior-ready bases: apply the whole thing or just the piece you need. A full apply is marked as")} <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">plantilla</span>.
            </p>
            <button type="button" onClick={() => setCompare((c) => !c)}
              className="shrink-0 rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-[11px] font-medium text-[var(--color-muted)] hover:text-white">
              {compare ? L("Ocultar comparación", "Hide comparison") : L("Comparar", "Compare")}
            </button>
          </div>

          {compare && (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-black/30 text-[var(--color-muted)]">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">{L("Plantilla", "Template")}</th>
                    <th className="px-2 py-1.5 font-semibold">Rigor</th>
                    <th className="px-2 py-1.5 font-semibold">{L("Arquitectura", "Architecture")}</th>
                    <th className="px-2 py-1.5 font-semibold">Nav</th>
                    <th className="px-2 py-1.5 font-semibold">Auth</th>
                    <th className="px-2 py-1.5 font-semibold">Libs</th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_TEMPLATES.map((t) => {
                    const im = impact(t);
                    return (
                      <tr key={t.id} className="border-t border-[var(--color-border)]">
                        <td className="px-2 py-1.5 font-medium text-[var(--color-text)]">{t.name}</td>
                        <td className="px-2 py-1.5">{RIGOR_META[t.rigor]?.label ?? t.rigor}</td>
                        <td className="px-2 py-1.5 text-[var(--color-muted)]">{im.arch}</td>
                        <td className="px-2 py-1.5 text-[var(--color-muted)]">{im.nav}</td>
                        <td className="px-2 py-1.5 text-[var(--color-muted)]">{im.auth}</td>
                        <td className="px-2 py-1.5 text-[var(--color-muted)]">{im.libs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {PROJECT_TEMPLATES.map((t) => {
              const im = impact(t);
              const isActive = activeTemplateId === t.id;
              return (
                <div key={t.id} className={"flex flex-col gap-2 rounded-xl border bg-black/20 p-3 " + (isActive ? "border-emerald-400/50" : "border-[var(--color-border)]")}>
                  {/* Franja de identidad visual: paleta real de la plantilla. */}
                  <div className="flex h-6 overflow-hidden rounded-md border border-white/10">
                    {swatchColors(t).map((c, i) => (
                      <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{t.name}</div>
                      <div className="text-[11px] text-[var(--color-muted)]">{t.tagline}</div>
                    </div>
                    <span className={"shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase " + (RIGOR_META[t.rigor]?.cls ?? "")}>{RIGOR_META[t.rigor]?.label ?? t.rigor}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {t.defaultScene && (
                      <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-accent)]">
                        {L("escena", "scene")}: {SCENE_LABEL[t.defaultScene as SceneId] ?? t.defaultScene}
                      </span>
                    )}
                    {t.stack.slice(0, 5).map((s) => (
                      <span key={s} className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-[var(--color-muted)]">{s}</span>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] leading-relaxed text-[var(--color-muted)]">
                    <div><b className="text-[var(--color-text)]">{L("Arquitectura", "Architecture")}:</b> {im.arch} · <b className="text-[var(--color-text)]">nav:</b> {im.nav}</div>
                    <div><b className="text-[var(--color-text)]">auth:</b> {im.auth} · <b className="text-[var(--color-text)]">libs:</b> {im.libs}</div>
                  </div>

                  {t.suggested && t.suggested.length > 0 && (
                    <div>
                      <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{L("Componentes sugeridos", "Suggested components")}</div>
                      <div className="flex flex-wrap gap-1">
                        {t.suggested.map((s) => (
                          <span key={s} className="rounded-md border border-dashed border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] text-[var(--color-muted)]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={() => onApply(t.id)}
                    className="w-full rounded-lg bg-[var(--color-accent)] px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-black transition-transform hover:scale-[1.02]">
                    {isActive ? L("Reaplicar completa", "Re-apply full") : L("Aplicar completa", "Apply full")}
                  </button>
                  <div className="flex flex-wrap gap-1">
                    {PARTS.map((p) => (
                      <button key={p.key} type="button" onClick={() => onApply(t.id, [p.key])}
                        className="rounded-md border border-[var(--color-border)] bg-white/5 px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-white">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--color-muted)]">
            {scope === "seguridad"
              ? L("Cada plantilla trae auth, sesión y reglas de seguridad senior. Solo los required bloquean publicar.", "Each template ships senior auth, session and security rules. Only required fields block publishing.")
              : L("Cada plantilla trae árbol, naming, librerías y reglas de agente. Tras aplicar, revisa y pulsa Guardar.", "Each template ships tree, naming, libraries and agent rules. After applying, review and click Save.")}
          </p>
        </div>
      )}
    </div>
  );
}
