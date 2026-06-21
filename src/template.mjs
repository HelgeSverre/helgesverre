// Builds the broadcast HTML. Rendered by Playwright; each panel carries an id so
// it can be screenshotted individually. Font + avatar are embedded as data URIs
// so the page is fully self-contained.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildHtml({ fontDataUri, avatarDataUri, bio, stats, languages, articles, projects, links }) {
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
    <table class="navrow"><tr>${navCells}</tr></table>
  </td></tr>
</table>
</div></body></html>`;
}
