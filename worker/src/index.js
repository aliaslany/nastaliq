import { renderNastaliq, FONTS, THEMES, getFont } from "./renderer.js";
import { DEMO_HTML } from "./html.js";

const DEFAULT_FONT = "iran-nastaliq";
const DEFAULT_THEME = "classic";

const FONT_ALIASES = {
  iran: "iran-nastaliq",
  "iran-nastaliq": "iran-nastaliq",
  noto: "noto-nastaliq",
  "noto-nastaliq": "noto-nastaliq",
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

function parseInlineOverrides(text) {
  const match = text.match(/^((?:\s*\w+=\w+\s*)+):\s*([\s\S]+)$/);
  if (!match) {
    return { font: null, theme: null, sticker: null, cleanText: text };
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
    const url = new URL(request.url);

    // 1. Web Page & Assets (GET & HEAD)
    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/" || url.pathname === "/demo") {
        return new Response(DEMO_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/fonts/IranNastaliq.ttf") {
        const { fontBuffer } = await getFont(env, "iran-nastaliq");
        return new Response(fontBuffer, {
          headers: {
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

          const res = await renderNastaliq(env, text, {
            theme,
            fontKey: font,
            fontSize: size,
            transparent
          });

          return new Response(res.pngBuffer, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
              "X-Poetry": res.isPoetry ? "1" : "0",
              "X-Dimensions": `${res.width}x${res.height}`
            },
          });
        } catch (err) {
          return new Response("Render error: " + err.message, { status: 500 });
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
        const size = parseInt(body.fontSize || "54");
        const transparent = body.transparent === true;

        const res = await renderNastaliq(env, text, {
          theme,
          fontKey: font,
          fontSize: size,
          transparent
        });

        return new Response(res.pngBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
            "X-Poetry": res.isPoetry ? "1" : "0",
            "X-Dimensions": `${res.width}x${res.height}`
          },
        });
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    // 3. Telegram Webhook (POST / or POST /webhook)
    if (request.method === "POST") {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return new Response("TELEGRAM_BOT_TOKEN not configured", { status: 500 });
      }

      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }

      const message = update.message;
      if (!message || !message.text) {
        return new Response("OK", { status: 200 });
      }

      const chatId = message.chat.id;
      const rawText = message.text.trim();

      ctx.waitUntil((async () => {
        try {
          if (rawText === "/start" || rawText === "/help") {
            const welcomeText = [
              "🖋️ *به ربات خوشنویسی و خطاطی نستعلیق خوش آمدید!*",
              "",
              "این ربات با هوشمندی کامل، اشعار و متن‌های شما را با اتصالات اصیل نستعلیق در کسری از ثانیه رندر می‌کند.",
              "",
              "📜 *قابلیت ویژه نگارش شعر (مصرع و بیت):*",
              "برای نوشتن دوبیتی یا غزل، بین هر دو مصرع علامت اسلش `/` بگذارید:",
              "`به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد`",
              "`خداوند نام و خداوند جای / خداوند روزی ده رهنمای`",
              "💡 ربات به صورت خودکار مصرع اول و دوم را روبه‌روی هم با فاصله استاندارد خوشنویسی چیدمان کرده و بین هر بیت فاصله جداگانه می‌اندازد!",
              "",
              "🎨 *دستورات تنظیمی:*",
              "• /sticker — فعال‌سازی حالت استیکر (پس‌زمینه کاملاً شفاف)",
              "• /photo — بازگشت به حالت عکس عادی با پس‌زمینه تم",
              "• /fonts — فهرست فونت‌های نستعلیق",
              "• /themes — فهرست تم‌های رنگی",
              "• `/font iran` یا `/font noto` — تنظیم فونت پیش‌فرض",
              "• `/theme gold` — تنظیم تم رنگی پیش‌فرض",
              "",
              "⚡ *تنظیمات موقت بدون تغییر پیش‌فرض:*",
              "`theme=gold: متن شما`",
              "`sticker=true: متن شما`",
              "",
              "🌐 کارگاه آنلاین و وب‌سایت دمو:",
              "https://nastaliq.startstar.ir"
            ].join("\n");

            await sendTelegramText(botToken, chatId, welcomeText);

            // Send sample couplet demo
            const sampleRender = await renderNastaliq(env, "به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد\nخداوند نام و خداوند جای / خداوند روزی ده رهنمای", {
              fontKey: "iran-nastaliq",
              theme: "gold",
              fontSize: 52
            });
            await sendTelegramPhoto(botToken, chatId, sampleRender.pngBuffer, "🖋️ نمونه چیدمان دو بیتی با تفکیک مصرع‌ها و ابیات\nتم: طلا و زر | @IRnastaliqbot");
            return;
          }

          if (rawText === "/sticker") {
            await setPref(env, chatId, "sticker", true);
            await sendTelegramText(botToken, chatId, "✨ *حالت استیکر (پس‌زمینه شفاف) فعال شد!*\nاز این پس خروجی‌ها بدون پس‌زمینه و حاشیه برای ساخت استیکر و چسباندن روی تصاویر ارسال می‌شوند.\nبرای بازگشت به حالت عکس عادی: `/photo`");
            return;
          }

          if (rawText === "/photo") {
            await setPref(env, chatId, "sticker", false);
            await sendTelegramText(botToken, chatId, "🖼️ *حالت تصویر عادی فعال شد.*\nخروجی‌ها همراه با رنگ پس‌زمینه و کادر تم ارسال خواهند شد.");
            return;
          }

          if (rawText === "/fonts") {
            const fontMsg = [
              "🔤 *فونت‌های موجود خطاطی:*",
              "1️⃣ `iran-nastaliq` (یا `iran`) — خط اصیل ایران نستعلیق",
              "2️⃣ `noto-nastaliq` (یا `noto`) — خط نستعلیق نوستو",
              "",
              "برای انتخاب: `/font iran` یا `/font noto`"
            ].join("\n");
            await sendTelegramText(botToken, chatId, fontMsg);
            return;
          }

          if (rawText === "/themes") {
            const themeMsg = [
              "🎨 *تم‌های رنگی موجود:*",
              "• `gold` — طلا و زر روی پس‌زمینه تیره",
              "• `classic` — مرکب مشکی روی کاغذ کاهی سنتی",
              "• `night` — شب نیلی و مهتابی",
              "• `rose` — گل سرخ مخملی",
              "• `emerald` — زمردین فاخر",
              "• `azure` — لاجورد درباری",
              "• `sticker` — استیکر بدون پس‌زمینه (شفاف)",
              "",
              "برای انتخاب: `/theme gold` (یا هر تم دیگر)"
            ].join("\n");
            await sendTelegramText(botToken, chatId, themeMsg);
            return;
          }

          if (rawText.startsWith("/font")) {
            const arg = rawText.replace("/font", "").trim();
            const resolved = resolveFont(arg);
            if (!resolved) {
              await sendTelegramText(botToken, chatId, "❌ فونت نامعتبر است. گزینه‌ها: `iran` یا `noto`");
              return;
            }
            await setPref(env, chatId, "font", resolved);
            const fontName = FONTS[resolved]?.name || resolved;
            await sendTelegramText(botToken, chatId, `✅ فونت پیش‌فرض شما روی *«${fontName}»* تنظیم شد.`);
            return;
          }

          if (rawText.startsWith("/theme")) {
            const arg = rawText.replace("/theme", "").trim();
            const resolved = resolveTheme(arg);
            if (!resolved) {
              await sendTelegramText(botToken, chatId, "❌ تم نامعتبر است. گزینه‌ها: `gold`, `classic`, `night`, `rose`, `emerald`, `azure`, `sticker`");
              return;
            }
            await setPref(env, chatId, "theme", resolved);
            const themeName = THEMES[resolved]?.name || resolved;
            await sendTelegramText(botToken, chatId, `✅ تم رنگی پیش‌فرض شما روی *«${themeName}»* تنظیم شد.`);
            return;
          }

          // Plain text / Poetry / Calligraphy request
          const { font: overrideFont, theme: overrideTheme, sticker: overrideSticker, cleanText } = parseInlineOverrides(rawText);
          if (!cleanText) {
            await sendTelegramText(botToken, chatId, "لطفاً متن یا بیتی برای خطاطی ارسال کنید.");
            return;
          }

          await sendTelegramAction(botToken, chatId, "upload_photo");

          const prefs = await getPrefs(env, chatId);
          const finalFont = overrideFont || prefs.font || DEFAULT_FONT;
          const finalTheme = overrideTheme || prefs.theme || DEFAULT_THEME;
          const isSticker = overrideSticker !== null ? overrideSticker : (prefs.sticker === true || finalTheme === "sticker" || finalTheme === "transparent");

          const rendered = await renderNastaliq(env, cleanText, {
            fontKey: finalFont,
            theme: finalTheme,
            fontSize: 54,
            transparent: isSticker
          });

          const fontLabel = FONTS[finalFont]?.name || finalFont;
          const themeLabel = THEMES[finalTheme]?.name || finalTheme;
          const poetryTag = rendered.isPoetry ? " [قالب شعر]" : "";
          const caption = isSticker
            ? `✨ استیکر خوشنویسی نستعلیق${poetryTag}\n🤖 @IRnastaliqbot`
            : `🖋️ خط: ${fontLabel} | تم: ${themeLabel}${poetryTag}\n🤖 @IRnastaliqbot`;

          if (isSticker) {
            // Send as transparent document so Telegram keeps full alpha transparency
            await sendTelegramDocument(botToken, chatId, rendered.pngBuffer, "nastaliq-sticker.png", caption);
          } else {
            await sendTelegramPhoto(botToken, chatId, rendered.pngBuffer, caption);
          }
        } catch (err) {
          console.error("Worker process error:", err);
          await sendTelegramText(botToken, chatId, "متاسفانه در تولید تصویر مشکلی پیش آمد: " + err.message);
        }
      })());

      return new Response("OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
};
