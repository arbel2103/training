// Pure logic that turns synced Garmin activities into log mutations.
// No I/O — unit tested. See the dedup/merge policy below.
import type { ID, WorkoutEntry } from '../../store/useStore'
import type { GarminActivitySummary } from './types'
import { activityToEntry } from './normalize'

export interface ImportPlan {
  creates: Omit<WorkoutEntry, 'id'>[]
  updates: { id: ID; patch: Partial<WorkoutEntry> }[]
}

function sameKind(a: Omit<WorkoutEntry, 'id'>, e: WorkoutEntry): boolean {
  if (a.category !== e.category) return false
  if (a.category === 'aerobic') return a.sport === e.sport
  return true
}

/** When merging into a manual entry, keep the user's own naming. */
function mergePatch(entry: Omit<WorkoutEntry, 'id'>): Partial<WorkoutEntry> {
  const rest: Partial<WorkoutEntry> = { ...entry }
  delete rest.strengthName
  delete rest.otherName
  return rest
}

/**
 * Reconcile synced activities with the existing log.
 *  1. An entry already imported from the same activity → update its metrics
 *     (preserves the user's rpe/note, which activities never carry).
 *  2. Else a manual entry on the same date with the same category+sport →
 *     merge Garmin's real numbers into it (keeps rpe/note/intensity/name).
 *  3. Else create a new Garmin-sourced entry.
 * Each manual entry is consumed at most once.
 */
export function planImport(
  activities: GarminActivitySummary[],
  existingLog: WorkoutEntry[],
): ImportPlan {
  const creates: Omit<WorkoutEntry, 'id'>[] = []
  const updates: { id: ID; patch: Partial<WorkoutEntry> }[] = []
  const usedManualIds = new Set<ID>()
  const seenActivityIds = new Set<number>()

  const byGarminId = new Map<number, WorkoutEntry>()
  for (const e of existingLog) {
    if (e.garminActivityId != null) byGarminId.set(e.garminActivityId, e)
  }

  for (const a of activities) {
    if (seenActivityIds.has(a.activityId)) continue
    seenActivityIds.add(a.activityId)

    const entry = activityToEntry(a)
    if (!entry.date) continue

    const existing = byGarminId.get(a.activityId)
    if (existing) {
      updates.push({ id: existing.id, patch: entry })
      continue
    }

    const manual = existingLog.find(
      (e) =>
        e.source !== 'garmin' &&
        e.garminActivityId == null &&
        !usedManualIds.has(e.id) &&
        e.date === entry.date &&
        sameKind(entry, e),
    )
    if (manual) {
      usedManualIds.add(manual.id)
      updates.push({ id: manual.id, patch: mergePatch(entry) })
      continue
    }

    creates.push(entry)
  }

  return { creates, updates }
}
