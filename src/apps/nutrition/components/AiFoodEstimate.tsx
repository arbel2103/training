import { useEffect, useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Icon from '../../../components/ui/Icon'
import { getApiKey, hasApiKey } from '../../../lib/apiKey'
import { runCoach } from '../../../lib/coachApi'
import { useStore } from '../store/useStore'
import type { Food, FoodGroup } from '../lib/types'
import { foodGroupLabel } from '../lib/foods'

interface Estimate {
  name: string
  group: FoodGroup
  kcal: number
  carbs: number
  protein: number
  fat: number
  sodium?: number
  fiber?: number
  portions?: Record<string, number>
  note?: string
}

const GROUPS: FoodGroup[] = [
  'grain',
  'protein',
  'dairy',
  'vegetable',
  'fruit',
  'legume',
  'fat',
  'dish',
  'sports',
  'drink',
  'snack',
]

const SYSTEM = `אתה תזונאי ספורט שמעריך ערכים תזונתיים של מזונות, כולל מזון ישראלי ומנות של חדר אוכל.
תקבל שם של מזון ותחזיר אך ורק JSON תקין (בלי טקסט נוסף, בלי markdown) במבנה הבא:
{"name":"שם מדויק בעברית","group":"one of: grain|protein|dairy|vegetable|fruit|legume|fat|dish|sports|drink|snack","kcal":0,"carbs":0,"protein":0,"fat":0,"sodium":0,"fiber":0,"portions":{"servingSpoon":0,"ladle":0,"spoon":0,"cup":0,"plate":0,"unit":0},"note":"הערה קצרה על ההנחות שלך"}
כל הערכים התזונתיים הם ל-100 גרם של המזון כפי שאוכלים אותו (מבושל אם רלוונטי).
ב-portions כלול רק יחידות שהגיוניות למזון הזה, והערך הוא משקל בגרמים של יחידה אחת (למשל כף הגשה של אורז ≈ 90 גרם). אם יחידה לא רלוונטית — אל תכלול אותה.
היה מדויק וריאליסטי. אל תמציא ערכים קיצוניים.`

/** Ask the AI to estimate an unknown food's macros, then save it as a custom food. */
export default function AiFoodEstimate({
  open,
  name,
  onClose,
  onCreated,
}: {
  open: boolean
  name: string
  onClose: () => void
  onCreated: (f: Food) => void
}) {
  const addCustomFood = useStore((s) => s.addCustomFood)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [est, setEst] = useState<Estimate | null>(null)

  useEffect(() => {
    if (!open) {
      setEst(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  const run = async () => {
    setLoading(true)
    setError(null)
    setEst(null)
    try {
      const text = await runCoach({
        apiKey: getApiKey(),
        system: SYSTEM,
        messages: [{ role: 'user', content: name.trim() }],
        tools: [],
        onToolCall: () => '',
      })
      // the model may still wrap it in a code fence — pull out the JSON object
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('לא הצלחתי לפענח את התשובה')
      const raw = JSON.parse(match[0]) as Estimate
      if (typeof raw.kcal !== 'number' || typeof raw.carbs !== 'number') {
        throw new Error('התשובה לא הכילה ערכים תזונתיים')
      }
      setEst({
        ...raw,
        name: raw.name?.trim() || name.trim(),
        group: GROUPS.includes(raw.group) ? raw.group : 'dish',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בהערכה')
    } finally {
      setLoading(false)
    }
  }

  const save = () => {
    if (!est) return
    const portions: Food['portions'] = {}
    for (const [k, v] of Object.entries(est.portions ?? {})) {
      if (typeof v === 'number' && v > 0) {
        portions[k as keyof NonNullable<Food['portions']>] = Math.round(v)
      }
    }
    const created = addCustomFood({
      name: est.name,
      group: est.group,
      per100g: {
        kcal: Math.round(est.kcal),
        carbs: est.carbs,
        protein: est.protein,
        fat: est.fat,
        sodium: est.sodium,
        fiber: est.fiber,
      },
      portions: Object.keys(portions).length ? portions : undefined,
    })
    onCreated(created)
  }

  return (
    <Modal open={open} onClose={onClose} title="הערכת ערכים תזונתיים">
      {!hasApiKey() ? (
        <p className="text-sm text-muted leading-relaxed">
          כדי להשתמש בהערכה אוטומטית צריך מפתח AI. חבר אותו דרך <b>המאמן</b>{' '}
          ב-TriLife (הכפתור הצף בפינה).
        </p>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm text-muted leading-relaxed">
            ה-AI יעריך ערכים תזונתיים ל-100 גרם עבור <b>{name}</b>, וגם משקלים
            למנות (כף הגשה, מצקת וכו׳). זו הערכה — אפשר לתקן אחר כך.
          </p>

          {!est && (
            <button
              onClick={() => void run()}
              disabled={loading || !name.trim()}
              className="btn-accent disabled:opacity-50"
            >
              <Icon name="chat" className="w-4 h-4" />
              {loading ? 'מעריך…' : 'הערך עכשיו'}
            </button>
          )}

          {error && <p className="text-sm text-run">{error}</p>}

          {est && (
            <>
              <div className="rounded-xl bg-accent-soft/40 p-3">
                <div className="font-semibold mb-1">{est.name}</div>
                <div className="text-xs text-muted mb-2">{foodGroupLabel[est.group]}</div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-display text-2xl font-black">
                    {Math.round(est.kcal)}
                  </span>
                  <span className="text-sm text-muted">קק״ל ל-100 ג׳</span>
                </div>
                <div className="text-sm text-muted">
                  פחמימות {est.carbs} · חלבון {est.protein} · שומן {est.fat} ג׳
                  {est.sodium ? ` · נתרן ${est.sodium} מ״ג` : ''}
                </div>
                {est.note && (
                  <div className="text-xs text-muted mt-2 leading-relaxed">{est.note}</div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={save} className="btn-primary flex-1">
                  שמור והוסף
                </button>
                <button onClick={() => void run()} className="btn-ghost">
                  הערך שוב
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
