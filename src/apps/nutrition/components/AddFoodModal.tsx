import { useMemo, useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Icon from '../../../components/ui/Icon'
import { useStore } from '../store/useStore'
import { allFoods, foodGroupLabel, searchFoods } from '../lib/foods'
import {
  nutrientsForGrams,
  portionLabel,
  toGrams,
  unitsFor,
} from '../lib/portions'
import type { Food, MealSlot, PortionUnit } from '../lib/types'
import { mealSlotLabel } from '../lib/types'
import AiFoodEstimate from './AiFoodEstimate'

/** Search a food, choose a portion, log it. */
export default function AddFoodModal({
  open,
  slot,
  date,
  onClose,
}: {
  open: boolean
  slot: MealSlot
  date: string
  onClose: () => void
}) {
  const customFoods = useStore((s) => s.customFoods)
  const addMeal = useStore((s) => s.addMeal)

  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Food | null>(null)
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState<PortionUnit>('gram')
  const [aiOpen, setAiOpen] = useState(false)

  const foods = useMemo(() => allFoods(customFoods), [customFoods])
  const results = useMemo(() => searchFoods(foods, query), [foods, query])

  const reset = () => {
    setQuery('')
    setPicked(null)
    setQty('1')
    setUnit('gram')
    setAiOpen(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const choose = (f: Food) => {
    setPicked(f)
    const units = unitsFor(f)
    // default to the most natural serving unit, not raw grams
    setUnit(units.find((u) => u !== 'gram') ?? 'gram')
    setQty('1')
  }

  const qtyNum = Number(qty.replace(',', '.'))
  const grams = picked ? toGrams(picked, qtyNum, unit) : 0
  const preview = picked ? nutrientsForGrams(picked.per100g, grams) : null

  const save = () => {
    if (!picked || grams <= 0 || !preview) return
    addMeal({
      date,
      slot,
      foodId: picked.id,
      foodName: picked.name,
      qty: qtyNum,
      unit,
      grams,
      nutrients: preview,
    })
    close()
  }

  return (
    <Modal open={open} onClose={close} title={`הוספה ל${mealSlotLabel[slot]}`}>
      {!picked ? (
        <div className="grid gap-3">
          <div className="relative">
            <Icon
              name="search"
              className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted pointer-events-none"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש מזון — למשל אורז, חזה עוף, פיתה…"
              className="input w-full ps-9"
            />
          </div>

          <div className="grid gap-1 max-h-[50vh] overflow-y-auto">
            {results.map((f) => (
              <button
                key={f.id}
                onClick={() => choose(f)}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-start hover:border-accent hover:bg-accent-soft/30 transition"
              >
                <span className="min-w-0">
                  <span className="font-semibold block leading-tight truncate">
                    {f.name}
                    {f.custom && (
                      <span className="text-xs text-accent font-normal"> · שלי</span>
                    )}
                  </span>
                  <span className="text-xs text-muted">{foodGroupLabel[f.group]}</span>
                </span>
                <span className="text-sm text-muted shrink-0">
                  {f.per100g.kcal} קק״ל/100ג׳
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted mb-3">
                  לא נמצא "{query}" במאגר.
                </p>
                <button onClick={() => setAiOpen(true)} className="btn-accent text-sm">
                  <Icon name="chat" className="w-4 h-4" /> בקש מה-AI להעריך
                </button>
              </div>
            )}
          </div>

          {results.length > 0 && query.trim() !== '' && (
            <button
              onClick={() => setAiOpen(true)}
              className="text-sm text-accent hover:opacity-80 transition self-start"
            >
              לא מצאת? בקש מה-AI להעריך "{query}"
            </button>
          )}

          <AiFoodEstimate
            open={aiOpen}
            name={query}
            onClose={() => setAiOpen(false)}
            onCreated={(f) => {
              setAiOpen(false)
              choose(f)
            }}
          />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{picked.name}</div>
              <div className="text-xs text-muted">{foodGroupLabel[picked.group]}</div>
            </div>
            <button
              onClick={() => setPicked(null)}
              className="text-sm text-accent hover:opacity-80 shrink-0"
            >
              החלף
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">כמות</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">יחידה</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as PortionUnit)}
                className="input w-full"
              >
                {unitsFor(picked).map((u) => (
                  <option key={u} value={u}>
                    {portionLabel[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {preview && grams > 0 && (
            <div className="rounded-xl bg-accent-soft/40 p-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-display text-2xl font-black">{preview.kcal}</span>
                <span className="text-sm text-muted">קק״ל · {grams} ג׳</span>
              </div>
              <div className="text-sm text-muted">
                פחמימות {preview.carbs} · חלבון {preview.protein} · שומן {preview.fat} ג׳
                {preview.sodium ? ` · נתרן ${preview.sodium} מ״ג` : ''}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={grams <= 0}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              הוסף
            </button>
            <button onClick={close} className="btn-ghost">
              ביטול
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
