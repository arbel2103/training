import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { clearPat, hasGarminSetup } from '../../lib/garmin/pat'
import { clearCache } from '../../lib/garmin/cache'
import { manualSync } from '../../lib/garmin/sync'
import GarminSetupWizard from './GarminSetupWizard'
import Icon from '../ui/Icon'

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
  const [wizard, setWizard] = useState<{ open: boolean; step: 1 | 2 | 3 | 4 }>({
    open: false,
    step: 1,
  })
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

  return (
    <section className="border-t border-line pt-5">
      <h4 className="font-semibold mb-1 flex items-center gap-1.5">
        <Icon name="watch" className="w-4 h-4 text-muted" /> Garmin Connect
      </h4>

      {!connected ? (
        <>
          <p className="text-sm text-muted mb-3 leading-relaxed">
            חבר את חשבון הגרמין שלך כדי למשוך אוטומטית שינה, נתוני בריאות
            ואימונים — במקום להזין ידנית. המדריך מלווה אותך צעד-אחר-צעד, מיצירת
            הריפו הפרטי ועד הסנכרון הראשון.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setWizard({ open: true, step: 1 })}
              className="btn-primary gap-1.5"
            >
              <Icon name="help" className="w-4 h-4" /> מדריך חיבור לגרמין
            </button>
          </div>
        </>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="chip text-sm gap-1.5 text-bike">
              <Icon name="checkCircle" className="w-4 h-4" /> מחובר
            </span>
            {settings.lastEmail && (
              <span className="chip text-sm gap-1.5" title="חשבון הגרמין">
                <Icon name="user" className="w-4 h-4" /> {settings.lastEmail}
              </span>
            )}
            {lastSync && (
              <span className="chip text-sm gap-1.5" title="הסנכרון האחרון מהשרת">
                <Icon name="clock" className="w-4 h-4" /> {lastSync}
              </span>
            )}
          </div>

          {status.state === 'error' && status.error && (
            <p className="text-sm text-run">{status.error}</p>
          )}
          {busy && (
            <p className="text-sm text-accent font-semibold leading-relaxed">
              הסנכרון רץ בשרת… המשיכה עצמה מהירה, אבל לפעמים GitHub לוקח כמה
              דקות עד שמקצה מכונה. אפשר לסגור ולהמשיך להשתמש — הנתונים יופיעו
              לבד כשמסתיים. אין צורך ללחוץ שוב.
            </p>
          )}
          <p className="text-xs text-muted leading-relaxed">
            הנתונים מתעדכנים אוטומטית בפתיחת האפליקציה, אם עברו יותר מ-6 שעות
            מהסנכרון האחרון. כדי למשוך נתונים עדכניים מגרמין <b>עכשיו</b> — לחץ
            "סנכרן עכשיו".
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void manualSync()}
              disabled={busy}
              className="btn-primary gap-1.5"
            >
              {!busy && <Icon name="refresh" className="w-4 h-4" />}
              {busy ? 'מסנכרן…' : 'סנכרן עכשיו'}
            </button>
            <button
              onClick={() => setWizard({ open: true, step: 3 })}
              className="btn-ghost"
            >
              שנה פרטי גרמין
            </button>
            <button
              onClick={() => setWizard({ open: true, step: 2 })}
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
