import { useEffect, useRef, useState } from 'react'
import { getCached, putCached } from './cache'
import { getJsonFile } from './githubClient'
import { hasPat } from './pat'
import { garminErrorMessage, refreshFromRepo } from './sync'
import type { GarminActivityDetailBundle } from './types'

const LAST_REFRESH_KEY = 'garmin-last-refresh'
const REFRESH_THROTTLE_MS = 15 * 60 * 1000

/**
 * On app mount, silently pull fresh data from the repo when a PAT is present,
 * at most once every 15 minutes. Runs once per session load.
 */
export function useGarminRefreshOnMount(): void {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!hasPat()) return

    const last = Number(localStorage.getItem(LAST_REFRESH_KEY) ?? 0)
    if (Date.now() - last < REFRESH_THROTTLE_MS) return

    localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()))
    void refreshFromRepo().catch(() => {
      /* errors surface via garminSyncStatus; nothing to do on mount */
    })
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
