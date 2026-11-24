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
  azure: { name: "لاجورد", text: "#1e3a8a", bg: "#eff6ff", border: "#bfdbfe" }
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

export async function renderNastaliq(env, text, options = {}) {
  await initEngines();
  const {
    fontKey = "iran-nastaliq",
    theme = "classic",
    fontSize = 64,
    padding = 60
  } = options;

  const { fontBuffer, otFont } = await getFont(env, fontKey);
  const selectedTheme = THEMES[theme] || THEMES.classic;

  const blob = new hb.Blob(fontBuffer);
  const face = new hb.Face(blob);
  const font = new hb.Font(face);

  const scale = fontSize / face.upem;
  const lines = text.split("\n");
  const lineSpacing = fontSize * 1.65;

  let allGlyphs = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  let lineBaseY = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      lineBaseY -= lineSpacing;
      continue;
    }

    const buffer = new hb.Buffer();
    buffer.addText(trimmed);
    buffer.guessSegmentProperties();
    buffer.setDirection(hb.Direction.RTL);
    buffer.setScript(hb.otTagToScript("arab"));
    buffer.setLanguage("fa");
    hb.shape(font, buffer);

    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();

    let cursorX = 0;
    let cursorY = lineBaseY;

    for (let i = 0; i < infos.length; i++) {
      const gid = infos[i].codepoint;
      const pos = positions[i];
      const gx = cursorX + pos.xOffset * scale;
      const gy = cursorY + pos.yOffset * scale;

      const glyph = otFont.glyphs.get(gid);
      if (glyph) {
        const bbox = glyph.getBoundingBox();
        if (bbox.x1 !== 0 || bbox.x2 !== 0 || bbox.y1 !== 0 || bbox.y2 !== 0) {
          const gMinX = gx + bbox.x1 * scale;
          const gMaxX = gx + bbox.x2 * scale;
          const gMaxY = gy + bbox.y2 * scale;
          const gMinY = gy + bbox.y1 * scale;

          minX = Math.min(minX, gMinX);
          maxX = Math.max(maxX, gMaxX);
          minY = Math.min(minY, gMinY);
          maxY = Math.max(maxY, gMaxY);
        }
      }

      allGlyphs.push({ gid, gx, gy });
      cursorX += pos.xAdvance * scale;
      cursorY += pos.yAdvance * scale;
    }

    lineBaseY -= lineSpacing;
  }

  if (minX === Infinity) {
    minX = 0; maxX = 100; minY = 0; maxY = 100;
  }

  const textWidth = maxX - minX;
  const textHeight = maxY - minY;

  const width = Math.max(300, Math.ceil(textWidth + padding * 2));
  const height = Math.max(160, Math.ceil(textHeight + padding * 2));

  // Baseline translation so glyphs fit with padding
  const baselineX = padding - minX;
  const baselineY = padding + maxY;

  const svgPaths = allGlyphs.map(g => {
    const glyph = otFont.glyphs.get(g.gid);
    if (!glyph) return "";
    const pathData = glyph.getPath(baselineX + g.gx, baselineY - g.gy, fontSize).toPathData(2);
    return pathData ? `<path d="${pathData}" fill="${selectedTheme.text}"/>` : "";
  }).filter(Boolean).join("\n    ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${selectedTheme.bg}" rx="16" stroke="${selectedTheme.border}" stroke-width="2"/>
  <g>
    ${svgPaths}
  </g>
</svg>`;

  const rsvg = new resvg.Resvg(svg);
  const pngBuffer = rsvg.render().asPng();

  return {
    svg,
    pngBuffer,
    width,
    height,
    theme: selectedTheme
  };
}
