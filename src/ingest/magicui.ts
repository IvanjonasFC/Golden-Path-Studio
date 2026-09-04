import { makeShadcnAdapter } from "./shadcnRegistry";

/**
 * Magic UI (MIT). El manifiesto vive en GitHub (siempre accesible) y el
 * contenido resuelto de cada componente en el endpoint del sitio.
 */
export const magicuiAdapter = makeShadcnAdapter({
  key: "magicui",
  label: "Magic UI",
  license: "MIT",
  homepage: "https://magicui.design",
  indexUrl:
    "https://raw.githubusercontent.com/magicuidesign/magicui/main/registry.json",
  itemUrl: (name) => `https://magicui.design/r/${name}.json`,
  keepTypes: ["registry:ui"],
});
