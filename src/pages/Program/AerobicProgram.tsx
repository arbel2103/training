import { useState } from 'react'
import { useStore, type Sport } from '../../store/useStore'
import { SPORTS, sportIcon, sportLabel } from '../../lib/labels'
import { sportUnit } from '../../lib/calc'
import TabBar from '../../components/ui/TabBar'

export default function AerobicProgram() {
  const targets = useStore((s) => s.aerobicTargets)
  const addTarget = useStore((s) => s.addTarget)
  const updateTarget = useStore((s) => s.updateTarget)
  const removeTarget = useStore((s) => s.removeTarget)

  const [sport, setSport] = useState<Sport>('run')
  const list = targets[sport]

  return (
    <div>
      <div className="mb-5">
        <TabBar
          variant="pill"
          value={sport}
          onChange={setSport}
          tabs={SPORTS.map((s) => ({
            value: s,
            label: `${sportIcon[s]} ${sportLabel[s]}`,
          }))}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-bold">
          יעדים שבועיים · {sportLabel[sport]}
        </h2>
        <button onClick={() => addTarget(sport, 0)} className="btn-accent">
          + הוסף יעד שבועי
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          אין יעד שבועי ל{sportLabel[sport]}. הוסף יעד מרחק שתרצה להשלים בכל שבוע.
        </div>
      ) : (
        <div className="grid gap-3 sm:max-w-md">
          {list.map((t) => (
            <div key={t.id} className="card p-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="label">מרחק יעד שבועי ({sportUnit(sport)})</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  className="input"
                  value={t.distance || ''}
                  placeholder="0"
                  onChange={(e) =>
                    updateTarget(sport, t.id, { distance: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <button
                onClick={() => removeTarget(sport, t.id)}
                className="btn-ghost px-3 mb-px"
                aria-label="מחק יעד"
                title="מחק יעד"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
