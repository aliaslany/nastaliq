import resvgWasm from "./resvg.wasm";
import * as hb from "./harfbuzz-index.js";
import * as resvg from "@resvg/resvg-wasm";
import opentype from "opentype.js";
import { applyArabicPresentationForms, stretchWithKashida } from "./arabic-forms.js";
import { FONTS, THEMES, buildThemeVisuals, resolveRatio } from "./themes.js";

export { FONTS, THEMES };

let resvgReady = false;
const fontCache = new Map();

const MAX_TEXT_CHARS = 1200;
const MAX_LINES = 24;

export async function initEngines() {
  if (!resvgReady) {
    await resvg.initWasm(resvgWasm);
    resvgReady = true;
  }
}

export async function getFont(env, fontKey = "iran-nastaliq") {
  const safeKey = FONTS[fontKey] ? fontKey : "iran-nastaliq";
  if (fontCache.has(safeKey)) {
    return fontCache.get(safeKey);
  }

  const kvKey = FONTS[safeKey].key;
  const data = await env.PREFS.get(kvKey, { type: "arrayBuffer" });
  if (!data) {
    throw new Error(`Font data not found in KV for key: ${kvKey}`);
  }

  const otFont = opentype.parse(data);
  const hbBlob = new hb.Blob(data);
  const hbFace = new hb.Face(hbBlob);
  const hbFont = new hb.Font(hbFace);

  const entry = { fontBuffer: data, otFont, hbFace, hbFont, upem: hbFace.upem };
  fontCache.set(safeKey, entry);
  return entry;
}

/**
 * Inspect PNG or JPEG binary header to read pixel dimensions without decoding.
 */
export function extractImageDimensions(uint8) {
  if (!uint8 || uint8.length < 24) return null;
  // PNG signature: 89 50 4E 47
  if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47) {
    const view = new DataView(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    return { width: view.getUint32(16, false), height: view.getUint32(20, false), mime: "image/png" };
  }
  // JPEG SOI: FF D8
  if (uint8[0] === 0xFF && uint8[1] === 0xD8) {
    let i = 2;
    while (i + 9 < uint8.length) {
      if (uint8[i] !== 0xFF) break;
      const marker = uint8[i + 1];
      if (marker === 0xD9 || marker === 0xDA) break;
      const len = (uint8[i + 2] << 8) | uint8[i + 3];
      // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
      if ((marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        const height = (uint8[i + 5] << 8) | uint8[i + 6];
        const width = (uint8[i + 7] << 8) | uint8[i + 8];
        return { width, height, mime: "image/jpeg" };
      }
      if (len < 2) break;
      i += 2 + len;
    }
  }
  return null;
}

function shapeSegment(fontEntry, rawText, fontSize) {
  const { otFont, hbFont, upem } = fontEntry;
  const shapedInput = applyArabicPresentationForms(rawText, otFont);
  const scale = fontSize / upem;

  const buffer = new hb.Buffer();
  buffer.addText(shapedInput);
  buffer.guessSegmentProperties();
  buffer.setDirection(hb.Direction.RTL);
  buffer.setScript(hb.otTagToScript("arab"));
  buffer.setLanguage("fa");
  hb.shape(hbFont, buffer);

  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();

  const glyphs = [];
  let cursorX = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

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
    minX = 0;
    maxX = cursorX;
    minY = 0;
    maxY = fontSize;
  }

  return {
    text: rawText,
    glyphs,
    width: maxX - minX,
    naturalWidth: cursorX,
    minX,
    maxX,
    minY,
    maxY,
  };
}

/**
 * Gently stretch a short hemistich toward targetWidth using valid Kashida slots
 * without ever overshooting targetWidth.
 */
function justifyHemistich(fontEntry, rawText, fontSize, targetWidth) {
  const initial = shapeSegment(fontEntry, rawText, fontSize);
  if (initial.width >= targetWidth * 0.92 || rawText.length < 4) {
    return initial;
  }

  const probe = shapeSegment(fontEntry, stretchWithKashida(rawText, 1), fontSize);
  const deltaPerTatweel = probe.width - initial.width;
  if (deltaPerTatweel <= 0.5) {
    return initial;
  }

  const gap = targetWidth * 0.96 - initial.width;
  const repeats = Math.min(10, Math.max(1, Math.floor(gap / deltaPerTatweel)));
  const stretched = shapeSegment(fontEntry, stretchWithKashida(rawText, repeats), fontSize);
  return stretched.width <= targetWidth * 1.03 ? stretched : initial;
}

