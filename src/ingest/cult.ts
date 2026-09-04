import { makeShadcnAdapter } from "./shadcnRegistry";

/** Cult UI (MIT) — registro shadcn estandar. */
export const cultAdapter = makeShadcnAdapter({
  key: "cult",
  label: "Cult UI",
  license: "MIT",
  homepage: "https://www.cult-ui.com",
  indexUrl: "https://www.cult-ui.com/r/registry.json",
  itemUrl: (name) => `https://www.cult-ui.com/r/${name}.json`,
  keepTypes: ["registry:ui", "registry:component", "registry:block"],
  docPath: (name) => `https://www.cult-ui.com/docs/components/${name}`,
});
