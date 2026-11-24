/**
 * Calligraphy fonts, themes, aspect ratios, and deterministic SVG background/ornament builders.
 */

export const FONTS = {
  "iran-nastaliq": { name: "ایران نستعلیق", short: "نستعلیق", key: "font:iran-nastaliq" },
  "shekasteh": { name: "شکسته نستعلیق", short: "شکسته", key: "font:shekasteh" },
  "dima-shekasteh": { name: "دیما شکسته", short: "دیما شکسته", key: "font:dima-shekasteh" },
  "thuluth": { name: "خط ثلث اسلامی", short: "ثلث", key: "font:thuluth" },
  "naskh": { name: "خط نسخ اصیل", short: "نسخ", key: "font:naskh" },
  "kufi": { name: "خط کوفی سنتی", short: "کوفی", key: "font:kufi" },
  "mashgh": { name: "خط مشق خوشنویسی", short: "مشق", key: "font:mashgh" },
  "davat": { name: "خط تحریری دوات", short: "دوات", key: "font:davat" },
  "termeh": { name: "خط ترمه سنتی", short: "ترمه", key: "font:termeh" },
  "noto-nastaliq": { name: "نوتو نستعلیق اردو", short: "نوتو", key: "font:noto-nastaliq" }
};

export const FONT_ALIASES = {
  iran: "iran-nastaliq",
  "iran-nastaliq": "iran-nastaliq",
  nastaliq: "iran-nastaliq",
  shekasteh: "shekasteh",
  "shekasteh-nastaliq": "shekasteh",
  dima: "dima-shekasteh",
  "dima-shekasteh": "dima-shekasteh",
  thuluth: "thuluth",
  sols: "thuluth",
  naskh: "naskh",
  kufi: "kufi",
  mashgh: "mashgh",
  davat: "davat",
  termeh: "termeh",
  noto: "noto-nastaliq",
  "noto-nastaliq": "noto-nastaliq",
};

export const THEMES = {
  classic: { name: "کلاسیک (کاغذ کهن)", text: "#111111", bg: "#fbf8ef", border: "#d6ccb4", frame: "double" },
  gold: { name: "طلا و زر", text: "#d4af37", bg: "#0f1115", border: "#5c481c", frame: "simple" },
  "gold-leaf": {
    name: "ورق طلا (متالیک)",
    text: "#f3d56b",
    gradStart: "#fff1a8",
    gradMid: "#d4af37",
    gradEnd: "#9a7215",
    bg: "#080a0f",
    bgEnd: "#131722",
    border: "#b89127",
    frame: "tazhib"
  },
  tazhib: {
    name: "تذهیب لاجورد و زر",
    text: "#102542",
    bg: "#fbf5e6",
    bgEnd: "#f3e6c8",
    border: "#1d4ed8",
    accent: "#c59b27",
    frame: "tazhib"
  },
  night: { name: "شب نیلی", text: "#e2e8f0", bg: "#0f172a", border: "#334155", frame: "simple" },
  rose: { name: "گل سرخ", text: "#881337", bg: "#fff1f2", border: "#fda4af", frame: "simple" },
  emerald: { name: "زمردین", text: "#065f46", bg: "#ecfdf5", border: "#6ee7b7", frame: "simple" },
  azure: { name: "لاجورد", text: "#1e3a8a", bg: "#eff6ff", border: "#93c5fd", frame: "simple" },
  sticker: { name: "استیکر شفاف", text: "#d4af37", bg: "transparent", border: "transparent", frame: "none" },
  transparent: { name: "شفاف", text: "#111111", bg: "transparent", border: "transparent", frame: "none" }
};

export const RATIO_ALIASES = {
  auto: "auto",
  square: "square",
  "1:1": "square",
  profile: "square",
  post: "square",
  story: "story",
  vertical: "story",
  "9:16": "story",
  horizontal: "horizontal",
  banner: "horizontal",
  "16:9": "horizontal",
};

export const RATIO_LABELS = {
  auto: "خودکار",
  square: "مربعی ۱:۱ (پست و پروفایل)",
  story: "عمودی ۹:۱۶ (استوری)",
  horizontal: "افقی ۱۶:۹ (بنر و کاور)"
};

export function resolveFont(input) {
  if (!input) return null;
  return FONT_ALIASES[input.toLowerCase().trim()] || null;
}

export function resolveTheme(input) {
  if (!input) return null;
  const key = input.toLowerCase().trim();
  return THEMES[key] ? key : null;
}

