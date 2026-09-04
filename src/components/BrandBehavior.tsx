"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  NAV_PATTERNS, MOTION_PRESETS, LOADING_PATTERNS, ARCH_PATTERNS, NAMING,
  SESSION_TYPES, VALIDATION_LIBS, AUTH_METHODS, SECURITY_CHECKS,
  TREE_TEMPLATES, LIB_CATEGORIES,
  FORM_PRESETS, FORM_VALIDATION, FORM_CONFIRM, TABLE_LAYOUTS, FILTER_STYLES,
  PAGINATION, SEARCH_STYLES, SEARCH_TRIGGER, ERROR_PATTERNS, SUCCESS_PATTERNS,
  MOBILE_DATA, CONFIRMATIONS, DATA_PRESETS, blueprintToMarkdown,
  type Blueprint, type Opt, type Badge, type TreeNode, type LibItem,
} from "@/lib/blueprint";
import { resolveBlueprint, resolvedToBlueprint } from "@/lib/resolve";
import { CoverageMini, ResolvedPreview } from "./BrandSynthesis";
import { CustomSelect } from "./CustomSelect";

type Tab = "interaccion" | "estructura" | "datos" | "seguridad" | "sugerencias";
type Level = "obligatorio" | "recomendado" | "avanzado";
type LibStatus = LibItem["status"];

interface Suggestion {
  id: string; title: string; summary: string; source: string; url: string;
  date: string; confidence: "alta" | "media" | "baja"; kind: string;
}

interface Props {
  tab: Tab;
  bp: Blueprint;
  setField: (path: string, value: unknown) => void;
  toggleArray: (path: string, item: string) => void;
  addIdea: (idea: { title: string; source?: string; url?: string }) => void;
  removeIdea: (index: number) => void;
  applyToRules: (line: string) => void;
}

/* ------------------------------- Primitivos -------------------------------- */
const LEVEL_STYLE: Record<Level, string> = {
  obligatorio: "text-red-400 border-red-400/30 bg-red-400/10",
  recomendado: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  avanzado: "text-white/40 border-white/15 bg-white/5",
};

