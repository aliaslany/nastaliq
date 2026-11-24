export const DEMO_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>خوشنویسی و خطاطی نستعلیق آنلاین | ربات تلگرام @IRnastaliqbot</title>
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
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Vazirmatn', sans-serif;
      background: radial-gradient(circle at 50% 0%, #1e2942 0%, var(--bg) 80%);
      color: var(--text);
      min-height: 100vh;
      padding: 2.5rem 1rem;
      line-height: 1.6;
    }
    .container { max-width: 1080px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2.5rem; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.35);
      color: var(--gold-light);
      padding: 0.4rem 1.25rem;
      border-radius: 999px;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 2.8rem;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 0%, var(--gold-light) 60%, var(--gold) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.75rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1.15rem;
      max-width: 760px;
      margin: 0 auto;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 3.5rem;
    }
    @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1.25rem;
      padding: 1.75rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .form-group { margin-bottom: 1.25rem; }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }
    textarea {
      width: 100%;
      height: 120px;
      background: #0d1322;
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      color: var(--text);
      padding: 0.85rem;
      font-family: inherit;
      font-size: 1.05rem;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }
    textarea:focus { border-color: var(--gold); }
    .hint {
      font-size: 0.82rem;
      color: #38bdf8;
      margin-top: 0.35rem;
      display: block;
    }
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.6rem;
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
    .row { display: flex; gap: 1rem; }
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
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.9rem;
      color: var(--text);
      cursor: pointer;
      margin-top: 0.75rem;
    }
    .checkbox-label input { width: 18px; height: 18px; cursor: pointer; }
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
      margin-top: 1rem;
    }
    .btn-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212,175,55,0.4);
    }
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
      padding: 2.25rem 1.5rem;
      text-align: center;
      margin-bottom: 3.5rem;
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
      padding: 0.9rem 2.2rem;
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
      margin-bottom: 3.5rem;
    }
    .feat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
    }
    .feat-icon { font-size: 2rem; margin-bottom: 0.75rem; }
    .feat-title { font-size: 1.15rem; font-weight: 700; color: var(--gold-light); margin-bottom: 0.5rem; }
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
      <div class="badge">✨ ۱۰۰٪ سرورلس روی Cloudflare Workers با فناوری WebAssembly</div>
      <h1>خوشنـویسی و خطاطـی نستـعلیق</h1>
      <p class="subtitle">تبدیل هوشمند متن و اشعار فارسی با تفکیک خودکار مصرع‌ها و ابیات (با علامت /) و رندر برداری در لحظه</p>
    </header>

    <div class="grid">
      <div class="card">
        <h2 style="font-size:1.3rem; margin-bottom:0.75rem; color:var(--gold-light);">🖋️ کارگاه نگارش شعر و متن</h2>
        <div class="form-group">
          <label for="textInput">متن یا ابیات شعر دلخواه:</label>
          <textarea id="textInput" placeholder="متن یا شعر را بنویسید...">به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد
