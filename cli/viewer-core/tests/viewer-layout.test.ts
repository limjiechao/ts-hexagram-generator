import { describe, expect, it } from 'vitest'

import { panToWindow, stripAnsi } from '../src/index.js'

// SGR red / default-foreground, spelled with an explicit ESC so the source is
// unambiguous about the escape byte.
const ESC = String.fromCodePoint(0x1b)
const RED = `${ESC}[31m`
const RESET_FG = `${ESC}[39m`

describe('panToWindow', () => {
  it('slices a plain row to the [offset, offset + width) window', () => {
    expect(panToWindow('abcdef', 2, 3)).toBe('cde')
  })

  it('pans by display column, not byte — ANSI/SGR codes are zero-width', () => {
    // A red-styled run: the SGR escapes add bytes but no display columns, so
    // a 3-column window still captures exactly three visible characters
    // (with their styling intact). This is the property that makes the four
    // pan call-sites correct on coloured rows.
    const styled = `${RED}abcdef${RESET_FG}`
    expect(stripAnsi(panToWindow(styled, 0, 3))).toBe('abc')
  })

  it('measures the offset in display columns through embedded ANSI', () => {
    const styled = `${RED}abcdef${RESET_FG}`
    expect(stripAnsi(panToWindow(styled, 3, 2))).toBe('de')
  })
})
