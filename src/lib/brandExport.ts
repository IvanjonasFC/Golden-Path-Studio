/* ============================================================================
   Exportacion BLINDADA de una marca: no solo tokens, sino un CONTRATO completo
   (estilo + blueprint resuelto + escenas/slots + componentes + contrato tecnico
   + documentacion humana/IA + trazabilidad), organizado por carpetas.

   Modos:
   - theme -> solo tokens/ (estilo trasladable a targets).
   - docs  -> documentacion legible (README/BRAND/BLUEPRINT/DECISIONS/AUDIT/AGENTS).
   - full  -> todo: tokens/ + resolved/ + project/ + starter/ + docs (pack IA/build).

   Fuente de verdad: resolved/ (recalculado en servidor). tokens/ es derivado.
   El orden de lectura recomendado para una IA se indica en README.md.
   ============================================================================ */
import type { TokenGroup } from "./tokens";
import type { Blueprint, LibItem } from "./blueprint";
import { blueprintToMarkdown } from "./blueprint";
import {
  SCENE_SLOTS, SCENE_LABEL, slotStateOf, componentUsage, sceneSlotStats,
  type SceneId,
} from "./scenes";
import {
  DOMAINS, resolvedToBlueprint,
  type Resolution, type ResolvedConfig, type ValidationReport,
} from "./resolve";
import { getComponent } from "./query";
import { PROJECT_TEMPLATES } from "./templates";

export type ExportMode = "theme" | "docs" | "full";

export interface CompileLike {
  css: string; tailwind: string; js: string; androidColors: string; androidDimens: string;
  swiftUI?: string; jetpackCompose?: string;
}
export interface ExportBrand {
  id: string; name: string; slug: string; description: string | null;
  tokens: TokenGroup; previewIds: string[];
  parts: { id: string; name: string; kind: string; code: string }[];
}
export interface ExportSource {
  kind: "draft" | "version"; version?: string; versionId?: string | null; createdAt?: number;
}
export interface BrandExportInputs {
  brand: ExportBrand;
  compile: CompileLike;
  resolution: Resolution;
  source: ExportSource;
  resolvedHash: string | null;
}
type In = BrandExportInputs;

const J = (v: unknown) => JSON.stringify(v, null, 2);

function bpOf(tokens: TokenGroup): Blueprint {
  const bp = (tokens as unknown as { blueprint?: Blueprint }).blueprint;
  return bp && typeof bp === "object" ? bp : {};
}
function slotsMapOf(tokens: TokenGroup): Partial<Record<SceneId, Record<string, string>>> {
  return (bpOf(tokens) as { slots?: Partial<Record<SceneId, Record<string, string>>> }).slots ?? {};
}
function whenStr(ts?: number): string {
  try { return ts ? new Date(ts).toISOString() : new Date().toISOString(); } catch { return String(ts); }
}
function arr(x: unknown): string { return Array.isArray(x) ? ((x as unknown[]).join(", ") || "—") : String(x ?? "—"); }
function yn(x: unknown): string { return x ? "sí" : "no"; }
function pct(n: number): number { return Math.round(n * 100); }

/* Slots que la config actual OCULTA (misma logica que el editor). */
function hiddenSlots(scene: SceneId, r: ResolvedConfig): Set<string> {
  const d = r.data, sec = r.security;
  const has = (x: unknown) => x !== undefined && x !== null && x !== "" && x !== false;
  const auth = Array.isArray(sec.authMethods) ? (sec.authMethods as string[]) : [];
  const hasOAuth = auth.some((a) => /oauth|google|github|sso/i.test(a));
  const hasMagic = auth.some((a) => /magic|passwordless|link|otp/i.test(a));
  const hasPassword = auth.some((a) => /password|email/i.test(a)) || (!hasOAuth && !hasMagic && auth.length > 0);
  const out = new Set<string>();
  if (scene === "dashboard" && !(has(d.filters) && d.filters !== "none")) out.add("filters");
  if (scene === "auth") { if (!hasPassword) out.add("form"); if (!(hasOAuth || hasMagic)) out.add("oauth"); }
  return out;
}

