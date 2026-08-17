/**
 * Nastaliq Bot - Cloudflare Worker
 *
 * Role: thin, fast relay between Telegram and GitHub Actions.
 *   Telegram --webhook--> [this Worker] --repository_dispatch--> GitHub Actions
 *                                                                      |
 *                                                            renders PNG, calls
 *                                                            Telegram sendPhoto directly
 *
 * The Worker never renders anything itself (Workers can't run Pango/Cairo).
 * It only: verifies the request is really from Telegram, parses the
 * command, persists per-chat preferences in KV, and fires the dispatch.
 *
 * Required secrets (wrangler secret put <name>):
 *   TELEGRAM_BOT_TOKEN       - from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET  - random string, must match setWebhook's secret_token
 *   GITHUB_TOKEN             - PAT (classic, "repo" scope) or fine-grained with
 *                              Contents:read/write + Actions:read/write
 *   GITHUB_OWNER             - e.g. "aliaslany"
 *   GITHUB_REPO              - e.g. "nastaliq-bot"
 *
 * KV binding (see wrangler.toml): PREFS
 */

// Keep these in sync with render.py's FONT_REGISTRY / THEMES keys.
const FONTS = ["iran-nastaliq", "noto-nastaliq"];
const THEMES = ["classic", "gold", "night", "rose"];

// Short aliases users are likely to type, mapped to canonical keys.
const FONT_ALIASES = {
  iran: "iran-nastaliq",
  "iran-nastaliq": "iran-nastaliq",
  noto: "noto-nastaliq",
  "noto-nastaliq": "noto-nastaliq",
};

function resolveFont(input) {
  return FONT_ALIASES[input] || null;
}
const DEFAULT_FONT = "iran-nastaliq";
const DEFAULT_THEME = "classic";

const HELP_TEXT = [
  "به فارسی بنویسید تا به خط نستعلیق تبدیل شود.",
  "Send any Persian text and I'll render it in Nastaliq calligraphy.",
  "",
  "Commands:",
  "/font <name> - set your default font",
  "/theme <name> - set your default color theme",
  "/fonts - list available fonts",
  "/themes - list available themes",
  "",
  `Fonts: ${FONTS.join(", ")}`,
  `Themes: ${THEMES.join(", ")}`,
  "",
  "One-off override without changing your default:",
  "font=noto theme=gold: متن شما اینجا",
].join("\n");

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK - nastaliq bot webhook", { status: 200 });
    }

    // --- Verify this really came from Telegram ---
    const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (!env.TELEGRAM_WEBHOOK_SECRET || secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const message = update.message;
    if (!message || !message.text) {
      // Ignore non-text updates (stickers, edits, etc.) but still ack fast.
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const rawText = message.text.trim();

    try {
      await handleMessage(rawText, chatId, env);
    } catch (err) {
      console.error("handleMessage failed:", err);
      await sendMessage(env, chatId, "Something went wrong on my end. Please try again in a moment.");
    }

    // Always 200 quickly so Telegram doesn't retry-storm us.
    return new Response("OK", { status: 200 });
  },
};

async function handleMessage(text, chatId, env) {
  if (text === "/start" || text === "/help") {
    await sendMessage(env, chatId, HELP_TEXT);
    return;
  }

  if (text === "/fonts") {
    await sendMessage(env, chatId, `Available fonts:\n${FONTS.join("\n")}`);
    return;
  }

  if (text === "/themes") {
    await sendMessage(env, chatId, `Available themes:\n${THEMES.join("\n")}`);
    return;
  }

  if (text.startsWith("/font")) {
    const arg = text.replace("/font", "").trim().toLowerCase();
    const resolved = resolveFont(arg);
    if (!resolved) {
      await sendMessage(env, chatId, `Unknown font. Choose one: ${FONTS.join(", ")}`);
      return;
    }
    await setPref(env, chatId, "font", resolved);
    await sendMessage(env, chatId, `Default font set to ${resolved}.`);
    return;
  }

  if (text.startsWith("/theme")) {
    const arg = text.replace("/theme", "").trim().toLowerCase();
    if (!THEMES.includes(arg)) {
      await sendMessage(env, chatId, `Unknown theme. Choose one: ${THEMES.join(", ")}`);
      return;
    }
    await setPref(env, chatId, "theme", arg);
    await sendMessage(env, chatId, `Default theme set to ${arg}.`);
    return;
  }

  // Anything else is treated as text to render.
  const { font: overrideFont, theme: overrideTheme, cleanText } = parseInlineOverrides(text);

  if (!cleanText) {
    await sendMessage(env, chatId, "Send some text and I'll render it. /help for options.");
    return;
  }

  const prefs = await getPrefs(env, chatId);
  const font = overrideFont || prefs.font || DEFAULT_FONT;
  const theme = overrideTheme || prefs.theme || DEFAULT_THEME;

  await dispatchRender(env, { text: cleanText, font, theme, chatId, messageId: null });
}

/**
 * Parses optional leading "font=X theme=Y: " prefix off a message, e.g.
 *   "font=noto theme=gold: به نام خداوند"
 * Returns cleanText with the prefix stripped. If no ":" prefix syntax is
 * present, the whole string is treated as text (no overrides).
 */
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
    theme: THEMES.includes(flags.theme) ? flags.theme : null,
    cleanText: body.trim(),
  };
}

async function getPrefs(env, chatId) {
  const raw = await env.PREFS.get(`chat:${chatId}`);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function setPref(env, chatId, key, value) {
  const prefs = await getPrefs(env, chatId);
  prefs[key] = value;
  await env.PREFS.put(`chat:${chatId}`, JSON.stringify(prefs));
}

async function dispatchRender(env, { text, font, theme, chatId, messageId }) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "nastaliq-bot-worker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_type: "nastaliq-render",
      client_payload: { text, font, theme, chat_id: chatId, message_id: messageId },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("GitHub dispatch failed:", res.status, body);
    await sendMessage(env, chatId, "Couldn't queue the render job. Please try again shortly.");
    return;
  }

  // Fast ack so the user knows it's working; the Action sends the actual image.
  await sendMessage(env, chatId, "در حال آماده‌سازی نستعلیق شما… 🖋️");
}

async function sendMessage(env, chatId, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
