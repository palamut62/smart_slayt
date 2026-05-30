// Slayt dizisini PNG'lere render eder. Playwright tarayicisini tekrar kullanir.
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateUrl = "file:///" + resolve(__dirname, "template.html").replace(/\\/g, "/");

let _browser = null;
async function getBrowser() {
  if (!_browser) _browser = await chromium.launch();
  return _browser;
}

// slides -> [{path, file}] dondurur. outDir verilmezse ./out
export async function renderSlides(slides, outDir = resolve(__dirname, "out"), palette = "kraft", template = "editorial", lang = "tr") {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const results = [];
  for (let i = 0; i < slides.length; i++) {
    await page.goto(templateUrl, { waitUntil: "networkidle" });
    await page.evaluate((p) => window.__setPalette(p), palette);
    await page.evaluate((t) => window.__setTemplate(t), template);
    await page.evaluate((l) => window.__setLang(l), lang);
    await page.evaluate((d) => window.__render(d), slides[i]);
    // Olcum/kucultme ISLEMINDEN ONCE fontlarin yuklenmesini bekle.
    // Aksi halde fallback font ile olculur, gercek font yuklenince metin
    // buyuyup tasar (callout ile cakisma) ve dil degisiminde boyut oynar.
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.__fit && window.__fit()); // icerik sigmazsa kucult
    const name = `slide_${String(i + 1).padStart(2, "0")}.png`;
    const file = resolve(outDir, name);
    await page.screenshot({ path: file });
    results.push({ name, file });
  }
  await page.close();
  return results;
}
