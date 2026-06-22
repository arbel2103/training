import { useEffect, useState } from 'react'
import {
  useStore,
  type AerobicIntensity,
  type Category,
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
import Modal from '../../components/ui/Modal'
import Segmented from '../../components/ui/Segmented'

export default function PlanFormModal({
  open,
  date,
  onClose,
}: {
  open: boolean
  date: string
  onClose: () => void
}) {
  const categories = useStore((s) => s.strengthCategories)
  const addPlanned = useStore((s) => s.addPlanned)

  const [category, setCategory] = useState<Category>('strength')
  const [strengthName, setStrengthName] = useState('')
  const [sport, setSport] = useState<Sport>('run')
  const [aerobicIntensity, setAerobicIntensity] = useState<AerobicIntensity>('easy')
  const [distance, setDistance] = useState<number | ''>('')
  const [otherName, setOtherName] = useState('')
  const [time, setTime] = useState('18:00')
  const [durationMin, setDurationMin] = useState(60)

  useEffect(() => {
    if (open) {
      setCategory('strength')
      setStrengthName(categories[0]?.name ?? '')
      setSport('run')
      setAerobicIntensity('easy')
      setDistance('')
      setOtherName('')
      setTime('18:00')
      setDurationMin(60)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = () => {
    const base = { date, time, durationMin, category }
    if (category === 'strength') {
      addPlanned({ ...base, strengthName: strengthName || undefined })
    } else if (category === 'aerobic') {
      addPlanned({
        ...base,
        sport,
        aerobicIntensity,
        distance: typeof distance === 'number' ? distance : undefined,
      })
    } else {
      addPlanned({ ...base, otherName: otherName || 'אימון' })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="תכנון אימון">
      <div className="text-sm text-muted mb-4">{formatFullDate(date)}</div>

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

      <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-line">
        <div className="w-32">
          <label className="label">שעה</label>
          <input
            type="time"
            dir="ltr"
            className="input text-center"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="w-32">
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

      <div className="flex justify-end gap-2 mt-7">
        <button onClick={onClose} className="btn-ghost">
          ביטול
        </button>
        <button onClick={save} className="btn-primary">
          הוסף לתכנון
        </button>
      </div>
    </Modal>
  )
}
