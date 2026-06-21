// Orchestrator: gather live data, build the HTML, render the images into images/.
// Run locally with a token:  GITHUB_TOKEN=$(gh auth token) npm run generate
// In CI the Action provides GITHUB_TOKEN automatically.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildHtml } from "./template.mjs";
import { renderAll } from "./render.mjs";
import { getArticles, getStats, getContributions, rotateFeatured, LANGUAGES, BIO, LINKS } from "./data.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const dataUri = async (path, mime) => `data:${mime};base64,${(await readFile(path)).toString("base64")}`;

const dayOfYear = () => {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start) / 86400000);
};

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) console.warn("⚠️  No GITHUB_TOKEN — stars will read 0 (REST-only fallback).");

  console.log("→ fetching live data…");
  const [articles, stats, contributions] = await Promise.all([getArticles(3), getStats(token), getContributions(token)]);
  const pool = JSON.parse(await readFile(join(root, "data/featured.json"), "utf8")).projects;
  const projects = rotateFeatured(pool, 6, dayOfYear());
  console.log(`  stars ${stats.stars} · repos ${stats.repos} · followers ${stats.followers}`);
  console.log(`  latest: "${articles[0]?.title}"`);

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
    links: LINKS,
  });

  console.log("→ rendering panels + hero GIF…");
  const { gif } = await renderAll({ html, outDir: join(root, "images") });
  console.log(`✓ done — hero.gif ${gif.width}×${gif.height}, panels in images/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
