import { makeShadcnAdapter } from "./shadcnRegistry";

/**
 * Aceternity UI. Los componentes gratuitos son MIT; los "Pro" requieren
 * licencia y su endpoint puede fallar -> se omiten automaticamente.
 */
export const aceternityAdapter = makeShadcnAdapter({
  key: "aceternity",
  label: "Aceternity UI",
  license: "MIT (free) / Pro",
  homepage: "https://ui.aceternity.com",
  indexUrl: "https://ui.aceternity.com/registry",
  itemUrl: (name) => `https://ui.aceternity.com/registry/${name}.json`,
  keepTypes: ["registry:ui", "registry:block"],
});
