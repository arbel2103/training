import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { useStore } from '../../store/useStore'
import { getDataRepo, setPat } from '../../lib/garmin/pat'
import { getRepoOk, putSecret } from '../../lib/garmin/githubClient'
import { garminErrorMessage, manualSync } from '../../lib/garmin/sync'

type Step = 1 | 2 | 3 | 4

const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'
const NEW_REPO_URL = 'https://github.com/new'

export default function GarminSetupWizard({
  open,
  onClose,
  startStep = 1,
}: {
  open: boolean
  onClose: () => void
  startStep?: Step
}) {
  const [step, setStep] = useState<Step>(startStep)
  const syncStatus = useStore((s) => s.garminSyncStatus)
  const setGarminSettings = useStore((s) => s.setGarminSettings)
  const lastEmail = useStore((s) => s.garminSettings.lastEmail)

  useEffect(() => {
    if (open) setStep(startStep)
  }, [open, startStep])

  const repoName = getDataRepo().split('/')[1] ?? getDataRepo()

  return (
    <Modal open={open} onClose={onClose} title="חיבור לגרמין">
      <div className="grid gap-5">
        <StepDots step={step} />
        {step === 1 && <RepoStep repoName={repoName} onDone={() => setStep(2)} />}
        {step === 2 && (
          <PatStep repoName={repoName} onDone={() => setStep(3)} />
        )}
        {step === 3 && (
          <CredsStep
            defaultEmail={lastEmail}
            onDone={(email) => {
              setGarminSettings({ connected: true, lastEmail: email })
              setStep(4)
            }}
          />
        )}
        {step === 4 && (
          <SyncStep status={syncStatus} onClose={onClose} />
        )}
      </div>
    </Modal>
  )
}