/**
 * Wrap long single prose lines by word count/width while preserving short lines & poetry.
 */
function wrapProseLine(fontEntry, line, fontSize, maxWidthPx) {
  const words = line.trim().split(/\s+/);
  if (words.length <= 4) return [line.trim()];

  const whole = shapeSegment(fontEntry, line.trim(), fontSize);
  if (whole.width <= maxWidthPx) return [line.trim()];

  const wrapped = [];
  let current = "";

  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (current && shapeSegment(fontEntry, candidate, fontSize).width > maxWidthPx) {
      wrapped.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) wrapped.push(current);
  return wrapped;
}

function calculateCanvasSize(naturalW, naturalH, ratio, customAspect = null) {
  let finalW = naturalW;
  let finalH = naturalH;

  const r = resolveRatio(ratio) || "auto";
  let targetAspect = customAspect;

  if (!targetAspect) {
    if (r === "square") targetAspect = 1;
    else if (r === "story") targetAspect = 9 / 16;
    else if (r === "horizontal") targetAspect = 16 / 9;
  }

  if (targetAspect && targetAspect > 0) {
    if (naturalW / naturalH > targetAspect) {
      finalW = naturalW;
      finalH = Math.ceil(naturalW / targetAspect);
    } else {
      finalH = naturalH;
      finalW = Math.ceil(naturalH * targetAspect);
    }
  }

  return {
    finalW,
    finalH,
    offsetX: Math.round((finalW - naturalW) / 2),
    offsetY: Math.round((finalH - naturalH) / 2),
    normalizedRatio: r
  };
}

function renderGlyphGroup(otFont, seg, baseX, baseY, fontSize, fillAttr) {
  const paths = [];
  for (const g of seg.glyphs) {
    const glyph = otFont.glyphs.get(g.gid);
    if (!glyph) continue;
    const d = glyph.getPath(baseX + g.gx, baseY - g.gy, fontSize).toPathData(2);
    if (d) paths.push(`<path d="${d}" fill="${fillAttr}"/>`);
  }
  return paths;
}

