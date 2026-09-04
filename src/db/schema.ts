import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Tabla unica y normalizada para componentes de CUALQUIER fuente y stack.
 * El codigo real vive aqui (columna `files`), por eso el catalogo funciona
 * offline aunque la web original desaparezca.
 */
export const components = sqliteTable(
  "components",
  {
    // id determinista: "<source>:<category>:<slug>"
    id: text("id").primaryKey(),
    source: text("source").notNull(), // uiverse | magicui | aceternity | ...
    // plataforma destino: para poder mezclar web y apps en el mismo gestor
    platform: text("platform").notNull().default("web"), // web | react | android | flutter | react-native | ios
    framework: text("framework").notNull(), // css | tailwind | react | compose | flutter | swiftui ...
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category").notNull(), // Buttons, Cards, background, text-effects...
    type: text("type").notNull(), // css-snippet | registry:ui | registry:block ...
    author: text("author"),
    license: text("license"),
    description: text("description"),

    // JSON serializado (SQLite no tiene arrays nativos)
    tags: text("tags").notNull().default("[]"), // string[]
    dependencies: text("dependencies").notNull().default("[]"), // string[] (npm/gradle/pub...)
    registryDependencies: text("registry_dependencies").notNull().default("[]"), // string[]
    // [{ path, content, target? }] — el codigo fuente completo
    files: text("files").notNull().default("[]"),

    // HTML autocontenido y renderizable (solo Uiverse/CSS). null para React/otros.
    previewHtml: text("preview_html"),
    // Imagen de vista previa (URL) cuando la fuente la ofrece (ThreeUI). Opcional.
    thumbnail: text("thumbnail"),

    sourceUrl: text("source_url"),
    installCommand: text("install_command"),

    ingestedAt: integer("ingested_at").notNull(),
  },
  (t) => ({
    sourceIdx: index("idx_source").on(t.source),
    categoryIdx: index("idx_category").on(t.category),
    platformIdx: index("idx_platform").on(t.platform),
    frameworkIdx: index("idx_framework").on(t.framework),
  }),
);

export type Component = typeof components.$inferSelect;
export type NewComponent = typeof components.$inferInsert;
