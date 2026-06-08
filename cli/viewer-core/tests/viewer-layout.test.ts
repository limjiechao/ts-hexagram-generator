import { visualWidth } from '@hexagram/text-layout'
import { describe, expect, it } from 'vitest'

import { panToWindow, stripAnsi, terminalWidth } from '../src/index.js'

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

describe('terminalWidth', () => {
  it('is the domain visualWidth — one width table, two names (ADR-0021)', () => {
    // The collapse: terminalWidth re-exports @hexagram/text-layout's
    // visualWidth, so saved .md diagrams and the live viewer measure with the
    // identical table and can never disagree on a glyph's width.
    for (const input of ['abc', '巽', '上6', '乾坤', '（一）', '가', '']) {
      expect(terminalWidth(input)).toBe(visualWidth(input))
    }
  })

  it('counts embedded SGR/ANSI as zero-width (the property that must survive)', () => {
    // string-width strips ANSI internally, so a styled run measures the same
    // as its plain text — the live viewer's whole reason for an ANSI-aware
    // width measure.
    const styled = `${RED}abc${RESET_FG}`
    expect(terminalWidth(styled)).toBe(3)
    expect(terminalWidth(`${RED}巽${RESET_FG}`)).toBe(2)
  })
})
