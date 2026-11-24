import resvgWasm from "./resvg.wasm";
import * as hb from "./harfbuzz-index.js";
import * as resvg from "@resvg/resvg-wasm";
import opentype from "opentype.js";

let resvgReady = false;
let fontCache = new Map();
let otFontCache = new Map();

export async function initEngines() {
  if (!resvgReady) {
    await resvg.initWasm(resvgWasm);
    resvgReady = true;
  }
}

export const THEMES = {
  classic: { name: "کلاسیک", text: "#111111", bg: "#fbf8ef", border: "#e5dec9" },
  gold: { name: "طلا و زر", text: "#d4af37", bg: "#0f1115", border: "#2d2412" },
  night: { name: "شب نیلی", text: "#e2e8f0", bg: "#0f172a", border: "#1e293b" },
  rose: { name: "گل سرخ", text: "#881337", bg: "#fff1f2", border: "#fecdd3" },
  emerald: { name: "زمردین", text: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
  azure: { name: "لاجورد", text: "#1e3a8a", bg: "#eff6ff", border: "#bfdbfe" },
  sticker: { name: "استیکر شفاف", text: "#d4af37", bg: "transparent", border: "transparent" },
  transparent: { name: "شفاف", text: "#111111", bg: "transparent", border: "transparent" }
};

export const FONTS = {
  "iran-nastaliq": { name: "ایران نستعلیق", key: "font:iran-nastaliq" },
  "noto-nastaliq": { name: "نستعلیق نوستو", key: "font:noto-nastaliq" }
};

export async function getFont(env, fontKey = "iran-nastaliq") {
  if (fontCache.has(fontKey) && otFontCache.has(fontKey)) {
    return {
      fontBuffer: fontCache.get(fontKey),
      otFont: otFontCache.get(fontKey)
    };
  }

  const kvKey = FONTS[fontKey]?.key || "font:iran-nastaliq";
  const data = await env.PREFS.get(kvKey, { type: "arrayBuffer" });
  if (!data) {
    throw new Error(`Font data not found in KV for key: ${kvKey}`);
  }

  const otFont = opentype.parse(data);
  fontCache.set(fontKey, data);
  otFontCache.set(fontKey, otFont);

  return { fontBuffer: data, otFont };
}

function shapeSegment(hb, font, otFont, text, fontSize, upem) {
  const scale = fontSize / upem;
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  buffer.setDirection(hb.Direction.RTL);
  buffer.setScript(hb.otTagToScript("arab"));
  buffer.setLanguage("fa");
  hb.shape(font, buffer);

  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();

  let glyphs = [];
  let cursorX = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < infos.length; i++) {
    const gid = infos[i].codepoint;
    const pos = positions[i];
    const gx = cursorX + pos.xOffset * scale;
    const gy = pos.yOffset * scale;

    const glyph = otFont.glyphs.get(gid);
    if (glyph) {
      const bbox = glyph.getBoundingBox();
      if (bbox.x1 !== 0 || bbox.x2 !== 0 || bbox.y1 !== 0 || bbox.y2 !== 0) {
        minX = Math.min(minX, gx + bbox.x1 * scale);
        maxX = Math.max(maxX, gx + bbox.x2 * scale);
        minY = Math.min(minY, gy + bbox.y1 * scale);
        maxY = Math.max(maxY, gy + bbox.y2 * scale);
      }
    }
    glyphs.push({ gid, gx, gy });
    cursorX += pos.xAdvance * scale;
  }
  

  if (minX === Infinity) {
    minX = 0; maxX = cursorX; minY = 0; maxY = fontSize;
  }

  return {
    glyphs,
    width: maxX - minX,
    naturalWidth: cursorX,
    minX,
    maxX,
    minY,
    maxY,
    scale
  };
}

