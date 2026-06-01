// CLI: node generate.js "Konu" [adim]   |   node generate.js --json dosya.json
//      node generate.js "Docker" 8 --mode cheatsheet --cheatsheet-type install-guide
import { generateSlides, CHEATSHEET_TYPES } from "./content.js";
import { renderSlides } from "./render.js";
import { loadConfig } from "./config.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const topic = positional[0] || "Claude'da 1 haftada nasil ustalasirsin?";
  const steps = positional[1] ? parseInt(positional[1], 10) : 8;

  // Opsiyonel bayrak okuyucu: --flag deger
  const flag = (name) => { const i = args.indexOf(name); return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null; };
  const mode = flag("--mode") === "cheatsheet" ? "cheatsheet" : "carousel";
  let cheatsheetType = flag("--cheatsheet-type") || "101";
  if (mode === "cheatsheet" && !CHEATSHEET_TYPES[cheatsheetType]) {
    console.error(`Gecersiz --cheatsheet-type "${cheatsheetType}". Gecerli: ${Object.keys(CHEATSHEET_TYPES).join(", ")}`);
    process.exit(1);
  }

  const jsonFlag = args.indexOf("--json");
  let slides;
  if (jsonFlag !== -1 && args[jsonFlag + 1]) {
    slides = JSON.parse(fs.readFileSync(args[jsonFlag + 1], "utf8"));
    console.log(`Yerel JSON kullaniliyor: ${slides.length} slayt`);
  } else {
    const cfg = loadConfig();
    const label = mode === "cheatsheet" ? `cheatsheet/${cheatsheetType}` : "carousel";
    console.log(`OpenRouter ile (web arastirmali · ${label}) icerik uretiliyor... (konu: ${topic})`);
    slides = await generateSlides({ topic, steps, apiKey: cfg.apiKey, model: cfg.model, mode, cheatsheetType });
    fs.writeFileSync(resolve(__dirname, "last-content.json"), JSON.stringify(slides, null, 2));
    console.log(`Icerik uretildi: ${slides.length} slayt -> last-content.json`);
  }

  const files = await renderSlides(slides, resolve(__dirname, "out"));
  files.forEach((f) => console.log(`  ✓ ${f.file}`));
  console.log(`\nBitti. ${files.length} kart ./out klasorunde.`);
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
