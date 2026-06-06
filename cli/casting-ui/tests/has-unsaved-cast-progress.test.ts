import { initialLineState } from '@hexagram/core'
import { emptyPartialCastingRecord } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { hasUnsavedCastProgress } from '../src/has-unsaved-cast-progress.js'
import type { FlowState } from '../src/viewer-flow.js'

// Pure unit tests for `hasUnsavedCastProgress` — the leaf predicate over the
// casting flow state. No ink-testing-library, no mount: the function takes a
// plain `FlowState` and returns a boolean. The viewer's discard-confirm wiring
// is exercised separately in `viewer.test.tsx`; this file pins the predicate
// semantics in isolation.

// Build a `FlowState` from a `mode` plus optional overrides — the same shape
// helper used by `viewer-keymap.test.ts`.
function makeState(
  overrides: Partial<FlowState> & { mode: FlowState['mode'] },
): FlowState {
  return {
    flowKind: 'interactive',
    query: '',
    queryBuffer: '',
    castingBuffer: '',
    error: null,
    lineIndex: 0,
    castIndex: 0,
    partialCasting: emptyPartialCastingRecord(),
    completedLines: [],
    lineState: initialLineState,
    castingPlan: null,
    sections: null,
    savedPath: null,
    saveError: null,
    ...overrides,
  }
}

describe('hasUnsavedCastProgress', () => {
  it('is false on an empty awaitingQuery (nothing typed yet)', () => {
    expect(hasUnsavedCastProgress(makeState({ mode: 'awaitingQuery' }))).toBe(
      false,
    )
  })

  it('is false on an awaitingQuery whose buffer is only whitespace', () => {
    expect(
      hasUnsavedCastProgress(
        makeState({ mode: 'awaitingQuery', queryBuffer: '   \t  ' }),
      ),
    ).toBe(false)
  })

  it('is true once a non-whitespace query has been typed', () => {
    expect(
      hasUnsavedCastProgress(
        makeState({ mode: 'awaitingQuery', queryBuffer: 'Should I go?' }),
      ),
    ).toBe(true)
  })

  it('is true while casting (a split has been committed / is in progress)', () => {
    expect(
      hasUnsavedCastProgress(
        makeState({
          mode: 'casting',
          query: 'Should I go?',
          lineIndex: 0,
          castIndex: 1,
        }),
      ),
    ).toBe(true)
  })

  it('is true while computing (picks are complete but the file is not saved)', () => {
    expect(
      hasUnsavedCastProgress(
        makeState({ mode: 'computing', query: 'Should I go?' }),
      ),
    ).toBe(true)
  })

  it('is false at done (the consultation has been saved to disk)', () => {
    expect(
      hasUnsavedCastProgress(
        makeState({
          mode: 'done',
          query: 'Should I go?',
          savedPath: '/tmp/consultation.txt',
        }),
      ),
    ).toBe(false)
  })
})