خداوند نام و خداوند جای / خداوند روزی ده رهنمای</textarea>
          <span class="hint">💡 نکته شاعران: بین دو مصرع اسلش (/) بگذارید تا خودکار در دو ستون متوازن چیدمان شود.</span>
          <div class="presets">
            <span style="font-size:0.8rem; color:var(--text-muted); align-self:center;">اشعار نمونه:</span>
            <button class="preset-btn" onclick="setPreset('فردوسی')">فردوسی</button>
            <button class="preset-btn" onclick="setPreset('سعدی')">سعدی</button>
            <button class="preset-btn" onclick="setPreset('حافظ')">حافظ</button>
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
              <option value="classic">کلاسیک (کاغذ کهن)</option>
              <option value="night">شب نیلی (Night)</option>
              <option value="rose">گل سرخ (Rose)</option>
              <option value="emerald">زمردین (Emerald)</option>
              <option value="azure">لاجورد (Azure)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="sizeRange">اندازه قلم: <span id="sizeVal">52</span>px</label>
          <input type="range" id="sizeRange" min="36" max="85" value="52" oninput="document.getElementById('sizeVal').innerText = this.value">
        </div>

        <label class="checkbox-label">
          <input type="checkbox" id="transparentCheck">
          <span>✨ پس‌زمینه شفاف (حالت استیکر بدون کادر)</span>
        </label>

        <button class="btn-submit" onclick="generate()">🖌️ رندر و خطاطی نستعلیق</button>
      </div>

      <div class="card">
        <h2 style="font-size:1.3rem; margin-bottom:0.75rem; color:var(--gold-light);">🖼️ خروجی تصویر رندر شده</h2>
        <div class="preview-box">
          <div id="spinner" class="spinner"></div>
          <img id="previewImg" class="preview-img" alt="Nastaliq Render" src="/api/render">
        </div>
        <div class="actions">
          <button class="btn-action" onclick="downloadImage()">💾 دریافت تصویر (PNG)</button>
          <button class="btn-action" onclick="shareTelegram()">🚀 اشتراک در تلگرام</button>
        </div>
      </div>
    </div>

    <div class="telegram-banner">
      <h2 style="font-size:1.8rem; margin-bottom:0.75rem; color:white;">ربات تلگرام @IRnastaliqbot فعال و آنلاین است!</h2>
      <p style="color:rgba(255,255,255,0.85); max-width:650px; margin:0 auto;">
        در تلگرام هر بیتی را با علامت اسلش (/) بفرستید تا فوراً قطعه خطاطی‌شده با چیدمان شعر سنتی و کیفیت بالا برای شما ارسال شود.
      </p>
      <a href="https://t.me/IRnastaliqbot" target="_blank" class="btn-telegram">
        <span>💬 ورود به ربات @IRnastaliqbot</span>
      </a>
    </div>

    <div class="features">
      <div class="feat-card">
        <div class="feat-icon">📜</div>
        <div class="feat-title">قالب‌بندی هوشمند شعر با اسلش</div>
        <p style="color:var(--text-muted); font-size:0.95rem;">
          با قرار دادن علامت / بین مصرع‌ها، مصرع اول و دوم به صورت خودکار روبه‌روی هم قرار گرفته و بین هر بیت فاصله جداگانه می‌افتد.
        </p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">✨</div>
        <div class="feat-title">حالت استیکر (بدون پس‌زمینه)</div>
        <p style="color:var(--text-muted); font-size:0.95rem;">
          امکان تولید خروجی با پس‌زمینه کاملاً شفاف با دستور /sticker در تلگرام یا دکمه استیکر در سایت جهت درج روی تصاویر و استوری.
        </p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">⚡</div>
        <div class="feat-title">اجرای ۱۰۰٪ لبه‌ای در کلودفلر</div>
        <p style="color:var(--text-muted); font-size:0.95rem;">
          بدون وابستگی به هیچ سرور اختصاصی؛ موتور ترکیبی HarfBuzz WebAssembly و Resvg در کمتر از ۵۰ میلی‌ثانیه تصویر نهایی را می‌سازد.
        </p>
      </div>
    </div>

    <footer>
      <p>طراحی و توسعه یافته توسط <strong>startStar</strong> | دامنه رسمی: <strong>nastaliq.startstar.ir</strong></p>
      <p style="margin-top:0.4rem; font-size:0.8rem; color:#64748b;">Telegram Bot: @IRnastaliqbot | MIT License</p>
    </footer>
  </div>

  <script>
    const presets = {
      'فردوسی': 'به نام خداوند جان و خرد / کزین برتر اندیشه برنگذرد\\nخداوند نام و خداوند جای / خداوند روزی ده رهنمای',
      'سعدی': 'تن آدمی شریف است به جان آدمیت / نه همین لباس زیباست نشان آدمیت\\nاگر آدمی به چشم است و دهان و گوش و بینی / چه میان نقش دیوار و میان آدمیت',
      'حافظ': 'در ازل پرتو حسنت ز تجلی دم زد / عشق پیدا شد و آتش به همه عالم زد\\nجلوه‌ای کرد رخت دید ملک عشق نداشت / عین آتش شد از این غیرت و بر آدم زد',
      'خیام': 'ابر آمد و زار بر سر سبزه گریست / بی باده گلرنگ نمی‌شاید زیست\\nاین سبزه که امروز تماشاگه ماست / تا سبزه خاک ما تماشاگه کیست'
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
      const transparent = document.getElementById('transparentCheck').checked;

      const previewImg = document.getElementById('previewImg');
      const spinner = document.getElementById('spinner');

      previewImg.style.opacity = '0.3';
      spinner.style.display = 'block';

      try {
        const resp = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            font,
            theme,
            fontSize: parseInt(size),
            transparent
          })
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
