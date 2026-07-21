import { useEffect, useState, type ReactNode } from 'react'

interface Step {
  icon: string
  title: string
  body: ReactNode
  /** page index to switch to while this step is shown (0=היום … 4=בריאות) */
  page?: number
}

const STEPS: Step[] = [
  {
    icon: '👋',
    title: 'ברוך הבא ל-fitness',
    body: (
      <>
        <p>
          זה מרכז האימונים והבריאות האישי שלך — הזנה ומעקב, תוכנית מסודרת,
          שיבוץ ליומן, מעקב בריאות, ומאמן AI אישי.
        </p>
        <p className="mt-2 text-muted">
          המדריך הקצר הזה יעבור על כל חלק. אפשר ללחוץ <b>המשך</b> כדי להתקדם, או{' '}
          <b>דלג</b> בכל רגע. תמיד אפשר לפתוח אותו שוב מכפתור <b>❓</b> למעלה.
        </p>
      </>
    ),
    page: 0,
  },
  {
    icon: '🏠',
    title: 'דף "היום" — הכל במקום אחד',
    body: (
      <>
        <p>מסך הבית מרכז את היומיום:</p>
        <ul className="mt-2 space-y-1.5 list-disc pr-5">
          <li>ספירה לאחור לתחרות 🏁, מד ההתקדמות השבועי, ומגמת המשקל</li>
          <li>
            האימונים של היום — עם <b>בצעתי ✓</b> בלחיצה אחת
          </li>
          <li>
            ומיד מתחת: <b>הזנת האימונים</b> של כל השבוע (ראשון–שבת) — לכל יום{' '}
            <b>+ הוסף אימון</b>
          </li>
        </ul>
        <p className="mt-2">
          <b>טיפ לקצב:</b> מקלידים רק ספרות — <code>530</code> הופך ל-<b>5:30</b>{' '}
          והמשך מחושב לבד.
        </p>
      </>
    ),
    page: 0,
  },
  {
    icon: '📊',
    title: 'טאב היסטוריה',
    body: (
      <>
        <p>
          בראש דף הבית יש טאב <b>היסטוריה</b>: ניתוח לפי תקופה (שבוע / חודש /
          טווח) עם ממוצעים ומרחקים לכל ספורט.
        </p>
        <ul className="mt-2 space-y-1.5 list-disc pr-5">
          <li>
            <b>📈 שיאים ומגמות:</b> הקצב הכי מהיר, המרחק הכי ארוך, וגרפים של נפח
            שבועי וקצב לאורך זמן — לכל ספורט
          </li>
          <li>מתחת: רשימת כל האימונים שאי-פעם הזנת</li>
        </ul>
      </>
    ),
    page: 0,
  },
  {
    icon: '💪',
    title: 'תוכנית אימונים — כוח',
    body: (
      <>
        <p>
          בעמוד <b>תוכנית אימונים</b>, טאב <b>כוח</b>: מחלקים לפי סוגי אימון
          (חזה, גב, רגליים…) — לכל אחד טאב משלו.
        </p>
        <ul className="mt-2 space-y-1.5 list-disc pr-5">
          <li>
            לכל תרגיל: שם, מספר סטים, חזרות לכל סט, ומשקל — מספר תיבות החזרות
            משתנה לפי מספר הסטים
          </li>
          <li>
            כפתור <b>⏱️ טיימר</b> בתוך האימון — טיימר מנוחה בין סטים עם צפצוף
            ורטט בסיום
          </li>
        </ul>
      </>
    ),
    page: 1,
  },
  {
    icon: '🏊',
    title: 'תוכנית אימונים — אירובי',
    body: (
      <>
        <p>
          טאב <b>אירובי</b> מציג את התוכנית שהמאמן בנה לך, מחולקת לשבועות.
        </p>
        <ul className="mt-2 space-y-1.5 list-disc pr-5">
          <li>כל שבוע פרוס כטבלה לפי ספורט: ריצה, רכיבה, שחייה, כוח</li>
          <li>
            כל אימון שאתה מזין ב"היום" מסומן כאן <b>✓</b> אוטומטית — רואים מייד
            מה בוצע מול מה שתוכנן
          </li>
          <li>
            שבועות שהסתיימו <b>מתקפלים לשורת סיכום</b> (8/9 ✓) — לחיצה על הכותרת
            פותחת אותם
          </li>
        </ul>
      </>
    ),
    page: 1,
  },
  {
    icon: '🗓️',
    title: 'שיבוץ ליומן',
    body: (
      <>
        <p>
          כאן התוכנית פוגשת את ה-<b>Google Calendar</b> שלך:
        </p>
        <ol className="mt-2 space-y-1.5 list-decimal pr-5">
          <li>
            <b>התחבר וטען יומן</b> — בתיבת הטקסט מזינים שם יומן או מילת מפתח
            (למשל "אלבטרוס") וזה נשמר. האירועים הקיימים מוצגים כדי לראות מתי פנוי
          </li>
          <li>
            <b>המאמן 🏋️ משבץ את האימונים ללוח בעצמו</b> — בקש ממנו בצ'אט, ואז
            רק קובעים <b>שעה</b> לכל אימון (אפשר גם להוסיף ידנית עם + הוסף)
          </li>
          <li>
            <b>אשר ושלח ליומן</b> — הכל נכתב ליומן האישי שלך (מסומן "ביומן ✓")
          </li>
        </ol>
      </>
    ),
    page: 2,
  },
  {
    icon: '🩺',
    title: 'מעקב בריאות',
    body: (
      <>
        <ul className="space-y-1.5 list-disc pr-5">
          <li>
            <b>⚖️ משקל:</b> מזינים שקילות, וגרף מציג את המגמה לאורך זמן (ממוצע
            שבועי). המשקל האחרון מופיע גם בדף הבית
          </li>
          <li>
            <b>🩺 בדיקות:</b> סוג, תאריך ותוקף בחודשים — האפליקציה מחשבת מתי
            הבדיקה הבאה, ואפשר להעלות את קובץ התוצאות ולפתוח אותו בכל עת
          </li>
        </ul>
      </>
    ),
    page: 3,
  },
  {
    icon: '🏋️',
    title: 'המאמן האישי (AI)',
    body: (
      <>
        <p>
          הכפתור הצף <b>🏋️</b> פותח את המאמן — צ'אט אישי שזמין בכל עמוד.
        </p>
        <ul className="mt-2 space-y-1.5 list-disc pr-5">
          <li>
            בהתחלה הוא שואל על מה לעבוד — <b>כוח, טריאתלון, או שניהם</b> — ובונה
            לפי זה
          </li>
          <li>
            הוא בונה עבורך את תוכנית האירובי (לפי שבועות) ואת אימוני הכוח — והם
            מופיעים בעמוד התוכנית
          </li>
          <li>
            <b>מכיר אותך:</b> רואה מה ביצעת, את התחושה (RPE) וההערות שרשמת, ואת
            המחויבויות מהיומן שטענת — ומתכנן סביבן
          </li>
          <li>
            כפתור <b>📊 סכם לי את השבוע</b> — פידבק על מתוכנן מול בוצע והתאמות
            לשבוע הבא
          </li>
          <li>
            <b>חינם:</b> דורש מפתח API חינמי מ-Google AI Studio (מזינים פעם אחת,
            נשמר במכשיר). המאמן ידריך אותך
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: '☁️',
    title: 'גיבוי וסנכרון',
    body: (
      <>
        <p>
          כפתור <b>☁️</b> למעלה — הנתונים שלך נשמרים במכשיר, וכאן מגבים אותם
          ומסנכרנים בין מכשירים דרך <b>Google Drive</b> שלך.
        </p>
        <ul className="mt-2 space-y-1.5 list-disc pr-5">
          <li>
            <b>גבה</b> במכשיר אחד ← <b>שחזר</b> בשני (למשל מהמחשב לטלפון)
          </li>
          <li>אפשר גם לגבות/לשחזר מקובץ, בלי גוגל</li>
          <li>פעם ראשונה: צריך להפעיל את "Google Drive API" (המדריך בפנים)</li>
        </ul>
      </>
    ),
  },
  {
    icon: '🌙',
    title: 'מצב כהה והתקנה',
    body: (
      <>
        <ul className="space-y-1.5 list-disc pr-5">
          <li>
            <b>🌙 מצב כהה</b> — כפתור למעלה, נוח לעיניים בערב
          </li>
          <li>
            <b>התקנה כאפליקציה:</b> בטלפון — "הוסף למסך הבית"; במחשב — אייקון
            ההתקנה בשורת הכתובת. תיפתח כמו אפליקציה אמיתית, ותעבוד גם בלי אינטרנט
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: '🎉',
    title: 'זהו, אתה מוכן!',
    body: (
      <>
        <p>עברנו על הכל. ההמלצה שלי להתחלה:</p>
        <ol className="mt-2 space-y-1.5 list-decimal pr-5">
          <li>פתח את המאמן 🏋️ ובקש לבנות תוכנית</li>
          <li>מכל יום — סמן "בצעתי ✓" על האימונים</li>
          <li>גבה לענן ☁️ מדי פעם</li>
        </ol>
        <p className="mt-2 text-muted">אפשר תמיד לפתוח שוב את המדריך מכפתור ❓.</p>
      </>
    ),
    page: 0,
  },
]

export default function GuideOverlay({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate: (page: number) => void
}) {
  const [i, setI] = useState(0)

  // start from the top each time it opens
  useEffect(() => {
    if (open) setI(0)
  }, [open])

  // follow the step to its page
  useEffect(() => {
    if (open && STEPS[i].page != null) onNavigate(STEPS[i].page!)
  }, [open, i, onNavigate])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setI((v) => Math.min(STEPS.length - 1, v + 1))
      if (e.key === 'ArrowRight') setI((v) => Math.max(0, v - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const step = STEPS[i]
  const isFirst = i === 0
  const isLast = i === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm">
      <div className="modal-panel bg-surface border border-line shadow-pop w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-auto pb-[env(safe-area-inset-bottom)]">
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />

        {/* header: step count + skip */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-4">
          <span className="text-xs font-semibold text-muted">
            {i + 1} מתוך {STEPS.length}
          </span>
          <button
            onClick={onClose}
            className="text-sm text-muted hover:text-ink font-medium"
          >
            דלג ✕
          </button>
        </div>

        {/* content */}
        <div className="px-5 sm:px-6 pt-3 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft grid place-items-center text-3xl mb-3">
            {step.icon}
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">{step.title}</h3>
          <div className="text-ink leading-relaxed text-[15px]">{step.body}</div>
        </div>

        {/* progress dots */}
        <div className="flex justify-center gap-1.5 px-6">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`שלב ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? 'w-5 bg-accent' : 'w-1.5 bg-line hover:bg-muted'
              }`}
            />
          ))}
        </div>

        {/* footer buttons */}
        <div className="flex items-center gap-2 px-5 sm:px-6 py-4">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={isFirst}
            className="btn-ghost"
          >
            הקודם
          </button>
          {isLast ? (
            <button onClick={onClose} className="btn-accent flex-1">
              יאללה, מתחילים! 🎉
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
              className="btn-primary flex-1"
            >
              המשך →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
