#!/usr/bin/env node
/* ============================================================================
   validateCorpus — SUITE DE REGRESIÓN del importador contra proyectos reales.

   Recorre cada proyecto del corpus con el MISMO pipeline que la app (walkRepo +
   buildAnalysis: no hay motor paralelo) y comprueba el AnalysisReport contra el
   ground truth de fixtures/expected.json (derivado de los READMEs).

   Uso:
     npm run validate:corpus -- "C:\\Users\\IvN\\Desktop"     # base que contiene los 3
     npm run validate:corpus -- /ruta/base --json            # salida JSON
   Cada proyecto se busca en <base>/<name>. Si <base>/<name> no existe pero
   <base> ya ES uno de los proyectos, se valida solo ese.

   Sale con código 0 si todo pasa; 1 si hay algún fallo (apto para CI/pre-commit).
   ============================================================================ */
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { collectFiles } from "./walkRepo";
import { buildAnalysis, type AnalysisReport } from "../src/lib/analysis";

interface Expect {
  projectType?: string;
  architecturePattern?: string;
  anyViewDynamic?: boolean;
  dataAxisTrue?: string[];
  dataAxisAbsentOrFalse?: string[];
  hasRoutes?: string[];
  viewBlocks?: Record<string, string[]>;
}
interface ProjectSpec { name: string; groundTruthSource?: string; expect: Expect; path?: string; fixture?: boolean }
interface Fixture { version: number; description?: string; projects: ProjectSpec[] }

interface Check { ok: boolean; label: string; detail?: string }

function views(rep: AnalysisReport): Array<{ route: string; dynamic?: boolean; sections?: Array<{ kind: string }> }> {
  const r = rep as unknown as { project?: { views?: unknown[] }; summary?: { views?: unknown[] } };
  return (r.project?.views ?? r.summary?.views ?? []) as Array<{ route: string; dynamic?: boolean; sections?: Array<{ kind: string }> }>;
}
function dataAxis(rep: AnalysisReport): Record<string, unknown> {
  return (rep.blueprint?.data ?? {}) as Record<string, unknown>;
}
function rawType(rep: AnalysisReport): string {
  return String((rep.blueprint as { projectType?: string })?.projectType ?? "");
}

function evaluate(rep: AnalysisReport, ex: Expect): Check[] {
  const checks: Check[] = [];
  const vs = views(rep);
  const data = dataAxis(rep);

  if (ex.projectType !== undefined) {
    const got = rawType(rep);
    checks.push({ ok: got === ex.projectType, label: `projectType = "${ex.projectType}"`, detail: `detectado "${got}"` });
  }
  if (ex.architecturePattern !== undefined) {
    const got = String((rep.blueprint as { architecture?: { pattern?: string } })?.architecture?.pattern ?? "");
    checks.push({ ok: got === ex.architecturePattern, label: `architecture.pattern = "${ex.architecturePattern}"`, detail: `detectado "${got}"` });
  }
  if (ex.anyViewDynamic !== undefined) {
    const got = vs.some((v) => !!v.dynamic);
    checks.push({ ok: got === ex.anyViewDynamic, label: `anyViewDynamic = ${ex.anyViewDynamic}`, detail: `detectado ${got}` });
  }
  for (const k of ex.dataAxisTrue ?? []) {
    checks.push({ ok: data[k] === true, label: `data.${k} = true`, detail: `detectado ${JSON.stringify(data[k] ?? null)}` });
  }
  for (const k of ex.dataAxisAbsentOrFalse ?? []) {
    const v = data[k];
    checks.push({ ok: v === undefined || v === false, label: `data.${k} ausente/false`, detail: `detectado ${JSON.stringify(v ?? null)}` });
  }
  for (const route of ex.hasRoutes ?? []) {
    const got = vs.some((v) => v.route === route);
    checks.push({ ok: got, label: `ruta "${route}" presente`, detail: got ? "" : `rutas: ${vs.map((v) => v.route).join(", ") || "ninguna"}` });
  }
  for (const [route, blocks] of Object.entries(ex.viewBlocks ?? {})) {
    const v = vs.find((x) => x.route === route);
    const kinds = new Set((v?.sections ?? []).map((s) => s.kind));
    for (const b of blocks) {
      checks.push({ ok: kinds.has(b), label: `vista "${route}" contiene bloque "${b}"`, detail: v ? `bloques: ${[...kinds].join(", ") || "ninguno"}` : `sin vista "${route}"` });
    }
  }
  return checks;
}

async function exists(p: string): Promise<boolean> { try { await fs.stat(p); return true; } catch { return false; } }

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const base = argv.find((a) => !a.startsWith("--")) ?? process.env.CORPUS_DIR ?? process.cwd();

  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixturePath = path.resolve(here, "../fixtures/expected.json");
  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8")) as Fixture;

  const results: Array<{ name: string; root: string; found: boolean; checks: Check[] }> = [];
  for (const proj of fixture.projects) {
    // Resolución de carpeta: fixture in-repo, override proj.path, <base>/<name>, o <base>.
    let root = proj.fixture
      ? path.resolve(here, "../fixtures/corpus", proj.name)
      : proj.path ? path.resolve(proj.path) : path.resolve(base, proj.name);
    if (!(await exists(root)) && path.basename(path.resolve(base)) === proj.name) root = path.resolve(base);
    if (!(await exists(root))) { results.push({ name: proj.name, root, found: false, checks: [] }); continue; }
    const files = await collectFiles(root);
    const rep = buildAnalysis(files, { root, tool: "scan-repo" });
    results.push({ name: proj.name, root, found: true, checks: evaluate(rep, proj.expect) });
  }

  if (asJson) {
    const ok = results.every((r) => r.found && r.checks.every((c) => c.ok));
    console.log(JSON.stringify({ ok, results }, null, 2));
    process.exit(ok ? 0 : 1);
  }

  let failed = 0, missing = 0;
  for (const r of results) {
    if (!r.found) { console.log(`\n■ ${r.name}  —  NO ENCONTRADO en ${r.root}`); missing++; continue; }
    const bad = r.checks.filter((c) => !c.ok);
    const mark = bad.length ? "✗" : "✓";
    console.log(`\n${mark} ${r.name}  (${r.checks.length - bad.length}/${r.checks.length})  ${r.root}`);
    for (const c of r.checks) console.log(`   ${c.ok ? "✓" : "✗"} ${c.label}${c.ok ? "" : `  →  ${c.detail}`}`);
    failed += bad.length;
  }
  const projFail = results.filter((r) => r.found && r.checks.some((c) => !c.ok)).length;
  console.log(`\n———\n${results.length} proyectos · ${projFail} con fallos · ${missing} no encontrados · ${failed} asserts fallidos`);
  process.exit(failed === 0 && missing === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
