/**
 * ============================================================================
 * PROJECT DOCUMENT — FUENTE CANÓNICA DE VERDAD DEL RUNTIME DE VERIFICACIÓN (P1)
 *
 * Este módulo establece el contrato único de datos que alimenta de forma
 * reproducible:
 *  1. El Preview Runtime interactivo en el lienzo.
 *  2. El exportador a Next.js 15 (page.tsx).
 *  3. El exportador a Astro (index.astro).
 *  4. El exportador a HTML5 autosuficiente.
 *  5. La suite de auditoría y diagnósticos de calidad.
 *
 * Principio rector:
 * Ningún exportador ni componente del preview consume datos que no provengan
 * de esta especificación canónica.
 *
 * CONDICIONES TÉCNICAS OBLIGATORIAS:
 *  - C1: Hash canónico separado de metadatos volátiles
 *  - C2: Modelo de árbol único normalizado (Record<string, PageNode>)
 *  - C3: Cardinalidad declarada por SlotDefinition, no por nombre
 *  - C4: ConflictResolver solo ofrece opciones estructuralmente válidas
 *  - C7: DeleteCommand con restauración completa de subárbol
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// SLOT & INSERTION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SlotCardinality = "exactly-one" | "zero-or-one" | "one-or-more" | "zero-or-more";

export type InsertionPolicy =
  | "append"
  | "prepend"
  | "insert-before"
  | "insert-after"
  | "replace-existing"
  | "reject";

export interface SlotDefinition {
  id: string;
  label: string;
  expects: string;
  accepts: string[];
  cardinality: SlotCardinality;
  maxItems?: number;
  insertionPolicy: InsertionPolicy;
  exclusiveGroup?: string;
  allowedPageKinds?: string[];
  match: string[];
  query: string;
  render?: "standard" | "triggered";
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION BINDING & LINK TARGET
// ─────────────────────────────────────────────────────────────────────────────

export type LinkTarget =
  | { kind: "scene"; sceneId: string }
  | { kind: "route"; path: string }
  | { kind: "anchor"; blockId: string }
  | { kind: "url"; href: string }
  | { kind: "modal"; modalId: string }
  | { kind: "none" };

export interface BlockActionBinding {
  actionId: string;
  label?: string;
  target: LinkTarget;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE NODE — MODELO NORMALIZADO (C2)
//
// Antes: nodes: PageNode[] con children?: PageNode[] (árbol embebido)
// Ahora: nodes: Record<string, PageNode> con parentId + childIds (flat map)
//
// Invariantes garantizadas:
//  - Un nodo tiene un único parentId.
//  - Un nodo no puede ser hijo de sí mismo ni crear ciclos.
//  - rootNodeIds solo contiene nodos con parentId === null.
//  - childIds representa el orden visual canónico.
// ─────────────────────────────────────────────────────────────────────────────

export interface PageNode {
  id: string;
  parentId: string | null;
  kind: "section" | "layout" | "component" | "slot" | "custom-code";
  /** Backward-compat: maps to old `type` field for renderers */
  type: string;
  label: string;
  slotId: string;
  componentId?: string;
  customHtml?: string;
  childIds: string[];
  order: number;
  props?: Record<string, unknown>;
  actionBindings?: Record<string, BlockActionBinding>;
  visibility?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  layoutConfig?: {
    maxWidth?: string;
    padding?: string;
    gap?: string;
  };
  dataMode?: "static" | "mock" | "dynamic";
  isDemoData?: boolean;
  incompatibleNotice?: string;
  stateOverride?: "default" | "loading" | "empty" | "error";
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE DOCUMENT — MODELO NORMALIZADO (C2)
// ─────────────────────────────────────────────────────────────────────────────

