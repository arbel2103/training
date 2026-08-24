/**
 * The chart colours, as CSS variable references.
 *
 * Every chart in every app draws from this one sequence, so a new series
 * anywhere lands on a colour that already belongs to the page. Kept as
 * `var(...)` strings rather than hex so a change to the palette moves the
 * charts too — SVG `fill`/`stroke` resolve CSS variables, which is what both
 * the hand-rolled charts and Recharts end up writing.
 */
export const CHART_COLORS: string[] = [
  'rgb(var(--chart-1))',
  'rgb(var(--chart-2))',
  'rgb(var(--chart-3))',
  'rgb(var(--chart-4))',
  'rgb(var(--chart-5))',
  'rgb(var(--chart-6))',
  'rgb(var(--chart-7))',
  'rgb(var(--chart-8))',
]

/** The colour for series `i`, wrapping round for long lists. */
export const chartColor = (i: number): string =>
  CHART_COLORS[((i % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length]

/**
 * Tooltip chrome shared by every Recharts surface.
 *
 * The old one was a near-black panel left over from when the app had a dark
 * theme; on a light page it arrived as dark text on a dark box and could not
 * be read at all. This is a white card with the app's own ink, matching every
 * other panel.
 */
export const TOOLTIP_STYLE = {
  border: '1px solid rgb(var(--line))',
  background: 'rgb(var(--surface))',
  color: 'rgb(var(--ink))',
  borderRadius: 14,
  boxShadow: '0 18px 40px -26px rgba(30, 60, 42, 0.45)',
} as const

/** The tooltip's title line — muted, so the values below it lead. */
export const TOOLTIP_LABEL_STYLE = {
  color: 'rgb(var(--muted))',
  fontWeight: 600,
  marginBottom: 2,
} as const

/** Muted ink for axis ticks, so charts follow the page rather than fight it. */
export const AXIS_TICK = 'rgb(var(--muted))'
