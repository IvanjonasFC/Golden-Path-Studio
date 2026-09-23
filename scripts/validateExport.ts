#!/usr/bin/env node
/* ============================================================================
   validateExport — SUITE DE REGRESIÓN DEL PACK EXPORTADO (P1).

   No basta con detectar bien: hay que probar que del análisis sale un PACK
   reutilizable y fiel. Este runner ejecuta el MISMO flujo del producto, sin motor
   paralelo:  walkRepo → extractIdentity → seedEditableFromBlueprint →
   resolveBlueprint → buildBrandExport("full")  — exactamente lo que hace el
   endpoint /api/brands/[id]/export — y comprueba el pack contra el ground truth
   de fixtures/expected.json (bloque `export`).

   Regla de oro: el export de una app desktop NO puede parecer el de una web
   multipágina (árbol, projectType y navegación deben reflejar el tipo real).

   Uso:  npm run validate:export -- "C:\\Users\\IvN\\Desktop"   [--json]
   Sale 0 si todo pasa; 1 si algo falla (apto para CI/pre-commit).
   ============================================================================ */
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { collectFiles } from "./walkRepo";
import { extractIdentity } from "../src/lib/importBrand";
import { seedEditableFromBlueprint } from "../src/lib/seedEditor";
import { resolveBlueprint } from "../src/lib/resolve";
import { compileBrand, getResolvedValue, type TokenGroup } from "../src/lib/tokens";
import { buildBrandExport } from "../src/lib/brandExport";
import type { Blueprint, TreeNode } from "../src/lib/blueprint";

/* Replica fiel de brands.ts (sin tocar la BD): tokens visuales para resolver. */
const VISUAL_TOKEN_KEYS = ["color.bg", "color.text", "color.action.primary", "font.body", "font.heading", "radius.button", "radius.card"];
function brandVisualTokens(doc: TokenGroup): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of VISUAL_TOKEN_KEYS) { const v = getResolvedValue(doc, k); if (typeof v === "string" && v.trim()) out[k] = v; }
  return out;
}

interface ExportExpect {
  requiredFiles?: string[];
  treeTopIncludes?: string[];
  treeHasPath?: string[];
  treeExcludes?: string[];
  treeMinNodes?: number;
  projectType?: string;
  navigationPattern?: string;
  viewsMin?: number;
  agentsIncludes?: string[];
  seededOriginCustom?: string[];
  platformClass?: string;
  architecturePattern?: string;
  architectureJson?: Record<string, string>;
  librariesInclude?: string[];
  librariesCategoryOf?: Record<string, string>;
  dataJson?: Record<string, string>;
  blueprintDataTrue?: string[];
  blueprintProvenance?: Record<string, string>;
}
interface ProjectSpec { name: string; path?: string; fixture?: boolean; export?: ExportExpect }
interface Fixture { projects: ProjectSpec[] }
interface Check { ok: boolean; label: string; detail?: string }

/* --- utilidades de árbol -------------------------------------------------- */
function treeTop(tree: TreeNode[]): string[] { return (tree ?? []).map((n) => n.name); }
function treeAllNames(tree: TreeNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: TreeNode[]) => { for (const n of ns) { out.push(n.name); if (n.children) walk(n.children); } };
  walk(tree ?? []);
  return out;
}
function treeCount(tree: TreeNode[]): number { return treeAllNames(tree).length; }
function treeHasPath(tree: TreeNode[], p: string): boolean {
  const segs = p.split("/").filter(Boolean);
  let level: TreeNode[] = tree ?? [];
  for (const seg of segs) {
    const node = level.find((n) => n.name === seg);
    if (!node) return false;
    level = node.children ?? [];
  }
  return true;
}

/* --- flujo REAL del producto (idéntico al endpoint de export) ------------- */
function buildPack(files: { name: string; text: string }[], name: string): Record<string, string> {
  const { tokens } = extractIdentity(files);
  (tokens as unknown as { blueprint?: Blueprint }).blueprint = seedEditableFromBlueprint((tokens as unknown as { blueprint?: Blueprint }).blueprint ?? {}).bp;
  const resolution = resolveBlueprint((tokens as unknown as { blueprint?: Blueprint }).blueprint ?? {}, brandVisualTokens(tokens));
  const compile = compileBrand(tokens);
  const { files: pack } = buildBrandExport(
    { brand: { id: "test", name, slug: name, description: null, tokens, previewIds: [], parts: [] }, compile, resolution, source: { kind: "draft" }, resolvedHash: null },
    "full",
  );
  return pack;
}

