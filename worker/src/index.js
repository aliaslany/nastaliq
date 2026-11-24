import { renderNastaliq, FONTS, THEMES, getFont } from "./renderer.js";
import { DEMO_HTML } from "./html.js";

const DEFAULT_FONT = "iran-nastaliq";
const DEFAULT_THEME = "classic";
const DEFAULT_RATIO = "auto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

const FONT_ALIASES = {
  iran: "iran-nastaliq",
  "iran-nastaliq": "iran-nastaliq",
  nastaliq: "iran-nastaliq",
  shekasteh: "shekasteh",
  "shekasteh-nastaliq": "shekasteh",
  dima: "dima-shekasteh",
  "dima-shekasteh": "dima-shekasteh",
  thuluth: "thuluth",
  sols: "thuluth",
  kufi: "kufi",
  mashgh: "mashgh",
  noto: "noto-nastaliq",
  "noto-nastaliq": "noto-nastaliq",
};

const RATIO_ALIASES = {
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

function resolveFont(input) {
  if (!input) return null;
  return FONT_ALIASES[input.toLowerCase().trim()] || null;
}

function resolveTheme(input) {
  if (!input) return null;
  const key = input.toLowerCase().trim();
  return THEMES[key] ? key : null;
}

function resolveRatio(input) {
  if (!input) return null;
  const key = input.toLowerCase().trim();
  return RATIO_ALIASES[key] || null;
}

function parseInlineOverrides(text) {
  const match = text.match(/^((?:\s*[\w:-]+=\w+\s*)+):\s*([\s\S]+)$/);
  if (!match) {
    return { font: null, theme: null, ratio: null, sticker: null, cleanText: text };
  }
  const [, flagsPart, body] = match;
  const flags = {};
  for (const pair of flagsPart.trim().split(/\s+/)) {
    const [k, v] = pair.split("=");
    if (k && v) flags[k.toLowerCase()] = v.toLowerCase();
  }
  return {
    font: resolveFont(flags.font),
    theme: resolveTheme(flags.theme),
    ratio: resolveRatio(flags.ratio),
    sticker: flags.sticker === "true" || flags.transparent === "true" ? true : null,
    cleanText: body.trim(),
  };
}

async function getPrefs(env, chatId) {
  try {
    const raw = await env.PREFS.get(`chat:${chatId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setPref(env, chatId, key, value) {
  const prefs = await getPrefs(env, chatId);
  prefs[key] = value;
  await env.PREFS.put(`chat:${chatId}`, JSON.stringify(prefs));
}

async function sendTelegramText(botToken, chatId, text, parseMode = "Markdown") {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

async function sendTelegramAction(botToken, chatId, action = "upload_photo") {
  const url = `https://api.telegram.org/bot${botToken}/sendChatAction`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

async function sendTelegramPhoto(botToken, chatId, pngBuffer, caption) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const formData = new FormData();
  formData.append("chat_id", chatId.toString());
  formData.append("photo", new Blob([pngBuffer], { type: "image/png" }), "nastaliq.png");
  if (caption) {
    formData.append("caption", caption);
  }
  return fetch(url, { method: "POST", body: formData });
}

async function sendTelegramDocument(botToken, chatId, pngBuffer, filename, caption) {
  const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
  const formData = new FormData();
  formData.append("chat_id", chatId.toString());
  formData.append("document", new Blob([pngBuffer], { type: "image/png" }), filename || "nastaliq.png");
  if (caption) {
    formData.append("caption", caption);
  }
  return fetch(url, { method: "POST", body: formData });
}

export default {
  async fetch(request, env, ctx) {
    // Global CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    // 1. Web Page & Assets (GET & HEAD)
    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/" || url.pathname === "/demo") {
        return new Response(DEMO_HTML, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "text/html; charset=utf-8"
          },
        });
      }

      if (url.pathname === "/api/fonts") {
        return new Response(JSON.stringify(FONTS), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      }

      if (url.pathname === "/api/themes") {
        return new Response(JSON.stringify(THEMES), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      }

      if (url.pathname === "/fonts/IranNastaliq.ttf") {
        const { fontBuffer } = await getFont(env, "iran-nastaliq");
        return new Response(fontBuffer, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "font/ttf",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      if (url.pathname === "/api/render") {
        try {
          const text = url.searchParams.get("text") || "به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد";
          const theme = url.searchParams.get("theme") || "gold";
          const font = url.searchParams.get("font") || "iran-nastaliq";
          const size = parseInt(url.searchParams.get("size") || "54");
          const transparent = url.searchParams.get("transparent") === "true";
          const ratio = url.searchParams.get("ratio") || "auto";

          const res = await renderNastaliq(env, text, {
            theme,
            fontKey: resolveFont(font) || font,
            fontSize: size,
            transparent,
            ratio: resolveRatio(ratio) || ratio
          });

          return new Response(res.pngBuffer, {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
              "X-Poetry": res.isPoetry ? "1" : "0",
              "X-Dimensions": `${res.width}x${res.height}`,
              "X-Ratio": res.ratio
            },
          });
        } catch (err) {
          return new Response("Render error: " + err.message, {
            status: 500,
            headers: CORS_HEADERS
          });
        }
      }
    }

    // 2. API Render (POST)
    if (request.method === "POST" && url.pathname === "/api/render") {
      try {
        const body = await request.json();
        const text = body.text || "به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد";
        const theme = body.theme || "gold";
        const font = body.font || "iran-nastaliq";
        const size = parseInt(body.fontSize || body.size || "54");
        const transparent = body.transparent === true;
        const ratio = body.ratio || "auto";

        const res = await renderNastaliq(env, text, {
          theme,
          fontKey: resolveFont(font) || font,
          fontSize: size,
          transparent,
          ratio: resolveRatio(ratio) || ratio
        });

        return new Response(res.pngBuffer, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
            "X-Poetry": res.isPoetry ? "1" : "0",
            "X-Dimensions": `${res.width}x${res.height}`,
            "X-Ratio": res.ratio
          },
        });
      } catch (err) {
        return new Response(err.message, {
          status: 500,
          headers: CORS_HEADERS
        });
      }
    }

    // 3. Telegram Webhook (POST / or POST /webhook)
    if (request.method === "POST") {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return new Response("TELEGRAM_BOT_TOKEN not configured", { status: 500, headers: CORS_HEADERS });
      }

      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400, headers: CORS_HEADERS });
      }

      const message = update.message;
      if (!message || !message.text) {
        return new Response("OK", { status: 200, headers: CORS_HEADERS });
      }

      const chatId = message.chat.id;
      const rawText = message.text.trim();

      ctx.waitUntil((async () => {
        try {
          if (rawText === "/start" || rawText === "/help") {
            const welcomeText = [
              "🖋️ *به ربات خوشنویسی سنتی ایران خوش آمدید!*",
              "",
              "این ربات تمام متون و اشعار شما را با خطوط اصیل سنتی (نستعلیق، شکسته، ثلث، کوفی و...) به صورت مستقیم از منحنی‌های برداری فونت رندر می‌کند.",
              "",
              "ℹ️ *نکته مهم:* این موتور ۱۰۰٪ قطعی و مبتنی بر فونت استاندارد با فناوری WebAssembly بوده و هیچ اتصالی به هوش مصنوعی ندارد.",
              "",
              "📜 *نگارش اشعار (قالب دو ستونه):*",
              "بین دو مصرع علامت اسلش `/` بگذارید:",
              "`به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد`",
              "",
              "🎨 *دستورات کلیک‌پذیر (فقط لمس کنید):*",
              "• /fonts — انتخاب خط خوشنویسی",
              "• /themes — انتخاب تم رنگی",
              "• /ratios — انتخاب نسبت کادر (مربعی، استوری)",
              "• /sticker — خروجی استیکر شفاف بدون پس‌زمینه",
              "• /photo — خروجی تصویر کارت با پس‌زمینه",
              "• /settings — مشاهده وضعیت تنظیمات شما",
              "",
              "⚡ *تنظیمات موقت یک‌باره در ابتدای متن:*",
              "`font=shekasteh theme=gold ratio=square: متن شما`",
              "",
              "🌐 *کارگاه آنلاین و دمو وب:*",
              "https://nastaliq.startstar.ir"
            ].join("\n");

            await sendTelegramText(botToken, chatId, welcomeText);
            return;
          }

          if (rawText === "/settings") {
            const prefs = await getPrefs(env, chatId);
            const curFont = FONTS[prefs.font || DEFAULT_FONT]?.name || prefs.font || DEFAULT_FONT;
            const curTheme = THEMES[prefs.theme || DEFAULT_THEME]?.name || prefs.theme || DEFAULT_THEME;
            const curRatio = prefs.ratio || DEFAULT_RATIO;
            const isSticker = prefs.sticker ? "✅ بله (شفاف)" : "❌ خیر (عکس با کادر)";

            const msg = [
              "⚙️ *تنظیمات فعلی شما:*",
              "",
              `• خط فعال: *${curFont}*`,
              `• تم فعال: *${curTheme}*`,
              `• نسبت کادر: *${curRatio}*`,
              `• حالت استیکر: *${isSticker}*`,
              "",
              "برای تغییر هر مورد، روی دستورات کلیک کنید:",
              "• /fonts — تغییر خط خوشنویسی",
              "• /themes — تغییر تم رنگی",
              "• /ratios — تغییر ابعاد کادر",
              "• /sticker — فعال‌سازی استیکر شفاف",
              "• /photo — بازگشت به عکس عادی"
            ].join("\n");

            await sendTelegramText(botToken, chatId, msg);
            return;
          }

          if (rawText === "/sticker") {
            await setPref(env, chatId, "sticker", true);
            await sendTelegramText(botToken, chatId, "✨ *حالت استیکر شفاف فعال شد!*\nخروجی‌ها بدون پس‌زمینه ارسال می‌شوند.\nبرای بازگشت به عکس عادی: /photo");
            return;
          }

          if (rawText === "/photo") {
            await setPref(env, chatId, "sticker", false);
            await sendTelegramText(botToken, chatId, "🖼️ *حالت عکس عادی فعال شد.*\nخروجی‌ها با رنگ پس‌زمینه و قاب ارسال می‌شوند.\nبرای استیکر شفاف: /sticker");
            return;
          }

          // Fonts Menu & Selection
          if (rawText === "/fonts") {
            const fontMsg = [
              "🔤 *خطوط خوشنویسی سنتی موجود:*",
              "",
              "روی هر خط کلیک کنید تا به عنوان پیش‌فرض انتخاب شود:",
              "• /font_iran — خط ایران نستعلیق (پیش‌فرض)",
              "• /font_shekasteh — خط شکسته نستعلیق اصیل",
              "• /font_dima — خط دیما شکسته",
              "• /font_thuluth — خط ثلث اسلامی",
              "• /font_kufi — خط کوفی سنتی",
              "• /font_mashgh — خط مشق خوشنویسی",
              "• /font_noto — خط نستعلیق نوتو"
            ].join("\n");
            await sendTelegramText(botToken, chatId, fontMsg);
            return;
          }

          // Clickable font command: /font_<name> or /font <name>
          if (rawText.startsWith("/font_") || rawText.startsWith("/font ")) {
            const arg = rawText.replace(/^\/font[_ ]/, "").trim();
            const resolved = resolveFont(arg);
            if (!resolved) {
              await sendTelegramText(botToken, chatId, "❌ خط نامعتبر است. برای مشاهده گزینه‌ها: /fonts");
              return;
            }
            await setPref(env, chatId, "font", resolved);
            const fontName = FONTS[resolved]?.name || resolved;
            await sendTelegramText(botToken, chatId, `✅ خط پیش‌فرض شما روی *«${fontName}»* تنظیم شد.\nبرای مشاهده تنظیمات: /settings`);
            return;
          }

          // Themes Menu & Selection
          if (rawText === "/themes") {
            const themeMsg = [
              "🎨 *تم‌های رنگی موجود:*",
              "",
              "روی هر تم کلیک کنید تا انتخاب شود:",
              "• /theme_gold — طلا و زر (طلایی بر زمینه مشکی)",
              "• /theme_classic — کلاسیک (مشکی بر کاغذ کهن)",
              "• /theme_night — شب نیلی (روشن بر سورمه‌ای)",
              "• /theme_rose — گل سرخ (زرشکی بر صورتی ملایم)",
              "• /theme_emerald — زمردین (یشمی بر سبز روشن)",
              "• /theme_azure — لاجورد (آبی کبالت بر فیروزه‌ای)",
              "• /theme_sticker — استیکر شفاف"
            ].join("\n");
            await sendTelegramText(botToken, chatId, themeMsg);
            return;
          }

          // Clickable theme command: /theme_<name> or /theme <name>
          if (rawText.startsWith("/theme_") || rawText.startsWith("/theme ")) {
            const arg = rawText.replace(/^\/theme[_ ]/, "").trim();
            const resolved = resolveTheme(arg);
            if (!resolved) {
              await sendTelegramText(botToken, chatId, "❌ تم نامعتبر است. برای مشاهده گزینه‌ها: /themes");
              return;
            }
            await setPref(env, chatId, "theme", resolved);
            const themeName = THEMES[resolved]?.name || resolved;
            await sendTelegramText(botToken, chatId, `✅ تم رنگی پیش‌فرض شما روی *«${themeName}»* تنظیم شد.\nبرای مشاهده تنظیمات: /settings`);
            return;
          }

          // Aspect Ratios Menu & Selection
          if (rawText === "/ratios" || rawText === "/ratio") {
            const ratioMsg = [
              "📐 *انتخاب نسبت و ابعاد کادر تصویر:*",
              "",
              "روی نسبت کادر دلخواه کلیک کنید تا تنظیم شود:",
              "• /ratio_auto — کادر خودکار و فیت متن (پیش‌فرض)",
              "• /ratio_square — مربعی ۱:۱ (عکس پروفایل و پست اینستاگرام)",
              "• /ratio_story — عمودی ۹:۱۶ (استوری و ریلز اینستاگرام)",
              "• /ratio_horizontal — افقی ۱۶:۹ (کاور و بنر)"
            ].join("\n");
            await sendTelegramText(botToken, chatId, ratioMsg);
            return;
          }

          // Clickable ratio command: /ratio_<name> or /ratio <name>
          if (rawText.startsWith("/ratio_") || rawText.startsWith("/ratio ")) {
            const arg = rawText.replace(/^\/ratio[_ ]/, "").trim();
            const resolved = resolveRatio(arg);
            if (!resolved) {
              await sendTelegramText(botToken, chatId, "❌ نسبت کادر نامعتبر است. گزینه‌ها: /ratios");
              return;
            }
            await setPref(env, chatId, "ratio", resolved);
            const ratioLabels = {
              auto: "خودکار",
              square: "مربعی ۱:۱ (پروفایل و پست)",
              story: "عمودی ۹:۱۶ (استوری)",
              horizontal: "افقی ۱۶:۹ (بنر)"
            };
            await sendTelegramText(botToken, chatId, `✅ نسبت کادر پیش‌فرض روی *«${ratioLabels[resolved] || resolved}»* تنظیم شد.\nبرای مشاهده تنظیمات: /settings`);
            return;
          }

          // Plain text / Poetry / Calligraphy request
          const { font: overrideFont, theme: overrideTheme, ratio: overrideRatio, sticker: overrideSticker, cleanText } = parseInlineOverrides(rawText);
          if (!cleanText) {
            await sendTelegramText(botToken, chatId, "لطفاً متن یا بیتی برای خوشنویسی ارسال کنید.\nراهنما: /help");
            return;
          }

          await sendTelegramAction(botToken, chatId, "upload_photo");

          const prefs = await getPrefs(env, chatId);
          const finalFont = overrideFont || prefs.font || DEFAULT_FONT;
          const finalTheme = overrideTheme || prefs.theme || DEFAULT_THEME;
          const finalRatio = overrideRatio || prefs.ratio || DEFAULT_RATIO;
          const isSticker = overrideSticker !== null ? overrideSticker : (prefs.sticker === true || finalTheme === "sticker" || finalTheme === "transparent");

          const rendered = await renderNastaliq(env, cleanText, {
            fontKey: finalFont,
            theme: finalTheme,
            fontSize: 54,
            transparent: isSticker,
            ratio: finalRatio
          });

          const fontLabel = FONTS[finalFont]?.name || finalFont;
          const themeLabel = THEMES[finalTheme]?.name || finalTheme;
          const poetryTag = rendered.isPoetry ? " [شعر]" : "";
          const ratioTag = finalRatio !== "auto" ? ` [${finalRatio}]` : "";

          const caption = isSticker
            ? `✨ استیکر خوشنویسی (${fontLabel})${poetryTag}\n🤖 @IRnastaliqbot`
            : `🖋️ خط: ${fontLabel} | تم: ${themeLabel}${poetryTag}${ratioTag}\n🤖 @IRnastaliqbot`;

          if (isSticker) {
            await sendTelegramDocument(botToken, chatId, rendered.pngBuffer, "nastaliq-sticker.png", caption);
          } else {
            await sendTelegramPhoto(botToken, chatId, rendered.pngBuffer, caption);
          }
        } catch (err) {
          console.error("Worker process error:", err);
          await sendTelegramText(botToken, chatId, "متاسفانه در تولید تصویر مشکلی پیش آمد: " + err.message);
        }
      })());

      return new Response("OK", { status: 200, headers: CORS_HEADERS });
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};
