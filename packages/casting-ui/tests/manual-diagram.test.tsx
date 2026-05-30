import stringWidth from 'string-width'
import { describe, expect, it } from 'vitest'

import {
  bottomStripRow,
  flowFooterRows,
  flowHeaderRows,
  focusedInputBoxRows,
  manualTitleRow,
  questionPanelRows,
  stepDotsRow,
  twoHeapDiagramRows,
} from '../src/manual-diagram'
import { stripAnsi } from './helpers/ansi'

describe('manualTitleRow', () => {
  it('renders a slim line / cast / step title with no inline dots', () => {
    expect(manualTitleRow(3, 1, 'pilesL')).toBe(
      'Line 3/6 · Cast 2/3 · Step 1/4',
    )
    expect(manualTitleRow(3, 1, 'remL')).toBe('Line 3/6 · Cast 2/3 · Step 2/4')
    expect(manualTitleRow(3, 1, 'pilesR')).toBe(
      'Line 3/6 · Cast 2/3 · Step 3/4',
    )
    expect(manualTitleRow(3, 1, 'remR')).toBe('Line 3/6 · Cast 2/3 · Step 4/4')
  })
})

describe('stepDotsRow', () => {
  it('renders cumulative fill dots up to the focused field', () => {
    expect(stepDotsRow('pilesL')).toBe('● ○ ○ ○')
    expect(stepDotsRow('remL')).toBe('● ● ○ ○')
    expect(stepDotsRow('pilesR')).toBe('● ● ● ○')
    expect(stepDotsRow('remR')).toBe('● ● ● ●')
  })
})

