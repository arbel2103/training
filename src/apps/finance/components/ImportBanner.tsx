import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import Icon from '../../../components/ui/Icon'

const STORE_KEY = 'finance-store'

/**
 * One-time migration helper: bring finance data over from the old standalone
 * finance app (arbel2103.github.io/finance) when it lives in a different
 * browser/device. Shown only while the merged app has no finance data yet.
 * The old app's "ייצוא נתונים" button downloads exactly the persisted
 * `finance-store` value, which we write back and reload.
 */
export function ImportBanner() {
  const expenses = useStore((s) => s.expenses)
  const accounts = useStore((s) => s.accounts)
  const months = useStore((s) => s.months)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const hasData =
    expenses.length > 0 || accounts.length > 0 || Object.keys(months).length > 0
  if (hasData) return null

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      // accept either the raw persisted object {state,version} or a bare state
      const state = parsed?.state ?? parsed
      if (
        !state ||
        (!Array.isArray(state.expenses) && !Array.isArray(state.accounts))
      ) {
        setError('הקובץ לא נראה כמו גיבוי של אפליקציית הפיננסים.')
        return
      }
      const payload = parsed?.state
        ? parsed
        : { state, version: 4 }
      localStorage.setItem(STORE_KEY, JSON.stringify(payload))
      // reload so the store rehydrates from the imported data
      window.location.reload()
    } catch {
      setError('שגיאה בקריאת הקובץ. ודא שזה קובץ הגיבוי מהאפליקציה הישנה.')
    }
  }

  return (
    <div className="card p-4 border border-accent/40 bg-accent-soft/40">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-xl bg-accent-soft grid place-items-center text-accent">
          <Icon name="download" className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">יש לך נתונים מהאפליקציה הישנה?</h3>
          <p className="mt-0.5 text-sm text-muted leading-relaxed">
            אם השתמשת באפליקציית הפיננסים הנפרדת, פתח אותה, לחץ{' '}
            <b>ייצוא נתונים</b>, ואז ייבא כאן את הקובץ כדי להעביר את הכול.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-accent text-sm px-3 py-1.5 gap-1.5 inline-flex items-center"
            >
              <Icon name="upload" className="w-4 h-4" /> ייבוא קובץ
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
          </div>
          {error && <p className="mt-2 text-sm text-run">{error}</p>}
        </div>
      </div>
    </div>
  )
}
