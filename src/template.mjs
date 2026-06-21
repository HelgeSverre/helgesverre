// Builds the broadcast HTML. Rendered by Playwright; each panel carries an id so
// it can be screenshotted individually. Font + avatar are embedded as data URIs
// so the page is fully self-contained.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildHtml({ fontDataUri, avatarDataUri, bio, stats, languages, articles, projects, contributions, weather, programme, sema, links }) {
  const heatCells = (contributions?.cells || [])
    .map((l) => (l == null ? '<i class="e"></i>' : `<i class="l${l}"></i>`))
    .join("");

  const progRows = (programme || [])
    .map((p) => `<div class="line"><span class="y">${esc(p.time)}</span>  <span class="w">${esc(p.title)}</span></div>`)
    .join("\n");

  const semaFile = sema?.file || "maze.sema";
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
/* sema in fedit — ascii-boxed code typer, official Sema brand palette, no CRT overlay */
.sema-win{background:#131110;padding:9px 13px;text-shadow:none;color:#e9e3d6;
  font-family:"DejaVu Sans Mono",ui-monospace,Menlo,Consolas,monospace;font-size:13.5px}
.semabox{position:relative;border:1px solid #6a6258;padding:16px 14px 8px}
.boxleg{position:absolute;top:-9px;left:16px;background:#131110;padding:0 9px;line-height:1}
.bxpar{color:#c8a855;font-weight:bold}
.bxname{color:#ffffff;font-weight:bold}
.fwrap{height:210px}
.fpane{height:100%;overflow:hidden}
#sema-out{height:100%;overflow:hidden}
.cl{display:flex;font-size:13.5px;line-height:1.5;white-space:pre}
.cl.cur{background:rgba(200,168,85,.08)}
.ln{color:#4a4438;width:3ch;text-align:right;padding-right:12px;margin-right:12px;border-right:1px solid #2b2620;flex:0 0 auto}
.ct{color:#e9e3d6;padding-right:12px}
.tcur{background:#c8a855;color:#131110}
.fstat{display:flex;align-items:center;font-size:12.5px;color:#968c79;padding:6px 1px 1px;margin-top:6px;border-top:1px solid #2b2620}
.fmode{color:#c8a855;font-weight:bold;margin-right:12px;letter-spacing:.05em}
.fpath{color:#968c79}
.fspacer{flex:1}
.fstat .fseg{padding:0 9px}
.fstat .fend{padding-left:9px;color:#c8a855}
/* sema syntax — Sema playground palette */
.s-comment{color:#6b6354;font-style:italic}.s-string{color:#a8c47a}.s-keyword{color:#7aacb8}
.s-number{color:#d19a66}.s-special{color:#c8a855}.s-builtin{color:#c8a855}
.s-paren{color:#6a6258}.s-bracket{color:#6a6258}.s-brace{color:#6a6258}.s-default{color:#e9e3d6}
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
    <div class="sema-win" id="cap-sema">
      <div class="semabox">
        <span class="boxleg"><span class="bxpar">(</span> <span class="bxname">sema</span> <span class="bxpar">)</span></span>
        <div class="fwrap"><div class="fpane"><div id="sema-out"></div></div></div>
        <div class="fstat">
          <span class="fmode">EDIT</span>
          <span class="fpath">~/code/sema/examples/${esc(semaFile)}</span>
          <span class="fspacer"></span>
          <span class="fseg" id="fpos">1:1</span>
          <span class="fseg">LF</span>
          <span class="fend">1/1</span>
        </div>
      </div>
    </div>
    </a>
  </td></tr>
  <tr><td colspan="2">
    <table class="navrow"><tr>${navCells}</tr></table>
  </td></tr>
</table>
</div></body></html>`;
}
