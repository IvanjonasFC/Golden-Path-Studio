/**
 * Motor de design tokens (formato DTCG / W3C).
 *
 * - Un token es { $value, $type, $description? } y los grupos son objetos anidados.
 * - Los valores pueden usar ALIAS: "{color.primitive.violet-600}" -> se resuelven en compilación.
 * - Compila el mismo documento a varias plataformas: CSS variables, Tailwind v4 @theme,
 *   Android (colors.xml + dimens.xml) y un objeto JS. Esa es la clave de "que funcione igual".
 *
 * Sin dependencias: es un compilador enfocado (no necesita Style Dictionary para el runtime).
 */

export type TokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "number"
  | "shadow"
  | "string";

export interface Token {
  $value: string | number;
  $type?: TokenType;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
}

export type TokenGroup = { [key: string]: TokenGroup | Token };

export interface ResolvedToken {
  path: string;
  value: string;
  type: TokenType;
  description?: string;
  deprecated?: boolean | string;
}

const ALIAS_RE = /\{([^}]+)\}/g;

function isToken(node: unknown): node is Token {
  return !!node && typeof node === "object" && "$value" in (node as object);
}

/** Aplana el árbol DTCG a una lista de tokens con su path "a.b.c". */
function flatten(group: TokenGroup, prefix = "", out: Record<string, Token> = {}) {
  for (const [key, node] of Object.entries(group)) {
    if (key.startsWith("$")) continue; // metadatos de grupo
    const path = prefix ? `${prefix}.${key}` : key;
    if (isToken(node)) out[path] = node as Token;
    else if (node && typeof node === "object") flatten(node as TokenGroup, path, out);
  }
  return out;
}

/** Resuelve todos los tokens (incluidos aliases anidados) a valores finales. */
export function resolveTokens(doc: TokenGroup): ResolvedToken[] {
  const flat = flatten(doc);
  const cache = new Map<string, string>();

  function raw(path: string): Token | undefined {
    return flat[path];
  }

  function resolve(path: string, seen: Set<string>): string {
    if (cache.has(path)) return cache.get(path)!;
    const tok = raw(path);
    if (!tok) return `/* token no encontrado: ${path} */`;
    if (seen.has(path)) return `/* alias cíclico: ${path} */`;
    seen.add(path);

    let value = String(tok.$value);
    value = value.replace(ALIAS_RE, (_m, ref) => resolve(String(ref).trim(), seen));

    seen.delete(path);
    cache.set(path, value);
    return value;
  }

  return Object.keys(flat)
    .sort()
    .map((path) => {
      const tok = flat[path];
      return {
        path,
        value: resolve(path, new Set()),
        type: (tok.$type ?? inferType(String(tok.$value))) as TokenType,
        description: tok.$description,
        deprecated: tok.$deprecated,
      };
    });
}

