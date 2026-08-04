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

/* --- header utility icons --- */

/** מדריך — a help circle */
export function IconHelp({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.4 2.4 0 1 1 3.5 2.2c-.8.5-1.1 1-1.1 1.9" />
      <path d="M12 16.6h.01" />
    </svg>
  )
}

/** מצב בהיר — a sun */
export function IconSun({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  )
}

/** מצב כהה — a moon */
export function IconMoon({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

/** גיבוי וסנכרון — a cloud */
export function IconCloud({ className }: IconProps) {
  return (
    <svg className={className} {...svg}>
      <path d="M17.5 18.5H7a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.4 1.6 3.7 3.7 0 0 1-.4 7.4Z" />
    </svg>
  )
}
