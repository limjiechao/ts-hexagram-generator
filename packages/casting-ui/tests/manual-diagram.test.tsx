import { describe, expect, it } from 'vitest'

import { manualTitleRow } from '../src/manual-diagram'

describe('manualTitleRow', () => {
  it('renders a slim line / cast / step title with no inline dots', () => {
    expect(manualTitleRow(3, 1, 'pilesL')).toBe(
      'Line 3/6 · Cast 2/3 · Step 1/4',
    )
    expect(manualTitleRow(3, 1, 'remL')).toBe('Line 3/6 · Cast 2/3 · Step 2/4')
    expect(manualTitleRow(3, 1, 'pilesR')).toBe(
      'Line 3/6 · Cast 2/3 · Step 3/4',
    )
    expect(manualTitleRow(3, 1, 'remR')).toBe('Line 3/6 · Cast 2/3 · Step 4/4')
  })
})
