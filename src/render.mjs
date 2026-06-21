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

export async function renderAll({ html, outDir, semaCode, gifFrames = 14, gifDelay = 110, gifWidth = 900 }) {
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

  // --- Sema/fedit GIF: hacker-typer typing the code with a moving block cursor ---
  let semaGif = null;
  const semaEl = await page.$("#cap-sema");
  if (semaEl && semaCode) {
    await page.evaluate((CODE) => {
      const out = document.getElementById("sema-out");
      const posEl = document.getElementById("fpos");
      const e = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const SPECIAL = /^(define|lambda|fn|let|let\*|letrec|if|cond|else|begin|defmacro|deftool|defagent|defn|try|catch|throw|quote|set!|do|when|unless|or|and|not|loop|recur|case|match)$/;
      const BUILTIN = /^(println|print|display|format|map|filter|foldl|foldr|reduce|sort-by|append|for-each|take|drop|length|car|cdr|cadr|cons|list|range|reverse|nth|str|min|max|mod|assoc|get|equal\?|null\?|nil\?|list\?)$/;
      function hl(s) {
        let r = "", i = 0;
        while (i < s.length) {
          const c = s[i];
          if (c === ";") { let en = s.indexOf("\n", i); if (en < 0) en = s.length; r += '<span class="s-comment">' + e(s.slice(i, en)) + "</span>"; i = en; continue; }
          if (c === '"') { let j = i + 1; while (j < s.length && s[j] !== '"') { if (s[j] === "\\") j++; j++; } j = Math.min(j + 1, s.length); r += '<span class="s-string">' + e(s.slice(i, j)) + "</span>"; i = j; continue; }
          if (c === "(" || c === ")") { r += '<span class="s-paren">' + c + "</span>"; i++; continue; }
          if (c === "[" || c === "]") { r += '<span class="s-bracket">' + c + "</span>"; i++; continue; }
          if (c === "{" || c === "}") { r += '<span class="s-brace">' + c + "</span>"; i++; continue; }
          if (/\s/.test(c)) { let k = i; while (k < s.length && /\s/.test(s[k])) k++; r += e(s.slice(i, k)); i = k; continue; }
          let m = i; while (m < s.length && !/[\s()\[\]{}";]/.test(s[m])) m++;
          const w = s.slice(i, m); let cls = "s-default";
          if (w[0] === ":") cls = "s-keyword";
          else if (/^-?\d+(\.\d+)?$/.test(w)) cls = "s-number";
          else if (/^(#t|#f|nil|true|false)$/.test(w)) cls = "s-number";
          else if (SPECIAL.test(w)) cls = "s-special";
          else if (w.indexOf("/") > 0) cls = "s-builtin";
          else if (BUILTIN.test(w)) cls = "s-builtin";
          r += '<span class="' + cls + '">' + e(w) + "</span>"; i = m;
        }
        return r;
      }
      window.SEMA_LEN = CODE.length;
      window.semaRender = (n, blink) => {
        const lines = CODE.slice(0, n).split("\n");
        let html = "";
        for (let li = 0; li < lines.length; li++) {
          const last = li === lines.length - 1;
          const cur = last ? `<span class="tcur" style="opacity:${blink ? 1 : 0}">&nbsp;</span>` : "";
          html += `<div class="cl${last ? " cur" : ""}"><span class="ln">${li + 1}</span><span class="ct">${hl(lines[li])}${cur}</span></div>`;
        }
        out.innerHTML = html;
        out.scrollTop = out.scrollHeight;
        if (posEl) posEl.textContent = lines.length + ":" + (lines[lines.length - 1].length + 1);
      };
      window.semaRender(0, true);
    }, semaCode);

    const total = await page.evaluate(() => window.SEMA_LEN);
    const reveal = 80, hold = 6;
    const semaFrames = [];
    for (let i = 0; i < reveal + hold; i++) {
      const n = i < reveal ? Math.round((total * (i + 1)) / reveal) : total;
      const blink = i % 4 < 2;
      await page.evaluate(({ n, blink }) => window.semaRender(n, blink), { n, blink });
      semaFrames.push(await semaEl.screenshot({ type: "png" }));
    }
    semaGif = await encodeGif(semaFrames, join(outDir, "sema.gif"), 880, 55);
  }

  await browser.close();
  return { gif, semaGif };
}
