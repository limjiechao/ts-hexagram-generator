import { LINE_GLYPH } from '@hexagram/consultation-view/vocabulary'
import { describe, expect, it } from 'vitest'

import { deriveBannerLine } from '../src/banner-lines.js'

describe('banner glyphs are the single LINE_GLYPH vocabulary', () => {
  it('yang static/moving bars equal LINE_GLYPH[7]/[9]', () => {
    expect(deriveBannerLine('yang', false, false).bar).toBe(LINE_GLYPH[7])
    expect(deriveBannerLine('yang', true, false).bar).toBe(LINE_GLYPH[9])
  })
  it('yin static/moving bars equal LINE_GLYPH[8]/[6]', () => {
    expect(deriveBannerLine('yin', false, false).bar).toBe(LINE_GLYPH[8])
    expect(deriveBannerLine('yin', true, false).bar).toBe(LINE_GLYPH[6])
  })
})
