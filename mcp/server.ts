import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchComponents,
  getComponent,
  listFacet,
  totalCount,
} from "../src/lib/query";
import {
  listCollections,
  getCollection,
  getCollectionComponents,
  buildCollectionPrompt,
} from "../src/lib/collections";
import { listBrands, getBrand, compileBrandById } from "../src/lib/brands";

const server = new McpServer({
  name: "component-vault",
  version: "0.1.0",
});

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// --- search_components: descubrir componentes (sin volcar todo el codigo) ---
server.registerTool(
  "search_components",
  {
    title: "Buscar componentes",
    description:
      "Busca componentes UI en el catalogo local (Uiverse, Magic UI, Aceternity...). " +
      "Devuelve metadatos y el comando de instalacion, NO el codigo completo. " +
      "Usa get_component con el id para obtener el codigo.",
    inputSchema: {
      query: z.string().optional().describe("Texto libre: 'boton neon', 'card 3d', 'aurora background'..."),
      source: z.string().optional().describe("Filtra por fuente: uiverse | magicui | aceternity"),
      category: z.string().optional().describe("Buttons, Cards, Backgrounds, Text, Forms, Loaders..."),
      platform: z.string().optional().describe("web | react | android | flutter | react-native"),
      framework: z.string().optional().describe("css | tailwind | react"),
      limit: z.number().int().min(1).max(50).optional().describe("Maximo de resultados (def. 20)"),
    },
  },
  async (args) => {
    const { query, ...rest } = args;
    const { total, items } = searchComponents({ ...rest, q: query, limit: args.limit ?? 20 });
    const slim = items.map((c) => ({
      id: c.id,
      name: c.name,
      source: c.source,
      platform: c.platform,
      framework: c.framework,
      category: c.category,
      description: c.description,
      tags: c.tags,
      dependencies: c.dependencies,
      installCommand: c.installCommand,
      sourceUrl: c.sourceUrl,
    }));
    return text({ total, returned: slim.length, items: slim });
  },
);

// --- get_component: traer el codigo completo listo para pegar ---
server.registerTool(
  "get_component",
  {
    title: "Obtener componente",
    description:
      "Devuelve un componente completo por id, incluido el CODIGO de todos sus ficheros, " +
      "dependencias y comando de instalacion. Ideal para insertarlo en un proyecto.",
    inputSchema: {
      id: z.string().describe("id exacto devuelto por search_components (ej: 'uiverse:Buttons:autor_slug-1')"),
    },
  },
  async ({ id }) => {
    const c = getComponent(id);
    if (!c) return { content: [{ type: "text", text: `No existe el componente con id "${id}".` }], isError: true };
    return text(c);
  },
);

// --- facetas / stats para orientar a la IA ---
server.registerTool(
  "list_catalog_facets",
  {
    title: "Facetas del catalogo",
    description: "Lista fuentes, categorias, plataformas y frameworks disponibles con su recuento. Util antes de buscar.",
    inputSchema: {},
  },
  async () =>
    text({
      total: totalCount(),
      sources: listFacet("source"),
      platforms: listFacet("platform"),
      frameworks: listFacet("framework"),
      categories: listFacet("category"),
    }),
);

// --- list_collections: perfiles/marcas creados por el usuario ---
server.registerTool(
  "list_collections",
  {
    title: "Listar colecciones",
    description:
      "Lista las colecciones/perfiles del usuario (Stack, Marca, Proyecto) con su id, nombre, tipo y numero de componentes. Usa get_collection para traer sus componentes.",
    inputSchema: {},
  },
  async () => text({ items: listCollections() }),
);

// --- get_collection: todos los componentes (con codigo) de un perfil ---
server.registerTool(
  "get_collection",
  {
    title: "Obtener coleccion",
    description:
      "Devuelve una coleccion/perfil por id o slug, con sus tokens de marca y TODOS sus componentes incluido el codigo completo. Uselo para construir un proyecto usando exactamente esos componentes.",
    inputSchema: {
      id: z.string().describe("id o slug de la coleccion (de list_collections)"),
      includeCode: z
        .boolean()
        .optional()
        .describe("Incluir el codigo de cada componente (def. true)"),
    },
  },
  async ({ id, includeCode = true }) => {
    const col = getCollection(id);
    if (!col)
      return { content: [{ type: "text", text: `No existe la coleccion "${id}".` }], isError: true };
    const comps = getCollectionComponents(col.id).map((c) =>
      includeCode
        ? c
        : {
            id: c.id,
            name: c.name,
            source: c.source,
            framework: c.framework,
            category: c.category,
            installCommand: c.installCommand,
          },
    );
    return text({ ...col, components: comps });
  },
);

// --- get_collection_prompt: prompt listo para pasar a una IA ---
server.registerTool(
  "get_collection_prompt",
  {
    title: "Prompt de coleccion",
    description:
      "Devuelve un prompt en markdown, listo para pegar, que instruye a una IA a construir usando exactamente los componentes (y la marca) de la coleccion indicada.",
    inputSchema: { id: z.string().describe("id o slug de la coleccion") },
  },
  async ({ id }) => {
    const col = getCollection(id);
    if (!col)
      return { content: [{ type: "text", text: `No existe la coleccion "${id}".` }], isError: true };
    return { content: [{ type: "text", text: buildCollectionPrompt(col.id) }] };
  },
);

// --- list_brands: marcas (sistemas de design tokens) del usuario ---
server.registerTool(
  "list_brands",
  {
    title: "Listar marcas",
    description:
      "Lista las marcas del usuario (sistemas de design tokens DTCG). Usa get_brand para traer una con sus tokens compilados a CSS/Tailwind/Android.",
    inputSchema: {},
  },
  async () =>
    text({
      items: listBrands().map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description,
      })),
    }),
);

// --- get_brand: una marca con sus tokens compilados, para construir con la identidad ---
server.registerTool(
  "get_brand",
  {
    title: "Obtener marca",
    description:
      "Devuelve una marca por id o slug: su documento DTCG y los tokens COMPILADOS " +
      "(variables CSS, Tailwind @theme, Android colors/dimens). Úsalo para aplicar la " +
      "identidad exacta: usa var(--color-action-primary) y NO inventes colores.",
    inputSchema: {
      id: z.string().describe("id o slug de la marca (de list_brands)"),
    },
  },
  async ({ id }) => {
    const b = getBrand(id);
    if (!b) return { content: [{ type: "text", text: `No existe la marca "${id}".` }], isError: true };
    const compiled = compileBrandById(id);
    return text({
      id: b.id,
      name: b.name,
      slug: b.slug,
      tokens: b.tokens,
      css: compiled?.css,
      tailwind: compiled?.tailwind,
      androidColors: compiled?.androidColors,
      androidDimens: compiled?.androidDimens,
      blueprint: (b.tokens as unknown as { blueprint?: unknown }).blueprint ?? null,
      parts: b.parts,
    });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr para no contaminar el canal stdio (JSON-RPC).
  console.error("[component-vault] servidor MCP listo (stdio).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