/* ------------------------------- JSON layers ------------------------------- */
function scenesJson() {
  return (Object.keys(SCENE_SLOTS) as SceneId[]).map((scene) => ({
    scene, label: SCENE_LABEL[scene],
    slots: (SCENE_SLOTS[scene] ?? []).map((s) => ({
      id: s.id, label: s.label, expects: s.expects,
      render: s.render ?? (s.match.length === 0 ? "structural" : "persistent"),
      compatibleCategories: s.match, defaultQuery: s.query,
    })),
  }));
}

function slotsJson(brand: ExportBrand, resolved: ResolvedConfig) {
  const allSlots = slotsMapOf(brand.tokens);
  const samples = brand.previewIds.map((id) => ({ id, category: getComponent(id)?.category }));
  return (Object.keys(SCENE_SLOTS) as SceneId[]).map((scene) => {
    const map = allSlots[scene] ?? {};
    const defs = SCENE_SLOTS[scene] ?? [];
    const known = new Set(defs.map((d) => d.id));
    const hidden = hiddenSlots(scene, resolved);
    const slots = defs.map((slot) => {
      const assignedId = map[slot.id];
      let state = slotStateOf(slot, assignedId, samples) as string;
      if ((state === "assigned" || state === "auto") && hidden.has(slot.id)) state = "hidden";
      return {
        id: slot.id, label: slot.label, state,
        assignedComponentId: assignedId ?? null,
        render: slot.render ?? (slot.match.length === 0 ? "structural" : "persistent"),
        compatibleCategories: slot.match,
      };
    });
    const orphans = Object.entries(map)
      .filter(([sid]) => !known.has(sid))
      .map(([sid, cid]) => ({ slotId: sid, componentId: cid }));
    return { scene, label: SCENE_LABEL[scene], stats: sceneSlotStats(scene, map, samples), slots, orphans };
  });
}

function componentsManifest(brand: ExportBrand) {
  const allSlots = slotsMapOf(brand.tokens);
  const components = brand.previewIds.map((id) => {
    const c = getComponent(id);
    if (!c) return { id, missing: true };
    return {
      id: c.id, name: c.name, category: c.category, framework: c.framework,
      source: c.source, license: c.license, tags: c.tags, dependencies: c.dependencies,
      usage: componentUsage(c.id, allSlots).map((u) => ({ scene: u.scene, slot: u.slotId, slotLabel: u.slotLabel })),
    };
  });
  const libs = (bpOf(brand.tokens).libraries?.items ?? []) as LibItem[];
  const librariesPolicy = {
    approved: libs.filter((l) => l.status === "approved").map((l) => l.name),
    discouraged: libs.filter((l) => l.status === "discouraged").map((l) => l.name),
    blocked: libs.filter((l) => l.status === "blocked").map((l) => l.name),
  };
  return { count: components.length, components, librariesPolicy };
}

function originsJson(v: ValidationReport, rc: ResolvedConfig) {
  return {
    coverage: v.coverage, canPublish: v.canPublish,
    fields: DOMAINS.flatMap((d) => v.domains[d].fields.map((f) => ({
      domain: d, key: f.key, label: f.label, class: f.cls, origin: f.origin,
    }))),
    meta: {
      custom: rc.meta.customFields, template: rc.meta.templateFields,
      preset: rc.meta.inheritedFields, default: rc.meta.defaultedFields,
    },
    blockingIssues: v.blockingIssues, warnings: v.warnings,
  };
}

