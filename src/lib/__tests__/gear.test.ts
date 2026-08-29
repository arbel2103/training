import { beforeEach, describe, expect, it } from 'vitest'
import { useStore, type WorkoutEntry } from '../../store/useStore'
import {
  GEAR_PRESETS,
  activeGear,
  gearDue,
  gearStatus,
  gearUsage,
  retiredGear,
  type GearItem,
} from '../gear'

const shoes: GearItem = {
  id: 'g1',
  kind: 'run-shoes',
  name: 'נעלי ריצה',
  metric: 'km',
  sports: ['run'],
  startValue: 0,
  target: 700,
  addedOn: '2026-01-01',
}

const run = (date: string, distance: number): WorkoutEntry => ({
  id: `r-${date}-${distance}`,
  date,
  category: 'aerobic',
  sport: 'run',
  distance,
})
const ride = (date: string, distance: number): WorkoutEntry => ({
  id: `b-${date}`,
  date,
  category: 'aerobic',
  sport: 'bike',
  distance,
})
const swim = (date: string, metres: number, min: number): WorkoutEntry => ({
  id: `s-${date}`,
  date,
  category: 'aerobic',
  sport: 'swim',
  distance: metres,
  durationMin: min,
})

describe('gearUsage', () => {
  it('adds up only the matching sport', () => {
    const log = [run('2026-02-01', 10), ride('2026-02-02', 60), run('2026-02-03', 15)]
    expect(gearUsage(shoes, log)).toBe(25)
  })

  it('counts from what the item arrived with', () => {
    expect(gearUsage({ ...shoes, startValue: 250 }, [run('2026-02-01', 10)])).toBe(260)
  })

  it('ignores workouts from before it was in service', () => {
    const log = [run('2025-12-31', 100), run('2026-01-01', 5)]
    expect(gearUsage(shoes, log)).toBe(5)
  })

  it('stops accruing once retired', () => {
    const retired = { ...shoes, retiredOn: '2026-02-02' }
    const log = [run('2026-02-01', 10), run('2026-02-05', 40)]
    expect(gearUsage(retired, log)).toBe(10)
  })

  it('measures time-based gear in hours', () => {
    const wetsuit: GearItem = {
      ...shoes,
      metric: 'hours',
      sports: ['swim'],
      target: 100,
    }
    expect(gearUsage(wetsuit, [swim('2026-02-01', 2000, 45)])).toBeCloseTo(0.75)
  })

  it('wears with every workout when no sport is set', () => {
    const strap: GearItem = { ...shoes, metric: 'hours', sports: [], target: 400 }
    const log: WorkoutEntry[] = [
      { id: 'a', date: '2026-02-01', category: 'aerobic', sport: 'run', durationMin: 30 },
      { id: 'b', date: '2026-02-02', category: 'strength', durationMin: 60 },
    ]
    expect(gearUsage(strap, log)).toBeCloseTo(1.5)
  })

  /** Swim distance is stored in metres while run and bike are in km. */
  it('does not credit a swim with a thousand times its distance', () => {
    const kmOnSwim: GearItem = { ...shoes, sports: ['swim'] }
    expect(gearUsage(kmOnSwim, [swim('2026-02-01', 2000, 45)])).toBe(2)
  })
})

describe('gearStatus', () => {
  const at = (km: number) => gearStatus(shoes, [run('2026-02-01', km)])

  it('is fine early on', () => {
    const s = at(100)
    expect(s.state).toBe('ok')
    expect(s.remaining).toBe(600)
    expect(s.progress).toBeCloseTo(100 / 700)
  })

  it('warns before the target, while there is time to order', () => {
    expect(at(650).state).toBe('soon')
  })

  it('calls it due at the target and stays due past it', () => {
    expect(at(700).state).toBe('due')
    expect(at(900).state).toBe('due')
  })

  it('clamps progress and never reports negative remaining', () => {
    const s = at(900)
    expect(s.progress).toBe(1)
    expect(s.remaining).toBe(0)
  })

  it('just counts when no target is set', () => {
    const s = gearStatus({ ...shoes, target: undefined }, [run('2026-02-01', 900)])
    expect(s.state).toBe('ok')
    expect(s.used).toBe(900)
    expect(s.progress).toBeUndefined()
  })
})

describe('sorting and filtering', () => {
  const log = [run('2026-02-01', 600)]
  const fresh: GearItem = { ...shoes, id: 'g2', addedOn: '2026-03-01' }
  const old: GearItem = { ...shoes, id: 'g3', retiredOn: '2026-02-10' }

  it('leads with the most worn, and hides what is retired', () => {
    const active = activeGear([fresh, shoes, old], log)
    expect(active.map((g) => g.id)).toEqual(['g1', 'g2'])
  })

  it('lists retired gear newest first', () => {
    const older = { ...old, id: 'g4', retiredOn: '2026-01-05' }
    expect(retiredGear([older, old]).map((g) => g.id)).toEqual(['g3', 'g4'])
  })

  it('counts what is actually due', () => {
    expect(gearDue([fresh, shoes], [run('2026-02-01', 800)]).map((g) => g.id)).toEqual([
      'g1',
    ])
  })
})

describe('presets', () => {
  it('are internally consistent', () => {
    for (const p of GEAR_PRESETS) {
      expect(p.target).toBeGreaterThan(0)
      expect(['km', 'hours']).toContain(p.metric)
      // km on swimming would be measuring the wrong thing entirely
      if (p.sports.includes('swim')) expect(p.metric).toBe('hours')
    }
    expect(new Set(GEAR_PRESETS.map((p) => p.id)).size).toBe(GEAR_PRESETS.length)
  })
})

describe('replacing an item', () => {
  beforeEach(() => useStore.setState({ gear: [], log: [] }))

  it('retires the old one and starts the new at zero', () => {
    const id = useStore.getState().addGear({ ...shoes, startValue: 120 })
    const newId = useStore.getState().replaceGear(id, { name: 'נעלי ריצה חדשות' })

    const gear = useStore.getState().gear
    expect(gear).toHaveLength(2)
    const old = gear.find((g) => g.id === id)!
    const next = gear.find((g) => g.id === newId)!
    expect(old.retiredOn).toBeTruthy()
    expect(next.name).toBe('נעלי ריצה חדשות')
    expect(next.startValue).toBe(0)
    expect(next.retiredOn).toBeUndefined()
    // what it is and how it is measured carries over
    expect(next).toMatchObject({ kind: 'run-shoes', metric: 'km', target: 700 })
  })

  it('reports an unknown item instead of inventing one', () => {
    expect(useStore.getState().replaceGear('nope', {})).toBeNull()
    expect(useStore.getState().gear).toHaveLength(0)
  })
})
