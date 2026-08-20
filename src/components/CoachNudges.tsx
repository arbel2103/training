import { useStore } from '../store/useStore'
import { toISODate } from '../lib/dates'
import { askCoach } from '../lib/coachBus'
import { buildNudges, type NudgeTone } from '../lib/nudges'
import Icon, { type IconName } from '../components/ui/Icon'

// full class strings, not built from a variable, so Tailwind keeps them
const tone: Record<NudgeTone, { bg: string; text: string; rule: string; icon: IconName }> = {
  warn: { bg: 'bg-run/10', text: 'text-run', rule: 'rgb(var(--c-run))', icon: 'warning' },
  info: { bg: 'bg-accent-soft', text: 'text-accent', rule: 'rgb(var(--accent))', icon: 'bulb' },
  good: { bg: 'bg-bike/10', text: 'text-bike', rule: 'rgb(var(--c-bike))', icon: 'flag' },
}

/** At most this many at once — a wall of advice is advice nobody reads. */
const MAX_SHOWN = 2

/**
 * The coach speaking first.
 *
 * Every rule behind these runs locally on the data already in the app, so they
 * appear instantly and work with no API key at all. What they don't do is act:
 * each one hands its question to the coach on a tap, and the coach still has to
 * propose a plan change for the athlete to approve. Noticing is automatic;
 * changing the plan stays a decision.
 */
export default function CoachNudges() {
  const log = useStore((s) => s.log)
  const plan = useStore((s) => s.trainingPlan)
  const garminDaily = useStore((s) => s.garminDaily)
  const dismissed = useStore((s) => s.dismissedNudges)
  const dismissNudge = useStore((s) => s.dismissNudge)

  const today = toISODate(new Date())
  const nudges = buildNudges({ today, log, plan, garminDaily })
    // a dismissal lasts the day: tomorrow it is worth raising again, and a
    // fixed week is a nudge that stops firing on its own anyway
    .filter((n) => dismissed[n.id] !== today)
    .slice(0, MAX_SHOWN)

  if (!nudges.length) return null

  return (
    <div className="grid gap-2 mb-5">
      {nudges.map((n) => {
        const t = tone[n.tone]
        return (
          <div
            key={n.id}
            className={`card p-3 ${t.bg}`}
            style={{ borderInlineStart: `3px solid ${t.rule}` }}
          >
            <div className="flex items-start gap-2">
              <Icon name={t.icon} className={`w-4 h-4 mt-0.5 shrink-0 ${t.text}`} />
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm ${t.text}`}>{n.title}</div>
                <p className="text-sm text-muted leading-relaxed mt-0.5">{n.body}</p>
              </div>
              <button
                onClick={() => dismissNudge(n.id)}
                className="text-muted hover:text-ink shrink-0 text-lg leading-none w-6 h-6 grid place-items-center"
                aria-label="הסתר"
                title="הסתר להיום"
              >
                ×
              </button>
            </div>
            {n.ask && (
              <button
                onClick={() => askCoach(n.ask!)}
                className="btn-soft text-sm gap-1.5 mt-2.5"
              >
                <Icon name="chat" className="w-4 h-4" /> שאל את המאמן
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
