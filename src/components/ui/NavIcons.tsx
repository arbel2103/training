/** Clean, classic line icons for the four main sections.
 *  Stroke uses currentColor so they inherit the nav's active/idle text color. */
type IconProps = { className?: string }

const svg = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

/** היום — a house */
export function IconToday({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <path d="M4 11.4 12 4.5l8 6.9" />
      <path d="M6 10v9.2a.8.8 0 0 0 .8.8h10.4a.8.8 0 0 0 .8-.8V10" />
      <path d="M10 20.2V15h4v5.2" />
    </svg>
  )
}

/** תוכנית — a clipboard with list lines */
export function IconProgram({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <rect x="5" y="5" width="14" height="15" rx="2.6" />
      <rect x="9" y="3" width="6" height="3.6" rx="1.3" />
      <path d="M9 11.5h6" />
      <path d="M9 15.5h4" />
    </svg>
  )
}

/** יומן — a calendar */
export function IconCalendar({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <rect x="4.3" y="6" width="15.4" height="14" rx="2.6" />
      <path d="M4.3 10.2h15.4" />
      <path d="M8.5 4v3.6" />
      <path d="M15.5 4v3.6" />
    </svg>
  )
}

/** בריאות — a heartbeat / pulse line */
export function IconHealth({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <path d="M3 12.5h4l2-5.5 3.2 10.5 2.4-7 1.6 2h4.8" />
    </svg>
  )
}
