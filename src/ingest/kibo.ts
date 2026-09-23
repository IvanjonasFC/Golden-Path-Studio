import { makeShadcnAdapter } from "./shadcnRegistry";

/**
 * Kibo UI (MIT) — componentes "de app" que faltaban en el catálogo: gantt,
 * kanban, tabla, calendar, dropzone, editor de código, etc. Registro shadcn
 * estándar (índice + contenido públicos). Cualquier item que fallara (401/403)
 * se omite solo, así que nunca redistribuimos contenido de pago.
 */
export const kiboAdapter = makeShadcnAdapter({
  key: "kibo",
  label: "Kibo UI",
  license: "MIT",
  homepage: "https://www.kibo-ui.com",
  indexUrl: "https://www.kibo-ui.com/r/registry.json",
  itemUrl: (name) => `https://www.kibo-ui.com/r/${name}.json`,
  keepTypes: ["registry:ui", "registry:component", "registry:block"],
  docPath: (name) => `https://www.kibo-ui.com/components/${name}`,
});
