import { useMemo, useState } from "react";
import type { MatchupRow } from "./types";
import { fmtPct, fmtTime, pct, per100, sortValue, type SortKey } from "./stats";

interface Props {
  rows: MatchupRow[];
  baseline: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const COLUMNS: { key: SortKey; label: string; title: string; numeric: boolean }[] = [
  { key: "defName", label: "Defender", title: "Defender", numeric: false },
  { key: "gp", label: "GP", title: "Games with a matchup", numeric: true },
  { key: "seconds", label: "Time", title: "Matchup time (min:sec)", numeric: true },
  { key: "poss", label: "Poss", title: "Partial possessions", numeric: true },
  { key: "pts", label: "Pts", title: "Cade's points (scored)", numeric: true },
  { key: "per100", label: "Pts/100", title: "Cade's points per 100 partial possessions", numeric: true },
  { key: "fgPct", label: "FG", title: "Field goals made/attempted and FG%", numeric: true },
  { key: "fg3Pct", label: "3P", title: "Threes made/attempted and 3P%", numeric: true },
  { key: "ftm", label: "FT", title: "Free throws made/attempted", numeric: true },
  { key: "ast", label: "Ast", title: "Assists (passed)", numeric: true },
  { key: "tov", label: "Tov", title: "Turnovers", numeric: true },
  { key: "blk", label: "Blk", title: "Cade's shots blocked by this defender", numeric: true },
];

export default function MatchupTable({ rows, baseline, selectedId, onSelect }: Props) {
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
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable matchup table">
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
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="empty-row">
                No defenders match this filter.
              </td>
            </tr>
          )}
          {sorted.map((r) => {
            const rate = per100(r.pts, r.poss);
            return (
              <tr key={r.defId} className={r.defId === selectedId ? "active" : undefined}>
                <td className="name">
                  <a href="#map-h" onClick={() => onSelect(r.defId)} title="Show on the matchup map">{r.defName}</a>
                  <span className="team">{r.team ?? ""}</span>
                </td>
                <td className="num">{r.gp}</td>
                <td className="num">{fmtTime(r.seconds)}</td>
                <td className="num">{r.poss.toFixed(1)}</td>
                <td className="num">{r.pts}</td>
                <td className={`num rate${rate > baseline ? " hot" : ""}`}>{rate.toFixed(0)}</td>
                <td className="num">
                  {r.fgm}-{r.fga} <span className="pct">{fmtPct(pct(r.fgm, r.fga))}</span>
                </td>
                <td className="num">
                  {r.fg3m}-{r.fg3a} <span className="pct">{fmtPct(pct(r.fg3m, r.fg3a))}</span>
                </td>
                <td className="num">
                  {r.ftm}-{r.fta}
                </td>
                <td className="num">{r.ast}</td>
                <td className="num">{r.tov}</td>
                <td className="num">{r.blk}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
