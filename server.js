import express from "express";
import { fileURLToPath } from "url";
import { ZipArchive } from "archiver"; // archiver v8: named export, eski archiver("zip") yok
import { dirname, resolve } from "path";
import fs from "fs";
import { loadConfig, saveConfig, maskKey, PALETTES, TEMPLATES, LANG_CODES } from "./config.js";
import { generateSlides, CHEATSHEET_TYPES } from "./content.js";
import { generateSlidesViaCodex, codexStatus } from "./codex.js";
import { renderSlides, closeBrowser } from "./render.js";
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
    defaults: cfg.defaults || { lang: "tr", steps: 8, template: "editorial", palette: "kraft", deep: true },
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
    patch.defaults = {
      lang: LANG_CODES.includes(defaults.lang) ? defaults.lang : (cur.lang || "tr"),
      steps: Math.max(1, Math.min(15, parseInt(defaults.steps, 10) || cur.steps || 8)),
      template: TEMPLATES.includes(defaults.template) ? defaults.template : (cur.template || "editorial"),
      palette: PALETTES.includes(defaults.palette) ? defaults.palette : (cur.palette || "kraft"),
      deep: typeof defaults.deep === "boolean" ? defaults.deep : (cur.deep !== false),
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

// --- Uretim (NDJSON akisi: ilerleme satirlari + son 'done'/'error' satiri) ---
app.post("/api/generate", async (req, res) => {
  const { topic, steps, lang, palette, template, deep, mode, cheatsheetType, orientation } = req.body || {};
  const orient = orientation === "landscape" ? "landscape" : "portrait";
  const pal = PALETTES.includes(palette) ? palette : "kraft";
  const tpl = TEMPLATES.includes(template) ? template : "editorial";
  const lng = LANG_CODES.includes(lang) ? lang : "tr";
  const md = mode === "cheatsheet" ? "cheatsheet" : "carousel";
  const cst = (md === "cheatsheet" && CHEATSHEET_TYPES[cheatsheetType]) ? cheatsheetType : (md === "cheatsheet" ? "101" : null);

  // Akis basligi: her satir tek bir JSON olay. Hata bile olsa 200 ile akar.
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  const send = (obj) => { try { res.write(JSON.stringify(obj) + "\n"); } catch {} };

  // Keepalive: uzun uretimlerde (ozellikle Codex, 1-4 dk) akista bayt akmazsa tarayici/proxy
  // baglantiyi bos sayip kapatabilir -> istemci 'done' alamaz ("bos yanit"). Periyodik bos satir
  // gonderip akisi canli tutar (istemci bos satirlari yok sayar).
  const heartbeat = setInterval(() => { try { res.write("\n"); } catch {} }, 8000);
  const stopHeartbeat = () => clearInterval(heartbeat);
  res.on("close", stopHeartbeat);
  res.on("finish", stopHeartbeat);

  try {
    if (!topic || !topic.trim()) { send({ type: "error", error: "Konu bos olamaz." }); return res.end(); }
    const cfg = loadConfig();
    const provider = cfg.provider === "codex" ? "codex" : "openrouter";
    const n = Math.max(1, Math.min(15, parseInt(steps, 10) || 8));
    const t = topic.trim();

    // content.js fazlarini istemciye ilet
    const onPhase = (phase, info) => send({ type: "progress", stage: phase, ...(info || {}) });
    const viaOpenRouter = () => generateSlides({ topic: t, steps: n, apiKey: cfg.apiKey, model: cfg.model, researchModel: cfg.researchModel, lang: lng, deep: !!deep, mode: md, cheatsheetType: cst, onProgress: onPhase });

    send({ type: "progress", stage: "start" });
    let slides, usedProvider = provider, warning = "";
    if (provider === "codex") {
      const st = await codexStatus();
      if (st.ok) {
        try {
          send({ type: "progress", stage: "writing" });
          slides = await generateSlidesViaCodex({ topic: t, steps: n, lang: lng, deep: !!deep, model: cfg.codexModel, mode: md, cheatsheetType: cst });
        } catch (e) {
          if (cfg.apiKey) { slides = await viaOpenRouter(); usedProvider = "openrouter"; warning = `Codex hatasi: ${e.message} — OpenRouter ile uretildi.`; }
          else throw new Error(`Codex hatasi: ${e.message} (OpenRouter anahtari da yok).`);
        }
      } else if (cfg.apiKey) {
        slides = await viaOpenRouter(); usedProvider = "openrouter"; warning = `${st.message} — OpenRouter'a gecildi.`;
      } else {
        send({ type: "error", error: `${st.message} OpenRouter anahtari da yok; Ayarlar'dan birini yapilandirin.` });
        return res.end();
      }
    } else {
      if (!cfg.apiKey) { send({ type: "error", error: "Once Ayarlar'dan API anahtari ekleyin." }); return res.end(); }
      slides = await viaOpenRouter();
    }

    const stamp = Date.now();
    const setDir = resolve(OUT, String(stamp));
    send({ type: "progress", stage: "logos" });
    await attachLogos(slides, setDir);          // konuyla ilgili logolari webden indir
    const files = await renderSlides(slides, setDir, pal, tpl, lng,
      (done, tot) => send({ type: "progress", stage: "render", done, total: tot }), md === "cheatsheet", orient);
    const cards = files.map((f) => ({ name: f.name, url: `/out/${stamp}/${f.name}` }));
    const modelLabel = usedProvider === "codex" ? `codex${cfg.codexModel ? " · " + cfg.codexModel : ""}` : cfg.model;
    const set = createSet({ topic: t, model: modelLabel, steps: n, slides, cards, type: md, cheatsheetType: cst });
    send({ type: "done", ...set, provider: usedProvider, warning });
    res.end();
  } catch (e) {
    logErr("generate", e);
    send({ type: "error", error: e.message });
    res.end();
  }
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
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).send(err.message));
  archive.pipe(res);
  s.cards.forEach((c) => {
    const fp = resolve(__dirname, c.url.replace(/^\//, ""));
    if (fs.existsSync(fp)) archive.file(fp, { name: c.filename || c.name });
  });
  archive.finalize();
});

const PORT = process.env.PORT || 5179;
const server = app.listen(PORT, () => console.log(`\n  smart_slayt arayuzu hazir:  http://localhost:${PORT}\n`));

// Duzgun kapanis: Playwright tarayicisini birak, sonra cik
let _shuttingDown = false;
async function shutdown(sig) {
  if (_shuttingDown) return; _shuttingDown = true;
  try { await closeBrowser(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
