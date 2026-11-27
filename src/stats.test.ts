// Run: node src/stats.test.ts  (Node 22.18+ strips the types)
import assert from "node:assert/strict";
import { extremes, rankLines, summarize, superlatives, toLine } from "./stats.ts";
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

// Superlatives: each title goes to the category leader among eligible defenders.
const sup = superlatives([
  row(10, 30, { pts: 9, fga: 8, fg3a: 1, fgm: 4, ast: 2, fta: 2, teamPts: 30 }), // 7/8 shots are 2s
  row(11, 12, { pts: 6, fga: 6, fg3a: 5, fg3m: 2, fgm: 2, ast: 6, tov: 3, teamPts: 6 }), // 3s, assists, TOs
  row(12, 4, { pts: 20, fga: 9, fg3a: 0, fgm: 9, fta: 9, teamPts: 25 }), // most points, but too few poss. for rates
]);
const byId = Object.fromEntries(sup.map((s) => [s.id, s.row.defId]));
assert.equal(byId.cooked, 12, "total points has no possession floor");
assert.equal(byId.inside, 12, "9/9 twos beats 7/8");
assert.equal(byId.deep, 11);
assert.equal(byId.table, 11);
assert.equal(byId.line, 10, "defender 12 has the FT rate but only 4 poss.");
assert.equal(byId.hawk, 11);
assert.equal(byId.feast, 10, "1.00 pts/poss beats 0.50");
assert.equal(byId.shutdown, 11);
assert.equal(sup.find((s) => s.id === "inside")?.stat, "9 of 9 shots were 2s (9/9 made)");
assert.deepEqual(superlatives([]), [], "no rows, no titles");
assert.deepEqual(
  superlatives([row(20, 3, { pts: 2 })]).map((s) => s.id),
  ["cooked"],
  "categories nobody qualifies for are skipped",
);

console.log("ok");
