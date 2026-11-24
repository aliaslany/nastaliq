import { renderNastaliq, extractImageDimensions } from "./renderer.js";
import {
  FONTS,
  THEMES,
  RATIO_LABELS,
  resolveFont,
  resolveTheme,
  resolveRatio
} from "./themes.js";

const DEFAULT_FONT = "iran-nastaliq";
const DEFAULT_THEME = "classic";
const DEFAULT_RATIO = "auto";
const WEB_STUDIO_URL = "https://nastaliq.startstar.ir";

const FONT_CYCLE = [
  "iran-nastaliq",
  "shekasteh",
  "thuluth",
  "kufi",
  "naskh",
  "mashgh",
  "davat",
  "termeh",
  "dima-shekasteh",
  "noto-nastaliq"
];

const THEME_CYCLE = [
  "gold",
  "gold-leaf",
  "tazhib",
  "classic",
  "night",
  "rose",
  "emerald",
  "azure"
];

const RATIO_CYCLE = ["auto", "square", "story", "horizontal"];

function tgUrl(botToken, method) {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

export function shortId(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = "";
  for (const b of bytes) res += alphabet[b % alphabet.length];
  return res;
}

function uint8ToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function getPrefs(env, chatId) {
  try {
    const raw = await env.PREFS.get(`chat:${chatId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function setPref(env, chatId, key, value) {
  const prefs = await getPrefs(env, chatId);
  prefs[key] = value;
  await env.PREFS.put(`chat:${chatId}`, JSON.stringify(prefs));
}

export async function saveRenderState(env, state, customId = null) {
  const id = customId || shortId(8);
  await env.PREFS.put(`render:${id}`, JSON.stringify(state), { expirationTtl: 604800 });
  return id;
}

export async function loadRenderState(env, id) {
  try {
    const raw = await env.PREFS.get(`render:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function tgCall(botToken, method, payload) {
  const resp = await fetch(tgUrl(botToken, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return resp.json().catch(() => ({ ok: false }));
}

export async function sendTelegramText(botToken, chatId, text, replyMarkup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return tgCall(botToken, "sendMessage", payload);
}

export async function sendTelegramAction(botToken, chatId, action = "upload_photo") {
  return tgCall(botToken, "sendChatAction", { chat_id: chatId, action });
}

export async function sendTelegramPhoto(botToken, chatId, pngBuffer, caption, replyMarkup = null) {
  const formData = new FormData();
  formData.append("chat_id", chatId.toString());
  formData.append("photo", new Blob([pngBuffer], { type: "image/png" }), "nastaliq.png");
  if (caption) formData.append("caption", caption);
  if (replyMarkup) formData.append("reply_markup", JSON.stringify(replyMarkup));
  return fetch(tgUrl(botToken, "sendPhoto"), { method: "POST", body: formData });
}

export async function sendTelegramDocument(botToken, chatId, bytes, mime, filename, caption, replyMarkup = null) {
  const formData = new FormData();
  formData.append("chat_id", chatId.toString());
  formData.append("document", new Blob([bytes], { type: mime }), filename);
  if (caption) formData.append("caption", caption);
  if (replyMarkup) formData.append("reply_markup", JSON.stringify(replyMarkup));
  return fetch(tgUrl(botToken, "sendDocument"), { method: "POST", body: formData });
}

export async function editTelegramMedia(botToken, chatId, messageId, mediaType, bytes, filename, mime, caption, replyMarkup) {
  const formData = new FormData();
  formData.append("chat_id", chatId.toString());
  formData.append("message_id", messageId.toString());
  const attachName = "file";
  formData.append(attachName, new Blob([bytes], { type: mime }), filename);
  formData.append("media", JSON.stringify({
    type: mediaType,
    media: `attach://${attachName}`,
    caption
  }));
  if (replyMarkup) {
    formData.append("reply_markup", JSON.stringify(replyMarkup));
  }
  return fetch(tgUrl(botToken, "editMessageMedia"), { method: "POST", body: formData });
}

export function buildRenderKeyboard(renderId, isSticker = false) {
  return {
    inline_keyboard: [
      [
        { text: "🖋️ فونت بعدی", callback_data: `f:${renderId}` },
        { text: "🎨 تم بعدی", callback_data: `t:${renderId}` },
        { text: "📐 کادر بعدی", callback_data: `r:${renderId}` }
      ],
      [
        { text: "📏 تراز کشیده", callback_data: `j:${renderId}` },
        { text: isSticker ? "🖼️ تبدیل به کارت" : "✨ استیکر شفاف", callback_data: `s:${renderId}` },
        { text: "📄 فایل SVG", callback_data: `v:${renderId}` }
      ],
      [
        { text: "🌟 افزودن به پک استیکر", callback_data: `p:${renderId}` },
        { text: "🎛️ بازکردن در استودیو", web_app: { url: `${WEB_STUDIO_URL}/?s=${renderId}` } }
      ]
    ]
  };
}

export function parseInlineOverrides(text) {
  const match = text.match(/^((?:\s*[a-zA-Z_-]+=[#\w-]+\s*)+):\s*([\s\S]+)$/);
  if (!match) {
    return {
      font: null,
      theme: null,
      ratio: null,
      sticker: null,
      justify: null,
      format: null,
      fgColor: null,
      bgColor: null,
      cleanText: text
    };
  }
  const [, flagsPart, body] = match;
  const flags = {};
  for (const pair of flagsPart.trim().split(/\s+/)) {
    const idx = pair.indexOf("=");
    if (idx > 0) {
      flags[pair.slice(0, idx).toLowerCase()] = pair.slice(idx + 1).toLowerCase();
    }
  }
  return {
    font: resolveFont(flags.font),
    theme: resolveTheme(flags.theme),
    ratio: resolveRatio(flags.ratio),
    sticker: flags.sticker === "true" || flags.transparent === "true" ? true : null,
    justify: flags.justify === "true" || flags.kashida === "true" ? true : null,
    format: flags.format === "svg" ? "svg" : null,
    fgColor: flags.fg || flags.color || null,
    bgColor: flags.bg || null,
    cleanText: body.trim(),
  };
}

function buildCaption(state, rendered) {
  const fontLabel = FONTS[state.font]?.name || state.font;
  const themeLabel = THEMES[state.theme]?.name || state.theme;
  const ratioLabel = state.ratio && state.ratio !== "auto" ? ` | کادر: ${RATIO_LABELS[state.ratio] || state.ratio}` : "";
  const poetryTag = rendered.isPoetry ? " [شعر]" : "";
  const justifyTag = state.justify ? " [کشیده]" : "";

  if (state.sticker) {
    return `✨ استیکر شفاف (${fontLabel})${poetryTag}${justifyTag}\n🤖 @IRnastaliqbot`;
  }
  return `🖋️ ${fontLabel} | تم: ${themeLabel}${ratioLabel}${poetryTag}${justifyTag}\n📐 ${rendered.width}×${rendered.height} | @IRnastaliqbot`;
}

/**
 * Render from a state object and send/edit message to Telegram cleanly.
 */
async function deliverRender(botToken, env, chatId, state, options = {}) {
  const { editMessageId = null, asSvg = false } = options;

  const rendered = await renderNastaliq(env, state.text, {
    fontKey: state.font,
    theme: state.theme,
    fontSize: state.fontSize || 54,
    transparent: state.sticker === true || state.theme === "sticker" || state.theme === "transparent",
    ratio: state.ratio || "auto",
    justify: state.justify === true,
    signature: state.signature || "",
    fgColor: state.fgColor || null,
    bgColor: state.bgColor || null,
    bgImageBase64: state.bgImageBase64 || null,
    bgImageMime: state.bgImageMime || "image/jpeg",
    bgImageAspect: state.bgImageAspect || null,
    format: asSvg ? "svg" : "png"
  });

  if (asSvg) {
    const svgBytes = new TextEncoder().encode(rendered.svg);
    return sendTelegramDocument(
      botToken,
      chatId,
      svgBytes,
      "image/svg+xml",
      "nastaliq-vector.svg",
      `📐 فایل وکتور SVG (${FONTS[state.font]?.short || state.font}) — آماده برای ایلاستریتور و فیگما\n🤖 @IRnastaliqbot`
    );
  }

  // Persist lightweight state (omit heavy base64 photo if unneeded beyond session? keep 1hr TTL if photo exists)
  const renderId = await saveRenderState(env, state, state._id || null);
  state._id = renderId;
  const caption = buildCaption(state, rendered);
  const keyboard = buildRenderKeyboard(renderId, rendered.isTransparent);

  if (editMessageId) {
    return editTelegramMedia(
      botToken,
      chatId,
      editMessageId,
      rendered.isTransparent ? "document" : "photo",
      rendered.pngBuffer,
      rendered.isTransparent ? "nastaliq-sticker.png" : "nastaliq.png",
      "image/png",
      caption,
      keyboard
    );
  }

  if (rendered.isTransparent) {
    return sendTelegramDocument(
      botToken,
      chatId,
      rendered.pngBuffer,
      "image/png",
      "nastaliq-sticker.png",
      caption,
      keyboard
    );
  }

  return sendTelegramPhoto(botToken, chatId, rendered.pngBuffer, caption, keyboard);
}

/**
 * Add rendered 512px transparent PNG to user's personal Telegram sticker pack and send it natively.
 */
async function addToUserStickerPack(botToken, env, chatId, userId, state) {
  const rendered = await renderNastaliq(env, state.text, {
    fontKey: state.font,
    theme: state.theme === "classic" ? "gold" : state.theme,
    fontSize: 54,
    transparent: true,
    ratio: "auto",
    justify: state.justify === true,
    signature: state.signature || "",
    maxSide: 512
  });

  // Upload static 512px PNG to Telegram sticker staging
  const uploadForm = new FormData();
  uploadForm.append("user_id", userId.toString());
  uploadForm.append("sticker_format", "static");
  uploadForm.append("sticker", new Blob([rendered.pngBuffer], { type: "image/png" }), "sticker.png");
  const uploadResp = await fetch(tgUrl(botToken, "uploadStickerFile"), { method: "POST", body: uploadForm });
  const uploadData = await uploadResp.json();
  if (!uploadData.ok || !uploadData.result?.file_id) {
    throw new Error(uploadData.description || "uploadStickerFile failed");
  }

  const me = await tgCall(botToken, "getMe", {});
  const botUsername = me.result?.username || "IRnastaliqbot";
  const packName = `u${userId}_by_${botUsername}`;
  const fileId = uploadData.result.file_id;
  const stickerItem = { sticker: fileId, format: "static", emoji_list: ["🖋️"] };

  // Try adding to existing pack; if missing, create a new pack
  let existing = await tgCall(botToken, "getStickerSet", { name: packName });
  if (existing.ok && existing.result) {
    const addRes = await tgCall(botToken, "addStickerToSet", {
      user_id: userId,
      name: packName,
      sticker: stickerItem
    });
    if (!addRes.ok) {
      throw new Error(addRes.description || "addStickerToSet failed");
    }
  } else {
    const createRes = await tgCall(botToken, "createNewStickerSet", {
      user_id: userId,
      name: packName,
      title: `خوشنویسی‌های من (@${botUsername})`,
      stickers: [stickerItem]
    });
    if (!createRes.ok) {
      throw new Error(createRes.description || "createNewStickerSet failed");
    }
  }

  // Re-fetch updated set to obtain last added sticker's canonical Telegram file_id
  const updated = await tgCall(botToken, "getStickerSet", { name: packName });
  const stickersList = updated.result?.stickers || [];
  const lastSticker = stickersList[stickersList.length - 1];
  if (lastSticker?.file_id) {
    await tgCall(botToken, "sendSticker", { chat_id: chatId, sticker: lastSticker.file_id });
  }

  await sendTelegramText(
    botToken,
    chatId,
    `🌟 *به پک استیکر شخصی شما اضافه شد!*\nبرای نصب و ذخیره پک در تلگرام روی لینک زیر بزنید:\nhttps://t.me/addstickers/${packName}`
  );
}

function buildHelpText() {
  return [
    "🖋️ *به ربات خوشنویسی سنتی ایران خوش آمدید!*",
    "",
    "این ربات تمام متون و اشعار شما را مستقیماً با **فونت‌های اصیل خوشنویسی و فناوری HarfBuzz WebAssembly** (بدون هیچ اتصالی به هوش مصنوعی) به تصویر و وکتور SVG تبدیل می‌کند.",
    "",
    "📜 *نگارش اشعار (قالب دو ستونه):*",
    "بین دو مصرع علامت `/` بگذارید:",
    "`به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد`",
    "`-- فردوسی` _(خط آخر با `--` به عنوان نام شاعر درج می‌شود)_",
    "",
    "📸 *نوشتن روی عکس دلخواه:*",
    "کافی است عکس خود را ارسال کنید و متن یا شعر را در کپشن (توضیحات عکس) بنویسید!",
    "",
    "🎛️ *دستورات کلیک‌پذیر (فقط لمس کنید):*",
    "• /fonts — انتخاب بین ۱۰ خط سنتی (نستعلیق، شکسته، ثلث، نسخ، کوفی، دوات، ترمه، مشق)",
    "• /themes — انتخاب تم رنگی و طرح‌های ورق طلا و تذهیب",
    "• /ratios — انتخاب ابعاد ۱۰۸۰px (مربعی ۱:۱ اینستاگرام، استوری ۹:۱۶، بنر ۱۶:۹)",
    "• /justify\\_on و /justify\\_off — تراز دو ستونه شعر با کشیدگی هوشمند حروف",
    "• /sticker — حالت استیکر شفاف بدون پس‌زمینه",
    "• /photo — حالت کارت تصویری با قاب",
    "• /svg — دریافت خروجی وکتور آخرین اثر",
    "• /settings — مشاهده تنظیمات فعلی",
    "",
    "⚡ *دستور یک‌باره سریع:*",
    "`font=shekasteh theme=gold-leaf ratio=square justify=true: متن شما`",
    "",
    "🌐 *استودیو آنلاین و مینی‌اپ:*",
    WEB_STUDIO_URL
  ].join("\n");
}

function buildFontsListText() {
  return [
    "🔤 *خطوط خوشنویسی سنتی موجود (۱۰ خط):*",
    "",
    "روی هر خط کلیک کنید تا پیش‌فرض شود:",
    "• /font\\_iran — ایران نستعلیق (پیش‌فرض اصیل)",
    "• /font\\_shekasteh — شکسته نستعلیق سنتی",
    "• /font\\_dima — دیما شکسته",
    "• /font\\_thuluth — خط ثلث اسلامی",
    "• /font\\_naskh — خط نسخ اصیل",
    "• /font\\_kufi — خط کوفی سنتی",
    "• /font\\_mashgh — خط مشق خوشنویسی",
    "• /font\\_davat — خط تحریری دوات",
    "• /font\\_termeh — خط ترمه سنتی",
    "• /font\\_noto — نوتو نستعلیق اردو"
  ].join("\n");
}

function buildThemesListText() {
  return [
    "🎨 *تم‌ها و قاب‌های هنری موجود:*",
    "",
    "روی هر تم کلیک کنید تا انتخاب شود:",
    "• /theme\\_gold\\_leaf — ورق طلا (طلای متالیک + قاب تذهیب)",
    "• /theme\\_tazhib — تذهیب لاجورد و زر (کاغذ کرم + حاشیه تذهیب)",
    "• /theme\\_gold — طلا و زر (زمینه مشکی)",
    "• /theme\\_classic — کلاسیک (کاغذ کهن دوخطه)",
    "• /theme\\_night — شب نیلی (دارک)",
    "• /theme\\_rose — گل سرخ",
    "• /theme\\_emerald — زمردین",
    "• /theme\\_azure — لاجورد",
    "• /theme\\_sticker — بدون پس‌زمینه (شفاف)"
  ].join("\n");
}

function buildRatiosListText() {
  return [
    "📐 *نسبت و ابعاد کادر (کیفیت ۱۰۸۰px Full-HD):*",
    "",
    "روی هر نسبت کلیک کنید تا انتخاب شود:",
    "• /ratio\\_auto — کادر خودکار و متناسب با متن",
    "• /ratio\\_square — مربعی ۱:۱ (۱۰۸۰×۱۰۸۰ پست و پروفایل اینستاگرام)",
    "• /ratio\\_story — عمودی ۹:۱۶ (۱۰۸۰×۱۹۲۰ استوری و ریلز)",
    "• /ratio\\_horizontal — افقی ۱۶:۹ (۱۹۲۰×۱۰۸۰ کاور و بنر)"
  ].join("\n");
}

async function handleTextMessage(botToken, env, message) {
  const chatId = message.chat.id;
  const rawText = message.text.trim();

  if (rawText === "/help" || rawText === "/start") {
    const startMarkup = {
      inline_keyboard: [[{ text: "🎛️ بازکردن استودیو خوشنویسی", web_app: { url: WEB_STUDIO_URL } }]]
    };
    await sendTelegramText(botToken, chatId, buildHelpText(), startMarkup);
    return;
  }

  // Deep-link `/start s_<renderId>` shared from Web Studio
  if (rawText.startsWith("/start ")) {
    const param = rawText.replace("/start ", "").trim();
    if (param === "help") {
      await sendTelegramText(botToken, chatId, buildHelpText());
      return;
    }
    const shareId = param.startsWith("s_") ? param.slice(2) : param;
    const shared = await loadRenderState(env, shareId);
    if (shared && shared.text) {
      await sendTelegramAction(botToken, chatId, "upload_photo");
      await deliverRender(botToken, env, chatId, { ...shared, _id: shareId });
      return;
    }
    await sendTelegramText(botToken, chatId, buildHelpText());
    return;
  }

  if (rawText === "/settings") {
    const prefs = await getPrefs(env, chatId);
    const curFont = FONTS[prefs.font || DEFAULT_FONT]?.name || prefs.font || DEFAULT_FONT;
    const curTheme = THEMES[prefs.theme || DEFAULT_THEME]?.name || prefs.theme || DEFAULT_THEME;
    const curRatio = RATIO_LABELS[prefs.ratio || DEFAULT_RATIO] || prefs.ratio || DEFAULT_RATIO;
    const isSticker = prefs.sticker ? "✅ بله (شفاف)" : "❌ خیر (کارت تصویری)";
    const isJustify = prefs.justify ? "✅ فعال (کشیدگی شعر)" : "❌ غیرفعال";

    const msg = [
      "⚙️ *تنظیمات فعلی شما:*",
      "",
      `• خط فعال: *${curFont}*`,
      `• تم فعال: *${curTheme}*`,
      `• نسبت کادر: *${curRatio}*`,
      `• تراز کشیده شعر: *${isJustify}*`,
      `• حالت استیکر: *${isSticker}*`,
      "",
      "تغییر سریع: /fonts | /themes | /ratios | /sticker | /photo"
    ].join("\n");
    await sendTelegramText(botToken, chatId, msg);
    return;
  }

  if (rawText === "/sticker") {
    await setPref(env, chatId, "sticker", true);
    await sendTelegramText(botToken, chatId, "✨ *حالت استیکر شفاف فعال شد!*\nخروجی‌ها به صورت PNG بدون پس‌زمینه ارسال می‌شوند (زیر هر اثر دکمه «🌟 افزودن به پک استیکر» هم در دسترس است).\nبازگشت به کارت: /photo");
    return;
  }

  if (rawText === "/photo") {
    await setPref(env, chatId, "sticker", false);
    await sendTelegramText(botToken, chatId, "🖼️ *حالت کارت تصویری فعال شد.*\nبازگشت به استیکر شفاف: /sticker");
    return;
  }

  if (rawText === "/justify_on" || rawText === "/justify") {
    await setPref(env, chatId, "justify", true);
    await sendTelegramText(botToken, chatId, "📏 *تراز کشیدگی هوشمند شعر (کشیده) فعال شد!*");
    return;
  }

  if (rawText === "/justify_off") {
    await setPref(env, chatId, "justify", false);
    await sendTelegramText(botToken, chatId, "📏 *حالت تراز ساده شعر (بدون کشیدگی) فعال شد.*");
    return;
  }

  if (rawText === "/svg") {
    const prefs = await getPrefs(env, chatId);
    if (!prefs.lastRenderId) {
      await sendTelegramText(botToken, chatId, "ابتدا یک متن یا شعر بفرستید، سپس روی دکمه *«📄 فایل SVG»* بزنید یا `/svg` را ارسال کنید.");
      return;
    }
    const lastState = await loadRenderState(env, prefs.lastRenderId);
    if (!lastState) {
      await sendTelegramText(botToken, chatId, "لطفاً یک متن جدید بفرستید و روی دکمه 📄 فایل SVG کلیک کنید.");
      return;
    }
    await deliverRender(botToken, env, chatId, lastState, { asSvg: true });
    return;
  }

  if (rawText === "/fonts") {
    await sendTelegramText(botToken, chatId, buildFontsListText());
    return;
  }

  if (rawText.startsWith("/font_") || rawText.startsWith("/font ")) {
    const arg = rawText.replace(/^\/font[_ ]/, "").trim();
    const resolved = resolveFont(arg);
    if (!resolved) {
      await sendTelegramText(botToken, chatId, "❌ خط نامعتبر است. گزینه‌ها: /fonts");
      return;
    }
    await setPref(env, chatId, "font", resolved);
    await sendTelegramText(botToken, chatId, `✅ خط پیش‌فرض روی *«${FONTS[resolved]?.name}»* تنظیم شد.\n/settings`);
    return;
  }

  if (rawText === "/themes") {
    await sendTelegramText(botToken, chatId, buildThemesListText());
    return;
  }

  if (rawText.startsWith("/theme_") || rawText.startsWith("/theme ")) {
    const arg = rawText.replace(/^\/theme[_ ]/, "").trim().replace(/_/g, "-");
    const resolved = resolveTheme(arg);
    if (!resolved) {
      await sendTelegramText(botToken, chatId, "❌ تم نامعتبر است. گزینه‌ها: /themes");
      return;
    }
    await setPref(env, chatId, "theme", resolved);
    await sendTelegramText(botToken, chatId, `✅ تم رنگی روی *«${THEMES[resolved]?.name}»* تنظیم شد.\n/settings`);
    return;
  }

  if (rawText === "/ratios" || rawText === "/ratio") {
    await sendTelegramText(botToken, chatId, buildRatiosListText());
    return;
  }

  if (rawText.startsWith("/ratio_") || rawText.startsWith("/ratio ")) {
    const arg = rawText.replace(/^\/ratio[_ ]/, "").trim();
    const resolved = resolveRatio(arg);
    if (!resolved) {
      await sendTelegramText(botToken, chatId, "❌ نسبت نامعتبر است. گزینه‌ها: /ratios");
      return;
    }
    await setPref(env, chatId, "ratio", resolved);
    await sendTelegramText(botToken, chatId, `✅ نسبت کادر روی *«${RATIO_LABELS[resolved]}»* تنظیم شد.\n/settings`);
    return;
  }

  // Plain calligraphy render
  const ov = parseInlineOverrides(rawText);
  if (!ov.cleanText) {
    await sendTelegramText(botToken, chatId, "لطفاً متن یا شعری ارسال کنید. راهنما: /help");
    return;
  }

  await sendTelegramAction(botToken, chatId, "upload_photo");

  const prefs = await getPrefs(env, chatId);
  const finalTheme = ov.theme || prefs.theme || DEFAULT_THEME;
  const state = {
    text: ov.cleanText,
    font: ov.font || prefs.font || DEFAULT_FONT,
    theme: finalTheme,
    ratio: ov.ratio || prefs.ratio || DEFAULT_RATIO,
    justify: ov.justify !== null ? ov.justify : prefs.justify === true,
    sticker: ov.sticker !== null ? ov.sticker : (prefs.sticker === true || finalTheme === "sticker" || finalTheme === "transparent"),
    fgColor: ov.fgColor || null,
    bgColor: ov.bgColor || null,
    fontSize: 54
  };

  const renderId = await saveRenderState(env, state);
  state._id = renderId;
  await setPref(env, chatId, "lastRenderId", renderId);

  await deliverRender(botToken, env, chatId, state, { asSvg: ov.format === "svg" });
}

async function handlePhotoMessage(botToken, env, message) {
  const chatId = message.chat.id;
  const captionText = (message.caption || "").trim();
  if (!captionText) {
    await sendTelegramText(
      botToken,
      chatId,
      "📸 *عکس دریافت شد!* برای خوشنویسی روی تصویر، لطفاً عکس را همراه با متن یا شعر در *کپشن (توضیحات عکس)* ارسال کنید."
    );
    return;
  }

  await sendTelegramAction(botToken, chatId, "upload_photo");

  // Pick largest photo under ~3MB so Worker memory stays well within 128MB
  const photos = message.photo || [];
  let chosen = photos[photos.length - 1];
  for (let i = photos.length - 1; i >= 0; i--) {
    if (!photos[i].file_size || photos[i].file_size <= 2_500_000) {
      chosen = photos[i];
      break;
    }
  }
  if (!chosen?.file_id) return;

  const fileInfo = await tgCall(botToken, "getFile", { file_id: chosen.file_id });
  const filePath = fileInfo.result?.file_path;
  if (!filePath) throw new Error("خطا در دریافت فایل تصویر از تلگرام");

  const fileResp = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  const imgBytes = new Uint8Array(await fileResp.arrayBuffer());
  const dims = extractImageDimensions(imgBytes);
  const aspect = dims && dims.height > 0 ? dims.width / dims.height : 1;

  const ov = parseInlineOverrides(captionText);
  const prefs = await getPrefs(env, chatId);
  const state = {
    text: ov.cleanText || captionText,
    font: ov.font || prefs.font || DEFAULT_FONT,
    theme: ov.theme || "gold-leaf",
    ratio: "auto",
    justify: ov.justify !== null ? ov.justify : prefs.justify === true,
    sticker: false,
    fgColor: ov.fgColor || "#fdfbf7",
    bgImageBase64: uint8ToBase64(imgBytes),
    bgImageMime: dims?.mime || "image/jpeg",
    bgImageAspect: aspect,
    fontSize: 56
  };

  const renderId = await saveRenderState(env, state);
  state._id = renderId;
  await setPref(env, chatId, "lastRenderId", renderId);
  await deliverRender(botToken, env, chatId, state);
}

async function handleCallbackQuery(botToken, env, cb) {
  const data = cb.data || "";
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const userId = cb.from?.id;

  const sepIdx = data.indexOf(":");
  if (sepIdx <= 0 || !chatId || !messageId) {
    await tgCall(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
    return;
  }

  const action = data.slice(0, sepIdx);
  const renderId = data.slice(sepIdx + 1);
  const state = await loadRenderState(env, renderId);

  if (!state) {
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "این اثر منقضی شده است — لطفاً متن را دوباره بفرستید.",
      show_alert: true
    });
    return;
  }

  state._id = renderId;

  if (action === "f") {
    const idx = FONT_CYCLE.indexOf(state.font);
    state.font = FONT_CYCLE[(idx + 1) % FONT_CYCLE.length];
    await setPref(env, chatId, "font", state.font);
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: `🖋️ خط: ${FONTS[state.font]?.name || state.font}`
    });
    await deliverRender(botToken, env, chatId, state, { editMessageId: messageId });
    return;
  }

  if (action === "t") {
    const idx = THEME_CYCLE.indexOf(state.theme);
    state.theme = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    state.sticker = false;
    await setPref(env, chatId, "theme", state.theme);
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: `🎨 تم: ${THEMES[state.theme]?.name || state.theme}`
    });
    await deliverRender(botToken, env, chatId, state, { editMessageId: messageId });
    return;
  }

  if (action === "r") {
    const idx = RATIO_CYCLE.indexOf(state.ratio || "auto");
    state.ratio = RATIO_CYCLE[(idx + 1) % RATIO_CYCLE.length];
    await setPref(env, chatId, "ratio", state.ratio);
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: `📐 کادر: ${RATIO_LABELS[state.ratio] || state.ratio}`
    });
    await deliverRender(botToken, env, chatId, state, { editMessageId: messageId });
    return;
  }

  if (action === "j") {
    state.justify = !state.justify;
    await setPref(env, chatId, "justify", state.justify);
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: state.justify ? "📏 کشیدگی تراز شعر فعال شد" : "📏 تراز عادی فعال شد"
    });
    await deliverRender(botToken, env, chatId, state, { editMessageId: messageId });
    return;
  }

  if (action === "s") {
    state.sticker = !state.sticker;
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: state.sticker ? "✨ تبدیل به استیکر شفاف" : "🖼️ تبدیل به کارت تصویری"
    });
    await deliverRender(botToken, env, chatId, state, { editMessageId: messageId });
    return;
  }

  if (action === "v") {
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "📄 در حال ارسال فایل برداری SVG..."
    });
    await deliverRender(botToken, env, chatId, state, { asSvg: true });
    return;
  }

  if (action === "p") {
    await tgCall(botToken, "answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "🌟 در حال ساخت و افزودن به پک استیکر شخصی..."
    });
    try {
      await addToUserStickerPack(botToken, env, chatId, userId, state);
    } catch (err) {
      await sendTelegramText(
        botToken,
        chatId,
        `⚠️ افزودن به پک استیکر انجام نشد (${err.message}).\nفایل شفاف استیکر در حالت PNG قابل استفاده است.`
      );
    }
    return;
  }

  await tgCall(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
}

