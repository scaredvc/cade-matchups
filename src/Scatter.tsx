import type { MatchupRow } from "./types";
import { per100 } from "./stats";
import { useWidth } from "./useWidth";

interface Props {
  rows: MatchupRow[];
  baseline: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const PAD = { top: 25, right: 18, bottom: 44, left: 42 };
const niceMax = (value: number, step: number) => Math.max(step, Math.ceil(value / step) * step);

export default function Scatter({ rows, baseline, selectedId, onSelect }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(300);
  const height = width < 460 ? 230 : 332;
  const xMax = niceMax(Math.max(0, ...rows.map((r) => r.poss)), 10);
  const yMax = niceMax(Math.max(baseline, ...rows.map((r) => per100(r.pts, r.poss))), 25);
  const x = (v: number) => PAD.left + v / xMax * (width - PAD.left - PAD.right);
  const y = (v: number) => height - PAD.bottom - v / yMax * (height - PAD.top - PAD.bottom);
  const xStep = xMax > 80 || width < 350 ? 20 : 10;
  const yStep = yMax > 125 ? yMax / 5 : 25;
  const xTicks = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, i) => i * xStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);
  const picked = rows.find((r) => r.defId === selectedId);
  const points = picked ? [...rows.filter((r) => r !== picked), picked] : rows;

  return (
    <div ref={ref} className="chart-frame matchup-chart">
      {rows.length === 0 ? (
        <p className="empty">No matchups have enough possessions for this view.</p>
      ) : (
        <svg width={width} height={height} role="group" aria-label="Cade’s scoring rate and partial possessions" aria-description="Use the arrow keys to move between defenders, or choose one from the dropdown.">
          {yTicks.map((t) => (
            <g key={t} aria-hidden="true">
              <line className="grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="tick" x={PAD.left - 9} y={y(t)} dy="0.32em" textAnchor="end">{t}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={t} aria-hidden="true">
              <line className="grid" x1={x(t)} x2={x(t)} y1={PAD.top} y2={height - PAD.bottom} />
              <text className="tick" x={x(t)} y={height - PAD.bottom + 18} textAnchor="middle">{t}</text>
            </g>
          ))}
          <text className="axis" x={PAD.left} y={14}>Cade pts / 100</text>
          <text className="axis" x={width - PAD.right} y={height - 5} textAnchor="end">Partial possessions →</text>
          <line className="baseline" x1={PAD.left} x2={width - PAD.right} y1={y(baseline)} y2={y(baseline)} />
          {points.map((r) => {
            const rate = per100(r.pts, r.poss);
            const isSelected = r === picked;
            const cx = x(r.poss);
            const cy = y(rate);
            const rightEdge = cx > width * 0.68;
            return (
              <g
                key={r.defId}
                className={`pt${isSelected ? " active" : ""}`}
                onClick={() => onSelect(r.defId)}
                role="button"
                aria-pressed={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r.defId);
                    return;
                  }
                  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                  e.preventDefault();
                  const svg = e.currentTarget.ownerSVGElement;
                  const offset = e.key === "ArrowLeft" ? -1 : 1;
                  const next = rows[(rows.indexOf(r) + offset + rows.length) % rows.length];
                  if (next) {
                    onSelect(next.defId);
                    requestAnimationFrame(() => svg?.querySelector<SVGGElement>('.pt[aria-pressed="true"]')?.focus());
                  }
                }}
                aria-label={`${r.defName}: ${r.poss.toFixed(1)} partial possessions, ${rate.toFixed(1)} points per 100`}
              >
                <circle className="pt-target" cx={cx} cy={cy} r={10} />
                <circle className="pt-dot" cx={cx} cy={cy} r={isSelected ? 6 : 4} />
                {isSelected && (
                  <text className="pt-label" x={cx + (rightEdge ? -10 : 10)} y={cy < PAD.top + 10 ? cy + 17 : cy - 10} textAnchor={rightEdge ? "end" : "start"}>
                    {width < 460 ? r.defName.split(" ").at(-1) : r.defName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
