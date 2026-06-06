import { validateManualSplit } from '@hexagram/core/manual-validation'
import { describe, expect, it } from 'vitest'

import { manualFeedbackSurface } from '../src/manual-feedback.js'

// The exhaustive invariant coverage lives in core's own suite
// (`domain/core/tests/manual-validation.test.ts`). Here we only prove the
// casting-ui package's public surface still works end-to-end: that the prompt
// resolves `validateManualSplit` through the `@hexagram/core/manual-validation`
// specifier, and that `manualFeedbackSurface` routes each outcome.

describe('validateManualSplit (via the core specifier)', () => {
  it('validates a canonical round-1 24/49 split as ok', () => {
    expect(
      validateManualSplit({
        pilesL: 5,
        remL: 4,
        pilesR: 5,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({
      kind: 'ok',
      pick: 24,
      leftHeapTotal: 24,
      rightHeapTotal: 24,
    })
  })
})

// The single statement of where each validator outcome surfaces.
describe('manualFeedbackSurface', () => {
  it('routes conservation to the gauge', () => {
    expect(manualFeedbackSurface('conservation')).toBe('gauge')
  })
  it('routes rule violations to the strip', () => {
    expect(manualFeedbackSurface('zero-remainder')).toBe('strip')
    expect(manualFeedbackSurface('suspended-sum')).toBe('strip')
  })
  it('routes mid-edit and commit-ready to no surface', () => {
    expect(manualFeedbackSurface('incomplete')).toBe('none')
    expect(manualFeedbackSurface('ok')).toBe('none')
  })
})