function evaluate(pack: Record<string, string>, ex: ExportExpect): Check[] {
  const checks: Check[] = [];
  const parsed = new Map<string, unknown>();
  const getJson = (k: string): unknown => {
    if (parsed.has(k)) return parsed.get(k);
    try { const v = JSON.parse(pack[k]); parsed.set(k, v); return v; } catch { parsed.set(k, undefined); return undefined; }
  };

  for (const f of ex.requiredFiles ?? []) {
    const present = pack[f] !== undefined && pack[f].length > 0;
    checks.push({ ok: present, label: `existe ${f}`, detail: present ? "" : "ausente o vacío" });
    if (present && f.endsWith(".json")) {
      const ok = getJson(f) !== undefined;
      checks.push({ ok, label: `${f} es JSON válido`, detail: ok ? "" : "no parsea" });
    }
  }

  const tree = (getJson("project/tree.json") as TreeNode[]) ?? [];
  const top = treeTop(tree);
  const all = treeAllNames(tree);
  for (const n of ex.treeTopIncludes ?? []) checks.push({ ok: top.includes(n), label: `tree raíz incluye "${n}"`, detail: top.includes(n) ? "" : `raíz: ${top.join(", ") || "vacía"}` });
  for (const p of ex.treeHasPath ?? []) checks.push({ ok: treeHasPath(tree, p), label: `tree contiene ruta "${p}"`, detail: treeHasPath(tree, p) ? "" : "no encontrada" });
  for (const bad of ex.treeExcludes ?? []) checks.push({ ok: !all.includes(bad), label: `tree NO contiene "${bad}"`, detail: all.includes(bad) ? "aparece (fuga de build/deps)" : "" });
  if (ex.treeMinNodes !== undefined) { const c = treeCount(tree); checks.push({ ok: c >= ex.treeMinNodes, label: `tree con ≥${ex.treeMinNodes} nodos (estructura real, no solo rutas)`, detail: `${c} nodos` }); }

  const dtcg = getJson("tokens/tokens.dtcg.json") as { blueprint?: Blueprint & { projectType?: string; seeded?: Record<string, unknown> } } | undefined;
  const bp = dtcg?.blueprint;
  if (ex.projectType !== undefined) { const got = String(bp?.projectType ?? ""); checks.push({ ok: got === ex.projectType, label: `blueprint.projectType = "${ex.projectType}"`, detail: `"${got}"` }); }
  if (ex.navigationPattern !== undefined) { const got = String(bp?.interaction?.navigationPattern ?? ""); checks.push({ ok: got === ex.navigationPattern, label: `navigationPattern = "${ex.navigationPattern}"`, detail: `"${got}"` }); }
  if (ex.viewsMin !== undefined) { const c = bp?.views?.length ?? 0; checks.push({ ok: c >= ex.viewsMin, label: `blueprint.views ≥ ${ex.viewsMin}`, detail: `${c}` }); }
  for (const k of ex.blueprintDataTrue ?? []) {
    const dv = (bp?.data as Record<string, unknown> | undefined)?.[k];
    checks.push({ ok: dv === true, label: `blueprint.data.${k} = true (eje Datos en el pack)`, detail: dv === true ? "" : `=${JSON.stringify(dv ?? null)}` });
  }
  // Trazabilidad que alimenta la UI: la procedencia por campo llega al pack.
  if (ex.blueprintProvenance) {
    const prov = (bp as { provenance?: Record<string, { origin?: string }> } | undefined)?.provenance ?? {};
    for (const [pk, origin] of Object.entries(ex.blueprintProvenance)) {
      const got = prov[pk]?.origin;
      checks.push({ ok: got === origin, label: `provenance["${pk}"] = ${origin} (trazable en UI)`, detail: got === origin ? "" : `=${got ?? "ausente"}` });
    }
  }

  if (ex.architecturePattern !== undefined) {
    const arch = getJson("project/architecture.json") as { pattern?: string } | undefined;
    const got = String(arch?.pattern ?? "");
    checks.push({ ok: got === ex.architecturePattern, label: `architecture.pattern = "${ex.architecturePattern}"`, detail: `"${got}"` });
  }
  if (ex.architectureJson) {
    const arch = (getJson("project/architecture.json") as Record<string, unknown>) ?? {};
    for (const [k, val] of Object.entries(ex.architectureJson)) checks.push({ ok: String(arch[k]) === val, label: `architecture.json.${k} = "${val}"`, detail: `"${String(arch[k] ?? "—")}"` });
  }

  const libs = (getJson("project/libraries.json") as { name: string; category?: string }[]) ?? [];
  const libNames = new Set(libs.map((l) => l.name));
  for (const n of ex.librariesInclude ?? []) checks.push({ ok: libNames.has(n), label: `libraries incluye "${n}"`, detail: libNames.has(n) ? "" : `stack: ${[...libNames].slice(0, 8).join(", ")}` });
  for (const [n, cat] of Object.entries(ex.librariesCategoryOf ?? {})) {
    const lib = libs.find((l) => l.name === n);
    checks.push({ ok: lib?.category === cat, label: `libraries "${n}" categoría "${cat}"`, detail: lib ? `categoría=${lib.category}` : "no está en el stack" });
  }
  if (ex.dataJson) {
    const data = (getJson("project/data.json") as Record<string, unknown>) ?? {};
    for (const [k, val] of Object.entries(ex.dataJson)) checks.push({ ok: String(data[k]) === val, label: `data.json.${k} = "${val}"`, detail: `"${String(data[k] ?? "—")}"` });
  }

  const agents = pack["AGENTS.md"] ?? "";
  for (const s of ex.agentsIncludes ?? []) checks.push({ ok: agents.includes(s), label: `AGENTS.md menciona "${s}"`, detail: agents.includes(s) ? "" : "no aparece" });

  // Trazabilidad: los campos SEMBRADOS deben figurar como origin=custom (no default silencioso).
  const origins = getJson("resolved/resolved.origins.json") as { fields?: { key: string; origin: string }[] } | undefined;
  for (const key of ex.seededOriginCustom ?? []) {
    const field = origins?.fields?.find((f) => f.key === key);
    const ok = field?.origin === "custom";
    checks.push({ ok, label: `origins: "${key}" = custom (sembrado, no default)`, detail: field ? `origin=${field.origin}` : "campo no encontrado" });
  }

  // Regla de oro: coherencia de plataforma — desktop ≠ móvil nativo ≠ web.
  const isNativeDesktop = treeHasPath(tree, "src-tauri") || all.includes("electron");
  const isNativeMobile = all.includes("capacitor.config.ts") || all.includes("android") || all.includes("ios");
  if (ex.platformClass === "native-desktop") {
    const ok = isNativeDesktop && !isNativeMobile && String(bp?.projectType) === "desktop" && String(bp?.interaction?.navigationPattern) === "app-shell";
    checks.push({ ok, label: "regla de oro: pack de app de escritorio nativa (src-tauri/electron, projectType desktop, nav app-shell)", detail: ok ? "" : "no cumple el perfil desktop" });
  } else if (ex.platformClass === "native-mobile") {
    const ok = isNativeMobile && !isNativeDesktop && String(bp?.projectType) === "mobile";
    checks.push({ ok, label: "regla de oro: pack de app móvil nativa (capacitor/android, projectType mobile)", detail: ok ? "" : "no cumple el perfil móvil" });
  } else if (ex.platformClass === "web") {
    const ok = !isNativeDesktop && !isNativeMobile;
    checks.push({ ok, label: "regla de oro: pack web (sin cáscara nativa: ni src-tauri ni capacitor/android)", detail: ok ? "" : "aparece cáscara nativa en un pack web" });
  }

  return checks;
}

