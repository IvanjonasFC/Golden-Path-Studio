/**
 * Taxonomia CANONICA del catalogo + normalizacion.
 *
 * Problema que resuelve: cada fuente trae su propia categoria (HyperUI genera
 * decenas: "Toggle-switches", "Blog Cards", "Product Cards"...), y Magic UI /
 * Aceternity / shadcn no traen ninguna. Resultado: 80+ categorias fragmentadas
 * poco accionables. Aqui las plegamos a un set pequeno y util para: slots,
 * busqueda, importacion, composicion y escenas/vistas.
 *
 * Un solo punto de verdad: `canonicalCategory()` se aplica en el upsert del
 * ingest (util.ts), para TODAS las fuentes. Sin motores paralelos.
 */

/** Conjunto canonico. Pocas categorias, cada una con un destino claro. */
export const CANONICAL = [
  "Buttons", "Forms", "Controls", "Navigation",
  "Tables", "Charts", "Stats", "Cards", "Badges",
  "Content", "Commerce", "Dashboard", "Settings", "Portfolio",
  "Overlays", "Feedback", "Media", "Backgrounds", "Text",
  "Effects", "Loaders", "Layout", "Other",
] as const;
export type Category = (typeof CANONICAL)[number];
const CANON_SET = new Set<string>(CANONICAL);

