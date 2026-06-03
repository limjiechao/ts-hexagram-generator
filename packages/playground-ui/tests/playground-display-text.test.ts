import { describe, expect, it } from 'vitest'

import {
  capitalizeFirst,
  padRightToWidth,
  plainVisualWidth,
  visualWidth,
} from '../src/playground-display-text'

describe('playground-display-text', () => {
  it('visualWidth counts CJK as two', () => {
    expect(visualWidth('巽')).toBe(2)
  })
  it('plainVisualWidth ignores ANSI codes', () => {
    expect(
      plainVisualWidth(
        `${String.fromCodePoint(0x1b)}[36mab${String.fromCodePoint(0x1b)}[39m`,
      ),
    ).toBe(2)
  })
  it('padRightToWidth pads to target', () => {
    expect(padRightToWidth('ab', 5)).toBe('ab   ')
  })
  it('capitalizeFirst capitalizes', () => {
    expect(capitalizeFirst('wind')).toBe('Wind')
  })
})
