import { Fragment, type ReactNode, useState } from 'react'
import { useStore, type PlanSession, type HomeTileId } from '../../store/useStore'
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
import WeekProgressRings from '../../components/WeekProgressRings'
import FuelStrip from '../../components/FuelStrip'
import { entryDuration, formatDuration, sportUnit } from '../../lib/calc'
import { lastBackupAt } from '../../lib/driveSync'
import { hasGarminSetup } from '../../lib/garmin/pat'
import QuickCompleteModal from '../../components/QuickCompleteModal'
import WorkoutFormModal from '../Tracking/WorkoutFormModal'
import WeeklySummary from '../../components/WeeklySummary'
import CustomizeTiles, { orderedTiles } from './CustomizeTiles'
import GarminSetupWizard from '../../components/garmin/GarminSetupWizard'
import LastNightCard from '../../components/garmin/LastNightCard'
import TabBar from '../../components/ui/TabBar'
import StatsTab from './StatsTab'
import { useAppShell, TRI_PAGE } from '../../lib/appShell'

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
  const navigateTo = useAppShell((s) => s.navigateTo)

  const [tab, setTab] = useState<'today' | 'stats'>('today')
  const [quick, setQuick] = useState<PlanSession | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [weekSummaryOpen, setWeekSummaryOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const homeLayout = useStore((s) => s.homeLayout)
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

  const visibleTiles = orderedTiles(homeLayout).filter(
    (id) => !homeLayout.hidden.includes(id),
  )

  const renderTile = (id: HomeTileId): ReactNode => {
    switch (id) {
      case 'race':
        if (daysToRace === null) return null
        return (
          <div className="card p-5 sm:col-span-2 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted flex items-center gap-1.5">
                <Icon name="flag" className="w-4 h-4" /> {plan?.raceName || 'תחרות'}
              </div>
              <div className="font-display text-2xl font-bold mt-0.5">
                {daysToRace === 0 ? 'היום זה היום! בהצלחה!' : `עוד ${daysToRace} ימים`}
              </div>
            </div>
            {plan?.raceDate && (
              <div className="text-sm text-muted">
                {formatDayMonth(fromISO(plan.raceDate))}
              </div>
            )}
          </div>
        )
      case 'lastNight':
        return <LastNightCard />
      case 'today':
        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-bold">האימון של היום</h3>
              <button
                onClick={() => setManualOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                title="הוספת אימון שביצעת (למשל גלישה, פילאטיס, או אימון שלא נמדד בשעון)"
              >
                <Icon name="plus" className="w-4 h-4" /> הוספת אימון
              </button>
            </div>
            {!plan || plan.weeks.length === 0 ? (
              <p className="text-sm text-muted">
                אין תוכנית עדיין — פתח את <b>המאמן</b> כדי לבנות אחת.
              </p>
            ) : todaySessions.length === 0 ? (
              <p className="text-sm text-muted">יום מנוחה — תן לגוף להתאושש.</p>
            ) : (
              <div className="grid gap-2">
                {todaySessions.map((s) => {
                  const match = completion[s.id]
                  const done = match?.done
                  const entry = match?.entry
                  // once done, show what was actually performed (Garmin/manual),
                  // even if it differs from the plan — else show the planned numbers
                  const showSport = entry?.sport ?? s.sport
                  const dist = done && entry?.distance != null ? entry.distance : s.distance
                  const dur =
                    done && entry ? (entryDuration(entry) ?? s.durationMin) : s.durationMin
                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl border px-3 py-2.5 ${
                        done ? 'border-bike/40 bg-bike/5' : 'border-line'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          name={sessionIconName(s)}
                          className={`w-6 h-6 shrink-0 ${sportColorClass[s.sport]}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{sessionTitle(s)}</div>
                          <div className="text-sm text-muted">
                            {showSport !== 'strength' && showSport !== 'other' && dist
                              ? `${dist} ${sportUnit(showSport)}`
                              : ''}
                            {dur ? ` · ${formatDuration(dur)}` : ''}
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
                      {/* fuelling advice is for the session ahead — once it is
                          logged, the numbers are history */}
                      {!done && <FuelStrip session={s} dateISO={todayISO} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      case 'week':
        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-bold">השבוע שלי</h3>
              <button
                onClick={() => setWeekSummaryOpen(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80 transition"
              >
                <Icon name="chart" className="w-4 h-4" /> סיכום השבוע
              </button>
            </div>
            <WeekProgressRings />
          </div>
        )
    }
  }

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

      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigateTo('tri', TRI_PAGE.health, 'weight')}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
          title="מעבר מהיר למעקב המשקל"
        >
          <Icon name="scale" className="w-4 h-4" /> משקל
        </button>
        <button
          onClick={() => setCustomizeOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition"
        >
          <Icon name="gear" className="w-4 h-4" /> התאמה אישית
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {visibleTiles.map((id) => (
          <Fragment key={id}>{renderTile(id)}</Fragment>
        ))}
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

      <WorkoutFormModal
        open={manualOpen}
        date={todayISO}
        onClose={() => setManualOpen(false)}
      />

      <WeeklySummary
        open={weekSummaryOpen}
        onClose={() => setWeekSummaryOpen(false)}
      />

      <CustomizeTiles
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
      />

      <GarminSetupWizard
        open={wizard.open}
        startStep={wizard.step}
        onClose={() => setWizard((w) => ({ ...w, open: false }))}
      />
    </div>
  )
}
