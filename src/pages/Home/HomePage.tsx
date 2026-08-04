import { useState } from 'react'
import { useStore, type PlanSession } from '../../store/useStore'
import {
  HEB_DAYS,
  daysInRange,
  formatDayMonth,
  fromISO,
  toISODate,
  weekDays,
} from '../../lib/dates'
import { weekCompletion } from '../../lib/planMatch'
import { sportColorClass, sportLabel } from '../../lib/labels'
import Icon, { type IconName } from '../../components/ui/Icon'
import ProgressBar from '../../components/ui/ProgressBar'
import { formatDuration, sportUnit } from '../../lib/calc'
import { lastBackupAt } from '../../lib/driveSync'
import { hasGarminSetup } from '../../lib/garmin/pat'
import QuickCompleteModal from '../../components/QuickCompleteModal'
import GarminSetupWizard from '../../components/garmin/GarminSetupWizard'
import LastNightCard from '../../components/garmin/LastNightCard'
import TabBar from '../../components/ui/TabBar'
import StatsTab from './StatsTab'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'לילה טוב'
  if (h < 12) return 'בוקר טוב'
  if (h < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

function sessionIconName(s: PlanSession): IconName {
  if (s.sport === 'strength') return 'strength'
  if (s.sport === 'other') return 'other'
  return s.sport
}

function sessionTitle(s: PlanSession): string {
  if (s.sport === 'strength') return s.label || 'אימון כוח'
  if (s.sport === 'other') return s.label || 'אימון'
  return `${sportLabel[s.sport]}${s.label ? ` · ${s.label}` : ''}`
}

export default function HomePage() {
  const plan = useStore((s) => s.trainingPlan)
  const log = useStore((s) => s.log)
  const weighIns = useStore((s) => s.weighIns)

  const garminStatus = useStore((s) => s.garminSyncStatus)

  const [tab, setTab] = useState<'today' | 'stats'>('today')
  const [quick, setQuick] = useState<PlanSession | null>(null)
  const [wizard, setWizard] = useState<{ open: boolean; step: 1 | 2 | 3 | 4 }>({
    open: false,
    step: 1,
  })
  const [garminDismissed, setGarminDismissed] = useState(
    () => localStorage.getItem('garmin-banner-dismissed') === '1',
  )
  const showGarminBanner = !hasGarminSetup() && !garminDismissed
  const mfaNeeded = hasGarminSetup() && garminStatus.errorCode === 'mfa_required'

  const now = new Date()
  const todayISO = toISODate(now)
  const week = weekDays(now)
  const weekStart = toISODate(week[0])

  const planWeek = plan?.weeks.find((w) => w.weekStart === weekStart) ?? null
  const completion = planWeek ? weekCompletion(planWeek, log) : {}
  const todaySessions = planWeek
    ? planWeek.sessions.filter((s) => s.day === now.getDay())
    : []
  const doneCount = planWeek
    ? planWeek.sessions.filter((s) => completion[s.id]?.done).length
    : 0
  const totalCount = planWeek?.sessions.length ?? 0

  // race countdown
  const daysToRace =
    plan?.raceDate && plan.raceDate >= todayISO
      ? daysInRange(todayISO, plan.raceDate) - 1
      : null

  // backup nudge (only when there's data worth protecting)
  const hasData = log.length > 0 || totalCount > 0 || weighIns.length > 0
  const backup = lastBackupAt()
  const backupStale =
    hasData &&
    (!backup || Date.now() - new Date(backup).getTime() > 7 * 86_400_000)

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
          {greeting()}
        </h1>
        <p className="text-muted mt-1">
          יום {HEB_DAYS[now.getDay()]} · {formatDayMonth(now)}
        </p>
      </div>

      <div className="mb-6">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'today', label: 'היום והשבוע' },
            { value: 'stats', label: 'סטטיסטיקות' },
          ]}
        />
      </div>

      {tab === 'stats' ? (
        <StatsTab />
      ) : (
        <>
      {showGarminBanner && (
        <div
          className="card p-3.5 mb-5 text-sm bg-accent-soft/40"
          style={{ borderInlineStart: '4px solid rgb(var(--accent))' }}
        >
          <div className="flex items-start gap-2">
            <Icon name="watch" className="w-5 h-5 shrink-0 text-accent" />
            <div className="flex-1">
              <p className="leading-relaxed">
                חבר את <b>Garmin Connect</b> כדי למשוך אוטומטית שינה, בריאות
                ואימונים — האפליקציה תסמן וי על האימונים לבד.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setWizard({ open: true, step: 1 })}
                  className="btn-primary text-sm py-1.5"
                >
                  חבר עכשיו
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('garmin-banner-dismissed', '1')
                    setGarminDismissed(true)
                  }}
                  className="btn-ghost text-sm py-1.5"
                >
                  אחר כך
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mfaNeeded && (
        <div
          className="card p-3.5 mb-5 text-sm bg-run/10"
          style={{ borderInlineStart: '4px solid rgb(var(--c-run))' }}
        >
          <div className="flex items-start gap-2">
            <Icon name="warning" className="w-5 h-5 shrink-0 text-run" />
            <div className="flex-1">
              <p className="leading-relaxed">
                הסנכרון האוטומטי עם גרמין נעצר — <b>נדרש קוד אימות דו-שלבי (MFA)</b>.
                הזן את הקוד וסנכרן ידנית.
              </p>
              <button
                onClick={() => setWizard({ open: true, step: 4 })}
                className="btn-accent text-sm py-1.5 mt-2"
              >
                הזן קוד וסנכרן
              </button>
            </div>
          </div>
        </div>
      )}

      {backupStale && (
        <div
          className="card p-3.5 mb-5 text-sm flex items-center gap-2 bg-accent-soft/40"
          style={{ borderInlineStart: '4px solid rgb(var(--accent))' }}
        >
          <Icon name="cloud" className="w-5 h-5 shrink-0 text-accent" />
          {backup
            ? 'עבר שבוע מהגיבוי האחרון — כדאי לגבות לענן (בכפתור הענן למעלה).'
            : 'עוד לא גיבית לענן — כדאי לגבות (בכפתור הענן למעלה).'}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* race countdown */}
        {daysToRace !== null && (
          <div className="card p-5 sm:col-span-2 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted flex items-center gap-1.5">
                <Icon name="flag" className="w-4 h-4" /> {plan?.raceName || 'תחרות'}
              </div>
              <div className="font-display text-2xl font-bold mt-0.5">
                {daysToRace === 0
                  ? 'היום זה היום! בהצלחה!'
                  : `עוד ${daysToRace} ימים`}
              </div>
            </div>
            {plan?.raceDate && (
              <div className="text-sm text-muted">
                {formatDayMonth(fromISO(plan.raceDate))}
              </div>
            )}
          </div>
        )}

        {/* last night — sleep, HRV, resting HR */}
        <LastNightCard />

        {/* today's workout */}
        <div className="card p-5">
          <h3 className="font-display text-lg font-bold mb-3">האימון של היום</h3>
          {!plan || plan.weeks.length === 0 ? (
            <p className="text-sm text-muted">
              אין תוכנית עדיין — פתח את <b>המאמן</b> כדי לבנות אחת.
            </p>
          ) : todaySessions.length === 0 ? (
            <p className="text-sm text-muted">יום מנוחה — תן לגוף להתאושש.</p>
          ) : (
            <div className="grid gap-2">
              {todaySessions.map((s) => {
                const done = completion[s.id]?.done
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      done ? 'border-bike/40 bg-bike/5' : 'border-line'
                    }`}
                  >
                    <Icon
                      name={sessionIconName(s)}
                      className={`w-6 h-6 shrink-0 ${sportColorClass[s.sport]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{sessionTitle(s)}</div>
                      <div className="text-sm text-muted">
                        {s.sport !== 'strength' && s.sport !== 'other' && s.distance
                          ? `${s.distance} ${sportUnit(s.sport)}`
                          : ''}
                        {s.durationMin ? ` · ${formatDuration(s.durationMin)}` : ''}
                      </div>
                    </div>
                    {done ? (
                      <span className="text-bike font-bold shrink-0">בוצע ✓</span>
                    ) : (
                      <button
                        onClick={() => setQuick(s)}
                        className="btn-accent shrink-0 text-sm px-3 py-1.5"
                      >
                        בצעתי ✓
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* week progress */}
        <div className="card p-5">
          <h3 className="font-display text-lg font-bold mb-3">השבוע שלי</h3>
          {totalCount === 0 ? (
            <p className="text-sm text-muted">אין אימונים מתוכננים לשבוע הזה.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display text-3xl font-black">
                  {doneCount}/{totalCount}
                </span>
                <span className="text-sm text-muted">אימונים בוצעו</span>
              </div>
              <ProgressBar
                pct={totalCount ? Math.round((doneCount / totalCount) * 100) : 0}
              />
              {doneCount === totalCount && (
                <p className="text-sm text-bike font-semibold mt-2">
                  כל הכבוד — השבוע הושלם!
                </p>
              )}
            </>
          )}
        </div>

      </div>
        </>
      )}

      {quick && (
        <QuickCompleteModal
          session={quick}
          date={todayISO}
          onClose={() => setQuick(null)}
        />
      )}

      <GarminSetupWizard
        open={wizard.open}
        startStep={wizard.step}
        onClose={() => setWizard((w) => ({ ...w, open: false }))}
      />
    </div>
  )
}
