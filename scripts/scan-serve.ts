#!/usr/bin/env node
/* ============================================================================
   scan-serve  HELPER LOCAL (servicio) del pipeline de importacion.

   La web es la interfaz; este servicio corre en TU maquina, tiene acceso real
   al disco y hace el analisis de fondo. La web le pide analizar una carpeta por
   su RUTA y recibe solo el analysis.json (contrato)  sin subir el repo.

     Escucha SOLO en 127.0.0.1 (nada sale de tu equipo).
     Reutiliza el mismo recorrido (walkRepo) y buildAnalysis que el CLI.

   Uso:
     npx tsx scripts/scan-serve.ts            # escucha en http://127.0.0.1:4319
     SCAN_PORT=5000 npx tsx scripts/scan-serve.ts

   Endpoints:
     GET  /health
     GET  /pick            -> abre el dialogo nativo de Windows y devuelve la ruta
     GET  /analyze?path=<ruta>[&baseURL=<url>][&runtime=1]
     POST /analyze         body: { "path": "<ruta>", "baseURL"?: "<url>", "runtime"?: true }

   Runtime (Playwright) es OPCIONAL y honesto: si se pide (`runtime`) intenta
   navegar el proyecto en marcha (baseURL manual o autodetectada) y adjunta un
   RuntimeReport al MISMO contrato. Si no puede, lo deja en warnings/errors y la
   capa estatica sigue siendo valida.
   ============================================================================ */
import http from "node:http";
import { execFile } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { collectFiles, deriveRoutes } from "./walkRepo";
import { buildAnalysis, attachRuntime, emptyRuntime } from "../src/lib/analysis";
import { runRuntime, detectBaseURL } from "./runtime";

const PORT = Number(process.env.SCAN_PORT || 4319);
const HOST = "127.0.0.1";

function cors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");           // solo escucha en localhost
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function json(res: http.ServerResponse, code: number, body: unknown) {
  cors(res);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => resolve(d));
  });
}

