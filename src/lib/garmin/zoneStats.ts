// Aggregates time-in-heart-rate-zone across many activities, to answer
// "am I training easy enough?" (the polarized / 80-20 question).
import type { WorkoutEntry } from '../../store/useStore'
import { getCached, putCached } from './cache'
import { getJsonFile } from './githubClient'
import type { GarminActivityDetailBundle } from './types'

export interface ZoneTotals {
  perZone: number[] // seconds in Z1..Z5
  easy: number // Z1 + Z2
  moderate: number // Z3
  hard: number // Z4 + Z5
  total: number
  used: number // activities that contributed zone data
  skipped: number // activities without zone data
}

const EMPTY: ZoneTotals = {
  perZone: [0, 0, 0, 0, 0],
  easy: 0,
  moderate: 0,
  hard: 0,
  total: 0,
  used: 0,
  skipped: 0,
}

/** Load one activity's detail bundle, preferring the IndexedDB cache. */
async function loadDetail(id: number): Promise<GarminActivityDetailBundle | null> {
  const path = `data/activity-details/${id}.json`
  const cached = await getCached<GarminActivityDetailBundle>(path)
  if (cached) return cached.json
  const json = await getJsonFile<GarminActivityDetailBundle>(path)
  if (json != null) await putCached(path, 'immutable', json)
  return json
}

/**
 * Sum seconds-in-zone over the given entries. Only Garmin activities carry
 * zone data; the rest are counted as skipped so the UI can show coverage.
 * Results are IndexedDB-cached, so repeat runs are fast.
 */
export async function aggregateZones(
  entries: WorkoutEntry[],
  onProgress?: (done: number, total: number) => void,
): Promise<ZoneTotals> {
  const ids = entries
    .map((e) => e.garminActivityId)
    .filter((v): v is number => typeof v === 'number')
  const totals: ZoneTotals = { ...EMPTY, perZone: [0, 0, 0, 0, 0] }
  totals.skipped = entries.length - ids.length

  const BATCH = 4
  let done = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH)
    const bundles = await Promise.all(
      slice.map((id) => loadDetail(id).catch(() => null)),
    )
    for (const b of bundles) {
      const zones = b?.hrZones ?? []
      const secs = zones.reduce((s, z) => s + (z.secsInZone ?? 0), 0)
      if (!zones.length || secs <= 0) {
        totals.skipped++
        continue
      }
      for (const z of zones) {
        const idx = (z.zoneNumber ?? 0) - 1
        if (idx >= 0 && idx < 5) totals.perZone[idx] += z.secsInZone ?? 0
      }
      totals.used++
    }
    done += slice.length
    onProgress?.(done, ids.length)
  }

  totals.easy = totals.perZone[0] + totals.perZone[1]
  totals.moderate = totals.perZone[2]
  totals.hard = totals.perZone[3] + totals.perZone[4]
  totals.total = totals.easy + totals.moderate + totals.hard
  return totals
}

export interface ZoneVerdict {
  easyPct: number
  moderatePct: number
  hardPct: number
  severity: 'good' | 'info' | 'warn'
  text: string
}

/**
 * Rule-of-thumb check against polarized training: roughly 80% of time easy,
 * ~20% hard, with little time stuck in the "grey zone" (Z3).
 */
export function zoneVerdict(t: ZoneTotals): ZoneVerdict | null {
  if (t.total <= 0) return null
  const pct = (v: number) => Math.round((v / t.total) * 100)
  const easyPct = pct(t.easy)
  const moderatePct = pct(t.moderate)
  const hardPct = pct(t.hard)

  let severity: ZoneVerdict['severity'] = 'good'
  let text: string

  if (easyPct >= 75 && hardPct >= 10) {
    text = `יחס מצוין — ${easyPct}% קל ו-${hardPct}% עצים. זה בדיוק המבנה המקוטב שמומלץ לסיבולת.`
  } else if (easyPct >= 75) {
    severity = 'info'
    text = `${easyPct}% מהזמן בקל — בסיס מצוין, אבל רק ${hardPct}% בעצים. שקול להוסיף אימון איכות אחד בשבוע.`
  } else if (moderatePct >= 35) {
    severity = 'warn'
    text = `${moderatePct}% מהזמן באזור הבינוני ("אזור אפור") — קשה מכדי להתאושש, קל מכדי לשפר. עשה את הקל באמת קל ואת הקשה באמת קשה.`
  } else if (easyPct < 65) {
    severity = 'warn'
    text = `רק ${easyPct}% מהזמן בקל מול ${hardPct}% בעצים — יותר מדי עצימות. הרוב המכריע של הנפח צריך להיות קל כדי לאפשר התאוששות.`
  } else {
    severity = 'info'
    text = `${easyPct}% קל · ${moderatePct}% בינוני · ${hardPct}% עצים — סביר, אבל אפשר להטות עוד לכיוון הקל.`
  }

  return { easyPct, moderatePct, hardPct, severity, text }
}
