import { useState } from 'react'
import PageHeader from '../../../components/ui/PageHeader'
import Ring from '../../../components/ui/Ring'
import Icon from '../../../components/ui/Icon'
import { toISODate } from '../../../lib/dates'
import { useStore } from '../store/useStore'
import { freezeDays, freezeLengthDays, openFreeze, todayProgress } from '../lib/habitMath'
import CategorySection from '../components/CategorySection'
import DayNote from '../components/DayNote'
import Snowfall from '../components/Snowfall'
import UnfreezeReview from '../components/UnfreezeReview'
import type { GlobalFreeze } from '../lib/types'

/** The one page: today's progress ring, the freeze control, and the accordion. */
export default function TodayPage() {
  const categories = useStore((s) => s.categories)
  const habits = useStore((s) => s.habits)
  const freezes = useStore((s) => s.freezes)
  const addCategory = useStore((s) => s.addCategory)
  const startGlobalFreeze = useStore((s) => s.startGlobalFreeze)
  const endGlobalFreeze = useStore((s) => s.endGlobalFreeze)

  const today = toISODate(new Date())
  const frozen = openFreeze(freezes)
  const prog = todayProgress(habits, freezes, today)

  const [addingCat, setAddingCat] = useState(false)
  const [catName, setCatName] = useState('')
  const [snowing, setSnowing] = useState(false)
  // the freeze that just ended, held so its days can be reviewed after the
  // store has already closed it — leaving everything frozen if this is dismissed
  const [reviewing, setReviewing] = useState<GlobalFreeze | null>(null)

  const sortedCats = [...categories].sort((a, b) => a.order - b.order)

  return (
    <div>
      <PageHeader
        title="הרגלים"
        subtitle="מעקב יומי, רצפים ואחוזי הצלחה."
        actions={
          <Ring
            value={frozen ? 100 : prog.pct}
            size={64}
            stroke={6}
            color={frozen ? 'rgb(var(--c-bike))' : 'rgb(var(--accent))'}
          >
            <div className="text-center leading-none">
              {frozen ? (
                <span className="text-xl">❄️</span>
              ) : (
                <div className="font-display text-lg font-black">{prog.pct}%</div>
              )}
            </div>
          </Ring>
        }
      />

      {/* field-mode control: freeze every habit at once */}
      {frozen ? (
        <div
          className="card p-4 mb-5 bg-bike/10"
          style={{ borderInlineStart: '4px solid rgb(var(--c-bike))' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">❄️</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-bike">האפליקציה מוקפאת</div>
              <div className="text-sm text-muted">
                כבר {freezeLengthDays(frozen, today)} ימים · הרצפים והאחוזים ממתינים
                לך, שום דבר לא נשבר.
              </div>
            </div>
            <button
              onClick={() => {
                endGlobalFreeze()
                // read the range back after it is closed rather than reusing
                // the open one: the review is about the days that stay frozen,
                // and today is a normal day again the moment you come back
                const closed = useStore
                  .getState()
                  .freezes.find((f) => f.start === frozen.start)
                if (closed && freezeDays(closed, today).length) setReviewing(closed)
              }}
              className="btn-primary shrink-0 text-sm"
            >
              המשך מעקב
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-5">
          <div className="text-sm text-muted">
            {prog.total > 0
              ? `בוצעו ${prog.done} מתוך ${prog.total} הרגלים היום`
              : 'התחל בהוספת הרגל ראשון'}
          </div>
          <button
            onClick={() => {
              if (
                window.confirm(
                  'להקפיא את כל ההרגלים? הימים עד שתבטל את ההקפאה לא ייספרו ולא ישברו רצף.',
                )
              ) {
                startGlobalFreeze()
                setSnowing(true)
              }
            }}
            className="btn-soft text-sm gap-1.5"
          >
            <span>❄️</span> הקפאה
          </button>
        </div>
      )}

      {/* a note for the day, offered once something was left undone */}
      {!frozen && <DayNote date={today} incomplete={prog.total > 0 && prog.done < prog.total} />}

      {/* categories accordion */}
      <div className="grid gap-3">
        {sortedCats.map((c, i) => (
          <CategorySection
            key={c.id}
            category={c}
            habits={habits}
            freezes={freezes}
            today={today}
            canMoveUp={i > 0}
            canMoveDown={i < sortedCats.length - 1}
          />
        ))}
      </div>

      {/* add category */}
      <div className="mt-4">
        {addingCat ? (
          <div className="flex gap-2">
            <input
              autoFocus
              className="input flex-1"
              placeholder="שם הקטגוריה…"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (catName.trim()) addCategory(catName.trim())
                  setCatName('')
                  setAddingCat(false)
                }
                if (e.key === 'Escape') {
                  setCatName('')
                  setAddingCat(false)
                }
              }}
            />
            <button
              onClick={() => {
                if (catName.trim()) addCategory(catName.trim())
                setCatName('')
                setAddingCat(false)
              }}
              className="btn-primary text-sm px-4"
            >
              הוסף
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="btn-ghost text-sm gap-1.5"
          >
            <Icon name="plus" className="w-4 h-4" /> קטגוריה חדשה
          </button>
        )}
      </div>

      {snowing && <Snowfall onDone={() => setSnowing(false)} />}
      {reviewing && (
        <UnfreezeReview
          freeze={reviewing}
          today={today}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  )
}
