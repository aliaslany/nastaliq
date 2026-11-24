/**
 * Deterministic Arabic/Persian contextual Presentation Forms mapper for fonts
 * without an OpenType GSUB table (e.g., X-Series calligraphy fonts), plus
 * safe intra-word Kashida (tatweel) slot discovery for poetry justification.
 */

// [isolated, final, initial, medial] — null when letter does not join on the left.
const ARABIC_FORMS = {
  "\u0622": [0xFE81, 0xFE82, null, null], // آ
  "\u0623": [0xFE83, 0xFE84, null, null], // أ
  "\u0624": [0xFE85, 0xFE86, null, null], // ؤ
  "\u0625": [0xFE87, 0xFE88, null, null], // إ
  "\u0626": [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // ئ
  "\u0627": [0xFE8D, 0xFE8E, null, null], // ا
  "\u0628": [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // ب
  "\u0629": [0xFE93, 0xFE94, null, null], // ة
  "\u062A": [0xFE95, 0xFE96, 0xFE97, 0xFE98], // ت
  "\u062B": [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // ث
  "\u062C": [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // ج
  "\u062D": [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // ح
  "\u062E": [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // خ
  "\u062F": [0xFEA9, 0xFEAA, null, null], // د
  "\u0630": [0xFEAB, 0xFEAC, null, null], // ذ
  "\u0631": [0xFEAD, 0xFEAE, null, null], // ر
  "\u0632": [0xFEAF, 0xFEB0, null, null], // ز
  "\u0633": [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // س
  "\u0634": [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // ش
  "\u0635": [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // ص
  "\u0636": [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // ض
  "\u0637": [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // ط
  "\u0638": [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // ظ
  "\u0639": [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // ع
  "\u063A": [0xFECD, 0xFECE, 0xFECF, 0xFED0], // غ
  "\u0641": [0xFED1, 0xFED2, 0xFED3, 0xFED4], // ف
  "\u0642": [0xFED5, 0xFED6, 0xFED7, 0xFED8], // ق
  "\u0643": [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // ك
  "\u0644": [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // ل
  "\u0645": [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // م
  "\u0646": [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // ن
  "\u0647": [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // ه
  "\u0648": [0xFEED, 0xFEEE, null, null], // و
  "\u0649": [0xFEEF, 0xFEF0, null, null], // ى
  "\u064A": [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // ي
  "\u067E": [0xFB56, 0xFB57, 0xFB58, 0xFB59], // پ
  "\u0686": [0xFB7A, 0xFB7B, 0xFB7C, 0xFB7D], // چ
  "\u0698": [0xFB8A, 0xFB8B, null, null], // ژ
  "\u06A9": [0xFB8E, 0xFB8F, 0xFB90, 0xFB91], // ک
  "\u06AF": [0xFB92, 0xFB93, 0xFB94, 0xFB95], // گ
  "\u06C0": [0xFBA4, 0xFBA5, null, null], // ۀ
  "\u06CC": [0xFBFC, 0xFBFD, 0xFBFE, 0xFBFF], // ی
};

const FALLBACK_FORMS = {
  "\u06A9": [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // ك
  "\u06CC": [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // ي
  "\u06C0": [0xFEE9, 0xFEEA, null, null], // ه
};

const LAM_ALEF_LIGATURES = {
  "\u0622": [0xFEF5, 0xFEF6], // لآ
  "\u0623": [0xFEF7, 0xFEF8], // لأ
  "\u0625": [0xFEF9, 0xFEFA], // لإ
  "\u0627": [0xFEFB, 0xFEFC], // لا
};

const TRANSPARENT_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;

function isTransparent(ch) {
  return TRANSPARENT_RE.test(ch);
}

function canJoinLeft(ch) {
  if (ch === "\u200D" || ch === "\u0640") return true;
  const f = ARABIC_FORMS[ch];
  return Boolean(f && f[2] !== null);
}

function canJoinRight(ch) {
  if (ch === "\u200D" || ch === "\u0640") return true;
  return Boolean(ARABIC_FORMS[ch]);
}

function resolveFormCode(otFont, ch, formIndex) {
  const primary = ARABIC_FORMS[ch]?.[formIndex];
  if (primary && otFont.charToGlyphIndex(String.fromCharCode(primary)) > 0) {
    return String.fromCharCode(primary);
  }
  const fallback = FALLBACK_FORMS[ch]?.[formIndex];
  if (fallback && otFont.charToGlyphIndex(String.fromCharCode(fallback)) > 0) {
    return String.fromCharCode(fallback);
  }
  return ch;
}

/**
 * Convert raw Persian/Arabic Unicode text into joined Presentation Forms
 * for fonts lacking OpenType GSUB lookup tables.
 */
export function applyArabicPresentationForms(text, otFont) {
  if (!text || otFont?.tables?.gsub) return text;

  const chars = Array.from(text);
  const out = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "\u200C" || ch === "\u200D") {
      continue;
    }
    if (!ARABIC_FORMS[ch]) {
      out.push(ch);
      continue;
    }

    // Look backward past transparent diacritics to check previous base char
    let prev = null;
    for (let p = i - 1; p >= 0; p--) {
      if (!isTransparent(chars[p])) {
        prev = chars[p];
        break;
      }
    }

    // Collapse Lam + Alef variants into a single Arabic Presentation Form ligature
    if (ch === "\u0644") {
      let nextIdx = i + 1;
      const between = [];
      while (nextIdx < chars.length && isTransparent(chars[nextIdx])) {
        between.push(chars[nextIdx]);
        nextIdx++;
      }
      const nextBase = nextIdx < chars.length ? chars[nextIdx] : null;
      if (nextBase && LAM_ALEF_LIGATURES[nextBase]) {
        const joinedPrev = prev !== null && canJoinLeft(prev);
        const ligCode = LAM_ALEF_LIGATURES[nextBase][joinedPrev ? 1 : 0];
        const ligChar = String.fromCharCode(ligCode);
        if (otFont.charToGlyphIndex(ligChar) > 0) {
          out.push(ligChar, ...between);
          i = nextIdx;
          continue;
        }
      }
    }

    // Look forward past transparent diacritics to check next base char
    let next = null;
    for (let n = i + 1; n < chars.length; n++) {
      if (!isTransparent(chars[n])) {
        next = chars[n];
        break;
      }
    }

    const joinsPrev = prev !== null && canJoinLeft(prev) && canJoinRight(ch);
    const joinsNext = next !== null && canJoinRight(next) && canJoinLeft(ch);

    let formIdx = 0; // isolated
    if (joinsPrev && joinsNext) formIdx = 3; // medial
    else if (joinsPrev) formIdx = 1; // final
    else if (joinsNext) formIdx = 2; // initial

    out.push(resolveFormCode(otFont, ch, formIdx));
  }

  return out.join("");
}

/**
 * Insert Kashida (U+0640) at valid dual-joining positions inside a line of Persian text
 * to balance hemistich widths cleanly without breaking calligraphic joins.
 */
export function stretchWithKashida(text, extraTatweels = 1) {
  if (!text || extraTatweels <= 0) return text;
  const chars = Array.from(text);
  const candidateIndices = [];

  for (let i = 0; i < chars.length - 1; i++) {
    const cur = chars[i];
    const nxt = chars[i + 1];
    // Never stretch between Lam and Alef, nor across spaces/diacritics/ZWNJ
    if (cur === "\u0644" && LAM_ALEF_LIGATURES[nxt]) continue;
    if (cur === "\u0640" || nxt === "\u0640") continue;
    if (canJoinLeft(cur) && canJoinRight(nxt)) {
      candidateIndices.push(i);
    }
  }

  if (candidateIndices.length === 0) return text;

  // Spread tatweels evenly across available joining boundaries (prefer longer later slots)
  const counts = new Map();
  for (let k = 0; k < extraTatweels; k++) {
    const slotIdx = candidateIndices[(k * 7 + candidateIndices.length - 1) % candidateIndices.length];
    counts.set(slotIdx, (counts.get(slotIdx) || 0) + 1);
  }

  const out = [];
  for (let i = 0; i < chars.length; i++) {
    out.push(chars[i]);
    const c = counts.get(i);
    if (c) out.push("\u0640".repeat(c));
  }
  return out.join("");
}
