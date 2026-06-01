// OpenRouter ile carousel icerigi uretir. Web arastirmasi (online) destekli.
// Cikti: zengin blok semasi. 1. eleman kapak, sonrakiler adim kartlari.

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";
const DEFAULT_RESEARCH_MODEL = "perplexity/sonar-pro"; // daha derin/taze kaynak

// Bugunun tarihi: model "guncel" derken egitim kesimini sanmasin, son degisikliklere odaklansin.
const TODAY = new Date().toISOString().slice(0, 10);
const RECENCY = `BUGUN: ${TODAY}. Konu HIZLA degisiyor olabilir; SON 6-12 AYDAKI degisikliklere oncelik ver: ` +
  `en yeni surum/changelog/release notes, yeni eklenen ozellikler, kaldirilan/degisen seyler. Eski/eskimis bilgiyi guncelle.`;

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

// ============ CHEATSHEET (referans dokuman) ============
// Kategori slug -> {label, focus}. focus, o kategorinin kart akisini yonlendirir.
export const CHEATSHEET_TYPES = {
  "usage-guide":   { label: "Kullanim Kilavuzu", focus: "Nedir? · Ne zaman kullanilir? · Temel arayuz/kavramlar · Ilk kullanim akisi · Ayarlar · Ipuclari · Sik hata · Mini ornek" },
  "comparison":    { label: "Karsilastirma", focus: "Secenekler · Artilar/eksiler · Kim hangisini secmeli? · Performans/maliyet/ogrenme egrisi · Ornek senaryo · Son karar matrisi" },
  "comparison-matrix": { label: "Karsilastirma Tablosu", focus: "Verilen araclari/konulari dogrudan karsilastir: her bolum bir ozellik ailesi, her blok tek bir tablo; tablo sutunlari karsilastirilan araclar, satirlar ozellik/kriterler" },
  "install-guide": { label: "Nasil Kurulur", focus: "Gereksinimler · Indirme/kurulum komutu · Ilk calistirma · Konfigurasyon · Dogrulama testi · Sik kurulum hatalari · Kaldirma/guncelleme" },
  "101":           { label: "101 / Baslangic Rehberi", focus: "Basit tanim · Temel kavramlar · Nerede kullanilir? · Ilk ornek · Ogrenme sirasi · Mini pratik · Sik hata · Sonraki adimlar" },
  "commands":      { label: "Komutlar", focus: "Her kart bir komut grubu: temel komutlar, ileri komutlar, bayraklar/parametreler, gercek ornek kullanim — sozdizimi + ne ise yaradigi" },
  "mistakes":      { label: "Sik Hatalar", focus: "Her madde HATA -> SEBEP -> COZUM yapisinda; gercek hata mesajlari ve somut duzeltmeler" },
  "best-practices":{ label: "Best Practices", focus: "Yapilmasi gerekenler (DO) ve kacinilmasi gerekenler (DON'T) ikili kartlarla; her biri somut gerekceyle" },
  "quick-reference":{ label: "Hizli Referans", focus: "Kisa tanim · komut · parametre · kullanim ornegi; yogun, tarama-dostu referans kartlari" },
  "tool-summary":  { label: "Arac / Kutuphane Ozeti", focus: "Ne ise yarar · kurulum · cekirdek API/komutlar · tipik kullanim · entegrasyonlar · alternatifler · resmi link" },
  "roadmap":       { label: "Yol Haritasi", focus: "Asama asama ogrenme/uygulama yolu: her kart bir asama (hedef, ne ogrenilir, pratik, cikti)" },
};

