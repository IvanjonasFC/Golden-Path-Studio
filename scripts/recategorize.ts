/**
 * Reclasifica la BD del catalogo a la taxonomia canonica (categorize.ts) SIN
 * volver a descargar nada. Util tras afinar reglas/sinonimos. Idempotente.
 *   npx tsx scripts/recategorize.ts
 */
import { sqlite, initDb } from "../src/db/index";
import { canonicalCategory } from "../src/ingest/categorize";

initDb();

type Row = { id: string; name: string; category: string; tags: string };
const rows = sqlite.prepare("SELECT id, name, category, tags FROM components").all() as Row[];
const upd = sqlite.prepare("UPDATE components SET category = ? WHERE id = ?");

const after = new Map<string, number>();
let changed = 0;
const tx = sqlite.transaction(() => {
  for (const r of rows) {
    let tags: string[] = [];
    try { tags = JSON.parse(r.tags || "[]"); } catch { /* ignore */ }
    const c = canonicalCategory(r.category, r.name, tags);
    after.set(c, (after.get(c) ?? 0) + 1);
    if (c !== r.category) { upd.run(c, r.id); changed++; }
  }
});
tx();

// Reconstruye el indice FTS si es de contenido externo (para que el filtro cuadre).
try { sqlite.prepare("INSERT INTO components_fts(components_fts) VALUES('rebuild')").run(); } catch { /* no aplica */ }

console.log(`Recategorizados ${changed}/${rows.length} componentes.`);
console.log(`Categorias resultantes: ${after.size}`);
for (const [cat, n] of [...after.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${cat}`);
}
