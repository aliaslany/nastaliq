import { renderNastaliq, getFont } from "./renderer.js";
import { DEMO_HTML } from "./html.js";
import { FONTS, THEMES, resolveFont, resolveRatio } from "./themes.js";
import {
  saveRenderState,
  loadRenderState,
  processTelegramUpdate
} from "./telegram.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

function renderResponseHeaders(res, format) {
  const base = {
    ...CORS_HEADERS,
    "Cache-Control": "public, max-age=3600",
    "X-Poetry": res.isPoetry ? "1" : "0",
    "X-Dimensions": `${res.width}x${res.height}`,
    "X-Ratio": res.ratio
  };
  if (format === "svg") {
    return { ...base, "Content-Type": "image/svg+xml; charset=utf-8" };
  }
  return { ...base, "Content-Type": "image/png" };
}

function buildRenderOptions(params) {
  const format = (params.format || "png").toLowerCase() === "svg" ? "svg" : "png";
  const fontRaw = params.font || "iran-nastaliq";
  const ratioRaw = params.ratio || "auto";
  return {
    text: params.text || "به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد",
    format,
    opts: {
      theme: params.theme || "gold",
      fontKey: resolveFont(fontRaw) || fontRaw,
      fontSize: parseInt(params.fontSize || params.size || "54", 10),
      transparent: params.transparent === true || params.transparent === "true",
      ratio: resolveRatio(ratioRaw) || ratioRaw,
      justify: params.justify === true || params.justify === "true",
      signature: params.signature || "",
      fgColor: params.fgColor || null,
      bgColor: params.bgColor || null,
      frame: params.frame || null,
      hd: params.hd !== false && params.hd !== "false",
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const originUrl = `${url.protocol}//${url.host}`;

    // 1. GET & HEAD routes
    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/" || url.pathname === "/demo") {
        return new Response(DEMO_HTML, {
          headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/api/fonts") {
        return new Response(JSON.stringify(FONTS), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
        });
      }

      if (url.pathname === "/api/themes") {
        return new Response(JSON.stringify(THEMES), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
        });
      }

      if (url.pathname.startsWith("/api/share/")) {
        const id = url.pathname.replace("/api/share/", "").trim();
        const state = await loadRenderState(env, id);
        if (!state) {
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
        // Strip heavy embedded photo before sending metadata back to studio
        const { bgImageBase64, ...meta } = state;
        return new Response(JSON.stringify(meta), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
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
          const params = Object.fromEntries(url.searchParams.entries());
          const { text, format, opts } = buildRenderOptions(params);
          const res = await renderNastaliq(env, text, { ...opts, format });
          return new Response(format === "svg" ? res.svg : res.pngBuffer, {
            headers: renderResponseHeaders(res, format),
          });
        } catch (err) {
          return new Response("Render error: " + err.message, { status: 500, headers: CORS_HEADERS });
        }
      }
    }

    // 2. POST /api/share (Persist preset for short Telegram & web links)
    if (request.method === "POST" && url.pathname === "/api/share") {
      try {
        const body = await request.json();
        const state = {
          text: String(body.text || "").slice(0, 1200),
          font: resolveFont(body.font) || "iran-nastaliq",
          theme: body.theme || "gold",
          ratio: resolveRatio(body.ratio) || "auto",
          justify: body.justify === true,
          sticker: body.transparent === true,
          signature: String(body.signature || "").slice(0, 80),
          fgColor: body.fgColor || null,
          bgColor: body.bgColor || null,
          fontSize: parseInt(body.fontSize || "54", 10)
        };
        const id = await saveRenderState(env, state);
        return new Response(JSON.stringify({
          id,
          telegramUrl: `https://t.me/IRnastaliqbot?start=s_${id}`,
          webUrl: `https://nastaliq.startstar.ir/?s=${id}`
        }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }

    // 3. POST /api/render
    if (request.method === "POST" && url.pathname === "/api/render") {
      try {
        const body = await request.json();
        const { text, format, opts } = buildRenderOptions(body);
        const res = await renderNastaliq(env, text, { ...opts, format });
        return new Response(format === "svg" ? res.svg : res.pngBuffer, {
          headers: renderResponseHeaders(res, format),
        });
      } catch (err) {
        return new Response(err.message, { status: 500, headers: CORS_HEADERS });
      }
    }

    // 4. Telegram Webhook (POST / or POST /webhook)
    if (request.method === "POST") {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return new Response("TELEGRAM_BOT_TOKEN not configured", { status: 500, headers: CORS_HEADERS });
      }

      if (env.TELEGRAM_WEBHOOK_SECRET) {
        const headerSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (headerSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
          return new Response("Forbidden", { status: 403, headers: CORS_HEADERS });
        }
      }

      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("Invalid JSON", { status: 400, headers: CORS_HEADERS });
      }

      ctx.waitUntil(processTelegramUpdate(botToken, env, update, originUrl));
      return new Response("OK", { status: 200, headers: CORS_HEADERS });
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};
