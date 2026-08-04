import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTapAway } from './useTapAway'

const WIDTH = 288 // 18rem
const MARGIN = 12

/**
 * A tiny "i" badge that reveals an explanation on tap.
 *
 * The bubble is portalled to <body> and fixed-positioned: cards carry a
 * persisted transform (the rise animation uses fill-mode both), which would
 * otherwise make it a containing block, and an absolutely placed bubble near
 * the screen edge widened the page and shifted the charts above it.
 */
export default function InfoTip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  useTapAway(pos !== null, () => setPos(null))

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (pos) {
      setPos(null)
      return
    }
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2)
    const centered = r.left + r.width / 2 - width / 2
    setPos({
      top: r.bottom + 8,
      left: Math.max(MARGIN, Math.min(centered, window.innerWidth - width - MARGIN)),
      width,
    })
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="מה זה הגרף הזה?"
        title="מה זה הגרף הזה?"
        className={`w-[18px] h-[18px] shrink-0 rounded-full text-[11px] font-bold italic font-serif
          leading-none grid place-items-center transition select-none
          ${pos ? 'bg-accent text-white' : 'bg-ink/10 text-muted hover:bg-ink/20'}`}
      >
        i
      </button>
      {pos &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[60] rounded-xl px-3 py-2 text-xs leading-relaxed text-start shadow-pop"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              background: 'rgb(var(--ink) / 0.95)',
              color: 'rgb(var(--surface))',
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  )
}
