"""Daily refresh: fetch new matchup data, then commit and push it so both hosts redeploy.

Run by Windows Task Scheduler (task "Cade Matchups Daily", 9:00 AM via pythonw). Manual run:
    python scripts/daily_update.py

Each run:
  1. refuses to run unless `main` is checked out, so data never lands on a feature branch;
  2. fast-forwards to GitHub's main, so code pushed from another machine doesn't block the push;
  3. fetches; the data file only changes when the stats changed (no game, no commit);
  4. commits only the data paths, never anything else that happens to be staged;
  5. pushes whenever local main is ahead, which also retries a push that failed on an earlier day.

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
# gh supplies the GitHub token, so fetch/push never stop at a credential prompt.
GIT_AUTH = ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential"]


def log(msg: str) -> None:
    LOG.parent.mkdir(exist_ok=True)
    line = f"{datetime.now().isoformat(timespec='seconds')} {msg}"
    print(line)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def run(label: str, *cmd: str) -> subprocess.CompletedProcess[str]:
    # No console windows flashing up when Task Scheduler runs this via pythonw.
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=600, creationflags=flags)
    output = (result.stdout + result.stderr).strip()
    if output:
        log(f"  {label}: {output[-800:]}")
    return result


def git(label: str, *args: str) -> subprocess.CompletedProcess[str]:
    return run(label, "git", *args)


def main() -> int:
    log("start")
    uv = shutil.which("uv")
    if not uv or not shutil.which("git") or not shutil.which("gh"):
        log("error: uv, git and gh must all be on PATH")
        return 1

    branch = git("branch", "rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    if branch != "main":
        log(f"skipped: '{branch}' is checked out; the daily update only commits on main")
        return 1

    if git("fetch", *GIT_AUTH, "fetch", "origin", "main").returncode == 0:
        if git("sync", "merge", "--ff-only", "origin/main").returncode != 0:
            log("warning: local main has diverged from GitHub; push will likely fail until it's reconciled")
    else:
        log("warning: could not reach GitHub to sync; continuing")

    if run("fetch-data", uv, "run", "scripts/fetch_matchups.py").returncode != 0:
        log("fetch failed; site keeps the last good data")
        return 1

    git("stage", "add", "--", *DATA_PATHS)
    if git("diff", "diff", "--cached", "--quiet", "--", *DATA_PATHS).returncode != 0:
        stamp = datetime.now().strftime("%Y-%m-%d")
        if git("commit", "commit", "-m", f"data: daily matchup refresh {stamp}", "--", *DATA_PATHS).returncode != 0:
            log("commit failed")
            return 1
    else:
        log("no new stats today")

    ahead = git("ahead", "rev-list", "--count", "origin/main..main").stdout.strip()
    if ahead in ("", "0"):
        log("done; nothing to push")
        return 0
    if git("push", *GIT_AUTH, "push", "origin", "main").returncode != 0:
        log(f"push failed; {ahead} commit(s) kept locally and retried on the next run")
        return 1
    log(f"pushed {ahead} commit(s); Vercel and GitHub Pages will redeploy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
