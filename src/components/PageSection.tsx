import { useRef, useState, type ReactNode } from 'react'

/**
 * A vertically-scrolling page panel with pull-to-refresh. It is also the
 * horizontal snap item in App's page carousel, so its root <section> is the
 * scroll container App targets for scroll-to-top.
 */
export default function PageSection({
  children,
  onRefresh,
}: {
  children: ReactNode
  onRefresh: () => Promise<void>
}) {
  const ref = useRef<HTMLElement>(null)
  const startY = useRef<number | null>(null)
  const startX = useRef(0)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [settling, setSettling] = useState(false)

  const onTouchStart = (e: React.TouchEvent) => {
    const el = ref.current
    startX.current = e.touches[0].clientX
    startY.current = el && el.scrollTop <= 0 ? e.touches[0].clientY : null
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return
    const dy = e.touches[0].clientY - startY.current
    const dx = e.touches[0].clientX - startX.current
    // ignore horizontal swipes (page carousel) and upward moves
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
      setPull(0)
      return
    }
    setPull(Math.min(dy * 0.5, 80))
  }
  const onTouchEnd = async () => {
    if (startY.current == null) return
    startY.current = null
    setSettling(true)
    if (pull > 55 && !refreshing) {
      setRefreshing(true)
      setPull(44)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPull(0)
    setTimeout(() => setSettling(false), 220)
  }

  const label = refreshing
    ? '⟳ מסנכרן…'
    : pull > 55
      ? '↓ שחרר לרענון'
      : pull > 6
        ? '↓ משוך לרענון'
        : ''

  return (
    <section
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="min-w-full h-full overflow-y-auto snap-start no-scrollbar"
      style={{ overscrollBehaviorY: 'contain' }}
    >
      <div
        className="flex items-center justify-center overflow-hidden text-sm text-muted"
        style={{ height: pull, transition: settling ? 'height 0.2s ease-out' : 'none' }}
      >
        {label}
      </div>
      <div className="px-4 sm:px-6 md:px-10 py-6 max-w-6xl mx-auto">{children}</div>
    </section>
  )
}
