import { useState } from 'react'
import { useStore, type PlanSession } from '../store/useStore'
import {
  formatRange,
  intensityFromLabel,
  intensityFromPlanned,
  intraFuel,
  isEnduranceSport,
  practicalCarbs,
  sessionDurationMin,
  type FuelIntensity,
} from '../lib/fueling'
import { formatDuration } from '../lib/calc'
import { aerobicIntensityLabel } from '../lib/labels'
import Icon from './ui/Icon'

const bucketLabel: Record<FuelIntensity, string> = {
  easy: 'עצימות קלה',
  moderate: 'עצימות בינונית',
  hard: 'עצימות גבוהה',
}

/**
 * What to take in during one session, shown under it on the "today" tile.
 *
 * Reads the effort from the board's explicit intensity when the session is
 * scheduled, and falls back to the words on the session ("אינטרוולים",
 * "ארוכה") — a guess is still better than treating every session as moderate,
 * because intensity is what decides where inside the duration band you land.
 */
export default function FuelStrip({
  session,
  dateISO,
}: {
  session: PlanSession
  dateISO: string
}) {
  const planned = useStore((s) => s.planned)
  const log = useStore((s) => s.log)
  const [open, setOpen] = useState(false)

  const endurance = isEnduranceSport(session.sport)
  const durationMin = sessionDurationMin(session, log)
  const estimated = !session.durationMin && durationMin != null

  // the scheduled workout knows the effort; the plan session only hints at it
  const booking = planned.find(
    (p) => p.planSessionId === session.id && p.date === dateISO,
  )
  const intensity: FuelIntensity =
    intensityFromPlanned(booking?.aerobicIntensity) ??
    intensityFromLabel(session.label) ??
    'moderate'

  const fuel = intraFuel({ durationMin: durationMin ?? 0, intensity, endurance })

  // say it the way the user classified it — "ארוכה" is run easy, but calling a
  // three-hour ride "עצימות קלה" back at them just looks wrong
  const intensityText = booking?.aerobicIntensity
    ? aerobicIntensityLabel[booking.aerobicIntensity]
    : bucketLabel[intensity]
  const practical = fuel.needed ? practicalCarbs(fuel.carbsPerHour) : null

  if (!fuel.needed) {
    return (
      <p className="text-xs text-muted flex items-center gap-1.5 mt-2">
        <Icon name="fuel" className="w-3.5 h-3.5 shrink-0" />
        {fuel.reason}
      </p>
    )
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-start rounded-lg bg-accent-soft/50 px-2.5 py-1.5 transition hover:bg-accent-soft"
        title="תדלוק תוך כדי האימון — לחץ לפרטים"
      >
        <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-accent shrink-0">
            <Icon name="fuel" className="w-3.5 h-3.5" /> תוך כדי, לשעה
          </span>
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums">{fuel.carbsPerHour} גר׳</span>
            <span className="text-muted"> פחמימות</span>
          </span>
          <span className="whitespace-nowrap">
            <span className="font-semibold tabular-nums" dir="ltr">
              {fuel.sodiumMgPerHour.low}–{fuel.sodiumMgPerHour.high}
            </span>
            <span className="text-muted"> מ״ג נתרן</span>
          </span>
          <span className="text-muted ms-auto shrink-0">{open ? '▾' : '◂'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-line px-2.5 py-2 grid gap-1.5 text-xs">
          <Row
            label="פחמימות"
            value={`${fuel.carbsPerHour} גר׳/שעה · ${fuel.carbsTotal} גר׳ בסה״כ`}
          />
          {practical && <Row label="בפועל" value={practical} />}
          <Row label="נוזלים" value={`${formatRange(fuel.fluidMlPerHour, 'מ״ל')}/שעה`} />
          <Row
            label="נתרן"
            value={`${formatRange(fuel.sodiumMgPerHour, 'מ״ג')}/שעה`}
          />
          {fuel.hotWeather && (
            <Row
              label="בחום"
              value={`${formatRange(fuel.hotWeather.fluidMlPerHour, 'מ״ל')} נוזלים · ${formatRange(
                fuel.hotWeather.sodiumMgPerHour,
                'מ״ג',
              )} נתרן לשעה`}
            />
          )}
          <Row
            label="לפי"
            value={`${formatDuration(fuel.durationMin)}${estimated ? ' (הערכה)' : ''} · ${intensityText}`}
          />
          <ul className="text-muted leading-relaxed list-disc pe-4 mt-0.5 grid gap-1">
            {fuel.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted w-14 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
