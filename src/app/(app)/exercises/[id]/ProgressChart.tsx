"use client"

// Hand-rolled SVG line chart. Deliberately dependency-free: the dataset is one point
// per finished session (dozens at most), so a charting lib's ~90KB+ bundle is
// unjustifiable for a mobile PWA. Vector SVG also stays crisp on retina and lets each
// PR marker be a real, labelled DOM node. See issue #4 discussion.

export type ChartPoint = { date: string; value: number; isPr: boolean }

const W = 320
const H = 160
const PAD = { top: 16, right: 12, bottom: 22, left: 40 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

function label(n: number) {
  return (Math.round(n * 10) / 10).toString()
}

export function ProgressChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) return null

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const x = (i: number) =>
    points.length === 1 ? PAD.left + INNER_W / 2 : PAD.left + (i / (points.length - 1)) * INNER_W
  const y = (v: number) => PAD.top + INNER_H - ((v - min) / range) * INNER_H

  const baseline = PAD.top + INNER_H
  const polyline = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full text-primary"
      role="img"
      aria-label="Trend over time"
    >
      {/* y-axis min/max guides */}
      <line x1={PAD.left} y1={baseline} x2={W - PAD.right} y2={baseline} className="stroke-border" strokeWidth={1} />
      <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {label(max)}
      </text>
      <text x={PAD.left - 6} y={baseline} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {label(min)}
      </text>

      {points.length > 1 && (
        <polyline
          points={polyline}
          fill="none"
          className="stroke-current"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={p.isPr ? 4 : 2.5}
          className={p.isPr ? "fill-amber-500 stroke-background" : "fill-current"}
          strokeWidth={p.isPr ? 1.5 : 0}
        >
          <title>
            {p.date}: {label(p.value)}
            {p.isPr ? " (PR)" : ""}
          </title>
        </circle>
      ))}

      {/* x-axis end labels */}
      <text x={x(0)} y={H - 5} textAnchor="start" className="fill-muted-foreground text-[9px]">
        {points[0].date}
      </text>
      {points.length > 1 && (
        <text x={x(points.length - 1)} y={H - 5} textAnchor="end" className="fill-muted-foreground text-[9px]">
          {points[points.length - 1].date}
        </text>
      )}
    </svg>
  )
}
