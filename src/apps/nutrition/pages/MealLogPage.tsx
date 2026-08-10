import { useState } from 'react'
import { useStore } from '../store/useStore'
import { dayTotals, slotTotals } from '../store/selectors'
import { describePortion } from '../lib/portions'
import { MEAL_SLOTS, mealSlotLabel, type MealSlot } from '../lib/types'
import AddFoodModal from '../components/AddFoodModal'
import DescribeMealModal from '../components/DescribeMealModal'
import Icon from '../../../components/ui/Icon'
import { addDays, formatFullDate, fromISO, toISODate } from '../../../lib/dates'

export default function MealLogPage() {
  const meals = useStore((s) => s.meals)
  const removeMeal = useStore((s) => s.removeMeal)
  const selectedDate = useStore((s) => s.selectedDate)
  const setSelectedDate = useStore((s) => s.setSelectedDate)

  const [adding, setAdding] = useState<MealSlot | null>(null)
  const [describing, setDescribing] = useState<MealSlot | null>(null)

  const todayISO = toISODate(new Date())
  const slots = slotTotals(meals, selectedDate)
  const totals = dayTotals(meals, selectedDate)

  const shiftDay = (n: number) =>
    setSelectedDate(toISODate(addDays(fromISO(selectedDate), n)))

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="font-display text-2xl font-black tracking-tight">יומן אכילה</h2>
        <p className="text-muted text-sm mt-0.5">
          הוסף מזון לפי מנות של חדר אוכל או לפי גרמים.
        </p>
      </div>

      {/* day picker */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => shiftDay(-1)} className="btn-ghost text-sm py-1.5 px-3">
          ← קודם
        </button>
        <div className="text-center min-w-0">
          <button
            onClick={() => setSelectedDate(todayISO)}
            className="font-semibold hover:text-accent truncate block"
          >
            {selectedDate === todayISO ? 'היום' : formatFullDate(selectedDate)}
          </button>
          <div className="text-sm text-muted">{totals.kcal} קק״ל</div>
        </div>
        <button
          onClick={() => shiftDay(1)}
          disabled={selectedDate >= todayISO}
          className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40"
        >
          הבא →
        </button>
      </div>

      {/* one card per meal slot */}
      {MEAL_SLOTS.map((slot) => {
        const s = slots.find((x) => x.slot === slot)!
        return (
          <div key={slot} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-bold">
                {mealSlotLabel[slot]}
                {s.totals.kcal > 0 && (
                  <span className="text-muted text-sm font-normal">
                    {' · '}
                    {s.totals.kcal} קק״ל
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDescribing(slot)}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink"
                  title="תאר במילים מה אכלת — בלי לשקול"
                >
                  <Icon name="chat" className="w-4 h-4" /> תאר
                </button>
                <button
                  onClick={() => setAdding(slot)}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                  <Icon name="plus" className="w-4 h-4" /> הוסף
                </button>
              </div>
            </div>

            {s.entries.length === 0 ? (
              <p className="text-sm text-muted">לא נרשם עדיין.</p>
            ) : (
              <div className="grid gap-2">
                {s.entries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 rounded-xl border border-line px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {e.foodName}
                        {e.estimated && (
                          <span className="ms-1.5 text-[10px] font-bold text-accent bg-accent-soft rounded px-1 py-0.5 align-middle">
                            הערכה
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {/* an estimate must never read like a measured portion.
                            isolate so the ~ stays glued to the left of the digits in RTL */}
                        {e.estimated
                          ? `⁦~${Math.round(e.grams)}⁩ ג׳`
                          : describePortion(e.qty, e.unit, e.grams)}
                        {' · '}
                        פ {e.nutrients.carbs} · ח {e.nutrients.protein} · ש{' '}
                        {e.nutrients.fat}
                      </div>
                      {e.describedAs && (
                        <div className="text-[11px] text-muted/80 truncate mt-0.5">
                          "{e.describedAs}"
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold shrink-0 whitespace-nowrap">
                      {e.nutrients.kcal}
                      <span className="text-muted font-normal text-xs"> קק״ל</span>
                    </span>
                    <button
                      onClick={() => removeMeal(e.id)}
                      className="text-muted hover:text-run shrink-0"
                      aria-label="מחק"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* day totals */}
      {totals.kcal > 0 && (
        <div className="card p-5">
          <h3 className="font-display text-lg font-bold mb-2">סה״כ היום</h3>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display text-3xl font-black">{totals.kcal}</span>
            <span className="text-sm text-muted">קק״ל</span>
          </div>
          <div className="text-sm text-muted">
            פחמימות {totals.carbs} · חלבון {totals.protein} · שומן {totals.fat} ג׳
            {totals.sodium ? ` · נתרן ${totals.sodium} מ״ג` : ''}
            {totals.fiber ? ` · סיבים ${totals.fiber} ג׳` : ''}
          </div>
        </div>
      )}

      {adding && (
        <AddFoodModal
          open
          slot={adding}
          date={selectedDate}
          onClose={() => setAdding(null)}
          onDescribe={() => {
            const slot = adding
            setAdding(null)
            setDescribing(slot)
          }}
        />
      )}

      {describing && (
        <DescribeMealModal
          slot={describing}
          date={selectedDate}
          onClose={() => setDescribing(null)}
        />
      )}
    </div>
  )
}
