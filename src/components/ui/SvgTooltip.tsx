export interface TooltipLine {
  text: string
  color?: string // 'r g b' → colored dot before the text
}

/**
 * A small in-SVG tooltip (dark bubble) positioned near (x, y) and clamped
 * inside the chart's viewBox width so it never clips. Shared by all charts.
 */
export default function SvgTooltip({
  x,
  y,
  width,
  title,
  lines,
}: {
  x: number
  y: number
  width: number
  title?: string
  lines: TooltipLine[]
}) {
  const pad = 8
  const lineH = 18
  const charW = 7.4
  const hasDots = lines.some((l) => l.color)
  const dotW = hasDots ? 15 : 0
  const titleH = title ? 17 : 0

  const longest = Math.max(
    title ? title.length : 0,
    ...lines.map((l) => l.text.length),
  )
  const boxW = Math.max(64, Math.min(width - 8, longest * charW + pad * 2 + dotW))
  const boxH = pad * 2 + titleH + lines.length * lineH

  let bx = x - boxW / 2
  bx = Math.max(4, Math.min(width - boxW - 4, bx))
  let by = y - boxH - 12
  if (by < 4) by = y + 14

  return (
    <g pointerEvents="none">
      <rect x={bx} y={by} width={boxW} height={boxH} rx={8} fill="rgb(var(--ink))" opacity={0.93} />
      {title && (
        <text x={bx + pad} y={by + pad + 12} fontSize="12" fontWeight="700" fill="rgb(var(--surface))">
          {title}
        </text>
      )}
      {lines.map((l, i) => {
        const ly = by + pad + titleH + i * lineH + 12
        return (
          <g key={i}>
            {l.color && <circle cx={bx + pad + 4} cy={ly - 4} r={4} fill={`rgb(${l.color})`} />}
            <text x={bx + pad + dotW} y={ly} fontSize="13" fill="rgb(var(--surface))">
              {l.text}
            </text>
          </g>
        )
      })}
    </g>
  )
}