/* --------------------------------- docs ------------------------------------ */
function readme(inp: In): string {
  const { brand } = inp;
  const rc = inp.resolution.resolvedConfig;
  const v = inp.resolution.validationReport;
  const bp = bpOf(brand.tokens);
  const src = inp.source.kind === "version" ? "snapshot publicado v" + inp.source.version : "draft actual (sin publicar)";
  return [
    "# " + brand.name + " — Foundation export",
    "",
    brand.description ?? "Contrato de marca exportado desde Component Vault.",
    "",
    "- Fuente: " + src,
    "- Plantilla base: " + (bp.templateId ?? "—"),
    "- Preset visual: " + (rc.meta.preset ?? "—"),
    "- Cobertura: " + pct(v.coverage) + "% · " + (v.canPublish ? "publicable" : v.blockingIssues.length + " bloqueo(s)"),
    "- Generado: " + whenStr(),
    "",
    "## Qué es esto",
    "Un paquete de contrato completo (estilo + blueprint + reglas + componentes + estructura + trazabilidad) para reconstruir, extender o auditar esta marca sin adivinar nada. La FUENTE DE VERDAD es la carpeta resolved/; tokens/ es derivado.",
    "",
    "## Qué leer primero (orden recomendado para una IA)",
    "1. AGENTS.md — reglas que NO se pueden romper.",
    "2. BRAND.md — identidad visual y principios.",
    "3. BLUEPRINT.md — cómo se comporta el producto (nav, datos, auth, estados, escenas).",
    "4. resolved/resolved.config.json — estado final resuelto.",
    "5. resolved/scenes.json + resolved/slots.json — composición de UI por escena.",
    "6. resolved/components.manifest.json — componentes de la marca y su uso.",
    "7. project/* — arquitectura, árbol, librerías, seguridad, datos, interacción.",
    "8. DECISIONS.md / EXPORT_AUDIT.md — orígenes, warnings y trazabilidad.",
    "",
    "## Cómo aplicarlo",
    "- Estilo: tokens/theme.css (CSS vars) o tokens/tailwind.theme.css (@theme). Android en tokens/android/.",
    "- Estructura: usa project/tree.json como esqueleto y project/libraries.json como set permitido.",
    "- UI: compón cada pantalla según resolved/scenes.json + resolved/slots.json (respeta compatibilidades y tipo de render).",
    "- Reglas: respeta AGENTS.md y project/agent-rules.json.",
    "",
  ].join("\n");
}

function brandMd(inp: In): string {
  const rc = inp.resolution.resolvedConfig;
  const v = rc.visual;
  const fx = (inp.brand.tokens as { effects?: unknown }).effects ?? {};
  const row = (k: string, val: unknown) => "| " + k + " | " + (val ?? "—") + " |";
  return [
    "# BRAND — " + inp.brand.name,
    "",
    "Identidad visual resuelta de la marca.",
    "",
    "## Colores y tipografía",
    "| Token | Valor |",
    "|---|---|",
    row("Fondo", v.colorBg),
    row("Texto", v.colorText),
    row("Acción primaria", v.colorPrimary),
    row("Tipografía principal", v.fontBody),
    row("Tipografía secundaria", v.fontHeading),
    row("Radio botón", v.radiusButton),
    row("Radio tarjeta", v.radiusCard),
    row("Densidad", v.density),
    "",
    "## Efectos (fondo/atmósfera)",
    JSON.stringify(fx),
    "",
    "## Principio",
    "Todo componente debe consumir estos tokens (nunca colores hardcodeados). Los radios y la densidad definen el tacto; los efectos, la atmósfera del fondo.",
    "",
  ].join("\n");
}

function blueprintMd(inp: In): string {
  const rc = inp.resolution.resolvedConfig;
  const it = rc.interaction, d = rc.data, sec = rc.security;
  const scenes = slotsJson(inp.brand, rc)
    .map((s) => "- " + s.label + " — " + s.stats.assigned + " fijado(s), " + s.stats.auto + " auto, " + s.stats.empty + " vacío(s)")
    .join("\n");
  return [
    "# BLUEPRINT — " + inp.brand.name,
    "",
    "Cómo debe COMPORTARSE el producto.",
    "",
    "## Navegación e interacción",
    "- Navegación: " + arr(it.navigationPattern),
    "- Motion: " + arr(it.motionPreset) + " · Carga: " + arr(it.loadingPattern) + " · Transiciones de ruta: " + yn(it.routeTransitions),
    "- Feedback: toast éxito " + yn(it.feedbackToastSuccess) + " · errores inline " + yn(it.feedbackInlineErrors),
    "",
    "## Datos y estados",
    "- Formulario: validación " + arr(d.formValidation) + " · preset " + arr(d.formPreset),
    "- Tablas/listas: " + arr(d.tableLayout) + " · filtros " + arr(d.filters) + " · paginación " + arr(d.pagination) + " · búsqueda " + arr(d.search),
    "- Estados: empty+CTA " + yn(d.emptyCta) + " · loading " + arr(d.loadingPattern) + " · error " + arr(d.errorPattern) + " · success " + arr(d.successPattern),
    "",
    "## Seguridad",
    "- Auth: " + arr(sec.authMethods) + " · sesión " + arr(sec.sessionType),
    "- Validación servidor " + yn(sec.serverSideValidation) + " · CSP " + yn(sec.csp) + " · rate limit " + yn(sec.rateLimit) + " · secretos solo servidor " + yn(sec.secretsServerOnly),
    "",
    "## Escenas (composición de UI)",
    scenes,
    "",
    "Detalle máquina en resolved/scenes.json y resolved/slots.json.",
    "",
  ].join("\n");
}

