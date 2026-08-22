import { useState } from 'react'
import Modal from './ui/Modal'
import Icon from './ui/Icon'

/**
 * The week's schedule, ready to send on.
 *
 * Appears once the calendar sync succeeds, because that is the moment the week
 * is actually settled. Copy is the primary action and share is offered when the
 * browser has it — on a phone that is one tap straight into WhatsApp, which is
 * where this text is going.
 */
export default function WeekDigestSheet({
  text,
  synced = false,
  onClose,
}: {
  text: string
  /** true when this follows an actual calendar sync, false when asked for */
  synced?: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // clipboard blocked (an insecure origin, or permission denied): the text
      // is on screen and selectable, so say that rather than failing silently
      setCopied(false)
      window.alert('הדפדפן לא איפשר העתקה — סמן את הטקסט והעתק ידנית.')
    }
  }

  async function share() {
    try {
      await navigator.share({ text })
    } catch {
      /* the user dismissed the share sheet — nothing to report */
    }
  }

  return (
    <Modal open onClose={onClose} title="סיכום השבוע">
      <div className="grid gap-3 min-w-0">
        <p className="text-sm text-muted leading-relaxed">
          {synced ? 'האימונים נשלחו ליומן. ' : ''}הנה השבוע בטקסט — להעתיק ולשלוח
          למאמן או לחבר.
        </p>
        <pre className="rounded-xl border border-line bg-bg p-3 text-sm leading-relaxed whitespace-pre-wrap break-words font-sans max-h-64 overflow-auto">
          {text}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button onClick={copy} className="btn-primary gap-1.5">
            <Icon name={copied ? 'check' : 'clipboard'} className="w-4 h-4" />
            {copied ? 'הועתק' : 'העתק'}
          </button>
          {canShare && (
            <button onClick={share} className="btn-soft gap-1.5">
              <Icon name="upload" className="w-4 h-4" /> שתף
            </button>
          )}
          <button onClick={onClose} className="btn-ghost">
            סגור
          </button>
        </div>
      </div>
    </Modal>
  )
}
