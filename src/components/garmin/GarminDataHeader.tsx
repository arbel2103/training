import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { refreshFromRepo } from '../../lib/garmin/sync'
import GarminSetupWizard from './GarminSetupWizard'

/** Shown on data tabs when Garmin isn't connected yet. */
export function GarminConnectPrompt() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-6 text-center grid gap-3">
      <div className="text-4xl">⌚</div>
      <p className="text-muted leading-relaxed max-w-sm mx-auto">
        חבר את חשבון <b>Garmin Connect</b> כדי לראות כאן ניתוח שינה, בריאות
        ואימונים שנמשכים אוטומטית מהשעון.
      </p>
      <button onClick={() => setOpen(true)} className="btn-primary justify-self-center">
        🔗 חבר את גרמין
      </button>
      <GarminSetupWizard open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

/** Compact "last synced · refresh" chip row for the top of a data tab. */
export function GarminRefreshChip() {
  const status = useStore((s) => s.garminSyncStatus)
  const [busy, setBusy] = useState(false)
  const last = status.lastGarminSyncAt
    ? new Date(status.lastGarminSyncAt).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  async function refresh() {
    setBusy(true)
    try {
      await refreshFromRepo()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mb-4 text-sm text-muted">
      <span>⌚ {last ? `סונכרן ${last}` : 'טרם סונכרן'}</span>
      <button
        onClick={() => void refresh()}
        disabled={busy}
        className="text-accent font-semibold hover:underline disabled:opacity-50"
      >
        {busy ? 'מרענן…' : 'רענן'}
      </button>
    </div>
  )
}

/** Empty state once connected but no data has arrived yet. */
export function GarminEmpty({ label }: { label: string }) {
  return (
    <div className="card p-6 text-center text-muted">
      עדיין אין נתוני {label}. הרץ סנכרון (☁️ → Garmin) והנתונים יופיעו כאן.
    </div>
  )
}
