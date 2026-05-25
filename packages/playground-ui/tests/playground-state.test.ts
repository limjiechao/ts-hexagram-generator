// Pure unit tests for the Hexagram Playground reducer. No React, no Ink —
// state transitions are exercised directly by dispatching actions against
// `initialPlaygroundState()`.

import { describe, expect, it } from 'vitest'

import {
  initialPlaygroundState,
  isTypingRunOpen,
  playgroundReducer,
  type PlaygroundAction,
  type PlaygroundState,
} from '../src/playground-state'

function reduce(
  state: PlaygroundState,
  ...actions: readonly PlaygroundAction[]
): PlaygroundState {
  let current = state
  for (const action of actions) {
    current = playgroundReducer(current, action)
  }
  return current
}

describe('initialPlaygroundState', () => {
  it('opens on Qian, focus on L1, no typing run, no save', () => {
    const state = initialPlaygroundState()
    expect(state.lines).toEqual([7, 7, 7, 7, 7, 7])
    expect(state.focusIndex).toBe(0)
    expect(state.typingRun).toBe(null)
    expect(state.mode).toBe('idle')
    expect(state.savedPath).toBe(null)
    expect(state.saveError).toBe(null)
    expect(isTypingRunOpen(state)).toBe(false)
  })
})

describe('focusMove', () => {
  it('moves the cursor up/down within 0..5', () => {
    const state = initialPlaygroundState()
    const up = reduce(state, { type: 'focusMove', delta: 1 })
    expect(up.focusIndex).toBe(1)
    const down = reduce(up, { type: 'focusMove', delta: -1 })
    expect(down.focusIndex).toBe(0)
  })

  it('clamps at the bottom (0)', () => {
    const state = initialPlaygroundState()
    const next = reduce(state, { type: 'focusMove', delta: -1 })
    expect(next.focusIndex).toBe(0)
    expect(next).toBe(state) // no-op → same reference
  })

  it('clamps at the top (5)', () => {
    let state = initialPlaygroundState()
    for (let index = 0; index < 10; index += 1) {
      state = reduce(state, { type: 'focusMove', delta: 1 })
    }
    expect(state.focusIndex).toBe(5)
  })

  it('closes an open typing run', () => {
    const state = reduce(initialPlaygroundState(), {
      type: 'typeDigit',
      digit: 8,
    })
    expect(state.typingRun).not.toBe(null)
    const moved = reduce(state, { type: 'focusMove', delta: -1 })
    expect(moved.typingRun).toBe(null)
  })
})

describe('flipPolarity', () => {
  it('flips the focused line 7 → 8 and closes any typing run', () => {
    const state = initialPlaygroundState()
    const next = reduce(state, { type: 'flipPolarity' })
    expect(next.lines[0]).toBe(8)
    expect(next.typingRun).toBe(null)
  })

  it('preserves motion when flipping a moving line (9 ↔ 6)', () => {
    const state = reduce(initialPlaygroundState(), { type: 'cycleForward' })
    expect(state.lines[0]).toBe(9)
    const flipped = reduce(state, { type: 'flipPolarity' })
    expect(flipped.lines[0]).toBe(6)
  })
})

describe('cycleForward / cycleBackward', () => {
  it('walks the 7 → 9 → 8 → 6 cycle at the focused line', () => {
    let state = initialPlaygroundState()
    state = reduce(state, { type: 'cycleForward' })
    expect(state.lines[0]).toBe(9)
    state = reduce(state, { type: 'cycleForward' })
    expect(state.lines[0]).toBe(8)
    state = reduce(state, { type: 'cycleForward' })
    expect(state.lines[0]).toBe(6)
    state = reduce(state, { type: 'cycleForward' })
    expect(state.lines[0]).toBe(7)
  })

  it('reverses with cycleBackward', () => {
    let state = initialPlaygroundState()
    state = reduce(state, { type: 'cycleForward' }, { type: 'cycleBackward' })
    expect(state.lines[0]).toBe(7)
  })
})

