import { useState } from 'react'
import { useStore } from '../../store/useStore'
import ProgressBar from '../../components/ui/ProgressBar'
import Icon from '../../components/ui/Icon'
import GearFormModal, { type GearDraft } from '../../components/gear/GearFormModal'
import { sportLabel } from '../../lib/labels'
import {
  activeGear,
  formatUsage,
  gearStatus,
  metricLabel,
  retiredGear,
  type GearItem,
  type GearState,
} from '../../lib/gear'

const BAR: Record<GearState, string> = {
  ok: 'rgb(var(--accent))',
  soon: 'rgb(var(--c-bike))',
  due: 'rgb(var(--c-run))',
}

const heDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' })

/** What the item accrues from, in words. */
function wornBy(item: GearItem): string {
  if (!item.sports.length) return 'כל אימון'
  return item.sports.map((s) => sportLabel[s]).join(' · ')
}

function GearCard({ item }: { item: GearItem }) {
  const log = useStore((s) => s.log)
  const updateGear = useStore((s) => s.updateGear)
  const removeGear = useStore((s) => s.removeGear)
  const replaceGear = useStore((s) => s.replaceGear)
  const [editing, setEditing] = useState(false)
  const [replacing, setReplacing] = useState(false)

  const st = gearStatus(item, log)
  const unit = metricLabel(item.metric)

  return (
    <div className="card p-4 min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="font-semibold min-w-0 truncate">{item.name}</div>
        <div className="text-xs text-muted shrink-0">{wornBy(item)}</div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
        <span className="font-display text-2xl font-black tabular-nums">
          {formatUsage(st.used, item.metric)}
        </span>
        <span className="text-sm text-muted">
          {st.target ? `מתוך ${formatUsage(st.target, item.metric)} ${unit}` : unit}
        </span>
        {st.state === 'due' && (
          <span className="text-xs font-semibold text-run">· הגיע הזמן להחליף</span>
        )}
        {st.state === 'soon' && (
          <span className="text-xs font-semibold text-bike">
            · עוד {formatUsage(st.remaining ?? 0, item.metric)} {unit}
          </span>
        )}
      </div>

      {st.progress != null && (
        <ProgressBar pct={st.progress * 100} color={BAR[st.state]} />
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs text-muted flex-1 min-w-0 truncate">
          בשימוש מ-{heDate(item.addedOn)}
          {item.note ? ` · ${item.note}` : ''}
        </span>
        {/* the small replace button the whole feature exists for */}
        <button
          onClick={() => setReplacing(true)}
          className={`text-xs rounded-full border px-2.5 py-1 shrink-0 ${
            st.state === 'due'
              ? 'border-run text-run font-semibold'
              : 'border-line text-muted hover:text-accent hover:border-accent/40'
          }`}
        >
          החלפתי
        </button>
        <button
          onClick={() => setEditing(true)}
          className="text-muted hover:text-accent shrink-0"
          aria-label="ערוך"
          title="ערוך"
        >
          <Icon name="edit" className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (confirm(`למחוק את "${item.name}"? ההיסטוריה שלו תימחק גם.`))
              removeGear(item.id)
          }}
          className="text-muted hover:text-run shrink-0"
          aria-label="מחק"
          title="מחק"
        >
          <Icon name="trash" className="w-4 h-4" />
        </button>
      </div>

      {editing && (
        <GearFormModal
          open
          title="עריכת פריט"
          initial={item}
          onClose={() => setEditing(false)}
          onSave={(d) => updateGear(item.id, d)}
        />
      )}
      {replacing && (
        <GearFormModal
          open
          title={`החלפה — ${item.name}`}
          // the successor inherits what it is; only its own numbers are asked for
          initial={{ ...item, startValue: 0, note: undefined }}
          onClose={() => setReplacing(false)}
          onSave={(d) => replaceGear(item.id, d)}
        />
      )}
    </div>
  )
}

/**
 * Gear wear, accrued from the training log rather than typed in.
 *
 * Shoes and tyres fail quietly — the mileage is the only warning you get, and
 * nobody keeps it in their head. Every workout already records distance and
 * duration, so the tracking is free; what was missing was somewhere to say
 * which gear was on your feet for it.
 */
export default function GearTab() {
  const gear = useStore((s) => s.gear)
  const log = useStore((s) => s.log)
  const addGear = useStore((s) => s.addGear)
  const [adding, setAdding] = useState(false)
  const [showRetired, setShowRetired] = useState(false)

  const active = activeGear(gear, log)
  const retired = retiredGear(gear)
  const due = active.filter((g) => gearStatus(g, log).state === 'due')

  const add = (d: GearDraft) => addGear(d)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-sm text-muted min-w-0">
          {active.length === 0
            ? 'מעקב שחיקה לפי הקילומטרים והשעות שכבר נרשמו באימונים.'
            : due.length
              ? `${due.length} ${due.length === 1 ? 'פריט מוכן' : 'פריטים מוכנים'} להחלפה`
              : `${active.length} ${active.length === 1 ? 'פריט' : 'פריטים'} במעקב`}
        </div>
        <button onClick={() => setAdding(true)} className="btn-accent shrink-0">
          + פריט
        </button>
      </div>

      {active.length === 0 ? (
        <div className="card p-8 text-center">
          <Icon name="bag" className="w-9 h-9 mx-auto mb-3 text-accent" />
          <h3 className="font-display text-lg font-bold mb-2">אין עדיין ציוד במעקב</h3>
          <p className="text-muted text-sm max-w-sm mx-auto leading-relaxed">
            הוסף נעלי ריצה, צמיגים, שרשרת או חליפת שחייה — והקילומטרים יצטברו
            אליהם לבד מהאימונים שאתה כבר רושם. כשמגיעים ליעד יופיע כפתור החלפה.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {active.map((g) => (
            <GearCard key={g.id} item={g} />
          ))}
        </div>
      )}

      {retired.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setShowRetired((v) => !v)}
            className="text-sm text-muted hover:text-accent flex items-center gap-1.5"
          >
            ציוד שהוחלף ({retired.length})
            <span className="text-xs">{showRetired ? '▾' : '◂'}</span>
          </button>
          {showRetired && (
            <div className="grid gap-1.5 mt-2">
              {retired.map((g) => {
                const st = gearStatus(g, log)
                return (
                  <div
                    key={g.id}
                    className="flex items-baseline gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                  >
                    <span className="flex-1 min-w-0 truncate">{g.name}</span>
                    <span className="text-muted tabular-nums shrink-0">
                      {formatUsage(st.used, g.metric)} {metricLabel(g.metric)}
                    </span>
                    <span className="text-xs text-muted shrink-0">
                      עד {heDate(g.retiredOn!)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {adding && (
        <GearFormModal
          open
          title="פריט ציוד חדש"
          onClose={() => setAdding(false)}
          onSave={add}
        />
      )}
    </div>
  )
}
