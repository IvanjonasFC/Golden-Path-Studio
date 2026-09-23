import type { SceneId, SceneSlot, SceneBlockInstance, BlockActionBinding, LinkTarget, RuntimeMode } from "./scenes";
import { SCENE_LABEL, sceneSlotsResolved, samplesForSlot, routeForScene, resolveBlockActions } from "./scenes";
import type { ResolvedConfig } from "./resolve";
import type { PortfolioProject } from "./portfolioProjects";
import { renderProjectsGrid, renderProjectDetailTemplate } from "./portfolioProjects";
import {
  resolveProjectCollection,
  resolveProjectBySlug,
  matchProjectRoute,
  renderProjectNotFound,
  isProjectDetailBlock,
} from "./projectCollectionResolver";
import {
  renderHeroTemplate,
  renderNavbarTemplate,
  renderMetricsTemplate,
  renderBentoTemplate,
  renderContactTemplate,
  renderFooterTemplate,
} from "./componentContract";

export interface Sample {
  id: string;
  name: string;
  framework?: string;
  files?: Array<{ path: string; content: string; target?: string }>;
  previewHtml?: string | null;
  category?: string;
  source?: string;
  html?: string;
  css?: string;
}

export interface AssemblerInputs {
  scene: SceneId;
  brandName: string;
  tokens: unknown;
  resolvedConfig: ResolvedConfig;
  samples: Sample[];
  slots: Record<string, string>;
  cssTokens: string;
  font: string;
  theme: "dark" | "light";
  sceneHtml?: string;
  layoutBlocks?: SceneBlockInstance[];
  portfolioProjects?: PortfolioProject[];
  activeRoutePath?: string;
  runtimeMode?: RuntimeMode | "preview";
  revision?: number;
  documentHash?: string;
}

export function extractSampleHtml(s: Sample): string {
  if (s.html) return s.html;
  const f = s.files?.find((x) => /\.html?$/i.test(x.path));
  if (f?.content) return f.content;
  return s.previewHtml || "";
}

export function extractSampleCss(s: Sample): string {
  if (s.css) return s.css;
  const f = s.files?.find((x) => /\.css$/i.test(x.path));
  return f?.content || "";
}

