// Yerel ayar saklama: config.json (apiKey, model)
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "config.json");

// Tek kaynak: palet / template / dil listeleri (template.html + server.js senkron kalsin)
export const PALETTES = ["kraft", "forest", "midnight", "blush", "ocean", "sunset", "noir"];
export const TEMPLATES = ["editorial", "bold", "minimal", "scrapbook", "terminal", "infocard", "cheatsheet"];
export const LANG_CODES = ["tr", "en", "de", "fr", "es", "it", "ru", "ar"];

export function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { apiKey: "", model: "deepseek/deepseek-v4-pro", researchModel: "perplexity/sonar",
      defaults: { lang: "tr", steps: 8, template: "editorial", palette: "kraft", deep: true } };
  }
}

export function saveConfig(cfg) {
  const current = loadConfig();
  const merged = { ...current, ...cfg };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

// Arayuzde tam anahtari gostermeyelim
export function maskKey(key) {
  if (!key) return "";
  if (key.length <= 12) return "••••••••";
  return key.slice(0, 8) + "••••••••" + key.slice(-4);
}
