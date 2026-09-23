"use client";

/* ============================================================================
   Síntesis del estado de la marca + preview RESUELTA.
   Todo aquí consume `resolvedConfig` / `validationReport` (resolve.ts), nunca el
   draft crudo. Componentes autocontenidos, listos para montar en la pestaña
   Visual (panel maestro) o en la columna de impacto de cualquier pestaña.
   ============================================================================ */
import { Fragment, useMemo, useState, useEffect } from "react";
import {
  type Origin, type DomainKey, type DomainReport, type TabStatus,
  type ResolvedConfig, type ValidationReport,
} from "@/lib/resolve";
import { BrandVersions, type RestoredBrand } from "./BrandVersions";

/* --------------------------- Badge de origen ------------------------------- */
const ORIGIN_META: Record<Origin, { label: string; cls: string }> = {
  custom: { label: "custom", cls: "text-sky-300 border-sky-400/40 bg-sky-400/10" },
  template: { label: "plantilla", cls: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" },
  preset: { label: "preset", cls: "text-violet-300 border-violet-400/40 bg-violet-400/10" },
  default: { label: "default", cls: "text-amber-300 border-amber-400/40 bg-amber-400/10" },
  missing: { label: "falta", cls: "text-red-300 border-red-400/40 bg-red-400/10" },
};
export function OriginBadge({ origin }: { origin: Origin }) {
  const m = ORIGIN_META[origin];
  return <span className={"rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide " + m.cls}>{m.label}</span>;
}

const DOMAIN_LABEL: Record<DomainKey, string> = {
  visual: "Visual", interaction: "Interacción", structure: "Estructura", data: "Datos", security: "Seguridad",
};
const STATUS_META: Record<TabStatus, { label: string; cls: string }> = {
  complete: { label: "completo", cls: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" },
  using_defaults: { label: "con defaults", cls: "text-amber-300 border-amber-400/40 bg-amber-400/10" },
  partial: { label: "parcial", cls: "text-amber-300 border-amber-400/40 bg-amber-400/10" },
  blocking: { label: "bloquea", cls: "text-red-300 border-red-400/40 bg-red-400/10" },
};

/* --------------------------- Cobertura por pestaña ------------------------- */
export function CoveragePanel({ report }: { report: ValidationReport }) {
  return (
    <div className="card-surface rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Cobertura por pestaña</h3>
        <span className="text-xs font-bold text-[var(--color-accent)]">{Math.round(report.coverage * 100)}%</span>
      </div>
      <div className="mt-3 space-y-2">
        {(Object.values(report.domains) as DomainReport[]).map((d) => (
          <div key={d.domain} className="flex items-center gap-3 text-xs">
            <span className="w-24 shrink-0 font-medium text-[var(--color-text)]">{DOMAIN_LABEL[d.domain]}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-panel-2)]">
              <span className="block h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${Math.round(d.coverage * 100)}%` }} />
            </span>
            <span className={"shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider " + STATUS_META[d.status].cls}>{STATUS_META[d.status].label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-2.5 text-[10px] text-[var(--color-muted)]">
        <span className="font-semibold text-[var(--color-text)]">Origen:</span>
        <OriginBadge origin="custom" />
        <OriginBadge origin="template" />
        <OriginBadge origin="preset" />
        <OriginBadge origin="default" />
        <OriginBadge origin="missing" />
      </div>
    </div>
  );
}

/* ------- Cobertura compacta (superficie principal → detalle en Estado) ----- */
export function CoverageMini({ report }: { report: ValidationReport }) {
  const domains = (Object.values(report.domains) as DomainReport[]).filter((d) => d.domain !== "visual");
  return (
    <div className="card-surface rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Estado de esta pestaña</h3>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {domains.map((d) => (
          <span key={d.domain} className={"rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + STATUS_META[d.status].cls}>
            {DOMAIN_LABEL[d.domain]}: {STATUS_META[d.status].label}
          </span>
        ))}
      </div>
      <p className="mt-3 border-t border-[var(--color-border)] pt-2.5 text-[10px] text-[var(--color-muted)]">
        Cobertura completa, orígenes y publicación en <b className="text-[var(--color-text)]">Estado</b> (barra superior).
      </p>
    </div>
  );
}

/* --------------------- Checklist antes de publicar ------------------------- */
export function PublishChecklist({ report }: { report: ValidationReport }) {
  const defaulted = (Object.values(report.domains) as DomainReport[]).reduce((n, d) => n + d.counts.default, 0);
  const soft = report.warnings.filter((w) => !w.startsWith("Falta") || w.includes("recomendado"));
  return (
    <div className={"card-surface rounded-xl border p-4 " + (report.canPublish ? "border-emerald-400/30" : "border-red-400/40")}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Antes de publicar</h3>
        <span className={"rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider " + (report.canPublish ? "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" : "text-red-300 border-red-400/40 bg-red-400/10")}>
          {report.canPublish ? "publicable" : "bloqueado"}
        </span>
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-300">Bloqueos <span className="text-[var(--color-muted)]">({report.blockingIssues.length})</span></div>
          {report.blockingIssues.length === 0
            ? <p className="text-[11px] text-[var(--color-muted)]">Ninguno — nada impide publicar.</p>
            : <ul className="space-y-1">{report.blockingIssues.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 rounded-md border border-red-400/40 bg-red-400/10 px-2 py-1"><span className="mt-0.5 text-red-300">✕</span><span>{b}</span></li>
              ))}</ul>}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">Advertencias <span className="text-[var(--color-muted)]">({soft.length})</span></div>
          {soft.length === 0
            ? <p className="text-[11px] text-[var(--color-muted)]">Sin advertencias.</p>
            : <ul className="space-y-1">{soft.slice(0, 6).map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[var(--color-muted)]"><span className="mt-0.5 text-amber-300">•</span><span>{w}</span></li>
              ))}{soft.length > 6 && <li className="text-[11px] text-[var(--color-muted)]/70">… y {soft.length - 6} más</li>}</ul>}
        </div>
        <p className="border-t border-[var(--color-border)] pt-2.5 text-[11px] text-[var(--color-muted)]">
          {defaulted} campo(s) resueltos por default · required faltantes bloquean · recommended avisan · advanced nunca bloquea.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- Preview resuelta ---------------------------- */
