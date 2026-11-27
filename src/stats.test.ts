// Run: node src/stats.test.ts  (Node 22.18+ strips the types)
import assert from "node:assert/strict";
import { extremes, rankLines, summarize, toLine } from "./stats.ts";
import type { MatchupRow } from "./types.ts";

const row = (defId: number, poss: number, o: Partial<MatchupRow> = {}): MatchupRow => ({
  defId, defName: `D${defId}`, team: null, gp: 1, seconds: 60, poss, pts: 0, teamPts: 0,
  ast: 0, tov: 0, blk: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, sfl: 0, helpBlk: 0, ...o,
});

// Davion Mitchell's real line: 3/5 FG, 8 AST, 0 TOV, 3 shooting fouls, 57 team pts on 57.6 poss.
const mitchell = toLine(row(1, 57.6, { fgm: 3, fga: 5, ast: 8, tov: 0, sfl: 3, teamPts: 57 }));
assert.equal(mitchell.good, 14);
assert.equal(mitchell.bad, 2);
assert.equal(mitchell.net, 12);
assert.equal(mitchell.teamPpp.toFixed(2), "0.99");

const s = summarize([row(1, 10, { pts: 5, teamPts: 12, fgm: 2, fga: 4 }), row(2, 30, { pts: 15, teamPts: 28 })]);
assert.equal(s.poss, 40);
assert.equal(s.ptsPer100, 50);
assert.equal(s.teamPpp, 1);

const rows = [
  row(1, 20, { fgm: 1, fga: 5 }),  // 20% -> toughest
  row(2, 9, { fgm: 4, fga: 5 }),   // 80% -> favorite
  row(3, 30, { fgm: 0, fga: 0 }),  // no shots: never toughest, but most seen
  row(4, 3, { fgm: 0, fga: 4 }),   // under 8 poss: excluded
  row(5, 25, { fgm: 0, fga: 1 }),  // one shot: excluded from FG% extremes
];
const e = extremes(rows);
assert.equal(e.toughest?.defId, 1);
assert.equal(e.favorite?.defId, 2);
assert.equal(e.mostSeen?.defId, 3);
assert.deepEqual(extremes([]), { toughest: null, favorite: null, mostSeen: null });

const lines = rows.slice(0, 4).map(toLine);
assert.deepEqual(rankLines(lines, "poss").map((l) => l.row.defId), [3, 1, 2, 4]);
// net: D4 0-for-4 = -4, D1 1-for-5 = -3, D3 no shots = 0, D2 4-for-5 = +3
assert.deepEqual(rankLines(lines, "netAsc").map((l) => l.row.defId), [4, 1, 3, 2]);

console.log("ok");