export const CHEATSHEET_SYSTEM = `Sen yazilim/teknik konularda YOGUN, REFERANS amacli "cheatsheet" (hizli basvuru karti) serileri tasarlayan bir uzmansin.
Cikti carousel'den FARKLI: pazarlama dili YOK, girizgah YOK. Her kart TARAMA-DOSTU, dolu ve OGRETICI bir referans panosudur.
Sana web arama araci verildi: komut/surum/parametre/link gibi her olguyu GERCEK kaynaktan dogrula; UYDURMA.

# GORSEL SABLON (ZORUNLU)
- Cikti tek sayfalik poster olarak render edilecek: ustte buyuk serif baslik, altinda nokta ile ayrilmis kategori satiri,
  govdede 3 sutun x 4 satir numarali panel, en altta koyu paylasim bandi.
- Ideal cheatsheet 12 bolumdur. Kullanici daha az/cok sayi vermediyse 12 bolum uret; bolumleri panel panel bagimsiz okunacak sekilde yaz.
- Her panel referans gorselindeki gibi: renkli daire numara + kisa baslik + kompakt icerik bloklari. Uzun paragraflar yerine taranabilir maddeler/kodlar kullan.
- Tek panelin diger panellerden asiri uzun olmasina izin verme; metni dengeli dagit. Tablolari kisa hucreli tut, genis/uzun tablo yapma.

# Tipografi isaretleri (her metin alaninda)
- *kelime* -> kalin · _kelime_ -> kirmizi vurgu · \`kod\` -> kod/komut rozeti (\`npm i\`, \`/komut\`, \`config.json\`)

# Ikonlar
- "icon" alanina uygun tek EMOJI. Bilinen marka/arac ise ek olarak "logo" alanina Simple Icons slug (github, docker, react...).

# Cikti SADECE gecerli JSON (markdown/aciklama YOK). Sema carousel ile AYNI; ek olarak 2 yeni blok tipi var:
{
  "slides": [
    { "type":"cover", "title":"KONU + _TUR_ CHEATSHEET", "subtitle":"KISA VAAT · N BOLUM" },
    { "type":"step", "step":"BOLUM 01", "bignum":"01", "page":"2/TOPLAM",
      "title":"Net Alt Baslik",
      "intro":"(kisa) 1 cumlelik aciklama",
      "blocks":[ ...1-2 blok... ],
      "callout":"Pratik uyari veya ozet (15-25 kelime)." }
  ]
}

# Blok tipleri (carousel'den 5 + cheatsheet'e ozel 2):
1) bullets: {"type":"bullets","items":["*madde*: aciklama · \`komut\`", ...]}  (3-5 madde, tam cumle)
2) code: {"type":"code","text":"npm i -g x  ->  x init  ->  x run"}  (oklar icin -> ; cok satirli liste de olur)
3) grid: {"type":"grid","cards":[{"label":"ETIKET","icon":"⚡","title":"Baslik","desc":"2 kisa cumle","highlight":false}, ...]} (2 veya 4)
4) iconrows: {"type":"iconrows","rows":[{"icon":"📁","title":"Baslik","sub":"\`monospace alt satir\`"}, ...]}
5) filecards: {"type":"filecards","cards":[{"icon":"👤","file":"dosya.md","desc":"...","tagsLabel":"Etiket:","tags":["a","b"]}, ...]}
6) comptable (KARSILASTIRMA icin ideal): {"type":"comptable","columns":["Secenek A","Secenek B","Secenek C"],"rows":[{"label":"Kurulum","cells":["~15 dk","sifir","~10 dk"]}, ...]}  (2-6 karsilastirma kolonu, 3-7 satir)
7) qref (HIZLI REFERANS/KOMUT icin ideal): {"type":"qref","items":[{"icon":"🔍","title":"ETIKET","code":"komut --flag","desc":"ne ise yarar"}, ...]}  (4-8 oge, kompakt kutucuklar)

# YOGUNLUK (cheatsheet DOLU olmali)
- Her panel ~45-85 kelime bilgi tasisin; bos alan birakma ama posterde tasacak kadar uzatma. Kisa ama BILGI YUKLU yaz.
- Yazilim/CLI ise GERCEK komutlari kullan (code/qref blogunda). Uydurma komut/surum/parametre YASAK.
- comptable hucrelerinde kisa, kiyaslanabilir deger yaz (sayfa basina 2-4 kelime).

# Kurallar
- Kapak + N bolum. page = "X/TOPLAM" (kapak haric; bolumler 2'den baslar). bignum = "01"...
- Baslik 2-4 kelime, net. Genel/klise baslik YASAK ("X Nedir", "Sonuc", "Avantajlar").
- callout her bolumde pratik bir uyari/ozet olsun.`;