const LEVEL_BORDER: Record<Level, string> = {
  obligatorio: "border-l-2 border-l-red-400/50",
  recomendado: "border-l-2 border-l-sky-400/40",
  avanzado: "border-l-2 border-l-white/15",
};
function Section({ title, hint, level, children }: { title: string; hint?: string; level?: Level; children: React.ReactNode }) {
  return (
    <div className={"card-surface rounded-xl p-4 " + (level ? LEVEL_BORDER[level] : "")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-text)]">{title}</h3>
        {level && <span className={"rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " + LEVEL_STYLE[level]}>{level}</span>}
      </div>
      {hint && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CardChoice({ options, value, onPick, multi = false, selected = [], cols, bigWire = false }: {
  options: Opt[]; value?: string; onPick: (v: string) => void; multi?: boolean; selected?: string[];
  cols?: 2 | 3 | 4; bigWire?: boolean;
}) {
  const isOn = (v: string) => (multi ? selected.includes(v) : value === v);
  const colCls = cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  if (bigWire) {
    return (
      <div className={"grid grid-cols-2 gap-2 " + colCls}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            className={
              "flex flex-col rounded-lg border p-2.5 text-left transition-colors " +
              (isOn(o.value) ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/40" : "border-[var(--color-border)] hover:border-white/25 hover:bg-white/5")
            }
          >
            <div className="mb-1.5 flex items-center justify-center rounded-md bg-black/25 py-2">
              {o.wire ? <Wire id={o.wire} on={isOn(o.value)} size="lg" /> : <span className="h-[38px]" />}
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-semibold">{o.label}</span>
              {o.badge ? <BadgePill badge={o.badge} /> : <span className={"h-3 w-3 shrink-0 rounded-full border " + (isOn(o.value) ? "border-[var(--color-accent)] bg-[var(--color-accent)]" : "border-white/25")} />}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">{o.desc}</p>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={"grid grid-cols-1 gap-2 " + colCls}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onPick(o.value)}
          className={
            "rounded-lg border p-2.5 text-left transition-colors " +
            (isOn(o.value)
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30"
              : "border-[var(--color-border)] hover:border-white/25 hover:bg-white/5")
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {o.wire && <Wire id={o.wire} on={isOn(o.value)} />}
              <span className="truncate text-sm font-medium">{o.label}</span>
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              {o.badge && <BadgePill badge={o.badge} />}
              <span className={"h-3.5 w-3.5 rounded-full border " + (isOn(o.value) ? "border-[var(--color-accent)] bg-[var(--color-accent)]" : "border-white/25")} />
            </span>
          </div>
          <p className="mt-1 text-xs leading-snug text-[var(--color-muted)]">{o.desc}</p>
        </button>
      ))}
    </div>
  );
}

function BadgePill({ badge }: { badge: Badge }) {
  const tone =
    badge.tone === "good" ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/15"
      : badge.tone === "warn" ? "text-amber-300 border-amber-400/40 bg-amber-400/15"
      : badge.tone === "bad" ? "text-red-300 border-red-400/40 bg-red-400/15"
      : "text-sky-300 border-sky-400/40 bg-sky-400/15";
  return <span className={"shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + tone}>{badge.text}</span>;
}

function Wire({ id, on, size = "sm" }: { id: string; on?: boolean; size?: "sm" | "lg" }) {
  // Elementos con fill="currentColor" quedan rellenos (acentos) y diferencian formas de un vistazo.
  const shapes: Record<string, React.ReactNode> = {
    "app-shell": (<><rect x="1" y="1" width="10" height="24" rx="2" fill="currentColor" fillOpacity={0.25} /><line x1="1" y1="7" x2="37" y2="7" /></>),
    dashboard: (<><rect x="4" y="5" width="12" height="7" rx="1" /><rect x="22" y="5" width="12" height="7" rx="1" /><rect x="4" y="15" width="12" height="6" rx="1" /><rect x="22" y="15" width="12" height="6" rx="1" /></>),
    landing: (<><line x1="6" y1="7" x2="32" y2="7" /><line x1="6" y1="13" x2="32" y2="13" /><line x1="6" y1="19" x2="24" y2="19" /></>),
    wizard: (<><circle cx="8" cy="13" r="2.5" /><circle cx="19" cy="13" r="2.5" /><circle cx="30" cy="13" r="2.5" /><line x1="10.5" y1="13" x2="16.5" y2="13" /><line x1="21.5" y1="13" x2="27.5" y2="13" /></>),
    tabbed: (<><line x1="1" y1="8" x2="37" y2="8" /><line x1="9" y1="1" x2="9" y2="8" /><line x1="19" y1="1" x2="19" y2="8" /></>),
    // Datos — formularios (input lines + botón enviar relleno)
    "form-simple": (<><rect x="8" y="4" width="22" height="3.5" rx="1" /><rect x="8" y="11" width="22" height="3.5" rx="1" /><rect x="8" y="18" width="11" height="4.5" rx="1.5" fill="currentColor" /></>),
    "form-multistep": (<><circle cx="8" cy="5" r="2.2" fill="currentColor" /><circle cx="16" cy="5" r="2.2" /><circle cx="24" cy="5" r="2.2" /><line x1="10.2" y1="5" x2="13.8" y2="5" /><line x1="18.2" y1="5" x2="21.8" y2="5" /><rect x="8" y="11" width="22" height="3.5" rx="1" /><rect x="8" y="18" width="10" height="4.5" rx="1.5" fill="currentColor" /></>),
    "form-dashboard": (<><rect x="5" y="6" width="12" height="3" rx="1" /><rect x="21" y="6" width="12" height="3" rx="1" /><rect x="5" y="12" width="12" height="3" rx="1" /><rect x="21" y="12" width="12" height="3" rx="1" /><rect x="5" y="18" width="10" height="4" rx="1.5" fill="currentColor" /></>),
    "form-auth": (<><rect x="10" y="3" width="18" height="20" rx="2.5" /><rect x="13" y="8" width="12" height="3" rx="1" /><rect x="13" y="13" width="12" height="3" rx="1" /><rect x="13" y="18" width="12" height="3.5" rx="1.5" fill="currentColor" /></>),
    // Datos — tablas (cabecera rellena + densidad distinta)
    "table-dense": (<><rect x="3" y="3" width="32" height="3.5" rx="1" fill="currentColor" /><line x1="3" y1="9" x2="35" y2="9" /><line x1="3" y1="12" x2="35" y2="12" /><line x1="3" y1="15" x2="35" y2="15" /><line x1="3" y1="18" x2="35" y2="18" /><line x1="3" y1="21" x2="35" y2="21" /></>),
    "table-comfortable": (<><rect x="3" y="3" width="32" height="4" rx="1" fill="currentColor" /><line x1="3" y1="12" x2="35" y2="12" /><line x1="3" y1="18" x2="35" y2="18" /></>),
    "table-cards": (<><rect x="5" y="4" width="28" height="7" rx="1.5" /><circle cx="9" cy="7.5" r="1.6" fill="currentColor" /><rect x="5" y="14" width="28" height="7" rx="1.5" /><circle cx="9" cy="17.5" r="1.6" fill="currentColor" /></>),
    "table-list": (<><circle cx="6" cy="8" r="1.5" fill="currentColor" /><line x1="10" y1="8" x2="30" y2="8" /><circle cx="6" cy="13" r="1.5" fill="currentColor" /><line x1="10" y1="13" x2="32" y2="13" /><circle cx="6" cy="18" r="1.5" fill="currentColor" /><line x1="10" y1="18" x2="24" y2="18" /></>),
    // Datos — búsqueda (lupa rellena)
    "search-simple": (<><rect x="4" y="9" width="21" height="8" rx="4" /><circle cx="29" cy="12" r="3.2" fill="currentColor" /><line x1="31" y1="14.2" x2="34" y2="17.5" strokeWidth={2} /></>),
    "search-filters": (<><rect x="4" y="6" width="15" height="6" rx="3" /><rect x="22" y="6" width="6" height="6" rx="3" fill="currentColor" /><rect x="30" y="6" width="4" height="6" rx="2" /><line x1="4" y1="18" x2="14" y2="18" /><line x1="18" y1="18" x2="28" y2="18" /></>),
    "search-command": (<><rect x="5" y="5" width="28" height="16" rx="2.5" /><rect x="8" y="8" width="5" height="4" rx="1" fill="currentColor" /><line x1="15" y1="10" x2="28" y2="10" /><line x1="8" y1="15" x2="25" y2="15" /></>),
  };
  const w = size === "lg" ? 56 : 38, h = size === "lg" ? 38 : 26;
  const col = on ? "var(--color-accent)" : "var(--color-muted)";
  return (
    <svg width={w} height={h} viewBox="0 0 38 26" fill="none" strokeWidth={1.5}
      style={{ stroke: col, color: col }}
      className="shrink-0" aria-hidden>
      <rect x="1" y="1" width="36" height="24" rx="2" strokeOpacity={0.5} />
      {shapes[id]}
    </svg>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3 text-left transition-colors hover:bg-white/5">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{desc}</span>}
      </span>
      <span className={"mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors " + (on ? "bg-[var(--color-accent)]" : "bg-white/15")}>
        <span className={"h-4 w-4 rounded-full bg-white transition-transform " + (on ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}

const field = "mt-1 w-full rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-sm outline-none";

/* --------------------------- Iconos por tipo ------------------------------- */
function TypeIcon({ type }: { type: TreeNode["type"] }) {
  if (type === "folder")
    // Adaptado de Uiverse.io by 00Kubi — carpeta bitono
    return (
      <svg width={16} height={13} viewBox="0 0 18 14" fill="none" aria-hidden>
        <path d="M16.2 1.75H8.1L6.3 0H1.8C0.81 0 0 0.7875 0 1.75V12.25C0 13.2125 0.81 14 1.8 14H15.165L18 9.1875V3.5C18 2.5375 17.19 1.75 16.2 1.75Z" fill="#FFA000" />
        <path d="M16.2 2H1.8C0.81 2 0 2.77143 0 3.71429V12.2857C0 13.2286 0.81 14 1.8 14H16.2C17.19 14 18 13.2286 18 12.2857V3.71429C18 2.77143 17.19 2 16.2 2Z" fill="#FFCA28" />
      </svg>
    );
  if (type === "package")
    return <svg width={15} height={15} viewBox="0 0 16 16" fill="none" strokeWidth={1.4} style={{ stroke: "#c084fc" }} aria-hidden><path d="M8 1.6 14 4.8v6.4L8 14.4 2 11.2V4.8z" /><path d="M2 4.8 8 8l6-3.2M8 8v6.4" /></svg>;
  return <svg width={15} height={15} viewBox="0 0 16 16" fill="none" strokeWidth={1.4} style={{ stroke: "var(--color-muted)" }} aria-hidden><path d="M4 1.6h5l3 3v9.8H4z" /><path d="M9 1.6v3h3" /></svg>;
}

/* --------------------------- Editor de árbol ------------------------------- */
function addChild(tree: TreeNode[], parentPath: number[], type: TreeNode["type"]): TreeNode[] {
  const next = structuredClone(tree);
  let arr = next;
  for (const idx of parentPath) {
    const n = arr[idx];
    if (!n.children) n.children = [];
    arr = n.children;
  }
  const name = type === "file" ? "nuevo.ts" : type === "package" ? "nuevo-paquete" : "nueva-carpeta";
  arr.push(type === "file" ? { name, type } : { name, type, children: [] });
  return next;
}
function mutateAt(tree: TreeNode[], path: number[], fn: (siblings: TreeNode[], idx: number) => void): TreeNode[] {
  const next = structuredClone(tree);
  let arr = next;
  for (let d = 0; d < path.length - 1; d++) {
    const n = arr[path[d]];
    if (!n.children) n.children = [];
    arr = n.children;
  }
  fn(arr, path[path.length - 1]);
  return next;
}

function TreeRow({ node, path, collapsed, toggleCollapse, onChange, tree, selectedKey, setSelected }: {
  node: TreeNode; path: number[];
  collapsed: Set<string>; toggleCollapse: (key: string) => void;
  onChange: (t: TreeNode[]) => void; tree: TreeNode[];
  selectedKey: string | null; setSelected: (k: string) => void;
}) {
  const key = path.join(".");
  const isBranch = node.type !== "file";
  const isCollapsed = collapsed.has(key);
  const selected = selectedKey === key;
  const cycleType = () => {
    const order: TreeNode["type"][] = ["folder", "file", "package"];
    const nextType = order[(order.indexOf(node.type) + 1) % order.length];
    onChange(mutateAt(tree, path, (sib, idx) => {
      const n = sib[idx];
      n.type = nextType;
      if (nextType === "file") delete n.children;
      else if (!n.children) n.children = [];
    }));
  };
  const rename = (v: string) => onChange(mutateAt(tree, path, (sib, idx) => { sib[idx].name = v; }));
  const remove = () => onChange(mutateAt(tree, path, (sib, idx) => { sib.splice(idx, 1); }));
  const move = (dir: -1 | 1) => onChange(mutateAt(tree, path, (sib, idx) => {
    const j = idx + dir;
    if (j < 0 || j >= sib.length) return;
    [sib[idx], sib[j]] = [sib[j], sib[idx]];
  }));
  const nameCls = node.type === "file"
    ? "text-[var(--color-muted)]"
    : node.type === "package" ? "font-semibold text-violet-200" : "font-medium text-[var(--color-text)]";

  return (
    <div>
      <div
        onClick={() => setSelected(key)}
        className={"group flex items-center gap-1.5 rounded-md px-1 py-1 transition-colors " + (selected ? "bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/40" : "hover:bg-white/5")}
      >
        {isBranch ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); toggleCollapse(key); }} className="grid h-4 w-4 shrink-0 place-items-center text-[var(--color-muted)]" title={isCollapsed ? "Expandir" : "Colapsar"}>
            <span className={"transition-transform " + (isCollapsed ? "" : "rotate-90")}>▸</span>
          </button>
        ) : <span className="h-4 w-4 shrink-0" />}
        <button type="button" onClick={(e) => { e.stopPropagation(); cycleType(); }} title="Cambiar tipo (carpeta / archivo / paquete)" className="shrink-0"><TypeIcon type={node.type} /></button>
        <input
          value={node.name}
          onChange={(e) => rename(e.target.value)}
          onFocus={() => setSelected(key)}
          spellCheck={false}
          className={"min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 font-mono text-xs outline-none focus:bg-[var(--color-panel-2)] " + nameCls}
        />
        {node.type === "package" && (
          <span className="shrink-0 rounded border border-violet-400/40 bg-violet-400/10 px-1 text-[9px] font-semibold uppercase text-violet-300" title="Los paquetes afectan a la salida del starter">→ starter</span>
        )}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {isBranch && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange(addChild(tree, path, "folder")); }} title="Añadir carpeta" className="rounded px-1 py-0.5 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent)]">+dir</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange(addChild(tree, path, "file")); }} title="Añadir archivo" className="rounded px-1 py-0.5 text-[10px] text-[var(--color-muted)] hover:text-white">+file</button>
            </>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); move(-1); }} title="Subir" className="rounded px-1 text-[var(--color-muted)] hover:text-white">↑</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); move(1); }} title="Bajar" className="rounded px-1 text-[var(--color-muted)] hover:text-white">↓</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); remove(); }} title="Eliminar" className="rounded px-1 text-[var(--color-muted)] hover:text-red-400">✕</button>
        </div>
      </div>
      {isBranch && !isCollapsed && node.children && node.children.length > 0 && (
        <div className="ml-[13px] border-l border-white/15 pl-2">
          {node.children.map((c, ci) => (
            <TreeRow key={ci} node={c} path={[...path, ci]} collapsed={collapsed} toggleCollapse={toggleCollapse} onChange={onChange} tree={tree} selectedKey={selectedKey} setSelected={setSelected} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeEditor({ tree, pattern, onChange }: { tree: TreeNode[]; pattern?: string; onChange: (t: TreeNode[]) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const toggleCollapse = (key: string) => setCollapsed((prev) => {
    const s = new Set(prev); if (s.has(key)) s.delete(key); else s.add(key); return s;
  });
  const hasTemplate = pattern && TREE_TEMPLATES[pattern];
  const activeTemplate = useMemo(() => {
    const s = JSON.stringify(tree);
    return Object.keys(TREE_TEMPLATES).find((k) => JSON.stringify(TREE_TEMPLATES[k]) === s);
  }, [tree]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onChange(addChild(tree, [], "folder"))} className="rounded-lg bg-[var(--color-panel-2)] px-2.5 py-1 text-xs hover:bg-white/10">+ carpeta</button>
        <button type="button" onClick={() => onChange(addChild(tree, [], "file"))} className="rounded-lg bg-[var(--color-panel-2)] px-2.5 py-1 text-xs hover:bg-white/10">+ archivo</button>
        <button type="button" onClick={() => onChange(addChild(tree, [], "package"))} className="rounded-lg bg-[var(--color-panel-2)] px-2.5 py-1 text-xs hover:bg-white/10">+ paquete</button>
        {hasTemplate && (
          <button type="button" onClick={() => onChange(structuredClone(TREE_TEMPLATES[pattern!]))} className="ml-auto rounded-lg border border-[var(--color-accent)]/40 px-2.5 py-1 text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10">
            Cargar plantilla «{pattern}»
          </button>
        )}
      </div>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)]/40 p-2">
        <div className="mb-1.5 flex items-center gap-1.5 border-b border-white/10 px-1 pb-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/70" /><span className="h-2 w-2 rounded-full bg-amber-400/70" /><span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">estructura del proyecto</span>
          {activeTemplate
            ? <span className="ml-auto rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-accent)]">plantilla: {activeTemplate}</span>
            : tree.length > 0 && <span className="ml-auto rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-muted)]">personalizado</span>}
        </div>
        {tree.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-[var(--color-muted)]">
            Árbol vacío. Añade nodos o {hasTemplate ? "carga la plantilla base." : "elige una arquitectura para partir de una plantilla."}
          </p>
        ) : (
          tree.map((n, i) => (
            <TreeRow key={i} node={n} path={[i]} collapsed={collapsed} toggleCollapse={toggleCollapse} onChange={onChange} tree={tree} selectedKey={selectedKey} setSelected={setSelectedKey} />
          ))
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1"><TypeIcon type="folder" /> carpeta · organización</span>
        <span className="inline-flex items-center gap-1"><TypeIcon type="file" /> archivo</span>
        <span className="inline-flex items-center gap-1"><TypeIcon type="package" /> paquete · <span className="text-violet-300">afecta al starter</span></span>
      </div>
    </div>
  );
}

/* ------------------------ Gestor de librerías ------------------------------ */
const LIB_STATUS: { value: LibStatus; label: string; cls: string; dot: string }[] = [
  { value: "approved", label: "approved", cls: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10", dot: "bg-emerald-400" },
  { value: "discouraged", label: "discouraged", cls: "text-amber-300 border-amber-400/40 bg-amber-400/10", dot: "bg-amber-400" },
  { value: "blocked", label: "blocked", cls: "text-red-300 border-red-400/40 bg-red-400/10", dot: "bg-red-400" },
];
function statusMeta(s: LibStatus) { return LIB_STATUS.find((x) => x.value === s) ?? LIB_STATUS[0]; }

const SUGGESTED_LIBS: LibItem[] = [
  { name: "zod", category: "validation", status: "approved" },
  { name: "react-hook-form", category: "forms", status: "approved" },
  { name: "tanstack-query", category: "data-fetching", status: "approved" },
  { name: "zustand", category: "state", status: "approved" },
  { name: "date-fns", category: "utils", status: "approved" },
  { name: "clsx", category: "utils", status: "approved" },
  { name: "tailwind-merge", category: "utils", status: "approved" },
  { name: "moment", category: "utils", status: "blocked" },
  { name: "axios", category: "data-fetching", status: "blocked" },
  { name: "lodash", category: "utils", status: "discouraged" },
];

function LibManager({ items, legacy, onChange }: {
  items: LibItem[]; legacy: { approved?: string[]; forbidden?: string[] }; onChange: (items: LibItem[]) => void;
}) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState<string>(LIB_CATEGORIES[0]);
  const [status, setStatus] = useState<LibStatus>("approved");

  const has = (n: string) => items.some((x) => x.name.toLowerCase() === n.toLowerCase());
  const add = () => {
    const v = name.trim();
    if (!v || has(v)) { setName(""); return; }
    onChange([...items, { name: v, category: cat, status }]);
    setName("");
  };
  const addLib = (lib: LibItem) => { if (!has(lib.name)) onChange([...items, lib]); };
  const cycleStatus = (idx: number) => {
    const order: LibStatus[] = ["approved", "discouraged", "blocked"];
    const next = items.map((it, i) => i === idx ? { ...it, status: order[(order.indexOf(it.status) + 1) % order.length] } : it);
    onChange(next);
  };
  const setItemCat = (idx: number, c: string) => onChange(items.map((it, i) => i === idx ? { ...it, category: c } : it));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const grouped = useMemo(() => {
    const g: Record<string, { it: LibItem; idx: number }[]> = {};
    items.forEach((it, idx) => { const c = it.category || "other"; (g[c] ??= []).push({ it, idx }); });
    return g;
  }, [items]);
  const cats = Object.keys(grouped).sort((a, b) => LIB_CATEGORIES.indexOf(a) - LIB_CATEGORIES.indexOf(b));
  const counts = useMemo(() => ({
    approved: items.filter((x) => x.status === "approved").length,
    discouraged: items.filter((x) => x.status === "discouraged").length,
    blocked: items.filter((x) => x.status === "blocked").length,
  }), [items]);

  const canMigrate = items.length === 0 && ((legacy.approved?.length ?? 0) + (legacy.forbidden?.length ?? 0) > 0);
  const migrate = () => {
    const next: LibItem[] = [
      ...(legacy.approved ?? []).map((n) => ({ name: n, status: "approved" as LibStatus })),
      ...(legacy.forbidden ?? []).map((n) => ({ name: n, status: "blocked" as LibStatus })),
    ];
    onChange(next);
  };
  const suggestions = SUGGESTED_LIBS.filter((l) => !has(l.name));

  return (
    <div>
      {/* Resumen del stack */}
      {items.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {LIB_STATUS.map((s) => (
            <span key={s.value} className={"inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold " + s.cls}>
              <span className={"h-1.5 w-1.5 rounded-full " + s.dot} />{counts[s.value]} {s.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="nombre (p.ej. zod)"
          className="min-w-0 flex-1 rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-sm outline-none"
        />
        <CustomSelect
          value={cat}
          onChange={setCat}
          size="sm"
          className="w-[120px]"
          options={LIB_CATEGORIES.map((c) => ({ label: c, value: c }))}
        />
        <CustomSelect
          value={status}
          onChange={(v) => setStatus(v as LibStatus)}
          size="sm"
          className="w-[130px]"
          options={LIB_STATUS.map((s) => ({ label: s.label, value: s.value }))}
        />
        <button type="button" onClick={add} className="rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-xs hover:bg-white/10">Añadir</button>
      </div>

      {/* Sugerencias rápidas */}
      {suggestions.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Añadir rápido</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((l) => {
              const m = statusMeta(l.status);
              return (
                <button key={l.name} type="button" onClick={() => addLib(l)} title={`Añadir como ${l.status} · ${l.category}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 px-2 py-1 text-[11px] text-[var(--color-muted)] hover:border-white/40 hover:text-white">
                  <span className={"h-1.5 w-1.5 rounded-full " + m.dot} />{l.name}<span className="opacity-60">+</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canMigrate && (
        <button type="button" onClick={migrate} className="mt-2 text-xs text-[var(--color-accent)] hover:underline">
          Importar de las listas antiguas ({(legacy.approved?.length ?? 0) + (legacy.forbidden?.length ?? 0)})
        </button>
      )}

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--color-muted)]">Sin librerías todavía. Usa «Añadir rápido» o escribe una y márcala como approved / discouraged / blocked.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {cats.map((c) => (
            <div key={c}>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{c}</span>
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] text-[var(--color-muted)]">{grouped[c].length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grouped[c].map(({ it, idx }) => {
                  const m = statusMeta(it.status);
                  return (
                    <span key={idx} className={"group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs " + m.cls}>
                      <button type="button" onClick={() => cycleStatus(idx)} title={`Estado: ${it.status} — clic para cambiar`} className="flex items-center gap-1.5 font-semibold">
                        <span className={"h-1.5 w-1.5 rounded-full " + m.dot} />{it.name}
                      </button>
                      <CustomSelect
                        value={it.category || "other"}
                        onChange={(v) => setItemCat(idx, v)}
                        title="Categoría"
                        size="sm"
                        className="w-[104px] opacity-70 transition-opacity hover:opacity-100 [&_button]:px-1.5 [&_button]:py-0.5 [&_button]:text-[10px] [&_button]:uppercase"
                        options={LIB_CATEGORIES.map((k) => ({ label: k, value: k }))}
                      />
                      <button type="button" onClick={() => remove(idx)} title="Quitar" className="opacity-50 hover:text-red-300 hover:opacity-100">✕</button>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------- Reglas de agente (chips) ---------------------------- */
function RuleList({ title, tone, items, onChange }: {
  title: string; tone: "good" | "bad" | "info"; items: string[]; onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState("");
  const add = () => { const v = text.trim(); if (v && !items.includes(v)) onChange([...items, v]); setText(""); };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const dot = tone === "good" ? "bg-emerald-400" : tone === "bad" ? "bg-red-400" : "bg-sky-400";
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className={"h-2 w-2 rounded-full " + dot} />
        <span className="text-xs font-semibold">{title}</span>
        <span className="text-[10px] text-[var(--color-muted)]">({items.length})</span>
      </div>
      <div className="flex gap-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="añadir regla…"
          className="min-w-0 flex-1 rounded-lg bg-[var(--color-panel-2)] px-2.5 py-1.5 text-xs outline-none"
        />
        <button type="button" onClick={add} className="rounded-lg bg-[var(--color-panel-2)] px-2.5 py-1.5 text-xs hover:bg-white/10">+</button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 space-y-1">
          {items.map((r, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2 rounded-md bg-[var(--color-panel-2)] px-2.5 py-1.5">
              <span className="min-w-0 text-xs leading-snug">{r}</span>
              <button type="button" onClick={() => remove(idx)} className="shrink-0 text-[var(--color-muted)] hover:text-red-400">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------- Plantillas rápidas de reglas de agente -------- */
type RuleTarget = "always" | "never" | "ask";
const AGENT_RULE_TEMPLATES: { text: string; target: RuleTarget }[] = [
  { text: "Usar los design tokens siempre (nada de valores sueltos)", target: "always" },
  { text: "Usar primero los componentes del registry interno", target: "always" },
  { text: "Escribir TypeScript estricto (sin any)", target: "always" },
  { text: "Cubrir estados de carga, error y vacío", target: "always" },
  { text: "No usar colores hex hardcodeados", target: "never" },
  { text: "No usar estilos inline salvo casos justificados", target: "never" },
  { text: "No dejar console.log en el código final", target: "never" },
  { text: "No añadir dependencias sin preguntar", target: "ask" },
  { text: "Preguntar antes de tocar auth, pagos o migraciones", target: "ask" },
  { text: "Preguntar antes de cambiar el esquema de la BD", target: "ask" },
];
const RULE_TARGET_META: Record<RuleTarget, { label: string; dot: string; field: string }> = {
  always: { label: "Siempre", dot: "bg-emerald-400", field: "agents.always" },
  never: { label: "Nunca", dot: "bg-red-400", field: "agents.never" },
  ask: { label: "Preguntar", dot: "bg-sky-400", field: "agents.ask" },
};
function RuleTemplates({ bp, setField }: { bp: Blueprint; setField: (path: string, value: unknown) => void }) {
  const ag = bp.agents ?? {};
  const current: Record<RuleTarget, string[]> = { always: ag.always ?? [], never: ag.never ?? [], ask: ag.ask ?? [] };
  const has = (t: RuleTarget, text: string) => current[t].includes(text);
  const addAll = () => {
    (["always", "never", "ask"] as RuleTarget[]).forEach((t) => {
      const toAdd = AGENT_RULE_TEMPLATES.filter((r) => r.target === t && !has(t, r.text)).map((r) => r.text);
      if (toAdd.length) setField(RULE_TARGET_META[t].field, [...current[t], ...toAdd]);
    });
  };
  const remaining = AGENT_RULE_TEMPLATES.filter((r) => !has(r.target, r.text));
  return (
    <div className="mb-3 rounded-lg border border-dashed border-white/15 bg-[var(--color-panel-2)]/40 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Plantillas rápidas</span>
        {remaining.length > 0 && (
          <button type="button" onClick={addAll} className="rounded-md bg-[var(--color-accent)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25">Añadir todas</button>
        )}
      </div>
      {remaining.length === 0 ? (
        <p className="text-[11px] text-[var(--color-muted)]">Todas las plantillas ya están añadidas.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((r) => {
            const m = RULE_TARGET_META[r.target];
            return (
              <button key={r.text} type="button"
                onClick={() => setField(m.field, [...current[r.target], r.text])}
                title={`Añadir a «${m.label}»`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-1 text-[11px] text-[var(--color-text)]/90 hover:border-white/40 hover:bg-white/5">
                <span className={"h-1.5 w-1.5 rounded-full " + m.dot} />{r.text}<span className="opacity-50">+</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------- Mini-diagramas de arquitectura --------------------- */
function ArchDiagram({ id, on }: { id: string; on?: boolean }) {
  const col = on ? "var(--color-accent)" : "var(--color-muted)";
  const inner: Record<string, React.ReactNode> = {
    // Feature-based: features autocontenidos (ui + lógica + datos juntos)
    "feature-based": (
      <>
        <rect x="4" y="6" width="52" height="20" rx="2" strokeOpacity={0.7} />
        <rect x="7" y="10" width="13" height="12" rx="1" fill="currentColor" fillOpacity={0.25} />
        <rect x="23" y="10" width="13" height="12" rx="1" fill="currentColor" fillOpacity={0.25} />
        <rect x="39" y="10" width="13" height="12" rx="1" fill="currentColor" fillOpacity={0.25} />
        <rect x="4" y="30" width="52" height="20" rx="2" strokeOpacity={0.7} />
        <rect x="7" y="34" width="13" height="12" rx="1" fill="currentColor" fillOpacity={0.25} />
        <rect x="23" y="34" width="13" height="12" rx="1" fill="currentColor" fillOpacity={0.25} />
        <rect x="39" y="34" width="13" height="12" rx="1" fill="currentColor" fillOpacity={0.25} />
      </>
    ),
    // Layer-based: capas horizontales apiladas
    "layer-based": (
      <>
        <rect x="6" y="6" width="48" height="9" rx="1.5" fill="currentColor" fillOpacity={0.30} />
        <rect x="6" y="18" width="48" height="9" rx="1.5" fill="currentColor" fillOpacity={0.20} />
        <rect x="6" y="30" width="48" height="9" rx="1.5" fill="currentColor" fillOpacity={0.12} />
        <rect x="6" y="42" width="48" height="9" rx="1.5" strokeOpacity={0.7} />
      </>
    ),
    // Monorepo-lite: apps + packages compartidos
    "monorepo-lite": (
      <>
        <rect x="5" y="6" width="22" height="18" rx="2" strokeOpacity={0.7} />
        <rect x="33" y="6" width="22" height="18" rx="2" strokeOpacity={0.7} />
        <rect x="14" y="34" width="32" height="16" rx="2" fill="currentColor" fillOpacity={0.25} />
        <path d="M16 24 L26 34 M44 24 L34 34" strokeOpacity={0.8} />
      </>
    ),
  };
  return (
    <svg width="100%" height={58} viewBox="0 0 60 56" fill="none" strokeWidth={1.4} preserveAspectRatio="xMidYMid meet"
      style={{ stroke: col, color: col }} aria-hidden>
      {inner[id]}
    </svg>
  );
}
function ArchChoice({ value, onPick }: { value?: string; onPick: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {ARCH_PATTERNS.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onPick(o.value)}
            className={"flex flex-col rounded-lg border p-2.5 text-left transition-colors " + (on ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/40" : "border-[var(--color-border)] hover:border-white/25 hover:bg-white/5")}>
            <div className="mb-1.5 rounded-md bg-black/25 px-2 py-1"><ArchDiagram id={o.value} on={on} /></div>
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-sm font-semibold">{o.label}</span>
              <span className={"h-3 w-3 shrink-0 rounded-full border " + (on ? "border-[var(--color-accent)] bg-[var(--color-accent)]" : "border-white/25")} />
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Panel de impacto — lenguaje UNIFICADO para todas las pestañas.
   Bloques canónicos y en el mismo orden siempre:
   Preview · Starter · AGENTS.md · Dependencias · Conflictos (+ acción sugerida).
   Cada builder por pestaña rellena estas partes; los bloques que no apliquen
   se marcan como «na» y se muestran explícitamente («No aplica»).
   ========================================================================== */
type ImpactTone = "good" | "warn" | "bad" | "info";
interface ImpactItem { tone: ImpactTone; text: string; action?: string }
interface ImpactGroupData { title: string; items: ImpactItem[]; na?: boolean }
const SEV_LABEL: Record<ImpactTone, string> = { bad: "alta", warn: "media", info: "baja", good: "ok" };

const IMPACT_ORDER = ["Preview", "Starter", "AGENTS.md", "Dependencias", "Conflictos"] as const;
type ImpactParts = { preview?: ImpactItem[]; starter?: ImpactItem[]; agents?: ImpactItem[]; deps?: ImpactItem[]; conflicts?: ImpactItem[] };
function buildImpact(parts: ImpactParts, na: readonly string[] = []): ImpactGroupData[] {
  const map: Record<(typeof IMPACT_ORDER)[number], ImpactItem[] | undefined> = {
    "Preview": parts.preview, "Starter": parts.starter, "AGENTS.md": parts.agents, "Dependencias": parts.deps, "Conflictos": parts.conflicts,
  };
  return IMPACT_ORDER.map((title) => ({ title, items: map[title] ?? [], na: na.includes(title) }));
}

/* ---- Builder: Interacción ---- */
function interactionImpact(bp: Blueprint): ImpactGroupData[] {
  const i = bp.interaction ?? {};
  const preview: ImpactItem[] = [], starter: ImpactItem[] = [], agents: ImpactItem[] = [], deps: ImpactItem[] = [], conflicts: ImpactItem[] = [];
  if (i.navigationPattern) preview.push({ tone: "info", text: `Navegación: ${NAV_PATTERNS.find((x) => x.value === i.navigationPattern)?.label ?? i.navigationPattern}` });
  if (i.motionPreset) preview.push({ tone: i.motionPreset === "expressive" ? "warn" : "info", text: `Motion: ${MOTION_PRESETS.find((x) => x.value === i.motionPreset)?.label ?? i.motionPreset}${i.routeTransitions ? " · transiciones de ruta" : ""}` });
  if (i.loadingPattern) { const lbl = LOADING_PATTERNS.find((x) => x.value === i.loadingPattern)?.label ?? i.loadingPattern; preview.push({ tone: "info", text: `Carga: ${lbl}` }); starter.push({ tone: "info", text: `Andamiaje de carga: ${lbl}` }); }
  const fb = [i.feedbackToastSuccess && "toast", i.feedbackInlineErrors && "errores inline", i.feedbackErrorSummaryTop && "resumen arriba"].filter(Boolean);
  if (fb.length) agents.push({ tone: "good", text: `Feedback: ${fb.join(", ")}` });
  if (i.motionPreset === "none") agents.push({ tone: "info", text: "Motion: Ninguna → respetar prefers-reduced-motion", action: "Sin transiciones de ruta (desactivadas)" });
  if (i.navigationPattern === "app-shell" || i.navigationPattern === "dashboard") deps.push({ tone: "info", text: "App shell/Dashboard encaja con tablas, filtros y sidebar", action: "Configúralo en la pestaña Datos" });
  if (i.navigationPattern === "wizard") deps.push({ tone: "info", text: "Wizard combina con formularios multi-step", action: "Usa «Multi-step» en Datos + guardar borrador" });
  if (i.navigationPattern === "landing" && i.backSaveDraft) conflicts.push({ tone: "warn", text: "Landing con «guardar borrador al salir»: suele sobrar", action: "Prioriza CTA y secciones" });
  if (!i.navigationPattern) conflicts.push({ tone: "warn", text: "Falta patrón de navegación", action: "Elige uno arriba" });
  return buildImpact({ preview, starter, agents, deps, conflicts });
}

/* ---- Builder: Estructura ---- */
function structureImpact(bp: Blueprint): ImpactGroupData[] {
  const a = bp.architecture ?? {}, l = bp.libraries ?? {}, ag = bp.agents ?? {};
  const items = l.items ?? [];
  const starter: ImpactItem[] = [], agents: ImpactItem[] = [], deps: ImpactItem[] = [], conflicts: ImpactItem[] = [];

  if (a.pattern) starter.push({ tone: "info", text: `Estructura base: ${ARCH_PATTERNS.find((x) => x.value === a.pattern)?.label ?? a.pattern}` });
  if (a.pattern === "monorepo-lite") {
    starter.push({ tone: "info", text: "Monorepo-lite → /packages/ (ui, config) y salida del starter en modo monorepo" });
    deps.push({ tone: "info", text: "Monorepo-lite cambia la forma del Starter y habilita paquetes compartidos" });
    if (!(a.tree ?? []).some((n) => n.name === "packages")) conflicts.push({ tone: "warn", text: "Monorepo-lite pero el árbol no tiene carpeta packages/", action: "Carga la plantilla «monorepo-lite»" });
  }
  if (a.serverComponentsDefault) { starter.push({ tone: "good", text: "Next.js: RSC por defecto" }); agents.push({ tone: "info", text: "Preferir RSC; marcar Client Components explícitamente" }); deps.push({ tone: "info", text: "RSC por defecto afecta a cómo se implementan formularios y tablas (Datos)" }); }
  agents.push({ tone: a.defaultExport ? "warn" : "good", text: a.defaultExport ? "Default exports permitidos" : "Default exports prohibidos (solo named)" });
  if (a.naming) agents.push({ tone: "info", text: `Naming: ${NAMING.find((x) => x.value === a.naming)?.label ?? a.naming}` });

  const blocked = items.filter((x) => x.status === "blocked"), discouraged = items.filter((x) => x.status === "discouraged"), approved = items.filter((x) => x.status === "approved");
  for (const b of blocked) agents.push({ tone: "bad", text: `Bloqueada: ${b.name}`, action: "Regla en AGENTS.md + warning de lint/CI si aparece" });
  if (discouraged.length) agents.push({ tone: "warn", text: `Desaconsejadas: ${discouraged.map((x) => x.name).join(", ")}` });
  if (approved.length) agents.push({ tone: "good", text: `Aprobadas sin preguntar: ${approved.map((x) => x.name).join(", ")}` });
  if (items.length) deps.push({ tone: "info", text: "El stack aprobado/bloqueado alimenta la Validación de Datos y las reglas de agente" });

  const seen = new Map<string, LibStatus>();
  for (const it of items) { const k = it.name.toLowerCase(); if (seen.has(k) && seen.get(k) !== it.status) conflicts.push({ tone: "bad", text: `«${it.name}» con dos estados distintos`, action: "Deja un único estado" }); seen.set(k, it.status); }

  const treeCount = a.tree?.length ?? 0;
  if (treeCount > 0) starter.push({ tone: "info", text: `Árbol semilla: ${treeCount} nodo(s) raíz que el scaffolder recreará` });
  else if (a.pattern) conflicts.push({ tone: "warn", text: "Arquitectura elegida pero árbol vacío", action: `Carga la plantilla «${a.pattern}»` });

  const rules = (ag.always?.length ?? 0) + (ag.never?.length ?? 0) + (ag.ask?.length ?? 0);
  if (rules) agents.push({ tone: "info", text: `Reglas: ${ag.always?.length ?? 0} siempre · ${ag.never?.length ?? 0} nunca · ${ag.ask?.length ?? 0} preguntar` });
  if (!items.length) conflicts.push({ tone: "warn", text: "Sin librerías: AGENTS.md no podrá acotar el stack", action: "Usa «Añadir rápido» en Librerías" });
  if (!a.pattern) conflicts.push({ tone: "warn", text: "Falta elegir arquitectura", action: "Selecciona un patrón arriba" });
  if (!rules && !(ag.notes && ag.notes.trim())) conflicts.push({ tone: "bad", text: "Sin reglas de agente: AGENTS.md con poco contrato", action: "Usa «Plantillas rápidas»" });

  // Estructura no tiene preview visual
  return buildImpact({ starter, agents, deps, conflicts }, ["Preview"]);
}

/* ---- Builder: Datos ---- */
function dataImpact(bp: Blueprint): ImpactGroupData[] {
  const d = bp.data ?? {};
  const preview: ImpactItem[] = [], starter: ImpactItem[] = [], agents: ImpactItem[] = [], deps: ImpactItem[] = [], conflicts: ImpactItem[] = [];
  if (d.tableLayout) preview.push({ tone: "info", text: `Vista de datos: ${TABLE_LAYOUTS.find((x) => x.value === d.tableLayout)?.label ?? d.tableLayout}` });
  if (d.formPreset) starter.push({ tone: "info", text: `Formulario base: ${FORM_PRESETS.find((x) => x.value === d.formPreset)?.label ?? d.formPreset}` });
  if (d.formPreset === "multi-step") {
    deps.push({ tone: "info", text: "Multi-step → patrón wizard", action: "Activa navegación Wizard + «guardar borrador» en Interacción" });
    if (bp.interaction?.navigationPattern !== "wizard") conflicts.push({ tone: "warn", text: "Multi-step sin navegación Wizard", action: "Interacción → Navegación = Wizard" });
    if (!bp.interaction?.backSaveDraft) conflicts.push({ tone: "warn", text: "Multi-step sin «guardar borrador»", action: "Interacción → Retroceso → guardar borrador" });
  }
  if (d.pagination === "infinite") { agents.push({ tone: "warn", text: "Infinite scroll: documentar fallback accesible" }); conflicts.push({ tone: "warn", text: "Infinite scroll oculta el footer y complica el teclado", action: "Ofrece «cargar más» como alternativa" }); }
  if (d.pagination === "virtualized") starter.push({ tone: "warn", text: "Virtualización → coste alto", action: "Solo con miles de filas" });
  if (d.tableLayout === "dense" && d.filters !== "inline" && d.filters !== "drawer") conflicts.push({ tone: "warn", text: "Tabla densa sin filtros ni búsqueda potente", action: "Añade filtros o búsqueda con filtros" });
  if (d.search === "command-palette") { deps.push({ tone: "info", text: "Command palette (Cmd/Ctrl-K) → interacción global + AGENTS.md", action: "Registrar acciones clave en el palette" }); preview.push({ tone: "info", text: "Atajo de teclado global de búsqueda" }); }
  if (d.confirmations) agents.push({ tone: "good", text: `Confirmaciones: ${CONFIRMATIONS.find((x) => x.value === d.confirmations)?.label ?? d.confirmations}` });
  if (d.bulkActions && !d.confirmations) conflicts.push({ tone: "bad", text: "Acciones masivas sin patrón de confirmación", action: "Elige modal o toast-con-deshacer" });
  const states = [d.emptyCta ? "empty" : null, d.loadingPattern ? "loading" : null, d.errorPattern ? "error" : null, d.successPattern ? "success" : null].filter(Boolean);
  if (states.length) preview.push({ tone: "good", text: `Estados cubiertos: ${states.join(", ")}` });
  if (states.length < 4) conflicts.push({ tone: "warn", text: `Faltan estados (${4 - states.length}/4): vacío, carga, error, éxito`, action: "Complétalos para una UX robusta" });
  if (d.mobileData) preview.push({ tone: "info", text: `Móvil: ${MOBILE_DATA.find((x) => x.value === d.mobileData)?.label ?? d.mobileData}` });
  if (!d.formPreset && !d.tableLayout) conflicts.push({ tone: "warn", text: "Sin formularios ni tablas definidos", action: "Empieza por un preset arriba" });
  return buildImpact({ preview, starter, agents, deps, conflicts });
}

/* ---- Builder: Seguridad ---- */
function securityImpact(bp: Blueprint): ImpactGroupData[] {
  const s = bp.security ?? {};
  const starter: ImpactItem[] = [], agents: ImpactItem[] = [], deps: ImpactItem[] = [], conflicts: ImpactItem[] = [];
  if (s.authMethods?.length) agents.push({ tone: "good", text: `Auth: ${s.authMethods.map((m) => AUTH_METHODS.find((x) => x.value === m)?.label ?? m).join(", ")}` });
  else conflicts.push({ tone: "warn", text: "Sin método de autenticación elegido", action: "Selecciona al menos uno" });
  if (s.sessionType) {
    const lbl = SESSION_TYPES.find((x) => x.value === s.sessionType)?.label ?? s.sessionType;
    starter.push({ tone: "info", text: `Sesión: ${lbl}` });
    if (s.sessionType === "jwt-localstorage") conflicts.push({ tone: "bad", text: "JWT en localStorage: expuesto a XSS", action: "Usa cookie httpOnly" });
  }
  if (s.validationLib && s.validationLib !== "none") { agents.push({ tone: "good", text: `Validación: ${VALIDATION_LIBS.find((x) => x.value === s.validationLib)?.label ?? s.validationLib}` }); deps.push({ tone: "info", text: "La librería de validación se reutiliza en los formularios de Datos" }); }
  else conflicts.push({ tone: "warn", text: "Sin librería de validación", action: "Elige Zod/Valibot/Yup" });
  const checks = SECURITY_CHECKS.filter((c) => (s as Record<string, unknown>)[c.key]);
  if (checks.length) agents.push({ tone: "good", text: `Reglas duras: ${checks.map((c) => c.label).join(", ")}` });
  if (s.csp) starter.push({ tone: "info", text: "CSP estricta → cabeceras en middleware/next.config" });
  if (s.rateLimit) starter.push({ tone: "info", text: "Rate limiting → middleware de API" });
  if (!s.serverSideValidation) conflicts.push({ tone: "warn", text: "Sin validación en servidor: no confíes solo en el cliente", action: "Activa «Validación en servidor»" });
  deps.push({ tone: "info", text: "Las reglas de seguridad viajan a AGENTS.md como límites duros" });
  // Seguridad no tiene preview visual
  return buildImpact({ starter, agents, deps, conflicts }, ["Preview"]);
}

/* ---- Builder: Sugerencias (inspiración externa: apenas aplica) ---- */
function suggestionsImpact(bp: Blueprint): ImpactGroupData[] {
  const ideas = bp.ideas ?? [];
  const agents: ImpactItem[] = ideas.length
    ? [{ tone: "info", text: `${ideas.length} idea(s) guardada(s) — no se aplican solas`, action: "Conviértelas en reglas desde «Aplicar a reglas»" }]
    : [{ tone: "info", text: "Las ideas que guardes aparecerán aquí (nunca se aplican automáticamente)" }];
  // Esta pestaña es inspiración: sin preview/starter/conflictos propios
  return buildImpact({ agents, deps: [] }, ["Preview", "Starter", "Conflictos"]);
}

function impactDot(tone: ImpactTone) {
  return tone === "good" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : tone === "bad" ? "bg-red-400" : "bg-sky-400";
}
function itemCardCls(tone: ImpactTone) {
  return tone === "bad" ? "border-red-400/40 bg-red-400/10"
    : tone === "warn" ? "border-amber-400/30 bg-amber-400/[0.07]"
    : tone === "good" ? "border-emerald-400/25 bg-emerald-400/[0.06]"
    : "border-[var(--color-border)] bg-white/[0.03]";
}
function sevCls(tone: ImpactTone) {
  return tone === "bad" ? "text-red-300 border-red-400/40 bg-red-400/15" : tone === "warn" ? "text-amber-300 border-amber-400/40 bg-amber-400/15" : "text-sky-300 border-sky-400/40 bg-sky-400/15";
}
function ImpactGroup({ title, items, na }: ImpactGroupData) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text)]">{title}</span>
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] text-[var(--color-muted)]">{na ? "—" : items.length}</span>
      </div>
      {na ? (
        <p className="text-[11px] italic text-[var(--color-muted)]/70">No aplica en esta pestaña</p>
      ) : items.length === 0 ? (
        <p className="text-[11px] text-[var(--color-muted)]/70">Sin señales todavía</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className={"rounded-md border px-2 py-1.5 text-xs leading-snug " + itemCardCls(it.tone)}>
              <div className="flex items-start gap-1.5">
                <span className={"mt-1 h-1.5 w-1.5 shrink-0 rounded-full " + impactDot(it.tone)} />
                <span className="min-w-0 flex-1">{it.text}</span>
                {(it.tone === "bad" || it.tone === "warn") && (
                  <span className={"shrink-0 rounded-full border px-1.5 py-px text-[9px] font-bold uppercase " + sevCls(it.tone)}>{SEV_LABEL[it.tone]}</span>
                )}
              </div>
              {it.action && (
                <div className="mt-1 ml-3 flex items-start gap-1 rounded bg-black/20 px-1.5 py-1 text-[11px] text-[var(--color-text)]/80">
                  <span className="text-[var(--color-accent)]">→</span><span>{it.action}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function ImpactPanelView({ groups, hint }: { groups: ImpactGroupData[]; hint: string }) {
  const conflicts = groups.find((g) => g.title === "Conflictos")?.items ?? [];
  const high = conflicts.filter((c) => c.tone === "bad").length;
  const med = conflicts.filter((c) => c.tone === "warn").length;
  return (
    <div className="card-surface rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-panel-2)]/50 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Impacto en tiempo real</h3>
        {(high > 0 || med > 0) && (
          <div className="flex items-center gap-1">
            {high > 0 && <span className="rounded-full border border-red-400/40 bg-red-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-300">{high} alta</span>}
            {med > 0 && <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">{med} media</span>}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-[var(--color-muted)]">{hint}</p>
      <div className="mt-3 space-y-3.5">
        {groups.map((g) => <ImpactGroup key={g.title} title={g.title} items={g.items} na={g.na} />)}
      </div>
    </div>
  );
}

/* -------------------- Vista previa de AGENTS.md (RESUELTA) ----------------- */
// Consume resolvedConfig: el markdown refleja preset + defaults, no el draft crudo.
function AgentsPreview({ bp }: { bp: Blueprint }) {
  const md = useMemo(() => blueprintToMarkdown(resolvedToBlueprint(resolveBlueprint(bp).resolvedConfig)), [bp]);
  return (
    <details className="card-surface rounded-xl p-4">
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
        <span>Vista previa · AGENTS.md <span className="font-normal normal-case text-[var(--color-muted)]">(resuelto)</span></span>
        <span className="text-[10px] font-normal text-[var(--color-muted)]">{md ? `${md.split("\n").length} líneas` : "vacío"}</span>
      </summary>
      {md ? (
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-[var(--color-text)]/90">{md}</pre>
      ) : (
        <p className="mt-3 text-xs text-[var(--color-muted)]">Aún no hay contenido que exportar. Define arquitectura, librerías y reglas.</p>
      )}
    </details>
  );
}

/* ---- Shell transversal + paneles por pestaña ----------------------------- */
const IMPACT_HINT = "Preview · Starter · AGENTS.md · Dependencias · Conflictos, con acción sugerida.";
function ImpactColumn({ groups, bp, extra }: { groups: ImpactGroupData[]; bp: Blueprint; extra?: React.ReactNode }) {
  const { resolvedConfig, validationReport } = useMemo(() => resolveBlueprint(bp), [bp]);
  return (
    <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      <ImpactPanelView hint={IMPACT_HINT} groups={groups} />
      {/* Cobertura DEDUPLICADA: aqui solo senal compacta; el detalle completo y la
          publicacion viven en el drawer de Estado (unica lectura autoritativa). */}
      <CoverageMini report={validationReport} />
      <details className="card-surface rounded-xl p-4">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Preview resuelta (modos)</summary>
        <div className="mt-3"><ResolvedPreview resolved={resolvedConfig} compact /></div>
      </details>
      {extra}
    </div>
  );
}
function TabShell({ left, groups, bp, extra }: { left: React.ReactNode; groups: ImpactGroupData[]; bp: Blueprint; extra?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">{left}</div>
      <ImpactColumn groups={groups} bp={bp} extra={extra} />
    </div>
  );
}

/* ---------------------- Dependencias explícitas ---------------------------- */
function DepAlert({ tone, children, target, actionLabel, onAction }: {
  tone: "info" | "warn"; children: React.ReactNode; target?: string; actionLabel?: string; onAction?: () => void;
}) {
  const cls = tone === "warn" ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]";
  return (
    <div className={"mt-2 flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2 text-xs " + cls}>
      <span className="text-sm leading-none">{tone === "warn" ? "⚠" : "↳"}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {target && <span className="rounded-full border border-current/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide opacity-90">afecta: {target}</span>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="rounded-md bg-[var(--color-accent)] px-2 py-1 text-[11px] font-semibold text-black">{actionLabel}</button>
      )}
    </div>
  );
}

/* ----------------------- Estados: tira central ----------------------------- */
function StateIcon({ kind }: { kind: "empty" | "loading" | "error" | "success" }) {
  const c = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.8, "aria-hidden": true } as const;
  if (kind === "empty") return <svg {...c}><rect x="4" y="5" width="16" height="14" rx="2" strokeDasharray="3 2.5" /><line x1="12" y1="9" x2="12" y2="15" /><line x1="9" y1="12" x2="15" y2="12" /></svg>;
  if (kind === "loading") return <svg {...c}><line x1="5" y1="8" x2="19" y2="8" /><line x1="5" y1="12" x2="16" y2="12" /><line x1="5" y1="16" x2="13" y2="16" /></svg>;
  if (kind === "error") return <svg {...c}><path d="M12 4 22 20H2z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></svg>;
  return <svg {...c}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>;
}
function StateStrip({ empty, loading, error, success }: { empty: boolean; loading: boolean; error: boolean; success: boolean }) {
  const cells: { kind: "empty" | "loading" | "error" | "success"; label: string; on: boolean; color: string }[] = [
    { kind: "empty", label: "Vacío", on: empty, color: "text-sky-300 border-sky-400/50 bg-sky-400/10" },
    { kind: "loading", label: "Carga", on: loading, color: "text-violet-300 border-violet-400/50 bg-violet-400/10" },
    { kind: "error", label: "Error", on: error, color: "text-red-300 border-red-400/50 bg-red-400/10" },
    { kind: "success", label: "Éxito", on: success, color: "text-emerald-300 border-emerald-400/50 bg-emerald-400/10" },
  ];
  const done = cells.filter((c) => c.on).length;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Cobertura de estados</span>
        <span className={"rounded-full border px-1.5 py-0.5 text-[10px] font-bold " + (done === 4 ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300" : "border-amber-400/50 bg-amber-400/15 text-amber-300")}>{done}/4</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div key={c.kind} className={"flex flex-col items-center gap-1 rounded-lg border py-2.5 " + (c.on ? c.color : "border-dashed border-white/15 text-white/30")}>
            <StateIcon kind={c.kind} />
            <span className="text-[11px] font-semibold">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Panel ----------------------------------- */
export default function BrandBehavior({ tab, bp, setField, toggleArray, addIdea, removeIdea, applyToRules }: Props) {
  const i = bp.interaction ?? {};
  const a = bp.architecture ?? {};
  const s = bp.security ?? {};
  const l = bp.libraries ?? {};
  const ag = bp.agents ?? {};
  const d = bp.data ?? {};

  if (tab === "interaccion") {
    const navHint =
      i.navigationPattern === "landing" ? "En Landing, «guardar borrador al salir» suele sobrar; prioriza CTA y secciones."
        : i.navigationPattern === "app-shell" || i.navigationPattern === "dashboard" ? "Encaja con tablas, filtros y sidebar (ver pestaña Datos, próximamente)."
        : i.navigationPattern === "wizard" ? "Wizard: conviene activar «guardar borrador» y una ruta de fallback."
        : "";
    return (
      <TabShell bp={bp} groups={interactionImpact(bp)} left={<>
        <Section title="Navegación" hint="El esqueleto por el que se mueve la app.">
          <CardChoice options={NAV_PATTERNS} value={i.navigationPattern} onPick={(v) => setField("interaction.navigationPattern", v)} />
          {navHint && (
            <DepAlert tone="info" target={i.navigationPattern === "app-shell" || i.navigationPattern === "dashboard" ? "Datos" : undefined}>{navHint}</DepAlert>
          )}
        </Section>
        <Section title="Retroceso" hint="Qué pasa al volver atrás.">
          <div className="space-y-2">
            <Toggle label="Confirmar cambios sin guardar" on={!!i.backConfirmUnsaved} onChange={(v) => setField("interaction.backConfirmUnsaved", v)} />
            <Toggle label="Guardar borrador al salir" on={!!i.backSaveDraft} onChange={(v) => setField("interaction.backSaveDraft", v)} />
            <label className="block text-xs text-[var(--color-muted)]">Ruta de fallback
              <input value={i.backFallbackRoute ?? ""} onChange={(e) => setField("interaction.backFallbackRoute", e.target.value)} placeholder="/dashboard" className={field} />
            </label>
          </div>
        </Section>
        <Section title="Motion" hint="Una decisión, no un ensayo. Elige el carácter de las animaciones.">
          <CardChoice options={MOTION_PRESETS} value={i.motionPreset} onPick={(v) => { setField("interaction.motionPreset", v); if (v === "none") setField("interaction.routeTransitions", false); }} />
          <div className="mt-2">
            <Toggle
              label="Transiciones entre rutas"
              desc={i.motionPreset === "none" ? "Desactivado automáticamente por Motion: Ninguna" : undefined}
              on={i.motionPreset === "none" ? false : !!i.routeTransitions}
              onChange={(v) => { if (i.motionPreset !== "none") setField("interaction.routeTransitions", v); }}
            />
          </div>
        </Section>
        <Section title="Carga">
          <CardChoice options={LOADING_PATTERNS} value={i.loadingPattern} onPick={(v) => setField("interaction.loadingPattern", v)} cols={4} />
        </Section>
        <Section title="Feedback">
          <div className="space-y-2">
            <Toggle label="Toast al completar con éxito" on={!!i.feedbackToastSuccess} onChange={(v) => setField("interaction.feedbackToastSuccess", v)} />
            <Toggle label="Errores inline en los campos" on={!!i.feedbackInlineErrors} onChange={(v) => setField("interaction.feedbackInlineErrors", v)} />
            <Toggle label="Resumen de errores arriba del formulario" on={!!i.feedbackErrorSummaryTop} onChange={(v) => setField("interaction.feedbackErrorSummaryTop", v)} />
          </div>
        </Section>
      </>} />
    );
  }

  if (tab === "estructura") {
    return (
      <TabShell bp={bp} groups={structureImpact(bp)} extra={<AgentsPreview bp={bp} />} left={<>
          <Section title="Arquitectura" level="obligatorio" hint="Define la forma del proyecto; siembra el árbol y ajusta reglas del starter. Elige por el diagrama.">
            <ArchChoice value={a.pattern} onPick={(v) => {
              setField("architecture.pattern", v);
              if (!(a.tree && a.tree.length) && TREE_TEMPLATES[v]) setField("architecture.tree", structuredClone(TREE_TEMPLATES[v]));
            }} />
            <div className="mt-3 space-y-2">
              <Toggle label="Server Components por defecto" desc="Client Components solo donde haga falta interactividad." on={!!a.serverComponentsDefault} onChange={(v) => setField("architecture.serverComponentsDefault", v)} />
              <Toggle label="Permitir default exports" desc="Desactivado = solo named exports (afecta reglas de IA)." on={!!a.defaultExport} onChange={(v) => setField("architecture.defaultExport", v)} />
            </div>
          </Section>

          <Section title="Naming" level="recomendado">
            <CardChoice options={NAMING} value={a.naming} onPick={(v) => setField("architecture.naming", v)} cols={3} />
          </Section>

          <Section title="Árbol de carpetas" level="recomendado" hint="Estructura que un agente debe recrear. Edita nombres, cambia el tipo con el icono, reordena o parte de una plantilla.">
            <TreeEditor tree={a.tree ?? []} pattern={a.pattern} onChange={(t) => setField("architecture.tree", t)} />
          </Section>

          <Section title="Librerías" level="recomendado" hint="Stack aprobado/bloqueado, agrupado por categoría. Toca el nombre para cambiar su estado.">
            <LibManager
              items={l.items ?? []}
              legacy={{ approved: l.approved, forbidden: l.forbidden }}
              onChange={(items) => setField("libraries.items", items)}
            />
          </Section>

          <Section title="Reglas para agentes" level="obligatorio" hint="El contrato con la IA, estructurado. Usa plantillas rápidas o añade reglas una a una.">
            <RuleTemplates bp={bp} setField={setField} />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <RuleList title="Siempre" tone="good" items={ag.always ?? []} onChange={(v) => setField("agents.always", v)} />
              <RuleList title="Nunca" tone="bad" items={ag.never ?? []} onChange={(v) => setField("agents.never", v)} />
              <RuleList title="Preguntar antes" tone="info" items={ag.ask ?? []} onChange={(v) => setField("agents.ask", v)} />
            </div>
          </Section>

          <Section title="Notas adicionales" level="avanzado" hint="Campo secundario. Matices que no encajan como regla.">
            <textarea value={ag.notes ?? ""} onChange={(e) => setField("agents.notes", e.target.value)} rows={3} placeholder="Contexto extra, criterios de aceptación, excepciones…" className={field + " resize-y"} />
          </Section>
      </>} />
    );
  }

  if (tab === "datos") {
    const applyDataPreset = (id: string) => {
      const p = DATA_PRESETS.find((x) => x.id === id);
      if (p) setField("data", { ...p.data, preset: id });
    };
    const multiStep = d.formPreset === "multi-step";
    const denseNoFilters = d.tableLayout === "dense" && d.filters !== "inline" && d.filters !== "drawer";
    const sub = "mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]";
    return (
      <TabShell bp={bp} groups={dataImpact(bp)} left={<>
          <Section title="Presets por tipo de app" hint="Punto de partida; luego ajusta cada bloque.">
            <div className="flex flex-wrap gap-1.5">
              {DATA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyDataPreset(p.id)}
                  title={p.desc}
                  className={"rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " + (d.preset === p.id ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]" : "border-[var(--color-border)] hover:bg-white/5")}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Formularios" level="obligatorio" hint="Cómo se capturan datos.">
            <CardChoice options={FORM_PRESETS} value={d.formPreset} onPick={(v) => setField("data.formPreset", v)} bigWire cols={4} />
            {multiStep && (
              <DepAlert tone="info" target="Interacción" actionLabel="Aplicar" onAction={() => { setField("interaction.navigationPattern", "wizard"); setField("interaction.backSaveDraft", true); }}>
                Multi-step encaja con navegación <b>Wizard</b> + <b>guardar borrador</b>.
              </DepAlert>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className={sub}>Validación</div>
                <CardChoice options={FORM_VALIDATION} value={d.formValidation} onPick={(v) => setField("data.formValidation", v)} cols={2} />
              </div>
              <div>
                <div className={sub}>Confirmación al enviar</div>
                <CardChoice options={FORM_CONFIRM} value={d.formConfirm} onPick={(v) => setField("data.formConfirm", v)} cols={2} />
              </div>
            </div>
          </Section>

          <Section title="Tablas y listas" level="obligatorio" hint="Cómo se muestran conjuntos de datos.">
            <CardChoice options={TABLE_LAYOUTS} value={d.tableLayout} onPick={(v) => setField("data.tableLayout", v)} bigWire cols={4} />
            {denseNoFilters && (
              <DepAlert tone="warn" target="esta pestaña">
                Una <b>tabla densa</b> pide filtros o búsqueda potente para ser usable.
              </DepAlert>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className={sub}>Filtros</div>
                <CardChoice options={FILTER_STYLES} value={d.filters} onPick={(v) => setField("data.filters", v)} cols={2} />
              </div>
              <div>
                <div className={sub}>Paginación</div>
                <CardChoice options={PAGINATION} value={d.pagination} onPick={(v) => setField("data.pagination", v)} cols={2} />
              </div>
            </div>
          </Section>

          <Section title="Búsqueda" level="recomendado" hint="Cómo se encuentra información.">
            <CardChoice options={SEARCH_STYLES} value={d.search} onPick={(v) => setField("data.search", v)} bigWire cols={4} />
            {d.search === "command-palette" && (
              <DepAlert tone="info" target="Interacción · AGENTS.md">
                El <b>command palette</b> (Cmd/Ctrl-K) es un patrón global; registra las acciones clave en él.
              </DepAlert>
            )}
            {d.search && d.search !== "none" && (
              <div className="mt-3">
                <div className={sub}>Momento de los resultados</div>
                <CardChoice options={SEARCH_TRIGGER} value={d.searchTrigger} onPick={(v) => setField("data.searchTrigger", v)} cols={2} />
              </div>
            )}
          </Section>

          <Section title="Estados" level="obligatorio" hint="Vacío, carga, error y éxito: la mitad de una app de datos real.">
            <StateStrip empty={!!d.emptyCta} loading={!!d.loadingPattern} error={!!d.errorPattern} success={!!d.successPattern} />
            <div className="mt-3 space-y-3">
              <Toggle label="Empty state con CTA" desc="Cuando no hay datos, guía a la primera acción." on={!!d.emptyCta} onChange={(v) => setField("data.emptyCta", v)} />
              <div>
                <div className={sub}>Carga</div>
                <CardChoice options={LOADING_PATTERNS} value={d.loadingPattern} onPick={(v) => setField("data.loadingPattern", v)} cols={4} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className={sub}>Error</div>
                  <CardChoice options={ERROR_PATTERNS} value={d.errorPattern} onPick={(v) => setField("data.errorPattern", v)} cols={2} />
                </div>
                <div>
                  <div className={sub}>Éxito</div>
                  <CardChoice options={SUCCESS_PATTERNS} value={d.successPattern} onPick={(v) => setField("data.successPattern", v)} cols={2} />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Operaciones y móvil" level="recomendado" hint="Acciones masivas, confirmaciones y comportamiento en móvil.">
            <div className="space-y-3">
              <Toggle label="Acciones masivas" desc="Seleccionar varias filas y actuar sobre ellas." on={!!d.bulkActions} onChange={(v) => setField("data.bulkActions", v)} />
              {d.bulkActions && !d.confirmations && (
                <DepAlert tone="warn" target="esta pestaña">
                  Acciones masivas <b>sin patrón de confirmación</b>: elige uno abajo.
                </DepAlert>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className={sub}>Confirmaciones destructivas</div>
                  <CardChoice options={CONFIRMATIONS} value={d.confirmations} onPick={(v) => setField("data.confirmations", v)} cols={2} />
                </div>
                <div>
                  <div className={sub}>Datos en móvil</div>
                  <CardChoice options={MOBILE_DATA} value={d.mobileData} onPick={(v) => setField("data.mobileData", v)} cols={2} />
                </div>
              </div>
            </div>
          </Section>
      </>} />
    );
  }

  if (tab === "seguridad") {
    return (
      <TabShell bp={bp} groups={securityImpact(bp)} left={<>
        <Section title="Autenticación" level="obligatorio" hint="Selecciona uno o varios métodos.">
          <CardChoice options={AUTH_METHODS} multi selected={s.authMethods ?? []} onPick={(v) => toggleArray("security.authMethods", v)} />
        </Section>
        <Section title="Sesión" level="obligatorio">
          <CardChoice options={SESSION_TYPES} value={s.sessionType} onPick={(v) => setField("security.sessionType", v)} cols={3} />
        </Section>
        <Section title="Validación" level="recomendado">
          <CardChoice options={VALIDATION_LIBS} value={s.validationLib} onPick={(v) => setField("security.validationLib", v)} cols={4} />
          {s.validationLib && s.validationLib !== "none" && (
            <DepAlert tone="info" target="Datos">La librería de validación se reutiliza en los formularios de Datos.</DepAlert>
          )}
        </Section>
        <Section title="Reglas de seguridad UX" level="recomendado" hint="Checklist que viaja a AGENTS.md como reglas duras.">
          <div className="space-y-2">
            {SECURITY_CHECKS.map((c) => (
              <Toggle key={c.key} label={c.label} desc={c.desc} on={!!(s as Record<string, unknown>)[c.key]} onChange={(v) => setField("security." + c.key, v)} />
            ))}
          </div>
        </Section>
      </>} />
    );
  }

  // tab === "sugerencias"
  return (
    <TabShell bp={bp} groups={suggestionsImpact(bp)} left={
      <Suggestions bp={bp} addIdea={addIdea} removeIdea={removeIdea} applyToRules={applyToRules} />
    } />
  );
}

/* ------------------------------ Sugerencias -------------------------------- */
function confColor(c: string) {
  return c === "alta" ? "text-[var(--color-accent)]" : c === "media" ? "text-[var(--color-muted)]" : "text-white/40";
}
function Suggestions({ bp, addIdea, removeIdea, applyToRules }: { bp: Blueprint; addIdea: Props["addIdea"]; removeIdea: Props["removeIdea"]; applyToRules: Props["applyToRules"] }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/suggestions");
      const j = await r.json();
      setItems(j.suggestions ?? []);
      setStale(!!j.stale);
    } catch {
      setErr("No se pudieron cargar las sugerencias (sin red).");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ideas = bp.ideas ?? [];
  const visible = items.filter((s) => !dismissed.has(s.id));

  return (
    <div className="space-y-4">
      <div className="card-surface rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Sugerencias externas curadas</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Señales de GitHub (releases/tags) y Hacker News. Inspiración para decidir — nunca se aplican solas.
              {stale && <span className="ml-1 text-amber-400/80">· mostrando caché (sin red)</span>}
            </p>
          </div>
          <button onClick={load} disabled={loading} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50">
            {loading ? "Cargando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {ideas.length > 0 && (
        <div className="card-surface rounded-xl p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Ideas guardadas ({ideas.length})</h4>
          <div className="space-y-1.5">
            {ideas.map((idea, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5">
                <span className="min-w-0 truncate text-sm">{idea.title}</span>
                <button onClick={() => removeIdea(idx)} className="shrink-0 text-xs text-[var(--color-muted)] hover:text-red-400">Quitar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {err && <p className="text-sm text-[var(--color-muted)]">{err}</p>}
      {!err && visible.length === 0 && !loading && <p className="text-sm text-[var(--color-muted)]">Sin sugerencias por ahora.</p>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visible.map((s) => (
          <div key={s.id} className="card-surface flex flex-col rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{s.source}</span>
              <span className={"text-[10px] font-semibold uppercase " + confColor(s.confidence)}>confianza {s.confidence}</span>
            </div>
            <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 text-sm font-medium hover:text-[var(--color-accent)]">{s.title}</a>
            <p className="mt-1 flex-1 text-xs leading-snug text-[var(--color-muted)]">{s.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => applyToRules(s.title + " (" + s.source + ")")} className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black">Aplicar a reglas</button>
              <button onClick={() => addIdea({ title: s.title, source: s.source, url: s.url })} className="rounded-lg bg-[var(--color-panel-2)] px-3 py-1.5 text-xs hover:bg-white/10">Guardar idea</button>
              <button onClick={() => setDismissed((prev) => new Set(prev).add(s.id))} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-white">Descartar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
