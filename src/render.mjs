// Renders the broadcast HTML with headless Chromium. Static panels are saved as
// PNGs; the hero is captured as a sequence of frames (sweep bar + blinking
// cursor driven manually for a clean loop) and encoded to an animated GIF.

import { chromium } from "playwright";
import sharp from "sharp";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const STATIC_PANELS = ["stats", "articles", "now", "nav-0", "nav-1", "nav-2", "nav-3"];

export async function renderAll({ html, outDir, gifFrames = 14, gifDelay = 110, gifWidth = 900 }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Freeze every animation so stills are deterministic. With animations off the
  // sweep bar rests at its default top:-14px (off-screen), so panels are clean.
  await page.addStyleTag({ content: "*{animation:none!important}" });

  for (const id of STATIC_PANELS) {
    const el = await page.$(`#cap-${id}`);
    await el.screenshot({ path: join(outDir, `${id}.png`) });
  }

  // Hero GIF: drive the sweep position and cursor visibility per frame.
  const hero = await page.$("#cap-hero");
  const frames = [];
  for (let i = 0; i < gifFrames; i++) {
    const frac = i / gifFrames;
    await page.evaluate(
      ({ frac, i }) => {
        const s = document.querySelector("#cap-hero .sweep");
        if (s) {
          s.style.display = "block";
          s.style.top = (frac * 100).toFixed(2) + "%";
        }
        const c = document.querySelector("#cap-hero .cursor");
        if (c) c.style.opacity = i % 7 < 4 ? "1" : "0";
      },
      { frac, i },
    );
    frames.push(await hero.screenshot({ type: "png" }));
  }
  await browser.close();

  const enc = GIFEncoder();
  let dims = null;
  for (const buf of frames) {
    const { data, info } = await sharp(buf)
      .resize({ width: gifWidth })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    dims = info;
    const palette = quantize(data, 256, { format: "rgba4444" });
    const index = applyPalette(data, palette, "rgba4444");
    enc.writeFrame(index, info.width, info.height, { palette, delay: gifDelay });
  }
  enc.finish();
  await writeFile(join(outDir, "hero.gif"), Buffer.from(enc.bytes()));

  return { gif: dims };
}
