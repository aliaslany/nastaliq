export const DEMO_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>خوشنویسی نستعلیق آنلاین | ربات تلگرام @IRnastaliqbot</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'IranNastaliq';
      src: url('/fonts/IranNastaliq.ttf') format('truetype');
      font-display: swap;
    }
    :root {
      --bg: #0b0f19;
      --card-bg: #151d30;
      --card-border: #233152;
      --gold: #d4af37;
      --gold-light: #f3e5ab;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Vazirmatn', sans-serif;
      background: radial-gradient(circle at 50% 0%, #1e2942 0%, var(--bg) 75%);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1rem;
      line-height: 1.6;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.35);
      color: var(--gold-light);
      padding: 0.4rem 1.2rem;
      border-radius: 999px;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 0%, var(--gold-light) 60%, var(--gold) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.75rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
      max-width: 680px;
      margin: 0 auto;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 3rem;
    }
    @media (max-width: 800px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1.25rem;
      padding: 1.75rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text);
      font-size: 0.95rem;
    }
    textarea {
      width: 100%;
      height: 110px;
      background: #0d1322;
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      color: var(--text);
      padding: 0.85rem;
      font-family: inherit;
      font-size: 1.1rem;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }
    textarea:focus {
      border-color: var(--gold);
    }
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .preset-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--text-muted);
      padding: 0.3rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .preset-btn:hover {
      background: rgba(212, 175, 55, 0.2);
      border-color: var(--gold);
      color: var(--gold-light);
    }
    .row {
      display: flex;
      gap: 1rem;
    }
    select, input[type="range"] {
      width: 100%;
      background: #0d1322;
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      color: var(--text);
      padding: 0.65rem 0.85rem;
      outline: none;
      font-family: inherit;
    }
    .btn-submit {
      width: 100%;
      background: linear-gradient(135deg, #d4af37 0%, #b89127 100%);
      color: #000;
      font-weight: 700;
      font-size: 1.1rem;
      padding: 0.85rem;
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: transform 0.15s, opacity 0.2s;
      margin-top: 0.5rem;
    }
    .btn-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212,175,55,0.4);
    }
    .btn-submit:active { transform: translateY(0); }
    .preview-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      background: #090d16;
      border: 1px dashed var(--card-border);
      border-radius: 1rem;
      overflow: hidden;
      padding: 1.5rem;
      position: relative;
    }
    .preview-img {
      max-width: 100%;
      height: auto;
      border-radius: 0.75rem;
      box-shadow: 0 8px 25px rgba(0,0,0,0.5);
      transition: opacity 0.3s;
    }
    .spinner {
      display: none;
      width: 40px;
      height: 40px;
      border: 3px solid rgba(212,175,55,0.2);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.25rem;
      width: 100%;
    }
    .btn-action {
      flex: 1;
      text-align: center;
      text-decoration: none;
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 0.75rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
    }
    .telegram-banner {
      background: linear-gradient(135deg, rgba(34, 158, 217, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid rgba(34, 158, 217, 0.4);
      border-radius: 1.25rem;
      padding: 2rem;
      text-align: center;
      margin-bottom: 3rem;
    }
    .btn-telegram {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: #229ed9;
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 1.15rem;
      padding: 0.85rem 2rem;
      border-radius: 999px;
      box-shadow: 0 6px 25px rgba(34, 158, 217, 0.4);
      transition: all 0.2s;
      margin-top: 1.25rem;
    }
    .btn-telegram:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(34, 158, 217, 0.6);
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    .feat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
    }
    .feat-icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
    }
    .feat-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--gold-light);
      margin-bottom: 0.5rem;
    }
    footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">✨ ۱۰۰٪ سرورلس روی Cloudflare Workers با وب‌اسمبلی</div>
      <h1>خوشنـویسی و خطاطـی نستـعلیق</h1>
      <p class="subtitle">تبدیل هوشمند متن فارسی به زیباترین خطاطی نستعلیق با اتصالات اصیل حروفی و تم‌های رنگی متنوع در لحظه</p>
    </header>

    <div class="grid">
      <!-- Input Card -->
      <div class="card">
        <h2 style="font-size:1.3rem; margin-bottom:1rem; color:var(--gold-light);">🖋️ نگارش متن</h2>
        <div class="form-group">
          <label for="textInput">متن دلخواه شما (فارسی / اشعار):</label>
          <textarea id="textInput" placeholder="متن خود را اینجا بنویسید...">به نام خداوند جان و خرد
