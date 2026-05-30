import express from "express";
import { createRequire } from "module";
import { fileURLToPath } from "url";
const archiver = createRequire(import.meta.url)("archiver");
import { dirname, resolve } from "path";
import fs from "fs";
import { loadConfig, saveConfig, maskKey } from "./config.js";
import { generateSlides } from "./content.js";
import { generateSlidesViaCodex, codexStatus } from "./codex.js";
import { renderSlides } from "./render.js";
import { createSet, listSets, getSet, deleteSet } from "./db.js";
import { testX, shareToX } from "./x.js";
import { attachLogos } from "./logos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "out");

// Sunucu ASLA sessizce kapanmasin — yakalanmamis hatalari logla, sureci ayakta tut
const errLog = resolve(__dirname, "error.log");
function logErr(tag, e) {
  const line = `[${new Date().toISOString()}] ${tag}: ${(e && e.stack) || e}\n`;
  try { fs.appendFileSync(errLog, line); } catch {}
  console.error(line);
}
process.on("uncaughtException", (e) => logErr("uncaughtException", e));
process.on("unhandledRejection", (e) => logErr("unhandledRejection", e));

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use(express.static(resolve(__dirname, "public")));
app.use("/out", express.static(OUT));

// --- Ayarlar ---
app.get("/api/settings", (req, res) => {
  const cfg = loadConfig();
  const x = cfg.x || {};
  res.json({
    configured: !!cfg.apiKey, maskedKey: maskKey(cfg.apiKey),
    model: cfg.model || "deepseek/deepseek-v4-pro",
    researchModel: cfg.researchModel || "perplexity/sonar",
    provider: cfg.provider === "codex" ? "codex" : "openrouter",
    codexModel: cfg.codexModel || "",
    xConfigured: !!(x.appKey && x.appSecret && x.accessToken && x.accessSecret),
    xMasked: { appKey: maskKey(x.appKey), accessToken: maskKey(x.accessToken) },
    defaults: cfg.defaults || { lang: "tr", steps: 8, template: "editorial", palette: "kraft" },
  });
});
app.post("/api/settings", (req, res) => {
  const { apiKey, model, researchModel, provider, codexModel, x, defaults } = req.body || {};
  const patch = {};
  if (typeof apiKey === "string" && apiKey.trim()) patch.apiKey = apiKey.trim();
  if (typeof model === "string" && model.trim()) patch.model = model.trim();
  if (typeof researchModel === "string" && researchModel.trim()) patch.researchModel = researchModel.trim();
  if (provider === "openrouter" || provider === "codex") patch.provider = provider;
  if (typeof codexModel === "string") patch.codexModel = codexModel.trim();
  if (defaults && typeof defaults === "object") {
    const cur = loadConfig().defaults || {};
    const PAL = ["kraft","forest","midnight","blush","ocean","sunset","noir"];
    const TPL = ["editorial","bold","minimal","scrapbook","terminal"];
    const LNG = ["tr","en","de","fr","es","it","ru","ar"];
    patch.defaults = {
      lang: LNG.includes(defaults.lang) ? defaults.lang : (cur.lang || "tr"),
      steps: Math.max(1, Math.min(15, parseInt(defaults.steps, 10) || cur.steps || 8)),
      template: TPL.includes(defaults.template) ? defaults.template : (cur.template || "editorial"),
      palette: PAL.includes(defaults.palette) ? defaults.palette : (cur.palette || "kraft"),
    };
  }
  if (x && typeof x === "object") {
    const cur = (loadConfig().x) || {};
    patch.x = {
      appKey: (x.appKey || "").trim() || cur.appKey || "",
      appSecret: (x.appSecret || "").trim() || cur.appSecret || "",
      accessToken: (x.accessToken || "").trim() || cur.accessToken || "",
      accessSecret: (x.accessSecret || "").trim() || cur.accessSecret || "",
    };
  }
  const m = saveConfig(patch);
  const xx = m.x || {};
  res.json({ ok: true, configured: !!m.apiKey, maskedKey: maskKey(m.apiKey), model: m.model,
    xConfigured: !!(xx.appKey && xx.appSecret && xx.accessToken && xx.accessSecret) });
});

// X anahtar testi
app.post("/api/x/test", async (req, res) => {
  try {
    const me = await testX((loadConfig().x) || {});
    res.json({ ok: true, message: `Bagli: @${me.username} (${me.name})` });
  } catch (e) { res.json({ ok: false, message: e.message }); }
});

