import { useEffect, useState } from 'react'
import {
  useStore,
  type AerobicIntensity,
  type PlanSession,
  type Sport,
  type StrengthIntensity,
  type TimeOfDay,
} from '../store/useStore'
import {
  STRENGTH_INTENSITIES,
  TIMES_OF_DAY,
  aerobicIntensitiesFor,
  aerobicIntensityLabel,
  sportIcon,
  sportLabel,
  strengthIntensityLabel,
  timeOfDayLabel,
} from '../lib/labels'
import { computeAerobicDuration, formatDuration, sportUnit } from '../lib/calc'
import { formatFullDate } from '../lib/dates'
import Modal from './ui/Modal'
import Segmented from './ui/Segmented'
import PaceInput from './ui/PaceInput'
import RpeSelector from './ui/RpeSelector'

function intensityFromLabel(label?: string): AerobicIntensity {
  if (!label) return 'easy'
  if (label.includes('טכניק')) return 'technique'
  if (label.includes('ארוכ')) return 'long'
  if (label.includes('עצימ') || label.includes('אינטרוול') || label.includes('מהיר'))
    return 'intense'
  return 'easy'
}

function defaultTimeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'noon'
  return 'evening'
}

/**
 * One-tap completion of a planned session: pre-filled from the plan, asks
 * only for what the plan doesn't know (pace/speed), and logs the workout.
 */
export default function QuickCompleteModal({
  session,
  date,
  onClose,
}: {
  session: PlanSession | null
  date: string
  onClose: () => void
}) {
  const addEntry = useStore((s) => s.addEntry)

  const [distance, setDistance] = useState<number | ''>('')
  const [paceSec, setPaceSec] = useState<number | undefined>(undefined)
  const [speedKmh, setSpeedKmh] = useState<number | ''>('')
  const [aerobicIntensity, setAerobicIntensity] = useState<AerobicIntensity>('easy')
  const [intensity, setIntensity] = useState<StrengthIntensity>('medium')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('evening')
  const [durationMin, setDurationMin] = useState<number | ''>('')
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (session) {
      setDistance(session.distance ?? '')
      setPaceSec(undefined)
      setSpeedKmh('')
      setAerobicIntensity(intensityFromLabel(session.label))
      setIntensity('medium')
      setTimeOfDay(defaultTimeOfDay())
      setDurationMin(session.durationMin ?? '')
      setRpe(undefined)
      setNote('')
    }
  }, [session])

  if (!session) return null

  // narrow PlanSport → Sport inside the ternary so `sport` is Sport | undefined
  const sport: Sport | undefined =
    session.sport === 'run' ||
    session.sport === 'bike' ||
    session.sport === 'swim'
      ? session.sport
      : undefined
  const isAerobic = sport !== undefined

  const computedDuration =
    isAerobic && sport
      ? computeAerobicDuration({
          sport,
          distance: typeof distance === 'number' ? distance : undefined,
          paceSec,
          speedKmh: typeof speedKmh === 'number' ? speedKmh : undefined,
        })
      : undefined

  const save = () => {
    const debrief = { rpe, note: note.trim() || undefined }
    if (isAerobic && sport) {
      addEntry({
        date,
        category: 'aerobic',
        sport,
        distance: typeof distance === 'number' ? distance : undefined,
        aerobicIntensity,
        paceSec: sport === 'bike' ? undefined : paceSec,
        speedKmh:
          sport === 'bike' && typeof speedKmh === 'number' ? speedKmh : undefined,
        durationMin: computedDuration,
        ...debrief,
      })
    } else if (session.sport === 'strength') {
      addEntry({
        date,
        category: 'strength',
        strengthName: session.label || undefined,
        intensity,
        timeOfDay,
        durationMin: typeof durationMin === 'number' ? durationMin : undefined,
        ...debrief,
      })
    } else {
      addEntry({
        date,
        category: 'other',
        otherName: session.label || 'אימון',
        durationMin: typeof durationMin === 'number' ? durationMin : undefined,
        ...debrief,
      })
    }
    onClose()
  }

  const title = isAerobic
    ? `${sportIcon[session.sport as 'run']} ${sportLabel[session.sport as 'run']}${session.label ? ` · ${session.label}` : ''}`
    : session.sport === 'strength'
      ? `💪 ${session.label || 'אימון כוח'}`
      : `✨ ${session.label || 'אימון'}`

  return (
    <Modal open onClose={onClose} title={`בצעתי ✓ — ${title}`}>
      <div className="text-sm text-muted mb-4">{formatFullDate(date)}</div>

      {isAerobic && sport ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-36">
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
              <div className="w-36">
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
                  autoFocus
                />
              </div>
            ) : (
              <div className="w-36">
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
      ) : (
        <div className="grid gap-4">
          {session.sport === 'strength' && (
            <>
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
            </>
          )}
          <div className="w-36">
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

      {/* post-workout debrief — optional, feeds the coach */}
      <div className="mt-5 pt-5 border-t border-line grid gap-3">
        <div>
          <label className="label">איך היה? (עצימות מאמץ)</label>
          <RpeSelector value={rpe} onChange={setRpe} />
        </div>
        <div>
          <label className="label">הערה למאמן (אופציונלי)</label>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="למשל: הרגליים היו כבדות, כאב קל בברך…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-7">
        <button onClick={onClose} className="btn-ghost">
          ביטול
        </button>
        <button onClick={save} className="btn-primary">
          שמור ✓
        </button>
      </div>
    </Modal>
  )
}
