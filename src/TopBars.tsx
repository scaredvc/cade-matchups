import { useState } from "react";
import type { MatchupRow } from "./types";
import { useWidth } from "./useWidth";

const METRICS = [
  { key: "pts", label: "Scored (PTS)", color: "var(--good)" },
  { key: "ast", label: "Passed (AST)", color: "var(--stone)" },
  { key: "tov", label: "Turned over (TOV)", color: "var(--bad)" },
] as const;

const ROW_H = 54;
const BAR_H = 12;
const BAR_GAP = 3;

export default function TopBars({ rows }: { rows: MatchupRow[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const top = [...rows].sort((a, b) => b.poss - a.poss).slice(0, 12);
  const left = width < 560 ? 108 : 150;
  const right = 36;
  const max = Math.max(1, ...top.flatMap((r) => [r.pts, r.ast, r.tov]));
  const x = (v: number) => (v / max) * (width - left - right);
  const height = top.length * ROW_H + 10;

  return (
    <div className="panel">
      <div className="legend">
        {METRICS.map((m) => (
          <span key={m.key}>
            <i style={{ background: m.color }} />
            {m.label}
          </span>
        ))}
      </div>
      <div ref={ref} className="chart-frame">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Points, assists and turnovers for the twelve defenders who guarded Cade the most"
          onMouseLeave={() => setTip(null)}
        >
          {top.map((r, i) => (
            <g key={r.defId} transform={`translate(${left},${i * ROW_H + 5})`}>
              <text className="bar-name" x={-12} y={ROW_H / 2 - 2} textAnchor="end" dominantBaseline="middle">
                {width < 560 ? r.defName.split(" ").slice(-1)[0] : r.defName}
              </text>
              {METRICS.map((m, mi) => {
                const v = r[m.key];
                const y = mi * (BAR_H + BAR_GAP) + 4;
                return (
                  <g key={m.key}>
                    <rect
                      x={0}
                      y={y}
                      width={Math.max(x(v), 1.5)}
                      height={BAR_H}
                      rx={2}
                      fill={m.color}
                      fillOpacity={0.8}
                      onMouseMove={(e) => {
                        const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                        setTip({ x: e.clientX - box.left, y: e.clientY - box.top, text: `${r.defName} · ${m.label}: ${v}` });
                      }}
                    />
                    <text className="tick" x={x(v) + 6} y={y + BAR_H / 2} dominantBaseline="middle">
                      {v}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
        {tip && (
          <div className="tip small" style={{ left: Math.min(tip.x + 14, width - 220), top: Math.max(0, tip.y - 36) }}>
            {tip.text}
          </div>
        )}
      </div>
    </div>
  );
}
