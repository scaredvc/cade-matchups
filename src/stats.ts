import type { MatchupRow } from "./types";

/** Cade's points per 100 partial possessions. */
export const per100 = (pts: number, poss: number): number => (poss > 0 ? (pts / poss) * 100 : 0);

export const pct = (made: number, att: number): number | null => (att > 0 ? made / att : null);

export const fmtPct = (value: number | null, suffix = ""): string =>
  value === null ? "–" : `${(value * 100).toFixed(1)}${suffix}`;

export const fmtTime = (seconds: number): string => {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const headshotUrl = (playerId: number): string => `${import.meta.env.BASE_URL}headshots/${playerId}.png`;

export interface Summary {
  defenders: number;
  poss: number;
  pts: number;
  teamPts: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ast: number;
  tov: number;
  /** Cade's points per 100 partial possessions across every matchup. */
  ptsPer100: number;
  /** Detroit's points per partial possession across every matchup. */
  teamPpp: number;
}

export function summarize(rows: MatchupRow[]): Summary {
  const s = { defenders: rows.length, poss: 0, pts: 0, teamPts: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ast: 0, tov: 0 };
  for (const r of rows) {
    s.poss += r.poss;
    s.pts += r.pts;
    s.teamPts += r.teamPts;
    s.fgm += r.fgm;
    s.fga += r.fga;
    s.fg3m += r.fg3m;
    s.fg3a += r.fg3a;
    s.ast += r.ast;
    s.tov += r.tov;
  }
  return { ...s, ptsPer100: per100(s.pts, s.poss), teamPpp: s.poss > 0 ? s.teamPts / s.poss : 0 };
}

/**
 * One defender's matchup scored as plays. Good: made shots, assists, shooting fouls drawn.
 * Bad: missed shots and turnovers. Net is good minus bad.
 */
export interface DefenderLine {
  row: MatchupRow;
  good: number;
  bad: number;
  net: number;
  /** Detroit's points per partial possession while this defender was on Cade. */
  teamPpp: number;
}

export function toLine(row: MatchupRow): DefenderLine {
  const good = row.fgm + row.ast + row.sfl;
  const bad = row.fga - row.fgm + row.tov;
  return { row, good, bad, net: good - bad, teamPpp: row.poss > 0 ? row.teamPts / row.poss : 0 };
}

export type RankSort = "poss" | "netAsc" | "netDesc" | "teamAsc" | "teamDesc";

export const RANK_SORTS: { value: RankSort; label: string }[] = [
  { value: "poss", label: "Most guarded first" },
  { value: "netAsc", label: "Most disruptive defenders" },
  { value: "netDesc", label: "Cade won the most plays" },
  { value: "teamAsc", label: "Worst Detroit offense" },
  { value: "teamDesc", label: "Best Detroit offense" },
];

export function rankLines(lines: DefenderLine[], sort: RankSort): DefenderLine[] {
  const byPoss = (a: DefenderLine, b: DefenderLine) => b.row.poss - a.row.poss;
  const cmp: Record<RankSort, (a: DefenderLine, b: DefenderLine) => number> = {
    poss: byPoss,
    netAsc: (a, b) => a.net - b.net || byPoss(a, b),
    netDesc: (a, b) => b.net - a.net || byPoss(a, b),
    teamAsc: (a, b) => a.teamPpp - b.teamPpp || byPoss(a, b),
    teamDesc: (a, b) => b.teamPpp - a.teamPpp || byPoss(a, b),
  };
  return [...lines].sort(cmp[sort]);
}

export interface Extremes {
  /** Lowest Cade FG% among defenders with enough possessions and at least one shot. */
  toughest: MatchupRow | null;
  favorite: MatchupRow | null;
  mostSeen: MatchupRow | null;
}

export const EXTREME_MIN_POSS = 8;
/** A single shot is not a matchup read: FG% extremes need this many attempts. */
export const EXTREME_MIN_FGA = 4;

export function extremes(rows: MatchupRow[], minPoss = EXTREME_MIN_POSS, minFga = EXTREME_MIN_FGA): Extremes {
  const fg = (r: MatchupRow) => r.fgm / r.fga;
  const sample = rows
    .filter((r) => r.poss >= minPoss && r.fga >= minFga)
    .sort((a, b) => fg(a) - fg(b) || b.poss - a.poss);
  const byPoss = [...rows].sort((a, b) => b.poss - a.poss);
  return {
    toughest: sample[0] ?? null,
    favorite: sample.length > 1 ? sample[sample.length - 1]! : null,
    mostSeen: byPoss[0] ?? null,
  };
}

export type SortKey =
  | "defName" | "gp" | "seconds" | "poss" | "pts" | "per100" | "fgPct" | "fg3Pct" | "ftm" | "ast" | "tov" | "blk";

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
