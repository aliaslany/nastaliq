[README.md](https://github.com/user-attachments/files/31241247/README.md)
# nastaliq-bot 🖋️

A Telegram bot that renders Persian text in **Nastaliq calligraphy**. Fully serverless: a Cloudflare Worker receives the Telegram webhook, dispatches the render job to GitHub Actions, which does the actual typesetting with Pango/Cairo and sends the image back — no server to keep running.

**[فارسی ⬇️](#فارسی)** | **English ⬆️**

---

## How it works

```
Telegram message
      │
      ▼
Cloudflare Worker  (verifies request, parses command, reads/writes KV prefs)
      │  repository_dispatch
      ▼
GitHub Actions     (Pango/Cairo render, sends photo, commits to gallery)
      │
      ▼
Telegram photo reply + results/index.json (for the Pages gallery)
```

Plain PIL/Pillow text drawing can't shape Nastaliq correctly — the script relies on **Pango**, which uses HarfBuzz under the hood to handle Persian's contextual letter joining and ligatures properly.

## Features

- 🎨 Multiple fonts — `iran-nastaliq` (IranNastaliq) and `noto-nastaliq` (Noto Nastaliq Urdu)
- 🌈 Color themes — `classic`, `gold`, `night`, `rose`
- 💾 Per-chat default preferences, stored in Cloudflare KV
- ⚡ One-off overrides without changing your default: `font=noto theme=gold: متن شما`
- 🖼️ Public render gallery (`results/` + `index.json`) for a future GitHub Pages site
- 🔒 Webhook signature verification, and user text is passed through `env:` (never shell-interpolated) to avoid script injection in the Action

## Repo structure

```
render.py                        # Pango/Cairo text-to-image renderer (CLI + env-var input)
fonts/                           # Bundled .ttf files
worker/
  src/index.js                   # Cloudflare Worker: Telegram webhook -> GitHub dispatch
  wrangler.toml
scripts/
  append_result.py               # Appends each render to results/index.json
.github/workflows/
  nastaliq-render.yml            # Listens for the dispatch, renders, replies, commits to gallery
results/                         # Gallery output (committed automatically by the Action)
```

## Bot commands

| Command | Effect |
|---|---|
| `/help` | Usage instructions |
| `/fonts` | List available fonts |
| `/themes` | List available themes |
| `/font <name>` | Set your default font (`iran` or `noto`) |
| `/theme <name>` | Set your default theme |
| _(plain text)_ | Renders using your saved defaults |
| `font=noto theme=gold: متن` | One-off render with inline overrides |

## Local development

```bash
# System deps (Ubuntu/Debian)
sudo apt-get install libpango-1.0-0 libpangocairo-1.0-0 gir1.2-pango-1.0 \
  python3-gi python3-gi-cairo python3-cairo fontconfig

python3 render.py "به نام خداوند جان و خرد" -f iran-nastaliq -t classic -o out.png
```

## Deployment

1. Push this repo to GitHub.
2. Add repo secret `TELEGRAM_BOT_TOKEN` (Settings → Secrets and variables → Actions).
3. Create a classic GitHub PAT with `repo` scope (used by the Worker to trigger Actions).
4. From `worker/`:
   ```bash
   wrangler login
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_WEBHOOK_SECRET
   wrangler secret put GITHUB_TOKEN
   wrangler secret put GITHUB_OWNER
   wrangler secret put GITHUB_REPO
   wrangler deploy
   ```
5. Point Telegram at the Worker:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<your-worker>.workers.dev" \
     -d "secret_token=<same value as TELEGRAM_WEBHOOK_SECRET>"
   ```

## License

MIT — feel free to adjust if you'd prefer something else.

---

## فارسی

ربات تلگرامی که متن فارسی را با **خط نستعلیق** رندر می‌کند. کاملاً سرورلس: یک Cloudflare Worker وب‌هوک تلگرام را دریافت می‌کند، کار رندر را به GitHub Actions می‌سپارد، و در آنجا با Pango/Cairo حروف‌چینی واقعی انجام و تصویر برگردانده می‌شود — بدون نیاز به هیچ سروری که همیشه روشن باشد.

### نحوه کار

```
پیام تلگرام
      │
      ▼
Cloudflare Worker   (بررسی درخواست، تشخیص دستور، خواندن/نوشتن تنظیمات در KV)
      │  repository_dispatch
      ▼
GitHub Actions      (رندر با Pango/Cairo، ارسال عکس، ثبت در گالری)
      │
      ▼
پاسخ عکس در تلگرام + results/index.json (برای سایت گالری در GitHub Pages)
```

رسم متن با PIL/Pillow به‌تنهایی نمی‌تواند نستعلیق را درست شکل دهد — این اسکریپت از **Pango** استفاده می‌کند که در پسِ‌پرده با HarfBuzz، اتصال حروف و ترکیب‌های نستعلیق را به‌درستی مدیریت می‌کند.

### امکانات

- 🎨 چند فونت — `iran-nastaliq` و `noto-nastaliq`
- 🌈 چند تم رنگی — `classic`، `gold`، `night`، `rose`
- 💾 ذخیره تنظیمات پیش‌فرض هر کاربر در Cloudflare KV
- ⚡ امکان تغییر موقت بدون تغییر پیش‌فرض: `font=noto theme=gold: متن شما`
- 🖼️ گالری عمومی رندرها (`results/` و `index.json`) برای سایت آینده در GitHub Pages
- 🔒 بررسی امضای وب‌هوک، و عبور متن کاربر از طریق `env:` (بدون تزریق مستقیم در شل) برای جلوگیری از آسیب‌پذیری تزریق اسکریپت

### دستورات ربات

| دستور | عملکرد |
|---|---|
| `/help` | راهنمای استفاده |
| `/fonts` | فهرست فونت‌های موجود |
| `/themes` | فهرست تم‌های موجود |
| `/font <name>` | تنظیم فونت پیش‌فرض (`iran` یا `noto`) |
| `/theme <name>` | تنظیم تم پیش‌فرض |
| _(متن ساده)_ | رندر با تنظیمات پیش‌فرض ذخیره‌شده |
| `font=noto theme=gold: متن` | رندر یک‌باره با تنظیمات دلخواه |

### توسعه محلی

```bash
sudo apt-get install libpango-1.0-0 libpangocairo-1.0-0 gir1.2-pango-1.0 \
  python3-gi python3-gi-cairo python3-cairo fontconfig

python3 render.py "به نام خداوند جان و خرد" -f iran-nastaliq -t classic -o out.png
```

### استقرار (Deployment)

۱. این ریپازیتوری را در گیت‌هاب push کنید.
۲. راز `TELEGRAM_BOT_TOKEN` را به تنظیمات ریپو اضافه کنید (Settings → Secrets and variables → Actions).
۳. یک GitHub PAT کلاسیک با دسترسی `repo` بسازید (برای فراخوانی Actions توسط Worker).
۴. از داخل پوشه `worker/`:
   ```bash
   wrangler login
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_WEBHOOK_SECRET
   wrangler secret put GITHUB_TOKEN
   wrangler secret put GITHUB_OWNER
   wrangler secret put GITHUB_REPO
   wrangler deploy
   ```
۵. آدرس Worker را به تلگرام معرفی کنید:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<your-worker>.workers.dev" \
     -d "secret_token=<same value as TELEGRAM_WEBHOOK_SECRET>"
   ```

### مجوز

MIT — در صورت تمایل می‌توانید تغییر دهید.