function inferType(v: string): TokenType {
  if (/^#|^rgb|^hsl/i.test(v)) return "color";
  if (/^-?\d+(\.\d+)?(px|rem|em|%)$/.test(v)) return "dimension";
  return "string";
}

/* --------------------------- Nombres de variable --------------------------- */

export function cssVar(path: string): string {
  return "--" + path.replace(/\./g, "-").replace(/[^a-zA-Z0-9-]/g, "-");
}

function androidName(path: string): string {
  return path.replace(/[.\-]/g, "_").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

/** dimension -> dp de Android (px 1:1, rem*16, sin unidad = px). */
function toDp(value: string): string {
  const m = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/);
  if (!m) return value;
  const n = parseFloat(m[1]);
  const unit = m[2];
  const dp = unit === "rem" || unit === "em" ? n * 16 : n;
  return `${Number.isInteger(dp) ? dp : dp.toFixed(1)}dp`;
}

function toCamelCase(str: string): string {
  return str
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

function swiftColorName(path: string): string {
  return "brand" + toCamelCase(path.replace(/^color\./, ""));
}

function composeColorName(path: string): string {
  const c = toCamelCase(path.replace(/^color\./, ""));
  return c.charAt(0).toLowerCase() + c.slice(1);
}

function toComposeColorHex(value: string): string {
  const v = value.trim();
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    if (hex.length === 3) {
      return `0xFF${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
    }
    if (hex.length === 6) {
      return `0xFF${hex}`.toUpperCase();
    }
    if (hex.length === 8) {
      return `0x${hex}`.toUpperCase();
    }
  }
  return `0xFF888888`;
}

function toSwiftFloat(value: string): string {
  const m = value.trim().match(/^(-?\d+(?:\.\d+)?)/);
  if (!m) return "8.0";
  const num = parseFloat(m[1]);
  return Number.isInteger(num) ? `${num}.0` : `${num}`;
}

function toComposeDp(value: string): string {
  const m = value.trim().match(/^(-?\d+(?:\.\d+)?)/);
  if (!m) return "8.dp";
  const num = parseFloat(m[1]);
  return `${Number.isInteger(num) ? num : num.toFixed(1)}.dp`;
}

/* ------------------------------- Compilación ------------------------------- */

/* ------------------------------- Efectos/fondo ------------------------------ */

export interface EffectsConfig {
  /** Fondo base: color sólido (usa color.bg) o degradado lineal/radial. */
  background?: { type?: "solid" | "linear" | "radial"; from?: string; to?: string; angle?: string };
  /** Patrón superpuesto. */
  pattern?: { type?: "none" | "grid" | "dots"; color?: string; size?: string };
  /** Luz radial (glow), opcionalmente animada. */
  glow?: { enabled?: boolean; color?: string; intensity?: number; animated?: boolean };
  /** Grano / film grain. */
  grain?: { enabled?: boolean; opacity?: number };
  /** Viñeta (oscurecido en los bordes). */
  vignette?: { enabled?: boolean; intensity?: number };
  /** Degradado de marca para títulos (.brand-gradient). */
  gradient?: { from?: string; to?: string; angle?: string };
  /** Legacy: se mapea a pattern:grid si no hay pattern. */
  grid?: { enabled?: boolean; color?: string; size?: string };
}

export const DEFAULT_EFFECTS: EffectsConfig = {
  background: { type: "solid", from: "#0F0F12", to: "#050505", angle: "180deg" },
  pattern: { type: "grid", color: "rgba(255,255,255,0.02)", size: "34px" },
  glow: { enabled: true, color: "#f0a470", intensity: 0.12, animated: true },
  grain: { enabled: true, opacity: 0.045 },
  vignette: { enabled: false, intensity: 0.35 },
  gradient: { from: "#f4ae7c", to: "#e89055", angle: "135deg" },
};

/** Presets de fondo listos para aplicar (solo tocan efectos, no los colores). */
export const EFFECT_PRESETS: Record<string, EffectsConfig> = {
  "Portfolio (rejilla + luz)": DEFAULT_EFFECTS,
  Minimal: {
    background: { type: "solid" },
    pattern: { type: "none" },
    glow: { enabled: false },
    grain: { enabled: false },
    vignette: { enabled: false },
  },
  Puntos: {
    background: { type: "solid" },
    pattern: { type: "dots", color: "rgba(255,255,255,0.06)", size: "22px" },
    glow: { enabled: false },
    grain: { enabled: true, opacity: 0.03 },
  },
  Aurora: {
    background: { type: "radial", from: "#1b1030", to: "#050505" },
    pattern: { type: "none" },
    glow: { enabled: true, color: "#8b5cf6", intensity: 0.22, animated: true },
    grain: { enabled: true, opacity: 0.04 },
  },
  Viñeta: {
    background: { type: "solid" },
    pattern: { type: "none" },
    glow: { enabled: false },
    vignette: { enabled: true, intensity: 0.5 },
    grain: { enabled: true, opacity: 0.04 },
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex; // ya es rgba/otro formato
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** SVG de grano (film grain) como data-URI, igual que el portfolio. */
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/**
 * Compila los efectos a CSS reutilizable: variables + una "receta" de fondo
 * (.brand-bg) con rejilla, glow radial animado y grano, más .brand-gradient para texto.
 */
export function compileEffects(effectsIn?: EffectsConfig): { vars: string[]; css: string } {
  const legacy = effectsIn?.grid;
  const legacyPattern = legacy
    ? { type: legacy.enabled === false ? "none" : "grid", color: legacy.color, size: legacy.size }
    : undefined;
  const e = {
    background: { ...DEFAULT_EFFECTS.background, ...(effectsIn?.background ?? {}) },
    pattern: { ...DEFAULT_EFFECTS.pattern, ...(effectsIn?.pattern ?? legacyPattern ?? {}) },
    glow: { ...DEFAULT_EFFECTS.glow, ...(effectsIn?.glow ?? {}) },
    grain: { ...DEFAULT_EFFECTS.grain, ...(effectsIn?.grain ?? {}) },
    vignette: { ...DEFAULT_EFFECTS.vignette, ...(effectsIn?.vignette ?? {}) },
    gradient: { ...DEFAULT_EFFECTS.gradient, ...(effectsIn?.gradient ?? {}) },
  };

  const textGradient = `linear-gradient(${e.gradient.angle}, ${e.gradient.from}, ${e.gradient.to})`;
  const vars = [
    `  --pattern-color: ${e.pattern.color};`,
    `  --pattern-size: ${e.pattern.size};`,
    `  --glow-color: ${e.glow.color};`,
    `  --grain-opacity: ${e.grain.enabled ? e.grain.opacity : 0};`,
    `  --gradient-brand: ${textGradient};`,
  ];

  // --- Capas de fondo: patrón (arriba) + base (abajo) ---
  const layers: string[] = [];
  const sizes: string[] = [];
  if (e.pattern.type === "grid") {
    layers.push(
      "linear-gradient(to right, var(--pattern-color) 1px, transparent 1px)",
      "linear-gradient(to bottom, var(--pattern-color) 1px, transparent 1px)",
    );
    sizes.push("var(--pattern-size) var(--pattern-size)", "var(--pattern-size) var(--pattern-size)");
  } else if (e.pattern.type === "dots") {
    layers.push("radial-gradient(var(--pattern-color) 1px, transparent 1px)");
    sizes.push("var(--pattern-size) var(--pattern-size)");
  }
  if (e.background.type === "linear") {
    layers.push(`linear-gradient(${e.background.angle}, ${e.background.from}, ${e.background.to})`);
    sizes.push("100% 100%");
  } else if (e.background.type === "radial") {
    layers.push(`radial-gradient(circle at 50% 0%, ${e.background.from}, ${e.background.to})`);
    sizes.push("100% 100%");
  }
  const bgImage = layers.length ? `\n  background-image:\n    ${layers.join(",\n    ")};` : "";
  const bgSize = sizes.length ? `\n  background-size: ${sizes.join(", ")};` : "";

  // --- Overlay (::before): glow + viñeta ---
  const overlay: string[] = [];
  if (e.glow.enabled) {
    const strong = hexToRgba(String(e.glow.color), Number(e.glow.intensity) || 0.12);
    const weak = hexToRgba(String(e.glow.color), (Number(e.glow.intensity) || 0.12) * 0.6);
    overlay.push(
      `radial-gradient(circle at 50% -8%, ${strong}, transparent 46%)`,
      `radial-gradient(circle at 88% 12%, ${weak}, transparent 42%)`,
    );
  }
  if (e.vignette.enabled) {
    const v = Number(e.vignette.intensity) || 0.35;
    overlay.push(`radial-gradient(circle at 50% 45%, transparent 55%, rgba(0,0,0,${v}) 120%)`);
  }
  const beforeRule = overlay.length
    ? `\n.brand-bg::before {
  content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    ${overlay.join(",\n    ")};${
        e.glow.enabled && e.glow.animated
          ? "\n  animation: brand-glow 8s ease-in-out infinite alternate;"
          : ""
      }
}`
    : "";

  const grainRule = e.grain.enabled
    ? `\n.brand-bg::after {
  content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  opacity: var(--grain-opacity);
  background-image: url("${GRAIN_SVG}");
}`
    : "";

  const css = `
/* --- Fondo de marca (patrón + base + glow + viñeta + grano) --- */
.brand-bg {
  position: relative;
  background-color: var(--color-bg);${bgImage}${bgSize}
}${beforeRule}${grainRule}
.brand-bg > * { position: relative; z-index: 1; }
@keyframes brand-glow {
  0% { transform: translate(0, 0) scale(1); opacity: .8; }
  50% { transform: translate(-5%, 5%) scale(1.05); opacity: 1; }
  100% { transform: translate(5%, -2%) scale(0.95); opacity: .85; }
}
.brand-gradient {
  background: var(--gradient-brand);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
`;
  return { vars, css };
}

export interface CompileResult {
  resolved: ResolvedToken[];
  css: string;
  tailwind: string;
  androidColors: string;
  androidDimens: string;
  swiftUI: string;
  jetpackCompose: string;
  js: string;
  /** CSS del fondo (.brand-bg) + gradiente, ya con los efectos aplicados. */
  bg: string;
}

export function compileSwiftUI(resolved: ResolvedToken[]): string {
  const colorNodes = resolved.filter((t) => t.type === "color" && /^#|^rgb|^hsl/i.test(t.value));
  const dimNodes = resolved.filter((t) => t.type === "dimension");
  const fontNodes = resolved.filter((t) => t.type === "fontFamily");

  const colorProperties = colorNodes
    .map((t) => `    static let ${swiftColorName(t.path)} = Color(hex: "${t.value}")`)
    .join("\n");

  const dimProperties = dimNodes
    .map((t) => `    public static let ${toCamelCase(t.path.replace(/^radius\./, ""))}: CGFloat = ${toSwiftFloat(t.value)}`)
    .join("\n");

  const fontHeading = fontNodes.find((f) => f.path.includes("heading"))?.value || "Inter";
  const fontBody = fontNodes.find((f) => f.path.includes("body"))?.value || "system-ui";

  return `// =========================================================================
// SwiftUI Design Tokens - Golden Path Studio
// Compatible con iOS 16+, macOS 13+, watchOS 9+, visionOS 1+
// =========================================================================

import SwiftUI

public extension Color {
${colorProperties || '    static let brandBg = Color(hex: "#05060A")'}
}

public struct BrandTypography {
    public static let headingFontName = "${fontHeading}"
    public static let bodyFontName = "${fontBody}"
    
    public static func heading(size: CGFloat = 24, weight: Font.Weight = .bold) -> Font {
        return Font.custom(headingFontName, size: size).weight(weight)
    }
    
    public static func body(size: CGFloat = 16, weight: Font.Weight = .regular) -> Font {
        return Font.custom(bodyFontName, size: size).weight(weight)
    }
}

public struct BrandRadii {
${dimProperties || "    public static let button: CGFloat = 8.0\n    public static let card: CGFloat = 12.0"}
}

// Inicializador utilitario Hex para SwiftUI Color
public extension Color {
    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch clean.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255.0,
            green: Double(g) / 255.0,
            blue: Double(b) / 255.0,
            opacity: Double(a) / 255.0
        )
    }
}
`;
}

export function compileJetpackCompose(resolved: ResolvedToken[]): string {
  const colorNodes = resolved.filter((t) => t.type === "color" && /^#|^rgb|^hsl/i.test(t.value));
  const dimNodes = resolved.filter((t) => t.type === "dimension");
  const fontNodes = resolved.filter((t) => t.type === "fontFamily");

  const colorProperties = colorNodes
    .map((t) => `    val ${composeColorName(t.path)} = Color(${toComposeColorHex(t.value)})`)
    .join("\n");

  const shapeProperties = dimNodes
    .map((t) => `    val ${composeColorName(t.path)} = ${toComposeDp(t.value)}`)
    .join("\n");

  const fontHeading = fontNodes.find((f) => f.path.includes("heading"))?.value || "Inter";
  const fontBody = fontNodes.find((f) => f.path.includes("body"))?.value || "Default";

  return `// =========================================================================
// Jetpack Compose Design Tokens - Golden Path Studio
// Compatible con Android Jetpack Compose / Material 3
// =========================================================================

package com.goldenpath.designsystem.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontFamily

object BrandColors {
${colorProperties || "    val bg = Color(0xFF05060A)"}
}

object BrandShapes {
${shapeProperties || "    val buttonRadius = 8.dp\n    val cardRadius = 12.dp"}
}

object BrandTypography {
    const val headingFontFamilyName = "${fontHeading}"
    const val bodyFontFamilyName = "${fontBody}"
    val headingFontFamily = FontFamily.Default
    val bodyFontFamily = FontFamily.Default
}
`;
}

export function compileBrand(doc: TokenGroup): CompileResult {
  const resolved = resolveTokens(doc);

  const effects = compileEffects((doc as { effects?: EffectsConfig }).effects);

  const cssLines = resolved.map((t) => {
    const dep = t.deprecated ? " /* deprecated */" : "";
    return `  ${cssVar(t.path)}: ${t.value};${dep}`;
  });
  const rootBlock = `:root {\n${[...cssLines, ...effects.vars].join("\n")}\n}\n`;
  const css = rootBlock + effects.css;

  // Tailwind v4: los tokens entran como variables de tema dentro de @theme.
  const twLines = resolved
    .filter((t) => t.type === "color" || t.type === "dimension" || t.type === "fontFamily")
    .map((t) => `  ${cssVar(t.path)}: ${t.value};`);
  const tailwind = `@theme {\n${twLines.join("\n")}\n}\n`;

  const colorNodes = resolved.filter((t) => t.type === "color" && /^#|^rgb|^hsl/i.test(t.value));
  const dimNodes = resolved.filter((t) => t.type === "dimension");

  const androidColors =
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n` +
    colorNodes.map((t) => `  <color name="${androidName(t.path)}">${t.value}</color>`).join("\n") +
    `\n</resources>\n`;

  const androidDimens =
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n` +
    dimNodes.map((t) => `  <dimen name="${androidName(t.path)}">${toDp(t.value)}</dimen>`).join("\n") +
    `\n</resources>\n`;

  const swiftUI = compileSwiftUI(resolved);
  const jetpackCompose = compileJetpackCompose(resolved);

  const jsObj: Record<string, string> = {};
  for (const t of resolved) jsObj[t.path] = t.value;
  const js = `export const tokens = ${JSON.stringify(jsObj, null, 2)} as const;\n`;

  return { resolved, css, tailwind, androidColors, androidDimens, swiftUI, jetpackCompose, js, bg: effects.css };
}

/* ------------------------- Edición siguiendo aliases ------------------------ */

function tokenAt(doc: TokenGroup, path: string): Token | undefined {
  let node: TokenGroup | Token | undefined = doc;
  for (const seg of path.split(".")) {
    if (!node || typeof node !== "object" || isToken(node)) return undefined;
    node = (node as TokenGroup)[seg];
  }
  return node && isToken(node) ? (node as Token) : undefined;
}

/** Sigue la cadena de alias hasta el token "hoja" (el primitivo real). */
function leafToken(doc: TokenGroup, path: string, seen = new Set<string>()): Token | undefined {
  const t = tokenAt(doc, path);
  if (!t) return undefined;
  const m = String(t.$value).trim().match(/^\{([^}]+)\}$/);
  if (m && !seen.has(path)) {
    seen.add(path);
    return leafToken(doc, m[1].trim(), seen) ?? t;
  }
  return t;
}

/** Valor final (resuelto) de un token por path. */
export function getResolvedValue(doc: TokenGroup, path: string): string | undefined {
  return resolveTokens(doc).find((t) => t.path === path)?.value;
}

/**
 * Devuelve una copia del documento con el token en `path` actualizado. Si ese token
 * es un alias, edita el PRIMITIVO al final de la cadena — así todo lo que depende de
 * él se recalcula. Ese es el beneficio real del sistema de tokens.
 */
export function setTokenValue(doc: TokenGroup, path: string, value: string): TokenGroup {
  const clone: TokenGroup = structuredClone(doc);
  const leaf = leafToken(clone, path);
  if (leaf) {
    leaf.$value = value;
  } else {
    // Si no existe como leaf o alias, crear la estructura anidada y asignar el token
    const parts = path.split(".");
    let curr = clone as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!curr[p] || typeof curr[p] !== "object") {
        curr[p] = {};
      }
      curr = curr[p] as Record<string, unknown>;
    }
    const lastKey = parts[parts.length - 1];
    if (curr[lastKey] && typeof curr[lastKey] === "object" && isToken(curr[lastKey])) {
      (curr[lastKey] as Token).$value = value;
    } else {
      curr[lastKey] = {
        $value: value,
        $type: inferType(value),
      };
    }
  }
  return clone;
}

/* --------------------------- Utilidades de marca --------------------------- */

/** Sólo las variables :root (para inyectar en el iframe de preview). */
export function cssRootBlock(doc: TokenGroup): string {
  return compileBrand(doc).css;
}

/** Marca por defecto (paleta del portfolio) en forma DTCG, con primitivos + semánticos. */
export function defaultBrandTokens(): TokenGroup {
  const doc: TokenGroup = {
    color: {
      primitive: {
        "ink-950": { $value: "#050505", $type: "color" },
        "ink-900": { $value: "#0b0b0f", $type: "color" },
        "orange-400": { $value: "#f0a470", $type: "color", $description: "Naranja base de marca" },
        "orange-500": { $value: "#e08a50", $type: "color" },
        "orange-300": { $value: "#f4ae7c", $type: "color" },
        "gray-100": { $value: "#f2f2f5", $type: "color" },
        "gray-400": { $value: "#a0a0a0", $type: "color" },
      },
      bg: { $value: "{color.primitive.ink-950}", $type: "color", $description: "Fondo de app" },
      surface: { $value: "{color.primitive.ink-900}", $type: "color" },
      text: { $value: "{color.primitive.gray-100}", $type: "color" },
      muted: { $value: "{color.primitive.gray-400}", $type: "color" },
      action: {
        primary: {
          $value: "{color.primitive.orange-400}",
          $type: "color",
          $description: "Botones, links, focus rings",
        },
        "primary-hover": { $value: "{color.primitive.orange-500}", $type: "color" },
        accent: { $value: "{color.primitive.orange-300}", $type: "color" },
      },
    },
    font: {
      body: { $value: "Inter", $type: "fontFamily" },
      heading: { $value: "Space Grotesk", $type: "fontFamily" },
    },
    radius: {
      sm: { $value: "8px", $type: "dimension" },
      md: { $value: "12px", $type: "dimension" },
      lg: { $value: "16px", $type: "dimension" },
      button: { $value: "{radius.md}", $type: "dimension" },
      card: { $value: "{radius.lg}", $type: "dimension" },
    },
    space: {
      "1": { $value: "4px", $type: "dimension" },
      "2": { $value: "8px", $type: "dimension" },
      "3": { $value: "12px", $type: "dimension" },
      "4": { $value: "16px", $type: "dimension" },
      "6": { $value: "24px", $type: "dimension" },
    },
  };
  (doc as { effects?: EffectsConfig }).effects = structuredClone(DEFAULT_EFFECTS);
  return doc;
}

/** Migra el brandTokens plano (legacy) al documento DTCG. */
export function legacyToDtcg(legacy: Record<string, string | undefined> | null): TokenGroup {
  const d = defaultBrandTokens();
  if (!legacy) return d;
  const c = d.color as TokenGroup;
  const prim = c.primitive as TokenGroup;
  if (legacy.background) (prim["ink-950"] as Token).$value = legacy.background;
  if (legacy.accent) (prim["orange-400"] as Token).$value = legacy.accent;
  if (legacy.accentHover) (prim["orange-500"] as Token).$value = legacy.accentHover;
  if (legacy.foreground) (prim["gray-100"] as Token).$value = legacy.foreground;
  const font = d.font as TokenGroup;
  if (legacy.fontBody) (font.body as Token).$value = legacy.fontBody;
  if (legacy.fontDisplay) (font.heading as Token).$value = legacy.fontDisplay;
  if (legacy.radius) (((d.radius as TokenGroup).md) as Token).$value = legacy.radius;
  return d;
}
