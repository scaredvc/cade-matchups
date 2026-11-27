# Cade vs. Every Defender

How Cade Cunningham scores against every defender NBA tracking credited with guarding him this season.

**Live:** https://cade-matchups.vercel.app (Vercel) · https://scaredvc.github.io/cade-matchups/ (GitHub Pages)

Static Vite + React + TypeScript site. The page reads `public/data/cade-matchups.json` and `public/headshots/`, which a Python script refreshes from NBA.com's matchup data (`LeagueSeasonMatchups`) via [`nba_api`](https://github.com/swar/nba_api). Every push to `main` deploys to both hosts: Vercel through its GitHub integration (`vercel.json`), and GitHub Pages through `.github/workflows/deploy.yml`, which builds with `GITHUB_PAGES=true` so assets resolve under `/cade-matchups/`.

## How the data gets here

```
Task Scheduler (this PC, daily)
  └─ scripts/daily_update.py
       ├─ uv run scripts/fetch_matchups.py   → public/data/cade-matchups.json, public/headshots/*.png
       └─ git commit + push (only if the data changed)
            ├─ Vercel: test, build, deploy (cade-matchups.vercel.app)
            └─ GitHub Actions: test, build, deploy to Pages
```

The fetch runs on a home machine because **stats.nba.com does not answer requests from cloud runners** such as GitHub Actions (tested Nov 2026: `curl` and `nba_api` both timed out after 30s). If the PC is off, the site keeps showing the last update and its timestamp.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # stats helpers + fetch transform
npm run build        # typecheck + production build into dist/
```

## Refresh the data by hand

Requires [uv](https://docs.astral.sh/uv/). The script declares its own dependencies.

```bash
npm run fetch-data                                   # current season
uv run scripts/fetch_matchups.py --season 2025-26    # a specific season
```

The JSON file is only replaced after a fetch succeeds and validates, so a failed run keeps the last good data. Headshots are downloaded once per new defender.

## Reading the numbers

- **Partial possessions** are NBA tracking's estimate of how much of each possession a defender spent as Cade's primary defender. Switches split credit, so values are fractional.
- **Good plays** are made shots, assists and shooting fouls drawn. **Bad plays** are missed shots and turnovers. Net is good minus bad.
- **Detroit pts/poss** is the team's points per possession while that defender was on Cade.
- **Pts/100** is Cade's own points per 100 partial possessions. It is far below a team offensive rating because it counts possessions where Cade passed or never shot.
- Small samples are noisy. The default view hides defenders under 5 possessions, and the toughest/favorite callouts need 8+ possessions and 4+ shots.
