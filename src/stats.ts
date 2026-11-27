import type { MatchupRow } from "./types";

/** Cade's points per 100 partial possessions against this defender. */
export const per100 = (pts: number, poss: number): number => (poss > 0 ? (pts / poss) * 100 : 0);

export const pct = (made: number, att: number): number | null => (att > 0 ? made / att : null);

export const fmtPct = (value: number | null): string =>
  value === null ? "–" : `${(value * 100).toFixed(1)}`;

export const fmtTime = (seconds: number): string => {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export interface Totals {
  defenders: number;
  poss: number;
  pts: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ast: number;
  tov: number;
}

export function totals(rows: MatchupRow[]): Totals {
  const t: Totals = { defenders: rows.length, poss: 0, pts: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ast: 0, tov: 0 };
  for (const r of rows) {
    t.poss += r.poss;
    t.pts += r.pts;
    t.fgm += r.fgm;
    t.fga += r.fga;
    t.fg3m += r.fg3m;
    t.fg3a += r.fg3a;
    t.ast += r.ast;
    t.tov += r.tov;
  }
  return t;
}

export type SortKey = "defName" | "gp" | "seconds" | "poss" | "pts" | "per100" | "fgPct" | "fg3Pct" | "ast" | "tov";

export function sortValue(row: MatchupRow, key: SortKey): number | string {
  switch (key) {
    case "defName":
      return row.defName;
    case "per100":
      return per100(row.pts, row.poss);
    case "fgPct":
      return pct(row.fgm, row.fga) ?? -1;
    case "fg3Pct":
      return pct(row.fg3m, row.fg3a) ?? -1;
    default:
      return row[key];
  }
}
