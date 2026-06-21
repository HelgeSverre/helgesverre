// Builds the broadcast HTML. Rendered by Playwright; each panel carries an id so
// it can be screenshotted individually. Font + avatar are embedded as data URIs
// so the page is fully self-contained.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SEMA_KW = new Set([
  "define", "defn", "defmacro", "fn", "lambda", "let", "let*", "letrec", "if", "cond", "when", "unless",
  "do", "begin", "set!", "quote", "for-each", "map", "filter", "reduce", "fold", "loop", "recur", "and",
  "or", "not", "case", "match", "module", "import", "export", "try", "catch", "throw", "def", "while", "else",
]);

function highlightSema(raw) {
  const re = /("(?:[^"\\]|\\.)*"?)|(;.*$)|(-?\d+(?:\.\d+)?)|([()\[\]])|([^\s()\[\]";]+)|(\s+)/g;
  let out = "", m;
  while ((m = re.exec(raw))) {
    if (m[1]) out += `<span class="s-str">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="s-com">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="s-num">${esc(m[3])}</span>`;
    else if (m[4]) out += `<span class="s-par">${esc(m[4])}</span>`;
    else if (m[5]) {
      const t = m[5];
      const cls = SEMA_KW.has(t) ? "s-kw" : /^(#t|#f|nil|true|false|#\w+)$/.test(t) ? "s-lit" : "s-def";
      out += `<span class="${cls}">${esc(t)}</span>`;
    } else out += esc(m[6]);
  }
  return out;
}

