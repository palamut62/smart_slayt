// OpenRouter ile carousel icerigi uretir. Web arastirmasi (online) destekli.
// Cikti: zengin blok semasi. 1. eleman kapak, sonrakiler adim kartlari.

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

export const SYSTEM = `Sen Instagram/Twitter icin Turkce "carousel bilgi karti" serileri yazan uzman bir icerik tasarimcisisin.
Verilen KONU icin AKICI, VURUCU, SOMUT ve GUNCEL bir slayt serisi uretirsin.
Sana web arama araci verildi: konuyla ilgili EN GUNCEL gercek verileri (surum, fiyat, ozellik, tarih, istatistik) arastir ve kullan. Uydurma.

# Tipografi isaretleri (her metin alaninda kullanilabilir)
- *kelime*  -> kalin
- _kelime_  -> baslikta kirmizi italik / govdede kirmizi vurgu
- \`kod\`   -> kod/link rozeti (or. \`site.com\`, \`/komut\`, \`dosya.md\`)

# Ikonlar
- Genel kavramlar icin "icon" alanina uygun tek bir EMOJI yaz (📣 💼 📊 👤 🚫 💬 📁 ⚡ 🔧 🚀 vb.)
- Eger oge BILINEN BIR MARKA/ARAC/SIRKET ise ek olarak "logo" alanina onun Simple Icons slug'ini yaz
  (kucuk harf, bosluksuz): or. Slack->"slack", Notion->"notion", Stripe->"stripe", GitHub->"github",
  OpenAI->"openai", Google Drive->"googledrive", X->"x". Bilmiyorsan domain yaz: "ornek.com".
- logo alani gercek logoyu webden indirip emoji yerine kullanmamizi saglar; sadece gercekten emin oldugun markalarda ver.
- "icon" yine de doldur (logo bulunamazsa yedek olur).

# Cikti SADECE gecerli JSON (markdown yok, aciklama yok). Sema:
{
  "slides": [
    { "type":"cover", "title":"BUYUK *VURGULU* _BASLIK_?", "subtitle":"N ADIM · TEKNIK BILGI GEREKTIRMEZ · KODLAMA YOK" },
    { "type":"step", "step":"ADIM 01", "bignum":"01", "page":"2/TOPLAM",
      "title":"Adim _Basligi_",
      "intro":"(istege bagli) baslik altinda kisa giris paragrafi",
      "blocks":[ ...asagidaki blok tiplerinden 1-2 tane... ],
      "callout":"Vurucu kapanis. _kirmizi_ vurgu olabilir." }
  ]
}

# Blok tipleri (her adimda icerige UYGUN olani sec, hep ayni tipi kullanma):
1) {"type":"bullets","items":["madde 1","*onemli* madde","\`/komut\` ile"]}
2) {"type":"code","text":"claude code -> /mcp -> add"}   (tam genislik kod/komut akisi; oklar icin -> yaz)
3) {"type":"grid","cards":[                                  (2x2 karsilastirma kartlari, 2 veya 4 adet)
     {"label":"ETIKET","icon":"💬","title":"Baslik","desc":"kisa aciklama","highlight":false},
     {"label":"ASIL OLAN","icon":"⚡","title":"...","desc":"...","highlight":true} ]}
4) {"type":"iconrows","rows":[                               (ikon + baslik + monospace alt satir)
     {"icon":"📣","title":"Content Creators","sub":"/script + /carousel"} ]}
5) {"type":"filecards","cards":[                             (dosya/oge kartlari + etiket cipleri)
     {"icon":"👤","file":"CLAUDE.md","desc":"aciklama","tagsLabel":"Yasaklilar:","tags":["delve","elevate"]} ]}

# YOGUNLUK (COK ONEMLI — kartlar DOLU gorunmeli, bos alan birakma!)
- Her bullet maddesi TAM CUMLE(ler) olsun, 12-22 kelime; somut ornek/sayi/komut icersin. Tek kelimelik madde YASAK.
- bullets blogunda HER ZAMAN 3-4 madde uret (asla 1-2 birakma).
- grid kartlarinin desc'i 2 kisa cumle (10-18 kelime). iconrows/filecards aciklamalari da dolu olsun.
- Mumkunse "intro" alanini doldur (1-2 cumlelik giris). callout HER adimda olsun (15-25 kelime, vurucu).
- Kart icerigi yaklasik 60-90 kelime hedefle; az icerikli, seyrek kart URETME.

# ARAC / KOMUT KURALI (onemli)
- Kartta bir arac, uygulama, kutuphane veya CLI tanitiliyorsa: nasil KURULACAGINI ve EN ONEMLI KOMUTLARI mutlaka ver.
- Kurulum komutu ve calistirma komutlarini "code" blogu icinde goster (or. {"type":"code","text":"npm install x  ->  npx x init  ->  x run"}).
- Satir ici komut/dosya/link icin \`backtick\` rozetini kullan (or. \`pip install ...\`, \`/komut\`, \`config.json\`).
- Komutlar gercek ve guncel olsun (webden dogrula); uydurma komut yazma.

# Kurallar
- Kapak + N adim (kullanici N verir, vermezse 8). page = "X/TOPLAM" (kapak haric; adimlar 2'den baslar).
- bignum = adim no ("01"...). Baslik 2-4 kelime, satira sigsin.
- Her adimda 1 (gerekirse 2) blok; grid 4 kart tercih et; iconrows/filecards 2-3 oge.
- Govde somut, eyleme donuk, GUNCEL web verisiyle. Genel-gecer laf etme; rakam, arac adi, komut ver.`;