// Brifi karta donusturen kullanici talimati. Hem OpenRouter hem Codex ayni kurallari kullanir.
// brief: arastirma metni (OpenRouter) veya self-research direktifi (Codex).
export function buildUserMsg({ topic, steps, total, langName, brief }) {
  return `KONU: ${topic}
BUGUN: ${TODAY} — Kartlar GUNCEL olmali. Mumkunse en yeni surum/ozellik/changelog bilgisini one cikar; eskimis detay verme.
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

GUNCELLIK & ILGI (brifteki "=== ACILAR ===" bolumunu KULLAN):
- Mumkunse bir kart "En Yeni / Son Degisiklikler" olsun (YENI acisindan: son surum, yeni ozellik, changelog — tarih/surum ile).
- En cok kullanilan/populer ozellikleri ve pro ipuclarini (POPULER/IPUCU) kartlara yedir; "nasil daha iyi kullanilir" somut olsun.
- Kapak ve callout'lari ILGINC acisindaki sasirtici gercek/istatistikle guclendir; genel-gecer laf etme.
- Sik hatalar (HATA) bir kartta veya callout'larda uyari olarak yer alsin.

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

// Cheatsheet brifini karta donusturen kullanici talimati (kategoriye gore).
export function buildCheatsheetUserMsg({ topic, steps, total, langName, brief, cheatsheetType }) {
  const cat = CHEATSHEET_TYPES[cheatsheetType] || CHEATSHEET_TYPES["101"];
  const matrixRules = cheatsheetType === "comparison-matrix" ? `

KARSILASTIRMA TABLOSU ZORUNLU KURALLARI:
- Konu birden fazla arac/urun/konu iceriyorsa (virgul, "vs", "/", "ile" vb.), karsilastirilacak elemanlari aynen cikar ve HER tabloda \`columns\` olarak kullan.
- Konu tek bir arac gibi verilirse, resmi/gercek 2-5 ana alternatifi arastirip ayni tabloda karsilastir.
- Her bolumde ana blok MUTLAKA \`comptable\` olsun; \`columns\` dizisi karsilastirilan eleman sayisi kadar olsun (ideal 3-5, en fazla 6).
- Her \`row.label\` bir ozellik/kriter olsun: Kurulum, lisans/fiyat, platform, performans, ogrenme egrisi, entegrasyon, ekip icin uygunluk, kisitlar gibi.
- Her \`row.cells\` uzunlugu \`columns\` ile AYNI olsun. Hucreler 1-4 kelimelik kisa, kiyaslanabilir degerler olmali; paragraf yazma.
- Bolumler farkli kriter ailelerini kapsasin: "Kurulum", "Uretkenlik", "Ekip", "Maliyet", "Guvenlik", "Ekosistem", "Kisitlar", "Son Karar" gibi.
- Callout her bolumde kimin hangi secenegi secmesi gerektigini kisa soylesin.` : "";
  return `KONU: ${topic}
CHEATSHEET TURU: ${cat.label}
BUGUN: ${TODAY} — Komut/surum/parametre GUNCEL olmali; eskimis bilgi verme.
BOLUM SAYISI: ${steps} (kapak haric) · TOPLAM SLAYT: ${total} · page = "X/${total}" (kapak haric)
DIL: TUM metinleri "${langName}" dilinde yaz (tipografi isaretleri * _ \` aynen kalsin).

BU TURUN KART AKISI (bolumleri bu basliklara/mantiga gore dagit):
${cat.focus}
${matrixRules}

ASAGIDAKI ARASTIRMA BRIFINI KULLAN — kartlar bu SOMUT bilgilere dayanmali:
"""
${brief || "(brief yok — yine de konuya OZGU, gercek ve dogru bilgi ver; uydurma)"}
"""

CHEATSHEET KURALLARI:
- Poster sablonu referans gorselindeki gibi 3 sutun x 4 satir numarali panel hedefler. Mumkunse 12 bolum kullan; verilen bolum sayisi "${steps}" ise tam olarak o kadar bolum uret.
- Bolum basliklari ust kategori satirinda gorunecek; 2-4 kelime, birbirinden ayirt edilebilir ve sirali akisa uygun olsun.
- Kapak: title = "${topic} · <KATEGORI>" — burada <KATEGORI> = "${cat.label}" ifadesinin "${langName}" diline CEVIRISI olsun (Turkce birakma). subtitle = kisa vaat + bolum sayisi; "BOLUM" kelimesini de "${langName}" diline cevir.
- TUM kapak, baslik, alt baslik ve footer dahil HER metin "${langName}" dilinde olmali; hicbir Turkce kelime/etiket birakma.
- Her bolum NET bir alt baslik + kisa intro + 1-2 blok + pratik callout.
- Blok tipini ICERIGE gore sec; KARSILASTIRMA turlerinde \`comptable\` kullan; HIZLI REFERANS/KOMUTLAR turunde \`qref\` veya \`code\` kullan.
- Yazilim/arac/CLI ise GERCEK kurulum + komutlari ver (resmi kaynaktan). Uydurma komut/surum/fiyat/link YASAK; emin degilsen atla.
- Pazarlama dili, girizgah, "rozet/modul/sertifika" YASAK. Yogun, tarama-dostu, uygulanabilir bilgi ver.
- Link/site verirken brifteki RESMI_KAYNAK alan adini kullan; alakasiz site verme.`;
}

