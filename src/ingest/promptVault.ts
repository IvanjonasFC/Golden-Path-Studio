import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SourceAdapter, IngestItem, IngestContext } from "./util";
import { slugify } from "./util";

const CATALOG_PATH = resolve(
  process.env.PROMPTS_CATALOG_PATH ?? "data/prompts-catalog.json",
);
const MOCKUPS_MAP_PATH = resolve("data/mockups-map.json");

interface RawPromptItem {
  id: string;
  title: string;
  category: string;
  type?: string;
  description?: string | null;
  thumbnail?: string | null;
  animatedVideo?: string | null;
  hasPrompt: boolean;
  prompt?: string | null;
  source?: string;
}

function normalizeSource(rawSource?: string): string {
  const s = (rawSource || "").toLowerCase();
  if (s.includes("sceneai")) return "sceneai";
  if (s.includes("iprompt")) return "ipromptui";
  if (s.includes("github") || s.includes("vibe")) return "vibecoding";
  return "promptvault";
}

function detectDependencies(promptText: string): string[] {
  const deps = new Set<string>(["tailwindcss"]);
  const p = promptText.toLowerCase();
  if (p.includes("framer-motion") || p.includes("framer motion") || p.includes("motion.")) {
    deps.add("framer-motion");
  }
  if (p.includes("lucide") || p.includes("icon")) {
    deps.add("lucide-react");
  }
  if (p.includes("three") || p.includes("canvas") || p.includes("webgl")) {
    deps.add("three");
  }
  if (p.includes("canvas-confetti")) {
    deps.add("canvas-confetti");
  }
  return Array.from(deps);
}

function extractTags(item: RawPromptItem): string[] {
  const tags = new Set<string>(["prompt", "vibe-coding"]);
  const cat = (item.category || "").toLowerCase();
  if (cat.includes("hero")) tags.add("hero");
  if (cat.includes("dashboard")) tags.add("dashboard");
  if (cat.includes("bento") || cat.includes("card")) tags.add("bento");
  if (cat.includes("nav") || cat.includes("footer")) tags.add("navigation");
  if (cat.includes("table") || cat.includes("data")) tags.add("table");
  if (cat.includes("form") || cat.includes("input")) tags.add("form");
  if (cat.includes("modal")) tags.add("modal");
  if (item.hasPrompt) tags.add("has-prompt");
  if (item.animatedVideo) tags.add("video");
  return Array.from(tags);
}

export function loadPromptItems(ctx?: IngestContext): IngestItem[] {
  if (!existsSync(CATALOG_PATH)) {
    ctx?.log(`! Archivo no encontrado: ${CATALOG_PATH}`);
    return [];
  }

  const raw = readFileSync(CATALOG_PATH, "utf8");
  const parsed: RawPromptItem[] = JSON.parse(raw);
  ctx?.log(`Cargados ${parsed.length} items desde ${CATALOG_PATH}`);

  let mockupsMap: Record<string, string> = {};
  if (existsSync(MOCKUPS_MAP_PATH)) {
    mockupsMap = JSON.parse(readFileSync(MOCKUPS_MAP_PATH, "utf8"));
  }

  const fence = String.fromCharCode(96, 96, 96);

  return parsed.map((item) => {
    const src = normalizeSource(item.source);
    const slug = slugify(item.title) || item.id;
    const deterministicId = `${src}:${slug}`;
    const deps = item.prompt ? detectDependencies(item.prompt) : ["tailwindcss"];
    const tags = extractTags(item);
    const localMockup = mockupsMap[item.id] || `/assets/videos/landing-pages/${item.id}.svg`;

    const promptFileContent = item.prompt
      ? `# ${item.title}\n\n> **Categoría**: ${item.category} | **Fuente**: ${item.source || src}\n> **Tecnologías recomendadas**: ${deps.join(", ")}\n\n## Prompt de Especificación UI (listo para Claude 3.5 Sonnet / v0.dev / Cursor):\n\n${fence}markdown\n${item.prompt.trim()}\n${fence}\n`
      : `# ${item.title}\n\n> **Categoría**: ${item.category} | **Fuente**: ${item.source || src}\n\n## Descripción:\n${item.description || "Componente y especificación visual de alta fidelidad."}\n\n${item.animatedVideo ? "Vídeo de referencia: " + item.animatedVideo : ""}\n`;

    return {
      id: deterministicId,
      source: src,
      platform: "web",
      framework: "react",
      name: item.title,
      slug,
      category: item.category || "Layout",
      type: item.hasPrompt ? "prompt:component" : "prompt:spec",
      author: item.source || "UI Vault",
      license: "MIT",
      description: item.description || `Prompt de interfaz UI de alta fidelidad: ${item.title}`,
      tags,
      dependencies: deps,
      registryDependencies: [],
      files: [
        {
          path: "PROMPT.md",
          content: promptFileContent,
        },
      ],
      previewHtml: null,
      thumbnail: item.thumbnail || null,
      sourceUrl: item.source === "SceneAI" ? "https://sceneai.art" : "https://ipromptui.com",
      installCommand: item.hasPrompt ? "Prompt listo para Claude 3.5 Sonnet / v0 / Cursor" : null,
    };
  });
}

export const promptVaultAdapter: SourceAdapter = {
  key: "promptvault",
  label: "Prompt Vault (SceneAI, iPromptUI, VibeCoding)",
  async collect(ctx) {
    return loadPromptItems(ctx);
  },
};
