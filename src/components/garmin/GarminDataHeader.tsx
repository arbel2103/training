import { useState } from 'react'
import { useStore } from '../../store/useStore'
import GarminSetupWizard from './GarminSetupWizard'
import Icon from '../ui/Icon'

/** Shown on data tabs when Garmin isn't connected yet. */
export function GarminConnectPrompt() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-6 text-center grid gap-3">
      <Icon name="watch" className="w-10 h-10 mx-auto text-muted" />
      <p className="text-muted leading-relaxed max-w-sm mx-auto">
        חבר את חשבון <b>Garmin Connect</b> כדי לראות כאן ניתוח שינה, בריאות
        ואימונים שנמשכים אוטומטית מהשעון.
      </p>
      <button onClick={() => setOpen(true)} className="btn-primary justify-self-center gap-1.5">
        <Icon name="link" className="w-4 h-4" /> חבר את גרמין
      </button>
      <GarminSetupWizard open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

/**
 * Read-only "last synced" line for the top of a data tab. Syncing itself is
 * done from one place only — the cloud button in the header.
 */
export function GarminRefreshChip() {
  const status = useStore((s) => s.garminSyncStatus)
  const last = status.lastGarminSyncAt
    ? new Date(status.lastGarminSyncAt).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  const syncing = status.state === 'dispatching' || status.state === 'running'

  return (
    <div className="flex items-center gap-2 mb-4 text-sm text-muted flex-wrap">
      <span className="flex items-center gap-1.5">
        <Icon name="watch" className="w-4 h-4" />
        {last ? `סונכרן ${last}` : 'טרם סונכרן'}
      </span>
      {syncing && (
        <span className="text-accent font-semibold">מושך נתונים מגרמין…</span>
      )}
      {status.state === 'error' && status.error && (
        <span className="text-run">{status.error}</span>
      )}
    </div>
  )
}

/** Empty state once connected but no data has arrived yet. */
export function GarminEmpty({ label }: { label: string }) {
  return (
    <div className="card p-6 text-center text-muted">
      עדיין אין נתוני {label}. הרץ סנכרון (בכפתור הענן → Garmin) והנתונים יופיעו כאן.
    </div>
  )
}
