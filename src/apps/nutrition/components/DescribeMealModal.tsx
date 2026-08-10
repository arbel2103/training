import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Icon from '../../../components/ui/Icon'
import { getApiKey, hasApiKey } from '../../../lib/apiKey'
import { runCoach } from '../../../lib/coachApi'
import { useStore } from '../store/useStore'
import { sumNutrients } from '../lib/portions'
import {
  DESCRIBE_SYSTEM,
  parseDescribedMeal,
  rescaleItem,
  type DescribedItem,
} from '../lib/describeMeal'
import { DESCRIBED_FOOD_ID, mealSlotLabel, type MealSlot } from '../lib/types'

const EXAMPLES = [
  '6 קציצות קטנות של חדר אוכל עם רוטב',
  'צלחת אורז עם חזה עוף וסלט',
  'פיתה עם חומוס וטחינה',
]

/**
 * Describe a meal in plain Hebrew and let the AI split it into diary items with
 * estimated weights, which the user can correct before logging. Mounted only
 * while open, so every open starts from clean state.
 */
export default function DescribeMealModal({
  slot,
  date,
  initialText = '',
  onClose,
}: {
  slot: MealSlot
  date: string
  initialText?: string
  onClose: () => void
}) {
  const addMeal = useStore((s) => s.addMeal)

  const [text, setText] = useState(initialText)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<DescribedItem[] | null>(null)
  const [assumptions, setAssumptions] = useState<string | undefined>()
  /** the sentence the items were parsed from, kept even if the box is edited */
  const [describedAs, setDescribedAs] = useState('')

  const analyze = async () => {
    const q = text.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setItems(null)
    try {
      const reply = await runCoach({
        apiKey: getApiKey(),
        system: DESCRIBE_SYSTEM,
        messages: [{ role: 'user', content: q }],
        tools: [],
        onToolCall: () => '',
      })
      const meal = parseDescribedMeal(reply)
      setItems(meal.items)
      setAssumptions(meal.assumptions)
      setDescribedAs(q)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בניתוח התיאור')
    } finally {
      setLoading(false)
    }
  }

  const setGrams = (i: number, grams: number) =>
    setItems((prev) =>
      prev ? prev.map((it, idx) => (idx === i ? rescaleItem(it, grams) : it)) : prev,
    )

  const removeItem = (i: number) =>
    setItems((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev))

  const saveAll = () => {
    if (!items?.length) return
    for (const it of items) {
      if (it.grams <= 0) continue
      addMeal({
        date,
        slot,
        foodId: DESCRIBED_FOOD_ID,
        foodName: it.name,
        qty: 1,
        unit: 'gram',
        grams: it.grams,
        nutrients: it.nutrients,
        estimated: true,
        describedAs,
      })
    }
    onClose()
  }

  const totals = items ? sumNutrients(items.map((i) => i.nutrients)) : null
  const totalGrams = items ? items.reduce((s, i) => s + i.grams, 0) : 0

  return (
    <Modal open onClose={onClose} title={`תאר מה אכלת · ${mealSlotLabel[slot]}`}>
      {!hasApiKey() ? (
        <p className="text-sm text-muted leading-relaxed">
          כדי לתאר ארוחה במילים צריך מפתח AI. חבר אותו דרך <b>המאמן</b> ב-TriLife
          (הכפתור הצף בפינה).
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">מה אכלת?</label>
            <textarea
              autoFocus
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="למשל: 6 קציצות יחסית קטנות של חדר אוכל עם רוטב"
              className="input w-full resize-none"
            />
            {!items && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setText(ex)}
                    className="chip text-xs hover:border-accent hover:text-accent transition"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => void analyze()}
            disabled={loading || !text.trim()}
            className="btn-accent disabled:opacity-50"
          >
            <Icon name="chat" className="w-4 h-4" />
            {loading ? 'מנתח…' : items ? 'נתח מחדש' : 'נתח'}
          </button>

          {error && <p className="text-sm text-run">{error}</p>}

          {items && (
            <>
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h4 className="font-semibold text-sm">מה זיהיתי</h4>
                  <span className="text-xs text-muted">
                    אפשר לתקן את המשקלים לפני ההוספה
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-sm text-muted">הסרת את כל הפריטים.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-line px-3 py-2 grid gap-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm flex-1 min-w-0 truncate">
                            {it.name}
                          </span>
                          <span className="text-sm font-bold shrink-0 whitespace-nowrap">
                            {it.nutrients.kcal}
                            <span className="text-muted font-normal text-xs"> קק״ל</span>
                          </span>
                          <button
                            onClick={() => removeItem(i)}
                            className="text-muted hover:text-run shrink-0"
                            aria-label="הסר"
                          >
                            <Icon name="x" className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="10"
                            value={it.grams}
                            onChange={(e) => setGrams(i, Number(e.target.value))}
                            className="input w-24 py-1 text-sm"
                            aria-label={`משקל ${it.name} בגרמים`}
                          />
                          <span className="text-xs text-muted">גרם</span>
                          <span className="text-xs text-muted truncate">
                            · פ {it.nutrients.carbs} · ח {it.nutrients.protein} · ש{' '}
                            {it.nutrients.fat}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {assumptions && (
                <div className="flex items-start gap-1.5 text-xs text-muted leading-relaxed">
                  <Icon name="bulb" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{assumptions}</span>
                </div>
              )}

              {totals && items.length > 0 && (
                <div className="rounded-xl bg-accent-soft/40 p-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-display text-2xl font-black">{totals.kcal}</span>
                    <span className="text-sm text-muted">
                      קק״ל · {totalGrams} ג׳ · {items.length} פריטים
                    </span>
                  </div>
                  <div className="text-sm text-muted">
                    פחמימות {totals.carbs} · חלבון {totals.protein} · שומן {totals.fat} ג׳
                    {totals.sodium ? ` · נתרן ${totals.sodium} מ״ג` : ''}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={saveAll}
                  disabled={!items.some((i) => i.grams > 0)}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  הוסף הכל
                </button>
                <button onClick={onClose} className="btn-ghost">
                  ביטול
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
