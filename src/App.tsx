import { useEffect, useMemo, useState } from "react";
import type { MatchupData, MatchupRow } from "./types";
import { EXTREME_MIN_FGA, EXTREME_MIN_POSS, RANK_SORTS, extremes, fmtPct, pct, summarize, toLine, type RankSort } from "./stats";
import Face from "./Face";
import RankedList from "./RankedList";
import TopBars from "./TopBars";
import Scatter from "./Scatter";
import MatchupTable from "./MatchupTable";
import DancingCade from "./DancingCade";
import Superlatives from "./Superlatives";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: MatchupData };

const SAMPLE_OPTIONS = [5, 10, 20, 40, 0];
const EMPTY_ROWS: MatchupRow[] = [];
const DATA_URL = `${import.meta.env.BASE_URL}data/cade-matchups.json`;

export default function App() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [minPoss, setMinPoss] = useState(5);
  const [rankSort, setRankSort] = useState<RankSort>("poss");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetch(DATA_URL, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MatchupData>;
      })
      .then((data) => setLoad({ status: "ready", data }))
      .catch((err: Error) => setLoad({ status: "error", message: err.message }));
  }, []);

  const rows = load.status === "ready" ? load.data.rows : EMPTY_ROWS;
  const season = useMemo(() => summarize(rows), [rows]);
  const ex = useMemo(() => extremes(rows), [rows]);
  const sampled = useMemo(() => rows.filter((r) => r.poss >= minPoss), [rows, minPoss]);
  const plotted = useMemo(() => sampled.filter((r) => r.poss > 0), [sampled]);
  const alphabetic = useMemo(() => [...rows].sort((a, b) => a.defName.localeCompare(b.defName)), [rows]);
  const selected = sampled.find((r) => r.defId === selectedId)
    ?? plotted.reduce<MatchupRow | null>((best, r) => best === null || r.pts > best.pts ? r : best, null);
  const selectDefender = (id: number) => {
    if (!sampled.some((r) => r.defId === id)) setMinPoss(0);
    setSelectedId(id);
  };
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.defName.toLowerCase().includes(q) || (r.team ?? "").toLowerCase() === q) : rows;
  }, [rows, query]);

  if (load.status === "loading") return <main className="shell state">Loading matchups…</main>;
  if (load.status === "error") return <main className="shell state">Couldn't load matchup data ({load.message}).</main>;

  const { data } = load;
  const updated = new Date(data.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <main className="shell">
      <header className="masthead">
        <div className="matchup-edition">
          <p className="kicker">Detroit Pistons / {data.season} {data.seasonType}</p>
          <p className="stamp">Stats last changed <time dateTime={data.updatedAt}>{updated}</time></p>
        </div>
        <div className="title-row">
          <div>
            <h1>Cade <span className="vs">vs.</span> every defender</h1>
            <p className="lede">{season.defenders} defenders. See how Cade scores, passes, and turns it over against each one.</p>
          </div>
          <div className="season-rate">
            <strong>{season.teamPpp.toFixed(2)}</strong>
            <span>Detroit pts/poss <small>All tracked matchups</small></span>
          </div>
        </div>
        <nav className="section-index" aria-label="On this page">
          <a href="#map-h">Map</a>
          <a href="#supers-h">Awards</a>
          <a href="#ranked-h">Rankings</a>
          <a href="#table-h">Full table</a>
        </nav>
      </header>

      <section className="map-section" aria-labelledby="map-h">
        <div className="map-canvas">
          <div className="map-header">
            <h2 id="map-h" tabIndex={-1}>Matchup map</h2>
            <div className="map-controls">
              <label>Find a defender
                <select value={selected?.defId ?? ""} onChange={(e) => selectDefender(Number(e.target.value))}>
                  {!selected && <option value="" disabled>Choose a defender</option>}
                  {alphabetic.map((r) => <option key={r.defId} value={r.defId}>{r.defName}</option>)}
                </select>
              </label>
              <label>Minimum sample
                <select value={minPoss} onChange={(e) => {
                  setMinPoss(Number(e.target.value));
                  setSelectedId(selected?.defId ?? null);
                }}>
                  {SAMPLE_OPTIONS.map((n) => <option key={n} value={n}>{n ? `${n}+ poss.` : "All matchups"}</option>)}
                </select>
              </label>
            </div>
          </div>
          <Scatter rows={plotted} baseline={season.ptsPer100} selectedId={selected?.defId ?? null} onSelect={selectDefender} />
        </div>
        <MatchupDetail row={selected} teamAverage={season.teamPpp} />
        <p className="note map-note">Select a dot or choose a defender. Farther right means more possessions; higher means more scoring per possession. Dashed line: Cade’s average.
          {plotted.length !== sampled.length && " Matchups with no possessions aren’t plotted."}</p>
      </section>

      <section className="season-ledger" aria-label="Season totals across all tracked matchups">
        <div className="strip">
          <Stat label="Field goals" value={fmtPct(pct(season.fgm, season.fga), "%")} sub={`${season.fgm} of ${season.fga}`} />
          <Stat label="3-pointers" value={fmtPct(pct(season.fg3m, season.fg3a), "%")} sub={`${season.fg3m} of ${season.fg3a}`} />
          <Stat label="Cade points" value={String(season.pts)} />
          <Stat label="Assists / turnovers" value={`${season.ast} / ${season.tov}`} />
        </div>
        <DancingCade />
      </section>

      <section className="section awards" aria-labelledby="supers-h">
        <h2 id="supers-h">Matchup awards</h2>
        <div className="awards-layout">
          <div className="featured">
            <h3 className="featured-label">Featured matchups</h3>
            <div className="callouts">
              <Callout tone="bad" label="Toughest coverage" row={ex.toughest} />
              <Callout tone="good" label="Favorite target" row={ex.favorite} />
              <Callout label="Most-seen defender" row={ex.mostSeen} possOnly />
            </div>
            <p className="note feature-note">Toughest and favorite are based on Cade’s FG% with at least {EXTREME_MIN_POSS} partial possessions and {EXTREME_MIN_FGA} attempts.</p>
          </div>
          <div className="award-board">
            <Superlatives rows={rows} />
            <p className="note award-note">“Inside” includes all 2-pointers, even midrange. These data don’t identify shot location or isolation plays.</p>
          </div>
        </div>
      </section>

      <div className="analysis-spread">
        <section className="section" aria-labelledby="ranked-h">
          <h2 id="ranked-h">Good plays vs. bad plays</h2>
          <div className="play-key">
            <p><b className="positive">Good</b> Made field goals, assists, shooting fouls drawn.</p>
            <p><b className="negative">Bad</b> Missed field goals, turnovers.</p>
          </div>
          <p className="note">Net is good minus bad. These are event counts, not grades on individual possessions or proof that a defender caused the result.</p>
          <p className="note"><b>Detroit average: {season.teamPpp.toFixed(2)} pts/poss.</b> Blue is at or above that mark; red is below. The average covers all tracked matchups.</p>
          <div className="controls rank-controls">
            <span className="count"><b>{sampled.length}</b> of <b>{rows.length}</b> defenders · <a href="#map-h">Change sample</a></span>
            <select value={rankSort} onChange={(e) => setRankSort(e.target.value as RankSort)} aria-label="Sort defenders">
              {RANK_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <RankedList rows={sampled} teamPpp={season.teamPpp} sort={rankSort} />
        </section>
        <section className="section" aria-labelledby="top-h">
          <h2 id="top-h">Most frequent matchups</h2>
          <p className="note">Cade’s points, assists, and turnovers against his 12 most common defenders.</p>
          <TopBars rows={rows} />
        </section>
      </div>

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
          <span className="count">All tracked defenders. Select a name to open its matchup.</span>
        </div>
        <MatchupTable rows={searched} baseline={season.ptsPer100} selectedId={selected?.defId ?? null} onSelect={selectDefender} />
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

function MatchupDetail({ row, teamAverage }: { row: MatchupRow | null; teamAverage: number }) {
  const teamRate = row && row.poss > 0 ? toLine(row).teamPpp : null;
  return (
    <aside className="matchup-detail" aria-label="Selected matchup">
      <p className="kicker">Cade vs.</p>
      <div className="detail-head">
        <h3 aria-live="polite">{row?.defName ?? "No matching defender"}</h3>
        {row && <Face key={row.defId} id={row.defId} name={row.defName} size={76} />}
      </div>
      {row ? (
        <>
          <p className="detail-context">{row.team ? `${row.team} · ` : ""}{row.poss.toFixed(1)} partial poss. · {row.gp} {row.gp === 1 ? "game" : "games"}</p>
          <dl className="detail-line">
            <div><dt>Cade points</dt><dd>{row.pts}</dd></div>
            <div><dt>Field goals</dt><dd>{row.fgm}/{row.fga}</dd></div>
            <div><dt>Assists / turnovers</dt><dd>{row.ast} / {row.tov}</dd></div>
            <div><dt>Detroit pts/poss</dt><dd className={teamRate === null ? "" : teamRate >= teamAverage ? "positive" : "negative"}>{teamRate?.toFixed(2) ?? "—"}</dd></div>
          </dl>
        </>
      ) : <p className="note">Choose a defender or lower the minimum sample.</p>}
    </aside>
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
