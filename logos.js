// Konuyla ilgili gercek marka/arac logolarini webden indirir.
// LLM her ikon icin "logo" alanina bir slug/domain verir; biz indirip
// yerel dosyaya kaydeder ve obje uzerine iconImg (file:// URL) ekleriz.
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function tryFetch(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 smart_slayt" } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 100) return null;
    return buf;
  } catch { return null; }
}

// slug: "slack" (simpleicons) veya "slack.com" (domain favicon)
async function fetchLogo(slug, dir) {
  const clean = String(slug).trim().toLowerCase();
  if (!clean) return null;
  const isDomain = clean.includes(".");

  if (!isDomain) {
    // Simple Icons CDN (SVG, marka renginde)
    const buf = await tryFetch(`https://cdn.simpleicons.org/${encodeURIComponent(clean)}`);
    if (buf) {
      const fp = resolve(dir, `${clean.replace(/[^a-z0-9]/g, "")}.svg`);
      fs.writeFileSync(fp, buf);
      return fp;
    }
  }
  // domain -> Google favicon (PNG, 128px)
  const domain = isDomain ? clean : `${clean}.com`;
  const png = await tryFetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
  if (png) {
    const fp = resolve(dir, `${domain.replace(/[^a-z0-9]/g, "")}.png`);
    fs.writeFileSync(fp, png);
    return fp;
  }
  return null;
}

// slides icindeki tum logo alanlarini cozer (cache'li)
export async function attachLogos(slides, outDir) {
  const dir = resolve(outDir, "logos");
  fs.mkdirSync(dir, { recursive: true });
  const cache = new Map();

  async function resolveItem(it) {
    if (!it || !it.logo) return;
    if (!cache.has(it.logo)) cache.set(it.logo, await fetchLogo(it.logo, dir));
    const fp = cache.get(it.logo);
    if (fp) it.iconImg = pathToFileURL(fp).href;
  }

  for (const s of slides) {
    await resolveItem(s); // kart basligi logosu (varsa)
    for (const b of s.blocks || []) {
      for (const c of b.cards || []) await resolveItem(c);
      for (const r of b.rows || []) await resolveItem(r);
    }
  }
  return slides;
}
