import { computeDocumentHash, checkSlotInsertionConflict, type SlotDefinition, type ProjectDocument, type PageNode } from "../src/lib/projectDocument";
import { detectBlockIncompatibilities } from "../src/lib/scenes";
import { assembleNextJsPage, assembleAstroPage } from "../src/lib/sceneAssembler";
import assert from "node:assert";

console.log("==================================================================");
console.log("RUNNING VERIFICATION RUNTIME & COMPOSITION SUITE");
console.log("==================================================================");

let testsPassed = 0;

// Helper to create a normalized PageNode quickly in tests
function makeNode(id: string, type: string, label: string, slotId: string, order: number): PageNode {
  return { id, parentId: null, kind: "component", type, label, slotId, childIds: [], order };
}

// 1. CANONICAL HASH DETERMINISM
console.log("\n[TEST 1] Canonical Document Hash Determinism & Reproducibility");
const docA: Partial<ProjectDocument> = {
  projectId: "brand_test",
  projectName: "Test Brand",
  revision: 1,
  activeRoute: "/portfolio",
  activeSceneId: "portfolio",
  theme: "dark",
  pages: {
    portfolio: {
      id: "page_portfolio",
      route: "/portfolio",
      title: "Portfolio",
      sceneId: "portfolio",
      rootNodeIds: ["node_1", "node_2"],
      nodes: {
        node_1: makeNode("node_1", "hero", "Hero", "hero", 0),
        node_2: makeNode("node_2", "stats", "Stats", "stats", 1),
      }
    }
  }
};

const docB: Partial<ProjectDocument> = {
  // Key order reversed in object, identical semantic structure
  pages: {
    portfolio: {
      rootNodeIds: ["node_1", "node_2"],
      nodes: {
        node_1: makeNode("node_1", "hero", "Hero", "hero", 0),
        node_2: makeNode("node_2", "stats", "Stats", "stats", 1),
      },
      title: "Portfolio",
      route: "/portfolio",
      id: "page_portfolio",
      sceneId: "portfolio"
    }
  },
  theme: "dark",
  revision: 1,
  projectName: "Test Brand",
  activeSceneId: "portfolio",
  activeRoute: "/portfolio",
  projectId: "brand_test"
};

const hashA = computeDocumentHash(docA);
const hashB = computeDocumentHash(docB);
assert.strictEqual(hashA, hashB, "Hashes must be identical regardless of key order");
assert.ok(hashA.length === 64, "Hash must be 64-char hex string (SHA-256)");
console.log(`✓ Deterministic SHA-256 verified: sha256:${hashA.slice(0, 12)}...`);
testsPassed++;

// 2. SLOT CARDINALITY: SINGLE SLOT CONFLICT
console.log("\n[TEST 2] Single Slot Cardinality & Conflict Options");
const navSlot: SlotDefinition = {
  id: "nav",
  label: "Navegación principal",
  expects: "Navbar",
  accepts: ["navigation", "navbar"],
  cardinality: "zero-or-one",
  maxItems: 1,
  insertionPolicy: "replace-existing",
  match: ["nav"],
  query: "nav"
};

const existingNav: PageNode[] = [
  makeNode("nav_existing", "nav", "Navbar Minimal", "nav", 0)
];

const conflictSingle = checkSlotInsertionConflict(
  navSlot,
  existingNav,
  { name: "Navbar eCommerce", category: "navigation" },
  "/"
);

assert.strictEqual(conflictSingle.hasConflict, true, "Must flag single slot conflict when occupied");
assert.strictEqual(conflictSingle.conflictType, "single_slot_occupied");
assert.ok(conflictSingle.resolutionOptions.some(o => o.action === "replace"), "Must provide 'replace' option");
assert.ok(conflictSingle.resolutionOptions.some(o => o.action === "append_additional"), "Must provide 'append_additional' option");
assert.ok(conflictSingle.resolutionOptions.some(o => o.action === "cancel"), "Must provide 'cancel' option");

// C4: append_additional should be disabled when no secondary slots are passed
const appendOpt = conflictSingle.resolutionOptions.find(o => o.action === "append_additional");
assert.strictEqual(appendOpt?.enabled, false, "append_additional must be disabled when no secondary slots available");
assert.ok(appendOpt?.disabledReason, "Must include a disabledReason explanation");

console.log(`✓ Single slot conflict detected: ${conflictSingle.title}`);
console.log(`  Options: ${conflictSingle.resolutionOptions.map(o => `${o.label}${o.enabled ? '' : ' [DISABLED]'}`).join(" | ")}`);
testsPassed++;

