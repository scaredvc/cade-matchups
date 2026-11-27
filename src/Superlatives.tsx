import type { MatchupRow } from "./types";
import { superlatives } from "./stats";
import Face from "./Face";

export default function Superlatives({ rows }: { rows: MatchupRow[] }) {
  return (
    <div className="supers">
      {superlatives(rows).map((s) => (
        <article key={s.id} className={`callout${s.tone ? ` ${s.tone}` : ""}`}>
          <span className="stat-label">{s.title}</span>
          <div className="callout-body">
            <Face id={s.row.defId} name={s.row.defName} size={44} />
            <div>
              <div className="callout-name">{s.row.defName}</div>
              <div className="callout-stat">{s.stat}</div>
            </div>
          </div>
          <span className="callout-rule">{s.rule}</span>
        </article>
      ))}
    </div>
  );
}
