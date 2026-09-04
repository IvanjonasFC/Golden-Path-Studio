/**
 * Modo offline 100%:
 *  1. Vendoriza el script de Tailwind Play en public/vendor/tailwind.js
 *     y reescribe los previews para que apunten a la copia local.
 *  2. Descarga los thumbnails remotos (ThreeUI) a public/thumbnails/
 *     y reescribe la columna thumbnail a la ruta local.
 * Ejecutar en una red con acceso a internet (una sola vez).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { sqlite, initDb } from "../src/db/index";

initDb();

const PUBLIC = resolve("./public");
const VENDOR = join(PUBLIC, "vendor");
const THUMBS = join(PUBLIC, "thumbnails");
const TAILWIND_CDN = "https://cdn.tailwindcss.com";
const UA = "Mozilla/5.0 component-vault-offline";

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function mapPool<T>(arr: T[], size: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, arr.length) }, async () => {
      while (i < arr.length) await fn(arr[i++]);
    }),
  );
}

async function vendorTailwind() {
  mkdirSync(VENDOR, { recursive: true });
  const dest = join(VENDOR, "tailwind.js");
  if (existsSync(dest)) {
    console.log("• Tailwind ya vendorizado (public/vendor/tailwind.js)");
  } else {
    try {
      const buf = await download(TAILWIND_CDN);
      writeFileSync(dest, buf);
      console.log(`• Tailwind vendorizado (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.warn(`! No se pudo descargar Tailwind: ${(e as Error).message}. Se omite el reescrito de previews.`);
      return;
    }
  }
  const r = sqlite
    .prepare(
      `UPDATE components SET preview_html = REPLACE(preview_html, ?, '/vendor/tailwind.js')
       WHERE preview_html LIKE '%cdn.tailwindcss.com%'`,
    )
    .run(TAILWIND_CDN);
  console.log(`  previews reescritos a Tailwind local: ${r.changes}`);
}

async function localThumbnails() {
  mkdirSync(THUMBS, { recursive: true });
  const rows = sqlite
    .prepare("SELECT id, thumbnail FROM components WHERE thumbnail LIKE 'http%'")
    .all() as Array<{ id: string; thumbnail: string }>;
  if (!rows.length) {
    console.log("• No hay thumbnails remotos que descargar.");
    return;
  }
  console.log(`• Descargando ${rows.length} thumbnails...`);
  const upd = sqlite.prepare("UPDATE components SET thumbnail = ? WHERE id = ?");
  let ok = 0;
  await mapPool(rows, 8, async (row) => {
    try {
      const ext = extname(new URL(row.thumbnail).pathname) || ".jpg";
      const safe = row.id.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const file = `${safe}${ext}`;
      const buf = await download(row.thumbnail);
      writeFileSync(join(THUMBS, file), buf);
      upd.run(`/thumbnails/${file}`, row.id);
      ok++;
    } catch (e) {
      console.warn(`  ! ${row.id}: ${(e as Error).message}`);
    }
  });
  console.log(`  thumbnails locales: ${ok}/${rows.length}`);
}

async function main() {
  console.log("\n=== Golden Path Studio :: modo offline ===\n");
  await vendorTailwind();
  await localThumbnails();
  console.log("\nListo. La web ya no depende de CDNs externos para previews/thumbnails.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
