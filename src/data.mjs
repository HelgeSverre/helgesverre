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