export interface PageDocument {
  id: string;
  route: string;
  title: string;
  sceneId: string;
  isDynamic?: boolean;
  parentPath?: string;
  description?: string;
  rootNodeIds: string[];
  nodes: Record<string, PageNode>;
  metadata?: {
    seoTitle?: string;
    seoDescription?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE & COMPONENT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface RouteDefinition {
  path: string;
  sceneId: string;
  title: string;
  icon?: string;
  isDynamic?: boolean;
  parentPath?: string;
  description?: string;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  acceptsSlots?: string[];
  cardinality?: SlotCardinality;
  defaultProps?: Record<string, unknown>;
  isDemoData?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT MANIFEST (C1) — documentHash vs artifactHash
//
// documentHash: SHA-256 del CanonicalProjectDocument. Idéntico entre preview,
//               Next.js, Astro y HTML porque el contenido fuente es el mismo.
// artifactHash: SHA-256 del código exportado final. Distinto entre exportadores
//               porque los archivos generados son distintos.
// generatedAt y engineVersion son metadatos de la generación, NO del contenido.
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentManifest {
  projectId: string;
  projectName: string;
  brandId: string;
  revision: number;
  schemaVersion: number;
  documentHash: string;
  artifactHash?: string;
  generatedAt: string;
  exportTarget?: "preview" | "nextjs" | "astro" | "html";
  engineVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface SuggestedAction {
  id: string;
  label: string;
  description?: string;
  actionKind: "replace" | "adapt_content" | "remove" | "suppress" | "link_action";
  payload?: Record<string, unknown>;
}

export interface ProjectDiagnostic {
  id: string;
  ruleId: string;
  severity: DiagnosticSeverity;
  nodeId: string;
  nodeLabel: string;
  routeId: string;
  title: string;
  explanation: string;
  suggestedActions: SuggestedAction[];
  suppressible: boolean;
  suppressionReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE COMMAND — RESTAURACIÓN COMPLETA (C7)
//
// El comando de borrado guarda el subárbol completo para undo con
// verificación de revisión para detectar cambios concurrentes.
// ─────────────────────────────────────────────────────────────────────────────

export interface DeleteCommand {
  type: "NODE_DELETE";
  nodeId: string;
  parentId: string | null;
  sceneId: string;
  previousIndex: number;
  /** Snapshot completo del nodo eliminado con todos sus props y bindings */
  deletedNode: PageNode;
  /** Todos los nodos descendientes del nodo eliminado (subárbol aplanado) */
  deletedSubtreeNodes: PageNode[];
  /** Slots que hacían referencia a nodos del subárbol eliminado */
  affectedSlotRefs: Record<string, string>;
  /** Revisión del documento en el momento del borrado, para detectar conflictos en undo */
  revisionAtDelete: number;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT DOCUMENT — Incluye campos volátiles que NO se hashean
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectDocument {
  projectId: string;
  projectName: string;
  brandId: string;
  revision: number;
  schemaVersion: number;
  activeRoute: string;
  activeSceneId: string;
  theme: "dark" | "light";
  // ─── Campos volátiles (excluidos del hash canónico) ───
  viewport: "desktop" | "laptop" | "tablet" | "mobile" | "mobile_s";
  runtimeMode: "design" | "interaction" | "data" | "a11y" | "production";
  dataState: {
    mode: "success" | "loading" | "empty" | "error" | "forbidden";
    recordCount: number;
    source: string;
  };
  selectedBlockId: string | null;
  diagnostics?: ProjectDiagnostic[];
  // ─── Contenido canónico ───
  routes: RouteDefinition[];
  pages: Record<string, PageDocument>;
  tokens: Record<string, unknown>;
  resolvedConfig?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL PROJECT DOCUMENT (C1)
//
// Representación sin campos volátiles que constituye el payload hasheado.
// Pipeline: ProjectDocument → canonicalizeProjectDocument() →
//           CanonicalProjectDocument → stableStringify() → SHA-256
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalPageDocument {
  id: string;
  route: string;
  title: string;
  sceneId: string;
  rootNodeIds: string[];
  nodes: Record<string, CanonicalPageNode>;
}

export interface CanonicalPageNode {
  id: string;
  parentId: string | null;
  kind: string;
  type: string;
  label: string;
  slotId?: string;
  componentId?: string;
  childIds: string[];
  order: number;
  actionBindings?: Record<string, BlockActionBinding>;
  visibility?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
  props?: Record<string, unknown>;
}

export interface CanonicalProjectDocument {
  projectId: string;
  projectName: string;
  brandId: string;
  revision: number;
  schemaVersion: number;
  activeRoute: string;
  activeSceneId: string;
  theme: "dark" | "light";
  routes: RouteDefinition[];
  pages: Record<string, CanonicalPageDocument>;
  tokens: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STABLE STRINGIFY (C1)
//
// Ordena TODAS las claves recursivamente, no solo el nivel superior.
// Garantiza que dos objetos semánticamente idénticos produzcan el mismo string
// independientemente del orden de inserción de propiedades.
// ─────────────────────────────────────────────────────────────────────────────

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((item) => stableStringify(item)).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k]));
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICALIZE PROJECT DOCUMENT (C1)
//
// Extrae solo los campos semánticos del documento, excluyendo:
//  - viewport, runtimeMode, dataState (estado de sesión)
//  - selectedBlockId (selección UI)
//  - diagnostics (resultados de auditoría)
//  - generatedAt, engineVersion (metadatos de exportación)
//  - customHtml, isDemoData, incompatibleNotice (artefactos transitorios)
// ─────────────────────────────────────────────────────────────────────────────

function canonicalizeNode(node: Partial<PageNode>): CanonicalPageNode {
  const canonical: CanonicalPageNode = {
    id: node.id || "",
    parentId: node.parentId ?? null,
    kind: node.kind || "component",
    type: node.type || "section",
    label: node.label || "",
    childIds: Array.isArray(node.childIds) ? [...node.childIds] : [],
    order: typeof node.order === "number" ? node.order : 0,
  };
  if (node.slotId) canonical.slotId = node.slotId;
  if (node.componentId) canonical.componentId = node.componentId;
  if (node.actionBindings && Object.keys(node.actionBindings).length > 0) {
    canonical.actionBindings = node.actionBindings;
  }
  if (node.visibility) canonical.visibility = node.visibility;
  if (node.props && Object.keys(node.props).length > 0) canonical.props = node.props;
  return canonical;
}

function canonicalizePage(page: Partial<PageDocument> | Record<string, unknown>): CanonicalPageDocument {
  const canonicalNodes: Record<string, CanonicalPageNode> = {};
  const rawNodes = (page as { nodes?: unknown }).nodes;

  if (Array.isArray(rawNodes)) {
    for (const node of rawNodes) {
      if (node && typeof node === "object" && (node as PageNode).id) {
        canonicalNodes[(node as PageNode).id] = canonicalizeNode(node as PageNode);
      }
    }
  } else if (rawNodes && typeof rawNodes === "object") {
    for (const [nodeId, node] of Object.entries(rawNodes as Record<string, PageNode>)) {
      if (node) {
        canonicalNodes[nodeId] = canonicalizeNode(node);
      }
    }
  }

  const rootIds = Array.isArray((page as PageDocument).rootNodeIds)
    ? [...(page as PageDocument).rootNodeIds]
    : Object.keys(canonicalNodes);

  return {
    id: (page as PageDocument).id || "",
    route: (page as PageDocument).route || "/",
    title: (page as PageDocument).title || "",
    sceneId: (page as PageDocument).sceneId || "",
    rootNodeIds: rootIds,
    nodes: canonicalNodes,
  };
}

export function canonicalizeProjectDocument(doc: Partial<ProjectDocument>): CanonicalProjectDocument {
  const pages: Record<string, CanonicalPageDocument> = {};
  if (doc.pages) {
    for (const [key, page] of Object.entries(doc.pages)) {
      pages[key] = canonicalizePage(page);
    }
  }
  return {
    projectId: doc.projectId || "default",
    projectName: doc.projectName || "",
    brandId: doc.brandId || "",
    revision: doc.revision || 1,
    schemaVersion: doc.schemaVersion || 1,
    activeRoute: doc.activeRoute || "/",
    activeSceneId: doc.activeSceneId || "landing",
    theme: doc.theme || "dark",
    routes: doc.routes || [],
    pages,
    tokens: doc.tokens || {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE DOCUMENT HASH (C1)
//
// Pipeline completo:
//   ProjectDocument → canonicalizeProjectDocument() →
//   CanonicalProjectDocument → stableStringify() → SHA-256
//
// Usa crypto.subtle (WebCrypto API) que funciona en navegador y Node.js 18+.
// NO se importa node:crypto — incompatible con Webpack del cliente.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SHA-256 puro en JavaScript — sin dependencias de node:crypto.
 * Implementación compacta basada en la especificación FIPS 180-4.
 * Funciona en navegador y Node.js sin ningún import.
 */
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Pure(message: string): string {
  // Convert string to UTF-8 bytes
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const msgLen = msgBytes.length;

  // Pre-processing: adding padding bits
  const bitLen = msgLen * 8;
  // Message needs to be padded to 512-bit blocks (64 bytes)
  // +1 for 0x80 byte, +8 for length, round up to 64
  const totalLen = Math.ceil((msgLen + 9) / 64) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(msgBytes);
  padded[msgLen] = 0x80;

  // Append length as 64-bit big-endian
  const view = new DataView(padded.buffer);
  // For messages < 2^32 bytes, high 32 bits of length are 0
  view.setUint32(totalLen - 4, bitLen, false);

  // Initialize hash values
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  // Process each 512-bit block
  for (let offset = 0; offset < totalLen; offset += 64) {
    // Prepare message schedule
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(w[i - 15], 7)) ^ (rotr(w[i - 15], 18)) ^ (w[i - 15] >>> 3);
      const s1 = (rotr(w[i - 2], 17)) ^ (rotr(w[i - 2], 19)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    // Initialize working variables
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    // Compression function
    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(e, 6)) ^ (rotr(e, 11)) ^ (rotr(e, 25));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = (rotr(a, 2)) ^ (rotr(a, 13)) ^ (rotr(a, 22));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  // Produce the final hash hex string
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => (v >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Hash canónico determinista del contenido semántico del documento.
 * Excluye: viewport, runtimeMode, dataState, selectedBlockId, diagnostics,
 * generatedAt, engineVersion.
 *
 * Usa SHA-256 puro en JS — sin dependencias de node:crypto.
 */
export function computeDocumentHash(doc: Partial<ProjectDocument>): string {
  const canonical = canonicalizeProjectDocument(doc);
  const serialized = stableStringify(canonical);
  return sha256Pure(serialized);
}

/**
 * Hash asíncrono usando WebCrypto API (para uso en navegador moderno).
 * Produce el mismo resultado que computeDocumentHash.
 * Prefiere crypto.subtle cuando está disponible (más rápido para payloads grandes).
 */
export async function computeDocumentHashAsync(doc: Partial<ProjectDocument>): Promise<string> {
  const canonical = canonicalizeProjectDocument(doc);
  const serialized = stableStringify(canonical);

  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const encoder = new TextEncoder();
    const buffer = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(serialized));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback to pure JS
  return sha256Pure(serialized);
}

// ─────────────────────────────────────────────────────────────────────────────
// TREE VALIDATION UTILITIES (C2)
// ─────────────────────────────────────────────────────────────────────────────

export interface TreeValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida las invariantes del árbol normalizado:
 *  1. rootNodeIds solo contiene nodos con parentId === null
 *  2. Cada nodo referenciado en childIds existe en el map
 *  3. Si A tiene B en childIds, B tiene parentId === A
 *  4. No hay ciclos
 *  5. Todos los nodos son alcanzables desde rootNodeIds
 */
export function validatePageTree(page: PageDocument): TreeValidationResult {
  const errors: string[] = [];
  const nodes = page.nodes;

  // 1. rootNodeIds validation
  for (const rootId of page.rootNodeIds) {
    const node = nodes[rootId];
    if (!node) {
      errors.push(`rootNodeIds referencia nodo inexistente: "${rootId}"`);
      continue;
    }
    if (node.parentId !== null) {
      errors.push(`rootNodeIds contiene nodo "${rootId}" con parentId="${node.parentId}" (debería ser null)`);
    }
  }

  // 2-3. childIds and parentId bidirectional consistency
  for (const [nodeId, node] of Object.entries(nodes)) {
    for (const childId of node.childIds) {
      const child = nodes[childId];
      if (!child) {
        errors.push(`Nodo "${nodeId}" referencia hijo inexistente: "${childId}"`);
        continue;
      }
      if (child.parentId !== nodeId) {
        errors.push(`Nodo "${childId}" tiene parentId="${child.parentId}" pero es hijo de "${nodeId}"`);
      }
    }
    // Verify parentId points back
    if (node.parentId !== null) {
      const parent = nodes[node.parentId];
      if (!parent) {
        errors.push(`Nodo "${nodeId}" referencia padre inexistente: "${node.parentId}"`);
      } else if (!parent.childIds.includes(nodeId)) {
        errors.push(`Nodo "${nodeId}" tiene parentId="${node.parentId}" pero no está en los childIds del padre`);
      }
    }
  }

  // 4. Cycle detection via DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();
  function dfs(id: string): boolean {
    if (inStack.has(id)) {
      errors.push(`Ciclo detectado en nodo: "${id}"`);
      return true;
    }
    if (visited.has(id)) return false;
    visited.add(id);
    inStack.add(id);
    const node = nodes[id];
    if (node) {
      for (const childId of node.childIds) {
        if (dfs(childId)) return true;
      }
    }
    inStack.delete(id);
    return false;
  }
  for (const rootId of page.rootNodeIds) {
    dfs(rootId);
  }

  // 5. Reachability — every node should be reachable from roots
  const reachable = new Set<string>();
  function markReachable(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    const node = nodes[id];
    if (node) {
      for (const childId of node.childIds) {
        markReachable(childId);
      }
    }
  }
  for (const rootId of page.rootNodeIds) {
    markReachable(rootId);
  }
  for (const nodeId of Object.keys(nodes)) {
    if (!reachable.has(nodeId)) {
      errors.push(`Nodo huérfano (no alcanzable desde rootNodeIds): "${nodeId}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT RESOLUTION (C3, C4)
//
// La cardinalidad viene del SlotDefinition, no de una lista hardcodeada
// de nombres de slots. Las opciones de resolución solo se incluyen si
// son estructuralmente válidas.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConflictResolutionOption {
  action: "replace" | "append_additional" | "adapt_content" | "cancel";
  label: string;
  description: string;
  enabled: boolean;
  disabledReason?: string;
  isRecommended?: boolean;
}

export interface SlotConflictResult {
  hasConflict: boolean;
  conflictType?: "single_slot_occupied" | "max_capacity_reached" | "semantic_mismatch";
  title?: string;
  description?: string;
  resolutionOptions: ConflictResolutionOption[];
}

/**
 * Evalúa si la inserción de un nuevo componente en un slot produce un conflicto
 * estructural según la cardinalidad del slot y los elementos existentes.
 *
 * C3: La cardinalidad se lee del SlotDefinition, no del nombre del slot.
 * C4: `append_additional` solo se ofrece habilitada si existen slots secundarios
 *     compatibles con capacidad disponible.
 */
export function checkSlotInsertionConflict(
  slot: SlotDefinition,
  existingNodesInSlot: PageNode[],
  incomingComponent: { id?: string; name: string; category?: string },
  pageRoute: string,
  /** Slots alternativos donde podría insertarse como secundario (C4) */
  availableSecondarySlots?: SlotDefinition[],
): SlotConflictResult {
  const count = existingNodesInSlot.length;

  // Determine if secondary insertion is structurally possible
  const hasSecondaryTarget = (availableSecondarySlots || []).some(
    (s) =>
      s.id !== slot.id &&
      (s.cardinality === "zero-or-more" || s.cardinality === "one-or-more") &&
      (!s.maxItems || s.maxItems > 0),
  );

  // 1. Conflicto de Slot Único — basado en cardinality, NO en nombre
  if ((slot.cardinality === "exactly-one" || slot.cardinality === "zero-or-one") && count > 0) {
    const existing = existingNodesInSlot[0];
    return {
      hasConflict: true,
      conflictType: "single_slot_occupied",
      title: `Ya existe un componente en ${slot.label}`,
      description: `El slot "${slot.label}" tiene cardinalidad "${slot.cardinality}". Actualmente tiene asignado "${existing.label}".`,
      resolutionOptions: [
        {
          action: "replace",
          label: "Sustituir el existente",
          description: `Reemplaza "${existing.label}" por "${incomingComponent.name}".`,
          enabled: true,
          isRecommended: true,
        },
        {
          action: "append_additional",
          label: "Añadir en slot secundario",
          description: hasSecondaryTarget
            ? `Inserta "${incomingComponent.name}" en un slot compatible alternativo.`
            : `No hay slots secundarios compatibles disponibles.`,
          enabled: hasSecondaryTarget,
          disabledReason: hasSecondaryTarget ? undefined : "No existen slots alternativos con capacidad disponible en este layout.",
        },
        {
          action: "cancel",
          label: "Cancelar",
          description: "Mantiene la composición intacta.",
          enabled: true,
        },
      ],
    };
  }

  // 2. Capacidad máxima alcanzada en slots repetibles
  if (slot.maxItems && count >= slot.maxItems) {
    return {
      hasConflict: true,
      conflictType: "max_capacity_reached",
      title: `Capacidad máxima alcanzada (${count}/${slot.maxItems})`,
      description: `El contenedor de "${slot.label}" no admite más de ${slot.maxItems} elementos para preservar el layout responsive.`,
      resolutionOptions: [
        {
          action: "replace",
          label: "Reemplazar el último elemento",
          description: `Sustituye "${existingNodesInSlot[count - 1]?.label || "el elemento"}" por "${incomingComponent.name}".`,
          enabled: true,
          isRecommended: true,
        },
        {
          action: "append_additional",
          label: "Añadir en slot alternativo",
          description: hasSecondaryTarget
            ? `Inserta en un slot compatible con capacidad.`
            : `No hay slots alternativos con capacidad.`,
          enabled: hasSecondaryTarget,
          disabledReason: hasSecondaryTarget ? undefined : "Todos los slots compatibles están al máximo de capacidad.",
        },
        {
          action: "cancel",
          label: "Cancelar",
          description: "No se inserta el componente.",
          enabled: true,
        },
      ],
    };
  }

  // 3. Aviso de incompatibilidad semántica contextual
  if (pageRoute.includes("portfolio")) {
    const cat = (incomingComponent.category || "").toLowerCase();
    const name = incomingComponent.name.toLowerCase();
    if (cat.includes("stat") || cat.includes("kpi") || name.includes("sales") || name.includes("revenue")) {
      return {
        hasConflict: true,
        conflictType: "semantic_mismatch",
        title: "Aviso de Composición Semántica",
        description: `"${incomingComponent.name}" contiene métricas de ventas. En la ruta Portfolio personal suele requerirse métricas de proyectos o experiencia.`,
        resolutionOptions: [
          {
            action: "adapt_content",
            label: "Añadir adaptando contenido al portfolio",
            description: "Convierte métricas de ventas en: '12 proyectos', '4 años exp', '18 tecnologías'.",
            enabled: true,
            isRecommended: true,
          },
          {
            action: "append_additional",
            label: "Añadir con datos originales de muestra",
            description: "Inserta el bloque tal cual y lo marca con advertencia de Demo Data.",
            enabled: true,
          },
          {
            action: "cancel",
            label: "Cancelar",
            description: "Buscar un componente más afín.",
            enabled: true,
          },
        ],
      };
    }
  }

  return { hasConflict: false, resolutionOptions: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION HELPERS
//
// Funciones para convertir entre el modelo antiguo (array/tree) y el nuevo
// modelo normalizado (Record<string, PageNode> + rootNodeIds).
// ─────────────────────────────────────────────────────────────────────────────

/** Legacy PageNode format (array with embedded children) */
interface LegacyPageNode {
  id: string;
  type: string;
  label: string;
  slotId: string;
  componentId?: string;
  customHtml?: string;
  order: number;
  props?: Record<string, unknown>;
  actionBindings?: Record<string, BlockActionBinding>;
  visibility?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
  layoutConfig?: { maxWidth?: string; padding?: string; gap?: string };
  dataMode?: "static" | "mock" | "dynamic";
  isDemoData?: boolean;
  incompatibleNotice?: string;
  stateOverride?: "default" | "loading" | "empty" | "error";
  children?: LegacyPageNode[];
}

/**
 * Convierte un array de nodos legacy (con children embebido) al modelo
 * normalizado (Record<string, PageNode> + rootNodeIds).
 */
export function migrateNodesToNormalized(
  legacyNodes: LegacyPageNode[],
): { rootNodeIds: string[]; nodes: Record<string, PageNode> } {
  const nodes: Record<string, PageNode> = {};
  const rootNodeIds: string[] = [];

  function processNode(legacy: LegacyPageNode, parentId: string | null): void {
    const childIds: string[] = [];
    if (legacy.children) {
      for (const child of legacy.children) {
        childIds.push(child.id);
      }
    }

    const normalized: PageNode = {
      id: legacy.id,
      parentId,
      kind: inferKind(legacy.type),
      type: legacy.type,
      label: legacy.label,
      slotId: legacy.slotId,
      childIds,
      order: legacy.order,
    };

    // Copy optional fields
    if (legacy.componentId) normalized.componentId = legacy.componentId;
    if (legacy.customHtml) normalized.customHtml = legacy.customHtml;
    if (legacy.props) normalized.props = legacy.props;
    if (legacy.actionBindings) normalized.actionBindings = legacy.actionBindings;
    if (legacy.visibility) normalized.visibility = legacy.visibility;
    if (legacy.layoutConfig) normalized.layoutConfig = legacy.layoutConfig;
    if (legacy.dataMode) normalized.dataMode = legacy.dataMode;
    if (legacy.isDemoData !== undefined) normalized.isDemoData = legacy.isDemoData;
    if (legacy.incompatibleNotice) normalized.incompatibleNotice = legacy.incompatibleNotice;
    if (legacy.stateOverride) normalized.stateOverride = legacy.stateOverride;

    nodes[legacy.id] = normalized;

    if (parentId === null) {
      rootNodeIds.push(legacy.id);
    }

    // Process children recursively
    if (legacy.children) {
      for (const child of legacy.children) {
        processNode(child, legacy.id);
      }
    }
  }

  for (const node of legacyNodes) {
    processNode(node, null);
  }

  return { rootNodeIds, nodes };
}

function inferKind(type: string): PageNode["kind"] {
  const t = type.toLowerCase();
  if (t.includes("section") || t.includes("hero") || t.includes("footer") || t.includes("nav")) return "section";
  if (t.includes("layout") || t.includes("grid") || t.includes("container")) return "layout";
  if (t.includes("slot")) return "slot";
  if (t.includes("custom") || t.includes("html") || t.includes("code")) return "custom-code";
  return "component";
}

/**
 * Collects all nodes in a subtree starting from a given node ID.
 * Used by DeleteCommand to snapshot the full subtree for undo.
 */
export function collectSubtreeNodes(nodeId: string, nodesMap: Record<string, PageNode>): PageNode[] {
  const result: PageNode[] = [];
  const node = nodesMap[nodeId];
  if (!node) return result;

  function collect(id: string) {
    const n = nodesMap[id];
    if (!n) return;
    result.push({ ...n, childIds: [...n.childIds] });
    for (const childId of n.childIds) {
      collect(childId);
    }
  }
  collect(nodeId);
  return result;
}
