/**
 * Motor de análisis de accesibilidad y contraste según especificación W3C WCAG 2.1.
 * 
 * - Calcula luminancia relativa de colores sRGB (Hex, RGB, RGBA, HSL).
 * - Evalúa ratio de contraste (L1 + 0.05) / (L2 + 0.05) entre 1:1 y 21:1.
 * - Clasifica según umbrales:
 *   - WCAG AAA (Texto normal >= 7.0:1, Texto grande >= 4.5:1)
 *   - WCAG AA  (Texto normal >= 4.5:1, Componentes UI >= 3.0:1)
 * - Proporciona sugerencias de optimización automática para alcanzar AAA (en texto o en fondo).
 * - Simula deficiencias de visión del color (Protanopía, Deuteranopía, Tritanopía, Acromatopsia).
 */

export interface ColorRgb {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export type DeficiencyType = "normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export interface ContrastResult {
  ratio: number;
  ratioFormatted: string;
  passesAaNormal: boolean;   // >= 4.5
  passesAaLarge: boolean;    // >= 3.0
  passesAaaNormal: boolean;  // >= 7.0
  passesAaaLarge: boolean;   // >= 4.5
  grade: "AAA" | "AA" | "AA Large" | "FAIL";
}

export interface PairAudit {
  id: string;
  name: string;
  description: string;
  fgPath: string;
  bgPath: string;
  fgColor: string;
  bgColor: string;
  contrast: ContrastResult;
  suggestedFg?: string;
  suggestedBg?: string;
}

/** Convierte color string a RGB numérico */
export function parseColorToRgb(color: string): ColorRgb | null {
  if (!color || typeof color !== "string") return null;
  const c = color.trim().toLowerCase();

  // Hex: #fff o #ffffff o #ffffffff
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return null;
  }

  // RGB / RGBA: rgb(255, 255, 255) / rgba(0,0,0,0.5)
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
      g: Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
      b: Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
    };
  }

  // HSL: hsl(200, 50%, 50%)
  const hslMatch = c.match(/hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  return null;
}

