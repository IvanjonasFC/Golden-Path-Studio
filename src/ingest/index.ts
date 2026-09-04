import { initDb } from "../db/index";
import { upsertMany, purgeSource, type SourceAdapter } from "./util";
import { uiverseAdapter } from "./uiverse";
import { magicuiAdapter } from "./magicui";
import { aceternityAdapter } from "./aceternity";
import { threeuiAdapter } from "./threeui";
import { hyperuiAdapter } from "./hyperui";
import { shadcnAdapter } from "./shadcn";
import { cultAdapter } from "./cult";
import { kokonutAdapter } from "./kokonut";

const ADAPTERS: Record<string, SourceAdapter> = {
  uiverse: uiverseAdapter,
  magicui: magicuiAdapter,
  aceternity: aceternityAdapter,
  threeui: threeuiAdapter,
  hyperui: hyperuiAdapter,
  shadcn: shadcnAdapter,
  cult: cultAdapter,
  kokonut: kokonutAdapter,
};

function parseSources(argv: string[]): string[] {
  const idx = argv.indexOf("--source");
  const raw = idx >= 0 ? argv[idx + 1] : "all";
  if (!raw || raw === "all") return Object.keys(ADAPTERS);
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  initDb();
  const sources = parseSources(process.argv.slice(2));
  const log = (m: string) => console.log(m);

  console.log(`\n=== Golden Path Studio :: ingesta ===`);
  console.log(`Fuentes: ${sources.join(", ")}\n`);

  let grandTotal = 0;
  for (const key of sources) {
    const adapter = ADAPTERS[key];
    if (!adapter) {
      console.warn(`! Fuente desconocida: ${key} (validas: ${Object.keys(ADAPTERS).join(", ")})`);
      continue;
    }
    const t0 = Date.now();
    console.log(`--- ${adapter.label} ---`);
    try {
      const items = await adapter.collect({ log });
      purgeSource(key);
      const n = upsertMany(items);
      grandTotal += n;
      console.log(`OK ${adapter.label}: ${n} componentes en ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
    } catch (e) {
      console.error(`FALLO en ${adapter.label}: ${(e as Error).message}`);
      if (key !== "uiverse") {
        console.error(
          "  (Si estas detras de un proxy/firewall que bloquea el sitio, ejecuta esta fuente desde tu red local.)\n",
        );
      }
    }
  }

  console.log(`=== Total ingerido en esta ejecucion: ${grandTotal} ===\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
