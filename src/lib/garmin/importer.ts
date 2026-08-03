// Pure logic that turns synced Garmin activities into log mutations.
// No I/O — unit tested. See the dedup/merge policy below.
import type { ID, WorkoutEntry } from '../../store/useStore'
import type { GarminActivitySummary } from './types'
import { activityToEntry } from './normalize'
import { maxHrReference } from './autoTag'

export interface ImportPlan {
  creates: Omit<WorkoutEntry, 'id'>[]
  updates: { id: ID; patch: Partial<WorkoutEntry> }[]
}

function sameKind(a: Omit<WorkoutEntry, 'id'>, e: WorkoutEntry): boolean {
  if (a.category !== e.category) return false
  if (a.category === 'aerobic') return a.sport === e.sport
  return true
}

/** When merging into a manual entry, keep the user's own naming and tag. */
function mergePatch(entry: Omit<WorkoutEntry, 'id'>): Partial<WorkoutEntry> {
  const rest: Partial<WorkoutEntry> = { ...entry }
  delete rest.strengthName
  delete rest.otherName
  delete rest.aerobicIntensity
  delete rest.autoTagged
  return rest
}

/** Drop the auto tag from a patch once the user has set the label themselves. */
function keepUserTag(
  patch: Partial<WorkoutEntry>,
  existing: WorkoutEntry,
): Partial<WorkoutEntry> {
  if (existing.autoTagged === false && existing.aerobicIntensity) {
    const next = { ...patch }
    delete next.aerobicIntensity
    delete next.autoTagged
    return next
  }
  return patch
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
  // reference max HR from everything we know, so the very first import (empty
  // log) can still tag by heart rate
  const incomingMaxes = activities
    .map((a) => a.maxHR)
    .filter((v): v is number => typeof v === 'number')
  const candidates = [maxHrReference(existingLog) ?? 0, ...incomingMaxes]
  const best = Math.max(...candidates, 0)
  const maxHrRef = best > 120 ? best : undefined

  for (const a of activities) {
    if (seenActivityIds.has(a.activityId)) continue
    seenActivityIds.add(a.activityId)

    const entry = activityToEntry(a, maxHrRef)
    if (!entry.date) continue

    const existing = byGarminId.get(a.activityId)
    if (existing) {
      updates.push({ id: existing.id, patch: keepUserTag(entry, existing) })
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
