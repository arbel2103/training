import { useState } from 'react'
import { apiKeyShapeError, setApiKey } from '../lib/apiKey'
import { verifyApiKey } from '../lib/coachApi'
import Icon from './ui/Icon'

const AI_STUDIO = 'https://aistudio.google.com/apikey'

function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children?: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-accent-soft text-accent grid place-items-center text-sm font-bold shrink-0">
        {n}
      </span>
      <div className="flex-1 min-w-0 grid gap-2">
        <p className="font-semibold leading-snug">{title}</p>
        {children}
      </div>
    </li>
  )
}

/**
 * Getting the coach connected, for someone who has never seen Google AI Studio.
 *
 * The old screen was two lines and a text box that accepted any 20 characters,
 * so a mistyped key looked fine here and surfaced later as the coach failing
 * mid-answer. This walks the actual screens Google shows, offers a paste
 * button (switching apps to long-press-paste is where phone setups die), and
 * checks the key against Google before saving it.
 */
export default function CoachSetup({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function paste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) {
        setKey(text)
        setError(null)
      } else {
        setError('הלוח ריק — העתק קודם את המפתח מהאתר של גוגל.')
      }
    } catch {
      setError('הדפדפן לא נתן גישה ללוח. הדבק ידנית בשדה (לחיצה ארוכה ← הדבק).')
    }
  }

  async function save() {
    const shape = apiKeyShapeError(key)
    if (shape) return setError(shape)
    setChecking(true)
    setError(null)
    try {
      await verifyApiKey(key.replace(/\s+/g, ''))
      setApiKey(key)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-5 grid gap-5 content-start">
      <div>
        <h3 className="font-display text-xl font-bold mb-1.5">חיבור המאמן</h3>
        <p className="text-sm text-muted leading-relaxed">
          המאמן עובד עם מפתח <b>חינמי משלך</b> מ-Google. פעולה חד-פעמית של דקה,
          בלי כרטיס אשראי.
        </p>
      </div>

      <ol className="grid gap-5 text-sm">
        <Step n={1} title="פתח את Google AI Studio">
          <a
            href={AI_STUDIO}
            target="_blank"
            rel="noreferrer"
            className="btn-soft gap-1.5 justify-self-start"
          >
            <Icon name="link" className="w-4 h-4" /> פתח את AI Studio
          </a>
          <p className="text-muted leading-relaxed">
            תתבקש להתחבר עם חשבון גוגל רגיל — אותו אחד שאתה משתמש בו בטלפון.
          </p>
        </Step>

        <Step n={2} title='לחץ על "Create API key"'>
          <p className="text-muted leading-relaxed">
            אם גוגל שואלת לאיזה פרויקט לשייך — בחר{' '}
            <b>"Create API key in new project"</b>. אין מה להגדיר שם.
          </p>
        </Step>

        <Step n={3} title="העתק את המפתח והדבק כאן">
          <p className="text-muted leading-relaxed">
            לחץ על סמל ההעתקה שליד המפתח (לא לסמן ידנית — קל לפספס תו), חזור
            לכאן, והדבק.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              dir="ltr"
              className="input flex-1 min-w-0"
              placeholder="הדבק כאן את המפתח"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setError(null)
              }}
            />
            <button onClick={paste} className="btn-ghost shrink-0" title="הדבק מהלוח">
              <Icon name="clipboard" className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={save}
            disabled={checking}
            className="btn-primary justify-self-start"
          >
            {checking ? 'בודק מול גוגל…' : 'בדוק ושמור'}
          </button>
          {error && (
            <div
              className="rounded-xl px-3 py-2 bg-run/10 text-run flex items-start gap-1.5 leading-relaxed"
              style={{ borderInlineStart: '3px solid rgb(var(--c-run))' }}
            >
              <Icon name="warning" className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </Step>
      </ol>

      <div className="border-t border-line pt-4 grid gap-2 text-xs text-muted leading-relaxed">
        <p className="flex items-start gap-1.5">
          <Icon name="save" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            המפתח נשמר <b>רק במכשיר הזה</b> ונשלח ישירות לגוגל — אין שרת באמצע.
            במכשיר אחר תצטרך להדביק אותו שוב.
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <Icon name="bulb" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            למכסה החינמית יש תקרה יומית נדיבה. אם המאמן אומר שהגעת אליה — הוא
            יחזור לעבוד למחרת.
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <Icon name="utensils" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            אותו מפתח מפעיל גם את הערכת הארוחות באפליקציית <b>תזונה</b> — מספיק
            לחבר פעם אחת.
          </span>
        </p>
      </div>
    </div>
  )
}
