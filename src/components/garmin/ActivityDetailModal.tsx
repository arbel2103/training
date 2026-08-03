import { useMemo } from 'react'
import type { WorkoutEntry } from '../../store/useStore'
import { formatDuration, formatPace, sportUnit } from '../../lib/calc'
import { useActivityDetail } from '../../lib/garmin/useGarminData'
import type { GarminDetailStreams, GarminSplit } from '../../lib/garmin/types'
import Modal from '../ui/Modal'
import LineChart from '../ui/LineChart'
import ZoneBars, { type Zone } from '../ui/ZoneBars'
import InfoTip from '../ui/InfoTip'

const ZONE_COLORS = ['var(--muted)', 'var(--c-swim)', 'var(--c-bike)', 'var(--accent)', 'var(--c-run)']

function streamSeries(details: GarminDetailStreams | null | undefined, key: string) {
  if (!details) return []
  const idx = details.descriptors.find((d) => d.key === key)?.index
  const timeIdx = details.descriptors.find((d) => d.key === 'sumElapsedDuration')?.index
  if (idx == null) return []
  const rows = details.rows
  const stepN = Math.max(1, Math.ceil(rows.length / 50))
  const out: { label: string; value: number }[] = []
  for (let i = 0; i < rows.length; i += stepN) {
    const v = rows[i]?.[idx]
    if (typeof v !== 'number') continue
    const t = timeIdx != null ? rows[i]?.[timeIdx] : i
    const label = typeof t === 'number' ? `${Math.round(t)}׳` : ''
    out.push({ label, value: v })
  }
  return out
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink/5 px-2.5 py-1.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  )
}

export default function ActivityDetailModal({
  entry,
  onClose,
}: {
  entry: WorkoutEntry | null
  onClose: () => void
}) {
  const { data, loading, error } = useActivityDetail(entry?.garminActivityId)

  const hrSeries = useMemo(() => streamSeries(data?.details, 'directHeartRate'), [data])

  if (!entry) return null

  const isBike = entry.sport === 'bike'
  const zones: Zone[] = (data?.hrZones ?? [])
    .filter((z) => (z.secsInZone ?? 0) > 0)
    .map((z, i) => ({
      label: `Z${z.zoneNumber ?? i + 1}`,
      value: z.secsInZone ?? 0,
      color: ZONE_COLORS[(z.zoneNumber ?? i + 1) - 1] ?? 'var(--accent)',
    }))

  const splits: GarminSplit[] = data?.splits ?? []

  return (
    <Modal open={!!entry} onClose={onClose} title="⌚ פירוט אימון" maxWidth="max-w-2xl">
      <div className="grid gap-5">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {entry.distance != null && (
            <StatCell label={`מרחק (${sportUnit(entry.sport ?? 'run')})`} value={String(entry.distance)} />
          )}
          {entry.durationMin != null && (
            <StatCell label="זמן" value={formatDuration(entry.durationMin)} />
          )}
          {!isBike && entry.paceSec != null && (
            <StatCell label="קצב" value={formatPace(entry.paceSec)} />
          )}
          {isBike && entry.speedKmh != null && (
            <StatCell label="מהירות" value={`${entry.speedKmh} קמ״ש`} />
          )}
          {entry.avgHr != null && <StatCell label="דופק ממוצע" value={String(entry.avgHr)} />}
          {entry.maxHr != null && <StatCell label="דופק מקס׳" value={String(entry.maxHr)} />}
          {entry.cadence != null && <StatCell label="קדנס" value={String(entry.cadence)} />}
          {entry.power != null && <StatCell label="הספק" value={`${entry.power}W`} />}
          {entry.swolf != null && <StatCell label="SWOLF" value={String(entry.swolf)} />}
          {entry.gct != null && <StatCell label="מגע קרקע" value={`${entry.gct}ms`} />}
          {entry.verticalOscillation != null && (
            <StatCell label="תנודה אנכית" value={`${entry.verticalOscillation}ס״מ`} />
          )}
          {entry.calories != null && <StatCell label="קלוריות" value={String(entry.calories)} />}
          {entry.elevationGain != null && (
            <StatCell label="טיפוס" value={`${entry.elevationGain}מ׳`} />
          )}
        </div>

        {loading && <p className="text-sm text-muted">טוען פרטים…</p>}
        {error && <p className="text-sm text-run">{error}</p>}

        {hrSeries.length > 0 && (
          <section>
            <h4 className="font-semibold mb-2 flex items-center gap-1.5">דופק לאורך האימון <InfoTip text="הדופק לאורך האימון. עלייה הדרגתית בקצב קבוע (סחיפת דופק) מעידה על עייפות, חום או התייבשות." /></h4>
            <LineChart data={hrSeries} />
          </section>
        )}

        {zones.length > 0 && (
          <section>
            <h4 className="font-semibold mb-2 flex items-center gap-1.5">זמן באזורי דופק <InfoTip text="כמה זמן היית בכל אזור מאמץ: Z1–Z2 קל (בסיס אירובי), Z3 בינוני, Z4–Z5 עצים. רוב הנפח אמור להיות באזורים הקלים." /></h4>
            <ZoneBars zones={zones} />
          </section>
        )}

        {splits.length > 0 && (
          <section>
            <h4 className="font-semibold mb-2">ספליטים</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs">
                    <th className="text-right font-medium py-1">#</th>
                    <th className="text-right font-medium py-1">מרחק</th>
                    <th className="text-right font-medium py-1">זמן</th>
                    <th className="text-right font-medium py-1">דופק</th>
                  </tr>
                </thead>
                <tbody>
                  {splits.map((s, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1.5">{s.lapIndex ?? i + 1}</td>
                      <td className="py-1.5">
                        {s.distance != null ? `${Math.round(s.distance)}מ׳` : '—'}
                      </td>
                      <td className="py-1.5">
                        {s.duration != null ? formatDuration(s.duration / 60) : '—'}
                      </td>
                      <td className="py-1.5">{s.averageHR != null ? Math.round(s.averageHR) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && !data && !error && (
          <p className="text-sm text-muted">
            אין פירוט מפורט לאימון הזה (ייתכן שנוצר ידנית).
          </p>
        )}
      </div>
    </Modal>
  )
}
