// Slayt dizisini PNG'lere render eder. Playwright tarayicisini tekrar kullanir.
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateUrl = "file:///" + resolve(__dirname, "template.html").replace(/\\/g, "/");

let _browser = null;
async function getBrowser() {
  if (!_browser || !_browser.isConnected()) _browser = await chromium.launch();
  return _browser;
}

// Sunucu kapanirken tarayiciyi duzgun kapat (kaynak sizintisini onle)
export async function closeBrowser() {
  if (_browser) { try { await _browser.close(); } catch {} _browser = null; }
}

// slides -> [{name, file}] dondurur. outDir verilmezse ./out
// onProgress(i, total): her slayt cekildikten sonra cagrilir (opsiyonel).
export async function renderSlides(slides, outDir = resolve(__dirname, "out"), palette = "kraft", template = "editorial", lang = "tr", onProgress) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const results = [];
  try {
    // Sayfayi ve fontlari BIR KEZ yukle; her slaytta yeniden goto/networkidle yapma.
    // Bu, font reflow titremesini ve seri basina sureyi ciddi azaltir.
    await page.goto(templateUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate((p) => window.__setPalette(p), palette);
    await page.evaluate((t) => window.__setTemplate(t), template);
    await page.evaluate((l) => window.__setLang(l), lang);

    for (let i = 0; i < slides.length; i++) {
      await page.evaluate((d) => window.__render(d), slides[i]);
      // Render sonrasi yeni font glyph'leri yuklenebilir (or. Caveat/Mono);
      // olcum/kucultmeden once hazir olmasini bekle, yoksa metin sisip tasar.
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.__fit && window.__fit()); // icerik sigmazsa kucult
      const name = `slide_${String(i + 1).padStart(2, "0")}.png`;
      const file = resolve(outDir, name);
      await page.screenshot({ path: file });
      results.push({ name, file });
      if (onProgress) { try { onProgress(i + 1, slides.length); } catch {} }
    }
  } finally {
    await page.close();
  }
  return results;
}