// 3. SLOT CARDINALITY: REPEATABLE SLOT APPENDS WITHOUT REPLACING
console.log("\n[TEST 3] Repeatable Slot (Metrics/Cards) Appends Without Replacing");
const metricsSlot: SlotDefinition = {
  id: "stats",
  label: "Métricas",
  expects: "Stats",
  accepts: ["stats", "metric"],
  cardinality: "one-or-more",
  maxItems: 8,
  insertionPolicy: "append",
  match: ["stats"],
  query: "stats"
};

const existingMetrics: PageNode[] = [
  makeNode("m1", "stats", "Ventas", "stats", 0),
  makeNode("m2", "stats", "Clientes", "stats", 1),
];

const conflictRepeatable = checkSlotInsertionConflict(
  metricsSlot,
  existingMetrics,
  { name: "Nueva Métrica", category: "stats" },
  "/"
);

assert.strictEqual(conflictRepeatable.hasConflict, false, "No conflict in repeatable slot with room");
console.log(`✓ No conflict for repeatable slot: ${existingMetrics.length}/8 occupied. Append allowed.`);
testsPassed++;

// 4. SEMANTIC MISMATCH: Stats in Portfolio context
console.log("\n[TEST 4] Semantic Mismatch Warning (Stats in Portfolio Context)");
const conflictSemantic = checkSlotInsertionConflict(
  metricsSlot,
  existingMetrics,
  { name: "Sales Revenue Dashboard", category: "stats" },
  "/portfolio"
);

assert.strictEqual(conflictSemantic.hasConflict, true);
assert.strictEqual(conflictSemantic.conflictType, "semantic_mismatch");
assert.ok(conflictSemantic.resolutionOptions.some(o => o.action === "adapt_content"), "Must suggest 'adapt_content' for portfolio");
console.log(`✓ Semantic mismatch detected with suggested action: ${conflictSemantic.resolutionOptions[0]?.label}`);
testsPassed++;

// 5. DIAGNOSTICS SEVERITY: INFO / WARNING / ERROR
console.log("\n[TEST 5] Block Incompatibility Diagnostics Severity & Actions");
const diagPortfolioStats = detectBlockIncompatibilities("portfolio", {
  id: "b_sales",
  type: "stats",
  label: "Trusted by eCommerce Businesses",
  componentId: "comp_123",
  order: 0
});

assert.strictEqual(diagPortfolioStats.severity, "info", "Stats in portfolio must have 'info' severity (not blocking error)");
assert.strictEqual(diagPortfolioStats.suppressible, true, "Must be suppressible with user justification");
assert.ok(diagPortfolioStats.suggestedActions.length > 0, "Must provide suggested actions");
console.log(`✓ Diagnostic emitted: [${diagPortfolioStats.severity.toUpperCase()}] ${diagPortfolioStats.reason}`);
console.log(`  Suggested actions: ${diagPortfolioStats.suggestedActions.map(a => a.label).join(", ")}`);
testsPassed++;

// 6. EXPORTER REPRODUCIBILITY & MANIFEST HASH EMBEDDING
console.log("\n[TEST 6] Exporters (Next.js & Astro) Embed Canonical DocumentManifest & Hash");
const dummyInputs = {
  scene: "landing" as const,
  brandName: "Golden Brand",
  tokens: {},
  resolvedConfig: {
    interaction: { navigationPattern: "landing" },
    visual: {},
    data: {},
    security: {}
  } as any,
  samples: [],
  slots: {},
  cssTokens: ":root { --color-accent: #6366f1; }",
  font: "Inter",
  theme: "dark" as const,
  layoutBlocks: [
    { id: "hero_1", type: "hero", label: "Hero Principal", order: 0 }
  ],
  revision: 42,
  documentHash: "sha256:" + hashA
};

const nextJsOutput = assembleNextJsPage(dummyInputs);
assert.ok(nextJsOutput.includes("export const documentManifest: DocumentManifest = {"), "Next.js must export documentManifest");
assert.ok(nextJsOutput.includes(`documentHash: "sha256:${hashA}"`), "Next.js manifest must contain exact documentHash");
assert.ok(nextJsOutput.includes("revision: 42"), "Next.js manifest must contain matching revision 42");

const astroOutput = assembleAstroPage(dummyInputs);
assert.ok(astroOutput.includes(`documentHash: "sha256:${hashA}"`), "Astro manifest must contain exact documentHash");
assert.ok(astroOutput.includes("revision: 42"), "Astro manifest must contain matching revision 42");

console.log("✓ Next.js exporter verified: documentManifest embedded with matching revision 42 and hash");
console.log("✓ Astro exporter verified: documentManifest embedded with matching revision 42 and hash");
testsPassed++;

console.log("\n==================================================================");
console.log(`ALL ${testsPassed} VERIFICATION RUNTIME TESTS PASSED SUCCESSFULLY!`);
console.log("==================================================================");
