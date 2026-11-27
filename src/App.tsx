import { useEffect, useMemo, useState } from "react";
import type { MatchupData } from "./types";
import { fmtPct, per100, pct, totals } from "./stats";
import Scatter from "./Scatter";
import MatchupTable from "./MatchupTable";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: MatchupData };

const POSS_STEPS = [0, 5, 10, 15, 20, 30];

export default function App() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [minPoss, setMinPoss] = useState(10);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/data/cade-matchups.json", { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MatchupData>;
      })
      .then((data) => setLoad({ status: "ready", data }))
      .catch((err: Error) => setLoad({ status: "error", message: err.message }));
  }, []);

  const rows = load.status === "ready" ? load.data.rows : [];
  const season = useMemo(() => totals(rows), [rows]);
  const baseline = per100(season.pts, season.poss);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) => r.poss >= minPoss && (!q || r.defName.toLowerCase().includes(q) || (r.team ?? "").toLowerCase().includes(q)),
    );
  }, [rows, minPoss, query]);

  if (load.status === "loading") return <main className="shell state">Loading matchups…</main>;
  if (load.status === "error")
    return <main className="shell state">Couldn't load matchup data ({load.message}).</main>;

  const { data } = load;
  const updated = new Date(data.updatedAt);

  return (
    <main className="shell">
      <header className="masthead">
        <p className="kicker">
          <span className="dot" aria-hidden /> Detroit Pistons · #2 · {data.season} {data.seasonType}
        </p>
        <h1>
          Cade <span className="vs">vs.</span> every defender
        </h1>
        <p className="lede">
          Every player NBA tracking credited with guarding Cade Cunningham this season, and how Cade scored on them.
        </p>
        <p className="stamp">
          Updated{" "}
          <time dateTime={data.updatedAt}>
            {updated.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </time>
        </p>
      </header>

      <section className="strip" aria-label="Season totals across all defenders">
        <Stat label="Defenders" value={season.defenders.toString()} />
        <Stat label="Partial poss." value={season.poss.toFixed(0)} />
        <Stat label="Points" value={season.pts.toString()} />
        <Stat label="Pts / 100 poss." value={baseline.toFixed(1)} accent />
        <Stat label="FG%" value={fmtPct(pct(season.fgm, season.fga))} sub={`${season.fgm}/${season.fga}`} />
        <Stat label="3P%" value={fmtPct(pct(season.fg3m, season.fg3a))} sub={`${season.fg3m}/${season.fg3a}`} />
      </section>

      <section className="controls" aria-label="Filters">
        <label className="search">
          <span>Find a defender</span>
          <input
            type="search"
            placeholder="Name or team, e.g. Mitchell, BOS"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <fieldset className="steps">
          <legend>Min. possessions</legend>
          {POSS_STEPS.map((n) => (
            <button key={n} type="button" aria-pressed={minPoss === n} onClick={() => setMinPoss(n)}>
              {n === 0 ? "All" : `${n}+`}
            </button>
          ))}
        </fieldset>
        <p className="count">
          {visible.length} of {rows.length} defenders
        </p>
      </section>

      <Scatter rows={visible} baseline={baseline} activeId={activeId} onActive={setActiveId} />

      <MatchupTable rows={visible} baseline={baseline} activeId={activeId} onActive={setActiveId} />

      <footer className="notes">
        <p>
          <strong>How to read this.</strong> A partial possession is NBA tracking's estimate of how much of a possession a
          defender spent as Cade's primary defender, so possessions are fractional and switches split credit. Points are
          Cade's points while matched up with that defender, free throws included. Pts/100 runs far below a team
          offensive rating because possessions where Cade passes or never shoots still count. Small samples swing hard: a few
          possessions can make anyone look like a stopper or a turnstile, which is why the default view hides defenders
          under 10 possessions.
        </p>
        <p className="source">Source: {data.source}. Refreshed daily.</p>
      </footer>
    </main>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={accent ? "stat accent" : "stat"}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
