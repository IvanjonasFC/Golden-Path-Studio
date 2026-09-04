/**
 * Clasificador ligero por palabras clave para asignar una categoria comun
 * a componentes de fuentes que no traen categoria propia (Magic UI, Aceternity).
 * El objetivo no es perfeccion, sino que los filtros del catalogo sean utiles.
 */
const RULES: Array<[RegExp, string]> = [
  [/button|btn|cta/i, "Buttons"],
  [/\bcard\b|pin|bento|testimonial|pricing/i, "Cards"],
  [/input|form|search|textarea|otp|file-upload|signup|login/i, "Forms"],
  [/nav|menu|dock|sidebar|tabs|breadcrumb|navbar/i, "Navigation"],
  [/background|beams|aurora|grid|dots?|meteor|gradient|vortex|ripple|boxes|stars|shader|noise/i, "Backgrounds"],
  [/text|typewriter|flip-words|generate|reveal|marquee|sparkle|highlight|shimmer|number-ticker|morphing|hyper|word/i, "Text"],
  [/loader|spinner|progress|skeleton|multi-step/i, "Loaders"],
  [/carousel|images?|gallery|parallax|compare|lens|scroll|globe|map|3d|macbook|iphone|webcam|canvas|pixel/i, "Media"],
  [/tooltip|hover|popover|modal|dialog|drawer|animated-tooltip|link-preview/i, "Overlays"],
  [/timeline|layout|hero|feature|footer|container|resizable|draggable/i, "Layout"],
  [/toggle|switch|checkbox|radio|slider/i, "Controls"],
  [/effect|glow|glare|spotlight|border|beam|cursor|pointer|confetti|animation|motion|wobble|comet|evervault/i, "Effects"],
];

export function guessCategory(name: string, tags: string[] = []): string {
  const hay = `${name} ${tags.join(" ")}`;
  for (const [re, cat] of RULES) if (re.test(hay)) return cat;
  return "Other";
}