export async function renderNastaliq(env, rawText, options = {}) {
  await initEngines();
  const {
    fontKey = "iran-nastaliq",
    theme = "classic",
    fontSize = 54,
    padding = 60,
    transparent = false
  } = options;

  const { fontBuffer, otFont } = await getFont(env, fontKey);
  const selectedTheme = THEMES[theme] || THEMES.classic;
  const isTransparent = transparent || selectedTheme.bg === "transparent";

  const blob = new hb.Blob(fontBuffer);
  const face = new hb.Face(blob);
  const font = new hb.Font(face);

  // Normalize couplets: replace // with newline
  const normalizedText = rawText.replace(/\s*\/\/\s*/g, "\n");
  const rawLines = normalizedText.split("\n");
  const isPoetry = rawLines.some(l => l.includes("/"));

  let items = [];
  let maxCol1 = 0;
  let maxCol2 = 0;
  let maxAscent = 0;
  let minDescent = 0;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      items.push({ type: "empty" });
      continue;
    }

    if (trimmed.includes("/")) {
      const parts = trimmed.split("/").map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // Hemistich 1 (Right) and Hemistich 2 (Left)
        const h1 = shapeSegment(hb, font, otFont, parts[0], fontSize, face.upem);
        const h2 = shapeSegment(hb, font, otFont, parts[1], fontSize, face.upem);
        maxCol1 = Math.max(maxCol1, h1.width);
        maxCol2 = Math.max(maxCol2, h2.width);
        maxAscent = Math.max(maxAscent, h1.maxY, h2.maxY);
        minDescent = Math.min(minDescent, h1.minY, h2.minY);
        items.push({ type: "couplet", h1, h2 });
        continue;
      }
    }

    const h = shapeSegment(hb, font, otFont, trimmed, fontSize, face.upem);
    maxCol1 = Math.max(maxCol1, h.width);
    maxAscent = Math.max(maxAscent, h.maxY);
    minDescent = Math.min(minDescent, h.minY);
    items.push({ type: "single", h });
  }

  
  
  

  const centerGap = isPoetry ? Math.max(80, fontSize * 1.6) : 0;
  const contentWidth = isPoetry
    ? Math.max(maxCol1 + centerGap + maxCol2, 420)
    : Math.max(maxCol1, 260);

  const lineSpacing = fontSize * 1.65;
  const coupletExtraGap = isPoetry ? fontSize * 0.8 : 0;

  let svgPaths = [];
  let currentY = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];

    if (item.type === "empty") {
      currentY += lineSpacing;
      continue;
    }

    if (item.type === "couplet") {
      // Poetry Layout:
      // Column 1 (Right): starts at (maxCol2 + centerGap) and right-aligns
      const col1Origin = maxCol2 + centerGap;
      const h1BaseX = col1Origin + (maxCol1 - item.h1.width) - item.h1.minX;

      // Column 2 (Left): starts at 0 and right-aligns
      const h2BaseX = (maxCol2 - item.h2.width) - item.h2.minX;

      for (const g of item.h1.glyphs) {
        const glyph = otFont.glyphs.get(g.gid);
        if (glyph) {
          const d = glyph.getPath(padding + h1BaseX + g.gx, padding + maxAscent + currentY - g.gy, fontSize).toPathData(2);
          if (d) svgPaths.push(`<path d="${d}" fill="${selectedTheme.text}"/>`);
        }
      }

      for (const g of item.h2.glyphs) {
        const glyph = otFont.glyphs.get(g.gid);
        if (glyph) {
          const d = glyph.getPath(padding + h2BaseX + g.gx, padding + maxAscent + currentY - g.gy, fontSize).toPathData(2);
          if (d) svgPaths.push(`<path d="${d}" fill="${selectedTheme.text}"/>`);
        }
      }

      // Add couplet gap between consecutive couplets
      const isNextCouplet = idx < items.length - 1 && items[idx + 1].type === "couplet";
      currentY += lineSpacing + (isNextCouplet ? coupletExtraGap : 0);
    } else if (item.type === "single") {
      // Centered prose/single hemistich
      const singleBaseX = (contentWidth - item.h.width) / 2 - item.h.minX;
      for (const g of item.h.glyphs) {
        const glyph = otFont.glyphs.get(g.gid);
        if (glyph) {
          const d = glyph.getPath(padding + singleBaseX + g.gx, padding + maxAscent + currentY - g.gy, fontSize).toPathData(2);
          if (d) svgPaths.push(`<path d="${d}" fill="${selectedTheme.text}"/>`);
        }
      }
      currentY += lineSpacing;
    }
  }

  const width = Math.ceil(contentWidth + padding * 2);
  const height = Math.ceil(currentY - lineSpacing + maxAscent - minDescent + padding * 2);

  const bgElement = isTransparent
    ? ""
    : `<rect width="100%" height="100%" fill="${selectedTheme.bg}" rx="16" stroke="${selectedTheme.border}" stroke-width="2"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bgElement}
  <g>
    ${svgPaths.join("\n    ")}
  </g>
</svg>`;

  const rsvg = new resvg.Resvg(svg);
  const pngBuffer = rsvg.render().asPng();

  return {
    svg,
    pngBuffer,
    width,
    height,
    isPoetry,
    isTransparent,
    theme: selectedTheme
  };
}
