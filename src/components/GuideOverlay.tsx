import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import Icon, { type IconName } from './ui/Icon'
import { useAppShell, type AppId } from '../lib/appShell'

interface Step {
  icon: IconName
  title: string
  body: ReactNode
  /** which mini-app this step belongs to (default 'tri') */
  app?: AppId
  /** page/tab to switch to inside that app (TriLife 0=היום…3=בריאות; finance
   *  0=הוצאות,1=הון) */
  page?: number
  /** data-guide id of the element to point at; omit for a centered card */
  target?: string
}

const STEPS: Step[] = [
  {
    icon: 'party',
    title: 'ברוך הבא ל-TriLife',
    body: (
      <p>
        סיור קצר על כל חלק — כל פעם נצביע על פיצ'ר אחר. לחץ <b>המשך</b> כדי
        להתקדם, או <b>דלג</b>. תמיד אפשר לפתוח שוב מכפתור <b>העזרה</b> למעלה.
      </p>
    ),
    page: 0,
  },
  {
    icon: 'home',
    title: 'דף "היום"',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>ספירה לאחור לתחרות ומד ההתקדמות השבועי</li>
        <li>
          אריח <b>"הלילה האחרון"</b> — ציון שינה, HRV ודופק מנוחה כעיגולים, סיכום
          המוכנוּת שלך לבוקר
        </li>
        <li>
          האימונים של היום עם <b>בצעתי ✓</b> בלחיצה; אחרי כל אימון —{' '}
          <b>דירוג מאמץ (RPE)</b> והערה, שמהם המאמן לומד על העומס
        </li>
        <li>
          כפתור <b>הוספת אימון</b> בכרטיס "האימון של היום" — להזין אימון{' '}
          <b>שכבר ביצעת</b> ולא נמדד בשעון (גלישה, פילאטיס, וכו'), עם בחירת תאריך
        </li>
        <li>
          <b>קצב:</b> מקלידים ספרות בלבד — <code>530</code> הופך ל-<b>5:30</b>
        </li>
        <li>
          טאב <b>סטטיסטיקות</b>: ניתוח עומק לכל ענף + רשימת כל האימונים
        </li>
      </ul>
    ),
    page: 0,
    target: 'nav-home',
  },
  {
    icon: 'clipboard',
    title: 'תוכנית אימונים',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          <b>אירובי:</b> התוכנית שהמאמן בנה, מחולקת לשבועות כטבלה לפי ענף (כברירת
          מחדל פתוח השבוע הנוכחי)
        </li>
        <li>
          <b>כוח:</b> סוגי אימון (חזה/גב/רגליים), תרגילים עם סטים/חזרות/משקל,
          ו-<b>טיימר מנוחה</b> בין סטים
        </li>
        <li>
          כל אימון שבוצע מסומן כאן <b>✓</b> אוטומטית; שבועות שהסתיימו מתקפלים
          לשורת סיכום
        </li>
      </ul>
    ),
    page: 1,
    target: 'nav-program',
  },
  {
    icon: 'calendar',
    title: 'שיבוץ ליומן',
    body: (
      <ol className="space-y-1 list-decimal pr-4">
        <li>
          <b>התחבר וטען יומן</b> — מזינים שם יומן או מילת מפתח (למשל "אלבטרוס"),
          והאירועים הקיימים מוצגים כדי לראות מתי פנוי
        </li>
        <li>
          <b>המאמן משבץ את האימונים ללוח בעצמו</b> — ואז רק קובעים <b>שעה</b> לכל
          אימון
        </li>
        <li>
          <b>אשר ושלח ליומן</b> — הכל נכתב ליומן האישי שלך
        </li>
        <li>
          בחיבור הראשון גוגל תבקש אישור. אם תראה <b>"האפליקציה לא מאומתת"</b> —
          לחץ <b>מתקדם</b> ואז <b>המשך אל TriLife</b>; זו האפליקציה הזו
        </li>
      </ol>
    ),
    page: 2,
    target: 'nav-planning',
  },
  {
    icon: 'health',
    title: 'מעקב בריאות',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          <b>שינה:</b> ציון ושלבי שינה, מגמות ו<b>מאמן שינה</b> עם תובנות
          מותאמות — הכל מגרמין
        </li>
        <li>
          <b>בריאות יומית:</b> צעדים, דופק מנוחה, HRV מול הבסיס ו-VO₂max
        </li>
        <li>
          <b>משקל:</b> שקילות וגרף מגמה; המשקל האחרון מופיע גם בדף הבית
        </li>
        <li>
          <b>בדיקות:</b> סוג, תאריך ותוקף — האפליקציה מחשבת מתי הבאה
        </li>
      </ul>
    ),
    page: 3,
    target: 'nav-health',
  },
  {
    icon: 'watch',
    title: 'חיבור לגרמין',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          מחברים פעם אחת את חשבון <b>Garmin Connect</b> (כפתור הענן למעלה → קטע
          Garmin), והאפליקציה מושכת אוטומטית שינה, בריאות ואימונים
        </li>
        <li>
          כל אימון שגרמין רושם <b>מסמן וי אוטומטית</b> על האימון המתוכנן ליום
          הזה וממלא את הנתונים האמיתיים
        </li>
        <li>
          סנכרון אוטומטי בפתיחת האפליקציה (אם עברו יותר מ-6 שעות), או ידנית בכל
          רגע; טאב <b>סטטיסטיקות</b> בדף הבית מציג ניתוח עומק לכל ענף
        </li>
      </ul>
    ),
    target: 'sync',
  },
  {
    icon: 'chat',
    title: 'המאמן האישי (AI)',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>שואל על מה לעבוד — כוח / טריאתלון / שניהם — ובונה לך תוכנית</li>
        <li>
          <b>מכיר אותך:</b> רואה מה ביצעת, את התחושה (RPE) וההערות, ואת
          המחויבויות מהיומן שטענת — ו<b>מתכנן סביבן</b>
        </li>
        <li>
          כפתור <b>סכם לי את השבוע</b> — פידבק על מתוכנן מול בוצע והתאמות לשבוע
          הבא
        </li>
        <li>
          <b>חינם:</b> מפתח API מ-Google AI Studio (פעם אחת, נשמר במכשיר)
        </li>
      </ul>
    ),
    target: 'fab',
  },
  {
    icon: 'cloud',
    title: 'גיבוי וסנכרון',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          נתונים נשמרים במכשיר; כאן מגבים ומסנכרנים בין מכשירים דרך{' '}
          <b>Google Drive</b> שלך
        </li>
        <li>
          <b>גבה</b> במכשיר אחד ← <b>שחזר</b> בשני (מוצג גם מאיזה מכשיר ומתי גיבית)
        </li>
        <li>אפשר גם לגבות/לשחזר מקובץ, בלי גוגל</li>
      </ul>
    ),
    target: 'sync',
  },
  {
    icon: 'moon',
    title: 'מצב כהה והתקנה',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          <b>מצב כהה</b> — הכפתור הזה, נוח לעיניים בערב
        </li>
        <li>
          <b>התקנה כאפליקציה:</b> בטלפון "הוסף למסך הבית", במחשב אייקון ההתקנה
          בשורת הכתובת — נפתחת כמו אפליקציה ועובדת גם בלי אינטרנט
        </li>
      </ul>
    ),
    target: 'theme',
  },
  {
    icon: 'wallet',
    title: 'מעבר בין האפליקציות',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          הסרגל הדק שלמעלה מחליף במגע אחד בין <b>הרגלים</b>, <b>TriLife</b>{' '}
          (טריאתלון ובריאות) ו<b>פיננסים</b> (הוצאות והון) — אותו עיצוב, אותו
          גיבוי לענן
        </li>
        <li>הכול נשמר יחד — מעבר בין האפליקציות לא מאבד נתונים</li>
        <li>הצעדים הבאים מסבירים בקצרה מה יש באפליקציית הפיננסים</li>
      </ul>
    ),
    page: 0,
    target: 'app-tabs',
  },
  {
    icon: 'wallet',
    title: 'פיננסים · מעקב הוצאות',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          <b>טעינת אקסל</b> של כרטיס האשראי — העסקאות נכנסות וממוינות
          אוטומטית לקטגוריות
        </li>
        <li>
          <b>עוגת קטגוריות</b> וגרפי מגמה חודשיים; לחיצה על פרוסה מסננת את
          הרשימה, ויש <b>חיפוש</b> לפי בית עסק
        </li>
        <li>
          משכורת, הכנסות נוספות והעברות בנקאיות ידניות — לתמונת הכנסה־מול־הוצאה
          מלאה
        </li>
      </ul>
    ),
    app: 'finance',
    page: 0,
    target: 'fin-nav-expenses',
  },
  {
    icon: 'coins',
    title: 'פיננסים · הון והשקעות',
    body: (
      <ul className="space-y-1 list-disc pr-4">
        <li>
          חשבונות לפי סוג (חיסכון, השקעה, פנסיה, קרן השתלמות) עם <b>סה"כ הון</b>{' '}
          מתעדכן
        </li>
        <li>
          <b>מטרות חיסכון</b> עם יעד וסרגל התקדמות, וחישוב כמה להפקיד בחודש כדי
          להגיע ליעד
        </li>
        <li>
          תיעוד השקעות חודשיות וגרף <b>השקעה כאחוז מההכנסה</b> — לראות את שיעור
          החיסכון שלך
        </li>
      </ul>
    ),
    app: 'finance',
    page: 1,
    target: 'fin-nav-capital',
  },
  {
    icon: 'party',
    title: 'זהו, אתה מוכן!',
    body: (
      <>
        <p>ההמלצה שלי להתחלה:</p>
        <ol className="mt-1.5 space-y-1 list-decimal pr-4">
          <li>פתח את המאמן ובקש לבנות תוכנית</li>
          <li>מכל יום — סמן "בצעתי ✓" ודרג איך היה</li>
          <li>גבה לענן מדי פעם</li>
        </ol>
      </>
    ),
    page: 0,
  },
]

