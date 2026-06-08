// Locks the standing-column colour rule at its canonical home. The same
// `standingLineColor` is consumed by the transformation + hexagram serializers
// here and by @hexagram/playground-ui's line rows; pinning it once keeps the
// "moving line is red" decision honest for every consumer (seam B3).

import { BOLD_RED, BOLD_WHITE } from '@hexagram/viewer-core'
import { describe, expect, it } from 'vitest'

import { standingLineColor } from '../src/standing-line-color.js'

describe('standingLineColor', () => {
  it('paints a moving standing line BOLD_RED', () => {
    expect(standingLineColor(true)).toBe(BOLD_RED)
  })

  it('paints a static standing line BOLD_WHITE', () => {
    expect(standingLineColor(false)).toBe(BOLD_WHITE)
  })
})