async function callOR({ apiKey, model, messages, web, json, max_results = 6, timeoutMs = 120000 }) {
  const body = { model, messages, temperature: 0.6 };
  if (json) body.response_format = { type: "json_object" };
  if (web) body.plugins = [{ id: "web", max_results }];
  // Zaman asimi: yavas/takilan model cagrisi akisi sonsuza kadar bloklamasin.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "smart_slayt" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e && e.name === "AbortError") throw new Error(`OpenRouter zaman asimi (${Math.round(timeoutMs / 1000)} sn) — model: ${model}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
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

  // Arastirma icin web-tabanli model; biçimlendirmeyi ana model yapar
  const rModel = researchModel || process.env.OR_RESEARCH_MODEL || DEFAULT_RESEARCH_MODEL;
  const sysR = `${sys}\n\n${RECENCY}`;
  const userQ = `Konu: "${topic}". Once dogru ureticiyi ve resmi kaynagi tespit et, sonra OZ ve net bir brif ver (kisa tut). ${RECENCY}`;
  try {
    const brief = await callOR({
      apiKey, model: rModel, web: true, max_results: 10, timeoutMs: 90000,
      messages: [{ role: "system", content: sysR }, { role: "user", content: userQ }],
    });
    if (brief && brief.trim().length > 40) return brief.trim();
  } catch { /* yedege gec */ }
  // Yedek: kullanicinin modeli + web plugin
  const brief2 = await callOR({
    apiKey, model, web: true, max_results: 10, timeoutMs: 90000,
    messages: [{ role: "system", content: sysR }, { role: "user", content: userQ }],
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
      apiKey, model: rModel, web: true, max_results: 3, timeoutMs: 75000,
      messages: [{ role: "system", content: sys }, { role: "user", content: `KONU: ${topic}\nALT-BASLIK: ${sec}` }],
    }).then((r) => `### ${sec}\n${(r || "").trim()}`).catch(() => "")
  );
  const parts = await Promise.all(tasks);
  return parts.filter(Boolean).join("\n\n");
}

