import { describe, expect, it } from 'vitest'

import { flowFooterRows, flowHeaderRows } from '../src/manual-diagram-flow'

describe('flowHeaderRows', () => {
  it('renders the UNPARTED readout directly above the branch (no drop row)', () => {
    const rows = flowHeaderRows(49)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatch(/UNPARTED STALKS:\s+49/)
    // Branch: down-facing corners with an upward `┴` stub.
    expect(rows[1]).toContain('┌')
    expect(rows[1]).toContain('┴')
    expect(rows[1]).toContain('┐')
  })

  it('aligns the `┴` stub under the last digit of the UNPARTED value', () => {
    // The value is right-aligned within the 22-col ledger, so its last digit
    // sits at column 21; the upward stub points exactly there.
    const rows = flowHeaderRows(49)
    expect([...rows[0]!].indexOf('9')).toBe(21)
    expect([...rows[1]!].indexOf('┴')).toBe(21)
  })
})

describe('flowFooterRows', () => {
  const ESC = String.fromCodePoint(27)
  it('renders the join directly above COUNTED (no drop row), then rule and MISSING', () => {
    const rows = flowFooterRows({
      counted: 36,
      missing: 13,
      missingColor: 'neutral',
    })
    expect(rows).toHaveLength(4)
    // Join: up-facing corners with a downward `┬` stub.
    expect(rows[0]).toContain('└')
    expect(rows[0]).toContain('┬')
    expect(rows[0]).toContain('┘')
    // COUNTED carries a `- ` subtraction prefix.
    expect(rows[1]).toMatch(/COUNTED STALKS:\s+- 36/)
    // Ledger rule.
    expect(rows[2]).toMatch(/─{4,}/)
    // MISSING result.
    expect(rows[3]).toMatch(/MISSING STALKS\s+13/)
    // Neutral colour: no ANSI wrap on the value.
    expect(rows[3]).not.toContain(`${ESC}[1;92m`)
    expect(rows[3]).not.toContain(`${ESC}[1;91m`)
  })

  it('aligns the `┬` stub under the last digit of the COUNTED value', () => {
    // COUNTED (`- 36`) is right-aligned within the 22-col ledger, so its last
    // digit sits at column 21; the downward stub points exactly there.
    const rows = flowFooterRows({
      counted: 36,
      missing: 13,
      missingColor: 'neutral',
    })
    expect([...rows[1]!].indexOf('6')).toBe(21)
    expect([...rows[0]!].indexOf('┬')).toBe(21)
  })

  it('wraps the MISSING value in BOLD_GREEN when commit-ready (missing 0)', () => {
    const rows = flowFooterRows({
      counted: 49,
      missing: 0,
      missingColor: 'green',
    })
    expect(rows[3]).toContain(`${ESC}[1;92m`)
  })

  it('wraps the MISSING value in BOLD_RED on a conservation violation', () => {
    const rows = flowFooterRows({
      counted: 36,
      missing: 13,
      missingColor: 'red',
    })
    expect(rows[3]).toContain(`${ESC}[1;91m`)
  })
})
