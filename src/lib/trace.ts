/* ============================================================================
   trace — trazabilidad estructurada y tipada, compartida por importación y
   exportación. NO es console.log ruidoso: son eventos con nombre estable +
   payload compacto, agregables en tres capas:

     1) resumen legible (UI)         → para que el usuario entienda qué pasó,
     2) log estructurado persistido  → depuración/auditoría (BD y/o disco),
     3) auditoría dentro del pack     → EXPORT_LOG.json / import-*.json.

   Isomorfo (Node + navegador), sin dependencias y serializable a JSON tal cual.
   Regla: eventos claros y tipados, útiles para usuario + depuración + auditoría.
   ============================================================================ */

export type TraceLevel = "info" | "warn" | "error";

/** Eventos de IMPORTACIÓN (scan estático + runtime + creación de marca). */
export type ImportEventKind =
  | "scan_started"
  | "files_scanned"
  | "routes_detected"
  | "identity_extracted"
  | "blueprint_inferred"
  | "runtime_started"
  | "runtime_screenshot_taken"
  | "runtime_completed"
  | "runtime_failed"
  | "contradiction_found"
  | "import_created_brand"
  | "import_warning"
  | "import_failed";

/** Eventos de EXPORTACIÓN (resolución + generación de archivos + escritura). */
export type ExportEventKind =
  | "export_started"
  | "resolved_recomputed"
  | "files_generated"
  | "file_omitted"
  | "export_warning"
  | "export_written"
  | "export_completed"
  | "export_failed";

export type EventKind = ImportEventKind | ExportEventKind;

export interface TraceEvent {
  t: number;                          // epoch ms
  kind: EventKind;
  level: TraceLevel;                  // info | warn | error
  msg?: string;                       // texto legible opcional
  data?: Record<string, unknown>;     // payload compacto opcional
}

export interface TraceReport {
  events: TraceEvent[];               // orden cronológico
  warnings: string[];                 // derivado de eventos level=warn
  errors: string[];                   // derivado de eventos level=error
  startedAt: number;
  finishedAt: number;
  ok: boolean;                        // sin errores
}

/** Recolector de eventos. Nunca lanza: un fallo de log jamás rompe el flujo. */
export class Tracer {
  private events: TraceEvent[] = [];
  readonly startedAt: number = Date.now();
  private echo: boolean;
  private prefix: string;

  /** `echo` vuelca cada evento por consola (útil en CLI/helper). */
  constructor(opts: { echo?: boolean; prefix?: string } = {}) {
    this.echo = opts.echo ?? false;
    this.prefix = opts.prefix ?? "trace";
  }

  emit(kind: EventKind, data?: Record<string, unknown>, msg?: string, level: TraceLevel = "info"): void {
    const ev: TraceEvent = { t: Date.now(), kind, level, ...(msg ? { msg } : {}), ...(data ? { data } : {}) };
    try {
      this.events.push(ev);
      if (this.echo) {
        const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
        fn(`[${this.prefix}] ${kind}${msg ? " · " + msg : ""}`, data ?? "");
      }
    } catch { /* nunca romper por un log */ }
  }

  warn(kind: EventKind, msg: string, data?: Record<string, unknown>): void { this.emit(kind, data, msg, "warn"); }
  error(kind: EventKind, msg: string, data?: Record<string, unknown>): void { this.emit(kind, data, msg, "error"); }

  /** Nº de eventos ya registrados (útil para condicionar). */
  get size(): number { return this.events.length; }

  report(): TraceReport {
    const warnings = this.events.filter((e) => e.level === "warn").map((e) => e.msg ?? e.kind);
    const errors = this.events.filter((e) => e.level === "error").map((e) => e.msg ?? e.kind);
    return {
      events: [...this.events],
      warnings, errors,
      startedAt: this.startedAt,
      finishedAt: Date.now(),
      ok: errors.length === 0,
    };
  }
}

/** Cuenta de eventos por tipo — base del resumen legible. */
export function countByKind(events: TraceEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) out[e.kind] = (out[e.kind] ?? 0) + 1;
  return out;
}

/** Un TraceReport vacío y honesto (para caminos sin trazabilidad). */
export function emptyTrace(): TraceReport {
  const now = Date.now();
  return { events: [], warnings: [], errors: [], startedAt: now, finishedAt: now, ok: true };
}
