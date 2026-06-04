import stringWidth from 'string-width'
import { describe, expect, it } from 'vitest'

import {
  focusedInputBoxRows,
  questionPanelRows,
  stepDotsRow,
} from '../src/manual-diagram-right-pane'

describe('stepDotsRow', () => {
  it('renders cumulative fill dots up to the focused field', () => {
    expect(stepDotsRow('pilesL')).toBe('● ○ ○ ○')
    expect(stepDotsRow('remL')).toBe('● ● ○ ○')
    expect(stepDotsRow('pilesR')).toBe('● ● ● ○')
    expect(stepDotsRow('remR')).toBe('● ● ● ●')
  })
})

describe('questionPanelRows', () => {
  it('returns a single-line question + parens range hint for each piles field', () => {
    const rows = questionPanelRows({
      focusedField: 'pilesL',
      unpartedStalks: 49,
      state: 'editing',
    })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toBe('How many piles of 4 stalks in the LEFT heap?')
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/^\u001B\[2m\(valid 0 to 12\)\u001B\[22m$/)
  })

  it('returns single-line question for each remainder field', () => {
    const rows = questionPanelRows({
      focusedField: 'remL',
      unpartedStalks: 49,
      state: 'editing',
    })
    expect(rows[0]).toBe('How many leftover stalks in the LEFT heap?')
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/^\u001B\[2m\(valid 1 to 4\)\u001B\[22m$/)
  })

  it('returns RIGHT-heap variants', () => {
    expect(
      questionPanelRows({
        focusedField: 'pilesR',
        unpartedStalks: 49,
        state: 'editing',
      })[0],
    ).toBe('How many piles of 4 stalks in the RIGHT heap?')
    expect(
      questionPanelRows({
        focusedField: 'remR',
        unpartedStalks: 49,
        state: 'editing',
      })[0],
    ).toBe('How many leftover stalks in the RIGHT heap?')
  })

  it('computes piles range from unparted/4', () => {
    const rows = questionPanelRows({
      focusedField: 'pilesL',
      unpartedStalks: 40,
      state: 'editing',
    })
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/\(valid 0 to 10\)/)
  })

  it('returns the resolved 2-row panel after commit', () => {
    expect(
      questionPanelRows({
        focusedField: 'pilesL',
        unpartedStalks: 49,
        state: 'resolved',
      }),
    ).toEqual(['Resolved.', 'Enter to advance (or wait 2.5 s)'])
  })
})

describe('focusedInputBoxRows', () => {
  it('renders a 3-row drawn box with a 13-col interior', () => {
    const rows = focusedInputBoxRows({ value: '', focused: true })
    expect(rows).toHaveLength(3)
    expect(rows[0]).toBe('┌─────────────┐') // 13 dashes between corners
    expect(rows[2]).toBe('└─────────────┘')
    // Middle row is 15 cols including borders.
    expect(stringWidth(rows[1]!)).toBe(15)
  })

  it('inverse-video cursor follows the value when focused', () => {
    const rows = focusedInputBoxRows({ value: '42', focused: true })
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/42\u001B\[7m \u001B\[27m/)
  })

  it('renders no cursor (plain space) when not focused', () => {
    const rows = focusedInputBoxRows({ value: '42', focused: false })
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).not.toMatch(/\u001B\[7m/)
  })
})