// Model ciktisini guvenli ayikla: ```json fence, bas/son cope karsi dayanikli.
function extractJson(raw) {
  let s = (raw || "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try { return JSON.parse(s); } catch {}
  // Govde icinde ilk { ... son } araligini dene (model aciklama eklediyse)
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}

const BLOCK_TYPES = new Set(["bullets", "code", "grid", "iconrows", "filecards", "comptable", "qref"]);

// Slayt dizisini DOGRULA: yapisal hatalari topla (render'i patlatacak seyler).
// Donus: { ok, errors[] }. Bos/eksik degil, TIP hatalarina odaklanir.
function validateSlides(slides) {
  const errors = [];
  if (!Array.isArray(slides) || slides.length === 0) return { ok: false, errors: ["slides bos veya dizi degil"] };
  slides.forEach((s, i) => {
    if (!s || typeof s !== "object") { errors.push(`slide[${i}] obje degil`); return; }
    if (!s.title || typeof s.title !== "string") errors.push(`slide[${i}].title eksik`);
    if (i === 0 && s.type !== "cover") errors.push(`slide[0] type 'cover' olmali`);
    for (const b of s.blocks || []) {
      if (!b || !BLOCK_TYPES.has(b.type)) { errors.push(`slide[${i}] gecersiz blok tipi: ${b && b.type}`); continue; }
      if (b.type === "bullets" && !Array.isArray(b.items)) errors.push(`slide[${i}] bullets.items dizi degil`);
      if ((b.type === "grid" || b.type === "filecards") && !Array.isArray(b.cards)) errors.push(`slide[${i}] ${b.type}.cards dizi degil`);
      if (b.type === "iconrows" && !Array.isArray(b.rows)) errors.push(`slide[${i}] iconrows.rows dizi degil`);
      if (b.type === "code" && typeof b.text !== "string") errors.push(`slide[${i}] code.text string degil`);
      if (b.type === "comptable" && (!Array.isArray(b.columns) || !Array.isArray(b.rows))) errors.push(`slide[${i}] comptable.columns/rows dizi degil`);
      if (b.type === "qref" && !Array.isArray(b.items)) errors.push(`slide[${i}] qref.items dizi degil`);
    }
  });
  return { ok: errors.length === 0, errors };
}

// Cok-acili arastirma: tek genel sorgu yerine niyet-odakli paralel sorgular.
// "En yeni + en cok kullanilan + nasil daha iyi kullanilir" uclusunu dogrudan hedefler.
async function researchAngles({ topic, apiKey, researchModel }) {
  const rModel = researchModel || process.env.OR_RESEARCH_MODEL || DEFAULT_RESEARCH_MODEL;
  const ANGLES = [
    { key: "YENI", q: `"${topic}" konusunda EN YENI ozellikler, son surum/changelog/release notes, son 6-12 ayda eklenen/degisen seyler (tarih + surum no ile).` },
    { key: "POPULER", q: `"${topic}" icin EN COK KULLANILAN / en populer ozellikler ve gercek kullanim — toplulukta (GitHub, forum, Reddit) one cikanlar neden tercih ediliyor.` },
    { key: "IPUCU", q: `"${topic}" icin pro ipuclari, best practice, az bilinen ama guclu ozellikler; "nasil daha iyi kullanilir" somut tavsiyeler.` },
    { key: "HATA", q: `"${topic}" kullanirken sik yapilan hatalar, tuzaklar ve bunlardan nasil kacinilir (somut ornek).` },
    { key: "ILGINC", q: `"${topic}" hakkinda dikkat cekici/sasirtici gercek, istatistik veya karsi-sezgisel bilgi (kaynakli, abartisiz).` },
  ];
  const sys = `Sen titiz bir web arastirmacisisin. ${RECENCY} ` +
    `Verilen sorgu icin SADECE web aramasindan, dogrulanmis, SOMUT 3-5 madde cikar (gercek isim/sayi/komut/tarih/surum). ` +
    `Resmi kaynagi esas al. Uydurma; emin degilsen atla. Kisa, madde madde, Turkce.`;
  const tasks = ANGLES.map((a) =>
    callOR({
      apiKey, model: rModel, web: true, max_results: 5, timeoutMs: 75000,
      messages: [{ role: "system", content: sys }, { role: "user", content: a.q }],
    }).then((r) => (r && r.trim() ? `### ${a.key}\n${r.trim()}` : "")).catch(() => "")
  );
  const parts = await Promise.all(tasks);
  return parts.filter(Boolean).join("\n\n");
}

// Dogrulama pass'i: uretilen kartlardaki olgusal iddialari (surum/fiyat/komut/tarih)
// brief ile kiyasla, celisen/desteksiz olanlari duzelt veya cikar. Sema korunur.
async function verifySlides({ slides, brief, topic, apiKey, model }) {
  const sys = `Sen bir olgu-denetcisisin. Sana bir ARASTIRMA BRIFI ve ondan uretilmis SLAYT JSON'u verilecek.
GOREV: Sadece OLGUSAL iddialari denetle — surum numaralari, tarihler, fiyat/plan, komutlar, ozellik adlari, istatistikler.
- Brifle CELISEN veya briffte HIC GECMEYEN ve dogrulanamayan olgulari DUZELT (brife gore) ya da o ifadeyi yumusat/cikar.
- Uydurma komut/surum/fiyati KALDIR. Genel ifadeleri, uslubu, tipografi isaretlerini (* _ \`) ve JSON SEMASINI AYNEN koru.
- Icerigi yeniden yazma, kart sayisini/yapisini degistirme. Sadece olgusal duzeltme yap.
Cikti SADECE gecerli JSON: { "slides": [...] } (ayni sema).`;
  const user = `KONU: ${topic}\n\nARASTIRMA BRIFI:\n"""\n${(brief || "").slice(0, 8000)}\n"""\n\nDENETLENECEK SLAYTLAR:\n${JSON.stringify({ slides }).slice(0, 12000)}`;
  const raw = await callOR({
    apiKey, model, json: true, timeoutMs: 90000,
    messages: [{ role: "system", content: sys }, { role: "user", content: user }],
  });
  const parsed = extractJson(raw);
  return parsed && Array.isArray(parsed.slides) ? parsed.slides : null;
}

export async function generateSlides({ topic, steps = 8, apiKey, model, researchModel, web = true, lang = "tr", deep = false, verify = true, mode = "carousel", cheatsheetType = "101", onProgress }) {
  apiKey = apiKey || process.env.OPENROUTER_API_KEY;
  let MODEL = model || process.env.OR_MODEL || DEFAULT_MODEL;
  if (!apiKey) throw new Error("OpenRouter API anahtari ayarli degil. Ayarlar bolumunden ekleyin.");
  const emit = (phase, info) => { if (onProgress) { try { onProgress(phase, info); } catch {} } };

  const langName = LANGS[lang] || lang;
  const total = steps + 1;

  // 1) Arastirma: ana brif (omurga) + cok-acili acilar PARALEL calisir (gecikme ~tek tur).
  let brief = "";
  if (web) {
    emit("research");
    const [spine, angles] = await Promise.all([
      research({ topic, apiKey, model: MODEL, researchModel }).catch(() => ""),
      researchAngles({ topic, apiKey, researchModel }).catch(() => ""),
    ]);
    brief = spine || "";
    if (angles) brief += `\n\n=== ACILAR (yeni / populer / ipucu / hata / ilginc) ===\n${angles}`;
  }

  // 2) Derin arastirma (opsiyonel): her ana baslik icin paralel alt-ajan
  if (web && deep && brief) {
    try {
      const sections = parseSections(brief);
      if (sections.length) {
        emit("deep", { sections: sections.length });
        const detail = await deepDive({ topic, sections, apiKey, researchModel });
        if (detail) brief += `\n\n=== DERIN DETAYLAR ===\n${detail}`;
      }
    } catch { /* derin basarisizsa normal brifle devam */ }
  }

  // 3) Brifi karta donustur (genel iskelet ve uydurma YASAK)
  emit("writing");
  const isCheat = mode === "cheatsheet";
  const sysPrompt = isCheat ? CHEATSHEET_SYSTEM : SYSTEM;
  const userMsg = isCheat
    ? buildCheatsheetUserMsg({ topic, steps, total, langName, brief, cheatsheetType })
    : buildUserMsg({ topic, steps, total, langName, brief });
  const baseMessages = [{ role: "system", content: sysPrompt }, { role: "user", content: userMsg }];

  const raw = await callOR({ apiKey, model: MODEL, json: true, timeoutMs: 150000, messages: baseMessages });
  let parsed = extractJson(raw);
  let slides = parsed && parsed.slides;
  let check = validateSlides(slides);

  // Gecersizse: modele HATALARI gosterip TEK seferlik duzeltme iste (uretimi patlatma).
  if (!check.ok) {
    emit("repair", { errors: check.errors.slice(0, 5) });
    const repairMsg = `Onceki JSON ciktisi gecersiz/eksikti. Sorunlar:\n- ${check.errors.join("\n- ")}\n\n` +
      `AYNI semaya birebir uyan, GECERLI JSON'u bastan ver (sadece JSON, aciklama yok). ` +
      `slides dizisi olmali; her slide.title string; blok tipleri yalniz: bullets/code/grid/iconrows/filecards/comptable/qref.`;
    const raw2 = await callOR({
      apiKey, model: MODEL, json: true, timeoutMs: 120000,
      messages: [...baseMessages, { role: "assistant", content: (raw || "").slice(0, 4000) }, { role: "user", content: repairMsg }],
    });
    const parsed2 = extractJson(raw2);
    const slides2 = parsed2 && parsed2.slides;
    const check2 = validateSlides(slides2);
    if (check2.ok) { slides = slides2; check = check2; }
    else if (Array.isArray(slides2) && slides2.length >= (Array.isArray(slides) ? slides.length : 0)) { slides = slides2; }
  }

  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error("Model gecerli slayt uretemedi. Tekrar deneyin veya farkli bir model secin.");
  }

  // 4) Dogrulama pass'i: olgusal iddialari (surum/fiyat/komut/tarih) brifle kiyasla.
  // Sadece brief varsa anlamli; gecersiz/bozuk donerse sessizce orijinali koru.
  if (verify && brief && brief.trim().length > 40) {
    try {
      emit("verify");
      const checked = await verifySlides({ slides, brief, topic, apiKey, model: MODEL });
      if (checked && validateSlides(checked).ok && checked.length >= slides.length - 1) slides = checked;
    } catch { /* dogrulama basarisizsa orijinal kartlarla devam */ }
  }

  return slides;
}