کزین برتر اندیشه برنگذرد</textarea>
          <div class="presets">
            <span style="font-size:0.8rem; color:var(--text-muted); align-self:center;">نمونه‌ها:</span>
            <button class="preset-btn" onclick="setPreset('سعدی')">سعدی</button>
            <button class="preset-btn" onclick="setPreset('حافظ')">حافظ</button>
            <button class="preset-btn" onclick="setPreset('مولانا')">مولانا</button>
            <button class="preset-btn" onclick="setPreset('خیام')">خیام</button>
          </div>
        </div>

        <div class="row form-group">
          <div style="flex:1;">
            <label for="fontSelect">فونت خطاطی:</label>
            <select id="fontSelect">
              <option value="iran-nastaliq" selected>ایران نستعلیق (اصیل)</option>
              <option value="noto-nastaliq">نستعلیق نوستو (اردو/فارسی)</option>
            </select>
          </div>
          <div style="flex:1;">
            <label for="themeSelect">تم رنگی:</label>
            <select id="themeSelect">
              <option value="gold" selected>زرین و طلا (Gold)</option>
              <option value="classic">کلاسیک (سیاه و کاغذ کاهی)</option>
              <option value="night">شب نیلی (Night Dark)</option>
              <option value="rose">گل سرخ (Rose)</option>
              <option value="emerald">زمردین (Emerald)</option>
              <option value="azure">لاجورد (Azure)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="sizeRange">اندازه قلم: <span id="sizeVal">56</span>px</label>
          <input type="range" id="sizeRange" min="36" max="90" value="56" oninput="document.getElementById('sizeVal').innerText = this.value">
        </div>

        <button class="btn-submit" onclick="generate()">🖌️ رندر و خطاطی نستعلیق</button>
      </div>

      <!-- Preview Card -->
      <div class="card">
        <h2 style="font-size:1.3rem; margin-bottom:1rem; color:var(--gold-light);">🖼️ پیش‌نمایش تصویر خروجی</h2>
        <div class="preview-box">
          <div id="spinner" class="spinner"></div>
          <img id="previewImg" class="preview-img" alt="Nastaliq Render" src="/api/render?text=%D8%A8%D9%87%20%D9%86%D8%A7%D9%85%20%D8%AE%D8%AF%D8%A7%D9%88%D9%86%D8%AF%20%D8%AC%D8%A7%D9%86%20%D9%88%20%D8%AE%D8%B1%D8%AF%0A%DA%A9%D8%B2%DB%8C%D9%86%20%D8%A8%D8%B1%D8%AA%D8%B1%20%D8%A7%D9%86%D8%AF%DB%8C%D8%B4%D9%87%20%D8%A8%D8%B1%D9%86%DA%AF%D8%B0%D8%B1%D8%AF&theme=gold&font=iran-nastaliq&size=54">
        </div>
        <div class="actions">
          <button class="btn-action" onclick="downloadImage()">💾 دریافت تصویر (PNG)</button>
          <button class="btn-action" onclick="shareTelegram()">🚀 ارسال در تلگرام</button>
        </div>
      </div>
    </div>

    <!-- Telegram Bot Call to Action -->
    <div class="telegram-banner">
      <h2 style="font-size:1.8rem; margin-bottom:0.75rem; color:white;">ربات تلگرام نستعلیق فعال و آماده استفاده است!</h2>
      <p style="color:rgba(255,255,255,0.85); max-width:650px; margin:0 auto;">
        بدون نیاز به نصب هیچ نرم‌افزاری، هر متنی را در تلگرام به آیدی <strong>@IRnastaliqbot</strong> بفرستید تا فوراً تصویر خطاطی خوشنویسی شده با فونت نستعلیق اصیل را دریافت کنید.
      </p>
      <a href="https://t.me/IRnastaliqbot" target="_blank" class="btn-telegram">
        <span>💬 ورود به ربات @IRnastaliqbot</span>
      </a>
    </div>

    <!-- Features -->
    <div class="features">
      <div class="feat-card">
        <div class="feat-icon">⚡</div>
        <div class="feat-title">اجرای ۱۰۰٪ داخل کلودفلر</div>
        <p style="color:var(--text-muted); font-size:0.95rem;">
          موتور حروف‌چینی به طور کامل با ترکیب HarfBuzz WASM و Resvg درون ورکرز Cloudflare با سرعت زیر ۵۰ میلی‌ثانیه بدون هیچ سرور خارجی اجرا می‌شود.
        </p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🖋️</div>
        <div class="feat-title">اتصالات خوشنویسی دقیق</div>
        <p style="color:var(--text-muted); font-size:0.95rem;">
          خط نستعلیق دارای کرسی‌های متصل شیب‌دار است که با موتور HarfBuzz تمامی گلیف‌ها و ترکیبات کشیده با اوج دقت شکل می‌گیرند.
        </p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🎨</div>
        <div class="feat-title">تم‌های رنگی و تنظیمات ابری</div>
        <p style="color:var(--text-muted); font-size:0.95rem;">
          پشتیبانی از تم‌های طلایی، کلاسیک، شب و ذخیره‌سازی ترجیحات هر کاربر و گروه در فضای ابری Cloudflare KV.
        </p>
      </div>
    </div>

    <footer>
      <p>طراحی و توسعه یافته توسط <strong>startStar</strong> | دامنه: <strong>nastaliq.startstar.ir</strong></p>
      <p style="margin-top:0.4rem; font-size:0.8rem; color:#64748b;">Telegram Bot: @IRnastaliqbot | MIT License</p>
    </footer>
  </div>

  <script>
    const presets = {
      'سعدی': 'تن آدمی شریف است به جان آدمیت\\nنه همین لباس زیباست نشان آدمیت',
      'حافظ': 'در ازل پرتو حسنت ز تجلی دم زد\\nعشق پیدا شد و آتش به همه عالم زد',
      'مولانا': 'بشنو این نی چون شکایت می‌کند\\nاز جدایی‌ها حکایت می‌کند',
      'خیام': 'ابر آمد و زار بر سر سبزه گریست\\nبی باده گلرنگ نمی‌شاید زیست'
    };

    function setPreset(name) {
      if (presets[name]) {
        document.getElementById('textInput').value = presets[name];
        generate();
      }
    }

    let currentBlobUrl = null;

    async function generate() {
      const text = document.getElementById('textInput').value.trim();
      if (!text) return;
      const font = document.getElementById('fontSelect').value;
      const theme = document.getElementById('themeSelect').value;
      const size = document.getElementById('sizeRange').value;

      const previewImg = document.getElementById('previewImg');
      const spinner = document.getElementById('spinner');

      previewImg.style.opacity = '0.3';
      spinner.style.display = 'block';

      try {
        const resp = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, font, theme, fontSize: parseInt(size) })
        });
        if (!resp.ok) throw new Error(await resp.text());
        const blob = await resp.blob();
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = URL.createObjectURL(blob);
        previewImg.src = currentBlobUrl;
      } catch (err) {
        alert('خطا در رندر: ' + err.message);
      } finally {
        previewImg.style.opacity = '1';
        spinner.style.display = 'none';
      }
    }

    function downloadImage() {
      const img = document.getElementById('previewImg');
      const a = document.createElement('a');
      a.href = img.src;
      a.download = 'nastaliq-calligraphy.png';
      a.click();
    }

    function shareTelegram() {
      const text = document.getElementById('textInput').value.trim();
      const url = 'https://t.me/IRnastaliqbot?start=' + encodeURIComponent(text);
      window.open(url, '_blank');
    }
  </script>
</body>
</html>
`;
