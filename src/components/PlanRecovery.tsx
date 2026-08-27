import { useState } from 'react'
import Modal from './ui/Modal'
import { useStore, type TrainingPlan } from '../store/useStore'
import {
  downloadRevision,
  findCloudBackup,
  listBackupRevisions,
  planFromBackup,
  type BackupRevision,
} from '../lib/driveSync'

function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Found extends BackupRevision {
  plan: TrainingPlan | null
}

/**
 * Recover the training plan from an older Google Drive backup.
 *
 * `PlanHistory` only knows about edits made since it existed; this reaches
 * further back, to whatever Drive kept from before. It restores the plan alone
 * and deliberately not the rest of the backup: rolling the whole store back to
 * last week would erase workouts and weigh-ins recorded since, which is a
 * worse loss than the one being undone.
 */
export default function PlanRecovery({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const setPlan = useStore((s) => s.setTrainingPlan)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revs, setRevs] = useState<Found[] | null>(null)

  async function scan() {
    setLoading(true)
    setError(null)
    try {
      const info = await findCloudBackup()
      if (!info.fileId) {
        setError('לא נמצא גיבוי ב-Google Drive לחשבון הזה.')
        return
      }
      const list = await listBackupRevisions(info.fileId)
      // read the plan out of each revision so the list can show what is in it —
      // a revision whose plan matches the current one is not worth restoring
      const found: Found[] = []
      for (const r of list.slice(0, 12)) {
        try {
          const payload = await downloadRevision(info.fileId, r.id)
          found.push({ ...r, plan: planFromBackup(payload) as TrainingPlan | null })
        } catch {
          found.push({ ...r, plan: null })
        }
      }
      setRevs(found)
      if (!found.some((f) => f.plan?.weeks?.length))
        setError('נמצאו גיבויים, אבל אין בהם תוכנית אימונים שמורה.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const usable = (revs ?? []).filter((r) => r.plan?.weeks?.length)

  return (
    <Modal open={open} onClose={onClose} title="שחזור תוכנית מגיבוי">
      <p className="text-sm text-muted leading-relaxed mb-4">
        גוגל דרייב שומר גרסאות קודמות של קובץ הגיבוי. כאן אפשר למצוא תוכנית
        אימונים מלפני שינוי שלא רצית, ולשחזר <b>רק אותה</b> — האימונים, השקילות
        ונתוני גרמין שנרשמו מאז יישארו כמו שהם.
      </p>

      {!revs && (
        <button onClick={scan} disabled={loading} className="btn-accent w-full">
          {loading ? 'מחפש גיבויים…' : 'חפש גרסאות קודמות'}
        </button>
      )}

      {error && <p className="text-run text-sm mt-3">{error}</p>}

      {revs && usable.length > 0 && (
        <div className="grid gap-1.5 mt-2">
          {usable.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div>{when(r.modifiedTime)}</div>
                <div className="text-xs text-muted">
                  {r.plan?.weeks.length} שבועות
                  {r.plan?.raceName ? ` · ${r.plan.raceName}` : ''}
                </div>
              </div>
              <button
                onClick={() => {
                  if (!r.plan) return
                  if (
                    confirm(
                      `לשחזר את התוכנית מהגיבוי של ${when(r.modifiedTime)}? התוכנית הנוכחית תישמר ב"גרסאות קודמות".`,
                    )
                  ) {
                    setPlan(r.plan, `שוחזרה מגיבוי של ${when(r.modifiedTime)}`)
                    onClose()
                  }
                }}
                className="btn-ghost text-sm shrink-0"
              >
                שחזר
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