export const LANGS = {
  tr: "Türkçe", en: "English", de: "Deutsch", fr: "Français",
  es: "Español", ar: "العربية", ru: "Русский", it: "Italiano",
};

// Brifi karta donusturen kullanici talimati. Hem OpenRouter hem Codex ayni kurallari kullanir.
// brief: arastirma metni (OpenRouter) veya self-research direktifi (Codex).
export function buildUserMsg({ topic, steps, total, langName, brief }) {
  return `KONU: ${topic}
ADIM SAYISI: ${steps} (kapak haric) · TOPLAM SLAYT: ${total} · page = "X/${total}" (kapak haric)
DIL: TUM metinleri "${langName}" dilinde yaz (tipografi isaretleri * _ \` aynen kalsin).

ASAGIDAKI ARASTIRMA BRIFINI KULLAN — kartlar bu SOMUT bilgilere dayanmali:
"""
${brief || "(brief bulunamadi — yine de konuya OZGU, somut ve dogru bilgi ver; uydurma)"}
"""

ARAC/UYGULAMA/KUTUPHANE ISE — KARTLAR SOMUT VE YONLENDIRICI OLSUN (zorunlu kapsam):
- Bir kart "Kurulum & Indirme" olsun: NEREDEN indirilir (resmi site/link \`backtick\` ile) + kurulum komutu "code" blogunda (or. {"type":"code","text":"npm i -g x  ->  x --version"}).
- Bir kart "Onemli Komutlar / Ilk Kullanim": gercek komutlari code blogu veya bullet+\`backtick\` ile, ne ise yaradigi kisa aciklamayla.
- Platform/gereksinim (Windows/Mac/Linux, surum), varsa fiyat/plan, gercek entegrasyonlar ve resmi dokuman linki kartlara dagilsin.
- Kullanici karti okuyunca "nereden alirim, nasil kurarim, ilk komutum ne" sorularinin yanitini bulmali. Soyut laf degil, uygulanabilir adim ver.

KAPSAM (cok onemli — eksik birakma, konuyu DOYURUCU isle):
- Brifteki KAPSANACAK_BASLIKLAR listesini adimlara dagit; HER ana basligi bir kart yap. Konu disi sey ekleme.
- Bu kartlari okuyan kisi o konuda PRATIK ve YETERLI bilgiye sahip olmali; yuzeysel gecme.
- YAZILIM/ARAC ise MUTLAKA ayri kartlar: Kurulum & Indirme (gercek komut + resmi link), Yapilandirma/ilk calistirma,
  Temel komutlar; MCP/plugin/skill/agent/entegrasyon varsa BUNLAR ICIN DE ayri kart. Her teknik kartta gercek komut/kod olsun.
- SAGLIK/BITKI ise: faydalar, kullanim/hazirlanis, dozaj/miktar, YAN ETKILER & UYARILAR kartlari MUTLAKA olsun.
- Diger konularda da brifteki tum ana basliklari (adimlar, ornekler, ipuclari, dikkat edilecekler) kartlara yedir.
- Kurs/egitim sayfasi ANLATMA (modul, rozet, sertifika YASAK). Konunun GERCEK ozunu/kullanimini anlat.

ZORUNLU:
- Genel/klise basliklari KULLANMA: "X Nedir", "Gelecek Potansiyeli", "Sonuc", "Avantajlar", "Rozet", "Modul", bos girizgah YASAK.
- Her adim KONUYA OZGU, spesifik bir alt-konu olsun (gercek ozellik/komut/is akisi).
- Kurulum ve gercek komutlari "code" blogunda goster; satir ici komut/dosya icin \`backtick\`.
- Brifte olmayan komut/surum/fiyati UYDURMA. Emin degilsen o detayi atla.
- Link/site verirken YALNIZCA brifteki RESMI_KAYNAK alan adini kullan. Yanlis firma/alakasiz site (or. Claude Code icin OpenAI) ASLA verme.
- Kapak subtitle'inda "${steps}" sayisini kullan.`;
}

