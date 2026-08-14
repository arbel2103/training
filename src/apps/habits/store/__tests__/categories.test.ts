import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../useStore'

const s = () => useStore.getState()
const catNames = () =>
  [...s().categories].sort((a, b) => a.order - b.order).map((c) => c.name)

/** Replace the seeded categories with three known, ordered ones. */
function reset() {
  useStore.setState({
    categories: [
      { id: 'a', name: 'שגרת בוקר', order: 0, collapsed: false },
      { id: 'b', name: 'שגרת ערב', order: 1, collapsed: false },
      { id: 'c', name: 'יומי', order: 2, collapsed: false },
    ],
    habits: [],
    freezes: [],
  })
}

beforeEach(reset)

describe('moveCategory', () => {
  it('swaps a category with the one above it', () => {
    s().moveCategory('b', -1)
    expect(catNames()).toEqual(['שגרת ערב', 'שגרת בוקר', 'יומי'])
  })

  it('swaps a category with the one below it', () => {
    s().moveCategory('b', 1)
    expect(catNames()).toEqual(['שגרת בוקר', 'יומי', 'שגרת ערב'])
  })

  it('does nothing at the top edge', () => {
    s().moveCategory('a', -1)
    expect(catNames()).toEqual(['שגרת בוקר', 'שגרת ערב', 'יומי'])
  })

  it('does nothing at the bottom edge', () => {
    s().moveCategory('c', 1)
    expect(catNames()).toEqual(['שגרת בוקר', 'שגרת ערב', 'יומי'])
  })

  it('keeps working after a category in between was removed', () => {
    s().removeCategory('b') // leaves a gap: orders 0 and 2
    s().moveCategory('c', -1)
    expect(catNames()).toEqual(['יומי', 'שגרת בוקר'])
  })

  it('is repeatable — moving the same category up twice reaches the top', () => {
    s().moveCategory('c', -1)
    s().moveCategory('c', -1)
    expect(catNames()).toEqual(['יומי', 'שגרת בוקר', 'שגרת ערב'])
  })
})

describe('removeCategory', () => {
  it('removes a category that has no habits at all', () => {
    expect(s().categories).toHaveLength(3)
    s().removeCategory('b')
    expect(s().categories.map((c) => c.id)).toEqual(['a', 'c'])
  })

  it('takes its habits down with it', () => {
    s().addHabit('a', 'שתיית מים')
    const habitId = s().habits[0].id
    s().removeCategory('a')
    expect(s().categories.find((c) => c.id === 'a')).toBeUndefined()
    expect(s().habits.find((h) => h.id === habitId)).toBeUndefined()
  })

  it('leaves habits in other categories untouched', () => {
    s().addHabit('a', 'שתיית מים')
    s().addHabit('b', 'קריאה')
    s().removeCategory('a')
    expect(s().habits.map((h) => h.name)).toEqual(['קריאה'])
  })
})