function findTarget(sel?: string): HTMLElement | null {
  if (!sel) return null
  const els = [...document.querySelectorAll<HTMLElement>(`[data-guide="${sel}"]`)]
  return (
    els.find((el) => {
      const r = el.getBoundingClientRect()
      return (
        r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      )
    }) ?? null
  )
}

export default function GuideOverlay({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const setGuideNav = useAppShell((s) => s.setGuideNav)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (open) setI(0)
  }, [open])

  const step = STEPS[i]

  // switch to the step's app + page (the shell reacts and each app scrolls)
  useEffect(() => {
    if (open) setGuideNav(step.app ?? 'tri', step.page ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i])

  // locate the target and keep tracking it (nav switch, scroll, resize)
  useEffect(() => {
    if (!open) return
    let tries = 0
    let timer: number
    const locate = () => {
      const el = findTarget(step.target)
      if (el || !step.target) {
        setRect(el ? el.getBoundingClientRect() : null)
      } else if (tries++ < 40) {
        // wait for the page to render — finance is lazy-loaded on first switch
        timer = window.setTimeout(locate, 90)
      }
    }
    locate()
    const onMove = () => {
      const el = findTarget(step.target)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i])

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
  const isFirst = i === 0
  const isLast = i === STEPS.length - 1

  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(360, vw - 16)

  let cardStyle: CSSProperties
  let placeBelow = true
  let arrowLeft = cardW / 2
  if (rect) {
    placeBelow = rect.top + rect.height / 2 < vh / 2
    const left = Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, 8), vw - cardW - 8)
    arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - left, 20), cardW - 20)
    cardStyle = placeBelow
      ? { position: 'fixed', top: rect.bottom + 14, left, width: cardW }
      : { position: 'fixed', bottom: vh - rect.top + 14, left, width: cardW }
  } else {
    cardStyle = {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: cardW,
    }
  }

  const pad = 6
  const highlightStyle: CSSProperties | null = rect
    ? {
        position: 'fixed',
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 14,
        boxShadow: '0 0 0 9999px rgba(20,18,16,0.55)',
        border: '2px solid rgb(var(--accent))',
      }
    : null

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {highlightStyle ? (
        <div key="spot" style={highlightStyle} />
      ) : (
        <div key="dim" className="fixed inset-0 bg-ink/50" />
      )}

      <div
        style={cardStyle}
        className="pointer-events-auto bg-surface border border-line shadow-pop rounded-2xl"
      >
        {rect && (
          <div
            className="absolute w-3 h-3 bg-surface rotate-45"
            style={
              placeBelow
                ? {
                    top: -6,
                    left: arrowLeft - 6,
                    borderTop: '1px solid rgb(var(--line))',
                    borderLeft: '1px solid rgb(var(--line))',
                  }
                : {
                    bottom: -6,
                    left: arrowLeft - 6,
                    borderBottom: '1px solid rgb(var(--line))',
                    borderRight: '1px solid rgb(var(--line))',
                  }
            }
          />
        )}

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-accent-soft grid place-items-center text-accent">
                <Icon name={step.icon} className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-muted">
                {i + 1}/{STEPS.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-sm text-muted hover:text-ink font-medium"
            >
              דלג ✕
            </button>
          </div>

          <h3 className="font-display text-lg font-bold mb-1.5">{step.title}</h3>
          <div className="text-ink leading-relaxed text-sm max-h-[42vh] overflow-auto">
            {step.body}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setI((v) => Math.max(0, v - 1))}
              disabled={isFirst}
              className="btn-ghost text-sm py-1.5 disabled:opacity-40"
            >
              הקודם
            </button>
            {isLast ? (
              <button onClick={onClose} className="btn-accent flex-1 text-sm py-1.5">
                יאללה, מתחילים!
              </button>
            ) : (
              <button
                onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
                className="btn-primary flex-1 text-sm py-1.5"
              >
                המשך →
              </button>
            )}
          </div>

          <div className="flex justify-center gap-1 mt-3">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`שלב ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? 'w-4 bg-accent' : 'w-1.5 bg-line hover:bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
