import { readFile, writeFile } from 'node:fs/promises';

const DAY = 86400000;
const zone = 'Europe/Oslo';
export const localDay = iso => new Intl.DateTimeFormat('sv-SE', { timeZone: zone }).format(new Date(iso));
const clock = iso => new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const shortDate = iso => new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: '2-digit', month: 'short' }).format(new Date(iso)).toUpperCase();
const clean = s => String(s || '').split('\n')[0].replace(/\s+/g, ' ').trim();

export async function collectActivity({ token, config, now = new Date(), request = fetch }) {
  const since = new Date(+now - 14 * DAY).toISOString();
  async function api(path) {
    const res = await request(`https://api.github.com${path}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'helgesverre-profile', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Activity API ${res.status}: ${path}`);
    return res.json();
  }
  let partial = false;
  async function search(type, query, sort) {
    const items = [];
    for (let page = 1; page <= 10; page++) {
      const data = await api(`/search/${type}?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=100&page=${page}`);
      if (data.incomplete_results) throw new Error('Incomplete GitHub activity search');
      items.push(...data.items);
      if (items.length >= data.total_count) break;
      if (page === 10) partial = true;
    }
    return items;
  }
  // Author search covers public org repositories too; repository ownership is not assumed.
  const commits = await search('commits', `author:${config.user} is:public committer-date:>=${since}`, 'committer-date');
  const prs = await search('issues', `is:pr is:merged is:public author:${config.user} merged:>=${since}`, 'updated');
  const allowed = repo => !config.exclude.some(x => x.toLowerCase() === repo.toLowerCase());
  const events = commits.filter(c => !c.repository.private && allowed(c.repository.full_name)
    && !/\[bot\]$/i.test(c.author?.login || '')
    && !/^(Merge |chore: refresh profile broadcast)/i.test(c.commit.message))
    .map(c => ({ id: `commit:${c.repository.full_name}:${c.sha}`, kind: 'commit', repo: c.repository.full_name,
      at: c.commit.committer.date, title: clean(c.commit.message), url: c.html_url }));
  // Search timestamps are not merge timestamps. Fetch the actual PR before displaying it.
  for (const pr of prs) {
    const repo = pr.repository_url.split('/repos/')[1];
    if (!allowed(repo)) continue;
    const detail = await api(`/repos/${repo}/pulls/${pr.number}`);
    if (detail.base.repo.private || !detail.merged_at) continue;
    events.push({ id: `pr:${repo}:${pr.number}`, kind: 'merge', repo, at: detail.merged_at, title: clean(pr.title), url: pr.html_url });
  }
  const repos = [...new Set(events.sort((a,b) => b.at.localeCompare(a.at)).map(e => e.repo))];
  // Check all discovered active repositories; a release is relevant even if automation published it.
  for (const repo of repos) {
    const releases = await api(`/repos/${repo}/releases?per_page=100`);
    for (const r of releases.filter(r => !r.draft && r.published_at >= since)) {
      events.push({ id: `release:${repo}:${r.id}`, kind: 'release', repo, at: r.published_at, title: clean(r.tag_name), url: r.html_url });
    }
  }
  return { version: 1, fetchedAt: now.toISOString(), since, partial, events: events.filter(e => +new Date(e.at) <= +now) };
}

export async function loadActivity({ cachePath, ...options }) {
  try {
    const snapshot = await collectActivity(options);
    await writeFile(cachePath, JSON.stringify(snapshot, null, 2) + '\n');
    return { ...snapshot, stale: false };
  } catch (error) {
    console.warn(`Activity refresh failed: ${error.message}`);
    try {
      const cached = JSON.parse(await readFile(cachePath, 'utf8'));
      if (cached.version !== 1 || !Array.isArray(cached.events) || !Number.isFinite(Date.parse(cached.fetchedAt))) throw new Error('Invalid cache');
      return { ...cached, stale: true };
    } catch { throw error; } // Never replace the broadcast with fictional or empty success data.
  }
}

export function buildActivityPanels(snapshot, config, now = new Date()) {
  const events = [...snapshot.events].sort((a,b) => b.at.localeCompare(a.at));
  const name = repo => config.names[repo] || repo.split('/')[1];
  const groups = new Map();
  for (const event of events) {
    if (!groups.has(event.repo)) groups.set(event.repo, []);
    groups.get(event.repo).push(event);
  }
  const projects = [...groups].map(([repo, rows]) => {
    const activeDays = new Set(rows.map(e => localDay(e.at))).size;
    const latest = rows[0];
    const age = Math.max(0, (+now - Date.parse(latest.at)) / DAY);
    const lead = rows.find(e => e.kind === 'release' || e.kind === 'merge') || latest;
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = localDay(new Date(+now - (6-i)*DAY));
      return rows.filter(e => localDay(e.at) === day).length;
    });
    return { repo, name: name(repo), desc: lead.kind === 'release' ? `Released ${lead.title}` : lead.title,
      url: lead.url, days, freshness: localDay(latest.at) === localDay(now) ? 'TODAY' : shortDate(latest.at),
      score: activeDays * 3 + Math.max(0, 14-age) + (rows.some(e=>e.kind==='release') ? 4 : 0) + (rows.some(e=>e.kind==='merge') ? 2 : 0), latest: latest.at };
  }).sort((a,b) => Number(config.pin.includes(b.repo))-Number(config.pin.includes(a.repo)) || b.score-a.score || b.latest.localeCompare(a.latest) || a.repo.localeCompare(b.repo)).slice(0,6);
  // One workshop item per project/day; releases and merges remain individually visible.
  const seen = new Set();
  const programme = events.filter(e => {
    if (e.kind !== 'commit') return true;
    const key = `${e.repo}:${localDay(e.at)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0,5).map(e => ({ ...e, time: clock(e.at), date: shortDate(e.at),
    title: `${e.kind === 'release' ? 'PREMIERE' : e.kind === 'merge' ? 'MERGED' : 'WORKSHOP'} · ${name(e.repo)}`,
    detail: e.title }));
  const status = `${snapshot.stale ? 'CACHED' : 'UPDATED'} ${shortDate(snapshot.fetchedAt)} ${clock(snapshot.fetchedAt)}${snapshot.partial ? ' · PARTIAL' : ''}`;
  return { projects, programme, status, window: 'LAST 14 DAYS', timezone: zone };
}
