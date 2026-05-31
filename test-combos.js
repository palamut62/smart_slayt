// Tum template x palet kombinasyonlarini render edip dogrular.
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateUrl = "file:///" + resolve(__dirname, "template.html").replace(/\\/g, "/");

const slides = JSON.parse(fs.readFileSync(resolve(__dirname, "sample.json"), "utf8"));
const outDir = resolve(__dirname, "out", "test-combos");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto(templateUrl, { waitUntil: "networkidle" });
const templates = await page.evaluate(() => Object.keys({ editorial: "", bold: "tpl-bold", minimal: "tpl-minimal", scrapbook: "tpl-scrap", terminal: "tpl-term" }));
const palettes = await page.evaluate(() => window.__palettes);

console.log("Templates:", templates.join(", "));
console.log("Palettes :", palettes.join(", "));
console.log("Total combos:", templates.length * palettes.length, "x", slides.length, "slides\n");

const results = [];
for (const tpl of templates) {
  for (const pal of palettes) {
    const before = errors.length;
    let overflow = 0;
    for (let i = 0; i < slides.length; i++) {
      await page.goto(templateUrl, { waitUntil: "networkidle" });
      await page.evaluate((p) => window.__setPalette(p), pal);
      await page.evaluate((t) => window.__setTemplate(t), tpl);
      await page.evaluate((l) => window.__setLang(l), "tr");
      await page.evaluate((d) => window.__render(d), slides[i]);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.__fit && window.__fit());

      // tasma kontrolu: kart govdesinden tasan icerik var mi?
      const ov = await page.evaluate(() => {
        const card = document.querySelector(".card");
        const body = card && card.querySelector(".body");
        if (!body) return false;
        const inner = body.querySelector(".bodyinner");
        if (!inner) return false;
        const br = body.getBoundingClientRect(), ir = inner.getBoundingClientRect();
        return ir.height > br.height + 2;
      });
      if (ov) overflow++;
      // ilk slaytin gorselini ornek olarak kaydet
      if (i === 0) {
        await page.screenshot({ path: resolve(outDir, `${tpl}__${pal}.png`) });
      }
    }
    const newErrors = errors.slice(before);
    const status = newErrors.length ? "JS-ERR" : overflow ? `OVERFLOW(${overflow})` : "OK";
    results.push({ tpl, pal, status, errors: newErrors });
    console.log(`  ${tpl.padEnd(10)} x ${pal.padEnd(9)} -> ${status}`);
  }
}

await page.close();
await browser.close();

console.log("\n==== OZET ====");
const ok = results.filter((r) => r.status === "OK").length;
const overflowed = results.filter((r) => r.status.startsWith("OVERFLOW"));
const jsErr = results.filter((r) => r.status === "JS-ERR");
console.log(`Toplam: ${results.length} | OK: ${ok} | Overflow: ${overflowed.length} | JS hata: ${jsErr.length}`);
if (jsErr.length) {
  console.log("\nJS HATALARI:");
  for (const r of jsErr) console.log(` ${r.tpl} x ${r.pal}:`, r.errors.join("; "));
}
if (overflowed.length) {
  console.log("\nTASMA olanlar:", overflowed.map((r) => `${r.tpl}/${r.pal}`).join(", "));
}
console.log("\nOrnek gorseller:", outDir);