function getSlotComponent(slot: SceneSlot, slots: Record<string, string>, samples: Sample[]): Sample | undefined {
  const id = slots?.[slot.id];
  if (id) {
    const s = samples.find((x) => x.id === id);
    if (s) return s;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return samplesForSlot(slot, samples as any)[0] as unknown as Sample | undefined;
}

interface ResolvedSection {
  id: string;
  label: string;
  comp?: Sample;
  linkToScene?: string;
  actionBindings?: Record<string, BlockActionBinding>;
}

function getOrderedSections(inp: AssemblerInputs): ResolvedSection[] {
  const routeInfo = matchProjectRoute(inp.activeRoutePath);
  const hasProjects = Boolean(inp.portfolioProjects && inp.portfolioProjects.length > 0);

  if (inp.layoutBlocks && inp.layoutBlocks.length > 0) {
    return inp.layoutBlocks.map((b) => {
      let comp: Sample | undefined;

      // 1. Detección canónica de vinculación CMS vs componente estático
      const isProjectsBlock =
        b.dataBinding?.source === "portfolio-projects" ||
        b.componentId === "comp_ivn_projects" ||
        (b.type === "cards" && b.label.toLowerCase().includes("proyecto"));

      const isDetailBlock = isProjectDetailBlock(b);

      if (routeInfo.isDetail && isDetailBlock) {
        // Renderizado dinámico de Detalle de Proyecto (/proyectos/[slug])
        const targetSlug = routeInfo.slug || "";
        const project = resolveProjectBySlug({ projects: inp.portfolioProjects }, targetSlug, {
          runtimeMode: inp.runtimeMode || "preview",
        });
        const dynamicHtml = project
          ? renderProjectDetailTemplate(project)
          : renderProjectNotFound(targetSlug);

        comp = {
          id: `dyn_detail_${targetSlug}`,
          name: project ? `Detalle: ${project.title}` : `Detalle: ${targetSlug}`,
          category: "cms-dynamic",
          source: "golden-path-cms",
          html: dynamicHtml,
        };
      } else if (hasProjects && isProjectsBlock) {
        // Renderizado dinámico de Grid de Proyectos
        const resolvedProjects = resolveProjectCollection(
          { projects: inp.portfolioProjects },
          {
            runtimeMode: inp.runtimeMode || "preview",
            includeDrafts: inp.runtimeMode !== "production",
            limit: b.dataBinding?.filter?.limit,
            featuredOnly: b.dataBinding?.filter?.featuredOnly,
            kind: b.dataBinding?.filter?.kind as any,
            tags: b.dataBinding?.filter?.tags,
          },
        );
        const pProps = (b.props as any) || {};
        const dynamicHtml = renderProjectsGrid(
          resolvedProjects.length > 0 ? resolvedProjects : inp.portfolioProjects!,
          {
            includeDrafts: inp.runtimeMode !== "production",
            limit: pProps.limit ?? b.dataBinding?.filter?.limit,
            category: pProps.category ?? b.dataBinding?.filter?.kind,
            featuredOnly: pProps.featuredOnly ?? b.dataBinding?.filter?.featuredOnly,
            heading: pProps.heading,
            highlightedWord: pProps.highlightedWord,
            eyebrow: pProps.eyebrow,
            subtitle: pProps.subtitle,
            layout: pProps.layout,
          },
        );

        comp = {
          id: "dyn_projects_grid",
          name: "Catálogo Dinámico de Proyectos",
          category: "cms-dynamic",
          source: "golden-path-cms",
          html: dynamicHtml,
        };
      } else if (b.componentId === "comp_ivn_hero" || (b.type === "hero" && b.props)) {
        // Renderizado canónico de Hero basado en contrato estricto
        const heroHtml = renderHeroTemplate((b.props as any) || {}, undefined, { isInteractivePreview: false });
        comp = {
          id: b.componentId || "comp_ivn_hero",
          name: b.label || "Hero Developer Iván Jonás",
          category: "hero",
          source: "golden-path-contract",
          html: heroHtml,
        };
      } else if (b.componentId === "comp_ivn_navbar" || (b.type === "nav" && b.props)) {
        // Renderizado canónico de Navbar
        const navHtml = renderNavbarTemplate((b.props as any) || {}, undefined, { isInteractivePreview: false });
        comp = {
          id: b.componentId || "comp_ivn_navbar",
          name: b.label || "Navbar Developer IVN",
          category: "nav",
          source: "golden-path-contract",
          html: navHtml,
        };
      } else if (b.componentId === "comp_ivn_metrics" || (b.type === "stats" && b.props)) {
        // Renderizado canónico de Métricas
        const metricsHtml = renderMetricsTemplate((b.props as any) || {}, undefined, { isInteractivePreview: false });
        comp = {
          id: b.componentId || "comp_ivn_metrics",
          name: b.label || "Barra de Métricas",
          category: "metrics",
          source: "golden-path-contract",
          html: metricsHtml,
        };
      } else if (b.componentId === "comp_ivn_bento_numbers" || (b.type === "bento" && b.props)) {
        // Renderizado canónico de Bento Grid
        const bentoHtml = renderBentoTemplate((b.props as any) || {}, undefined, { isInteractivePreview: false });
        comp = {
          id: b.componentId || "comp_ivn_bento_numbers",
          name: b.label || "Bento Grid Iván en Números",
          category: "bento",
          source: "golden-path-contract",
          html: bentoHtml,
        };
      } else if (b.componentId === "comp_ivn_contact" || (b.type === "contact" && b.props)) {
        // Renderizado canónico de Contacto
        const contactHtml = renderContactTemplate((b.props as any) || {}, undefined, { isInteractivePreview: false });
        comp = {
          id: b.componentId || "comp_ivn_contact",
          name: b.label || "Terminal de Contacto",
          category: "contact",
          source: "golden-path-contract",
          html: contactHtml,
        };
      } else if (b.componentId === "comp_ivn_footer" || (b.type === "footer" && b.props)) {
        // Renderizado canónico de Footer
        const footerHtml = renderFooterTemplate((b.props as any) || {}, undefined, { isInteractivePreview: false });
        comp = {
          id: b.componentId || "comp_ivn_footer",
          name: b.label || "Footer Minimalista",
          category: "footer",
          source: "golden-path-contract",
          html: footerHtml,
        };
      } else {
        if (b.componentId) {
          comp = inp.samples.find((s) => s.id === b.componentId);
        }
        if (!comp) {
          const id = inp.slots?.[b.id];
          if (id) comp = inp.samples.find((s) => s.id === id);
        }
      }

      const actions = resolveBlockActions(b);
      return {
        id: b.id,
        label: b.label,
        comp,
        linkToScene: b.linkToScene,
        actionBindings: actions,
      };
    });
  }

  const defs = sceneSlotsResolved(inp.scene, {});
  return defs.map((d) => ({
    id: d.id,
    label: d.label,
    comp: getSlotComponent(d, inp.slots, inp.samples),
    linkToScene: undefined,
    actionBindings: undefined,
  }));
}

export function resolveTargetUrl(target: LinkTarget): { href: string; newTab?: boolean; dataRoute?: string } {
  switch (target.kind) {
    case "scene": {
      const r = routeForScene(target.sceneId) + (target.hash ? `#${target.hash.replace(/^#/, "")}` : "");
      return { href: r, dataRoute: r };
    }
    case "route": {
      return { href: target.path, dataRoute: target.path };
    }
    case "url": {
      return { href: target.href, newTab: target.newTab };
    }
    case "anchor": {
      const a = `#section-${target.blockId}`;
      return { href: a };
    }
    case "none":
    default:
      return { href: "#" };
  }
}

export function applyRoutingLinks(
  html: string,
  actionBindings?: Record<string, BlockActionBinding>,
  legacyLink?: string,
): string {
  // Si hay actionBindings granulares, los aplicamos con precisión quirúrgica
  if (actionBindings && Object.keys(actionBindings).length > 0) {
    let modified = html;

    // 1. Inyección en elementos con data-action explícito
    for (const [actionId, binding] of Object.entries(actionBindings)) {
      if (!binding || binding.target.kind === "none") continue;
      const res = resolveTargetUrl(binding.target);
      const targetAttr = res.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
      const routeAttr = res.dataRoute ? ` data-route-to="${res.dataRoute}"` : "";

      const reAction = new RegExp(`(<(?:button|a)[^>]*data-action=["']${actionId}["'][^>]*)>`, "gi");
      modified = modified.replace(reAction, (match) => {
        let tag = match;
        if (/href=["'][^"']*["']/i.test(tag)) {
          tag = tag.replace(/href=["'][^"']*["']/i, `href="${res.href}"`);
        } else {
          tag = tag.replace(/>$/, ` href="${res.href}">`);
        }
        if (targetAttr && !tag.includes("target=")) tag = tag.replace(/>$/, `${targetAttr}>`);
        if (routeAttr && !tag.includes("data-route-to=")) tag = tag.replace(/>$/, `${routeAttr}>`);
        return tag;
      });
    }

    // 2. Acción principal ("primary") en el botón o link principal
    if (actionBindings["primary"] && actionBindings["primary"].target.kind !== "none") {
      const pRes = resolveTargetUrl(actionBindings["primary"].target);
      const targetAttr = pRes.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
      const routeAttr = pRes.dataRoute ? ` data-route-to="${pRes.dataRoute}"` : "";

      modified = modified.replace(
        /(<(?:button|a)[^>]*class=["'][^"']*(?:btn|button|primary)[^"']*["'][^>]*)>/i,
        (match) => {
          let tag = match;
          if (/href=["'][^"']*["']/i.test(tag)) {
            tag = tag.replace(/href=["'][^"']*["']/i, `href="${pRes.href}"`);
          } else {
            tag = tag.replace(/>$/, ` href="${pRes.href}">`);
          }
          if (targetAttr && !tag.includes("target=")) tag = tag.replace(/>$/, `${targetAttr}>`);
          if (routeAttr && !tag.includes("data-route-to=")) tag = tag.replace(/>$/, `${routeAttr}>`);
          return tag;
        },
      );
    }

    // 3. Acción secundaria ("secondary") en el botón secundario / ghost
    if (actionBindings["secondary"] && actionBindings["secondary"].target.kind !== "none") {
      const sRes = resolveTargetUrl(actionBindings["secondary"].target);
      const targetAttr = sRes.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
      const routeAttr = sRes.dataRoute ? ` data-route-to="${sRes.dataRoute}"` : "";

      modified = modified.replace(
        /(<(?:button|a)[^>]*class=["'][^"']*(?:ghost|secondary|outline)[^"']*["'][^>]*)>/i,
        (match) => {
          let tag = match;
          if (/href=["'][^"']*["']/i.test(tag)) {
            tag = tag.replace(/href=["'][^"']*["']/i, `href="${sRes.href}"`);
          } else {
            tag = tag.replace(/>$/, ` href="${sRes.href}">`);
          }
          if (targetAttr && !tag.includes("target=")) tag = tag.replace(/>$/, `${targetAttr}>`);
          if (routeAttr && !tag.includes("data-route-to=")) tag = tag.replace(/>$/, `${routeAttr}>`);
          return tag;
        },
      );
    }

    return modified;
  }

  // Fallback con linkToScene legado
  if (legacyLink) {
    const route = routeForScene(legacyLink);
    return html
      .replace(/href=["'](#[^"']*|javascript:[^"']*)["']/gi, `href="${route}"`)
      .replace(/(<(?:button|a)[^>]*class=["'][^"']*)["']/i, `$1" data-route-to="${route}"`);
  }

  return html;
}

/**
 * 1. ENSAMBLADOR NEXT.JS (App Router / page.tsx)
 * Genera un archivo page.tsx completo y autocontenido con metadatos SEO, orden real y rutas.
 */
export function assembleNextJsPage(inp: AssemblerInputs): string {
  const assigned = getOrderedSections(inp);

  const componentSections = assigned
    .filter((a) => a.comp)
    .map((a) => {
      const comp = a.comp!;
      const rawHtml = applyRoutingLinks(extractSampleHtml(comp), a.actionBindings, a.linkToScene);
      const linkNote = a.linkToScene ? ` — Enlace de navegación a: /${a.linkToScene}` : "";
      return `        {/* Sección: ${a.label} (${a.id}) — Componente: ${comp.name}${linkNote} */}
        <section id="section-${a.id}" className="w-full">
          <div dangerouslySetInnerHTML={{ __html: \`${rawHtml.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\` }} />
        </section>`;
    })
    .join("\n\n");

  const componentCss = assigned
    .filter((a) => a.comp && extractSampleCss(a.comp))
    .map((a) => `/* ${a.comp!.name} */\n${extractSampleCss(a.comp!)}`)
    .join("\n\n");

  const rev = inp.revision || 1;
  const hash = inp.documentHash || "sha256:preview-deterministic";

  return `/**
 * DOCUMENT MANIFEST — GOLDEN PATH STUDIO
 * Project: ${inp.brandName} | Route: ${routeForScene(inp.scene)} | Scene: ${SCENE_LABEL[inp.scene]}
 * Revision: r${rev} | Hash: ${hash}
 * Engine: Golden Path Verification Runtime v2.4.0
 */
import type { Metadata } from "next";
import type { DocumentManifest } from "./projectDocument";

export const metadata: Metadata = {
  title: "${inp.brandName} — ${SCENE_LABEL[inp.scene]}",
  description: "Diseñado y ensamblado en local con Golden Path Studio para ${inp.brandName}.",
  viewport: "width=device-width, initial-scale=1.0",
};

export const documentManifest: DocumentManifest = {
  projectId: "${inp.brandName}",
  revision: ${rev},
  schemaVersion: 1,
  documentHash: "${hash}",
  engineVersion: "2.4.0",
  generatedAt: "${new Date().toISOString()}",
};

export default function ${inp.scene.charAt(0).toUpperCase() + inp.scene.slice(1)}Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: \`
${inp.cssTokens}

${componentCss}
      \` }} />

      <main className="min-h-screen w-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] font-sans antialiased selection:bg-[var(--color-accent)] selection:text-black">
${componentSections || "        <div className=\"p-8 text-center\">No hay componentes asignados en esta escena.</div>"}
      </main>
    </>
  );
}
`;
}

/**
 * 2. ENSAMBLADOR ASTRO (index.astro)
 * Genera un archivo index.astro listo para producción en Astro.
 */
export function assembleAstroPage(inp: AssemblerInputs): string {
  const assigned = getOrderedSections(inp);

  const componentSections = assigned
    .filter((a) => a.comp)
    .map((a) => {
      const comp = a.comp!;
      const rawHtml = applyRoutingLinks(extractSampleHtml(comp), a.actionBindings, a.linkToScene);
      const linkNote = a.linkToScene ? ` — Enlace: /${a.linkToScene}` : "";
      return `      <!-- Sección: ${a.label} (${a.id}) — ${comp.name}${linkNote} -->
      <section id="section-${a.id}" class="w-full">
        <Fragment set:html={\`${rawHtml.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\`} />
      </section>`;
    })
    .join("\n\n");

  const componentCss = assigned
    .filter((a) => a.comp && extractSampleCss(a.comp))
    .map((a) => `/* ${a.comp!.name} */\n${extractSampleCss(a.comp!)}`)
    .join("\n\n");

  const rev = inp.revision || 1;
  const hash = inp.documentHash || "sha256:preview-deterministic";

  return `---
// index.astro — Golden Path Studio
// Project: ${inp.brandName} | Route: ${routeForScene(inp.scene)} | Scene: ${SCENE_LABEL[inp.scene]}
// DocumentManifest: revision=r${rev}, hash=${hash}, engine=GoldenPath-2.4.0
const title = "${inp.brandName} — ${SCENE_LABEL[inp.scene]}";
const description = "Diseñado y ensamblado con Golden Path Studio.";
const manifest = { projectId: "${inp.brandName}", revision: ${rev}, documentHash: "${hash}" };
---
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
    <style is:global>
${inp.cssTokens}

${componentCss}
    </style>
  </head>
  <body class="min-h-screen w-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
${componentSections || "    <div class=\"p-8 text-center\">No hay componentes asignados.</div>"}
  </body>
</html>
`;
}

/**
 * 3. ENSAMBLADOR HTML AUTOSUFICIENTE (index.html)
 */
export function assembleHtmlPage(inp: AssemblerInputs): string {
  const assigned = getOrderedSections(inp);

  const componentSections = assigned
    .filter((a) => a.comp)
    .map((a) => {
      const comp = a.comp!;
      const rawHtml = applyRoutingLinks(extractSampleHtml(comp), a.actionBindings, a.linkToScene);
      return `    <!-- Sección: ${a.label} (${a.id})${a.linkToScene ? ` — Enlace: /${a.linkToScene}` : ""} -->
    <section id="section-${a.id}" style="width:100%">
      ${rawHtml}
    </section>`;
    })
    .join("\n\n");

  const componentCss = assigned
    .filter((a) => a.comp && extractSampleCss(a.comp))
    .map((a) => `/* ${a.comp!.name} */\n${extractSampleCss(a.comp!)}`)
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${inp.brandName} — ${SCENE_LABEL[inp.scene]}</title>
  <meta name="description" content="Diseñado con Golden Path Studio para ${inp.brandName}.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <style>
${inp.cssTokens}

${componentCss}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: var(--color-bg, #050505);
      color: var(--color-text, #f2f2f5);
      font-family: var(--font-body, 'Inter', sans-serif);
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
${componentSections || "  <div style=\"padding:32px;text-align:center\">No hay componentes asignados.</div>"}
</body>
</html>
`;
}

/**
 * 4. PUENTE IA: PROMPT MAESTRO ESTRUCTURADO CON TOKENS Y CÓDIGO REAL
 * Formateado para Claude 3.7 / Cursor / v0 / Antigravity con cero alucinación de clases.
 */
export function generateSceneMasterPrompt(inp: AssemblerInputs): string {
  const rc = inp.resolvedConfig;
  const assigned = getOrderedSections(inp);

  const slotsList = assigned
    .map((a) => `- **${a.label}** (\`${a.id}\`): ${a.comp ? `Componente: \`${a.comp.name}\` (${a.comp.category || "ui"})${a.linkToScene ? ` [Navega a: \`${a.linkToScene}\`]` : ""}` : "Vacío / Pendiente de asignación"}`)
    .join("\n");

  const codeBlocks = assigned
    .filter((a) => a.comp)
    .map((a) => {
      const comp = a.comp!;
      const rawHtml = applyRoutingLinks(extractSampleHtml(comp).trim(), a.actionBindings, a.linkToScene);
      const rawCss = extractSampleCss(comp).trim();
      return `### Sección: ${a.label} (${a.id})${a.linkToScene ? ` — Enlace: /${a.linkToScene}` : ""}
- Componente: \`${comp.name}\`
- Categoría: \`${comp.category || "ui"}\`
- Fuente: \`${comp.source || "local"}\`

\`\`\`html
${rawHtml}
\`\`\`
${rawCss ? `\n\`\`\`css\n${rawCss}\n\`\`\`` : ""}
`;
    })
    .join("\n\n");

  return `# PROMPT MAESTRO DE UI — ${inp.brandName.toUpperCase()}
> Especificación de alta fidelidad generada por Golden Path Studio.
> Pásalo a tu agente de IA (Claude 3.7 / Cursor / v0.dev / Antigravity) para construir o extender esta escena con exactitud matemática.

═══════════════════════════════════════════════════════════════════════════════
1. CONTEXTO DE MARCA Y TOKENS EXACTOS (WCAG AAA APROBADO)
═══════════════════════════════════════════════════════════════════════════════
- Marca: **${inp.brandName}**
- Escena objetivo: **${SCENE_LABEL[inp.scene]}** (\`${inp.scene}\`)
- Modo preferido: **${inp.theme}**
- Fondo principal (\`--color-bg\`): \`${rc.visual.colorBg}\`
- Texto principal (\`--color-text\`): \`${rc.visual.colorText}\`
- Acento de acción (\`--color-primary\`): \`${rc.visual.colorPrimary}\`
- Tipografía Base: \`${rc.visual.fontBody}\`
- Tipografía Títulos: \`${rc.visual.fontHeading}\`
- Radio de botón: \`${rc.visual.radiusButton}\`
- Radio de tarjeta: \`${rc.visual.radiusCard}\`
- Densidad: \`${rc.visual.density}\`

### Variables CSS del Sistema de Diseño:
\`\`\`css
${inp.cssTokens}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
2. TOPOLOGÍA Y ESTRUCTURA DE LA ESCENA (${SCENE_LABEL[inp.scene]})
═══════════════════════════════════════════════════════════════════════════════
${slotsList}

═══════════════════════════════════════════════════════════════════════════════
3. CÓDIGO REAL DE LOS COMPONENTES ACTIVOS (USAR COMO REFERENCIA DIRECTA)
═══════════════════════════════════════════════════════════════════════════════
${codeBlocks || "*(No hay componentes fijados actualmente; genera secciones coherentes con los tokens).*"}

═══════════════════════════════════════════════════════════════════════════════
4. REGLAS DURAS PARA LA IA
═══════════════════════════════════════════════════════════════════════════════
1. **Consumo estricto de Tokens**: Usa SIEMPRE las variables CSS anteriores (\`var(--color-bg)\`, \`var(--color-text)\`, etc.) o clases Tailwind adaptadas. NUNCA inventes colores hex ni uses clases genéricas de Bootstrap/Tailwind con colores hardcodeados (como \`bg-blue-500\` o \`text-gray-900\`).
2. **Tipografía**: Títulos deben usar \`${rc.visual.fontHeading}\` y cuerpo \`${rc.visual.fontBody}\`.
3. **Móvil y Responsive**: Usa diseño fluido con \`clamp()\` para títulos y paddings. Asegura soporte táctil y mobile-first.
4. **Acabado Premium**: Bordes sutiles con \`color-mix(in srgb, var(--color-text) 10%, transparent)\`, fondos con \`backdrop-filter: blur(12px)\` en navbars/tarjetas, micro-animaciones suaves en hover.
`;
}
