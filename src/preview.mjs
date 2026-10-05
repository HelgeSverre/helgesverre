// Live-data preview of only the changed panels; no unrelated feeds or GIF work.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { loadActivity, buildActivityPanels } from './activity.mjs';
import { buildHtml } from './template.mjs';
import { BIO, LINKS, LANGUAGES } from './data.mjs';
const config = JSON.parse(await readFile(new URL('../data/activity.json', import.meta.url)));
const snapshotArg = process.argv.indexOf('--snapshot');
const snapshot = snapshotArg >= 0 ? JSON.parse(await readFile(process.argv[snapshotArg + 1], 'utf8')) : await loadActivity({ token: process.env.GITHUB_TOKEN, config, cachePath: new URL('../images/activity.json', import.meta.url) });
const activity = buildActivityPanels(snapshot, config, new Date(snapshot.fetchedAt));
const uri = async (path, mime) => `data:${mime};base64,${(await readFile(new URL(path, import.meta.url))).toString('base64')}`;
const html = buildHtml({ fontDataUri: await uri('../assets/bedstead.otf', 'font/otf'), avatarDataUri: await uri('../assets/avatar.png', 'image/png'), bio: BIO, links: LINKS, languages: LANGUAGES, stats: {}, articles: [], contributions: {}, ...activity, activity });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*{animation:none!important}' });
  for (const panel of ['now', 'prog']) {
    const element = page.locator(`#cap-${panel}`);
    if (await element.evaluate(el => el.scrollHeight > el.clientHeight)) throw new Error(`${panel} overflows vertically`);
    await element.screenshot({ path: new URL(`../images/${panel}.png`, import.meta.url).pathname });
  }
  console.log(JSON.stringify({ fetchedAt: snapshot.fetchedAt, stale: snapshot.stale, events: snapshot.events.length, ...activity }, null, 2));
} finally { await browser.close(); }
