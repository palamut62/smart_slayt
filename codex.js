// Yerel Codex CLI (codex exec) ile slayt uretimi.
// ChatGPT OAuth oturumunu (codex login) oldugu gibi kullanir; web aramasini (--search)
// ve icerik uretimini tek ajan cagrisinda Codex yapar. OpenRouter anahtari GEREKMEZ.
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import { resolve, join } from "path";
import { SYSTEM, LANGS, buildUserMsg, CHEATSHEET_SYSTEM, buildCheatsheetUserMsg } from "./content.js";

const execFileP = promisify(execFile);
const CODEX_BIN = process.env.CODEX_BIN || "codex";
const IS_WIN = process.platform === "win32"; // Windows'ta codex.cmd icin shell gerek
const TIMEOUT_MS = 240000; // 4 dk: web arastirma + uretim

// Codex CLI kurulu mu + oturum acik mi?
export async function codexStatus() {
  let version = "";
  try {
    // cwd = tmp: proje dizininde calisirsak Windows'ta shell+PATHEXT, bizim "codex.js"
    // dosyamizi gercek "codex" komutundan once bulup WSH ile acmaya calisir ("birlikte ac" .js diyalogu).
    const { stdout } = await execFileP(CODEX_BIN, ["--version"], { timeout: 8000, shell: IS_WIN, cwd: os.tmpdir() });
    version = (stdout || "").trim();
  } catch {
    return { ok: false, message: "Codex CLI bulunamadi. `npm i -g @openai/codex` ile kurun." };
  }
  // OAuth oturumu: ~/.codex/auth.json icinde tokens veya OPENAI_API_KEY olmali
  const authPath = join(os.homedir(), ".codex", "auth.json");
  let authed = false;
  try {
    const a = JSON.parse(fs.readFileSync(authPath, "utf8"));
    authed = !!(a && (a.OPENAI_API_KEY || (a.tokens && a.tokens.id_token)));
  } catch { authed = false; }
  if (!authed) return { ok: false, message: `${version} kurulu ama oturum yok. Terminalde \`codex login\` calistirin.` };
  return { ok: true, message: `Bagli · ${version} · ChatGPT oturumu aktif` };
}

// Codex ciktisindan ilk gecerli JSON nesnesini ayikla (kod citi/aciklama olsa bile).
function extractJSON(text) {
  if (!text) throw new Error("Codex bos cikti dondurdu.");
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("Codex ciktisinda JSON bulunamadi.");
  return JSON.parse(s.slice(start, end + 1));
}

export async function generateSlidesViaCodex({ topic, steps = 8, lang = "tr", deep = false, model, mode = "carousel", cheatsheetType = "101" }) {
  const langName = LANGS[lang] || lang;
  const total = steps + 1;

  // Codex kendi arastirmasini yapacak: brief yerine self-research direktifi ver.
  const today = new Date().toISOString().slice(0, 10);
  const researchDirective =
`Bu kartlari uretmeden ONCE \`web_search\` araci ile konuyu KAPSAMLI arastir ve GUNCEL, gercek, dogrulanmis bilgi topla.
BUGUN: ${today}. Konu hizla degisiyor olabilir; SON 6-12 AYDAKI degisikliklere oncelik ver (son surum/changelog/yeni ozellik).
Su ACILARIN HEPSINI ayri ayri arastir ve kartlara yedir:
- YENI: en yeni ozellikler, son surum/release notes (tarih + surum no ile).
- POPULER: en cok kullanilan/populer ozellikler ve neden tercih edildigi.
- IPUCU: pro ipuclari, best practice, az bilinen ama guclu ozellikler ("nasil daha iyi kullanilir").
- HATA: sik yapilan hatalar/tuzaklar ve nasil kacinilacagi.
- ILGINC: dikkat cekici/sasirtici gercek veya istatistik (kapak ve callout'lari guclendir).
Resmi kaynaklari esas al (ureticinin sitesi, resmi docs, GitHub deposu, npm/pypi). Blog/SEO/aggregator'a guvenme.
Kurulum komutunu ve gercek komutlari resmi dokumandan dogrula. Uydurma; emin olmadigin detayi atla.${deep ? "\nHER ana basligi ayri ayri, derinlemesine arastir (cok sayida arama yap)." : ""}`;

  const isCheat = mode === "cheatsheet";
  const userMsg = isCheat
    ? buildCheatsheetUserMsg({ topic, steps, total, langName, brief: researchDirective, cheatsheetType })
    : buildUserMsg({ topic, steps, total, langName, brief: researchDirective });
  const prompt =
`${isCheat ? CHEATSHEET_SYSTEM : SYSTEM}

${userMsg}

CIKTI: SADECE tek bir gecerli JSON nesnesi yaz: {"slides":[ ... ]}. Markdown, aciklama veya kod citi (\`\`\`) EKLEME.`;

  // Gecici calisma alani (ephemeral; proje dosyalarina dokunmasin)
  const tmp = fs.mkdtempSync(join(os.tmpdir(), "smartslayt-codex-"));
  const outFile = join(tmp, "out.json");

  // Yol argumanlarini GORELI tut (cwd=tmp) — Windows'ta shell+bosluklu yol sorununu onler.
  const args = [
    "exec",
    "-c", "tools.web_search=true", // canli web aramasi (exec'te --search yok)
    "--skip-git-repo-check",    // repo disinda calis
    "--ephemeral",              // oturum dosyasi birakma
    "-C", ".",                  // calisma koku = cwd (tmp)
    "-o", "out.json",           // final mesaji cwd'ye yaz
    "--color", "never",
  ];
  // Guvenlik: shell:true ile arg enjeksiyonu olmasin diye model adini guvenli karakterlerle sinirla.
  if (model && /^[\w.\-\/:]+$/.test(model.trim())) args.push("-m", model.trim());
  args.push("-");               // prompt'u stdin'den oku

  const stderrChunks = [];
  await new Promise((res, rej) => {
    const child = spawn(CODEX_BIN, args, { cwd: tmp, shell: IS_WIN });
    const timer = setTimeout(() => { child.kill("SIGKILL"); rej(new Error("Codex zaman asimi (4 dk).")); }, TIMEOUT_MS);
    child.stderr.on("data", (d) => stderrChunks.push(d));
    child.on("error", (e) => { clearTimeout(timer); rej(new Error("Codex baslatilamadi: " + e.message)); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return res();
      const err = Buffer.concat(stderrChunks).toString().slice(-600);
      rej(new Error(`Codex hata (exit ${code}): ${err || "bilinmiyor"}`));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });

  // Final mesaji oku (yoksa stderr ile birlikte hata ver)
  let raw = "";
  try { raw = fs.readFileSync(outFile, "utf8"); } catch { /* yok */ }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  const parsed = extractJSON(raw);
  const slides = parsed.slides || [];
  if (!slides.length) throw new Error("Codex slayt uretmedi (bos sonuc).");
  return slides;
}
