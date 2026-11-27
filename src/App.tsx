import { useEffect, useMemo, useState } from "react";
import type { MatchupData, MatchupRow } from "./types";
import { EXTREME_MIN_FGA, EXTREME_MIN_POSS, RANK_SORTS, RATE_MIN_POSS, SHOT_MIX_MIN_FGA, extremes, fmtPct, pct, summarize, type RankSort } from "./stats";
import Face from "./Face";
import RankedList from "./RankedList";
import TopBars from "./TopBars";
import Scatter from "./Scatter";
import MatchupTable from "./MatchupTable";
import DancingCade from "./DancingCade";
import Superlatives from "./Superlatives";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: MatchupData };

const DATA_URL = `${import.meta.env.BASE_URL}data/cade-matchups.json`;

export default function App() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [minPoss, setMinPoss] = useState(5);
  const [rankSort, setRankSort] = useState<RankSort>("poss");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    fetch(DATA_URL, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MatchupData>;
      })
      .then((data) => setLoad({ status: "ready", data }))
      .catch((err: Error) => setLoad({ status: "error", message: err.message }));
  }, []);

  const rows = load.status === "ready" ? load.data.rows : [];
  const season = useMemo(() => summarize(rows), [rows]);
  const ex = useMemo(() => extremes(rows), [rows]);
  const sampled = useMemo(() => rows.filter((r) => r.poss >= minPoss), [rows, minPoss]);
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sampled.filter((r) => r.defName.toLowerCase().includes(q) || (r.team ?? "").toLowerCase() === q) : sampled;
  }, [sampled, query]);

  if (load.status === "loading") return <main className="shell state">Loading matchups…</main>;
  if (load.status === "error") return <main className="shell state">Couldn't load matchup data ({load.message}).</main>;

  const { data } = load;
  const updated = new Date(data.updatedAt).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <main className="shell">
      <header className="masthead">
        <div className="masthead-text">
          <p className="kicker">
            <span className="dot" aria-hidden /> Detroit Pistons · #2 · {data.season} {data.seasonType}
          </p>
          <h1>
            Cade <span className="vs">vs.</span> every defender
          </h1>
          <p className="lede">
            Across <b>{season.defenders}</b> defenders NBA.com's tracking has credited with guarding him this season,
            Cunningham is shooting <b>{fmtPct(pct(season.fgm, season.fga), "%")}</b> (<b>{season.fgm}</b>-for-
            <b>{season.fga}</b>), with <b>{season.ast}</b> assists against <b>{season.tov}</b> turnovers on these matchups.
          </p>
          <p className="stamp">
            Updated <time dateTime={data.updatedAt}>{updated}</time> · refreshed daily from NBA.com
          </p>
        </div>
        <DancingCade />
      </header>

      <section className="strip reveal" aria-label="Season totals across all defenders">
        <Stat label="Defenders tracked" value={String(season.defenders)} />
        <Stat label="Overall FG%" value={fmtPct(pct(season.fgm, season.fga))} sub={`${season.fgm}-for-${season.fga}`} />
        <Stat label="3P%" value={fmtPct(pct(season.fg3m, season.fg3a))} sub={`${season.fg3m}-for-${season.fg3a}`} />
        <Stat label="Points scored" value={String(season.pts)} />
        <Stat label="Assists (passed)" value={String(season.ast)} />
        <Stat label="Turnovers" value={String(season.tov)} />
      </section>

      <section className="callouts reveal" aria-label="Notable matchups">
        <Callout tone="bad" label={`Toughest coverage (${EXTREME_MIN_POSS}+ poss., ${EXTREME_MIN_FGA}+ FGA)`} row={ex.toughest} />
        <Callout tone="good" label={`Favorite target (${EXTREME_MIN_POSS}+ poss., ${EXTREME_MIN_FGA}+ FGA)`} row={ex.favorite} />
        <Callout label="Most-seen defender" row={ex.mostSeen} possOnly />
      </section>

      <section className="section reveal" aria-labelledby="supers-h">
        <h2 id="supers-h">Superlatives</h2>
        <p className="note">
          One title per category, to the defender who led it. Rates need {RATE_MIN_POSS}+ partial possessions and shot
          mix needs {SHOT_MIX_MIN_FGA}+ shots, so a single possession can't win a title. "Inside" means 2-pointers: rim
          attacks and midrange both count, because this data doesn't say where a shot came from or whether it was an iso.
        </p>
        <Superlatives rows={rows} />
      </section>

      <section className="section reveal" aria-labelledby="ranked-h">
        <h2 id="ranked-h">Who disrupted Cade, and who didn't</h2>
        <p className="note">
          <b>Bad plays vs. good plays</b> counts what Cade did on possessions each defender guarded him. Good plays
          (green, right) are made shots, assists and shooting fouls drawn. Bad plays (red, left) are missed shots and
          turnovers. The number is good minus bad: a defender in the red really bothered him, while a big green number
          means Cade won the matchup even if he barely shot.
        </p>
        <p className="note">
          <b>Detroit pts/poss</b> is the whole team's points per possession while that defender was on Cade: his scoring,
          his passing and everything his gravity opened up. Across all his matchups it's <b>{season.teamPpp.toFixed(2)}</b>.
          Above that (green number and ring), Detroit's offense won the matchup; below it (red), the defender did. This
          only covers Detroit's offense.
        </p>
        <div className="controls">
          <label className="range">
            <span>
              Minimum partial possessions guarded: <b>{minPoss}</b>
            </span>
            <input type="range" min={0} max={40} step={1} value={minPoss} onChange={(e) => setMinPoss(+e.target.value)} />
          </label>
          <span className="count">
            Showing <b>{sampled.length}</b> of <b>{rows.length}</b> defenders
          </span>
          <select value={rankSort} onChange={(e) => setRankSort(e.target.value as RankSort)} aria-label="Sort defenders">
            {RANK_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <RankedList rows={sampled} teamPpp={season.teamPpp} sort={rankSort} />
      </section>

      <section className="section reveal" aria-labelledby="top-h">
        <h2 id="top-h">Scored, passed, or turned it over: top 12 matchups by sample size</h2>
        <p className="note">
          The defenders who logged the most possessions guarding Cunningham, and what he did against them: points scored,
          assists (passes that led to a score), and turnovers.
        </p>
        <TopBars rows={rows} />
      </section>

      <section className="section reveal" aria-labelledby="scatter-h">
        <h2 id="scatter-h">Volume vs. damage</h2>
        <p className="note">
          Right means the defender saw Cade more. Up means Cade scored more per possession.{" "}
          <span style={{ color: "var(--good)" }}>Green</span> dots are above his season rate of{" "}
          {season.ptsPer100.toFixed(1)} points per 100 partial possessions. Uses the minimum-possessions slider above.
        </p>
        <Scatter rows={sampled} baseline={season.ptsPer100} activeId={activeId} onActive={setActiveId} />
      </section>

      <section className="section reveal" aria-labelledby="table-h">
        <h2 id="table-h">Every defender, full breakdown</h2>
        <div className="controls">
          <label className="search">
            <input
              type="search"
              placeholder="Search defender or team (BOS)…"
              aria-label="Search defender"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="count">Uses the minimum-possessions slider above.</span>
        </div>
        <MatchupTable rows={searched} baseline={season.ptsPer100} activeId={activeId} onActive={setActiveId} />
        <p className="note">
          FG, 3P, FT, PTS, AST and TOV are Cunningham's own totals on possessions NBA.com's tracking assigned to that
          defender as the primary matchup, not that defender's own stat line. Click a column header to sort.
        </p>
      </section>

      <details className="about">
        <summary>About this data</summary>
        <p>
          Source: {data.source}, pulled daily for Cade Cunningham's offensive matchups. This is Second Spectrum tracking
          data: for every possession, the NBA's matchup algorithm assigns a primary defender based on time spent guarding
          the ball-handler or shooter, then totals Cunningham's shooting, passing and turnovers for the possessions matched
          against each one. Partial possessions are fractional because a single possession can be split across defenders
          as coverage switches. Pts/100 runs far below a team offensive rating because possessions where Cade passes or
          never shoots still count. Rows with only a handful of partial possessions are small samples: read them as
          anecdotes, not as a reliable read on that defender.
        </p>
      </details>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

function Callout({ label, row, tone, possOnly }: { label: string; row: MatchupRow | null; tone?: "good" | "bad"; possOnly?: boolean }) {
  return (
    <div className={`callout${tone ? ` ${tone}` : ""}`}>
      <span className="stat-label">{label}</span>
      {row ? (
        <div className="callout-body">
          <Face id={row.defId} name={row.defName} size={48} />
          <div>
            <div className="callout-name">{row.defName}</div>
            <div className="callout-stat">
              {possOnly
                ? `${row.poss.toFixed(1)} partial poss. · ${row.team ?? ""}`
                : `${fmtPct(pct(row.fgm, row.fga), "%")} FG (${row.fgm}/${row.fga}) on ${row.poss.toFixed(1)} poss.`}
            </div>
          </div>
        </div>
      ) : (
        <div className="callout-stat">No {EXTREME_MIN_POSS}+ possession matchup yet</div>
      )}
    </div>
  );
}