async function callOR({ apiKey, model, messages, web, json, max_results = 6 }) {
  const body = { model, messages, temperature: 0.6 };
  if (json) body.response_format = { type: "json_object" };
  if (web) body.plugins = [{ id: "web", max_results }];
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "smart_slayt" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter hata ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// 1. ADIM: konuyu webden arastir, somut bilgi brifi cikar
async function research({ topic, apiKey, model, researchModel }) {
  const sys = `Sen titiz bir teknik arastirmacisin. Konuyu WEB'den KAPSAMLI arastir ve SADECE dogrulanmis, SOMUT bilgi cikar.

EN ONEMLI KURAL — DOGRU URETICI/URUN:
- Once URUNUN URETICISINI (vendor) ve RESMI KAYNAGINI dogrula. Resmi site/dokuman/GitHub'i temel al.
- Benzer isimli BASKA urunlerle KARISTIRMA.
- Konuda "101", "rehber", "guide" gibi ifadeler ARACIN TUM YETENEKLERINI ogrenmek istendigini gosterir.
  Tek bir "X 101" egitim/kurs sayfasina ASLA indirgeme; o sayfayi degil, ARACIN KENDISINI kapsamli arastir
  (kurulum, ozellikler, komutlar). Kurs/onboarding modullerini/rozetlerini ANLATMA.

Once konunun ALANINI belirle, sonra o alana UYGUN kapsamli bilgi cikar:

• YAZILIM/ARAC/CLI/UYGULAMA/KUTUPHANE ise:
  - RESMI URL (site/dokuman/GitHub) · uretici · tam olarak ne oldugu
  - GERCEK kurulum komutu (resmi: "npm i -g x", "brew install x", "pipx install x", "curl ...")
  - Yapilandirma/baslangic: config dosyasi yeri, auth/login, ilk calistirma
  - COKIRDEK OZELLIKLER + GENISLETILEBILIRLIK (varsa MUTLAKA): MCP, plugin/eklenti, skill/agent,
    slash komutlar, ozel dosyalar (AGENTS.md/CLAUDE.md), entegrasyonlar (Slack/GitHub...)
  - 6-10 GERCEK komut (sozdizimi + ne ise yaradigi) · surum/fiyat/plan · platformlar

• SAGLIK/BITKI/GIDA/BESLENME ise:
  - Tam adi (latince varsa) · ne oldugu · icerdigi etken madde/besin
  - KANITA DAYALI faydalar (mumkunse calisma/kaynakla) · kullanim sekli, hazirlanis, tipik dozaj/miktar
  - YAN ETKILER / UYARILAR / kimler kullanmamali (ilac etkilesimi, gebelik vb.) · nereden temin edilir
  - Yanlis/abartili saglik iddiasi yapma; belirsizse "kanit sinirli" de.

• KAVRAM/NASIL-YAPILIR/BECERI ise: tanim · adim adim surec · gercek ornekler · arac/kaynak · sik hatalar · ipuclari
• URUN/HIZMET ise: ne oldugu · ozellikler · fiyat/plan · alternatifler/karsilastirma · kimin icin
• KISI/KURUM/OLAY ise: kim/ne · onemli gercekler/tarihler/sayilar · etki/onem · ilginc detaylar

TUM ALANLAR ICIN:
- KAPSANACAK_BASLIKLAR: bu konuda DOYURUCU bir rehberin islemesi gereken 6-9 alt-basligi (alana uygun) liste ver.
- Her baslik icin somut, gercek, sayisal/komutsal detay topla; genel-gecer laf toplama.

YALNIZCA WEB ARAMA SONUCLARINA DAYAN. Egitim verindeki eski bilgilere GUVENME.
"Bilmiyorum", "belgeler yok", "hayal edelim", "egitim kesim tarihi" gibi ifadeler KULLANMA — arama sonuclarindaki GUNCEL gercek bilgiyi yaz.

KAYNAK ONCELIGI (en dogru bilgi, en dogru yerden):
1) Ureticinin RESMI sitesi ve RESMI dokumanlari (docs.*, ana alan adi)
2) Resmi GitHub deposu / resmi surum notlari (releases, README)
3) Resmi paket kayitlari (npmjs.com, pypi.org, crates.io, Homebrew formula)
Blog/forum/SEO/aggregator/3. parti egitim sitelerine GUVENME; ancak resmi kaynagi dogrulamak icin kullan.
Celiskili bilgi varsa RESMI kaynagi esas al. Her onemli bilgiyi resmi kaynaktan dogrula; kurulum komutunu MUTLAKA resmi dokumandan al.

Cikti (Turkce, OZ ama KAPSAMLI — gereksiz laf yok, gercek komut/isim ver):
RESMI_KAYNAK: <url>
URETICI: <firma>
KURULUM: <gercek komut(lar)>
YAPILANDIRMA: <config/auth/ilk calistirma>
OZELLIKLER: <cokirdek + genisletilebilirlik: MCP/plugin/skill/entegrasyon — gercekten varsa>
KOMUTLAR: <6-10 gercek komut + ne ise yaradigi>
PLATFORM/FIYAT: <...>
KAPSANACAK_BASLIKLAR: <6-9 alt-baslik>
Sadece gercekten hicbir kaynakta olmayan detay icin "bilinmiyor" yaz.`;

  // Arastirma icin token-verimli web-tabanli model; biçimlendirmeyi ana model yapar
  const rModel = researchModel || process.env.OR_RESEARCH_MODEL || "perplexity/sonar";
  const userQ = `Konu: "${topic}". Once dogru ureticiyi ve resmi kaynagi tespit et, sonra OZ ve net bir brif ver (kisa tut).`;
  try {
    const brief = await callOR({
      apiKey, model: rModel, web: true, max_results: 6,
      messages: [{ role: "system", content: sys }, { role: "user", content: userQ }],
    });
    if (brief && brief.trim().length > 40) return brief.trim();
  } catch { /* yedege gec */ }
  // Yedek: kullanicinin modeli + web plugin
  const brief2 = await callOR({
    apiKey, model, web: true, max_results: 6,
    messages: [{ role: "system", content: sys }, { role: "user", content: userQ }],
  });
  return (brief2 || "").trim();
}

// Brifteki KAPSANACAK_BASLIKLAR satirindan alt-basliklari ayikla
function parseSections(brief) {
  const m = (brief || "").match(/KAPSANACAK_BASLIKLAR\s*:?\s*(.+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;\n••\-]+/).map((s) => s.replace(/^\d+[\).]?\s*/, "").trim())
    .filter((s) => s.length > 2 && s.length < 60).slice(0, 6);
}

