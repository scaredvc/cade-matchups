/** One defender's season totals while credited with guarding Cade. Mirrors scripts/fetch_matchups.py. */
export interface MatchupRow {
  defId: number;
  defName: string;
  team: string | null;
  gp: number;
  seconds: number;
  /** Partial possessions: NBA tracking's share of possessions this defender was Cade's primary defender. */
  poss: number;
  pts: number;
  teamPts: number;
  ast: number;
  tov: number;
  blk: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  sfl: number;
  helpBlk: number;
}

export interface MatchupData {
  player: { id: number; name: string };
  season: string;
  seasonType: string;
  updatedAt: string;
  source: string;
  rows: MatchupRow[];
}
