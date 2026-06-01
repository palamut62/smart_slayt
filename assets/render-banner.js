import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = "file:///" + resolve(__dirname, "banner.html").replace(/\\/g, "/");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1789, height: 880 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800); // fontlar yerleşsin
const el = await page.$(".banner");
await el.screenshot({ path: resolve(__dirname, "banner.png") });
await browser.close();
console.log("banner.png yazildi");