function decisionsMd(inp: In): string {
  const rc = inp.resolution.resolvedConfig;
  const v = inp.resolution.validationReport;
  const bp = bpOf(inp.brand.tokens);
  const list = (a: string[]) => (a.length ? a.map((f) => "- " + f).join("\n") : "- —");
  return [
    "# DECISIONS — " + inp.brand.name,
    "",
    "Qué decisiones se tomaron y de dónde vienen.",
    "",
    "- Plantilla base: " + (bp.templateId ?? "— (ninguna; todo custom/preset)"),
    "- Preset visual: " + (rc.meta.preset ?? "—"),
    "",
    "## Origen de los campos",
    "### Custom (decisión propia del usuario)",
    list(rc.meta.customFields),
    "",
    "### De plantilla (golden path)",
    list(rc.meta.templateFields),
    "",
    "### Heredado de preset",
    list(rc.meta.inheritedFields),
    "",
    "### Resuelto por default (revisar si conviene fijar)",
    list(rc.meta.defaultedFields),
    "",
    "## Pendiente",
    "- Bloqueos (required faltantes): " + (v.blockingIssues.length ? "\n" + v.blockingIssues.map((b) => "  - " + b).join("\n") : "ninguno"),
    "- Warnings: " + (v.warnings.length ? "\n" + v.warnings.slice(0, 20).map((w) => "  - " + w).join("\n") : "ninguno"),
    "",
    "> Nota: los overrides de Guided no se almacenan por separado; aparecen aquí como campos custom.",
    "",
  ].join("\n");
}

function auditMd(inp: In): string {
  const v = inp.resolution.validationReport;
  const s = inp.source;
  const fuente = s.kind === "version"
    ? "snapshot v" + s.version + " (" + (s.versionId ?? "?") + "), publicado " + whenStr(s.createdAt)
    : "draft actual (sin publicar)";
  return [
    "# EXPORT_AUDIT — " + inp.brand.name,
    "",
    "- Generado: " + whenStr(),
    "- Fuente: " + fuente,
    "- Hash resolvedConfig: " + (inp.resolvedHash ?? "—"),
    "- Cobertura: " + pct(v.coverage) + "%",
    "- Estado publicación: " + (v.canPublish ? "publicable" : "bloqueado (" + v.blockingIssues.length + ")"),
    "- Bloqueos: " + v.blockingIssues.length,
    "- Warnings: " + v.warnings.length,
    "",
    "## Integridad",
    "La fuente de verdad es resolved/resolved.config.json. tokens/ y project/ derivan de ella. Si exportas desde draft (no snapshot), este paquete puede cambiar en la próxima edición: para trazabilidad estable, exporta desde una versión publicada.",
    "",
  ].join("\n");
}

function agentsMd(inp: In): string {
  const rc = inp.resolution.resolvedConfig;
  const body = blueprintToMarkdown(resolvedToBlueprint(rc));
  return [
    "# AGENTS — " + inp.brand.name,
    "",
    "Instrucciones para una IA que construya o extienda este proyecto.",
    "",
    "## Reglas duras",
    "- Usa SIEMPRE los design tokens de la marca (carpeta tokens/); nunca colores/valores hardcodeados.",
    "- Usa solo librerías approved de resolved/components.manifest.json; nunca las blocked.",
    "- Respeta la arquitectura y el árbol de project/.",
    "- Compón la UI según resolved/scenes.json + resolved/slots.json (respeta compatibilidades y tipo de render).",
    "- Pregunta antes de tocar auth, pagos, migraciones o seguridad.",
    "",
    body,
    "",
  ].join("\n");
}

/* ------------------------------ auditoría ---------------------------------- */
export interface ExportOmission { path: string; reason: string; }
export interface ExportAudit {
  mode: ExportMode;
  sourceKind: "draft" | "version";
  sourceVersion: string | null;
  resolvedHash: string | null;
  coverage: number;                 // 0..1
  canPublish: boolean;
  filesGenerated: string[];
  filesOmitted: ExportOmission[];
  warnings: string[];
  blocking: string[];
  missingComponents: number;
  partial: boolean;                 // true = incompleto (bloqueos/faltantes)
  generatedAt: number;
}