describe('twoHeapDiagramRows', () => {
  // Row layout (10 rows): 0 header / 1 Piles / 2 Fours ×4 / 3 separator /
  // 4 Subtotal / 5 Remainder / 6 Suspended-or-blank / 7 separator / 8 Total /
  // 9 footer.
  it('builds 10 paired rows with the full arithmetic breakdown', () => {
    const rows = twoHeapDiagramRows({
      pilesL: 4,
      remL: 3,
      pilesR: 5,
      remR: 1,
      focusedField: 'pilesL',
      state: 'editing',
    })
    expect(rows).toHaveLength(10)
    expect(rows[0]).toContain('┌── LEFT HEAP ────┐')
    expect(rows[0]).toContain('┌── RIGHT HEAP ───┐')
    expect(rows[1]).toContain('Piles')
    // Fours: static `× 4` multiplier row.
    expect(rows[2]).toContain('Fours')
    expect(rows[2]).toContain('× 4')
    // Separator rows 3 and 7.
    expect(rows[3]).toContain('─────────────')
    expect(rows[7]).toContain('─────────────')
    // Subtotal = piles · 4: LEFT 16, RIGHT 20. (Scheme B weaves field colour
    // between label and value, so match against the ANSI-stripped skeleton.)
    expect(stripAnsi(rows[4]!)).toMatch(/Subtotal\s+16/)
    expect(stripAnsi(rows[4]!)).toMatch(/Subtotal\s+20/)
    // Remainder carries a `+` prefix.
    expect(stripAnsi(rows[5]!)).toMatch(/Remainder \+ 3/)
    expect(stripAnsi(rows[5]!)).toMatch(/Remainder \+ 1/)
    // Suspended: RIGHT shows `Suspended + 1`; LEFT interior is blank.
    expect(stripAnsi(rows[6]!)).toMatch(/Suspended \+ 1/)
    // Total: LEFT = 16 + 3 = 19; RIGHT = 20 + 1 + 1 (suspended) = 22.
    expect(stripAnsi(rows[8]!)).toMatch(/Total\s+19/)
    expect(stripAnsi(rows[8]!)).toMatch(/Total\s+22/)
    // Footer carries a `┬` tee for the convergence connector.
    expect(rows[9]).toContain('┬')
  })

  it('renders derived Subtotal/Total live with untyped fields as 0 (no `?`)', () => {
    const rows = twoHeapDiagramRows({
      pilesL: null,
      remL: 3,
      pilesR: 4,
      remR: null,
      focusedField: 'pilesL',
      state: 'editing',
    })
    // LEFT: pilesL untyped → Subtotal 0, Total = 0 + 3 = 3.
    expect(stripAnsi(rows[4]!)).toMatch(/Subtotal\s+0/)
    expect(stripAnsi(rows[8]!)).toMatch(/Total\s+3/)
    // RIGHT: pilesR 4 → Subtotal 16; remR untyped → Total = 16 + 0 + 1 = 17.
    expect(stripAnsi(rows[4]!)).toMatch(/Subtotal\s+16/)
    expect(stripAnsi(rows[8]!)).toMatch(/Total\s+17/)
    // Derived rows never show `?`.
    expect(rows[4]).not.toContain('?')
    expect(rows[8]).not.toContain('?')
  })

  it('wraps every row in BOLD_GREEN ... NORMAL when state === resolved', () => {
    const rows = twoHeapDiagramRows({
      pilesL: 5,
      remL: 4,
      pilesR: 5,
      remR: 4,
      focusedField: 'remR',
      state: 'resolved',
    })
    for (const row of rows) {
      expect(row).toContain('\u001B[1;92m')
      expect(row).toContain('\u001B[0m')
    }
    // No inverse video in resolved state.
    for (const row of rows) {
      // oxlint-disable-next-line no-control-regex
      expect(row).not.toMatch(/\u001B\[7m/)
    }
    // Scheme B field colours are suppressed under the all-green wrap — an
    // interior cyan/dim reset would terminate the BOLD_GREEN run early.
    for (const row of rows) {
      expect(row).not.toContain('\u001B[36m')
      expect(row).not.toContain('\u001B[2m')
    }
  })

  it('renders an inverse-space cursor when the active cell is empty', () => {
    const rows = twoHeapDiagramRows({
      pilesL: null,
      remL: null,
      pilesR: null,
      remR: null,
      focusedField: 'pilesL',
      state: 'editing',
    })
    // The focused empty Piles cell renders an inverse-space cursor.
    // (Scheme B dims the label, so a `Piles\s+` prefix would straddle the
    // dim-off code; assert the inverse-space cell directly.)
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/\u001B\[7m \u001B\[27m/)
  })

  it('shows inverse styling on focused cell when state === error', () => {
    const rows = twoHeapDiagramRows({
      pilesL: 5,
      remL: 2,
      pilesR: 4,
      remR: 3,
      focusedField: 'remR',
      state: 'error',
    })
    // The focused cell (remR = 3) must show inverse-video even in error state.
    // oxlint-disable-next-line no-control-regex
    expect(rows[5]).toMatch(/\u001B\[7m3\u001B\[27m/)
    // Non-focused cells must NOT show inverse-video.
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).not.toMatch(/\u001B\[7m/)
  })

  it('shows the focus indicator on the focused cell when state is error (Shift+Tab back into a conservation-failing form)', () => {
    // All 4 fields filled with conservation-failing values; user has
    // Shift+Tabbed back to pilesL. The focus indicator must remain visible
    // on the LEFT-piles cell even though the diagram state is 'error'.
    const rows = twoHeapDiagramRows({
      pilesL: 4,
      remL: 3,
      pilesR: 4,
      remR: 3,
      focusedField: 'pilesL',
      state: 'error',
    })
    // Inverse-video ANSI: ESC[7m...ESC[27m — the focused cell wraps its value.
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/\u001B\[7m4\u001B\[27m/)
  })

  it('applies Scheme B field colours: dim labels/inert, cyan computed, bold-white input', () => {
    const rows = twoHeapDiagramRows({
      pilesL: 4,
      remL: 3,
      pilesR: 5,
      remR: 1,
      focusedField: 'pilesR',
      state: 'editing',
    })
    // Labels are dimmed (SGR 2): Piles (row 1), Subtotal (row 4).
    expect(rows[1]).toContain('\u001B[2m')
    expect(rows[4]).toContain('\u001B[2m')
    // Inert values are dimmed: `Fours × 4` (row 2), `Suspended + 1` (row 6).
    expect(rows[2]).toContain('\u001B[2m')
    expect(rows[6]).toContain('\u001B[2m')
    // Computed values are cyan (SGR 36): Subtotal (row 4), Total (row 8).
    expect(rows[4]).toContain('\u001B[36m')
    expect(rows[8]).toContain('\u001B[36m')
    // Unfocused input values are bold white (SGR 1;97): pilesL on row 1,
    // remL/remR on row 5.
    expect(rows[1]).toContain('\u001B[1;97m')
    expect(rows[5]).toContain('\u001B[1;97m')
    // The focused input cell (pilesR = 5) keeps inverse-video, not bold-white.
    // oxlint-disable-next-line no-control-regex
    expect(rows[1]).toMatch(/\u001B\[7m5\u001B\[27m/)
  })

  it('renders the suspended row as static `1` (never inverse-video, no field maps to it)', () => {
    const rows = twoHeapDiagramRows({
      pilesL: 4,
      remL: 3,
      pilesR: 4,
      remR: 3,
      focusedField: 'pilesL',
      state: 'editing',
    })
    // Suspended row's `1` is plain text — no field corresponds to it.
    // oxlint-disable-next-line no-control-regex
    expect(rows[6]).not.toMatch(/\u001B\[7m1\u001B\[27m/)
  })
})

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

describe('bottomStripRow', () => {
  const ESC = String.fromCodePoint(27)

  it('editing + not commit-ready — blank left, back hint right', () => {
    const row = bottomStripRow({
      branch: 'editing',
      commitReady: false,
      renderWidth: 78,
    })
    expect(row.startsWith(' ')).toBe(true)
    // MISSING owns the count now — the strip carries no "accounted" total.
    expect(row).not.toContain('accounted')
    expect(row).not.toContain('Press Enter')
    expect(row.endsWith('Shift+Tab: go back')).toBe(true)
    expect(stringWidth(row)).toBe(78)
  })

  it('editing + commit-ready — "Press Enter to commit" left, back hint right', () => {
    const row = bottomStripRow({
      branch: 'editing',
      commitReady: true,
      renderWidth: 78,
    })
    expect(row.startsWith('Press Enter to commit')).toBe(true)
    expect(row.endsWith('Shift+Tab: go back')).toBe(true)
    expect(stringWidth(row)).toBe(78)
  })

  it('error branch — suspended-sum message + back hint (BOLD_RED)', () => {
    const row = bottomStripRow({
      branch: 'error',
      errorKind: 'suspended-sum',
      remL: 1,
      remR: 4,
      sum: 6,
      expectedLabel: '4 or 8',
      renderWidth: 78,
    })
    expect(row).toContain('Suspended sum (1 + 1 + 4) = 6, expected 4 or 8')
    expect(row).toContain('Shift+Tab: go back')
    expect(row).toContain(`${ESC}[1;91m`)
  })

  it('error branch — zero-remainder identifies the side', () => {
    const rightOnly = bottomStripRow({
      branch: 'error',
      errorKind: 'zero-remainder',
      remL: 2,
      remR: 0,
      renderWidth: 78,
    })
    expect(rightOnly).toContain('Right heap has no remainder')
    expect(rightOnly).toContain(
      'fully divisible heaps yield remainder 4, not 0',
    )
    const leftOnly = bottomStripRow({
      branch: 'error',
      errorKind: 'zero-remainder',
      remL: 0,
      remR: 3,
      renderWidth: 78,
    })
    expect(leftOnly).toContain('Left heap has no remainder')
    const both = bottomStripRow({
      branch: 'error',
      errorKind: 'zero-remainder',
      remL: 0,
      remR: 0,
      renderWidth: 78,
    })
    expect(both).toContain('Left and right heaps have no remainder')
  })

  it('resolved branch — BOLD_GREEN "→ next cast: N unparted"', () => {
    const row = bottomStripRow({
      branch: 'resolved',
      next: 40,
      renderWidth: 78,
    })
    expect(row).toContain('→ next cast: 40 unparted')
    expect(row).not.toContain('accounted')
    expect(row).toContain(`${ESC}[1;92m`)
    expect(stringWidth(row)).toBe(78)
  })
})