export function buildHtml({ fontDataUri, avatarDataUri, bio, stats, languages, articles, projects, contributions, weather, programme, sema, links }) {
  const heatCells = (contributions?.cells || [])
    .map((l) => (l == null ? '<i class="e"></i>' : `<i class="l${l}"></i>`))
    .join("");

  const progRows = (programme || [])
    .map((p) => `<div class="line"><span class="y">${esc(p.time)}</span>  <span class="w">${esc(p.title)}</span></div>`)
    .join("\n");

  const semaName = sema?.[0]?.file ? `examples/${sema[0].file}` : "examples/*.sema";
  const semaCode = (sema || [])
    .flatMap((f) => [
      { ln: "", html: `<span class="s-com">;; ── ${esc(f.file)} ──────────────</span>` },
      ...f.lines.map((l, i) => ({ ln: String(i + 1), html: highlightSema(l) || "&nbsp;" })),
    ])
    .map((r) => `<div class="cl"><span class="ln">${r.ln}</span><span class="ct">${r.html}</span></div>`)
    .join("");
  const semaScroll = semaCode + semaCode; // duplicate → seamless scroll loop
  const navCells = links.nav
    .map(
      (c) =>
        `<td><a class="tile" href="${esc(c.url)}"><div class="screen strip" id="cap-nav-${links.nav.indexOf(c)}"><div class="line"><span class="${c.color}">${esc(c.label)}</span></div></div></a></td>`,
    )
    .join("");

  const col = (items) =>
    items
      .map((p) => `<div class="line"><span class="g">▸ ${esc(p.name)}</span>  <span class="w">${esc(p.desc)}</span></div>`)
      .join("\n");

  const articleRows = articles
    .map(
      (a) =>
        `<div class="art"><div class="ahead"><span class="y">▸ </span><span class="atitle w">${esc(a.title)}</span><span class="adate">${esc(a.date)}</span></div></div>`,
    )
    .join("\n");

  const langRows = languages.map((l) => `<div class="line"><span class="g">${esc(l)}</span></div>`).join("\n");
  const infoRows = bio.info
    .map((l) => `<div class="line"><span class="y">▸ </span><span class="w">${esc(l)}</span></div>`)
    .join("\n");
  const taglineRows = bio.tagline.map((l) => `<div class="line"><span class="w">${esc(l)}</span></div>`).join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<style>
@font-face{font-family:"Bedstead";src:url(${fontDataUri}) format("opentype");font-display:block}
:root{--k:#000;--r:#ff3b30;--g:#33ff33;--y:#ffcc00;--b:#3b6bff;--m:#ff6bff;--c:#00ffff;--w:#fff}
*{box-sizing:border-box}
body{margin:0;background:#000}
.wrap{width:900px}
.screen{position:relative;overflow:hidden;background:#000;color:#fff;
  font-family:"Bedstead",ui-monospace,monospace;white-space:normal;padding:16px 18px;
  text-shadow:0 0 6px currentColor,0 0 1px currentColor;
  filter:brightness(1.08) contrast(1.12) saturate(1.06);animation:flicker 9s linear infinite}
.screen .line{line-height:1.5;white-space:pre}
.r{color:var(--r)}.g{color:var(--g)}.y{color:var(--y)}.b{color:var(--b)}
.m{color:var(--m)}.c{color:var(--c)}.w{color:var(--w)}.k{color:var(--k)}
.cursor{animation:blink 1.06s steps(1) infinite}
.screen::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;
  background:repeating-linear-gradient(to bottom,transparent 0 2px,rgba(0,0,0,.32) 2px 4px)}
.screen::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;
  background:radial-gradient(ellipse 90% 86% at 50% 46%,transparent 52%,rgba(0,0,0,.78) 100%)}
.sweep{position:absolute;left:0;right:0;top:-14px;height:14px;z-index:1;pointer-events:none;
  background:linear-gradient(to bottom,transparent,rgba(255,255,255,.05) 50%,transparent);
  animation:sweep 5.5s linear infinite}
@keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
@keyframes sweep{from{top:-14px}to{top:100%}}
@keyframes flicker{0%,93%,100%{opacity:1}94%{opacity:.965}95%{opacity:1}96%{opacity:.98}}
table{border-collapse:separate;border-spacing:10px;margin:0}
td{padding:0;vertical-align:top}
.grid{width:100%;table-layout:fixed}
.grid td.half{width:50%}
.navrow{width:100%;border-spacing:10px 0;table-layout:fixed}
a.tile{display:block;width:100%;text-decoration:none;color:inherit}
.hero{width:100%;font-size:18px;padding-bottom:0}
.herowrap{display:flex;gap:26px;align-items:center;justify-content:space-between;padding-bottom:16px}
.avatar{height:172px;width:auto;display:block;border:0;flex:0 0 auto}
.herotext{font-size:18px}
.name{color:var(--y);font-size:34px;line-height:1.05;margin-bottom:10px;text-shadow:0 0 9px var(--y),0 0 2px var(--y)}
.stripe-bar{height:24px;margin:0 -18px;background:linear-gradient(to right,
  var(--r) 0 12.5%,var(--y) 12.5% 25%,var(--g) 25% 37.5%,var(--c) 37.5% 50%,
  var(--b) 50% 62.5%,var(--m) 62.5% 75%,var(--w) 75% 87.5%,var(--r) 87.5% 100%)}
.panel{width:100%;font-size:17px;height:262px;display:flex;flex-direction:column}
.panel .bot{margin-top:auto}
.srow{display:flex;justify-content:space-between;align-items:baseline;line-height:1.4}
.srow .num{font-variant-numeric:tabular-nums;letter-spacing:.02em}
.srow .lbl{display:flex;gap:.5ch}
.langs{line-height:1.5}
.art{margin-bottom:2px}
.ahead{display:flex;align-items:flex-start;line-height:1.5}
.atitle{flex:1}
.adate{flex:0 0 auto;margin-left:1ch;color:var(--c);font-variant-numeric:tabular-nums;white-space:nowrap}
.afoot{color:var(--c)}
.strip{width:100%;font-size:19px;padding:11px 18px}
.navrow .strip{text-align:center;padding:12px 8px}
.nb{font-size:17px}
.nbhead{display:flex;justify-content:space-between;align-items:center}
.nbcols{display:flex;gap:30px;margin-top:10px}
.nbcol{flex:1}
.nbcol .line{line-height:1.9}
.heat-panel{font-size:17px}
.heat{display:grid;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;grid-auto-columns:1fr;gap:3px;margin-top:14px}
.heat i{display:block;width:100%;aspect-ratio:1;border-radius:2px}
.heatfoot{display:flex;align-items:center;gap:5px;margin-top:14px;font-size:14px}
.heatfoot i{display:block;width:13px;height:13px;border-radius:2px;flex:0 0 auto}
.l0{background:#0c2113}.l1{background:#0f5a2a}.l2{background:#1d9a3a}.l3{background:#2bd64a}.l4{background:#44ff55}
.e{background:transparent}
/* programme guide */
.prog-panel{font-size:17px;height:262px;display:flex;flex-direction:column}
.prog-panel .line{line-height:1.85}
/* weather */
.wx-panel{font-size:17px;height:262px;display:flex;flex-direction:column}
.wx-big{font-size:64px;line-height:1.05;color:var(--y);text-shadow:0 0 14px var(--y),0 0 3px var(--y);margin:8px 0}
.wx-cond{font-size:24px}
.wx-foot{margin-top:auto;line-height:1.7}
/* sema / fedit window */
.sema-win{background:#131110;padding:0;overflow:hidden}
.ftop{display:flex;align-items:center;gap:10px;padding:9px 15px;background:#1c1916;border-bottom:1px solid #2b2620;font-size:16px}
.ftop .fdot{color:#c8a855}
.ftop .ftag{margin-left:auto;color:#968c79}
.fbody{height:212px;overflow:hidden;position:relative}
.fscroll{will-change:transform}
.cl{display:flex;gap:14px;font-family:"DejaVu Sans Mono",ui-monospace,Menlo,Consolas,monospace;font-size:14.5px;line-height:1.55;white-space:pre;padding:0 15px;text-shadow:none}
.ln{color:#3a342c;min-width:2.4ch;text-align:right;flex:0 0 auto}
.ct{color:#e9e3d6}
.fstat{display:flex;gap:16px;padding:8px 15px;background:#c8a855;color:#131110;font-size:15px}
.fstat .fend{margin-left:auto}
.s-com{color:#6b6354}.s-kw{color:#c8a855}.s-str{color:#a8c47a}.s-num{color:#d19a66}.s-lit{color:#7aacb8}.s-par{color:#7d7464}.s-def{color:#e9e3d6}
</style></head><body><div class="wrap">
<table class="grid">
  <tr><td colspan="2">
    <a class="tile" href="${esc(links.hero)}">
    <div class="screen hero" id="cap-hero">
      <div class="herowrap">
        <div class="herotext">
          <div class="name">${esc(bio.name)}</div>
          ${taglineRows}
          <div class="line">&nbsp;</div>
          ${infoRows.replace(/<\/div>$/, '')}<span class="y cursor">█</span></div>
        </div>
        <img class="avatar" src="${avatarDataUri}" alt="Helge Sverre" />
      </div>
      <div class="stripe-bar"></div>
      <div class="sweep"></div>
    </div>
    </a>
  </td></tr>
  <tr>
    <td class="half">
      <a class="tile" href="${esc(links.stats)}">
      <div class="screen panel" id="cap-stats">
        <div class="line"><span class="c">P101 STATS</span></div>
        <div class="line">&nbsp;</div>
        <div class="srow"><span class="lbl"><span class="y">★</span><span class="w">STARS</span></span><span class="num y">${esc(stats.stars)}</span></div>
        <div class="srow"><span class="lbl"><span class="g">⎇</span><span class="w">REPOS</span></span><span class="num g">${esc(stats.repos)}</span></div>
        <div class="srow"><span class="lbl"><span class="c">☺</span><span class="w">FOLLOWERS</span></span><span class="num c">${esc(stats.followers)}</span></div>
        <div class="bot">
          <div class="line"><span class="c">LANGUAGES</span></div>
          ${langRows}
        </div>
        <div class="sweep"></div>
      </div>
      </a>
    </td>
    <td class="half">
      <a class="tile" href="${esc(links.articles)}">
      <div class="screen panel" id="cap-articles">
        <div class="line"><span class="c">P300 ARTICLES</span></div>
        <div class="line">&nbsp;</div>
        ${articleRows}
        <div class="bot"><div class="ahead"><span class="afoot atitle">full index</span><span class="afoot">300 →</span></div></div>
        <div class="sweep"></div>
      </div>
      </a>
    </td>
  </tr>
  <tr><td colspan="2">
    <a class="tile" href="${esc(links.projects)}">
    <div class="screen strip nb" id="cap-now">
      <div class="nbhead"><span class="c">P200 NOW BUILDING</span><span><span class="r cursor">●</span> <span class="w">LIVE</span></span></div>
      <div class="nbcols">
        <div class="nbcol">${col(projects.slice(0, 3))}</div>
        <div class="nbcol">${col(projects.slice(3, 6))}</div>
      </div>
      <div class="sweep"></div>
    </div>
    </a>
  </td></tr>
  <tr><td colspan="2">
    <a class="tile" href="${esc(links.heat)}">
    <div class="screen strip heat-panel" id="cap-heat">
      <div class="nbhead"><span class="c">P400 CONTRIBUTIONS</span><span class="w">${esc(contributions?.total || "0")} in the last year</span></div>
      <div class="heat">${heatCells}</div>
      <div class="heatfoot"><span class="w">less</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span class="w">more</span></div>
      <div class="sweep"></div>
    </div>
    </a>
  </td></tr>
  <tr>
    <td class="half">
      <a class="tile" href="${esc(links.projects)}">
      <div class="screen prog-panel" id="cap-prog">
        <div class="line"><span class="c">P500 PROGRAMME</span></div>
        <div class="line">&nbsp;</div>
        ${progRows}
      </div>
      </a>
    </td>
    <td class="half">
      <a class="tile" href="${esc(links.hero)}">
      <div class="screen wx-panel" id="cap-wx">
        <div class="line"><span class="c">P600 WEATHER · BERGEN</span></div>
        <div class="wx-big">${esc(weather?.temp || "–")} ${esc(weather?.icon || "")}</div>
        <div class="wx-cond"><span class="w">${esc(weather?.cond || "")}</span></div>
        <div class="wx-foot"><div class="line"><span class="y">WIND</span>  <span class="w">${esc(weather?.wind || "")}</span></div><div class="line"><span class="g">60.39°N · 5.32°E</span></div></div>
      </div>
      </a>
    </td>
  </tr>
  <tr><td colspan="2">
    <a class="tile" href="https://sema-lang.com">
    <div class="screen sema-win" id="cap-sema">
      <div class="ftop"><span class="fdot">●</span><span class="w">${esc(semaName)}</span><span class="ftag">fedit · sema</span></div>
      <div class="fbody"><div class="fscroll" id="sema-scroll">${semaScroll}</div></div>
      <div class="fstat"><span>NORMAL</span><span>sema · utf-8</span><span class="fend">sema-lang.com →</span></div>
      <div class="sweep"></div>
    </div>
    </a>
  </td></tr>
  <tr><td colspan="2">
    <table class="navrow"><tr>${navCells}</tr></table>
  </td></tr>
</table>
</div></body></html>`;
}