async function handleInlineQuery(botToken, env, iq, originUrl) {
  const q = (iq.query || "").trim();
  if (!q) {
    await tgCall(botToken, "answerInlineQuery", {
      inline_query_id: iq.id,
      results: [],
      cache_time: 10,
      switch_pm_text: "🎛️ ورود به ربات و راهنمای کامل",
      switch_pm_parameter: "help"
    });
    return;
  }

  const ov = parseInlineOverrides(q);
  const text = (ov.cleanText || q).slice(0, 400);

  const presets = [
    { id: "p1", font: ov.font || "iran-nastaliq", theme: ov.theme || "gold-leaf", title: "ایران نستعلیق — ورق طلا" },
    { id: "p2", font: "shekasteh", theme: "gold", title: "شکسته نستعلیق — طلا و زر" },
    { id: "p3", font: "iran-nastaliq", theme: "tazhib", title: "ایران نستعلیق — تذهیب لاجورد" },
    { id: "p4", font: "thuluth", theme: "classic", title: "خط ثلث اسلامی — کلاسیک" },
    { id: "p5", font: "kufi", theme: "night", title: "خط کوفی سنتی — شب نیلی" },
    { id: "p6", font: "shekasteh", theme: "rose", title: "شکسته نستعلیق — گل سرخ" }
  ];

  const results = presets.map(p => {
    const params = new URLSearchParams({
      text,
      font: p.font,
      theme: p.theme,
      ratio: ov.ratio || "auto",
      size: "52",
      hd: "false"
    });
    const renderUrl = `${originUrl}/api/render?${params.toString()}`;
    return {
      type: "photo",
      id: p.id,
      photo_url: renderUrl,
      thumbnail_url: renderUrl,
      title: p.title,
      caption: `🖋️ @IRnastaliqbot`
    };
  });

  await tgCall(botToken, "answerInlineQuery", {
    inline_query_id: iq.id,
    results,
    cache_time: 60
  });
}

export async function processTelegramUpdate(botToken, env, update, originUrl) {
  if (update.inline_query) {
    await handleInlineQuery(botToken, env, update.inline_query, originUrl);
    return;
  }
  if (update.callback_query) {
    await handleCallbackQuery(botToken, env, update.callback_query);
    return;
  }
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  try {
    if (msg.photo && msg.photo.length > 0) {
      await handlePhotoMessage(botToken, env, msg);
    } else if (msg.text) {
      await handleTextMessage(botToken, env, msg);
    }
  } catch (err) {
    console.error("Telegram update error:", err);
    await sendTelegramText(botToken, chatId, "⚠️ خطا در رندر: " + err.message);
  }
}
