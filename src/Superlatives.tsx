import type { MatchupRow } from "./types";
import { superlatives } from "./stats";
import Face from "./Face";

export default function Superlatives({ rows }: { rows: MatchupRow[] }) {
  return (
    <ul className="supers" aria-label="Category leaders">
      {superlatives(rows).map((s) => (
        <li key={s.id} className="award">
          <Face id={s.row.defId} name={s.row.defName} size={40} />
          <div>
            <h3 className="award-title">{s.title}</h3>
            <div className="award-name">{s.row.defName}</div>
            <div className="award-stat">{s.stat}</div>
            <div className="award-rule">{s.rule}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
