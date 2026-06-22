import { useEffect, useState } from 'react'
import {
  useStore,
  type AerobicIntensity,
  type Category,
  type Sport,
  type StrengthIntensity,
  type TimeOfDay,
  type WorkoutEntry,
} from '../../store/useStore'
import {
  SPORTS,
  STRENGTH_INTENSITIES,
  TIMES_OF_DAY,
  aerobicIntensitiesFor,
  aerobicIntensityLabel,
  categoryLabel,
  sportIcon,
  sportLabel,
  strengthIntensityLabel,
  timeOfDayLabel,
} from '../../lib/labels'
import { computeAerobicDuration, formatDuration, sportUnit } from '../../lib/calc'
import Modal from '../../components/ui/Modal'
import Segmented from '../../components/ui/Segmented'
import PaceInput from '../../components/ui/PaceInput'
import { formatFullDate } from '../../lib/dates'

export default function WorkoutFormModal({
  open,
  date,
  onClose,
}: {
  open: boolean
  date: string
  onClose: () => void
}) {
  const categories = useStore((s) => s.strengthCategories)
  const addEntry = useStore((s) => s.addEntry)

  const [category, setCategory] = useState<Category>('strength')
  const [strengthName, setStrengthName] = useState('')
  const [intensity, setIntensity] = useState<StrengthIntensity>('medium')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('evening')
  const [durationMin, setDurationMin] = useState<number | ''>('')

  const [sport, setSport] = useState<Sport>('run')
  const [distance, setDistance] = useState<number | ''>('')
  const [aerobicIntensity, setAerobicIntensity] = useState<AerobicIntensity>('easy')
  const [paceSec, setPaceSec] = useState<number | undefined>(undefined)
  const [speedKmh, setSpeedKmh] = useState<number | ''>('')

  const [otherName, setOtherName] = useState('')

  // reset when reopened
  useEffect(() => {
    if (open) {
      setCategory('strength')
      setStrengthName(categories[0]?.name ?? '')
      setIntensity('medium')
      setTimeOfDay('evening')
      setDurationMin('')
      setSport('run')
      setDistance('')
      setAerobicIntensity('easy')
      setPaceSec(undefined)
      setSpeedKmh('')
      setOtherName('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const computedDuration =
    category === 'aerobic'
      ? computeAerobicDuration({
          sport,
          distance: typeof distance === 'number' ? distance : undefined,
          paceSec,
          speedKmh: typeof speedKmh === 'number' ? speedKmh : undefined,
        })
      : undefined

  const save = () => {
    const base = { date, category } as WorkoutEntry
    let entry: Omit<WorkoutEntry, 'id'>
    if (category === 'strength') {
      entry = {
        ...base,
        strengthName: strengthName || undefined,
        intensity,
        timeOfDay,
        durationMin: typeof durationMin === 'number' ? durationMin : undefined,
      }
    } else if (category === 'aerobic') {
      entry = {
        ...base,
        sport,
        distance: typeof distance === 'number' ? distance : undefined,
        aerobicIntensity,
        paceSec: sport === 'bike' ? undefined : paceSec,
        speedKmh: sport === 'bike' && typeof speedKmh === 'number' ? speedKmh : undefined,
        durationMin: computedDuration,
      }
    } else {
      entry = {
        ...base,
        otherName: otherName || 'אימון',
        durationMin: typeof durationMin === 'number' ? durationMin : undefined,
      }
    }
    addEntry(entry)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="הוספת אימון">
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
        <div className="grid gap-4">
          <div>
            <label className="label">אימון כוח</label>
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
          <div>
            <label className="label">עצימות</label>
            <Segmented
              value={intensity}
              onChange={setIntensity}
              options={STRENGTH_INTENSITIES.map((i) => ({
                value: i,
                label: strengthIntensityLabel[i],
              }))}
            />
          </div>
          <div>
            <label className="label">שעת האימון</label>
            <Segmented
              value={timeOfDay}
              onChange={setTimeOfDay}
              options={TIMES_OF_DAY.map((t) => ({
                value: t,
                label: timeOfDayLabel[t],
              }))}
            />
          </div>
          <div className="w-40">
            <label className="label">משך (דקות)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={durationMin}
              onChange={(e) =>
                setDurationMin(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
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
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <label className="label">מרחק ({sportUnit(sport)})</label>
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
            {sport === 'bike' ? (
              <div className="w-40">
                <label className="label">מהירות (קמ״ש)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  dir="ltr"
                  className="input text-center"
                  value={speedKmh}
                  onChange={(e) =>
                    setSpeedKmh(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
            ) : (
              <div className="w-40">
                <label className="label">
                  קצב ({sport === 'swim' ? 'ל-100מ׳' : 'לק״מ'})
                </label>
                <PaceInput value={paceSec} onChange={setPaceSec} />
              </div>
            )}
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
          <div className="chip w-fit">
            משך מחושב: <b>{formatDuration(computedDuration)}</b>
          </div>
        </div>
      )}

      {category === 'other' && (
        <div className="grid gap-4">
          <div>
            <label className="label">שם האימון</label>
            <input
              className="input"
              placeholder="לדוגמה: יוגה, קרב מגע…"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
            />
          </div>
          <div className="w-40">
            <label className="label">משך (דקות)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={durationMin}
              onChange={(e) =>
                setDurationMin(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-7">
        <button onClick={onClose} className="btn-ghost">
          ביטול
        </button>
        <button onClick={save} className="btn-primary">
          שמירה
        </button>
      </div>
    </Modal>
  )
}
