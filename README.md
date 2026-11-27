# Cade vs. Every Defender

How Cade Cunningham scores against every defender NBA tracking credited with guarding him this season.

Static Vite + React + TypeScript site. The page reads `public/data/cade-matchups.json`, which a Python script refreshes from NBA.com's matchup data (`LeagueSeasonMatchups`) via [`nba_api`](https://github.com/swar/nba_api).

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build into dist/
```

## Refresh the data

Requires [uv](https://docs.astral.sh/uv/). The script declares its own dependencies.

```bash
npm run fetch-data                                   # current season
uv run scripts/fetch_matchups.py --season 2025-26    # a specific season
```

The JSON file is only replaced after a fetch succeeds and validates, so a failed run keeps the last good data.

Check the transform: `cd scripts && uv run --with nba_api python test_fetch_matchups.py`

**The fetch must run from a home connection.** stats.nba.com does not answer requests from cloud runners such as GitHub Actions (tested Nov 2026: both `curl` and `nba_api` timed out after 30s). The daily refresh runs on a local machine and pushes the updated JSON.

## Reading the numbers

- **Partial possessions** are NBA tracking's estimate of how much of each possession a defender spent as Cade's primary defender. Switches split credit, so values are fractional.
- **Points** are Cade's points while matched up with that defender, free throws included.
- **Pts/100** is Cade's points per 100 partial possessions. It is far below a team offensive rating because it counts possessions where Cade passed or never shot.
- Small samples are noisy. The default view hides defenders under 10 possessions.