export function resolveRatio(input) {
  if (!input) return null;
  return RATIO_ALIASES[input.toLowerCase().trim()] || null;
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function sanitizeColor(input, fallback) {
  if (!input || typeof input !== "string") return fallback;
  const trimmed = input.trim();
  if (trimmed.toLowerCase() === "transparent") return "transparent";
  return HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

/**
 * Generates crisp geometric Tazhib corner flourishes in all four corners.
 */
function buildTazhibFrame(width, height, borderColor, accentColor) {
  const m = 16;
  const inner = 24;
  const cornerPath = `
    M ${m} ${m + 52}
    L ${m} ${m} L ${m + 52} ${m}
    C ${m + 34} ${m + 8}, ${m + 22} ${m + 18}, ${m + 18} ${m + 32}
    C ${m + 32} ${m + 22}, ${m + 42} ${m + 12}, ${m + 52} ${m}
    M ${m + 8} ${m + 38}
    Q ${m + 14} ${m + 14}, ${m + 38} ${m + 8}
  `;

  const corners = [
    "",
    `translate(${width}, 0) scale(-1, 1)`,
    `translate(0, ${height}) scale(1, -1)`,
    `translate(${width}, ${height}) scale(-1, -1)`
  ];

  const cornerEls = corners.map(tr => {
    const attr = tr ? ` transform="${tr}"` : "";
    return `<g${attr}>
      <path d="${cornerPath}" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${m + 14}" cy="${m + 14}" r="3.2" fill="${borderColor}"/>
      <circle cx="${m + 26}" cy="${m + 10}" r="1.8" fill="${accentColor}"/>
      <circle cx="${m + 10}" cy="${m + 26}" r="1.8" fill="${accentColor}"/>
    </g>`;
  }).join("\n    ");

  return `
    <rect x="${m}" y="${m}" width="${Math.max(10, width - m * 2)}" height="${Math.max(10, height - m * 2)}" rx="10" fill="none" stroke="${borderColor}" stroke-width="2" opacity="0.85"/>
    <rect x="${inner}" y="${inner}" width="${Math.max(10, width - inner * 2)}" height="${Math.max(10, height - inner * 2)}" rx="6" fill="none" stroke="${accentColor}" stroke-width="1" stroke-dasharray="6 4" opacity="0.7"/>
    ${cornerEls}
  `;
}

/**
 * Build SVG <defs>, background elements, and ink fill values for a render.
 */
export function buildThemeVisuals(themeObj, width, height, opts = {}) {
  const {
    isTransparent = false,
    fgColor = null,
    bgColor = null,
    frameOverride = null,
    bgImageBase64 = null,
    bgImageMime = "image/jpeg"
  } = opts;

  const customFg = sanitizeColor(fgColor, null);
  const customBg = sanitizeColor(bgColor, null);

  let defs = "";
  let inkFill = customFg || themeObj.text;

  // Use metallic gold linear gradient unless custom fg color overrides it
  if (!customFg && themeObj.gradStart && themeObj.gradEnd) {
    defs += `
    <linearGradient id="inkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${themeObj.gradStart}"/>
      <stop offset="50%" stop-color="${themeObj.gradMid || themeObj.gradStart}"/>
      <stop offset="100%" stop-color="${themeObj.gradEnd}"/>
    </linearGradient>`;
    inkFill = "url(#inkGrad)";
  }

  let bgSvg = "";

  if (bgImageBase64) {
    const safeMime = bgImageMime === "image/png" ? "image/png" : "image/jpeg";
    // Overlay calligraphy directly onto user-supplied photo with subtle legibility scrim
    bgSvg = `
    <image href="data:${safeMime};base64,${bgImageBase64}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="100%" height="100%" fill="#05080f" fill-opacity="0.42"/>`;
    if (!customFg && inkFill === "#111111") {
      inkFill = "#fdfbf7";
    }
  } else if (!isTransparent) {
    const baseBg = customBg && customBg !== "transparent" ? customBg : themeObj.bg;
    let fillAttr = baseBg;

    if (!customBg && themeObj.bgEnd) {
      defs += `
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${baseBg}"/>
        <stop offset="100%" stop-color="${themeObj.bgEnd}"/>
      </linearGradient>`;
      fillAttr = "url(#bgGrad)";
    }

    const frameMode = frameOverride || themeObj.frame || "simple";
    const borderCol = themeObj.border && themeObj.border !== "transparent" ? themeObj.border : "#64748b";
    const accentCol = themeObj.accent || borderCol;

    bgSvg = `<rect width="100%" height="100%" fill="${fillAttr}" rx="16"/>`;
    if (frameMode === "tazhib") {
      bgSvg += buildTazhibFrame(width, height, borderCol, accentCol);
    } else if (frameMode === "double") {
      bgSvg += `
      <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="12" fill="none" stroke="${borderCol}" stroke-width="2"/>
      <rect x="19" y="19" width="${width - 38}" height="${height - 38}" rx="8" fill="none" stroke="${borderCol}" stroke-width="0.9" opacity="0.65"/>`;
    } else if (frameMode === "simple") {
      bgSvg += `<rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="16" fill="none" stroke="${borderCol}" stroke-width="2.5"/>`;
    }
  }

  return {
    defs: defs ? `<defs>${defs}\n  </defs>` : "",
    bgSvg,
    inkFill,
    signatureFill: customFg || themeObj.text
  };
}
