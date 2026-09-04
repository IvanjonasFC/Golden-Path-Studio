export interface ComponentFile {
  path: string;
  content: string;
  target?: string;
}

/** Forma normalizada que devuelve la API y el MCP (JSON ya parseado). */
export interface ComponentDTO {
  id: string;
  source: string;
  platform: string;
  framework: string;
  name: string;
  slug: string;
  category: string;
  type: string;
  author: string | null;
  license: string | null;
  description: string | null;
  tags: string[];
  dependencies: string[];
  registryDependencies: string[];
  files: ComponentFile[];
  previewHtml: string | null;
  thumbnail: string | null;
  sourceUrl: string | null;
  installCommand: string | null;
  ingestedAt: number;
}

export interface SearchParams {
  q?: string;
  source?: string;
  category?: string;
  platform?: string;
  framework?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  total: number;
  items: ComponentDTO[];
}

export interface BrandVersionDTO {
  id: string;
  brandId: string;
  version: string;
  label?: string | null;
  tokens: any; // DTCG (incluye .blueprint)
  previewIds: string[];
  resolvedConfig?: any | null;   // fuente publicada principal
  draftConfig?: any | null;      // referencia secundaria
  presetId?: string | null;
  coverage?: any | null;         // { global, domains }
  validation?: any | null;       // validationReport completo
  publishedBy?: string | null;
  createdAt: number;
}

export interface BlueprintConfig {
  ui?: {
    components?: string[];
    darkMode?: boolean;
    density?: string;
  };
  navigation?: {
    backStrategy?: string;
    routeGroups?: boolean;
  };
  security?: {
    auth?: string;
    validation?: string;
  };
  architecture?: {
    pattern?: string;
    testing?: string;
  };
  agentRules?: {
    constraints?: string[];
  };
}

export interface BlueprintDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brandId: string | null;
  config: BlueprintConfig;
  createdAt: number;
  updatedAt: number;
}

export interface BlueprintVersionDTO {
  id: string;
  blueprintId: string;
  version: string;
  config: BlueprintConfig;
  brandVersionId: string | null;
  createdAt: number;
}

export interface ProjectGenerationDTO {
  id: string;
  blueprintVersionId: string;
  mode: string;
  target: string;
  outDir: string;
  status: string; // 'created', 'validated', 'failed'
  errorMsg: string | null;
  createdAt: number;
}
