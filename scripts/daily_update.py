"""Daily refresh: fetch new matchup data, then commit and push it so GitHub Pages redeploys.

Run by Windows Task Scheduler (task "Cade Matchups Daily"). Manual run:
    uv run --no-project python scripts/daily_update.py

Logs to logs/daily_update.log. Exits non-zero on failure; the site keeps the last good data.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "logs" / "daily_update.log"
DATA_PATHS = ["public/data/cade-matchups.json", "public/headshots"]
# gh supplies the GitHub token, so the push never stops at a credential prompt.
GIT_AUTH = ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential"]


def log(msg: str) -> None:
    LOG.parent.mkdir(exist_ok=True)
    line = f"{datetime.now().isoformat(timespec='seconds')} {msg}"
    print(line)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def run(*cmd: str) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=600)
    output = (result.stdout + result.stderr).strip()
    if output:
        log(f"  {cmd[0]} {cmd[1] if len(cmd) > 1 else ''}: {output[-800:]}")
    return result


def main() -> int:
    log("start")
    uv = shutil.which("uv")
    if not uv or not shutil.which("git") or not shutil.which("gh"):
        log("error: uv, git and gh must all be on PATH")
        return 1

    if run(uv, "run", "scripts/fetch_matchups.py").returncode != 0:
        log("fetch failed; nothing pushed")
        return 1

    run("git", "add", "--", *DATA_PATHS)
    if run("git", "diff", "--cached", "--quiet").returncode == 0:
        log("no data changes; done")
        return 0

    stamp = datetime.now().strftime("%Y-%m-%d")
    if run("git", "commit", "-m", f"data: daily matchup refresh {stamp}").returncode != 0:
        log("commit failed")
        return 1
    if run("git", *GIT_AUTH, "push", "origin", "main").returncode != 0:
        log("push failed; commit kept locally and will go out with the next successful run")
        return 1
    log("pushed; GitHub Pages will redeploy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
