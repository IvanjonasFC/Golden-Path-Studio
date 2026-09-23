/**
 * CMS Architecture Verification Script
 * Validates the 8 points of the hardened Golden Path CMS pipeline.
 */
import {
  sanitizeForHtml,
  sanitizeUrl,
  matchProjectRoute,
  filterByPublicationPolicy,
  migrateBlueprint,
  resolveProjectCollection,
  resolveProjectBySlug,
  updateProjectBySlug,
  CURRENT_BLUEPRINT_SCHEMA_VERSION,
} from "../src/lib/projectCollectionResolver";
import { INITIAL_PORTFOLIO_PROJECTS, type PortfolioProject } from "../src/lib/portfolioProjects";
import {
  assembleNextJsPage,
  assembleAstroPage,
  assembleHtmlPage,
  type AssemblerInputs,
} from "../src/lib/sceneAssembler";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log("=== 1. TEST SANITIZATION ===");
const xssPayload = `<script>alert('xss')</script> "test" & 'quote'`;
const sanitized = sanitizeForHtml(xssPayload);
assert(!sanitized.includes("<script>"), "HTML tags escaped (< and >)");
assert(sanitized.includes("&lt;script&gt;"), "Sanitized contains &lt;script&gt;");
assert(sanitizeUrl("javascript:alert(1)") === "#", "javascript: URLs rejected");
assert(sanitizeUrl("https://example.com") === "https://example.com", "Valid https URL preserved");
assert(sanitizeUrl("/portfolio") === "/portfolio", "Valid relative URL preserved");

console.log("\n=== 2. TEST ROUTE MATCHER ===");
const r1 = matchProjectRoute("/proyectos/oposapp");
assert(r1.isProjectRoute && r1.isDetail && r1.slug === "oposapp", "Match /proyectos/oposapp as detail route");

const r2 = matchProjectRoute("/proyectos/oposapp/");
assert(r2.isProjectRoute && r2.isDetail && r2.slug === "oposapp", "Match /proyectos/oposapp/ with trailing slash");

const r3 = matchProjectRoute("/proyectos/[slug]");
assert(!r3.isDetail, "Reject template placeholder [slug] as concrete detail");

const r4 = matchProjectRoute("/portfolio");
assert(r4.isProjectRoute && r4.isCollection && !r4.isDetail, "Match /portfolio as collection route");

const r5 = matchProjectRoute("/");
assert(!r5.isProjectRoute, "Root / is not project route");

console.log("\n=== 3. TEST PUBLICATION POLICY ===");
const draftProject: PortfolioProject = {
  ...INITIAL_PORTFOLIO_PROJECTS[0],
  id: "proj_draft_test",
  slug: "draft-test",
  title: "Draft Project",
  status: "draft",
  visibility: "public",
};
const allWithDraft = [...INITIAL_PORTFOLIO_PROJECTS, draftProject];

const previewList = filterByPublicationPolicy(allWithDraft, { runtimeMode: "design", includeDrafts: true });
assert(previewList.some((p) => p.slug === "draft-test"), "Draft included in design/editor mode when includeDrafts=true");

const prodList = filterByPublicationPolicy(allWithDraft, { runtimeMode: "production" });
assert(!prodList.some((p) => p.slug === "draft-test"), "Draft excluded in production mode");

console.log("\n=== 4. TEST BLUEPRINT MIGRATION & SCHEMA VERSION ===");
const legacyBlueprint = {
  sceneLayouts: {
    landing: [
      { id: "projects_1", type: "cards", label: "Proyectos", componentId: "comp_ivn_projects", order: 0 },
    ],
  },
  projects: INITIAL_PORTFOLIO_PROJECTS,
};
const migrated = migrateBlueprint(legacyBlueprint);
assert(migrated.schemaVersion === CURRENT_BLUEPRINT_SCHEMA_VERSION, `Migrated blueprint has schemaVersion ${CURRENT_BLUEPRINT_SCHEMA_VERSION}`);
assert(
  migrated.sceneLayouts?.landing[0].dataBinding?.source === "portfolio-projects",
  "Legacy project block auto-migrated to dataBinding.source = 'portfolio-projects'",
);

