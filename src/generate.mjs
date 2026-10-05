// Orchestrator: gather live data, build the HTML, render the images into images/.
// Run locally with a token:  GITHUB_TOKEN=$(gh auth token) npm run generate
// In CI the Action provides GITHUB_TOKEN automatically.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildHtml } from "./template.mjs";
import { renderAll } from "./render.mjs";
import {
  getArticles, getStats, getContributions, getWeather, getSemaCode,
  LANGUAGES, BIO, LINKS,
} from "./data.mjs";

import { loadActivity, buildActivityPanels } from "./activity.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const dataUri = async (path, mime) => `data:${mime};base64,${(await readFile(path)).toString("base64")}`;

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) console.warn("⚠️  No GITHUB_TOKEN — stars will read 0 (REST-only fallback).");

  const config = JSON.parse(await readFile(join(root, "data/activity.json"), "utf8"));
  const snapshot = await loadActivity({ token, config, cachePath: join(root, "images/activity.json") });
  const activity = buildActivityPanels(snapshot, config);

  console.log("→ fetching live data…");
  const [articles, stats, contributions, weather, sema] = await Promise.all([
    getArticles(3),
    getStats(token),
    getContributions(token),
    getWeather(),
    getSemaCode(token),
  ]);
  const { projects, programme } = activity;
  console.log(`  stars ${stats.stars} · repos ${stats.repos} · followers ${stats.followers}`);
  console.log(`  latest: "${articles[0]?.title}"  · weather ${weather.temp} ${weather.cond}  · sema ${sema.file} (${sema.code.split("\n").length} lines)`);

  const [fontDataUri, avatarDataUri] = await Promise.all([
    dataUri(join(root, "assets/bedstead.otf"), "font/otf"),
    dataUri(join(root, "assets/avatar.png"), "image/png"),
  ]);

  const html = buildHtml({
    fontDataUri,
    avatarDataUri,
    bio: BIO,
    stats,
    languages: LANGUAGES,
    articles,
    projects,
    contributions,
    weather,
    programme,
    activity,
    sema,
    links: LINKS,
  });

  console.log("→ rendering panels + GIFs…");
  const { gif, semaGif } = await renderAll({ html, outDir: join(root, "images"), semaCode: sema.code });
  console.log(`✓ done — hero.gif ${gif.width}×${gif.height}${semaGif ? `, sema.gif ${semaGif.width}×${semaGif.height}` : ""}, panels in images/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
