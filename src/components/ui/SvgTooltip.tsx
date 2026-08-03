export interface TooltipLine {
  text: string
  color?: string // 'r g b' → colored dot before the text
}

/**
 * Chart tooltip rendered as an HTML overlay (not inside the SVG), so the text
 * stays at native pixel size and fully readable even when the chart's viewBox
 * is scaled down on small screens. Position is given in percentages of the
 * chart area; the parent must be `position: relative`.
 */
export default function ChartTooltip({
  xPct,
  yPct,
  title,
  lines,
}: {
  xPct: number // 0–100, horizontal anchor within the chart
  yPct: number // 0–100, vertical anchor (tooltip sits above this point)
  title?: string
  lines: TooltipLine[]
}) {
  // near the edges, grow inward instead of centering (so we never clip)
  const align: 'start' | 'center' | 'end' =
    xPct < 22 ? 'start' : xPct > 78 ? 'end' : 'center'
  const translateX =
    align === 'center' ? '-50%' : align === 'start' ? '0%' : '-100%'
  // above the point when there's room, below it otherwise
  const above = yPct > 38

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(${translateX}, ${above ? 'calc(-100% - 10px)' : '10px'})`,
      }}
    >
      <div
        className="rounded-xl px-3 py-2 shadow-pop whitespace-nowrap"
        style={{ background: 'rgb(var(--ink) / 0.94)', color: 'rgb(var(--surface))' }}
      >
        {title && (
          <div className="text-xs font-semibold opacity-75 mb-0.5">{title}</div>
        )}
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5 text-sm font-bold leading-snug">
            {l.color && (
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: `rgb(${l.color})` }}
              />
            )}
            <span>{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