function titleCase(s: string): string {
  return s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/** Sinonimos de categorias NATIVAS de las fuentes -> canonica (clave en minuscula). */
const SYNONYMS: Record<string, Category> = {
  // Buttons
  "buttons": "Buttons", "button": "Buttons", "button groups": "Buttons", "ctas": "Buttons", "cta": "Buttons",
  // Forms / inputs
  "forms": "Forms", "form": "Forms", "inputs": "Forms", "input": "Forms", "textareas": "Forms",
  "selects": "Forms", "select": "Forms", "contact forms": "Forms", "newsletter signup": "Forms",
  "range inputs": "Forms", "quantity inputs": "Forms", "file uploaders": "Forms", "radio groups": "Forms",
  "remove number input spinners": "Forms",
  // Controls
  "toggle-switches": "Controls", "toggles": "Controls", "toggle": "Controls", "checkboxes": "Controls",
  "radio-buttons": "Controls", "controls": "Controls",
  // Navigation
  "navigation": "Navigation", "vertical menu": "Navigation", "side menu": "Navigation",
  "breadcrumbs": "Navigation", "pagination": "Navigation", "tabs": "Navigation", "dropdown": "Navigation",
  "steps": "Navigation", "skip links": "Navigation",
  // Tables / data
  "tables": "Tables", "table": "Tables", "details list": "Tables", "filters": "Tables",
  // Charts / stats
  "charts": "Charts", "chart": "Charts", "stats": "Stats", "analytics dashboard": "Dashboard",
  // Cards
  "cards": "Cards", "card": "Cards",
  // Badges
  "badges": "Badges", "badge": "Badges",
  // Content
  "blog cards": "Content", "testimonials": "Content", "team sections": "Content", "timelines": "Content",
  "faqs": "Content", "accordions": "Content",
  // Commerce
  "product cards": "Commerce", "product collections": "Commerce", "carts": "Commerce",
  "storefront": "Commerce", "pricing": "Commerce", "support inbox": "Commerce",
  // Portfolio
  "portfolio": "Portfolio",
  // Overlays
  "overlays": "Overlays", "modals": "Overlays", "tooltips": "Overlays",
  // Feedback
  "notifications": "Feedback", "toasts": "Feedback", "alerts": "Feedback", "banners": "Feedback",
  "announcements": "Feedback", "empty states": "Feedback", "empty content": "Feedback", "polls": "Feedback",
  // Media
  "media": "Media", "three.js": "Media", "3d": "Media", "logo clouds": "Media",
  // Backgrounds
  "backgrounds": "Backgrounds", "patterns": "Backgrounds",
  // Text
  "text": "Text", "text animation": "Text",
  // Effects
  "effects": "Effects", "css": "Effects",
  // Loaders / progress
  "loaders": "Loaders", "progress bars": "Loaders",
  // Layout / sections
  "layout": "Layout", "sections": "Layout", "hero": "Layout", "headers": "Layout", "footers": "Layout",
  "dividers": "Layout", "grids": "Layout", "feature grids": "Layout", "landing pages": "Layout",
  "saas landing page": "Layout", "ui elements": "Layout",
};

/** Reglas por palabras clave (fallback). Especifico -> generico; primera que casa gana. */
const RULES: Array<[RegExp, Category]> = [
  [/cart|checkout|\bshop\b|store|storefront|ecommerce|\bprice|pricing|product/i, "Commerce"],
  [/dashboard|admin-?panel|analytics-?dashboard/i, "Dashboard"],
  [/setting|preference|\baccount\b|\bprofile\b/i, "Settings"],
  [/portfolio/i, "Portfolio"],
  [/button|btn|\bcta\b/i, "Buttons"],
  [/table|data-?grid|datagrid|kanban|gantt|tree|spreadsheet|list-?view|\blist\b|details-?list|roster|directory/i, "Tables"],
  [/chart|graph|analytics|sparkline|\bplot\b/i, "Charts"],
  [/\bstat\b|\bkpi\b|metric|counter|number-?ticker/i, "Stats"],
  [/blog|article|\bpost\b|prose|editor|testimonial|\bteam\b|timeline|\bfaq|accordion|collapsible|code-?block|snippet|sandbox|terminal/i, "Content"],
  [/nav\b|navbar|menu|dock|sidebar|breadcrumb|pagination|command|stepper|\bsteps?\b|tabbar|tab-?bar/i, "Navigation"],
  [/input|\bform\b|search|textarea|otp|file-?upload|dropzone|signup|sign-?up|login|sign-?in|register|select|combobox|checkbox|radio|contact|newsletter|color-?picker|date-?picker|\bcalendar\b/i, "Forms"],
  [/toggle|switch|slider|\brange\b/i, "Controls"],
  [/badge|chip|\btags?\b|\blabel\b|\bpill\b|\bstatus\b/i, "Badges"],
  [/modal|dialog|drawer|sheet|popover|tooltip|hover-?card|lightbox/i, "Overlays"],
  [/toast|alert|notification|banner|announce|empty-?state|empty-?content|snackbar|sonner/i, "Feedback"],
  [/loader|spinner|progress|skeleton/i, "Loaders"],
  [/background|beams|aurora|meteor|gradient|vortex|ripple|boxes|stars|shader|noise|pattern|particles|dots?/i, "Backgrounds"],
  [/text|typewriter|flip-words|generate|reveal|marquee|sparkle|highlight|shimmer|morphing|hyper|\bword/i, "Text"],
  [/carousel|image|gallery|parallax|compare|\blens\b|globe|\bmap\b|3d|macbook|iphone|webcam|canvas|pixel|avatar|video|safari|android|keyboard|notch|mockup/i, "Media"],
  [/\bhero\b|feature|footer|header|container|resizable|section|divider|separator|aspect-ratio|logo-?cloud|landing|grids?/i, "Layout"],
  [/effect|glow|glare|spotlight|border|beam|cursor|pointer|confetti|animation|motion|wobble|comet|evervault|lamp|cover|orbit|scales|scroll/i, "Effects"],
  [/\bcards?\b|\bpin\b|bento/i, "Cards"],
];

/** Clasifica por nombre + tags cuando no hay categoria nativa util. */
export function guessCategory(name: string, tags: string[] = []): Category {
  const hay = `${name} ${tags.join(" ")}`;
  for (const [re, cat] of RULES) if (re.test(hay)) return cat;
  return "Other";
}

/**
 * Normaliza a categoria canonica. Se aplica a TODAS las fuentes en el upsert:
 * 1) sinonimo directo de la categoria nativa; 2) si ya es canonica, se respeta;
 * 3) si no, se infiere de nombre/tags; 4) por ultimo, "Other".
 */
export function canonicalCategory(raw?: string, name = "", tags: string[] = []): Category {
  const key = (raw ?? "").trim().toLowerCase();
  // "Other"/"Otros" NO se respeta como categoria valida: fuerza reclasificar por
  // nombre/tags (si no, una pieza que ya estaba en Other nunca se reexamina).
  if (key && key !== "other" && key !== "otros") {
    if (SYNONYMS[key]) return SYNONYMS[key];
    const tc = titleCase(key);
    if (CANON_SET.has(tc)) return tc as Category;
  }
  return guessCategory(name, tags);
}
