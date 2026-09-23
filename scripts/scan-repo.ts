#!/usr/bin/env node
/* ============================================================================
   scan-repo — CLI local determinista que recorre un proyecto y produce un
   analysis.json (contrato en src/lib/analysis.ts). Capa LOCAL del pipeline:
   lee el repo entero (rutas, estilos, deps, componentes) SIN ejecutarlo ni
   subir nada al navegador. El salto a runtime (Playwright/capturas) irá luego
   escribiendo en el MISMO contrato.

   Uso:
     npx tsx scripts/scan-repo.ts <ruta-al-proyecto> [salida.json] [flags]

   Flags opcionales (capa runtime / Playwright, honesta):
     --runtime            intenta navegar el proyecto en marcha y capturar
     --base=<url>         baseURL manual (si no, autodetecta dev server local)
   ============================================================================ */
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildAnalysis, attachRuntime, attachTrace, emptyRuntime } from "../src/lib/analysis";
import { collectFiles, deriveRoutes } from "./walkRepo";
import { runRuntime, detectBaseURL } from "./runtime";
import { writeImportLog } from "./importLog";
import { Tracer } from "../src/lib/trace";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const flags = argv.filter((a) => a.startsWith("--"));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const root = path.resolve(positional[0] || ".");
  const outArg = positional[1];
  const wantRuntime = flags.includes("--runtime");
  const baseFlag = flags.find((f) => f.startsWith("--base="))?.slice("--base=".length) || null;

  try {
    const st = await fs.stat(root);
    if (!st.isDirectory()) throw new Error("no es un directorio");
  } catch {
    console.error(`✗ Ruta inválida: ${root}`);
    process.exit(1);
  }

  const tracer = new Tracer({ echo: true, prefix: "scan-repo" });
  tracer.emit("scan_started", { root, tool: "scan-repo", runtime: wantRuntime });

  const files = await collectFiles(root);
  if (!files.length) {
    tracer.error("import_failed", `No se encontraron archivos de texto analizables en ${root}`);
    console.error(`✗ No se encontraron archivos de texto analizables en ${root}`);
    process.exit(1);
  }

  const routes = deriveRoutes(files);
  tracer.emit("routes_detected", { count: routes.length, routes });

  let report = buildAnalysis(files, { root, tool: "scan-repo", tracer });

  if (wantRuntime) {
    let baseURL = baseFlag;
    let source: "manual" | "autodetect" | "none" = baseURL ? "manual" : "none";
    if (!baseURL) { console.log("· runtime: autodetectando dev server local…"); baseURL = await detectBaseURL(); if (baseURL) source = "autodetect"; }
    if (!baseURL) {
      const m = "Runtime pedido pero no hay dev server local ni --base. Arranca el proyecto o pasa --base=http://localhost:3000.";
      tracer.error("runtime_failed", m);
      report = attachRuntime(report, emptyRuntime({ enabled: true, baseURLSource: "none", errors: [m] }));
      console.log("  runtime: sin baseURL (omitido, honesto)");
    } else {
      const s = report.summary;
      const runtime = await runRuntime({
        root, baseURL, baseURLSource: source, routes, tracer,
        staticHints: { navigation: s.navigation?.value, architecture: s.architecture?.value, productType: s.productType?.value },
      });
      report = attachRuntime(report, runtime);
      console.log(`  runtime: ${runtime.ran ? `OK ${runtime.routesCrawled.length} ruta(s), ${runtime.screenshots.length} captura(s)` : "no ejecutado"} · ${baseURL} (${source})`);
      for (const w of runtime.warnings) console.log(`    ! ${w}`);
      for (const er of runtime.errors) console.log(`    ✗ ${er}`);
    }
  }

  report = attachTrace(report, tracer.report());

  const out = outArg ? path.resolve(outArg) : path.join(root, "analysis.json");
  await fs.writeFile(out, JSON.stringify(report, null, 2), "utf8");
  const logPath = await writeImportLog(root, report);
  if (logPath) console.log(`  log de importación → ${logPath}`);

  const s = report.summary;
  const line = (label: string, inf?: { value: string; confidence: string; source: string }) =>
    inf ? `  ${label}: ${inf.value} (${inf.confidence}) — ${inf.source}` : `  ${label}: —`;
  console.log(`✓ analysis.json → ${out}`);
  console.log(`  archivos analizados: ${s.filesRead} · tema: ${s.theme}`);
  console.log(line("navegación", s.navigation));
  console.log(line("arquitectura", s.architecture));
  if (s.auth) console.log(line("auth", s.auth));
  if (s.productType) console.log(line("tipo", s.productType));
  console.log(`  escenas probables: ${s.scenes.join(", ") || "—"}`);
  console.log(`  componentes dominantes: ${s.components.slice(0, 8).map((c) => `${c.name}×${c.count}`).join(", ") || "—"}`);
  console.log(`  librerías: ${s.libraries.map((l) => l.name).join(", ") || "—"}`);
  console.log(`  colores: ${s.colors.map((c) => c.value).join(" ")}`);
  if (s.notes.length) { console.log("  notas / límites:"); for (const n of s.notes) console.log(`    · ${n}`); }
  console.log("\n→ Impórtalo: Perfil → Importar → Proyecto completo → Archivos / analysis.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
