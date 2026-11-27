# /// script
# requires-python = ">=3.11"
# dependencies = ["nba_api>=1.10"]
# ///
"""Fetch Cade Cunningham's season matchup data and write public/data/cade-matchups.json.

Run: uv run scripts/fetch_matchups.py [--season 2026-27]

The output file is only replaced after the new data passes validation, so a failed
or empty fetch leaves the last good dataset in place.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

CADE_ID = 1630595
CADE_NAME = "Cade Cunningham"
OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "cade-matchups.json"

# NBA column -> output field. Every row in the JSON has exactly these keys.
FIELDS = {
    "DEF_PLAYER_ID": "defId",
    "DEF_PLAYER_NAME": "defName",
    "GP": "gp",
    "MATCHUP_TIME_SEC": "seconds",
    "PARTIAL_POSS": "poss",
    "PLAYER_PTS": "pts",
    "TEAM_PTS": "teamPts",
    "MATCHUP_AST": "ast",
    "MATCHUP_TOV": "tov",
    "MATCHUP_BLK": "blk",
    "MATCHUP_FGM": "fgm",
    "MATCHUP_FGA": "fga",
    "MATCHUP_FG3M": "fg3m",
    "MATCHUP_FG3A": "fg3a",
    "MATCHUP_FTM": "ftm",
    "MATCHUP_FTA": "fta",
    "SFL": "sfl",
    "HELP_BLK": "helpBlk",
}
INT_FIELDS = {"defId", "gp", "pts", "teamPts", "ast", "tov", "blk", "fgm", "fga",
              "fg3m", "fg3a", "ftm", "fta", "sfl", "helpBlk"}


def current_season(today: date) -> str:
    """NBA seasons start in October: Nov 2026 -> '2026-27', Mar 2027 -> '2026-27'."""
    start = today.year if today.month >= 10 else today.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def to_rows(records: list[dict], teams: dict[int, str]) -> list[dict]:
    """Convert raw NBA matchup records into the site's row shape."""
    missing = set(FIELDS) - set(records[0]) if records else set()
    if missing:
        raise ValueError(f"NBA response is missing columns: {sorted(missing)}")
    rows = []
    for rec in records:
        if rec["OFF_PLAYER_ID"] != CADE_ID:
            raise ValueError(f"Unexpected offensive player {rec['OFF_PLAYER_ID']}")
        row = {}
        for src, dst in FIELDS.items():
            value = rec[src]
            if dst == "defName":
                row[dst] = str(value)
            elif dst in INT_FIELDS:
                row[dst] = int(value or 0)
            else:
                row[dst] = round(float(value or 0), 2)
        row["team"] = teams.get(row["defId"])
        rows.append(row)
    rows.sort(key=lambda r: r["poss"], reverse=True)
    return rows


def fetch_records(season: str) -> list[dict]:
    from nba_api.stats.endpoints import leagueseasonmatchups

    resp = leagueseasonmatchups.LeagueSeasonMatchups(
        season=season,
        season_type_playoffs="Regular Season",
        per_mode_simple="Totals",
        off_player_id_nullable=CADE_ID,
        timeout=45,
    )
    return resp.season_matchups.get_data_frame().to_dict("records")


def fetch_teams(season: str) -> dict[int, str]:
    """Current team abbreviation per player. Optional: returns {} on failure."""
    try:
        from nba_api.stats.endpoints import commonallplayers

        df = commonallplayers.CommonAllPlayers(
            season=season, is_only_current_season=1, timeout=45
        ).common_all_players.get_data_frame()
        return {int(r.PERSON_ID): r.TEAM_ABBREVIATION for r in df.itertuples() if r.TEAM_ABBREVIATION}
    except Exception as exc:  # team labels are cosmetic; never fail the update over them
        print(f"warning: team lookup failed ({exc}); continuing without teams", file=sys.stderr)
        return {}


def write_atomic(payload: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, indent=1)
        f.write("\n")
    os.replace(tmp, path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", default=current_season(date.today()))
    parser.add_argument("--out", type=Path, default=OUT_PATH)
    args = parser.parse_args()

    try:
        records = fetch_records(args.season)
        if not records:
            raise ValueError(f"No matchup rows returned for {args.season}")
        rows = to_rows(records, fetch_teams(args.season))
    except Exception as exc:
        print(f"error: fetch failed, keeping existing data: {exc}", file=sys.stderr)
        return 1

    payload = {
        "player": {"id": CADE_ID, "name": CADE_NAME},
        "season": args.season,
        "seasonType": "Regular Season",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "NBA.com matchup tracking via nba_api (LeagueSeasonMatchups)",
        "rows": rows,
    }
    write_atomic(payload, args.out)
    print(f"wrote {len(rows)} defenders for {args.season} to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
