import { useEffect, useState } from 'react'
import {
  useStore,
  type AerobicIntensity,
  type Category,
  type PlannedWorkout,
  type Sport,
} from '../../store/useStore'
import {
  SPORTS,
  aerobicIntensitiesFor,
  aerobicIntensityLabel,
  categoryLabel,
  sportIcon,
  sportLabel,
} from '../../lib/labels'
import { sportUnit } from '../../lib/calc'
import { formatFullDate } from '../../lib/dates'
import { conflictsFor } from '../../lib/scheduling'
import Modal from '../../components/ui/Modal'
import Segmented from '../../components/ui/Segmented'

export default function PlanFormModal({
  open,
  date,
  plan: editing,
  prefill,
  onClose,
}: {
  open: boolean
  date: string
  /** when provided, the form edits this planned workout instead of adding one */
  plan?: PlannedWorkout | null
  /** seed a new workout (used when scheduling a session from the plan) */
  prefill?: Partial<PlannedWorkout> | null
  onClose: () => void
}) {
  const categories = useStore((s) => s.strengthCategories)
  const addPlanned = useStore((s) => s.addPlanned)
  const updatePlanned = useStore((s) => s.updatePlanned)
  const calendarBusy = useStore((s) => s.calendarBusy)

  const [day, setDay] = useState(date)
  const [category, setCategory] = useState<Category>('strength')
  const [strengthName, setStrengthName] = useState('')
  const [sport, setSport] = useState<Sport>('run')
  const [aerobicIntensity, setAerobicIntensity] = useState<AerobicIntensity>('easy')
  const [distance, setDistance] = useState<number | ''>('')
  const [otherName, setOtherName] = useState('')
  const [time, setTime] = useState('18:00')
  const [durationMin, setDurationMin] = useState(60)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setDay(editing.date)
      setCategory(editing.category)
      setStrengthName(editing.strengthName ?? categories[0]?.name ?? '')
      setSport(editing.sport ?? 'run')
      setAerobicIntensity(editing.aerobicIntensity ?? 'easy')
      setDistance(editing.distance ?? '')
      setOtherName(editing.otherName ?? '')
      setTime(editing.time || '18:00')
      setDurationMin(editing.durationMin || 60)
      return
    }
    setDay(prefill?.date ?? date)
    setCategory(prefill?.category ?? 'strength')
    setStrengthName(prefill?.strengthName ?? categories[0]?.name ?? '')
    setSport(prefill?.sport ?? 'run')
    setAerobicIntensity(prefill?.aerobicIntensity ?? 'easy')
    setDistance(prefill?.distance ?? '')
    setOtherName(prefill?.otherName ?? '')
    setTime(prefill?.time ?? '18:00')
    setDurationMin(prefill?.durationMin ?? 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, date, prefill])

  const dayEvents = calendarBusy.filter((b) => b.date === day)
  const clashes = conflictsFor(time, durationMin, dayEvents)

  const save = () => {
    const base = {
      date: day,
      time,
      durationMin,
      category,
      // keep the link back to the plan session so the pool knows it's scheduled
      ...(editing ? {} : { planSessionId: prefill?.planSessionId }),
    }
    const payload =
      category === 'strength'
        ? {
            ...base,
            strengthName: strengthName || undefined,
            sport: undefined,
            aerobicIntensity: undefined,
            distance: undefined,
            otherName: undefined,
          }
        : category === 'aerobic'
          ? {
              ...base,
              sport,
              aerobicIntensity,
              distance: typeof distance === 'number' ? distance : undefined,
              strengthName: undefined,
              otherName: undefined,
            }
          : {
              ...base,
              otherName: otherName || 'אימון',
              sport: undefined,
              aerobicIntensity: undefined,
              distance: undefined,
              strengthName: undefined,
            }

    if (editing) updatePlanned(editing.id, payload)
    else addPlanned(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'עריכת אימון מתוכנן' : 'תכנון אימון'}
    >
      <div className="text-sm text-muted mb-4">{formatFullDate(day)}</div>

      <div className="mb-5">
        <label className="label">סוג אימון</label>
        <Segmented
          value={category}
          onChange={setCategory}
          options={(['strength', 'aerobic', 'other'] as Category[]).map((c) => ({
            value: c,
            label: categoryLabel[c],
          }))}
        />
      </div>

      {category === 'strength' && (
        <div>
          <label className="label">סוג אימון כוח</label>
          {categories.length === 0 ? (
            <p className="text-sm text-muted">
              אין עדיין אימוני כוח. הוסף אותם בעמוד <b>תוכנית אימונים</b>.
            </p>
          ) : (
            <select
              className="input"
              value={strengthName}
              onChange={(e) => setStrengthName(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {category === 'aerobic' && (
        <div className="grid gap-4">
          <div>
            <label className="label">ספורט</label>
            <Segmented
              value={sport}
              onChange={(s) => {
                setSport(s)
                setAerobicIntensity('easy')
              }}
              options={SPORTS.map((s) => ({
                value: s,
                label: `${sportIcon[s]} ${sportLabel[s]}`,
              }))}
            />
          </div>
          <div>
            <label className="label">עצימות</label>
            <Segmented
              value={aerobicIntensity}
              onChange={setAerobicIntensity}
              options={aerobicIntensitiesFor(sport).map((i) => ({
                value: i,
                label: aerobicIntensityLabel[i],
              }))}
            />
          </div>
          <div className="w-40">
            <label className="label">מרחק מתוכנן ({sportUnit(sport)})</label>
            <input
              type="number"
              min={0}
              step="0.1"
              className="input"
              value={distance}
              onChange={(e) =>
                setDistance(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
        </div>
      )}

      {category === 'other' && (
        <div>
          <label className="label">שם האימון</label>
          <input
            className="input"
            placeholder="לדוגמה: יוגה…"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
          />
        </div>
      )}

      <div className="mt-5 pt-5 border-t border-line grid gap-3">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-40">
            <label className="label">תאריך</label>
            <input
              type="date"
              className="input text-sm"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
          <div className="w-28">
            <label className="label">שעה</label>
            <input
              type="time"
              dir="ltr"
              className="input text-center"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="w-28">
            <label className="label">משך (דקות)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {clashes.length > 0 && (
          <p className="text-sm text-run leading-relaxed">
            ⚠️ מתנגש עם: {clashes.map((c) => c.title).join(' · ')}
          </p>
        )}
        {dayEvents.length === 0 && (
          <p className="text-xs text-muted">
            טען את היומן כדי שנוכל לזהות התנגשויות ולהציע שעה פנויה.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-7">
        <button onClick={onClose} className="btn-ghost">
          ביטול
        </button>
        <button onClick={save} className="btn-primary">
          {editing ? 'שמור שינויים' : 'הוסף לתכנון'}
        </button>
      </div>
    </Modal>
  )
}
