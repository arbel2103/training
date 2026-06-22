import type {
  AerobicTargets,
  Category,
  Sport,
  WorkoutEntry,
} from '../store/useStore'
import { entryDuration } from './calc'
import { inRange, weeksInRange } from './dates'

export interface CatStats {
  count: number
  totalDuration: number // minutes
  weeklyAvgCount: number
  weeklyAvgDuration: number
}
export interface AerobicStats extends CatStats {
  totalDistance: number
  weeklyAvgDistance: number
}

export interface PeriodAnalysis {
  weeks: number
  strength: CatStats
  other: CatStats
  aerobic: Record<Sport, AerobicStats>
  totals: { all: number; strength: number; aerobic: number; other: number }
}

function catStats(entries: WorkoutEntry[], weeks: number): CatStats {
  const count = entries.length
  const totalDuration = entries.reduce((sum, e) => sum + (entryDuration(e) ?? 0), 0)
  return {
    count,
    totalDuration,
    weeklyAvgCount: count / weeks,
    weeklyAvgDuration: totalDuration / weeks,
  }
}

function aerobicStats(entries: WorkoutEntry[], weeks: number): AerobicStats {
  const base = catStats(entries, weeks)
  const totalDistance = entries.reduce((sum, e) => sum + (e.distance ?? 0), 0)
  return { ...base, totalDistance, weeklyAvgDistance: totalDistance / weeks }
}

export function analyzePeriod(
  log: WorkoutEntry[],
  start: string,
  end: string,
): PeriodAnalysis {
  const weeks = weeksInRange(start, end)
  const inP = log.filter((e) => inRange(e.date, start, end))
  const byCat = (c: Category) => inP.filter((e) => e.category === c)
  const aerobicBy = (s: Sport) =>
    inP.filter((e) => e.category === 'aerobic' && e.sport === s)

  return {
    weeks,
    strength: catStats(byCat('strength'), weeks),
    other: catStats(byCat('other'), weeks),
    aerobic: {
      run: aerobicStats(aerobicBy('run'), weeks),
      bike: aerobicStats(aerobicBy('bike'), weeks),
      swim: aerobicStats(aerobicBy('swim'), weeks),
    },
    totals: {
      all: inP.length,
      strength: byCat('strength').length,
      aerobic: byCat('aerobic').length,
      other: byCat('other').length,
    },
  }
}

/* ---------------- Goal comparison (week vs weekly targets) ---------------- */
export interface GoalResult {
  sport: Sport
  done: number
  target: number
  diffPct: number
  status: 'met' | 'under' | 'over'
}

interface DistanceItem {
  category: Category
  sport?: Sport
  distance?: number
}

/** Compare a week's aerobic distances (done or planned) to weekly targets. */
export function compareToTargets(
  items: DistanceItem[],
  targets: AerobicTargets,
): GoalResult[] {
  const sports: Sport[] = ['run', 'bike', 'swim']
  const results: GoalResult[] = []
  for (const sport of sports) {
    const target = targets[sport].reduce((s, t) => s + (t.distance || 0), 0)
    if (target <= 0) continue
    const done = items
      .filter((i) => i.category === 'aerobic' && i.sport === sport)
      .reduce((s, i) => s + (i.distance || 0), 0)
    const diffPct = ((done - target) / target) * 100
    const status: GoalResult['status'] =
      done < target * 0.95 ? 'under' : done > target * 1.05 ? 'over' : 'met'
    results.push({ sport, done, target, diffPct, status })
  }
  return results
}
