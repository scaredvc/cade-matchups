"""Run: uv run --with nba_api python scripts/test_fetch_matchups.py"""

import json
import tempfile
from datetime import date
from pathlib import Path

from fetch_matchups import CADE_ID, current_season, is_unchanged, to_rows


def record(def_id, name, poss, **overrides):
    rec = {
        "OFF_PLAYER_ID": CADE_ID, "DEF_PLAYER_ID": def_id, "DEF_PLAYER_NAME": name,
        "GP": 2, "MATCHUP_TIME_SEC": 731.0, "PARTIAL_POSS": poss, "PLAYER_PTS": 11.0,
        "TEAM_PTS": 30.0, "MATCHUP_AST": 8.0, "MATCHUP_TOV": 0.0, "MATCHUP_BLK": 0.0,
        "MATCHUP_FGM": 3.0, "MATCHUP_FGA": 5.0, "MATCHUP_FG3M": 1.0, "MATCHUP_FG3A": 2.0,
        "MATCHUP_FTM": 4.0, "MATCHUP_FTA": 4.0, "SFL": 1.0, "HELP_BLK": None,
    }
    rec.update(overrides)
    return rec


assert current_season(date(2026, 11, 27)) == "2026-27"
assert current_season(date(2027, 3, 1)) == "2026-27"
assert current_season(date(2027, 10, 20)) == "2027-28"

rows = to_rows([record(1, "Low Volume", 3.04), record(2, "Davion Mitchell", 57.6)], {2: "MIA"})
assert [r["defName"] for r in rows] == ["Davion Mitchell", "Low Volume"], "sorted by possessions"
assert rows[0] == {
    "defId": 2, "defName": "Davion Mitchell", "gp": 2, "seconds": 731.0, "poss": 57.6,
    "pts": 11, "teamPts": 30, "ast": 8, "tov": 0, "blk": 0, "fgm": 3, "fga": 5,
    "fg3m": 1, "fg3a": 2, "ftm": 4, "fta": 4, "sfl": 1, "helpBlk": 0, "team": "MIA",
}
assert rows[1]["team"] is None

for bad in ([record(3, "Wrong", 1.0, OFF_PLAYER_ID=999)], [{"OFF_PLAYER_ID": CADE_ID}]):
    try:
        to_rows(bad, {})
    except ValueError:
        pass
    else:
        raise AssertionError("bad input should raise")

with tempfile.TemporaryDirectory() as tmp:
    saved = Path(tmp) / "data.json"
    assert not is_unchanged(saved, "2026-27", rows), "missing file counts as changed"
    saved.write_text(json.dumps({"season": "2026-27", "updatedAt": "x", "rows": rows}), encoding="utf-8")
    assert is_unchanged(saved, "2026-27", rows), "same rows: leave the file (and updatedAt) alone"
    assert not is_unchanged(saved, "2027-28", rows), "new season is a change"
    assert not is_unchanged(saved, "2026-27", rows[:1]), "different rows are a change"
    saved.write_text("{not json", encoding="utf-8")
    assert not is_unchanged(saved, "2026-27", rows), "corrupt file gets rewritten"

print("ok")
