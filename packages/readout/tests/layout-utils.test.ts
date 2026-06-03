import { describe, expect, it } from 'vitest'

import {
  centerVisual,
  padStartVisual,
  padToColumn,
  visualWidth,
} from '../src/layout-utils.js'

describe('layout-utils', () => {
  it('counts CJK as two columns', () => {
    expect(visualWidth('上6')).toBe(3)
    expect(visualWidth('abc')).toBe(3)
  })
  it('padToColumn pads with at least minGap', () => {
    expect(padToColumn('ab', 5)).toBe('ab   ')
    expect(padToColumn('abcde', 5, 2)).toBe('abcde  ')
  })
  it('padStartVisual right-aligns within visual width', () => {
    expect(padStartVisual('ab', 5)).toBe('   ab')
  })
  it('centerVisual centres within visual width', () => {
    expect(centerVisual('ab', 6)).toBe('  ab  ')
  })
})