/** Calcula luminancia relativa sRGB (W3C standard) */
export function getRelativeLuminance(rgb: ColorRgb): number {
  const transformChannel = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = transformChannel(rgb.r);
  const g = transformChannel(rgb.g);
  const b = transformChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Calcula ratio de contraste entre dos colores */
export function getContrastRatio(color1: string, color2: string): ContrastResult {
  const rgb1 = parseColorToRgb(color1) || { r: 255, g: 255, b: 255 };
  const rgb2 = parseColorToRgb(color2) || { r: 0, g: 0, b: 0 };

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const rawRatio = (lighter + 0.05) / (darker + 0.05);
  const ratio = Math.round(rawRatio * 100) / 100;

  const passesAaNormal = ratio >= 4.5;
  const passesAaLarge = ratio >= 3.0;
  const passesAaaNormal = ratio >= 7.0;
  const passesAaaLarge = ratio >= 4.5;

  let grade: ContrastResult["grade"] = "FAIL";
  if (passesAaaNormal) grade = "AAA";
  else if (passesAaNormal) grade = "AA";
  else if (passesAaLarge) grade = "AA Large";

  return {
    ratio,
    ratioFormatted: `${ratio.toFixed(1)}:1`,
    passesAaNormal,
    passesAaLarge,
    passesAaaNormal,
    passesAaaLarge,
    grade,
  };
}

/** Convierte RGB a Hex estándar */
export function rgbToHex(rgb: ColorRgb): string {
  const toHex = (n: number) => {
    const h = Math.round(Math.min(255, Math.max(0, n))).toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Simula la percepción cromática de personas con daltonismo según matrices estándar.
 */
export function simulateColorDeficiency(rgb: ColorRgb, type: DeficiencyType): ColorRgb {
  if (type === "normal") return rgb;

  const { r, g, b } = rgb;

  if (type === "protanopia") {
    // Deficiencia en fotorreceptores L (rojo)
    return {
      r: Math.round(0.56667 * r + 0.43333 * g),
      g: Math.round(0.55833 * r + 0.44167 * g),
      b: Math.round(0.24167 * g + 0.75833 * b),
    };
  }

  if (type === "deuteranopia") {
    // Deficiencia en fotorreceptores M (verde)
    return {
      r: Math.round(0.625 * r + 0.375 * g),
      g: Math.round(0.70 * r + 0.30 * g),
      b: Math.round(0.30 * g + 0.70 * b),
    };
  }

  if (type === "tritanopia") {
    // Deficiencia en fotorreceptores S (azul)
    return {
      r: Math.round(0.95 * r + 0.05 * g),
      g: Math.round(0.43333 * r + 0.56667 * b),
      b: Math.round(0.475 * g + 0.525 * b),
    };
  }

  if (type === "achromatopsia") {
    // Acromatopsia (escala monocromática de luminancia)
    const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    return { r: y, g: y, b: y };
  }

  return rgb;
}

/** Simula un color Hex según la deficiencia visual seleccionada */
export function simulateHex(hexColor: string, type: DeficiencyType): string {
  const rgb = parseColorToRgb(hexColor);
  if (!rgb || type === "normal") return hexColor;
  return rgbToHex(simulateColorDeficiency(rgb, type));
}

/**
 * Ajusta gradualmente la luminosidad de un color (primer plano o fondo)
 * para alcanzar el ratio de accesibilidad objetivo (ej: 7.0 para AAA o 4.5 para AA).
 */
export function suggestAccessibleColor(
  fgColor: string,
  bgColor: string,
  targetRatio = 7.0,
  adjustTarget: "fg" | "bg" = "fg"
): string | undefined {
  const current = getContrastRatio(fgColor, bgColor);
  if (current.ratio >= targetRatio) return undefined;

  const fgRgb = parseColorToRgb(fgColor);
  const bgRgb = parseColorToRgb(bgColor);
  if (!fgRgb || !bgRgb) return undefined;

  if (adjustTarget === "fg") {
    const bgLum = getRelativeLuminance(bgRgb);
    const shouldLighten = bgLum < 0.5;

    let bestHex = rgbToHex(fgRgb);
    let curR = fgRgb.r;
    let curG = fgRgb.g;
    let curB = fgRgb.b;

    for (let step = 0; step < 100; step++) {
      if (shouldLighten) {
        curR = Math.min(255, curR + (255 - curR) * 0.12 + 1);
        curG = Math.min(255, curG + (255 - curG) * 0.12 + 1);
        curB = Math.min(255, curB + (255 - curB) * 0.12 + 1);
      } else {
        curR = Math.max(0, curR * 0.88 - 1);
        curG = Math.max(0, curG * 0.88 - 1);
        curB = Math.max(0, curB * 0.88 - 1);
      }

      const testHex = rgbToHex({ r: curR, g: curG, b: curB });
      const testResult = getContrastRatio(testHex, bgColor);
      if (testResult.ratio >= targetRatio) {
        return testHex;
      }
      bestHex = testHex;
    }

    return shouldLighten ? "#ffffff" : "#05060a";
  } else {
    // Ajustar color de fondo (bg)
    const fgLum = getRelativeLuminance(fgRgb);
    const shouldDarken = fgLum > 0.5;

    let bestHex = rgbToHex(bgRgb);
    let curR = bgRgb.r;
    let curG = bgRgb.g;
    let curB = bgRgb.b;

    for (let step = 0; step < 100; step++) {
      if (shouldDarken) {
        curR = Math.max(0, curR * 0.88 - 1);
        curG = Math.max(0, curG * 0.88 - 1);
        curB = Math.max(0, curB * 0.88 - 1);
      } else {
        curR = Math.min(255, curR + (255 - curR) * 0.12 + 1);
        curG = Math.min(255, curG + (255 - curG) * 0.12 + 1);
        curB = Math.min(255, curB + (255 - curB) * 0.12 + 1);
      }

      const testHex = rgbToHex({ r: curR, g: curG, b: curB });
      const testResult = getContrastRatio(fgColor, testHex);
      if (testResult.ratio >= targetRatio) {
        return testHex;
      }
      bestHex = testHex;
    }

    return shouldDarken ? "#05060a" : "#ffffff";
  }
}

/** Diagnostica si un botón de acción primaria requiere texto blanco u oscuro */
export function checkButtonContrast(actionColor: string) {
  const whiteRatio = getContrastRatio("#ffffff", actionColor);
  const darkRatio = getContrastRatio("#08090d", actionColor);
  const bestColor = whiteRatio.ratio >= darkRatio.ratio ? "#ffffff" : "#08090d";
  const bestRatio = whiteRatio.ratio >= darkRatio.ratio ? whiteRatio : darkRatio;

    return {
    bestColor,
    bestRatio,
    whiteRatio,
    darkRatio,
    isWhitePassing: whiteRatio.passesAaNormal,
    isDarkPassing: darkRatio.passesAaNormal,
  };
}

/** Convierte Hex a HSL numérico */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const rgb = parseColorToRgb(hex) || { r: 0, g: 0, b: 0 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Convierte HSL a Hex estándar */
export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;
  if (sNorm === 0) {
    const val = Math.round(lNorm * 255);
    return rgbToHex({ r: val, g: val, b: val });
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;
  const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hNorm) * 255);
  const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255);
  return rgbToHex({ r, g, b });
}

/** Ajusta la luminosidad de un color en porcentaje (-100 a +100) */
export function adjustLightness(hex: string, deltaL: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newL = Math.max(0, Math.min(100, Math.round(l + deltaL)));
  return hslToHex(h, s, newL);
}
