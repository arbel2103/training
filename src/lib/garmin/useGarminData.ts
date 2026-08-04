import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { getCached, putCached } from './cache'
import { getJsonFile } from './githubClient'
import { hasPat } from './pat'
import { garminErrorMessage, manualSync, refreshFromRepo } from './sync'
import type { GarminActivityDetailBundle } from './types'

const STALE_MS = 6 * 60 * 60 * 1000 // 6h
const LAST_AUTOSYNC_KEY = 'garmin-last-autosync'

/**
 * On app open, pull fresh data from the repo (cheap, sha-cached). Then, if the
 * last Garmin sync is more than ~6h old, trigger a real sync automatically —
 * this replaces the fixed daily schedule. A 6h local cooldown makes sure a slow
 * or failed run doesn't get re-dispatched on every reopen. Runs once per load.
 */
export function useGarminRefreshOnMount(): void {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!hasPat()) return

    void (async () => {
      await refreshFromRepo().catch(() => {
        /* errors surface via garminSyncStatus */
      })

      const status = useStore.getState().garminSyncStatus
      if (status.state === 'dispatching' || status.state === 'running') return

      const now = Date.now()
      const lastSync = status.lastGarminSyncAt
        ? Date.parse(status.lastGarminSyncAt)
        : 0
      const lastAuto = Number(localStorage.getItem(LAST_AUTOSYNC_KEY) ?? 0)

      const stale = now - lastSync > STALE_MS
      const cooldownPassed = now - lastAuto > STALE_MS
      if (stale && cooldownPassed) {
        localStorage.setItem(LAST_AUTOSYNC_KEY, String(now))
        void manualSync().catch(() => {
          /* failure surfaces via garminSyncStatus; won't retry for 6h */
        })
      }
    })()
  }, [])
}

interface DetailState {
  data?: GarminActivityDetailBundle
  loading: boolean
  error?: string
}

/** Load an activity's detail bundle on demand (IndexedDB-cached; immutable). */
export function useActivityDetail(activityId?: number): DetailState {
  const [state, setState] = useState<DetailState>({ loading: false })

  useEffect(() => {
    if (activityId == null) {
      setState({ loading: false })
      return
    }
    let cancelled = false
    const path = `data/activity-details/${activityId}.json`
    setState({ loading: true })

    void (async () => {
      try {
        const cached = await getCached<GarminActivityDetailBundle>(path)
        if (cached) {
          if (!cancelled) setState({ data: cached.json, loading: false })
          return
        }
        const json = await getJsonFile<GarminActivityDetailBundle>(path)
        if (json != null) await putCached(path, 'immutable', json)
        if (!cancelled) {
          setState({ data: json ?? undefined, loading: false })
        }
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: garminErrorMessage(e) })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activityId])

  return state
}