// Abre el dialogo nativo de carpetas de Windows y resuelve la ruta elegida
// ("" si el usuario cancela). El form invisible (Opacity 0 + TopMost) fuerza que
// el dialogo salga al FRENTE de forma fiable; windowsHide evita la consola negra.
function pickFolderWin(): Promise<string> {
  // WinForms con un form propietario invisible fuera de pantalla + TopMost y foco:
  // asi el dialogo sale SIEMPRE al frente. Sin -WindowStyle Hidden (bloqueaba el
  // primer plano); windowsHide evita la consola. Add-Type carga WinForms.
  const ps = [
    "$ErrorActionPreference='Stop';",
    "Add-Type -AssemblyName System.Windows.Forms;",
    "Add-Type -AssemblyName System.Drawing;",
    "Add-Type -Namespace Native -Name Win -MemberDefinition '[DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h);';",
    "$fbd = New-Object System.Windows.Forms.FolderBrowserDialog;",
    "$fbd.Description = 'Selecciona la carpeta del proyecto a analizar';",
    "$fbd.ShowNewFolderButton = $false;",
    "$own = New-Object System.Windows.Forms.Form;",
    "$own.TopMost = $true; $own.ShowInTaskbar = $false; $own.StartPosition = 'Manual';",
    "$own.Location = New-Object System.Drawing.Point(-3000,-3000); $own.Size = New-Object System.Drawing.Size(1,1);",
    "$own.Show(); $own.Activate(); [System.Windows.Forms.Application]::DoEvents();",
    "[Native.Win]::SetForegroundWindow($own.Handle) | Out-Null;",
    "$r = $fbd.ShowDialog($own);",
    "$own.Close(); $own.Dispose();",
    "if ($r -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($fbd.SelectedPath) };",
  ].join(" ");
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", ps],
      { windowsHide: true, timeout: 180_000 },
      (err, stdout, stderr) => {
        const out = (stdout || "").trim();
        if (out) { resolve(out); return; }
        if (err) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === "ENOENT") { reject(new Error("No se encontro powershell.exe")); return; }
          reject(new Error((stderr || "").trim() || (err as Error).message)); return;
        }
        resolve("");
      },
    );
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (url.pathname === "/health") { json(res, 200, { ok: true, tool: "scan-serve", port: PORT }); return; }

  // Selector nativo: la web pide abrir el explorador de Windows y recibe la ruta.
  if (url.pathname === "/pick") {
    if (process.platform !== "win32") { json(res, 501, { error: "El selector nativo solo esta disponible en Windows. Pega la ruta a mano." }); return; }
    console.log("· /pick: abriendo selector de carpeta...");
    try {
      const picked = await pickFolderWin();
      console.log(picked ? `· /pick: elegido -> ${picked}` : "· /pick: cancelado por el usuario");
      json(res, 200, picked ? { path: picked } : { path: "", cancelled: true });
    } catch (e) {
      const msg = String((e as Error).message || e);
      console.log("· /pick ERROR:", msg);
      json(res, 500, { error: "No se pudo abrir el dialogo: " + msg });
    }
    return;
  }

  if (url.pathname === "/analyze") {
    let target = url.searchParams.get("path") ?? "";
    let baseURL: string | null = url.searchParams.get("baseURL");
    let wantRuntime = /^(1|true|yes)$/i.test(url.searchParams.get("runtime") ?? "");
    if (req.method === "POST") {
      try {
        const b = JSON.parse(await readBody(req)) as { path?: string; baseURL?: string; runtime?: boolean };
        target = b.path ?? target;
        if (b.baseURL) baseURL = b.baseURL;
        if (typeof b.runtime === "boolean") wantRuntime = b.runtime;
      } catch { /* ignore */ }
    }
    if (!target.trim()) { json(res, 400, { error: "Falta 'path' (ruta de la carpeta a analizar)." }); return; }
    const root = path.resolve(target);
    try {
      const st = await fs.stat(root);
      if (!st.isDirectory()) { json(res, 400, { error: `No es una carpeta: ${root}` }); return; }
    } catch { json(res, 404, { error: `Ruta no encontrada: ${root}` }); return; }
    try {
      const files = await collectFiles(root);
      if (!files.length) { json(res, 404, { error: "Sin archivos de texto analizables." }); return; }
      let report = buildAnalysis(files, { root, tool: "scan-serve" });
      console.log(`. analizado ${root} -> ${files.length} archivos`);

      if (wantRuntime) {
        // baseURL: manual > autodeteccion de dev server local.
        let source: "manual" | "autodetect" | "none" = baseURL ? "manual" : "none";
        if (!baseURL) { baseURL = await detectBaseURL(); if (baseURL) source = "autodetect"; }
        if (!baseURL) {
          report = attachRuntime(report, emptyRuntime({
            enabled: true, baseURLSource: "none",
            errors: ["Runtime pedido pero no hay dev server local en marcha ni baseURL. Arranca el proyecto (p. ej. `npm run dev`) o pasa baseURL."],
          }));
          console.log("  runtime: sin baseURL (omitido, honesto)");
        } else {
          const s = report.summary;
          const runtime = await runRuntime({
            root, baseURL, baseURLSource: source, routes: deriveRoutes(files),
            staticHints: { navigation: s.navigation?.value, architecture: s.architecture?.value, productType: s.productType?.value },
          });
          report = attachRuntime(report, runtime);
          console.log(`  runtime: ${runtime.ran ? `OK ${runtime.routesCrawled.length} ruta(s), ${runtime.screenshots.length} captura(s)` : "no ejecutado"} · ${baseURL} (${source})`);
        }
      }

      json(res, 200, report);
    } catch (e) { json(res, 500, { error: String((e as Error).message || e) }); }
    return;
  }

  json(res, 404, { error: "Ruta no encontrada. Usa /health, /pick o /analyze?path=..." });
});

server.listen(PORT, HOST, () => {
  console.log(`scan-serve escuchando en http://${HOST}:${PORT}`);
  console.log(`  salud:    http://${HOST}:${PORT}/health`);
  console.log(`  elegir:   GET  http://${HOST}:${PORT}/pick   (abre el explorador de Windows)`);
  console.log(`  analizar: POST http://${HOST}:${PORT}/analyze  body {"path":"C:\\\\ruta\\\\a\\\\tu\\\\proyecto"}`);
  console.log("  (solo local; nada sale de tu equipo)");
});
