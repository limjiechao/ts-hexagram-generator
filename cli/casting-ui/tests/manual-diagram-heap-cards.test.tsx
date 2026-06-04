import { describe, expect, it } from 'vitest'

import { twoHeapDiagramRows } from '../src/manual-diagram-heap-cards'
import { stripAnsi } from './helpers/ansi'

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
