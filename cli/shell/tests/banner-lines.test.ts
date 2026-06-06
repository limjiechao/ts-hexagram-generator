// Pure unit tests for the home banner's line-render derivation. No React, no
// Ink: `deriveBannerLine` / `polarityOf` / `lineColors` are exercised directly.

import { polarityOf } from '@hexagram/core/line-semantics'
import {
  BOLD_GREY,
  BOLD_RED,
  DIM_RED,
  NORMAL_GREY,
} from '@hexagram/viewer-core'
import { describe, expect, it } from 'vitest'

import { deriveBannerLine, lineColors } from '../src/banner-lines.js'

describe('polarityOf', () => {
  it('classifies solid lines (7 young yang, 9 moving yang) as yang', () => {
    expect(polarityOf(7)).toBe('yang')
    expect(polarityOf(9)).toBe('yang')
  })

  it('classifies broken lines (8 young yin, 6 moving yin) as yin', () => {
    expect(polarityOf(8)).toBe('yin')
    expect(polarityOf(6)).toBe('yin')
  })
})

describe('deriveBannerLine — static lines', () => {
  it('renders a static yang line as a solid 9-column bar valued 7', () => {
    const cells = deriveBannerLine('yang', false, false)
    expect(cells.bar).toBe('━━━━━━━━━')
    expect(cells.bar).toHaveLength(9)
    expect(cells.value).toBe(7)
    expect(cells.role).toBe('static')
  })

  it('renders a static yin line as a gapped 9-column bar valued 8', () => {
    const cells = deriveBannerLine('yin', false, false)
    expect(cells.bar).toBe('━━━   ━━━')
    expect(cells.bar).toHaveLength(9)
    expect(cells.value).toBe(8)
    expect(cells.role).toBe('static')
  })

  it('ignores the pulse flag for static lines', () => {
    expect(deriveBannerLine('yang', false, true)).toEqual(
      deriveBannerLine('yang', false, false),
    )
    expect(deriveBannerLine('yin', false, true)).toEqual(
      deriveBannerLine('yin', false, false),
    )
  })
})

describe('deriveBannerLine — moving lines', () => {
  it('renders a moving yang line: ○ marker, value 9, pulsing role', () => {
    expect(deriveBannerLine('yang', true, true)).toEqual({
      bar: '━━━━○━━━━',
      value: 9,
      role: 'moving-bright',
    })
    expect(deriveBannerLine('yang', true, false)).toEqual({
      bar: '━━━━○━━━━',
      value: 9,
      role: 'moving-dim',
    })
  })

  it('renders a moving yin line: ✕ marker, value 6, pulsing role', () => {
    expect(deriveBannerLine('yin', true, true)).toEqual({
      bar: '━━━ ✕ ━━━',
      value: 6,
      role: 'moving-bright',
    })
    expect(deriveBannerLine('yin', true, false)).toEqual({
      bar: '━━━ ✕ ━━━',
      value: 6,
      role: 'moving-dim',
    })
  })
})

describe('lineColors', () => {
  it('maps static to [normal-grey value, bold-grey bar]', () => {
    expect(lineColors('static')).toEqual([NORMAL_GREY, BOLD_GREY])
  })

  it('maps moving-bright to bold-red on both', () => {
    expect(lineColors('moving-bright')).toEqual([BOLD_RED, BOLD_RED])
  })

  it('maps moving-dim to dim-red on both', () => {
    expect(lineColors('moving-dim')).toEqual([DIM_RED, DIM_RED])
  })
})