// Seriyi X'te paylas
app.post("/api/x/share", async (req, res) => {
  try {
    const { setId, text } = req.body || {};
    const s = getSet(parseInt(setId, 10));
    if (!s) return res.status(404).json({ error: "Seri bulunamadi." });
    const out = await shareToX({ x: (loadConfig().x) || {}, cards: s.cards, text: (text || s.topic || "").slice(0, 280) });
    res.json({ ok: true, ...out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/test-key", async (req, res) => {
  const cfg = loadConfig();
  const key = (req.body && req.body.apiKey && req.body.apiKey.trim()) || cfg.apiKey;
  if (!key) return res.json({ ok: false, message: "Anahtar yok." });
  try {
    const r = await fetch("https://openrouter.ai/api/v1/auth/key", { headers: { Authorization: `Bearer ${key}` } });
    if (r.ok) {
      const d = await r.json();
      const limit = d.data?.limit_remaining;
      res.json({ ok: true, message: limit != null ? `Gecerli · kalan kredi $${limit}` : "Anahtar gecerli." });
    } else res.json({ ok: false, message: `Gecersiz anahtar (HTTP ${r.status}).` });
  } catch (e) { res.json({ ok: false, message: "Baglanti hatasi: " + e.message }); }
});

// Codex CLI baglanti testi
app.post("/api/codex/test", async (req, res) => {
  try {
    const s = await codexStatus();
    res.json(s);
  } catch (e) { res.json({ ok: false, message: e.message }); }
});

// --- Uretim ---
app.post("/api/generate", async (req, res) => {
  try {
    const { topic, steps, lang, palette, template, deep } = req.body || {};
    const PAL = ["kraft","forest","midnight","blush","ocean","sunset","noir"];
    const pal = PAL.includes(palette) ? palette : "kraft";
    const TPL = ["editorial","bold","minimal","scrapbook","terminal"];
    const tpl = TPL.includes(template) ? template : "editorial";
    if (!topic || !topic.trim()) return res.status(400).json({ error: "Konu bos olamaz." });
    const cfg = loadConfig();
    const provider = cfg.provider === "codex" ? "codex" : "openrouter";
    const n = Math.max(1, Math.min(15, parseInt(steps, 10) || 8));

    const t = topic.trim();
    const viaOpenRouter = () => generateSlides({ topic: t, steps: n, apiKey: cfg.apiKey, model: cfg.model, researchModel: cfg.researchModel, lang: lang || "tr", deep: !!deep });

    let slides, usedProvider = provider, warning = "";
    if (provider === "codex") {
      const st = await codexStatus();
      if (st.ok) {
        try {
          slides = await generateSlidesViaCodex({ topic: t, steps: n, lang: lang || "tr", deep: !!deep, model: cfg.codexModel });
        } catch (e) {
          // Codex calisma aninda hata verdi → OpenRouter'a dus (varsa)
          if (cfg.apiKey) { slides = await viaOpenRouter(); usedProvider = "openrouter"; warning = `Codex hatasi: ${e.message} — OpenRouter ile uretildi.`; }
          else throw new Error(`Codex hatasi: ${e.message} (OpenRouter anahtari da yok).`);
        }
      } else if (cfg.apiKey) {
        // Codex baglanamadi → OpenRouter'a dus
        slides = await viaOpenRouter(); usedProvider = "openrouter"; warning = `${st.message} — OpenRouter'a gecildi.`;
      } else {
        return res.status(400).json({ error: `${st.message} OpenRouter anahtari da yok; Ayarlar'dan birini yapilandirin.` });
      }
    } else {
      if (!cfg.apiKey) return res.status(400).json({ error: "Once Ayarlar'dan API anahtari ekleyin." });
      slides = await viaOpenRouter();
    }
    const stamp = Date.now();
    const setDir = resolve(OUT, String(stamp));
    await attachLogos(slides, setDir);          // konuyla ilgili logolari webden indir
    const files = await renderSlides(slides, setDir, pal, tpl, lang || "tr");
    const cards = files.map((f) => ({ name: f.name, url: `/out/${stamp}/${f.name}` }));
    const modelLabel = usedProvider === "codex" ? `codex${cfg.codexModel ? " · " + cfg.codexModel : ""}` : cfg.model;
    const set = createSet({ topic: topic.trim(), model: modelLabel, steps: n, slides, cards });
    res.json({ ...set, provider: usedProvider, warning });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Kutuphane ---
app.get("/api/sets", (req, res) => res.json(listSets()));
app.get("/api/sets/:id", (req, res) => {
  const s = getSet(parseInt(req.params.id, 10));
  if (!s) return res.status(404).json({ error: "Bulunamadi." });
  res.json(s);
});
app.delete("/api/sets/:id", (req, res) => { deleteSet(parseInt(req.params.id, 10)); res.json({ ok: true }); });

// Tum kartlari ZIP olarak indir
app.get("/api/sets/:id/zip", (req, res) => {
  const s = getSet(parseInt(req.params.id, 10));
  if (!s) return res.status(404).send("Bulunamadi.");
  const safe = s.topic.replace(/[^a-z0-9]+/gi, "-").slice(0, 40).replace(/^-|-$/g, "") || "kartlar";
  res.attachment(`${safe}.zip`);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).send(err.message));
  archive.pipe(res);
  s.cards.forEach((c) => {
    const fp = resolve(__dirname, c.url.replace(/^\//, ""));
    if (fs.existsSync(fp)) archive.file(fp, { name: c.filename });
  });
  archive.finalize();
});

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => console.log(`\n  smart_slayt arayuzu hazir:  http://localhost:${PORT}\n`));
