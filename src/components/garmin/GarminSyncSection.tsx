import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { clearPat, hasGarminSetup } from '../../lib/garmin/pat'
import { clearCache } from '../../lib/garmin/cache'
import { manualSync, refreshFromRepo } from '../../lib/garmin/sync'
import GarminSetupWizard from './GarminSetupWizard'

function formatTime(iso?: string): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function GarminSyncSection() {
  const status = useStore((s) => s.garminSyncStatus)
  const settings = useStore((s) => s.garminSettings)
  const setGarminSettings = useStore((s) => s.setGarminSettings)
  const [wizard, setWizard] = useState<{ open: boolean; step: 1 | 2 | 3 }>({
    open: false,
    step: 1,
  })
  const [refreshing, setRefreshing] = useState(false)

  const connected = hasGarminSetup()
  const busy = status.state === 'dispatching' || status.state === 'running'
  const lastSync = formatTime(status.lastGarminSyncAt)

  function disconnect() {
    if (!window.confirm('לנתק את חשבון הגרמין מהמכשיר הזה? הנתונים בשרת יישמרו.'))
      return
    clearPat()
    setGarminSettings({ connected: false })
    void clearCache()
  }

  async function refresh() {
    setRefreshing(true)
    try {
      await refreshFromRepo()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <section className="border-t border-line pt-5">
      <h4 className="font-semibold mb-1">⌚ Garmin Connect</h4>

      {!connected ? (
        <>
          <p className="text-sm text-muted mb-3 leading-relaxed">
            חבר את חשבון הגרמין שלך כדי למשוך אוטומטית שינה, נתוני בריאות
            ואימונים — במקום להזין ידנית.
          </p>
          <button
            onClick={() => setWizard({ open: true, step: 1 })}
            className="btn-primary"
          >
            🔗 חבר את גרמין
          </button>
        </>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="chip text-sm">✅ מחובר</span>
            {settings.lastEmail && (
              <span className="chip text-sm" title="חשבון הגרמין">
                👤 {settings.lastEmail}
              </span>
            )}
            {lastSync && (
              <span className="chip text-sm" title="הסנכרון האחרון מהשרת">
                🕒 {lastSync}
              </span>
            )}
          </div>

          {status.state === 'error' && status.error && (
            <p className="text-sm text-run">{status.error}</p>
          )}
          {busy && (
            <p className="text-sm text-accent font-semibold">
              הסנכרון רץ בשרת… (1–3 דקות; אפשר לסגור ולחזור)
            </p>
          )}
          <p className="text-xs text-muted leading-relaxed">
            נתוני גרמין מתעדכנים אוטומטית כל יום ב-12:00. כדי לקבל נתונים
            עדכניים <b>עכשיו</b> — לחץ "משוך נתונים חדשים מגרמין" (מריץ סנכרון
            בשרת). "טען מהשרת" רק קורא מה שכבר סונכרן.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void manualSync()}
              disabled={busy}
              className="btn-primary"
            >
              {busy ? 'מסנכרן…' : '🔄 משוך נתונים חדשים מגרמין'}
            </button>
            <button
              onClick={() => void refresh()}
              disabled={refreshing || busy}
              className="btn-soft"
            >
              {refreshing ? 'טוען…' : '⬇️ טען מהשרת'}
            </button>
            <button
              onClick={() => setWizard({ open: true, step: 2 })}
              className="btn-ghost"
            >
              שנה פרטי גרמין
            </button>
            <button
              onClick={() => setWizard({ open: true, step: 1 })}
              className="btn-ghost"
            >
              החלף Token
            </button>
            <button onClick={disconnect} className="btn-ghost text-run">
              נתק
            </button>
          </div>
        </div>
      )}

      <GarminSetupWizard
        open={wizard.open}
        startStep={wizard.step}
        onClose={() => setWizard((w) => ({ ...w, open: false }))}
      />
    </section>
  )
}