// 2. ADIM (opsiyonel): her ana baslik icin paralel "alt-ajan" web arastirmasi (derin)
async function deepDive({ topic, sections, apiKey, researchModel }) {
  const rModel = researchModel || process.env.OR_RESEARCH_MODEL || "perplexity/sonar";
  const sys = `Sen bir konu uzmanisin. Verilen KONU ve ALT-BASLIK icin web'den 3-5 SOMUT, gercek bilgi maddesi cikar
(gercek komut/sayi/isim/dozaj/ornek). Kisa madde madde, Turkce. Uydurma; emin degilsen atla.`;
  const tasks = sections.map((sec) =>
    callOR({
      apiKey, model: rModel, web: true, max_results: 3,
      messages: [{ role: "system", content: sys }, { role: "user", content: `KONU: ${topic}\nALT-BASLIK: ${sec}` }],
    }).then((r) => `### ${sec}\n${(r || "").trim()}`).catch(() => "")
  );
  const parts = await Promise.all(tasks);
  return parts.filter(Boolean).join("\n\n");
}

export async function generateSlides({ topic, steps = 8, apiKey, model, researchModel, web = true, lang = "tr", deep = false }) {
  apiKey = apiKey || process.env.OPENROUTER_API_KEY;
  let MODEL = model || process.env.OR_MODEL || DEFAULT_MODEL;
  if (!apiKey) throw new Error("OpenRouter API anahtari ayarli degil. Ayarlar bolumunden ekleyin.");

  const langName = LANGS[lang] || lang;
  const total = steps + 1;

  // 1) Arastirma brifi (web)
  let brief = "";
  if (web) { try { brief = await research({ topic, apiKey, model: MODEL, researchModel }); } catch { brief = ""; } }

  // 2) Derin arastirma (opsiyonel): her ana baslik icin paralel alt-ajan
  if (web && deep && brief) {
    try {
      const sections = parseSections(brief);
      if (sections.length) {
        const detail = await deepDive({ topic, sections, apiKey, researchModel });
        if (detail) brief += `\n\n=== DERIN DETAYLAR ===\n${detail}`;
      }
    } catch { /* derin basarisizsa normal brifle devam */ }
  }

  // 2) Brifi karta donustur (genel iskelet ve uydurma YASAK)
  const userMsg = buildUserMsg({ topic, steps, total, langName, brief });

  const raw = await callOR({
    apiKey, model: MODEL, json: true,
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }],
  });
  const clean = (raw || "{}").replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(clean);
  return parsed.slides || [];
}
