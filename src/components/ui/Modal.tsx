import { useEffect, type ReactNode } from 'react'

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
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* bottom sheet on phones, centered dialog on larger screens */}
      <div
        className={`modal-panel bg-surface border border-line shadow-pop w-full ${maxWidth}
          rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[88vh] overflow-auto
          pb-[env(safe-area-inset-bottom)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
        {title && (
          <div className="flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-line">
            <h3 className="font-display text-xl font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="text-muted hover:text-ink text-2xl leading-none w-9 h-9 grid place-items-center -ml-2"
              aria-label="סגור"
            >
              ×
            </button>
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
