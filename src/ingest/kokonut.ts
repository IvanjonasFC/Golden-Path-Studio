import { makeShadcnAdapter } from "./shadcnRegistry";

/** Kokonut UI (MIT) — registro shadcn estandar. */
export const kokonutAdapter = makeShadcnAdapter({
  key: "kokonut",
  label: "Kokonut UI",
  license: "MIT",
  homepage: "https://kokonutui.com",
  indexUrl: "https://kokonutui.com/r/registry.json",
  itemUrl: (name) => `https://kokonutui.com/r/${name}.json`,
  keepTypes: ["registry:ui", "registry:component", "registry:block"],
  docPath: (name) => `https://kokonutui.com/docs/components/${name}`,
});
