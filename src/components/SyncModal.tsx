import { useEffect, useRef, useState } from 'react'
import Modal from './ui/Modal'
import { isConfigured, preloadGis } from '../lib/googleCalendar'
import {
  downloadBackup,
  exportToFile,
  findCloudBackup,
  getAccountEmail,
  getDeviceName,
  importFromFile,
  restoreBackup,
  setDeviceName,
  uploadBackup,
  type CloudInfo,
} from '../lib/driveSync'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SyncModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [cloud, setCloud] = useState<CloudInfo | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [deviceName, setDeviceNameLocal] = useState(getDeviceName())
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // load Google's script before the user clicks connect, so the OAuth popup
  // opens inside the click gesture (mobile browsers block it otherwise)
  useEffect(() => {
    if (open && isConfigured()) void preloadGis().catch(() => {})
  }, [open])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    setError(null)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const checkCloud = () =>
    run('בודק…', async () => {
      const info = await findCloudBackup()
      setCloud(info)
      setAccount(await getAccountEmail())
    })

  const backupNow = () =>
    run('מגבה…', async () => {
      const info = cloud ?? (await findCloudBackup())
      const id = await uploadBackup(info.fileId)
      const now = new Date().toISOString()
      setCloud({
        fileId: id,
        modifiedTime: now,
        savedAt: now,
        deviceName: getDeviceName(),
      })
      setMsg('הגיבוי לענן הושלם ✓')
    })

  const restoreNow = () =>
    run('משחזר…', async () => {
      const info = cloud ?? (await findCloudBackup())
      if (!info.fileId) throw new Error('אין גיבוי בענן עדיין.')
      if (
        !window.confirm(
          'שחזור מהענן יחליף את כל הנתונים במכשיר הזה בנתונים מהגיבוי. להמשיך?',
        )
      )
        return
      const payload = await downloadBackup(info.fileId)
      restoreBackup(payload) // reloads the page
    })

  return (
    <Modal open={open} onClose={onClose} title="☁️ גיבוי וסנכרון">
      <div className="grid gap-6">
        <section>
          <h4 className="font-semibold mb-1">סנכרון בענן (Google Drive)</h4>
          <p className="text-sm text-muted mb-3 leading-relaxed">
            הגיבוי נשמר באזור פרטי של האפליקציה ב-Google Drive שלך. כדי לסנכרן
            בין מכשירים: <b>גבה</b> במכשיר אחד ← <b>שחזר</b> במכשיר השני.
          </p>
          <label className="block mb-3">
            <span className="label">שם המכשיר הזה (מופיע ליד הגיבוי)</span>
            <input
              className="input text-sm max-w-xs"
              value={deviceName}
              onChange={(e) => {
                setDeviceNameLocal(e.target.value)
                setDeviceName(e.target.value)
              }}
              placeholder="למשל: אייפון של ארבל / מחשב בבית"
            />
          </label>
          {!isConfigured() ? (
            <p className="text-sm text-muted">
              🔌 סנכרון ענן דורש את חיבור Google (מוגדר באתר החי).
            </p>
          ) : (
            <>
              {cloud === null ? (
                <button onClick={checkCloud} disabled={!!busy} className="btn-soft">
                  🔗 התחבר ובדוק גיבוי
                </button>
              ) : (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    {account && (
                      <span className="chip text-sm" title="החשבון המחובר">
                        👤 {account}
                      </span>
                    )}
                    {cloud.modifiedTime || cloud.savedAt ? (
                      <>
                        <span className="chip text-sm">
                          🕒 {formatTime(cloud.savedAt || cloud.modifiedTime!)}
                        </span>
                        {cloud.deviceName && (
                          <span
                            className="chip text-sm"
                            title="המכשיר שממנו בוצע הגיבוי האחרון"
                          >
                            📱 {cloud.deviceName}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="chip text-sm">
                        אין גיבוי בחשבון הזה — ודא שזה אותו חשבון גוגל כמו במכשיר
                        שגיבית בו
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={backupNow}
                      disabled={!!busy}
                      className="btn-primary"
                    >
                      ⬆️ גבה לענן עכשיו
                    </button>
                    <button
                      onClick={restoreNow}
                      disabled={!!busy || !cloud.fileId}
                      className="btn-ghost"
                    >
                      ⬇️ שחזר מהענן למכשיר זה
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="border-t border-line pt-5">
          <h4 className="font-semibold mb-1">גיבוי לקובץ</h4>
          <p className="text-sm text-muted mb-3">
            גיבוי מקומי בלי גוגל — קובץ שאפשר לשמור איפה שרוצים.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportToFile()} className="btn-ghost">
              💾 הורד קובץ גיבוי
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost">
              📂 שחזר מקובץ
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (
                  window.confirm(
                    'שחזור מקובץ יחליף את כל הנתונים במכשיר הזה. להמשיך?',
                  )
                ) {
                  void run('משחזר…', () => importFromFile(f))
                }
                e.target.value = ''
              }}
            />
          </div>
        </section>

        {busy && <p className="text-sm text-muted">{busy}</p>}
        {msg && <p className="text-sm text-bike font-semibold">{msg}</p>}
        {error && <p className="text-sm text-run">{error}</p>}

        <p className="text-xs text-muted border-t border-line pt-3">
          הגיבוי כולל את כל הנתונים והתוכניות (וגם את מפתח המאמן בגיבוי הענן).
          קבצי תוצאות של בדיקות רפואיות אינם נכללים.
        </p>
      </div>
    </Modal>
  )
}
