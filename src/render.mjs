// Renders the broadcast HTML with headless Chromium. Static panels are saved as
// PNGs; the hero (sweep + cursor) and the sema/fedit window (scrolling code) are
// captured frame-by-frame and encoded to looping GIFs.

import { chromium } from "playwright";
import sharp from "sharp";
import gifenc from "gifenc";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const { GIFEncoder, quantize, applyPalette } = gifenc;

const STATIC_PANELS = ["stats", "articles", "now", "heat", "prog", "wx", "nav-0", "nav-1", "nav-2", "nav-3"];

async function encodeGif(frames, outPath, width, delay) {
  const enc = GIFEncoder();
  let dims = null;
  for (const buf of frames) {
    const { data, info } = await sharp(buf).resize({ width }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    dims = info;
    const palette = quantize(data, 256, { format: "rgba4444" });
    const index = applyPalette(data, palette, "rgba4444");
    enc.writeFrame(index, info.width, info.height, { palette, delay });
  }
  enc.finish();
  await writeFile(outPath, Buffer.from(enc.bytes()));
  return dims;
}

export async function renderAll({ html, outDir, gifFrames = 14, gifDelay = 110, gifWidth = 900 }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Freeze animations so stills/frames are deterministic (sweep rests off-screen).
  await page.addStyleTag({ content: "*{animation:none!important}" });

  for (const id of STATIC_PANELS) {
    const el = await page.$(`#cap-${id}`);
    if (el) await el.screenshot({ path: join(outDir, `${id}.png`) });
  }

  // --- Hero GIF: sweep bar + blinking cursor ---
  const hero = await page.$("#cap-hero");
  const heroFrames = [];
  for (let i = 0; i < gifFrames; i++) {
    const frac = i / gifFrames;
    await page.evaluate(
      ({ frac, i }) => {
        const s = document.querySelector("#cap-hero .sweep");
        if (s) { s.style.display = "block"; s.style.top = (frac * 100).toFixed(2) + "%"; }
        const c = document.querySelector("#cap-hero .cursor");
        if (c) c.style.opacity = i % 7 < 4 ? "1" : "0";
      },
      { frac, i },
    );
    heroFrames.push(await hero.screenshot({ type: "png" }));
  }
  const gif = await encodeGif(heroFrames, join(outDir, "hero.gif"), gifWidth, gifDelay);

  // --- Sema/fedit GIF: endless upward scroll (content is duplicated → seamless) ---
  let semaGif = null;
  const semaEl = await page.$("#cap-sema");
  if (semaEl) {
    const copyH = await page.evaluate(() => {
      const el = document.querySelector("#sema-scroll");
      return el ? el.scrollHeight / 2 : 0;
    });
    const SN = 30;
    const semaFrames = [];
    for (let i = 0; i < SN; i++) {
      const y = -(copyH * (i / SN));
      await page.evaluate((y) => {
        const el = document.querySelector("#sema-scroll");
        if (el) el.style.transform = `translateY(${y}px)`;
      }, y);
      semaFrames.push(await semaEl.screenshot({ type: "png" }));
    }
    semaGif = await encodeGif(semaFrames, join(outDir, "sema.gif"), 920, 90);
  }

  await browser.close();
  return { gif, semaGif };
}