/** Componentes referenciados por la marca que no están en el catálogo. */
function missingComponentIds(brand: ExportBrand): string[] {
  return brand.previewIds.filter((id) => !getComponent(id));
}

/** Calcula la auditoría del pack: qué salió, qué se omitió y por qué. */
function computeExportAudit(inp: In, mode: ExportMode, generatedKeys: string[]): ExportAudit {
  const v = inp.resolution.validationReport;
  const wantTokens = mode === "theme" || mode === "full";
  const wantFull = mode === "full";
  const wantDocs = mode === "docs" || mode === "full";

  const omitted: ExportOmission[] = [];
  if (!wantTokens) omitted.push({ path: "tokens/", reason: `modo=${mode}: no incluye tokens de estilo` });
  if (!wantFull) {
    omitted.push({ path: "resolved/", reason: "solo en modo full (config resuelta, escenas, slots, componentes)" });
    omitted.push({ path: "project/", reason: "solo en modo full (arquitectura, árbol, librerías, seguridad, datos)" });
    omitted.push({ path: "starter/", reason: "solo en modo full (metadatos de plantilla/preset)" });
    omitted.push({ path: "parts/", reason: "solo en modo full (bloques HTML de la marca)" });
  }
  if (!wantDocs) omitted.push({ path: "*.md", reason: `modo=${mode}: no incluye documentación humana/IA` });

  const missing = missingComponentIds(inp.brand);
  const warnings: string[] = [...v.warnings];
  if (missing.length) warnings.push(`${missing.length} componente(s) referenciados no están en el catálogo (se marcan como missing): ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}.`);
  if (inp.source.kind === "draft") warnings.push("Exportado desde draft (no snapshot publicado): el pack puede cambiar en la próxima edición. Para trazabilidad estable, publica una versión.");

  const partial = v.blockingIssues.length > 0 || missing.length > 0;

  return {
    mode,
    sourceKind: inp.source.kind,
    sourceVersion: inp.source.kind === "version" ? (inp.source.version ?? null) : null,
    resolvedHash: inp.resolvedHash,
    coverage: v.coverage,
    canPublish: v.canPublish,
    filesGenerated: generatedKeys,
    filesOmitted: omitted,
    warnings,
    blocking: v.blockingIssues,
    missingComponents: missing.length,
    partial,
    generatedAt: Date.now(),
  };
}

/** EXPORT_AUDIT.md reforzado con archivos generados/omitidos, warnings y estado. */
function auditMdRich(inp: In, a: ExportAudit): string {
  const s = inp.source;
  const fuente = s.kind === "version"
    ? "snapshot v" + s.version + " (" + (s.versionId ?? "?") + "), publicado " + whenStr(s.createdAt)
    : "draft actual (sin publicar)";
  const list = (xs: string[]) => (xs.length ? xs.map((x) => "- " + x).join("\n") : "- —");
  return [
    "# EXPORT_AUDIT — " + inp.brand.name,
    "",
    "- Generado: " + whenStr(a.generatedAt),
    "- Modo: " + a.mode,
    "- Fuente: " + fuente,
    "- Hash resolvedConfig: " + (a.resolvedHash ?? "—"),
    "- Cobertura: " + pct(a.coverage) + "%",
    "- Estado: " + (a.partial ? "PARCIAL" : "COMPLETO") + (a.canPublish ? " · publicable" : " · bloqueado (" + a.blocking.length + ")"),
    "",
    "## Archivos generados (" + a.filesGenerated.length + ")",
    list(a.filesGenerated),
    "",
    "## No generado (por modo)",
    a.filesOmitted.length ? a.filesOmitted.map((o) => "- " + o.path + " — " + o.reason).join("\n") : "- (nada; el pack incluye todas las capas)",
    "",
    "## Bloqueos (required faltantes)",
    list(a.blocking),
    "",
    "## Warnings",
    list(a.warnings),
    "",
    "## Integridad",
    "La fuente de verdad es resolved/resolved.config.json (solo en modo full). tokens/ y project/ derivan de ella. Si exportas desde draft, este pack puede cambiar en la próxima edición: para trazabilidad estable, exporta desde una versión publicada. La versión máquina de esta auditoría está en EXPORT_LOG.json.",
    "",
  ].join("\n");
}

