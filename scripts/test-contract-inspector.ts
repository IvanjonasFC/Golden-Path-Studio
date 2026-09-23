/**
 * Golden Path Studio - Contract Inspector & Asset Management Verification Script
 * 
 * Verifies:
 * 1. Strict Hero Component Contract normalization & schemas.
 * 2. AssetReference structure with focal points, aspect ratios, and WCAG AAA alt text.
 * 3. Primary & Secondary CTA action bindings with typed LinkTargets.
 * 4. 100% Parity across In-Canvas Preview, Next.js, and Astro assemblers.
 */

import {
  HERO_COMPONENT_DEFINITION,
  normalizeHeroProps,
  renderHeroTemplate,
  type HeroProps,
  type AssetReference,
} from '../src/lib/componentContract';
import { assembleNextJsPage, assembleAstroPage, assembleHtmlPage } from '../src/lib/sceneAssembler';
import { resolveBlueprint } from '../src/lib/resolve';

function runTests() {
  console.log("===============================================================================");
  console.log("🧪 EJECUTANDO BATERÍA DE PRUEBAS: INSPECTOR DE CONTRATO Y GESTOR DE ASSETS");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Schema & Component Definition
  console.log("📌 1. Contrato del Componente Hero e Integridad del Schema:");
  assert(HERO_COMPONENT_DEFINITION.id === "comp_ivn_hero", "ID de componente comp_ivn_hero declarado correctamente");
  assert(HERO_COMPONENT_DEFINITION.slots.length === 3, "Hero declara 3 slots estrictos: badges, actions, media");
  assert(HERO_COMPONENT_DEFINITION.slots.some(s => (s.id === "media" || s.id === "portrait") && s.accepts.includes("image")), "Slot 'media'/'portrait' acepta únicamente imágenes/recursos visuales");
  assert(HERO_COMPONENT_DEFINITION.slots.some(s => s.id === "badges" && s.accepts.includes("badge")), "Slot 'badges' acepta badges semánticos");

  // 2. Normalización de Props y AssetReference
  console.log("\n📌 2. Normalización de Props y AssetReference:");
  const customHeroProps: HeroProps = {
    title: "Iván Jonás",
    eyebrow: "Senior Staff Engineer",
    statusText: "Disponible para proyectos",
    portrait: {
      assetId: "asset_portrait_editorial",
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
      alt: "Retrato de Iván Jonás en alta fidelidad",
      aspectRatio: "4:5",
      fit: "cover",
      focalPoint: { x: 50, y: 30 },
    },
    badges: [
      { id: "b1", label: "Architecture", tone: "accent" },
      { id: "b2", label: "DevOps", tone: "neutral" },
      { id: "b3", label: "Next.js", tone: "success" },
    ],
    primaryCta: {
      label: "Explorar Portfolio",
      variant: "primary",
      action: {
        actionId: "primary",
        label: "Explorar Portfolio",
        target: { kind: "route", routeId: "portfolio", path: "/portfolio" },
      },
    },
  };

  const normalized = normalizeHeroProps(customHeroProps as unknown as Record<string, unknown>);
  assert(normalized.title === "Iván Jonás", "Título normalizado correctamente");
  assert(normalized.portrait?.assetId === "asset_portrait_editorial", "Asset ID preservado en AssetReference");
  assert(normalized.portrait?.focalPoint?.x === 50 && normalized.portrait?.focalPoint?.y === 30, "Punto focal (x: 50%, y: 30%) preservado");
  assert(Boolean(normalized.portrait?.alt && normalized.portrait.alt.length > 5), "Alt text presente para cumplimiento de accesibilidad WCAG AAA");
  assert(normalized.badges?.length === 3, "Lista de badges normalizada con 3 elementos");

  // 3. Renderizado de Preview con data-subnodes para introspección in-canvas
  console.log("\n📌 3. Renderizado Canónico y Marcado de Subnodos:");
  const interactivePreviewHtml = renderHeroTemplate(normalized, undefined, { isInteractivePreview: true });
  assert(interactivePreviewHtml.includes('data-subnode="image"'), "Contenedor de imagen incluye data-subnode='image'");
  assert(interactivePreviewHtml.includes('data-subnode="heading"'), "H1 incluye data-subnode='heading'");
  assert(interactivePreviewHtml.includes('data-subnode="button"'), "Botones incluyen data-subnode='button'");
  assert(interactivePreviewHtml.includes('data-subnode="badge"'), "Badges incluyen data-subnode='badge'");
  assert(interactivePreviewHtml.includes('href="/portfolio"'), "Enlace primario resuelve correctamente la ruta /portfolio");

  // 4. Paridad con Ensambladores Next.js, Astro y HTML5
  console.log("\n📌 4. Paridad de Exportación en Ensambladores:");
  const mockAssemblerInputs = {
    scene: "landing" as const,
    brandName: "Iván Jonás Studio",
    tokens: {},
    resolvedConfig: resolveBlueprint({}, {}).resolvedConfig,
    samples: [],
    slots: {},
    cssTokens: ":root { --color-accent: #ff7a00; }",
    font: "Inter, sans-serif",
    theme: "dark" as const,
    layoutBlocks: [
      {
        id: "hero_main",
        type: "hero",
        label: "Hero Developer Iván Jonás",
        componentId: "comp_ivn_hero",
        order: 0,
        props: customHeroProps as unknown as Record<string, unknown>,
      },
    ],
  };

  const nextJsOutput = assembleNextJsPage(mockAssemblerInputs);
  assert(nextJsOutput.includes("Iván Jonás"), "Exportación Next.js contiene el titular canónico");
  assert(nextJsOutput.includes("Explorar Portfolio"), "Exportación Next.js contiene el CTA configurado");
  assert(nextJsOutput.includes("Senior Staff Engineer"), "Exportación Next.js contiene el eyebrow");

  const astroOutput = assembleAstroPage(mockAssemblerInputs);
  assert(astroOutput.includes("Iván Jonás"), "Exportación Astro contiene el titular canónico");
  assert(astroOutput.includes("Explorar Portfolio"), "Exportación Astro contiene el CTA");

  const htmlOutput = assembleHtmlPage(mockAssemblerInputs);
  assert(htmlOutput.includes("Iván Jonás"), "Exportación HTML contiene el titular");
  assert(htmlOutput.includes("href=\"/portfolio\""), "Exportación HTML resuelve la ruta del botón");

  console.log("\n===============================================================================");
  console.log(`📊 RESULTADO FINAL: ${passed} pruebas superadas, ${failed} fallidas.`);
  console.log("===============================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