type PreviewMode = "landing" | "dashboard" | "auth" | "form" | "mobile" | "states";
const MODES: { id: PreviewMode; label: string }[] = [
  { id: "landing", label: "Landing" }, { id: "dashboard", label: "Dashboard" }, { id: "auth", label: "Login" },
  { id: "form", label: "Formulario" }, { id: "mobile", label: "Móvil" }, { id: "states", label: "Estados" },
];
function str(v: unknown, fb: string) { return typeof v === "string" && v.trim() ? v : fb; }
function has(v: unknown) { return v !== undefined && v !== null && v !== "" && v !== false; }

export function ResolvedPreview({ resolved, compact, mode: modeProp, hideTabs }: { resolved: ResolvedConfig; compact?: boolean; mode?: PreviewMode; hideTabs?: boolean }) {
  const [modeState, setMode] = useState<PreviewMode>("dashboard");
  const mode = modeProp ?? modeState;
  const v = resolved.visual, it = resolved.interaction, d = resolved.data, sec = resolved.security, st = resolved.structure;

  const bg = str(v.colorBg, "#0b0d10"), text = str(v.colorText, "#e8eaed"), primary = str(v.colorPrimary, "#f0a470");
  const fontBody = str(v.fontBody, "Inter"), fontHeading = str(v.fontHeading, fontBody);
  const rBtn = str(v.radiusButton, "8px"), rCard = str(v.radiusCard, "12px");
  const surface = "rgba(255,255,255,0.06)", muted = "rgba(255,255,255,0.55)", border = "rgba(255,255,255,0.12)";

  const motion = str(it.motionPreset, "minimal");
  const speed = motion === "none" ? "0s" : motion === "minimal" ? "120ms" : "260ms";
  const nav = str(it.navigationPattern, "dashboard");
  const hasShell = nav === "app-shell" || nav === "dashboard" || nav === "sidebar";
  const search = str(d.search, "none");
  const hasSearch = search !== "none";
  const isPalette = /command|cmdk|palette/i.test(search);
  const hasFilters = has(d.filters) && d.filters !== "none";
  const hasPagination = has(d.pagination) && d.pagination !== "none";
  const cardsLayout = str(d.tableLayout, "table") === "cards" || d.mobileData === "cards";
  const formVal = str(d.formValidation, "hybrid");
  const inlineErr = sec.inlineValidation !== false;
  const successPat = str(d.successPattern, "toast");
  const multiStep = /multi|step|wizard/i.test(str(d.formPreset, "")) || d.multiStep === true;
  const auth = Array.isArray(sec.authMethods) ? (sec.authMethods as string[]) : [];
  const hasOAuth = auth.some((a) => /oauth|google|github|sso/i.test(a));
  const hasMagic = auth.some((a) => /magic|passwordless|link|otp/i.test(a));
  const hasPassword = auth.some((a) => /password|email/i.test(a)) || (!hasOAuth && !hasMagic && auth.length > 0);
  const session = str(sec.sessionType, "httpOnly-cookie");

  const frame: React.CSSProperties = {
    fontFamily: fontBody,
    color: text,
    background: bg,
    borderRadius: rCard,
    border: `1px solid ${border}`,
    overflow: "hidden",
    minHeight: compact ? 220 : 280,
    transition: `all ${speed} ease`,
  };
  const btn: React.CSSProperties = {
    fontFamily: fontHeading,
    background: primary,
    color: "#0b0b0b",
    borderRadius: rBtn,
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  };
  const card: React.CSSProperties = {
    background: surface,
    borderRadius: rCard,
    border: `1px solid ${border}`,
    padding: 12,
  };
  const input: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    fontSize: 11,
    borderRadius: rBtn,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.25)",
    color: text,
    outline: "none",
  };
  const heading = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: fontHeading,
    fontWeight: 700,
    color: text,
    ...extra,
  });

  const body = (() => {
    if (mode === "dashboard") return (
      <div style={{ display: "flex", minHeight: 280 }}>
        {hasShell && (
          <div style={{ width: 140, borderRight: `1px solid ${border}`, padding: 12, background: "rgba(0,0,0,0.18)" }}>
            <div style={heading({ fontSize: 13, marginBottom: 12, color: primary })}>App Brand</div>
            {["Overview", "Proyectos", "Métricas", "Ajustes"].map((item, i) => (
              <div key={item} style={{ padding: "5px 8px", borderRadius: rBtn, fontSize: 11, marginBottom: 3, background: i === 0 ? surface : "transparent", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? text : muted }}>
                {item}
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={heading({ fontSize: 14 })}>Dashboard resuelto</div>
              <div style={{ fontSize: 10, color: muted }}>Sesión: {session} · Nav: {nav}</div>
            </div>
            <button style={btn}>Acción</button>
          </div>
          {hasSearch && (
            <div style={{ marginBottom: 10 }}>
              <input style={input} placeholder={isPalette ? "⌘K Buscar comando o vista…" : "Buscar…"} readOnly />
            </div>
          )}
          {hasFilters && (
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["Todos", "Activos", "Pendientes"].map((f, i) => (
                <span key={f} style={{ fontSize: 10, padding: "2px 8px", borderRadius: rBtn, border: `1px solid ${border}`, background: i === 0 ? surface : "transparent", color: i === 0 ? text : muted }}>{f}</span>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: cardsLayout ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Actividad", val: "1.284", delta: "+12%" },
              { label: "Usuarios", val: "842", delta: "+4%" },
              { label: "Rendimiento", val: "99.4%", delta: "ok" },
            ].map((s) => (
              <div key={s.label} style={card}>
                <div style={{ fontSize: 10, color: muted }}>{s.label}</div>
                <div style={heading({ fontSize: 16, margin: "4px 0" })}>{s.val}</div>
                <div style={{ fontSize: 9, color: s.delta.startsWith("+") ? "#34d399" : muted }}>{s.delta}</div>
              </div>
            ))}
          </div>
          {hasPagination && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: muted, paddingTop: 4, borderTop: `1px solid ${border}` }}>
              <span>Mostrando 1-10 de 48</span>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ padding: "2px 6px", borderRadius: rBtn, border: `1px solid ${border}` }}>‹</span>
                <span style={{ padding: "2px 6px", borderRadius: rBtn, border: `1px solid ${border}`, background: surface, color: text }}>1</span>
                <span style={{ padding: "2px 6px", borderRadius: rBtn, border: `1px solid ${border}` }}>2</span>
                <span style={{ padding: "2px 6px", borderRadius: rBtn, border: `1px solid ${border}` }}>›</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
    if (mode === "landing") return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, border: `1px solid ${border}`, fontSize: 10, color: muted, marginBottom: 12 }}>
          Lanzamiento oficial
        </div>
        <div style={heading({ fontSize: 22, lineHeight: 1.2, marginBottom: 8 })}>
          Construye más rápido con tu marca
        </div>
        <div style={{ fontSize: 11, color: muted, maxWidth: 360, margin: "0 auto 16px", lineHeight: 1.5 }}>
          Tokens visuales, interacción fluida y seguridad unificada bajo una misma arquitectura.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button style={btn}>Comenzar gratis</button>
          <button style={{ ...btn, background: surface, color: text, border: `1px solid ${border}` }}>Documentación</button>
        </div>
      </div>
    );
    if (mode === "auth") return (
      <div style={{ padding: 24, maxWidth: 280, margin: "0 auto" }}>
        <div style={heading({ fontSize: 16, marginBottom: 4, textAlign: "center" })}>Iniciar sesión</div>
        <div style={{ fontSize: 10, color: muted, textAlign: "center", marginBottom: 14 }}>Bienvenido de nuevo</div>
        {hasOAuth && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {["Google", "GitHub"].map((p) => (
              <button key={p} style={{ ...btn, flex: 1, background: surface, color: text, border: `1px solid ${border}`, fontSize: 10 }}>{p}</button>
            ))}
          </div>
        )}
        {hasPassword && (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>Email</div>
              <div style={input} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>Contraseña</div>
              <div style={input} />
            </div>
            <button style={{ ...btn, width: "100%" }}>Continuar</button>
          </>
        )}
        {hasMagic && !hasPassword && (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>Email para enlace mágico</div>
              <div style={input} />
            </div>
            <button style={{ ...btn, width: "100%" }}>Enviar enlace</button>
          </>
        )}
      </div>
    );
    if (mode === "form") return (
      <div style={{ padding: 16 }}>
        <div style={heading({ fontSize: 14 })}>Formulario</div>
        {multiStep && <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "10px 0", fontSize: 9, color: muted }}>
          {[1, 2, 3].map((n, i) => <Fragment key={n}><span style={{ width: 18, height: 18, borderRadius: 99, background: i === 0 ? primary : surface, color: i === 0 ? "#0b0b0b" : muted, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{n}</span>{i < 2 && <span style={{ flex: 1, height: 2, background: border }} />}</Fragment>)}
        </div>}
        {["Nombre", "Email"].map((l, idx) => (
          <div key={l} style={{ marginBottom: 8, marginTop: idx === 0 && !multiStep ? 10 : 0 }}>
            <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>{l}</div>
            <div style={{ ...input, borderColor: inlineErr && idx === 1 ? "#f87171" : border }} />
            {inlineErr && idx === 1 && <div style={{ fontSize: 9, color: "#f87171", marginTop: 3 }}>Email no válido</div>}
          </div>
        ))}
        <div style={{ fontSize: 10, color: primary, margin: "2px 0 10px" }}>Validación: {formVal}</div>
        <button style={btn}>{multiStep ? "Siguiente" : "Enviar"}</button>
        {successPat === "toast" && <div style={{ ...card, marginTop: 10, padding: "6px 10px", fontSize: 10, borderColor: "#34d39955" }}>✓ Guardado (toast)</div>}
        {successPat === "inline" && <div style={{ fontSize: 10, color: "#34d399", marginTop: 8 }}>✓ Guardado correctamente</div>}
      </div>
    );
    if (mode === "mobile") return (
      <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 152, ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 10 }}>
            <div style={heading({ fontSize: 12 })}>Móvil</div>
            <div style={{ height: 8 }} />
            {[0, 1, 2].map((i) => <div key={i} style={{ ...card, height: 30, marginBottom: 6, background: "rgba(255,255,255,0.09)" }} />)}
            <button style={{ ...btn, width: "100%", marginTop: 2 }}>Acción</button>
          </div>
          <div style={{ display: "flex", borderTop: `1px solid ${border}` }}>{[0, 1, 2, 3].map((i) => <div key={i} style={{ flex: 1, padding: "6px 0", textAlign: "center" }}><div style={{ width: 14, height: 14, borderRadius: 4, background: i === 0 ? primary : border, margin: "0 auto" }} /></div>)}</div>
        </div>
      </div>
    );
    const chips: { k: string; c: string; t: string }[] = [
      { k: "empty", c: "#38bdf8", t: has(d.emptyCta) ? "Vacío + CTA" : "Vacío" },
      { k: "loading", c: "#a78bfa", t: str(d.loadingPattern, "skeleton") },
      { k: "error", c: "#f87171", t: str(d.errorPattern, "inline") },
      { k: "success", c: "#34d399", t: str(d.successPattern, "toast") },
    ];
    return (
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {chips.map((s2) => (
          <div key={s2.k} style={{ ...card, padding: 10, minHeight: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: s2.c }} />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{s2.k}</span>
            </div>
            <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{s2.t}</div>
          </div>
        ))}
      </div>
    );
  })();

  const tech: string[] = [];
  if (has(st.pattern)) tech.push(`arquitectura: ${str(st.pattern, "—")}`);
  if (st.defaultExport === true) tech.push("default exports");
  if (st.serverComponentsDefault !== false) tech.push("RSC por defecto");
  const libs = Array.isArray(st.libraries) ? (st.libraries as unknown[]) : [];
  if (libs.length) tech.push(`${libs.length} librería(s)`);
  if (sec.csp === true) tech.push("CSP estricta");
  if (sec.secretsServerOnly !== false) tech.push("secretos solo servidor");
  if (sec.serverSideValidation !== false) tech.push("validación en servidor");
  if (sec.rateLimit === true) tech.push("rate limiting");

  return (
    <div className={compact ? "" : "card-surface rounded-xl p-4"}>
      {!compact && !hideTabs && <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Preview resuelta</h3>}
      {!hideTabs && (<div className="mb-2 flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button key={m.id} type="button" onClick={() => setMode(m.id)}
            className={"rounded-md px-2 py-1 text-[11px] font-medium transition-colors " + (mode === m.id ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-panel-2)] text-[var(--color-muted)] hover:text-white")}>
            {m.label}
          </button>
        ))}
      </div>)}
      <div style={frame}>{body}</div>
      {tech.length > 0 && (
        <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-black/20 p-2">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Impacto técnico (no se dibuja) · afecta a Starter · AGENTS.md · Export</div>
          <div className="flex flex-wrap gap-1">
            {tech.map((t, i) => <span key={i} className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] text-[var(--color-muted)]">{t}</span>)}
          </div>
        </div>
      )}
      {!hideTabs && <p className="mt-2 text-[10px] text-[var(--color-muted)]">Alimentada por <b>resolvedConfig</b>: lo representable cambia el lienzo (motion {motion}); lo técnico se muestra como impacto.</p>}
    </div>
  );
}