function StepDots({ step }: { step: Step }) {
  const labels = ['ריפו', 'הרשאה', 'פרטי גרמין', 'סנכרון']
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as Step
        const active = n === step
        const done = n < step
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 grid place-items-center rounded-full text-xs font-bold ${
                active
                  ? 'bg-ink text-bg'
                  : done
                    ? 'bg-accent text-white'
                    : 'bg-ink/10 text-muted'
              }`}
            >
              {done ? '✓' : n}
            </span>
            <span className={`text-sm ${active ? 'font-semibold' : 'text-muted'}`}>
              {label}
            </span>
            {i < labels.length - 1 && <span className="text-muted">·</span>}
          </div>
        )
      })}
    </div>
  )
}

function RepoStep({
  repoName,
  onDone,
}: {
  repoName: string
  onDone: () => void
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted leading-relaxed">
        לאפליקציה אין שרת משלה. הנתונים שלך ו<b>מנוע הסנכרון</b> (שמושך אוטומטית
        מגרמין) חיים ב<b>ריפו פרטי משלך ב-GitHub</b> — שרק אתה רואה. יוצרים אותו
        פעם אחת.
      </p>

      <div className="rounded-xl bg-accent-soft/50 text-sm px-3 py-2 leading-relaxed">
        כבר חיברת בעבר? הריפו שלך (<code>{repoName}</code>) כבר קיים — אפשר
        להמשיך ישר לשלב הבא.
      </div>

      <p className="text-sm font-semibold">בפעם הראשונה, בהגדרה חדשה:</p>
      <ol className="text-sm leading-relaxed list-decimal pr-5 grid gap-1.5">
        <li>
          אם אין לך חשבון GitHub — הירשם בחינם ב-
          <a href="https://github.com/signup" target="_blank" rel="noreferrer" className="text-accent font-semibold underline">
            github.com
          </a>
          .
        </li>
        <li>
          צור <b>ריפו פרטי חדש</b> ב-
          <a href={NEW_REPO_URL} target="_blank" rel="noreferrer" className="text-accent font-semibold underline">
            github.com/new
          </a>{' '}
          — תן לו שם (למשל <code>trilife-data</code>), בחר <b>Private</b>, וסמן{' '}
          <b>Add a README</b>. לחץ <b>Create repository</b>.
        </li>
        <li>
          הכנס לריפו את <b>מנוע הסנכרון</b>: תיקיית <code>sync/</code> (סקריפטי
          הפייתון) והקובץ <code>.github/workflows/sync.yml</code> — אלה שמדברים
          עם גרמין ומעדכנים את הנתונים.
        </li>
      </ol>

      <div className="rounded-xl bg-ink/5 text-xs text-muted px-3 py-2 leading-relaxed">
        טיפ: להכנסת מנוע הסנכרון בקלות אפשר להשתמש בתבנית מוכנה (Import/Template)
        במקום להעתיק קבצים ידנית. מה שחשוב — שהריפו יהיה <b>פרטי</b>.
      </div>

      <button onClick={onDone} className="btn-primary justify-self-start">
        יש לי ריפו — המשך
      </button>
    </div>
  )
}

function PatStep({
  repoName,
  onDone,
}: {
  repoName: string
  onDone: () => void
}) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function validate() {
    if (!token.trim()) return
    setBusy(true)
    setError(null)
    setPat(token)
    try {
      await getRepoOk()
      onDone()
    } catch (e) {
      setError(garminErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted leading-relaxed">
        כדי שהאפליקציה תוכל לקרוא את הנתונים ולהפעיל את הסנכרון, צריך ליצור{' '}
        <b>Token</b> אישי ל-GitHub. זה חד-פעמי.
      </p>
      <ol className="text-sm leading-relaxed list-decimal pr-5 grid gap-1">
        <li>
          פתח את{' '}
          <a
            href={TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="text-accent font-semibold underline"
          >
            עמוד יצירת ה-Token
          </a>
        </li>
        <li>
          <b>Token name</b>: כל שם (למשל <code>fitness-garmin</code>)
        </li>
        <li>
          <b>Expiration</b>: שנה (365 יום)
        </li>
        <li>
          <b>Repository access</b>: בחר <b>Only select repositories</b> ←{' '}
          <code>{repoName}</code>
        </li>
        <li>
          <b>Permissions</b> (Repository permissions):
          <ul className="list-disc pr-5 mt-1">
            <li>Contents — <b>Read-only</b></li>
            <li>Actions — <b>Read and write</b></li>
            <li>Secrets — <b>Read and write</b></li>
          </ul>
        </li>
        <li>לחץ <b>Generate token</b> והעתק את הקוד</li>
      </ol>
      <label className="block">
        <span className="label">הדבק כאן את ה-Token</span>
        <input
          className="input text-sm"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="github_pat_…"
          autoComplete="off"
        />
      </label>
      {error && <p className="text-sm text-run">{error}</p>}
      <button
        onClick={validate}
        disabled={busy || !token.trim()}
        className="btn-primary justify-self-start"
      >
        {busy ? 'בודק…' : 'אמת והמשך'}
      </button>
    </div>
  )
}

function CredsStep({
  defaultEmail,
  onDone,
}: {
  defaultEmail?: string
  onDone: (email: string) => void
}) {
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!email.trim() || !password) return
    setBusy(true)
    setError(null)
    try {
      await putSecret('GARMIN_EMAIL', email.trim())
      await putSecret('GARMIN_PASSWORD', password)
      onDone(email.trim())
    } catch (e) {
      setError(garminErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted leading-relaxed">
        פרטי החשבון של <b>Garmin Connect</b> שלך. הם נשמרים מוצפנים בכספת של
        GitHub — <b>הסיסמה לא נשמרת במכשיר</b>.
      </p>
      <label className="block">
        <span className="label">אימייל</span>
        <input
          className="input text-sm"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="label">סיסמה</span>
        <input
          className="input text-sm"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="off"
        />
      </label>
      {error && <p className="text-sm text-run">{error}</p>}
      <button
        onClick={save}
        disabled={busy || !email.trim() || !password}
        className="btn-primary justify-self-start"
      >
        {busy ? 'שומר…' : 'שמור פרטים והמשך'}
      </button>
    </div>
  )
}

function SyncStep({
  status,
  onClose,
}: {
  status: { state: string; errorCode?: string; error?: string }
  onClose: () => void
}) {
  const [mfa, setMfa] = useState('')
  const busy = status.state === 'dispatching' || status.state === 'running'
  const needsMfa = status.errorCode === 'mfa_required'

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted leading-relaxed">
        מעולה! עכשיו אפשר להריץ סנכרון ראשון. הפעם הראשונה מושכת את{' '}
        <b>90 הימים האחרונים</b> ולכן עשויה לקחת מספר דקות. אחרי זה הסנכרון רץ
        אוטומטית בפתיחת האפליקציה (אם עברו יותר מ-6 שעות מהסנכרון האחרון).
      </p>

      {busy && (
        <p className="text-sm text-accent font-semibold">
          {status.state === 'dispatching'
            ? 'מפעיל את הסנכרון…'
            : 'הסנכרון רץ בשרת… (אפשר לסגור ולחזור מאוחר יותר)'}
        </p>
      )}
      {status.state === 'error' && status.error && (
        <p className="text-sm text-run">{status.error}</p>
      )}

      {needsMfa && (
        <label className="block">
          <span className="label">קוד אימות דו-שלבי (MFA)</span>
          <input
            className="input text-sm max-w-[12rem]"
            value={mfa}
            onChange={(e) => setMfa(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void manualSync(needsMfa ? mfa.trim() || undefined : undefined)}
          disabled={busy || (needsMfa && !mfa.trim())}
          className="btn-primary"
        >
          {busy ? 'מסנכרן…' : needsMfa ? 'נסה שוב עם הקוד' : 'סנכרן עכשיו'}
        </button>
        <button onClick={onClose} className="btn-ghost">
          {status.state === 'idle' ? 'סיום' : 'סגור'}
        </button>
      </div>
    </div>
  )
}
