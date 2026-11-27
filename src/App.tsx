import { useEffect, useMemo, useState } from "react";
import type { MatchupData, MatchupRow } from "./types";
import { EXTREME_MIN_FGA, EXTREME_MIN_POSS, RANK_SORTS, extremes, fmtPct, pct, summarize, type RankSort } from "./stats";
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
  const updated = new Date(data.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <main className="shell">
      <header className="masthead">
        <div className="masthead-text">
          <p className="kicker">Detroit Pistons <span aria-hidden> / </span> {data.season} {data.seasonType}</p>
          <h1>
            Cade <span className="vs">vs.</span><br />Every defender
          </h1>
          <p className="lede">How Cade Cunningham scores, passes and turns it over against every defender NBA tracking credits with guarding him.</p>
          <p className="stamp">Stats last changed <time dateTime={data.updatedAt}>{updated}</time></p>
        </div>
        <DancingCade />
      </header>

      <section className="strip" aria-label="Season totals across all tracked matchups">
        <Stat label="Detroit pts/poss" value={season.teamPpp.toFixed(2)} sub="All tracked matchups" />
        <Stat label="Defenders tracked" value={String(season.defenders)} />
        <Stat label="Field goals" value={fmtPct(pct(season.fgm, season.fga), "%")} sub={`${season.fgm}-for-${season.fga}`} />
        <Stat label="3-pointers" value={fmtPct(pct(season.fg3m, season.fg3a), "%")} sub={`${season.fg3m}-for-${season.fg3a}`} />
        <Stat label="Cade points" value={String(season.pts)} />
        <Stat label="Assists / turnovers" value={`${season.ast} / ${season.tov}`} />
      </section>

      <nav className="section-index" aria-label="On this page">
        <a href="#supers-h">Awards</a>
        <a href="#ranked-h">Rankings</a>
        <a href="#top-h">Charts</a>
        <a href="#table-h">Full table</a>
      </nav>

      <section className="section awards" aria-labelledby="supers-h">
        <h2 id="supers-h">Matchup awards</h2>
        <p className="note">Toughest coverage and favorite target use Cade’s field-goal percentage, with at least {EXTREME_MIN_POSS} partial possessions and {EXTREME_MIN_FGA} shots.</p>
        <div className="callouts">
          <Callout tone="bad" label="Toughest coverage" row={ex.toughest} />
          <Callout tone="good" label="Favorite target" row={ex.favorite} />
          <Callout label="Most-seen defender" row={ex.mostSeen} possOnly />
        </div>
        <Superlatives rows={rows} />
        <p className="note award-note">“Inside” means any 2-pointer, including midrange. The tracking data doesn’t identify shot location or isolation plays.</p>
      </section>

      <section className="section" aria-labelledby="ranked-h">
        <h2 id="ranked-h">Good plays vs. bad plays</h2>
        <div className="play-key">
          <p><b className="positive">Good plays</b> Made field goals, assists, shooting fouls drawn.</p>
          <p><b className="negative">Bad plays</b> Missed field goals, turnovers.</p>
        </div>
        <p className="note">
          Net is good minus bad. These are event counts, not grades on individual possessions or proof that a defender caused the result.
        </p>
        <p className="note">
          <b>Detroit average: {season.teamPpp.toFixed(2)} pts/poss.</b> Total Detroit points divided by total partial possessions
          across all tracked Cade matchups. Green is at or above that mark; red is below. Filters don’t change the average.
        </p>
        <div className="controls">
          <label className="range">
            <span>
              Minimum partial possessions <b>{minPoss}</b>
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

      <section className="section" aria-labelledby="top-h">
        <h2 id="top-h">The 12 most frequent matchups</h2>
        <p className="note">Cade’s points, assists and turnovers against the defenders who guarded him most.</p>
        <TopBars rows={rows} />
      </section>

      <section className="section" aria-labelledby="scatter-h">
        <h2 id="scatter-h">Scoring rate by matchup</h2>
        <p className="note">
          Right means the defender saw Cade more. Up means Cade scored more per possession.{" "}
          <span className="positive">Green</span> dots are above his season rate of{" "}
          {season.ptsPer100.toFixed(1)} points per 100 partial possessions. Uses the minimum-possessions slider above.
        </p>
        <Scatter rows={sampled} baseline={season.ptsPer100} activeId={activeId} onActive={setActiveId} />
      </section>

      <section className="section" aria-labelledby="table-h">
        <h2 id="table-h">Full matchup table</h2>
        <div className="controls">
          <label className="search">
            <input
              type="search"
              placeholder="Search defender or team (BOS)…"
              aria-label="Search defender or team"
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
                ? `${row.poss.toFixed(1)} partial poss.${row.team ? ` · ${row.team}` : ""}`
                : `${fmtPct(pct(row.fgm, row.fga), "%")} FG (${row.fgm}/${row.fga}) on ${row.poss.toFixed(1)} poss.`}
            </div>
          </div>
        </div>
      ) : (
        <div className="callout-stat">No qualifying matchup yet</div>
      )}
    </div>
  );
}
