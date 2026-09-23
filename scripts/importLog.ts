/* ============================================================================
   importLog — persistencia en disco del log de importación (capa 3 de
   trazabilidad). Escribe un JSON de auditoría por operación en
   <root>/.analysis/logs/import-<timestamp>.json con el trace estructurado y un
   resumen contable. Compartido por el CLI `scan-repo` y el servicio `scan-serve`.
   Nunca lanza: un fallo de log jamás rompe la importación.
   ============================================================================ */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AnalysisReport } from "../src/lib/analysis";
import { countByKind } from "../src/lib/trace";

export async function writeImportLog(root: string, report: AnalysisReport): Promise<string | null> {
  try {
    const trace = report.trace;
    if (!trace) return null;
    const dir = path.join(root, ".analysis", "logs");
    await fs.mkdir(dir, { recursive: true });
    const ts = new Date(trace.finishedAt || Date.now());
    const stamp = ts.toISOString().replace(/[:.]/g, "-");
    const file = path.join(dir, `import-${stamp}.json`);
    const payload = {
      kind: "import" as const,
      generatedAt: report.generatedAt,
      tool: report.source.tool,
      root: report.source.root,
      filesScanned: report.source.filesScanned,
      brand: report.brand.name,
      runtime: report.runtime ? { enabled: report.runtime.enabled, ran: report.runtime.ran } : { enabled: false, ran: false },
      counts: countByKind(trace.events),
      ok: trace.ok,
      warnings: trace.warnings,
      errors: trace.errors,
      trace,
    };
    await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
    return file;
  } catch {
    return null;   // best-effort
  }
}