async function exists(p: string): Promise<boolean> { try { await fs.stat(p); return true; } catch { return false; } }

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const base = argv.find((a) => !a.startsWith("--")) ?? process.env.CORPUS_DIR ?? process.cwd();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = JSON.parse(await fs.readFile(path.resolve(here, "../fixtures/expected.json"), "utf8")) as Fixture;

  const results: Array<{ name: string; root: string; found: boolean; checks: Check[] }> = [];
  for (const proj of fixture.projects) {
    if (!proj.export) continue;
    let root = proj.fixture
      ? path.resolve(here, "../fixtures/corpus", proj.name)
      : proj.path ? path.resolve(proj.path) : path.resolve(base, proj.name);
    if (!(await exists(root)) && path.basename(path.resolve(base)) === proj.name) root = path.resolve(base);
    if (!(await exists(root))) { results.push({ name: proj.name, root, found: false, checks: [] }); continue; }
    const files = await collectFiles(root);
    let checks: Check[];
    try { checks = evaluate(buildPack(files, proj.name), proj.export); }
    catch (e) { checks = [{ ok: false, label: "el flujo import→seed→export no lanza", detail: String((e as Error).message || e) }]; }
    results.push({ name: proj.name, root, found: true, checks });
  }

  if (asJson) {
    const ok = results.every((r) => r.found && r.checks.every((c) => c.ok));
    console.log(JSON.stringify({ ok, results }, null, 2));
    process.exit(ok ? 0 : 1);
  }

  let failed = 0, missing = 0;
  for (const r of results) {
    if (!r.found) { console.log(`\n■ ${r.name} — NO ENCONTRADO en ${r.root}`); missing++; continue; }
    const bad = r.checks.filter((c) => !c.ok);
    console.log(`\n${bad.length ? "✗" : "✓"} ${r.name}  (${r.checks.length - bad.length}/${r.checks.length})`);
    for (const c of r.checks) console.log(`   ${c.ok ? "✓" : "✗"} ${c.label}${c.ok || !c.detail ? "" : `  →  ${c.detail}`}`);
    failed += bad.length;
  }
  const projFail = results.filter((r) => r.found && r.checks.some((c) => !c.ok)).length;
  console.log(`\n———\nEXPORT · ${results.length} proyectos · ${projFail} con fallos · ${missing} no encontrados · ${failed} asserts fallidos`);
  process.exit(failed === 0 && missing === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
