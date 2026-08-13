import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Portal to <body> so the overlay is fixed to the viewport itself — a
  // transformed or backdrop-filtered ancestor would otherwise become the
  // containing block and push a tall panel off-screen.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* A flex column capped to the overlay's own (definite) height, so the
          header can never leave the screen however tall the body grows: the
          header is fixed-size and only the body below it scrolls. Capping with
          max-h-full — against the full-height fixed parent — avoids relying on
          dvh, which did not cap reliably and let a full-page PDF overflow. */}
      <div
        className={`modal-panel bg-surface border border-line shadow-pop w-full ${maxWidth}
          rounded-t-2xl sm:rounded-2xl max-h-full sm:max-h-[88vh]
          flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0">
          <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
          {title ? (
            <div className="flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-line">
              <h3 className="font-display text-xl font-bold truncate min-w-0">{title}</h3>
              <button
                onClick={onClose}
                className="text-muted hover:text-ink text-2xl leading-none w-9 h-9 grid place-items-center -ml-2 shrink-0"
                aria-label="סגור"
              >
                ×
              </button>
            </div>
          ) : (
            // no title bar, but a scrollable body still needs a way out
            <button
              onClick={onClose}
              className="absolute top-2 left-2 z-10 text-muted hover:text-ink text-2xl leading-none w-9 h-9 grid place-items-center rounded-full bg-surface/80"
              aria-label="סגור"
            >
              ×
            </button>
          )}
        </div>
        <div className="overflow-auto p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
