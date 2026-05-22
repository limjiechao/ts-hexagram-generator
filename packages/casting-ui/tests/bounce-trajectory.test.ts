import { describe, expect, it } from 'vitest'

import {
  armDelayTicks,
  firstLandingTick,
  positionAtTick,
} from '../src/bounce-trajectory'

// The pure bounce-trajectory module reproduces `BouncingSliderStore`'s
// triangle wave EXACTLY: `position` starts at `min` (tick 0); each tick
// `next = position + direction`, bouncing off `max` (→ `max - 1`) and `min`
// (→ `min + 1`). The store consults this module each tick to decide whether
// to auto-land, so the visible motion and the landing are the same wave.

describe('positionAtTick', () => {
  it('returns min at tick 0', () => {
    expect(positionAtTick(0, 1, 10)).toBe(1)
    expect(positionAtTick(0, 5, 9)).toBe(5)
  })

  it('walks up one cell per tick before any bounce', () => {
    expect(positionAtTick(1, 1, 10)).toBe(2)
    expect(positionAtTick(2, 1, 10)).toBe(3)
    expect(positionAtTick(9, 1, 10)).toBe(10)
  })

  it('bounces off max to max - 1, not overflowing', () => {
    // range 1..3: tick 0→1, 1→2, 2→3, 3→2 (bounce), 4→1 (bounce off min).
    expect(positionAtTick(0, 1, 3)).toBe(1)
    expect(positionAtTick(1, 1, 3)).toBe(2)
    expect(positionAtTick(2, 1, 3)).toBe(3)
    expect(positionAtTick(3, 1, 3)).toBe(2)
    expect(positionAtTick(4, 1, 3)).toBe(1)
  })

  it('bounces off min to min + 1 on the return sweep', () => {
    // range 1..3 continued: tick 4→1, 5→2, 6→3, 7→2 — a clean period of 4.
    expect(positionAtTick(5, 1, 3)).toBe(2)
    expect(positionAtTick(6, 1, 3)).toBe(3)
    expect(positionAtTick(7, 1, 3)).toBe(2)
    expect(positionAtTick(8, 1, 3)).toBe(1)
  })

  it('stays within [min, max] for every tick over a long horizon', () => {
    for (let tick = 0; tick < 500; tick += 1) {
      const pos = positionAtTick(tick, 1, 48)
      expect(pos).toBeGreaterThanOrEqual(1)
      expect(pos).toBeLessThanOrEqual(48)
    }
  })

  it('handles the degenerate single-cell range (max === min)', () => {
    // With only one cell the cursor can never move — every tick is `min`.
    expect(positionAtTick(0, 4, 4)).toBe(4)
    expect(positionAtTick(1, 4, 4)).toBe(4)
    expect(positionAtTick(99, 4, 4)).toBe(4)
  })

  it('handles a two-cell range', () => {
    // range 1..2: 0→1, 1→2, 2→1 (bounce: max-1), 3→2, 4→1 — period 2.
    expect(positionAtTick(0, 1, 2)).toBe(1)
    expect(positionAtTick(1, 1, 2)).toBe(2)
    expect(positionAtTick(2, 1, 2)).toBe(1)
    expect(positionAtTick(3, 1, 2)).toBe(2)
  })
})

describe('firstLandingTick', () => {
  it('returns the first tick at or after the arm delay where the cursor sits on the target', () => {
    // range 1..10, target 3. The cursor is on 3 at ticks 2, 16, 18, … With
    // an arm delay of 0 the first hit is tick 2.
    expect(firstLandingTick(3, 1, 10, 0)).toBe(2)
  })

  it('does not land before the arm delay even when the cursor is on the target earlier', () => {
    // target 3 in 1..10 — naturally on 3 at tick 2, but with armDelayTicks 5
    // the landing must wait for the next pass through 3.
    const landing = firstLandingTick(3, 1, 10, 5)
    expect(landing).toBeGreaterThanOrEqual(5)
    expect(positionAtTick(landing, 1, 10)).toBe(3)
  })

  it('lands exactly at the arm delay tick when the cursor is already on the target there', () => {
    // target 3 in 1..10 sits on 3 at tick 2 and tick 16. armDelayTicks 16
    // → land at 16.
    expect(firstLandingTick(3, 1, 10, 16)).toBe(16)
  })

  it('lands on the min endpoint', () => {
    // target = min: cursor is on min at tick 0 and then every period.
    const landing = firstLandingTick(1, 1, 10, 5)
    expect(landing).toBeGreaterThanOrEqual(5)
    expect(positionAtTick(landing, 1, 10)).toBe(1)
  })

  it('lands on the max endpoint', () => {
    const landing = firstLandingTick(10, 1, 10, 5)
    expect(landing).toBeGreaterThanOrEqual(5)
    expect(positionAtTick(landing, 1, 10)).toBe(10)
  })

  it('lands immediately on a degenerate single-cell range', () => {
    // max === min: the only reachable value is min, so the target must be min
    // and the landing is the arm delay tick itself.
    expect(firstLandingTick(4, 4, 4, 0)).toBe(0)
    expect(firstLandingTick(4, 4, 4, 7)).toBe(7)
  })
})

describe('armDelayTicks', () => {
  it('converts an arm delay in ms to whole ticks via the per-cast tickMs', () => {
    expect(armDelayTicks(1500, 100)).toBe(15)
    expect(armDelayTicks(1500, 250)).toBe(6)
  })

  it('rounds to the nearest whole tick', () => {
    // 1500 / 80 = 18.75 → 19.
    expect(armDelayTicks(1500, 80)).toBe(19)
  })

  it('never returns a negative tick count', () => {
    expect(armDelayTicks(0, 100)).toBe(0)
  })
})
