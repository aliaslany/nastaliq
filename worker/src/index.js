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
    return { font: null, theme: null, cleanText: text };
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
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Web Page & Assets
    if (request.method === "GET") {
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
          const text = url.searchParams.get("text") || "به نام خداوند جان و خرد";
          const theme = url.searchParams.get("theme") || "gold";
          const font = url.searchParams.get("font") || "iran-nastaliq";
          const size = parseInt(url.searchParams.get("size") || "54");

          const res = await renderNastaliq(env, text, {
            theme,
            fontKey: font,
            fontSize: size,
          });

          return new Response(res.pngBuffer, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600",
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
        const text = body.text || "به نام خداوند جان و خرد";
        const theme = body.theme || "gold";
        const font = body.font || "iran-nastaliq";
        const size = parseInt(body.fontSize || "56");

        const res = await renderNastaliq(env, text, {
          theme,
          fontKey: font,
          fontSize: size,
        });

        return new Response(res.pngBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
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

      // Process in background / don't block response to Telegram
      ctx.waitUntil((async () => {
        try {
          if (rawText === "/start" || rawText === "/help") {
            const welcomeText = [
              "🖋️ *به ربات خطاطی و خوشنویسی نستعلیق خوش آمدید!*",
              "",
              "این ربات تماماً بر بستر سرورلس Cloudflare Workers با فناوری WebAssembly و موتور HarfBuzz اجرا می‌شود و در کسری از ثانیه متن شما را خطاطی می‌کند.",
              "",
              "✨ *روش استفاده:*",
              "کافی است هر متن یا بیتی را به زبان فارسی ارسال کنید تا فوراً تصویر نستعلیق آن برای شما فرستاده شود.",
              "",
              "⚙️ *دستورات تنظیمی:*",
              "• /fonts — فهرست فونت‌های نستعلیق",
              "• /themes — فهرست تم‌های رنگی",
              "• `/font iran` یا `/font noto` — تغییر فونت پیش‌فرض",
              "• `/theme gold` — تغییر تم رنگی پیش‌فرض",
              "",
              "⚡ *تغییر موقت بدون دستکاری تنظیمات:*",
              "`font=noto theme=gold: متن شما`",
              "",
              "🌐 وب‌سایت دمو و تست آنلاین:",
              "https://nastaliq.startstar.ir"
            ].join("\n");

            await sendTelegramText(botToken, chatId, welcomeText);

            // Render a welcome calligraphy piece
            const welcomeRender = await renderNastaliq(env, "به نام خداوند جان و خرد", {
              fontKey: "iran-nastaliq",
              theme: "gold",
              fontSize: 54
            });
            await sendTelegramPhoto(botToken, chatId, welcomeRender.pngBuffer, "🖋️ نمونه خطاطی: به نام خداوند جان و خرد\nتم: طلا و زر | @IRnastaliqbot");
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
              await sendTelegramText(botToken, chatId, "❌ تم نامعتبر است. گزینه‌ها: `gold`, `classic`, `night`, `rose`, `emerald`, `azure`");
              return;
            }
            await setPref(env, chatId, "theme", resolved);
            const themeName = THEMES[resolved]?.name || resolved;
            await sendTelegramText(botToken, chatId, `✅ تم رنگی پیش‌فرض شما روی *«${themeName}»* تنظیم شد.`);
            return;
          }

          // Plain text / Calligraphy request
          const { font: overrideFont, theme: overrideTheme, cleanText } = parseInlineOverrides(rawText);
          if (!cleanText) {
            await sendTelegramText(botToken, chatId, "لطفاً متنی برای خطاطی وارد کنید.");
            return;
          }

          // Send action
          await sendTelegramAction(botToken, chatId, "upload_photo");

          // Get user preferences
          const prefs = await getPrefs(env, chatId);
          const finalFont = overrideFont || prefs.font || DEFAULT_FONT;
          const finalTheme = overrideTheme || prefs.theme || DEFAULT_THEME;

          const rendered = await renderNastaliq(env, cleanText, {
            fontKey: finalFont,
            theme: finalTheme,
            fontSize: 54
          });

          const fontLabel = FONTS[finalFont]?.name || finalFont;
          const themeLabel = THEMES[finalTheme]?.name || finalTheme;
          const caption = `🖋️ خط: ${fontLabel} | تم: ${themeLabel}\n🤖 @IRnastaliqbot`;

          await sendTelegramPhoto(botToken, chatId, rendered.pngBuffer, caption);
        } catch (err) {
          console.error("Worker process error:", err);
          await sendTelegramText(botToken, chatId, "متاسفانه در تولید تصویر خطاطی مشکلی پیش آمد: " + err.message);
        }
      })());

      return new Response("OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
};
