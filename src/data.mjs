// Gathers the live data that fills the broadcast: articles (from the published
// JSON feed, drafts already excluded), GitHub stats (via the API), a curated
// language + project list, and the static bio. No MDX parsing needed.

const USER = "HelgeSverre";
const FEED = "https://helgesver.re/rss/feed.json";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

export async function getArticles(count = 3) {
  const res = await fetch(FEED, { headers: { "user-agent": "helgesverre-profile" } });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const json = await res.json();
  return (json.items || []).slice(0, count).map((it) => ({
    title: it.title,
    url: it.url,
    date: fmtDate(it.date_modified || it.date_published),
  }));
}

async function gh(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      "user-agent": "helgesverre-profile",
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub REST ${path} ${res.status}`);
  return res.json();
}

async function ghGraphql(query, variables, token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "user-agent": "helgesverre-profile",
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GitHub GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

export async function getStats(token) {
  const user = await gh(`/users/${USER}`, token);
  let stars = 0;
  if (token) {
    let cursor = null;
    do {
      const data = await ghGraphql(
        `query($cursor:String){ user(login:"${USER}"){ repositories(first:100, ownerAffiliations:OWNER, isFork:false, after:$cursor){ pageInfo{hasNextPage endCursor} nodes{ stargazerCount } } } }`,
        { cursor },
        token,
      );
      const repos = data.user.repositories;
      stars += repos.nodes.reduce((s, n) => s + n.stargazerCount, 0);
      cursor = repos.pageInfo.hasNextPage ? repos.pageInfo.endCursor : null;
    } while (cursor);
  }
  return {
    stars: stars.toLocaleString("en-US"),
    repos: user.public_repos.toLocaleString("en-US"),
    followers: user.followers.toLocaleString("en-US"),
  };
}

export async function getContributions(token) {
  if (!token) return { total: "0", cells: [] };
  const data = await ghGraphql(
    `query{ user(login:"${USER}"){ contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ contributionLevel } } } } } }`,
    {},
    token,
  );
  const cal = data.user.contributionsCollection.contributionCalendar;
  const map = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const weeks = cal.weeks;
  // Pad the first (partial) week at the top so weekday rows line up like GitHub's calendar.
  const cells = Array(7 - weeks[0].contributionDays.length).fill(null);
  for (const w of weeks) for (const d of w.contributionDays) cells.push(map[d.contributionLevel] ?? 0);
  return { total: cal.totalContributions.toLocaleString("en-US"), cells };
}

// --- Bergen weather (met.no, free, no key; UA required) ---
export async function getWeather() {
  try {
    const res = await fetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.39&lon=5.32", {
      headers: { "user-agent": "helgesverre-profile github.com/HelgeSverre" },
    });
    if (!res.ok) throw new Error(res.status);
    const j = await res.json();
    const t = j.properties.timeseries[0].data;
    const temp = Math.round(t.instant.details.air_temperature);
    const wind = Math.round(t.instant.details.wind_speed);
    const code = (t.next_1_hours || t.next_6_hours || {}).summary?.symbol_code || "";
    const map = (c) =>
      /rain|sleet|drizzle/.test(c) ? ["RAIN", "☔"]
      : /snow/.test(c) ? ["SNOW", "❄"]
      : /thunder/.test(c) ? ["THUNDER", "⚡"]
      : /fog/.test(c) ? ["FOG", "≋"]
      : /clearsky|fair/.test(c) ? ["CLEAR", "☀"]
      : ["CLOUDY", "☁"];
    const [cond, icon] = map(code);
    return { temp: `${temp}°`, cond, icon, wind: `${wind} m/s`, rain: /rain|sleet|drizzle/.test(code) };
  } catch {
    return { temp: "–", cond: "NO SIGNAL", icon: "▦", wind: "", rain: false };
  }
}

// --- Parody TV programme guide (deterministic by day) ---
export function getProgramme(pool, day) {
  const witty = [
    "Debugging in Production",
    "Yak Shaving",
    '"just one more commit"',
    "Refactor Roulette",
    "Merge Conflict: The Reckoning",
    "Stand-up (taped)",
    "Reading the Docs (rerun)",
    "Prod Down: Live Coverage",
    "Compiling… (cont.)",
  ];
  const w = (n) => witty[(day + n * 3) % witty.length];
  const p1 = pool[day % pool.length];
  const p2 = pool[(day + 4) % pool.length];
  return [
    { time: "18:00", title: w(0) },
    { time: "19:30", title: `${p1.name} — ${p1.desc}` },
    { time: "21:00", title: w(1) },
    { time: "22:30", title: `${p2.name}, live` },
    { time: "00:00", title: w(2) },
    { time: "02:00", title: "Sign-off · Test Card ▦" },
  ];
}

// --- Sema example code for the typer (maze.sema, kept short to bound GIF size) ---
export async function getSemaCode(token, maxLines = 160) {
  const fallback = { file: "maze.sema", code: ';; sema offline\n(println "hello, sema")' };
  try {
    const headers = {
      "user-agent": "helgesverre-profile",
      accept: "application/vnd.github+json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
    const meta = await fetch("https://api.github.com/repos/HelgeSverre/sema/contents/examples/maze.sema", { headers });
    if (!meta.ok) throw new Error(meta.status);
    const url = (await meta.json()).download_url;
    const text = await (await fetch(url, { headers: { "user-agent": "helgesverre-profile" } })).text();
    const code = text.replace(/\t/g, "  ").split("\n").slice(0, maxLines).join("\n").replace(/\s+$/, "");
    return { file: "maze.sema", code };
  } catch {
    return fallback;
  }
}

// Curated, not byte-counted — the hand-picked stack is more representative.
export const LANGUAGES = ["PHP · TypeScript · Svelte", "Rust · Zig · F# · Dart · Sema"];

export const BIO = {
  name: "HELGE SVERRE",
  tagline: ["All-stack Developer, Workaholic,", "Compulsive side-hustler."],
  info: [
    "Bergen, Norway 🇳🇴 · 10+ years experience",
    "VP Engineering @ Crescat · ex-CTO @ Tjommi",
    "helgesver.re · github.com/HelgeSverre",
  ],
};

export const LINKS = {
  hero: "https://helgesver.re",
  stats: `https://github.com/${USER}`,
  heat: `https://github.com/${USER}`,
  articles: "https://helgesver.re/articles",
  projects: "https://helgesver.re/projects",
  nav: [
    { label: "200 PROJECTS", color: "r", url: "https://helgesver.re/projects" },
    { label: "300 ARTICLES", color: "g", url: "https://helgesver.re/articles" },
    { label: "100 HOME", color: "y", url: "https://helgesver.re" },
    { label: "helgesver.re →", color: "c", url: "https://helgesver.re" },
  ],
};

// Deterministic rotation: a window of `n` projects that shifts by day-of-year.
export function rotateFeatured(pool, n = 6, dayOfYear = 0) {
  const out = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    out.push(pool[(dayOfYear + i) % pool.length]);
  }
  return out;
}
