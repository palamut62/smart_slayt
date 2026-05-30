// X (Twitter) paylasimi — OAuth 1.0a User Context.
// Seriyi thread olarak atar: tweet basina max 4 gorsel.
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const require = createRequire(import.meta.url);
const { TwitterApi } = require("twitter-api-v2");
const __dirname = dirname(fileURLToPath(import.meta.url));

function makeClient(x) {
  if (!x || !x.appKey || !x.appSecret || !x.accessToken || !x.accessSecret)
    throw new Error("X API anahtarlari eksik. Ayarlar'dan 4 anahtari da girin.");
  return new TwitterApi({
    appKey: x.appKey, appSecret: x.appSecret,
    accessToken: x.accessToken, accessSecret: x.accessSecret,
  });
}

export async function testX(x) {
  const client = makeClient(x);
  const me = await client.v2.me();
  return me.data; // {id, name, username}
}

// cards: [{filename, url}], text: ilk tweet metni
export async function shareToX({ x, cards, text }) {
  const client = makeClient(x);
  const rw = client.readWrite;

  // gorselleri yukle -> media_id
  const mediaIds = [];
  for (const c of cards) {
    const fp = resolve(__dirname, c.url.replace(/^\//, ""));
    // v1 upload OAuth 1.0a ile guvenilir calisiyor (v2 upload bazi hesaplarda 503 veriyor)
    let id;
    try {
      id = await rw.v1.uploadMedia(fp);
    } catch (e1) {
      if (rw.v2.uploadMedia) id = await rw.v2.uploadMedia(fp, { media_category: "tweet_image" });
      else throw e1;
    }
    mediaIds.push(id);
  }

  // 4'erli grupla
  const groups = [];
  for (let i = 0; i < mediaIds.length; i += 4) groups.push(mediaIds.slice(i, i + 4));

  let lastId = null, firstId = null;
  for (let g = 0; g < groups.length; g++) {
    // sadece ilk tweet'te metin; devam yanitlari numarasiz/metinsiz (temiz thread)
    const payload = { media: { media_ids: groups[g] } };
    if (g === 0 && text) payload.text = text;
    if (lastId) payload.reply = { in_reply_to_tweet_id: lastId };
    const res = await rw.v2.tweet(payload);
    lastId = res.data.id;
    if (g === 0) firstId = lastId;
  }

  const me = await client.v2.me();
  return { url: `https://x.com/${me.data.username}/status/${firstId}`, tweets: groups.length };
}