export async function renderNastaliq(env, rawInputText, options = {}) {
  await initEngines();

  const {
    fontKey = "iran-nastaliq",
    theme = "classic",
    fontSize: rawFontSize = 54,
    padding: rawPadding = 64,
    transparent = false,
    ratio = "auto",
    justify = false,
    signature: explicitSignature = "",
    fgColor = null,
    bgColor = null,
    frame = null,
    hd = true,
    maxSide = null,
    format = "png",
    bgImageBase64 = null,
    bgImageMime = "image/jpeg",
    bgImageAspect = null,
  } = options;

  const fontSize = Math.min(120, Math.max(24, Number(rawFontSize) || 54));
  const selectedTheme = THEMES[theme] || THEMES.classic;
  const isTransparent = transparent || selectedTheme.bg === "transparent";
  const hasOrnateFrame = !isTransparent && !bgImageBase64 && (frame === "tazhib" || selectedTheme.frame === "tazhib");
  const padding = hasOrnateFrame ? Math.max(rawPadding, 76) : rawPadding;

  const fontEntry = await getFont(env, fontKey);
  const { otFont } = fontEntry;

  // Bounded input preprocessing & signature extraction (`-- شاعر`)
  const clampedInput = String(rawInputText || "").slice(0, MAX_TEXT_CHARS);
  let normalizedText = clampedInput.replace(/\s*\/\/\s*/g, "\n");
  let rawLines = normalizedText.split("\n").slice(0, MAX_LINES);

  let signatureText = (explicitSignature || "").trim().slice(0, 80);
  if (!signatureText && rawLines.length > 1) {
    const lastTrim = rawLines[rawLines.length - 1].trim();
    const sigMatch = lastTrim.match(/^(?:--|—)\s*(.+)$/);
    if (sigMatch) {
      signatureText = sigMatch[1].trim();
      rawLines = rawLines.slice(0, -1);
    }
  }

  const isPoetry = rawLines.some(l => l.includes("/"));
  const items = [];
  let maxCol1 = 0;
  let maxCol2 = 0;
  let maxAscent = 0;
  let minDescent = 0;

  const maxProseWidth = Math.max(760, fontSize * 14);

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      items.push({ type: "empty" });
      continue;
    }

    if (trimmed.includes("/")) {
      const parts = trimmed.split("/").map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const h1 = shapeSegment(fontEntry, parts[0], fontSize);
        const h2 = shapeSegment(fontEntry, parts[1], fontSize);
        maxCol1 = Math.max(maxCol1, h1.width);
        maxCol2 = Math.max(maxCol2, h2.width);
        maxAscent = Math.max(maxAscent, h1.maxY, h2.maxY);
        minDescent = Math.min(minDescent, h1.minY, h2.minY);
        items.push({ type: "couplet", text1: parts[0], text2: parts[1], h1, h2 });
        continue;
      }
    }

    const wrappedLines = wrapProseLine(fontEntry, trimmed, fontSize, maxProseWidth);
    for (const wl of wrappedLines) {
      const h = shapeSegment(fontEntry, wl, fontSize);
      maxCol1 = Math.max(maxCol1, h.width);
      maxAscent = Math.max(maxAscent, h.maxY);
      minDescent = Math.min(minDescent, h.minY);
      items.push({ type: "single", h });
    }
  }

  // Optional smart Kashida balancing across poetry columns
  if (justify && isPoetry) {
    for (const item of items) {
      if (item.type !== "couplet") continue;
      item.h1 = justifyHemistich(fontEntry, item.text1, fontSize, maxCol1);
      item.h2 = justifyHemistich(fontEntry, item.text2, fontSize, maxCol2);
      maxCol1 = Math.max(maxCol1, item.h1.width);
      maxCol2 = Math.max(maxCol2, item.h2.width);
      maxAscent = Math.max(maxAscent, item.h1.maxY, item.h2.maxY);
      minDescent = Math.min(minDescent, item.h1.minY, item.h2.minY);
    }
  }

  const centerGap = isPoetry ? Math.max(76, fontSize * 1.5) : 0;
  const contentWidth = isPoetry
    ? Math.max(maxCol1 + centerGap + maxCol2, 420)
    : Math.max(maxCol1, 260);

  const lineSpacing = fontSize * 1.65;
  const coupletExtraGap = isPoetry ? fontSize * 0.75 : 0;

  let sigSeg = null;
  const sigFontSize = Math.round(fontSize * 0.56);
  if (signatureText) {
    sigSeg = shapeSegment(fontEntry, `— ${signatureText}`, sigFontSize);
  }

  // Natural height includes main block + optional signature line below
  let currentY = 0;
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (item.type === "empty") {
      currentY += lineSpacing;
    } else if (item.type === "couplet") {
      const isNextCouplet = idx < items.length - 1 && items[idx + 1].type === "couplet";
      currentY += lineSpacing + (isNextCouplet ? coupletExtraGap : 0);
    } else {
      currentY += lineSpacing;
    }
  }

  const sigExtraHeight = sigSeg ? sigFontSize * 1.45 : 0;
  const naturalWidth = Math.ceil(Math.max(contentWidth, sigSeg ? sigSeg.width + 20 : 0) + padding * 2);
  const naturalHeight = Math.ceil(Math.max(0, currentY - lineSpacing) + maxAscent - minDescent + sigExtraHeight + padding * 2);

  const effectiveBgAspect = !isTransparent && bgImageBase64 ? bgImageAspect : null;
  const { finalW, finalH, offsetX, offsetY, normalizedRatio } = calculateCanvasSize(
    naturalWidth,
    naturalHeight,
    ratio,
    effectiveBgAspect
  );

  const visuals = buildThemeVisuals(selectedTheme, finalW, finalH, {
    isTransparent,
    fgColor,
    bgColor,
    frameOverride: frame,
    bgImageBase64: isTransparent ? null : bgImageBase64,
    bgImageMime
  });

  // Generate vector paths centered nicely inside the natural box
  const svgPaths = [];
  let yCursor = 0;
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (item.type === "empty") {
      yCursor += lineSpacing;
      continue;
    }

    if (item.type === "couplet") {
      const col1Origin = maxCol2 + centerGap;
      const h1BaseX = padding + col1Origin + (maxCol1 - item.h1.width) - item.h1.minX;
      const h2BaseX = padding + (maxCol2 - item.h2.width) - item.h2.minX;
      const baselineY = padding + maxAscent + yCursor;

      svgPaths.push(...renderGlyphGroup(otFont, item.h1, h1BaseX, baselineY, fontSize, visuals.inkFill));
      svgPaths.push(...renderGlyphGroup(otFont, item.h2, h2BaseX, baselineY, fontSize, visuals.inkFill));

      const isNextCouplet = idx < items.length - 1 && items[idx + 1].type === "couplet";
      yCursor += lineSpacing + (isNextCouplet ? coupletExtraGap : 0);
    } else if (item.type === "single") {
      const singleBaseX = padding + (contentWidth - item.h.width) / 2 - item.h.minX;
      const baselineY = padding + maxAscent + yCursor;
      svgPaths.push(...renderGlyphGroup(otFont, item.h, singleBaseX, baselineY, fontSize, visuals.inkFill));
      yCursor += lineSpacing;
    }
  }

  if (sigSeg) {
    const sigX = padding - sigSeg.minX;
    const sigY = padding + Math.max(0, yCursor - lineSpacing) + maxAscent - minDescent + sigFontSize * 1.15;
    const sigPaths = renderGlyphGroup(otFont, sigSeg, sigX, sigY, sigFontSize, visuals.signatureFill);
    svgPaths.push(`<g opacity="0.82">${sigPaths.join("")}</g>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${finalW}" height="${finalH}" viewBox="0 0 ${finalW} ${finalH}">
  ${visuals.defs}
  ${visuals.bgSvg}
  <g transform="translate(${offsetX}, ${offsetY})">
    ${svgPaths.join("\n    ")}
  </g>
</svg>`;

  if (format === "svg") {
    return {
      svg,
      pngBuffer: null,
      width: finalW,
      height: finalH,
      isPoetry,
      isTransparent,
      ratio: normalizedRatio,
      theme: selectedTheme
    };
  }

  // Compute crisp pixel export sizing (1080px social HD or 512px sticker limit)
  const resvgOpts = {};
  let outW = finalW;
  let outH = finalH;

  if (maxSide && maxSide > 0) {
    const safeMax = Math.min(2048, maxSide);
    if (finalW >= finalH) {
      resvgOpts.fitTo = { mode: "width", value: safeMax };
      outH = Math.round((finalH * safeMax) / finalW);
      outW = safeMax;
    } else {
      resvgOpts.fitTo = { mode: "height", value: safeMax };
      outW = Math.round((finalW * safeMax) / finalH);
      outH = safeMax;
    }
  } else if (hd && (normalizedRatio === "square" || normalizedRatio === "story" || normalizedRatio === "horizontal")) {
    const targetW = normalizedRatio === "horizontal" ? 1920 : 1080;
    if (finalW < targetW) {
      resvgOpts.fitTo = { mode: "width", value: targetW };
      outH = Math.round((finalH * targetW) / finalW);
      outW = targetW;
    } else if (finalW > 2400) {
      resvgOpts.fitTo = { mode: "width", value: 2400 };
      outH = Math.round((finalH * 2400) / finalW);
      outW = 2400;
    }
  } else if (finalW > 2400) {
    resvgOpts.fitTo = { mode: "width", value: 2400 };
    outH = Math.round((finalH * 2400) / finalW);
    outW = 2400;
  }

  const rsvg = new resvg.Resvg(svg, resvgOpts);
  const pngBuffer = rsvg.render().asPng();

  return {
    svg,
    pngBuffer,
    width: outW,
    height: outH,
    isPoetry,
    isTransparent,
    ratio: normalizedRatio,
    theme: selectedTheme
  };
}
