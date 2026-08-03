import { useState } from 'react'
import { useTapAway } from './useTapAway'

/**
 * A tiny "!" badge that reveals an explanation bubble on tap. Nothing is shown
 * until pressed; tapping anywhere else dismisses (same behaviour as chart
 * tooltips). Sits inline next to a chart title.
 */
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  useTapAway(open, () => setOpen(false))

  return (
    <span className="relative inline-flex align-middle">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="מה זה הגרף הזה?"
        title="מה זה הגרף הזה?"
        className={`w-[18px] h-[18px] rounded-full text-[11px] font-bold italic font-serif leading-none
          grid place-items-center transition select-none
          ${open ? 'bg-accent text-white' : 'bg-ink/10 text-muted hover:bg-ink/20'}`}
      >
        i
      </button>
      {open && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2 z-20 w-64 max-w-[70vw] rounded-xl px-3 py-2
            text-xs font-normal leading-relaxed text-start shadow-pop"
          style={{
            insetInlineStart: '-8px',
            background: 'rgb(var(--ink) / 0.94)',
            color: 'rgb(var(--surface))',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
