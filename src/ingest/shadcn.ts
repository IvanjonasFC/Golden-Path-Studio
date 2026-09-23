import { makeShadcnAdapter } from "./shadcnRegistry";

/**
 * shadcn/ui (MIT). No expone un indice JSON publico simple: sus items se sirven
 * por "style". Usamos la lista canonica de componentes y el endpoint new-york.
 */
const SHADCN_COMPONENTS = [
  "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge",
  "breadcrumb", "button", "calendar", "card", "carousel", "chart", "checkbox",
  "collapsible", "command", "context-menu", "dialog", "drawer", "dropdown-menu",
  "form", "hover-card", "input", "input-otp", "label", "menubar",
  "navigation-menu", "pagination", "popover", "progress", "radio-group",
  "resizable", "scroll-area", "select", "separator", "sheet", "sidebar",
  "skeleton", "slider", "sonner", "switch", "table", "tabs", "textarea",
  "toggle", "toggle-group", "tooltip",
  // Bloques OFICIALES (registry:block, MIT): shells de app completos que llenan
  // justo el hueco de dashboard/sidebar/tabla/login que faltaba en el catálogo.
  "sidebar-01", "sidebar-02", "sidebar-03", "sidebar-04", "sidebar-05", "sidebar-06",
  "sidebar-07", "sidebar-08", "sidebar-09", "sidebar-10", "sidebar-11", "sidebar-12",
  "sidebar-13", "sidebar-14", "sidebar-15", "sidebar-16",
  "dashboard-01",
  "login-01", "login-02", "login-03", "login-04", "login-05",
];

export const shadcnAdapter = makeShadcnAdapter({
  key: "shadcn",
  label: "shadcn/ui",
  license: "MIT",
  homepage: "https://ui.shadcn.com",
  names: SHADCN_COMPONENTS,
  itemUrl: (name) => `https://ui.shadcn.com/r/styles/new-york/${name}.json`,
  docPath: (name) => `https://ui.shadcn.com/docs/components/${name}`,
});
