/* ============================================================================
   Telemetría/logs de depuración del editor de marca. Pensado para diagnóstico
   real, no ruido: eventos con nombre estable + payload compacto. En el navegador
   se emite por consola (agrupable/filtrable por el prefijo [brand]) y se guarda
   un anillo en memoria (window.__brandLog) para inspección rápida.
   ============================================================================ */
export type BrandEvent =
  | "preset.apply"
  | "template.apply"
  | "template.applyPartial"
  | "guided.start"
  | "guided.finish"
  | "scene.change"
  | "scene.seed"
  | "slot.assign"
  | "slot.assignExisting"
  | "slot.clear"
  | "slot.select"
  | "component.add"
  | "component.remove"
  | "origin.change"
  | "compat.reject"
  | "draft.save"
  | "version.publish"
  | "version.diff"
  | "version.restore"
  | "export"
  | "error";

interface LogEntry { t: number; event: BrandEvent; data?: Record<string, unknown> }

const RING_MAX = 200;

export function logEvent(event: BrandEvent, data?: Record<string, unknown>): void {
  const entry: LogEntry = { t: Date.now(), event, data };
  try {
    if (typeof window !== "undefined") {
      const w = window as unknown as { __brandLog?: LogEntry[] };
      (w.__brandLog ??= []).push(entry);
      if (w.__brandLog.length > RING_MAX) w.__brandLog.shift();
    }
    const fn = event === "error" ? console.error : console.debug;
    fn(`[brand] ${event}`, data ?? {});
  } catch { /* nunca romper el flujo por un log */ }
}
