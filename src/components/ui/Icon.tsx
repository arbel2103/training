import type { ReactNode } from 'react'

/**
 * One clean, classic line-icon set for the whole app — replaces the emoji.
 * Stroke uses currentColor so icons inherit text color; size via className.
 */
export type IconName =
  | 'swim'
  | 'bike'
  | 'run'
  | 'strength'
  | 'other'
  | 'steps'
  | 'moon'
  | 'heart'
  | 'hrv'
  | 'lungs'
  | 'brain'
  | 'bulb'
  | 'flag'
  | 'watch'
  | 'chat'
  | 'gear'
  | 'chart'
  | 'trendUp'
  | 'trendDown'
  | 'clipboard'
  | 'calendar'
  | 'health'
  | 'scale'
  | 'home'
  | 'help'
  | 'trash'
  | 'edit'
  | 'link'
  | 'plug'
  | 'refresh'
  | 'upload'
  | 'download'
  | 'save'
  | 'folder'
  | 'attach'
  | 'bell'
  | 'user'
  | 'clock'
  | 'timer'
  | 'warning'
  | 'checkCircle'
  | 'check'
  | 'cloud'
  | 'sun'
  | 'party'

const PATHS: Record<IconName, ReactNode> = {
  swim: (
    <>
      <path d="M2 7c1.2 0 1.8-1 3-1s1.8 1 3 1 1.8-1 3-1 1.8 1 3 1 1.8-1 3-1 1.8 1 3 1" />
      <path d="M2 12c1.2 0 1.8-1 3-1s1.8 1 3 1 1.8-1 3-1 1.8 1 3 1 1.8-1 3-1 1.8 1 3 1" />
      <path d="M2 17c1.2 0 1.8-1 3-1s1.8 1 3 1 1.8-1 3-1 1.8 1 3 1 1.8-1 3-1 1.8 1 3 1" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </>
  ),
  run: (
    <>
      <path d="M4 16v-2.4C4 11.5 3 10.6 3 8.4 3 5.7 4.4 2.5 7.4 2.5c1.9 0 2.5 1.8 2.5 3.5 0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-3.9 0Z" />
      <path d="M20 20v-2.4c0-2.1 1-3 1-5.2 0-2.7-1.4-5.9-4.4-5.9-1.9 0-2.5 1.8-2.5 3.5 0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 3.9 0Z" />
    </>
  ),
  strength: (
    <>
      <path d="M14.4 14.4 9.6 9.6" />
      <path d="M18.7 21a2 2 0 0 1-2.8 0l-1.4-1.4a2 2 0 0 1 0-2.8l2.8-2.8a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8Z" />
      <path d="M21.5 21.5 20 20" />
      <path d="M2.5 2.5 4 4" />
      <path d="M9.4 5.3a2 2 0 0 0-2.8 0L3.8 8.1a2 2 0 0 0 0 2.8l1.4 1.4a2 2 0 0 0 2.8 0L10.7 9.5a2 2 0 0 0 0-2.8Z" />
    </>
  ),
  other: (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z" />
    </>
  ),
  steps: (
    <path d="M2 17.5h13c1 0 3.5-.4 5.2-1.4 1-.6.8-2-.4-2.5L14 11c-1-.4-1.8-1.2-2.2-2.2l-.9-2c-.4-.8-1.5-.8-1.8 0L8 10c-.3.9-1.1 1.5-2 1.5H4a2 2 0 0 0-2 2v4Z" />
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  hrv: <path d="M3 12.5h4l2-5.5 3.2 10.5 2.4-7 1.6 2h4.8" />,
  lungs: (
    <>
      <path d="M12 4v8" />
      <path d="M12 12c0-1.5-1-2.5-2.5-2.5S7 8.5 7 6.8" />
      <path d="M12 12c0-1.5 1-2.5 2.5-2.5S17 8.5 17 6.8" />
      <path d="M8.4 12.4c0 2.8-.5 5.4-2.7 6.8-1.4.9-3.2.2-3.5-1.4-.4-2.2-.2-4.6.8-6.6.6-1.2 2-1.7 3.2-1.2l1.4.6c.5.2.8.7.8 1.2Z" />
      <path d="M15.6 12.4c0 2.8.5 5.4 2.7 6.8 1.4.9 3.2.2 3.5-1.4.4-2.2.2-4.6-.8-6.6-.6-1.2-2-1.7-3.2-1.2l-1.4.6c-.5.2-.8.7-.8 1.2Z" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4A2.5 2.5 0 0 0 7 6.5 2.5 2.5 0 0 0 4.5 9 2.5 2.5 0 0 0 6 13.5V16a2.5 2.5 0 0 0 3.5 2.3" />
      <path d="M14.5 4A2.5 2.5 0 0 1 17 6.5 2.5 2.5 0 0 1 19.5 9 2.5 2.5 0 0 1 18 13.5V16a2.5 2.5 0 0 1-3.5 2.3" />
      <path d="M12 4.5v14" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 18h5" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-1.5 3.5L16 11H5" />
    </>
  ),
  watch: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M8.5 6.8 8 3h8l-.5 3.8" />
      <path d="M8.5 17.2 8 21h8l-.5-3.8" />
    </>
  ),
  chat: (
    <path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <rect x="7" y="12" width="2.6" height="6" rx="0.6" />
      <rect x="11.5" y="9" width="2.6" height="9" rx="0.6" />
      <rect x="16" y="6" width="2.6" height="12" rx="0.6" />
    </>
  ),
  trendUp: (
    <>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  trendDown: (
    <>
      <path d="M3 7 9 13l4-4 8 8" />
      <path d="M15 17h6v-6" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="5" width="14" height="15" rx="2.6" />
      <rect x="9" y="3" width="6" height="3.6" rx="1.3" />
      <path d="M9 11.5h6" />
      <path d="M9 15.5h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4.3" y="6" width="15.4" height="14" rx="2.6" />
      <path d="M4.3 10.2h15.4" />
      <path d="M8.5 4v3.6" />
      <path d="M15.5 4v3.6" />
    </>
  ),
  health: <path d="M3 12.5h4l2-5.5 3.2 10.5 2.4-7 1.6 2h4.8" />,
  scale: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8.5v2" />
      <path d="M9 8.8a3 3 0 0 1 6 0" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.4 12 4.5l8 6.9" />
      <path d="M6 10v9.2a.8.8 0 0 0 .8.8h10.4a.8.8 0 0 0 .8-.8V10" />
      <path d="M10 20.2V15h4v5.2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.4 2.4 0 1 1 3.5 2.2c-.8.5-1.1 1-1.1 1.9" />
      <path d="M12 16.6h.01" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  link: (
    <>
      <path d="M9 15l6-6" />
      <path d="M11 6l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M13 18l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
    </>
  ),
  plug: (
    <>
      <path d="M12 22v-5" />
      <path d="M9 8V3M15 8V3" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 4v5h-5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  save: (
    <>
      <path d="M19 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11l4 4v11a1 1 0 0 1-1 1Z" />
      <path d="M8 4v4h6V4" />
      <path d="M8 13h8v7H8Z" />
    </>
  ),
  folder: (
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  ),
  attach: (
    <path d="M20 11.5 11 20.5a5 5 0 0 1-7-7l9-9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.7 1.7 0 0 1-2.4-2.4l8-8" />
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 13V9" />
      <path d="M9.5 2.5h5" />
      <path d="M18.5 6.5 20 5" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 22 20H2Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  cloud: (
    <path d="M17.5 18.5H7a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.4 1.6 3.7 3.7 0 0 1-.4 7.4Z" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  party: (
    <>
      <path d="M3 21 8 9l7 7Z" />
      <path d="M14 5a2 2 0 0 1 2 2M18 3a4 4 0 0 1 4 4M15.5 10.5 21 5" />
    </>
  ),
}

/** Map a sport/category key straight to its icon name. */
export const sportIconName: Record<string, IconName> = {
  run: 'run',
  bike: 'bike',
  swim: 'swim',
  strength: 'strength',
  other: 'other',
}

export default function Icon({
  name,
  className,
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