describe('typeDigit', () => {
  it('writes the focused line and advances focus by 1', () => {
    const state = initialPlaygroundState()
    const next = reduce(state, { type: 'typeDigit', digit: 8 })
    expect(next.lines).toEqual([8, 7, 7, 7, 7, 7])
    expect(next.focusIndex).toBe(1)
    expect(next.typingRun).toEqual({
      snapshot: [7, 7, 7, 7, 7, 7],
      startFocus: 0,
      digits: [8],
    })
  })

  it('captures the snapshot only on the first digit of a run', () => {
    const state = initialPlaygroundState()
    const first = reduce(state, { type: 'typeDigit', digit: 8 })
    const snapshot = first.typingRun?.snapshot
    const second = reduce(first, { type: 'typeDigit', digit: 9 })
    // The snapshot array is shared across the run — one atomic edit.
    expect(second.typingRun?.snapshot).toBe(snapshot)
    expect(second.typingRun?.digits).toEqual([8, 9])
    expect(second.lines).toEqual([8, 9, 7, 7, 7, 7])
    expect(second.focusIndex).toBe(2)
  })

  it('ignores a 7th digit (grilled "no overflow past L6" rule)', () => {
    let state = initialPlaygroundState()
    for (const digit of [6, 7, 8, 9, 6, 7] as const) {
      state = reduce(state, { type: 'typeDigit', digit })
    }
    expect(state.lines).toEqual([6, 7, 8, 9, 6, 7])
    expect(state.focusIndex).toBe(5)
    // A 7th digit is dropped on the floor — neither lines nor focus change.
    const previous = state
    state = reduce(state, { type: 'typeDigit', digit: 8 })
    expect(state).toBe(previous)
  })

  it('typing the same digit as the snapshot still records to the run', () => {
    // Bug repro for review finding #2: previously the diff-based digitsTyped
    // helper missed identical-value typings, breaking Delete.
    const state = initialPlaygroundState()
    const typed = reduce(state, { type: 'typeDigit', digit: 7 })
    // Lines unchanged (L1 was already 7), but a run is now open.
    expect(typed.lines).toEqual([7, 7, 7, 7, 7, 7])
    expect(typed.typingRun?.digits).toEqual([7])
    expect(typed.focusIndex).toBe(1)
    // Delete pops the recorded 7, snapping focus back to L1.
    const popped = reduce(typed, { type: 'deleteTyped' })
    expect(popped.lines).toEqual([7, 7, 7, 7, 7, 7])
    expect(popped.focusIndex).toBe(0)
    expect(popped.typingRun).toBe(null)
  })

  it('typing run starting at non-zero focus round-trips through Delete', () => {
    // Bug repro for review finding #2: previously a run starting at focus > 0
    // would be reconstructed wrong, leaving later edits unreachable.
    let state = initialPlaygroundState()
    state = reduce(state, { type: 'focusMove', delta: 1 })
    state = reduce(state, { type: 'focusMove', delta: 1 })
    expect(state.focusIndex).toBe(2)
    state = reduce(
      state,
      { type: 'typeDigit', digit: 9 },
      { type: 'typeDigit', digit: 6 },
    )
    expect(state.lines).toEqual([7, 7, 9, 6, 7, 7])
    expect(state.focusIndex).toBe(4)
    expect(state.typingRun).toEqual({
      snapshot: [7, 7, 7, 7, 7, 7],
      startFocus: 2,
      digits: [9, 6],
    })
    // Delete pops the most recent 6 — L4 reverts.
    state = reduce(state, { type: 'deleteTyped' })
    expect(state.lines).toEqual([7, 7, 9, 7, 7, 7])
    expect(state.focusIndex).toBe(3)
    // Another Delete pops the 9 — L3 reverts, run closes.
    state = reduce(state, { type: 'deleteTyped' })
    expect(state.lines).toEqual([7, 7, 7, 7, 7, 7])
    expect(state.focusIndex).toBe(2)
    expect(state.typingRun).toBe(null)
  })
})

describe('deleteTyped', () => {
  it('is a no-op when no typing run is open', () => {
    const state = initialPlaygroundState()
    const next = reduce(state, { type: 'deleteTyped' })
    expect(next).toBe(state)
  })

  it('reverts the last typed line and moves focus back', () => {
    let state = initialPlaygroundState()
    state = reduce(
      state,
      { type: 'typeDigit', digit: 8 },
      { type: 'typeDigit', digit: 9 },
    )
    expect(state.lines).toEqual([8, 9, 7, 7, 7, 7])
    const popped = reduce(state, { type: 'deleteTyped' })
    expect(popped.lines).toEqual([8, 7, 7, 7, 7, 7])
    expect(popped.focusIndex).toBe(1)
    expect(popped.typingRun).not.toBe(null)
  })

  it('closes the typing run when the last digit is popped', () => {
    let state = initialPlaygroundState()
    state = reduce(state, { type: 'typeDigit', digit: 8 })
    state = reduce(state, { type: 'deleteTyped' })
    expect(state.lines).toEqual([7, 7, 7, 7, 7, 7])
    expect(state.focusIndex).toBe(0)
    expect(state.typingRun).toBe(null)
  })
})

