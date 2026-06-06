import { afterEach, describe, expect, it, vi } from 'vitest'

import { BouncingSliderStore } from '../src/bouncing-slider-store.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('BouncingSliderStore', () => {
  it('starts at min and stays put until subscribed', () => {
    const store = new BouncingSliderStore(1, 4, 10, null)
    expect(store.getSnapshot().position).toBe(1)
    expect(store.getSnapshot().tickCount).toBe(0)
    expect(store.getSnapshot().autoLanded).toBe(null)
  })

  it('advances one cell per tick and bounces off both endpoints', () => {
    vi.useFakeTimers()
    const store = new BouncingSliderStore(1, 4, 10, null)
    const unsubscribe = store.subscribe(() => {})
    const positions: number[] = []
    for (let i = 0; i < 7; i++) {
      vi.advanceTimersByTime(10)
      positions.push(store.getSnapshot().position)
    }
    // 1→2→3→4 (hit max, reverse) →3→2→1 (hit min, reverse) →2
    expect(positions).toEqual([2, 3, 4, 3, 2, 1, 2])
    unsubscribe()
  })

  it('commit() returns the current position and freezes later ticks', () => {
    vi.useFakeTimers()
    const store = new BouncingSliderStore(1, 4, 10, null)
    const unsubscribe = store.subscribe(() => {})
    vi.advanceTimersByTime(20) // ticks: 1→2→3, position now 3
    expect(store.commit()).toBe(3)
    vi.advanceTimersByTime(50) // committed → guard freezes the cursor
    expect(store.getSnapshot().position).toBe(3)
    unsubscribe()
  })

  it('clears the interval when the last subscriber detaches (no leaked timer)', () => {
    vi.useFakeTimers()
    const store = new BouncingSliderStore(1, 4, 10, null)
    const unsubscribe = store.subscribe(() => {})
    vi.advanceTimersByTime(10) // position 2
    expect(store.getSnapshot().position).toBe(2)
    unsubscribe()
    vi.advanceTimersByTime(100) // no subscriber → interval cleared → no ticks
    expect(store.getSnapshot().position).toBe(2)
  })

  it('rewinds the cursor to the new min on a range change', () => {
    const store = new BouncingSliderStore(1, 4, 10, null)
    store.setRange(10, 13, 10, null)
    expect(store.getSnapshot().position).toBe(10)
  })

  it('leaves autoLanded null across an interactive (no auto-land) sweep', () => {
    vi.useFakeTimers()
    const store = new BouncingSliderStore(1, 4, 10, null)
    const unsubscribe = store.subscribe(() => {})
    vi.advanceTimersByTime(70)
    expect(store.getSnapshot().autoLanded).toBe(null)
    unsubscribe()
  })
})
