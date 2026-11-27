import { useMemo, useState } from "react";
import type { MatchupRow } from "./types";
import { fmtPct, fmtTime, pct, per100, sortValue, type SortKey } from "./stats";

interface Props {
  rows: MatchupRow[];
  baseline: number;
  activeId: number | null;
  onActive: (id: number | null) => void;
}

const COLUMNS: { key: SortKey; label: string; title: string; numeric: boolean }[] = [
  { key: "defName", label: "Defender", title: "Defender", numeric: false },
  { key: "gp", label: "GP", title: "Games with a matchup", numeric: true },
  { key: "seconds", label: "Time", title: "Matchup time (min:sec)", numeric: true },
  { key: "poss", label: "Poss", title: "Partial possessions", numeric: true },
  { key: "pts", label: "Pts", title: "Cade's points", numeric: true },
  { key: "per100", label: "Pts/100", title: "Cade's points per 100 partial possessions", numeric: true },
  { key: "fgPct", label: "FG", title: "Field goals made/attempted and FG%", numeric: true },
  { key: "fg3Pct", label: "3P", title: "Threes made/attempted and 3P%", numeric: true },
  { key: "ast", label: "Ast", title: "Assists", numeric: true },
  { key: "tov", label: "Tov", title: "Turnovers", numeric: true },
];

export default function MatchupTable({ rows, baseline, activeId, onActive }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "poss", desc: true });

  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return cmp * dir || b.poss - a.poss;
    });
  }, [rows, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== "defName" }));

  return (
    <section className="table-wrap" aria-label="All defenders">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className={c.numeric ? "num" : undefined}
                aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}
              >
                <button type="button" title={c.title} onClick={() => toggle(c.key)}>
                  {c.label}
                  <span className="arrow" aria-hidden>
                    {sort.key === c.key ? (sort.desc ? "↓" : "↑") : ""}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const rate = per100(r.pts, r.poss);
            return (
              <tr
                key={r.defId}
                className={r.defId === activeId ? "active" : undefined}
                onMouseEnter={() => onActive(r.defId)}
                onMouseLeave={() => onActive(null)}
              >
                <td className="name">
                  {r.defName}
                  <span className="team">{r.team ?? ""}</span>
                </td>
                <td className="num">{r.gp}</td>
                <td className="num">{fmtTime(r.seconds)}</td>
                <td className="num">{r.poss.toFixed(1)}</td>
                <td className="num">{r.pts}</td>
                <td className={`num rate${rate > baseline ? " hot" : ""}`}>{rate.toFixed(0)}</td>
                <td className="num">
                  {r.fgm}/{r.fga} <span className="pct">{fmtPct(pct(r.fgm, r.fga))}</span>
                </td>
                <td className="num">
                  {r.fg3m}/{r.fg3a} <span className="pct">{fmtPct(pct(r.fg3m, r.fg3a))}</span>
                </td>
                <td className="num">{r.ast}</td>
                <td className="num">{r.tov}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