describe('escapePressed', () => {
  it('restores the snapshot and closes the run when typing is open', () => {
    // Fiddle with arrows + flips first so the snapshot is non-trivial.
    let state = initialPlaygroundState()
    state = reduce(
      state,
      { type: 'flipPolarity' },
      { type: 'focusMove', delta: 1 },
      { type: 'cycleForward' },
    )
    // L1=8, L2=9 (yang moving from 7 via cycleForward); focus is on L2.
    expect(state.lines).toEqual([8, 9, 7, 7, 7, 7])
    expect(state.focusIndex).toBe(1)
    // Now start typing from the current focus (L2). Typing writes at
    // focus and advances; it does NOT auto-reset focus to L1.
    state = reduce(
      state,
      { type: 'typeDigit', digit: 6 },
      { type: 'typeDigit', digit: 6 },
    )
    expect(state.lines).toEqual([8, 6, 6, 7, 7, 7])
    // ESC reverts only the typing run; the fiddle survives.
    state = reduce(state, { type: 'escapePressed' })
    expect(state.lines).toEqual([8, 9, 7, 7, 7, 7])
    expect(state.typingRun).toBe(null)
  })

  it('is a no-op when no typing run is open', () => {
    const state = initialPlaygroundState()
    const next = reduce(state, { type: 'escapePressed' })
    expect(next).toBe(state)
  })
})

describe('reset', () => {
  it('wipes to all-7s regardless of prior state', () => {
    let state = initialPlaygroundState()
    state = reduce(
      state,
      { type: 'cycleForward' },
      { type: 'focusMove', delta: 1 },
      { type: 'typeDigit', digit: 6 },
    )
    const reset = reduce(state, { type: 'reset' })
    expect(reset.lines).toEqual([7, 7, 7, 7, 7, 7])
    expect(reset.focusIndex).toBe(0)
    expect(reset.typingRun).toBe(null)
  })
})

describe('save mode', () => {
  it('beginSave puts the reducer in saving mode and preserves the typing run', () => {
    // Reviewer #2 UX fix: a user can mis-press S during typing, cancel, and
    // still ESC to revert their digits — beginSave no longer wipes the run.
    const state = reduce(initialPlaygroundState(), {
      type: 'typeDigit',
      digit: 8,
    })
    const saving = reduce(state, { type: 'beginSave' })
    expect(saving.mode).toBe('saving')
    expect(saving.typingRun).not.toBe(null)
    const cancelled = reduce(saving, { type: 'cancelSave' })
    expect(cancelled.mode).toBe('idle')
    expect(cancelled.typingRun).not.toBe(null)
    const reverted = reduce(cancelled, { type: 'escapePressed' })
    expect(reverted.lines).toEqual([7, 7, 7, 7, 7, 7])
    expect(reverted.typingRun).toBe(null)
  })

  it('cancelSave returns to idle without recording a savedPath', () => {
    const state = reduce(
      initialPlaygroundState(),
      { type: 'beginSave' },
      { type: 'cancelSave' },
    )
    expect(state.mode).toBe('idle')
    expect(state.savedPath).toBe(null)
  })

  it('saveSucceeded records the relative path and clears any prior error', () => {
    let state = reduce(initialPlaygroundState(), { type: 'beginSave' })
    state = reduce(state, {
      type: 'saveSucceeded',
      relativePath: 'consultations/c.md',
    })
    expect(state.mode).toBe('idle')
    expect(state.savedPath).toBe('consultations/c.md')
    expect(state.saveError).toBe(null)
  })

  it('saveFailed records the error and returns to idle', () => {
    let state = reduce(initialPlaygroundState(), { type: 'beginSave' })
    state = reduce(state, {
      type: 'saveFailed',
      message: 'EACCES: permission denied',
    })
    expect(state.mode).toBe('idle')
    expect(state.saveError).toBe('EACCES: permission denied')
  })

  it('drops keystrokes while in saving mode (no-op for non-save actions)', () => {
    const state = reduce(initialPlaygroundState(), { type: 'beginSave' })
    const after = reduce(state, { type: 'cycleForward' })
    expect(after).toBe(state)
  })
})
