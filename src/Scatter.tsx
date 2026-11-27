import type { MatchupRow } from "./types";
import { per100 } from "./stats";
import { useWidth } from "./useWidth";

interface Props {
  rows: MatchupRow[];
  baseline: number;
  activeId: number | null;
  onActive: (id: number | null) => void;
}

const PAD = { top: 28, right: 24, bottom: 44, left: 52 };
const LABEL_COUNT = 6;
const TIP_WIDTH = 250;

function niceMax(value: number, step: number): number {
  return Math.max(step, Math.ceil(value / step) * step);
}

export default function Scatter({ rows, baseline, activeId, onActive }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = width < 560 ? 320 : 400;
  const xMax = niceMax(Math.max(0, ...rows.map((r) => r.poss)), 10);
  const yMax = niceMax(Math.max(baseline, ...rows.map((r) => per100(r.pts, r.poss))), 25);
  const x = (v: number) => PAD.left + (v / xMax) * (width - PAD.left - PAD.right);
  const y = (v: number) => height - PAD.bottom - (v / yMax) * (height - PAD.top - PAD.bottom);
  const xStep = xMax > 80 ? 20 : 10;
  const yStep = yMax > 200 ? 50 : 25;
  const xTicks = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, i) => i * xStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);
  const labelled = new Set([...rows].sort((a, b) => b.poss - a.poss).slice(0, LABEL_COUNT).map((r) => r.defId));
  const active = rows.find((r) => r.defId === activeId) ?? null;

  return (
    <div className="panel">
      <div ref={ref} className="chart-frame">
        {rows.length === 0 ? (
          <p className="empty">No defenders match these filters.</p>
        ) : (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label="Scatter plot of possessions against Cade's points per 100 possessions"
            onMouseLeave={() => onActive(null)}
          >
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line className="grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
                <text className="tick" x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={`x${t}`} className="tick" x={x(t)} y={height - PAD.bottom + 20} textAnchor="middle">
                {t}
              </text>
            ))}
            <text className="axis" x={width - PAD.right} y={height - 6} textAnchor="end">
              partial possessions →
            </text>
            <text className="axis" x={PAD.left - 44} y={PAD.top - 12}>
              ↑ Cade pts / 100
            </text>
            <line className="baseline" x1={PAD.left} x2={width - PAD.right} y1={y(baseline)} y2={y(baseline)} />
            <text className="baseline-label" x={width - PAD.right} y={y(baseline) - 7} textAnchor="end">
              season rate {baseline.toFixed(1)}
            </text>
            {rows.map((r) => {
              const rate = per100(r.pts, r.poss);
              const isActive = r.defId === activeId;
              return (
                <g
                  key={r.defId}
                  className={`pt${rate > baseline ? " hot" : ""}${isActive ? " active" : ""}`}
                  onMouseEnter={() => onActive(r.defId)}
                  onFocus={() => onActive(r.defId)}
                  onBlur={() => onActive(null)}
                  tabIndex={0}
                  aria-label={`${r.defName}: ${r.poss.toFixed(1)} possessions, ${rate.toFixed(0)} points per 100`}
                >
                  <circle cx={x(r.poss)} cy={y(rate)} r={isActive ? 7 : 4 + Math.min(4, r.fga / 6)} />
                  {(labelled.has(r.defId) || isActive) && (
                    <text className="pt-label" x={x(r.poss) + 9} y={y(rate)} dy="0.32em">
                      {r.defName.split(" ").slice(-1)[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {active && (
          <div
            className="tip"
            style={{
              left: x(active.poss) + 14 + TIP_WIDTH > width ? Math.max(0, x(active.poss) - 14 - TIP_WIDTH) : x(active.poss) + 14,
              top: Math.max(0, y(per100(active.pts, active.poss)) - 70),
            }}
          >
            <strong>{active.defName}</strong>
            <span>
              {active.team ?? "—"} · {active.gp} GP
            </span>
            <span>
              {active.pts} pts on {active.poss.toFixed(1)} poss · {per100(active.pts, active.poss).toFixed(0)} / 100
            </span>
            <span>
              {active.fgm}/{active.fga} FG · {active.fg3m}/{active.fg3a} 3P · {active.ast} AST · {active.tov} TOV
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
