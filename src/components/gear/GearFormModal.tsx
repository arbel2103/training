import { useState } from 'react'
import Modal from '../ui/Modal'
import { toISODate } from '../../lib/dates'
import { sportLabel } from '../../lib/labels'
import {
  GEAR_PRESETS,
  gearPreset,
  metricLabel,
  type GearItem,
  type GearMetric,
} from '../../lib/gear'
import type { Sport } from '../../store/useStore'

const SPORTS: Sport[] = ['run', 'bike', 'swim']

export type GearDraft = Omit<GearItem, 'id'>

/**
 * Add, edit, or bring in a replacement.
 *
 * Picking a preset fills the unit, the sports it wears with, and a sensible
 * replacement point, because those are the parts nobody knows offhand — every
 * one of them stays editable.
 */
export default function GearFormModal({
  open,
  onClose,
  onSave,
  initial,
  title,
}: {
  open: boolean
  onClose: () => void
  onSave: (draft: GearDraft) => void
  /** editing an item, or seeding a replacement; omitted for a fresh add */
  initial?: Partial<GearDraft>
  title: string
}) {
  const today = toISODate(new Date())
  const [kind, setKind] = useState(initial?.kind ?? GEAR_PRESETS[0].id)
  const [name, setName] = useState(initial?.name ?? GEAR_PRESETS[0].name)
  const [metric, setMetric] = useState<GearMetric>(
    initial?.metric ?? GEAR_PRESETS[0].metric,
  )
  const [sports, setSports] = useState<Sport[]>(
    initial?.sports ?? GEAR_PRESETS[0].sports,
  )
  const [startValue, setStartValue] = useState(String(initial?.startValue ?? 0))
  const [target, setTarget] = useState(
    String(initial?.target ?? GEAR_PRESETS[0].target),
  )
  const [addedOn, setAddedOn] = useState(initial?.addedOn ?? today)
  const [note, setNote] = useState(initial?.note ?? '')

  const preset = gearPreset(kind)

  function pickKind(id: string) {
    setKind(id)
    const p = gearPreset(id)
    if (!p) return
    // a preset is a starting point: adopt its shape, but keep a name the user
    // has already personalised ("נעלי ריצה Pegasus") rather than overwriting it
    setMetric(p.metric)
    setSports(p.sports)
    setTarget(String(p.target))
    if (!name.trim() || GEAR_PRESETS.some((x) => x.name === name)) setName(p.name)
  }

  const toggleSport = (s: Sport) =>
    setSports((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    )

  function save() {
    const n = name.trim()
    if (!n) return
    const t = Number(target)
    onSave({
      kind,
      name: n,
      metric,
      sports,
      startValue: Math.max(0, Number(startValue) || 0),
      target: t > 0 ? t : undefined,
      addedOn,
      note: note.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <label className="label">סוג</label>
      <select
        className="input w-full mb-4"
        value={kind}
        onChange={(e) => pickKind(e.target.value)}
      >
        {GEAR_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value="custom">אחר…</option>
      </select>

      <label className="label">שם</label>
      <input
        className="input w-full mb-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="למשל: נעלי ריצה Pegasus"
      />
      {preset?.hint && <p className="text-xs text-muted mb-4">{preset.hint}</p>}
      {!preset?.hint && <div className="mb-4" />}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="min-w-0">
          <label className="label">נמדד לפי</label>
          <select
            className="input w-full"
            value={metric}
            onChange={(e) => setMetric(e.target.value as GearMetric)}
          >
            <option value="km">קילומטרים</option>
            <option value="hours">שעות</option>
          </select>
        </div>
        <div className="min-w-0">
          <label className="label">בשימוש מתאריך</label>
          <input
            type="date"
            className="input w-full"
            value={addedOn}
            onChange={(e) => setAddedOn(e.target.value)}
          />
        </div>
      </div>

      <label className="label">נצבר מאימוני</label>
      <div className="flex gap-2 mb-1">
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleSport(s)}
            className={`seg-btn flex-1 ${
              sports.includes(s) ? 'seg-btn-active' : 'seg-btn-idle'
            }`}
          >
            {sportLabel[s]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mb-4">
        {sports.length === 0
          ? 'בלי בחירה — נצבר מכל אימון (למשל רצועת דופק).'
          : 'רק אימונים מהענפים שנבחרו יצטברו לפריט.'}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="min-w-0">
          <label className="label">
            {metricLabel(metric)} בהתחלה
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            className="input w-full"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="min-w-0">
          <label className="label">יעד להחלפה</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            className="input w-full"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="ללא"
          />
        </div>
      </div>
      <p className="text-xs text-muted -mt-2 mb-4">
        חדש לגמרי? השאר 0. יעד ריק — נספור בלי להתריע.
      </p>

      <label className="label">הערה</label>
      <input
        className="input w-full"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="מידה, צבע, איפה נקנה…"
      />

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="btn-ghost">
          ביטול
        </button>
        <button onClick={save} disabled={!name.trim()} className="btn-accent flex-1 disabled:opacity-40">
          שמור
        </button>
      </div>
    </Modal>
  )
}
