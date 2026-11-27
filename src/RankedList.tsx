import { useMemo } from "react";
import type { MatchupRow } from "./types";
import { rankLines, toLine, type RankSort } from "./stats";
import Face from "./Face";

interface Props {
  rows: MatchupRow[];
  teamPpp: number;
  sort: RankSort;
}

export default function RankedList({ rows, teamPpp, sort }: Props) {
  const lines = useMemo(() => rankLines(rows.map(toLine), sort), [rows, sort]);
  const maxSide = Math.max(1, ...lines.map((l) => Math.max(l.good, l.bad)));
  const tone = (v: number) => (v >= teamPpp ? "var(--good)" : "var(--bad)");

  return (
    <div className="rank">
      <div className="rank-head" aria-hidden>
        <span />
        <span />
        <span>Defender</span>
        <span>Bad plays ← → Good plays</span>
        <span>DET pts/poss</span>
        <span>Scored · Passed · TO</span>
      </div>
      <ol className="rank-list" tabIndex={0} aria-label="Scrollable defender rankings">
        {lines.length === 0 && <li className="rank-empty">No defender guarded him that much. Lower the minimum.</li>}
        {lines.map(({ row: r, good, bad, net, teamPpp: ppp }, i) => (
          <li key={r.defId} className="rank-row">
            <span className="rank-num">{i + 1}</span>
            <Face id={r.defId} name={r.defName} ring={tone(ppp)} />
            <div>
              <div className="rank-name">
                {r.defName} <span className="team">{r.team ?? ""}</span>
              </div>
              <div className="rank-sub">
                {r.poss.toFixed(1)} poss · {good} good / {bad} bad
              </div>
            </div>
            <div className="div-cell" aria-label={`${good} good plays, ${bad} bad plays, net ${net}`}>
              <div className="div-track">
                <div className="div-bad" style={{ width: `${(bad / maxSide) * 50}%` }} />
                <div className="div-good" style={{ width: `${(good / maxSide) * 50}%` }} />
                <div className="div-mid" />
              </div>
              <span className="net-val" style={{ color: net > 0 ? "var(--good)" : net < 0 ? "var(--bad)" : undefined }}>
                {net > 0 ? `+${net}` : net}
              </span>
            </div>
            <span className="team-val" style={{ color: tone(ppp) }}>
              {ppp.toFixed(2)}
              <small> DET pts/poss</small>
            </span>
            <span className="rank-acts">
              <span>Scored <b>{r.pts}</b></span>
              <span>Passed <b>{r.ast}</b></span>
              <span>TO <b>{r.tov}</b></span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
