import { useEffect, useRef, useState } from "react";
import type { MatchupRow } from "./types";
import { per100 } from "./stats";

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = width < 560 ? 320 : 400;
  const xMax = niceMax(Math.max(0, ...rows.map((r) => r.poss)), 10);
  const yMax = niceMax(Math.max(baseline, ...rows.map((r) => per100(r.pts, r.poss))), 25);
  const x = (v: number) => PAD.left + (v / xMax) * (width - PAD.left - PAD.right);
  const y = (v: number) => height - PAD.bottom - (v / yMax) * (height - PAD.top - PAD.bottom);
  const xTicks = Array.from({ length: xMax / 10 + 1 }, (_, i) => i * 10).filter((t, _, all) => all.length <= 8 || t % 20 === 0);
  const yTicks = Array.from({ length: yMax / 25 + 1 }, (_, i) => i * 25);
  const labelled = new Set([...rows].sort((a, b) => b.poss - a.poss).slice(0, LABEL_COUNT).map((r) => r.defId));
  const active = rows.find((r) => r.defId === activeId) ?? null;

  return (
    <section className="chart" aria-label="Scatter plot of possessions against Cade's points per 100 possessions">
      <div className="chart-head">
        <h2>Volume vs. damage</h2>
        <p>
          Right means the defender saw Cade more. Up means Cade scored more efficiently.{" "}
          <span className="legend-hot">Red</span> dots are above his season rate of {baseline.toFixed(1)}.
        </p>
      </div>
      <div ref={wrapRef} className="chart-frame">
        {rows.length === 0 ? (
          <p className="empty">No defenders match these filters.</p>
        ) : (
          <svg width={width} height={height} role="img" onMouseLeave={() => onActive(null)}>
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
              const hot = rate > baseline;
              const isActive = r.defId === activeId;
              return (
                <g
                  key={r.defId}
                  className={`pt${hot ? " hot" : ""}${isActive ? " active" : ""}`}
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
            <span>{active.team ?? "—"} · {active.gp} GP</span>
            <span>
              {active.pts} pts on {active.poss.toFixed(1)} poss · {per100(active.pts, active.poss).toFixed(0)} / 100
            </span>
            <span>
              {active.fgm}/{active.fga} FG · {active.fg3m}/{active.fg3a} 3P · {active.ast} AST · {active.tov} TOV
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