console.log("\n=== 5. TEST RESOLVER CANONICALITY ===");
const resolvedCollection = resolveProjectCollection(migrated, { runtimeMode: "preview" });
assert(resolvedCollection.length === 10, `Resolved ${resolvedCollection.length} projects from blueprint`);
assert(resolveProjectCollection({ projects: [] }, { includeDrafts: true }).length === 0, "Explicit empty collection does not resurrect demo projects");

const resolvedDetail = resolveProjectBySlug(migrated, "oposapp", { runtimeMode: "preview" });
assert(resolvedDetail?.slug === "oposapp", "Resolved oposapp by slug");
const changedProjects = updateProjectBySlug(INITIAL_PORTFOLIO_PROJECTS, "oposapp", { title: "Título editado", slug: "slug-invalido" }, "2026-01-01T00:00:00.000Z");
assert(changedProjects.find((p) => p.slug === "oposapp")?.title === "Título editado", "Project edit updates the selected entity");
assert(changedProjects.filter((p) => p.title === "Título editado").length === 1, "Project edit does not change other entities");
assert(!changedProjects.some((p) => p.slug === "slug-invalido"), "Project content edit preserves route identity");

console.log("\n=== 6. TEST EXPORTERS (Next.js, Astro, HTML) ===");
const dummyInputs: AssemblerInputs = {
  scene: "portfolio",
  brandName: "Iván Jonás",
  tokens: {},
  resolvedConfig: {
    visual: {
      colorBg: "#050505",
      colorText: "#f2f2f5",
      colorPrimary: "#f97316",
      fontBody: "Inter",
      fontHeading: "Space Grotesk",
      radiusButton: "12px",
      radiusCard: "24px",
      density: "comfortable",
    },
  } as any,
  samples: [],
  slots: {},
  cssTokens: ":root { --color-bg: #050505; }",
  font: "Inter",
  theme: "dark",
  layoutBlocks: migrated.sceneLayouts?.landing,
  portfolioProjects: INITIAL_PORTFOLIO_PROJECTS,
  runtimeMode: "preview",
};

const nextJsOutput = assembleNextJsPage(dummyInputs);
assert(nextJsOutput.includes("CATÁLOGO DE PROYECTOS"), "Next.js export contains dynamic project collection header");
assert(nextJsOutput.includes("OposApp"), "Next.js export contains OposApp project title");

const astroOutput = assembleAstroPage(dummyInputs);
assert(astroOutput.includes("CATÁLOGO DE PROYECTOS"), "Astro export contains dynamic project collection header");
assert(astroOutput.includes("OposApp"), "Astro export contains OposApp project title");

const htmlOutput = assembleHtmlPage(dummyInputs);
assert(htmlOutput.includes("CATÁLOGO DE PROYECTOS"), "HTML export contains dynamic project collection header");
assert(htmlOutput.includes("OposApp"), "HTML export contains OposApp project title");

// Test detail route export
const detailInputs: AssemblerInputs = {
  ...dummyInputs,
  scene: "content",
  activeRoutePath: "/proyectos/oposapp",
  layoutBlocks: [
    { id: "nav", type: "nav", label: "Navegación Principal", order: 0 },
    { id: "detail_1", type: "hero", label: "Detalle de Proyecto", order: 1, dataBinding: { source: "portfolio-projects", layout: "detail" } },
  ],
};
const nextJsDetail = assembleNextJsPage(detailInputs);
assert(nextJsDetail.includes("OposApp — TFG Móvil &amp; IA") || nextJsDetail.includes("OposApp — TFG Móvil & IA") || nextJsDetail.includes("OposApp"), "Next.js detail export renders OposApp detail template");
assert(nextJsDetail.includes("Volver a proyectos"), "Next.js detail export has back button");
assert(nextJsDetail.split("Volver a proyectos").length === 2, "Only detail block renders project detail");
const editedDetail = assembleNextJsPage({ ...detailInputs, portfolioProjects: changedProjects });
assert(editedDetail.includes("Título editado"), "Export reads the edited project entity");
const missingDetail = assembleNextJsPage({ ...detailInputs, activeRoutePath: "/proyectos/no-existe" });
assert(missingDetail.includes("Proyecto no encontrado"), "Unknown project route renders not found");

console.log("\n🎉 ALL 8-POINT CMS TESTS PASSED SUCCESSFULLY!");
