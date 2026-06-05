import { describe, expect, it } from 'vitest'

import {
  centerVisual,
  padStartVisual,
  padToColumn,
  visualWidth,
} from '../src/index.js'

describe('visualWidth', () => {
  it('counts ASCII as one column each', () => {
    expect(visualWidth('abc')).toBe(3)
    expect(visualWidth('')).toBe(0)
  })
  it('counts CJK ideographs as two columns', () => {
    expect(visualWidth('巽')).toBe(2)
    expect(visualWidth('上6')).toBe(3)
    expect(visualWidth('乾坤')).toBe(4)
  })
  it('counts fullwidth punctuation as two columns', () => {
    // 0xff08/0xff09 are fullwidth parentheses used in the position labels.
    expect(visualWidth('（一）')).toBe(6)
  })
  it('counts Hangul syllables as two columns', () => {
    // 0xac00 '가' is in the AC00–D7AF fullwidth block.
    expect(visualWidth('가')).toBe(2)
  })
  it('does not special-case combining marks (counts each code point)', () => {
    // 'e' + COMBINING ACUTE ACCENT (U+0301) — two code points, each width 1.
    // This pins the function's real (limited) behaviour, not an ideal.
    expect(visualWidth(`e${String.fromCodePoint(0x0301)}`)).toBe(2)
  })
})

describe('padToColumn', () => {
  it('pads to targetColumn with at least the default minGap of 1', () => {
    expect(padToColumn('ab', 5)).toBe('ab   ')
  })
  it('honours an explicit minGap when already at/over the target', () => {
    expect(padToColumn('abcde', 5, 2)).toBe('abcde  ')
  })
  it('measures width CJK-aware when computing the gap', () => {
    // '巽' is width 2, target 5 -> 3 trailing spaces.
    expect(padToColumn('巽', 5)).toBe('巽   ')
  })
})

describe('padStartVisual', () => {
  it('right-aligns within the visual width', () => {
    expect(padStartVisual('ab', 5)).toBe('   ab')
  })
  it('clamps to zero padding when text already exceeds width', () => {
    expect(padStartVisual('abcde', 3)).toBe('abcde')
  })
})

describe('centerVisual', () => {
  it('centres within the visual width (extra space on the right)', () => {
    expect(centerVisual('ab', 6)).toBe('  ab  ')
    expect(centerVisual('ab', 5)).toBe(' ab  ')
  })
  it('clamps to zero padding when text already exceeds width', () => {
    expect(centerVisual('abcde', 3)).toBe('abcde')
  })
})
