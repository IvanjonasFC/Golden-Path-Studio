// Copia los bundles UMD (React, ReactDOM, Babel, Motion, Three) a public/vendor/
// para que la vista previa en vivo de componentes React/3D funcione OFFLINE,
// sin depender de ningún CDN. Los bundles ya vienen commiteados; ejecuta esto
// solo si quieres regenerarlos/actualizarlos:  npm run copy:vendor
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/vendor");
mkdirSync(out, { recursive: true });

const MAP = [
  ["react/umd/react.production.min.js", "react.production.min.js"],
  ["react-dom/umd/react-dom.production.min.js", "react-dom.production.min.js"],
  ["@babel/standalone/babel.min.js", "babel.min.js"],
  ["framer-motion/dist/framer-motion.js", "framer-motion.js"],
  ["three/build/three.min.js", "three.min.js"],
];

let ok = 0;
for (const [from, to] of MAP) {
  const src = resolve(root, "node_modules", from);
  if (!existsSync(src)) {
    console.warn("· falta en node_modules:", from);
    continue;
  }
  copyFileSync(src, resolve(out, to));
  console.log("✓", to);
  ok++;
}
console.log(`\n${ok}/${MAP.length} bundles en public/vendor/`);
if (ok < MAP.length) {
  console.log(
    "Instala los que falten (solo para regenerar):\n  npm i -D react react-dom @babel/standalone framer-motion three",
  );
}
