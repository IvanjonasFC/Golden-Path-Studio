/* ============================================================================
   Siembra por escena — lógica COMPARTIDA (una sola fuente) usada por:
   · la importación (pre-siembra las escenas inferidas del analysis.json), y
   · el botón "Sembrar sugeridos" del editor.

   Honestidad: la ESTRUCTURA (qué escenas/slots) sale del análisis real; los
   COMPONENTES son sugeridos del catálogo del vault (no copiados del proyecto).
   Reglas: solo slots compatibles por categoría, solo escenas relevantes,
   siembra mínima útil, sin duplicar lo ya cubierto (biblioteca/pins).
   El origen queda como `auto` (id ∈ blueprint.autoSeeded), editable por el user.
   ============================================================================ */
import { SCENE_SLOTS, categoryMatchesSlot, type SceneId } from "./scenes";

export interface Seedable { id: string; category?: string }

/**
 * Recorre las escenas dadas y elige componentes representativos del catálogo
 * para los slots COMPATIBLES y VACÍOS (no cubiertos ya por `existing`).
 * `fetchByQuery` inyecta el acceso al catálogo (p. ej. /api/components) para
 * mantener este módulo puro y testeable. Devuelve lo añadido + sus ids (auto).
 */
export async function seedScenes<T extends Seedable>(
  scenes: SceneId[],
  existing: Seedable[],
  fetchByQuery: (query: string) => Promise<T | null>,
  opts: { perScene?: number; total?: number } = {},
): Promise<{ added: T[]; autoSeeded: string[] }> {
  const perScene = opts.perScene ?? 4;
  const total = opts.total ?? 16;
  const added: T[] = [];
  const lib = (): Seedable[] => [...existing, ...added];
  const seenSlots = new Set<string>();

  for (const scene of scenes) {
    const defs = (SCENE_SLOTS[scene] ?? []).filter((s) => s.match.length > 0);
    let count = 0;
    for (const slot of defs) {
      if (added.length >= total || count >= perScene) break;
      const key = scene + ":" + slot.id;
      if (seenSlots.has(key)) continue;
      seenSlots.add(key);
      // ¿ya cubierto por la biblioteca o por algo ya sembrado? (no contaminar)
      if (lib().some((s) => categoryMatchesSlot(slot, s.category))) continue;
      let item: T | null = null;
      try { item = await fetchByQuery(slot.query); } catch { item = null; }
      if (!item) continue;
      if (lib().some((s) => s.id === item!.id)) continue;       // ya presente
      if (!categoryMatchesSlot(slot, item.category)) continue;  // compatibilidad real
      added.push(item);
      count++;
    }
  }
  return { added, autoSeeded: added.map((a) => a.id) };
}
