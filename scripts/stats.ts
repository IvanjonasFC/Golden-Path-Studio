import { initDb } from "../src/db/index";
import { listFacet, totalCount } from "../src/lib/query";

initDb();
console.log(`\nTotal componentes: ${totalCount()}\n`);
for (const col of ["source", "platform", "framework", "category"] as const) {
  console.log(`Por ${col}:`);
  for (const { value, count } of listFacet(col)) {
    console.log(`  ${value.padEnd(16)} ${count}`);
  }
  console.log("");
}
process.exit(0);