/* ------------------------------ ensamblador -------------------------------- */
/** Ensambla el pack Y su auditoría: añade EXPORT_LOG.json (máquina) y refuerza
 *  EXPORT_AUDIT.md (humano). Úsalo desde el endpoint para registrar auditoría. */
export function buildBrandExport(inp: In, mode: ExportMode): { files: Record<string, string>; audit: ExportAudit } {
  const files = buildBrandExportFiles(inp, mode);
  const audit = computeExportAudit(inp, mode, Object.keys(files));
  files["EXPORT_LOG.json"] = J(audit);
  if (files["EXPORT_AUDIT.md"] !== undefined) files["EXPORT_AUDIT.md"] = auditMdRich(inp, audit);
  audit.filesGenerated = Object.keys(files);   // incluye EXPORT_LOG.json
  return { files, audit };
}

export function buildBrandExportFiles(inp: In, mode: ExportMode): Record<string, string> {
  const files: Record<string, string> = {};
  const rc = inp.resolution.resolvedConfig;
  const v = inp.resolution.validationReport;
  const bp = bpOf(inp.brand.tokens);
  const wantTokens = mode === "theme" || mode === "full";
  const wantFull = mode === "full";
  const wantDocs = mode === "docs" || mode === "full";

  if (wantTokens) {
    files["tokens/tokens.dtcg.json"] = J(inp.brand.tokens);
    files["tokens/theme.css"] = inp.compile.css;
    files["tokens/tailwind.theme.css"] = inp.compile.tailwind;
    files["tokens/tokens.js"] = inp.compile.js;
    files["tokens/android/colors.xml"] = inp.compile.androidColors;
    files["tokens/android/dimens.xml"] = inp.compile.androidDimens;
    if (inp.compile.swiftUI) {
      files["tokens/ios/BrandDesignSystem.swift"] = inp.compile.swiftUI;
    }
    if (inp.compile.jetpackCompose) {
      files["tokens/android/compose/BrandTokens.kt"] = inp.compile.jetpackCompose;
    }
  }

  if (wantFull) {
    files["resolved/resolved.config.json"] = J(rc);
    files["resolved/resolved.origins.json"] = J(originsJson(v, rc));
    files["resolved/scenes.json"] = J(scenesJson());
    files["resolved/slots.json"] = J(slotsJson(inp.brand, rc));
    files["resolved/components.manifest.json"] = J(componentsManifest(inp.brand));

    const st = rc.structure;
    files["project/architecture.json"] = J({
      pattern: st.pattern, naming: st.naming,
      serverComponentsDefault: st.serverComponentsDefault, defaultExport: st.defaultExport,
    });
    files["project/tree.json"] = J(st.tree ?? []);
    files["project/libraries.json"] = J(st.libraries ?? []);
    files["project/agent-rules.json"] = J(st.agents ?? {});
    files["project/security.json"] = J(rc.security);
    files["project/data.json"] = J(rc.data);
    files["project/interaction.json"] = J(rc.interaction);

    const tpl = PROJECT_TEMPLATES.find((t) => t.id === bp.templateId);
    files["starter/starter.meta.json"] = J({
      templateId: bp.templateId ?? null, preset: rc.meta.preset ?? null,
      defaultScene: tpl?.defaultScene ?? null, stack: tpl?.stack ?? [],
    });
    files["starter/template.meta.json"] = J(tpl
      ? { id: tpl.id, name: tpl.name, tagline: tpl.tagline, rigor: tpl.rigor, stack: tpl.stack }
      : null);
    files["starter/guided.overrides.json"] = J({
      persisted: false,
      note: "Los overrides de Guided no se almacenan por separado; el estado final está en resolved/ y los campos cambiados por el usuario en resolved.origins.json (origin=custom).",
    });

    for (const p of inp.brand.parts) {
      const safe = (p.name || p.kind || "parte").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "parte";
      files["parts/" + safe + ".html"] = p.code;
    }
  }

  if (wantDocs) {
    files["README.md"] = readme(inp);
    files["AGENTS.md"] = agentsMd(inp);
    files["BRAND.md"] = brandMd(inp);
    files["BLUEPRINT.md"] = blueprintMd(inp);
    files["DECISIONS.md"] = decisionsMd(inp);
    files["EXPORT_AUDIT.md"] = auditMd(inp);
  }

  return files;
}