/* --------- Origen por campo + impacto por dominio (para Visual) ----------- */
function fmtVal(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (typeof v === "string") return v.length > 22 ? v.slice(0, 21) + "…" : (v || "—");
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.length ? `${v.length} ítem(s)` : "vacío";
  if (typeof v === "object") return "objeto";
  return String(v);
}
export function DomainOriginDigest({ report }: { report: ValidationReport }) {
  return (
    <div className="card-surface rounded-xl p-4">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Origen de cada decisión</h3>
      <p className="mb-3 text-[10px] text-[var(--color-muted)]">Qué aporta cada pestaña a la marca resuelta y de dónde sale cada valor (custom · preset · default).</p>
      <div className="space-y-2.5">
        {(Object.values(report.domains) as DomainReport[]).map((d) => (
          <details key={d.domain} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] overflow-hidden transition">
            <summary className="flex cursor-pointer items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text)] select-none hover:bg-white/[0.04]">
              <span className="flex-1 font-medium">{DOMAIN_LABEL[d.domain]}</span>
              <span className={"rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider " + STATUS_META[d.status].cls}>{STATUS_META[d.status].label}</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="text-sky-400">{d.counts.custom}c</span>
                <span className="text-emerald-400">{d.counts.template}t</span>
                <span className="text-violet-400">{d.counts.preset}p</span>
                <span className="text-amber-400">{d.counts.default}d</span>
              </span>
            </summary>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-[var(--color-border)] bg-black/15 px-3.5 py-2.5 sm:grid-cols-2">
              {d.fields.map((f) => (
                <div key={f.key} className="flex min-w-0 items-center gap-1.5 text-[11px]">
                  <OriginBadge origin={f.origin} />
                  <span className="shrink-0 text-[var(--color-muted)]">{f.label}:</span>
                  <span className="truncate font-medium text-[var(--color-text)]">{fmtVal(f.value)}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

/* Vistas del drawer de auditoría (usado por AuditDrawer). */
type AuditView = "coverage" | "publish" | "versions";

/* ========================================================================== */
/*  PILL GLOBAL DE ESTADO + DRAWER (Cobertura / Publicar / Versiones)         */
/*  Sustituyen a StatusStrip + VisualAudit fijos bajo el canvas: el estado y  */
/*  la publicación viven en una capa secundaria, no pegados al preview.       */
/* ========================================================================== */

/** Pill compacto unificado para la barra superior (Cobertura + Versiones). Abre el AuditDrawer. */
export function StatusPill({
  report,
  onOpen,
  onOpenVersions,
  versionCount = 0,
}: {
  report: ValidationReport;
  onOpen: () => void;
  onOpenVersions?: () => void;
  versionCount?: number;
}) {
  const ok = report.canPublish;
  return (
    <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-0.5 shadow-sm">
      {/* Botón principal: Estado, Cobertura y Publicación */}
      <button
        type="button"
        onClick={onOpen}
        title="Cobertura de arquitectura y checklist de publicación"
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-white/10"
      >
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--color-text)]">
          <span className={"h-2 w-2 rounded-full " + (ok ? "bg-emerald-400" : "bg-red-400")} />
          Cobertura
        </span>
        <span className="font-mono font-bold text-[var(--color-text)]">
          {Math.round(report.coverage * 100)}%
        </span>
        <span className={"rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase " + (ok ? "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" : "text-red-300 border-red-400/40 bg-red-400/10")}>
          {ok ? "publicable" : `${report.blockingIssues.length} bloqueo(s)`}
        </span>
      </button>

      {/* Segmento integrado: Historial de Versiones y Snapshots */}
      <button
        type="button"
        onClick={onOpenVersions ?? onOpen}
        title="Historial de versiones, snapshots inmutables y diffs"
        className="flex items-center gap-1.5 border-l border-white/10 px-2.5 py-1.5 text-xs text-[var(--color-muted)] hover:text-white hover:bg-white/10 rounded-r-md transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="font-semibold text-[11px]">Versiones</span>
        <span className="rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 text-[9px] font-mono font-bold">
          {versionCount}
        </span>
        <span className="text-white/40 text-[11px]">›</span>
      </button>
    </div>
  );
}

/** Resumen de definición por escena: cuánto está fijado vs. auto vs. vacío. */
export interface SceneDefinition { scene: string; label: string; assigned: number; auto: number; empty: number; buildable: number }

export function SlotsDefinitionPanel({ summary }: { summary: SceneDefinition[] }) {
  const totalAuto = summary.reduce((n, s) => n + s.auto, 0);
  const totalAssigned = summary.reduce((n, s) => n + s.assigned, 0);
  // Aviso (no bloqueante): proporcional — escena con >60% de sus zonas construibles en auto.
  const heavyAuto = summary.filter((s) => s.buildable > 0 && s.auto / s.buildable > 0.6);
  return (
    <div className="card-surface rounded-xl p-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Definición de escenas</h3>
        <span className="text-[11px] font-semibold text-[var(--color-muted)]">{totalAssigned} fijados · {totalAuto} auto</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {summary.map((s) => (
          <div key={s.scene} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-medium">{s.label}</span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">{s.assigned}</span>
            <span className="rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-accent)]">{s.auto} auto</span>
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">{s.empty}</span>
          </div>
        ))}
      </div>
      {heavyAuto.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
          <b>Aviso (no bloquea):</b> {heavyAuto.map((s) => s.label).join(", ")} {heavyAuto.length === 1 ? "depende" : "dependen"} sobre todo de relleno automático. Puedes publicar igual; fija componentes si quieres que sea deliberado.
        </div>
      )}
      <p className="mt-2 text-[10px] text-[var(--color-muted)]">
        <b>auto</b> = arranque inteligente por categoría (no es una decisión fijada). Solo los <b>required</b> bloquean la publicación.
      </p>
    </div>
  );
}

/** Slide-over lateral con toda la auditoría y publicación. */
export function AuditDrawer({
  report, brandId, open, onClose, slotsSummary, getDraft, onRestored, initialView = "coverage", onPublished,
}: { report: ValidationReport; brandId: string; open: boolean; onClose: () => void; slotsSummary?: SceneDefinition[]; getDraft?: () => { name: string; tokens: unknown; previewIds: string[] }; onRestored?: (brand: RestoredBrand) => void; initialView?: AuditView; onPublished?: () => void }) {
  const [view, setView] = useState<AuditView>(initialView);
  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);
  const TABS: { id: AuditView; label: string }[] = [
    { id: "coverage", label: "Cobertura" }, { id: "publish", label: "Publicar" }, { id: "versions", label: "Versiones" },
  ];
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* backdrop oscuro que desenfoca el contenido detrás con elegancia */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* panel lateral 100% sólido y adaptado para evitar transparencias */}
      <aside className="relative flex h-full w-full max-w-[540px] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-[-16px_0_40px_rgba(0,0,0,0.8)] z-10">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-panel-2)] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-text)]">
            <span className={"h-2.5 w-2.5 rounded-full " + (report.canPublish ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]")} />
            Cobertura y publicación
          </h3>
          <span className={"rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider " + (report.canPublish ? "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" : "text-red-300 border-red-400/40 bg-red-400/10")}>
            {report.canPublish ? "publicable" : "bloqueado"}
          </span>
          <button 
            type="button" 
            onClick={onClose} 
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-white/10 hover:text-[var(--color-text)] transition-colors" 
            title="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 border-b border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-2.5">
          {TABS.map((t) => (
            <button 
              key={t.id} 
              type="button" 
              onClick={() => setView(t.id)}
              className={"rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all " + (view === t.id ? "bg-[var(--color-accent)] text-black shadow-md" : "bg-[var(--color-panel-2)] text-[var(--color-muted)] hover:text-[var(--color-text)]")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
          {view === "coverage" && (
            <>
              <CoveragePanel report={report} />
              <DomainOriginDigest report={report} />
            </>
          )}
          {view === "publish" && (
            <>
              {slotsSummary && slotsSummary.length > 0 && <SlotsDefinitionPanel summary={slotsSummary} />}
              <PublishChecklist report={report} />
            </>
          )}
          {view === "versions" && <BrandVersions brandId={brandId} getDraft={getDraft} onRestored={onRestored} onPublished={onPublished} />}
        </div>
      </aside>
    </div>
  );
}
