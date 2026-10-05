# Activity broadcast

`npm run generate` refreshes the whole profile. `npm run preview` fetches live public GitHub activity and renders only `images/now.png` and `images/prog.png`. `npm run preview -- --snapshot images/activity.json` replays a collected snapshot without API requests. Supply `GITHUB_TOKEN` to avoid the low unauthenticated API limit. `CHROMIUM_PATH` can select an existing local Chromium for previews.

The collector searches commits authored by HelgeSverre and merged PRs authored by HelgeSverre across public personal and organization repositories over 14 days, then checks releases in those active repositories. It excludes merge commits, bot authors, private repositories, and the profile repository. This is authored activity, not all work done by every contributor in the user's organizations. Releases in otherwise inactive repositories are not discovered. GitHub commit search can lag and caps results at 1,000; the header labels a capped snapshot PARTIAL.

Ten projects are shown in two columns of five. Projects rank by distinct active days (3 points/day), recency (up to 14), releases (+4) and merged PRs (+2). Counts do not affect ranking. Programme entries are sorted by actual event time; commits are grouped per repo/Oslo calendar day. PR times come from `merged_at`, not issue `updated_at`. Labels and titles are deterministic, without LLM calls. Long titles are ellipsized; full titles and source URLs remain in the snapshot.

Edit `data/activity.json` for display-name overrides, excluded full repo names and pinned active repositories. Pins do not fabricate activity. A successful fetch writes `images/activity.json`, committed by the existing six-hour workflow. A fetch failure reuses that snapshot and displays its original timestamp with CACHED. No cache means the run fails without overwriting the existing images. Empty successful activity displays an explicit empty state.

`npm test` covers grouping, ranking, Oslo dates, visibility filtering, PR timestamps and fallback behavior. The snapshot contains public source titles and URLs and provides an auditable input for the generated images.
