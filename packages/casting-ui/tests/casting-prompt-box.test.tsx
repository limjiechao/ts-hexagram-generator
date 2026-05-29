import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import stringWidth from 'string-width'
import { describe, expect, it, vi } from 'vitest'

import {
  bottomStripRow,
  CastingPromptBox,
  flowFooterRows,
  flowHeaderRows,
  focusedInputBoxRows,
  getCastingPromptHeight,
  manualTitleRow,
  questionPanelRows,
  SliderInput,
  stepDotsRow,
  twoHeapDiagramRows,
  validateManualInput,
} from '../src/casting-prompt-box'
import {
  BACKSPACE,
  CTRL_C,
  CTRL_R,
  ENTER,
  ESCAPE,
  SPACE,
  TAB,
} from './helpers/keystrokes'
import { pickFromFrame } from './helpers/slider'

// Strip SGR ANSI so layout assertions can match the textual skeleton
// independent of the Scheme B field colouring (dim labels / cyan computed /
// bold-white input) woven into the heap-card rows.
// oxlint-disable-next-line no-control-regex
const stripAnsi = (s: string): string => s.replaceAll(/\[[0-9;]*m/g, '')

function CastingPromptBoxHost({
  onSubmit,
  onError,
  initialError = null,
}: {
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
  initialError?: string | null
}): ReactElement {
  const [buffer, setBuffer] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  return (
    <CastingPromptBox
      lineNumber={1}
      castIndex={0}
      min={1}
      max={48}
      buffer={buffer}
      error={error}
      width={60}
      inputMode="number"
      onChange={setBuffer}
      onSubmit={onSubmit}
      onError={(message) => {
        setError(message)
        onError(message)
      }}
    />
  )
}

describe('CastingPromptBox', () => {
  it('renders the line/cast title and the prompt', () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBoxHost onSubmit={onSubmit} onError={onError} />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    expect(frame).toContain('Divide the stalks. Pick a number from 1 to 48:')
    unmount()
  })

  it('shows the error line when one is supplied', () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBoxHost
        onSubmit={onSubmit}
        onError={onError}
        initialError="Pick a number from 1 to 48."
      />,
    )
    expect(lastFrame() ?? '').toContain('Pick a number from 1 to 48.')
    unmount()
  })

  it('hides the error line when error is null', () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBoxHost onSubmit={onSubmit} onError={onError} />,
    )
    // No error string present in the rendered frame.
    expect(lastFrame() ?? '').not.toContain('Pick a number from 1 to 48.\n')
    unmount()
  })

  it('submits a typed in-range value via Enter', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBoxHost onSubmit={onSubmit} onError={onError} />,
    )
    stdin.write('25')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(25)
    })
    unmount()
  })

  it('fires onReady once after the slider-mode mount binds useInput', async () => {
    // Witness contract — see SliderInputProps.onReady. Tests gate cross-cast
    // SPACE on this signal instead of the spinner-glyph exploit.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const { unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={60}
        inputMode="slider"
        tickMs={50}
        onSubmit={onSubmit}
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    unmount()
  })
})

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

// ── SliderInput ──────────────────────────────────────────────────────────────

describe('SliderInput', () => {
  it('renders the initial position at min with the initial spinner glyph', () => {
    const { lastFrame, unmount } = render(
      <SliderInput min={1} max={10} focused onSubmit={() => {}} tickMs={50} />,
    )
    const frame = lastFrame() ?? ''
    // Position is read from the bar (cursor cell location), not the readout.
    expect(pickFromFrame(frame)).toBe(1)
    // Readout no longer leaks the numeric position — both Braille spinners
    // (left clockwise, right anticlockwise) stand in for it, and both restart
    // at `⠋` on mount. Each heap cell is padded to 2 cols (leading space
    // before the 1-col glyph) so the row width matches the post-commit
    // numeric form in `<SliderCastingPrompt>`.
    // `Stalks` is `max + 1` (= 11), the true stalk count: `max` is held one
    // short of it so the right heap keeps a stalk to suspend, shown as the
    // trailing `+ 1 suspended`.
    expect(frame).toContain(
      'Stalks: 11 | Left Heap:  ⠋ | Right Heap:  ⠋ + 1 suspended',
    )
    // Bar should be present: 1 cursor cell (█) + 9 empty cells (░), bordered.
    expect(frame).toContain('█')
    expect(frame).toContain('░')
    unmount()
  })

  it('advances one cell per tick (bouncing rightward)', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(1)
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cycles the left-heap glyph clockwise one frame per tick', () => {
    // Verifies that the readout's left-heap Braille glyph advances in lockstep
    // with the cursor, so the user sees motion in the row below the bar
    // without the numeric position being revealed. The 10-glyph clockwise
    // cycle is `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={20}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(lastFrame() ?? '').toContain('Left Heap:  ⠋ ')
      const expected = ['⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏', '⠋']
      for (const glyph of expected) {
        vi.advanceTimersByTime(50)
        rerender(
          <SliderInput
            min={1}
            max={20}
            focused
            onSubmit={onSubmit}
            tickMs={50}
          />,
        )
        expect(lastFrame() ?? '').toContain(`Left Heap:  ${glyph} `)
      }
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cycles the right-heap glyph anticlockwise one frame per tick', () => {
    // Mirror of the left-heap test: the right-heap glyph walks the same
    // 10-glyph cycle in reverse so the two spinners visibly counter-rotate.
    // At tickCount=0 both show `⠋`; from tickCount=1 the right glyph runs
    // `⠏⠇⠧⠦⠴⠼⠸⠹⠙⠋`.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={20}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(lastFrame() ?? '').toContain('Right Heap:  ⠋')
      const expected = ['⠏', '⠇', '⠧', '⠦', '⠴', '⠼', '⠸', '⠹', '⠙', '⠋']
      for (const glyph of expected) {
        vi.advanceTimersByTime(50)
        rerender(
          <SliderInput
            min={1}
            max={20}
            focused
            onSubmit={onSubmit}
            tickMs={50}
          />,
        )
        expect(lastFrame() ?? '').toContain(`Right Heap:  ${glyph}`)
      }
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('bounces off the max edge', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      // start at 1
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Next tick should bounce back to 2 (max-1), not overflow.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('commits the current position when SPACE is pressed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { stdin, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // Advance two ticks: 1 → 2 → 3
      vi.advanceTimersByTime(100)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      stdin.write(SPACE)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith(3)
      })
      // Further ticks must not produce additional submits (timer stopped).
      vi.advanceTimersByTime(200)
      expect(onSubmit).toHaveBeenCalledTimes(1)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('resets to min and direction +1 when the range changes', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(200)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(5)
      // New cast — narrower range. Position should rewind to 1, and both
      // spinners should restart at `⠋` for the new cast.
      rerender(
        <SliderInput min={1} max={5} focused onSubmit={onSubmit} tickMs={50} />,
      )
      const reset = lastFrame() ?? ''
      expect(pickFromFrame(reset)).toBe(1)
      expect(reset).toContain(
        'Stalks: 6 | Left Heap:  ⠋ | Right Heap:  ⠋ + 1 suspended',
      )
      // And direction should be +1: next tick goes to 2.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={5} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not tick when focused is false', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(500)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // Should still show the initial position.
      expect(pickFromFrame(lastFrame() ?? '')).toBe(1)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not consume Escape or Ctrl+C', async () => {
    const onSubmit = vi.fn()
    const { stdin, unmount } = render(
      <SliderInput min={1} max={10} focused onSubmit={onSubmit} tickMs={50} />,
    )
    stdin.write(ESCAPE)
    stdin.write(CTRL_C)
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('stops and resumes ticking when focused toggles off and on', () => {
    // Exercises the subscribe/unsubscribe contract on the store: when
    // `focused` flips false the noop subscriber takes over and the store's
    // last listener detaches, stopping the interval. Re-focusing re-attaches
    // and ticking resumes — no leaked timer, no crash on rerender. The
    // position is preserved across the toggle because the same store
    // instance stays in the ref (only the range reset clears it).
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // Two ticks while focused: 1 → 2 → 3.
      vi.advanceTimersByTime(100)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Lose focus: interval should stop, position should hold.
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(500)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Regain focus: ticking resumes from where it left off.
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(4)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('re-arms the interval at the new rate when tickMs changes mid-prompt', () => {
    // The store captures `tickMs` and must restart its interval whenever the
    // prop changes — otherwise per-cast tick rates would only take effect at
    // store construction. Verifies the setRange(min, max, tickMs) flow.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // One 50ms tick → position 2.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)

      // Drop tickMs to 20 — the store should re-arm the interval at the new
      // rate, so one 20ms tick advances by one cell.
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={20}
        />,
      )
      vi.advanceTimersByTime(20)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={20}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)

      // A second 20ms tick confirms the new cadence is steady-state, not a
      // one-off restart artefact.
      vi.advanceTimersByTime(20)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={20}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(4)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})

// ── CastingPromptBox in slider mode ──────────────────────────────────────────

describe('CastingPromptBox (slider mode)', () => {
  it('renders the verbatim title above the bouncing bar', () => {
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        onSubmit={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain(
      'Line 1/6 · Cast 1/3: — Press SPACE to part the stalks',
    )
    expect(pickFromFrame(frame)).toBe(1)
    // First cast: max 48 → 49 stalks in use (其用四十有九), one held back to
    // suspend from the right heap (the trailing `+ 1 suspended`).
    expect(frame).toContain(
      'Stalks: 49 | Left Heap:  ⠋ | Right Heap:  ⠋ + 1 suspended',
    )
    // Bar should be rendered as well.
    expect(frame).toContain('█')
    unmount()
  })

  it('reveals the numeric Left/Right Heap on SPACE, then defers onSubmit by commitRevealMs', async () => {
    // SPACE freezes the cursor and swaps the rotating Braille glyphs for the
    // concrete `Left Heap: <pick> | Right Heap: <max − pick> + 1 suspended`
    // numbers (left 5, right 35, suspended 1 → 41 = max + 1 conserved). The
    // parent's `onSubmit` only fires after the reveal window so the user has
    // time to see the cast they just made. Use a custom `commitRevealMs` so
    // the test's fake-time math is decoupled from the prod constant.
    const REVEAL_MS = 600
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, stdin, rerender, unmount } = render(
        <CastingPromptBox
          lineNumber={2}
          castIndex={1}
          min={1}
          max={40}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={REVEAL_MS}
          onSubmit={onSubmit}
        />,
      )
      // Four ticks: 1 → 2 → 3 → 4 → 5.
      vi.advanceTimersByTime(200)
      rerender(
        <CastingPromptBox
          lineNumber={2}
          castIndex={1}
          min={1}
          max={40}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={REVEAL_MS}
          onSubmit={onSubmit}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(5)
      stdin.write(SPACE)
      // Reveal in progress: numeric heaps shown, cursor parked, parent not
      // yet notified.
      await waitFor(() => {
        expect(lastFrame() ?? '').toContain(
          'Stalks: 41 | Left Heap:  5 | Right Heap: 35 + 1 suspended',
        )
      })
      const revealFrame = lastFrame() ?? ''
      expect(pickFromFrame(revealFrame)).toBe(5)
      expect(onSubmit).not.toHaveBeenCalled()
      // Cross the reveal boundary — onSubmit fires exactly once with the pick.
      // shouldAdvanceTime drift during waitFor's poll is bounded by REVEAL_MS,
      // which is ample headroom for one advance call to span the timer.
      vi.advanceTimersByTime(REVEAL_MS)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith(5)
      })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('clips overflow on narrow terminals without reflowing', () => {
    // Box width 40 → inner content width 38, but title is 53 cols.
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={40}
        inputMode="slider"
        tickMs={50}
        onSubmit={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    // Title is clipped (no full sentence present).
    expect(frame).not.toContain('part the stalks')
    // But the prefix should appear (i.e. the box rendered without reflowing
    // the title onto another line).
    expect(frame).toContain('Line 1/6')
    unmount()
  })

  it('describes the stalks being parted (not a SPACE instruction) during random playback', () => {
    // During random-casting playback the slider is auto-driven — the user
    // does not press SPACE — so the title describes the stalks being parted.
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        lineNumber={3}
        castIndex={1}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        autoLand={{ target: 24, armDelayMs: 0 }}
        onSubmit={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 3/6 · Cast 2/3')
    expect(frame).not.toContain('Press SPACE')
    expect(frame).toContain('parting the stalks')
    unmount()
  })

  it('routes SPACE to onSkip during random playback while the slider is still ticking', async () => {
    // During random playback (auto-land active) SPACE abandons the rest of
    // the animation — it routes to `onSkip`, not the per-cast `onSubmit`.
    const onSubmit = vi.fn()
    const onSkip = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        // Arm delay 1000 ms keeps the slider ticking — it has not landed yet.
        autoLand={{ target: 24, armDelayMs: 1000 }}
        commitRevealMs={0}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(SPACE)
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('routes SPACE to onSkip during the post-land reveal dwell', async () => {
    // SPACE skips even after the cursor has auto-landed and the cast is in
    // its reveal dwell — the user can cut the rest of the animation short.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const onSkip = vi.fn()
      const onReady = vi.fn()
      const { rerender, stdin, unmount } = render(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          // Long reveal so the cast sits in the dwell when SPACE arrives.
          commitRevealMs={5000}
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
          onSkip={onSkip}
          onReady={onReady}
        />,
      )
      await waitForReady(onReady)
      // Cross the landing tick (tick 2 = 100 ms) so the slider auto-lands.
      vi.advanceTimersByTime(400)
      rerender(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={5000}
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
          onSkip={onSkip}
          onReady={onReady}
        />,
      )
      stdin.write(SPACE)
      await waitFor(() => {
        expect(onSkip).toHaveBeenCalledTimes(1)
      })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not invoke onSkip for Ctrl+C / Escape during random playback', async () => {
    // Global exit keys keep their existing behaviour — they are NOT skip.
    const onSkip = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        autoLand={{ target: 24, armDelayMs: 1000 }}
        commitRevealMs={0}
        onSubmit={() => {}}
        onSkip={onSkip}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(CTRL_C)
    stdin.write(ESCAPE)
    await yieldMacrotask()
    expect(onSkip).not.toHaveBeenCalled()
    unmount()
  })

  it('keeps SPACE committing the pick for the interactive flow (no auto-land, no onSkip)', async () => {
    // Interactive callers pass no auto-land — SPACE commits the cast exactly
    // as before; the skip routing must not leak into that path.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={10}
        width={80}
        inputMode="slider"
        tickMs={50}
        commitRevealMs={0}
        onSubmit={onSubmit}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(SPACE)
    // Windows GHA's slider commit + onSubmit microtask outruns a single 50 ms
    // tick — poll the assertion instead of racing it.
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    unmount()
  })

  it('auto-lands on the target pick after the arm delay, then submits', async () => {
    // With auto-land the cursor bounces freely and commits the instant it
    // naturally passes through the RNG-chosen target — no SPACE, no teleport.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={0}
          // Target 3 in 1..10: cursor sits on 3 at tick 2. Arm delay 0 → the
          // first landing is tick 2.
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
        />,
      )
      // Advance past the landing tick (tick 2 = 100 ms) plus a margin.
      vi.advanceTimersByTime(400)
      rerender(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={0}
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
        />,
      )
      // The slider froze on the target.
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Cross the (zero-length) reveal window so the deferred onSubmit fires.
      vi.advanceTimersByTime(50)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith(3)
      })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not auto-land before the arm delay elapses', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { unmount } = render(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={0}
          // Cursor passes 3 at tick 2, but the arm delay (1000 ms = 20 ticks)
          // forbids landing until the next pass.
          autoLand={{ target: 3, armDelayMs: 1000 }}
          onSubmit={onSubmit}
        />,
      )
      // 10 ticks elapsed (500 ms) — well past tick 2 but before the arm delay.
      vi.advanceTimersByTime(500)
      expect(onSubmit).not.toHaveBeenCalled()
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shifts the visible window when horizontalOffset is non-zero', () => {
    const titleStart = 'Line 1/6 · Cast 1/3'
    const { lastFrame, rerender, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={40}
        inputMode="slider"
        tickMs={50}
        horizontalOffset={0}
        onSubmit={() => {}}
      />,
    )
    // Title is centred-padded then sliced. With centering of a 53-char string
    // inside a 53-wide buffer that becomes 38 visible cols, the start of the
    // sliced row is "Line 1/6 · Cast 1/3: — Press SPACE to". Don't lock in
    // a specific column — just verify the title prefix is in view at offset 0.
    expect(lastFrame() ?? '').toContain(titleStart)
    rerender(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={40}
        inputMode="slider"
        tickMs={50}
        horizontalOffset={15}
        onSubmit={() => {}}
      />,
    )
    // After panning 15 cols right, the title prefix should be off-screen.
    expect(lastFrame() ?? '').not.toContain(titleStart)
    unmount()
  })
})

// ── getCastingPromptHeight (manual arm) ─────────────────────────────────────

describe('getCastingPromptHeight', () => {
  it('returns 22 for manual flow regardless of inputMode/error', () => {
    // 2 border + 20 content (title / blank / 2 flow-header / 10 card-band /
    // 4 flow-footer / blank / feedback strip). The two connector drop rows
    // were removed to tighten the diagram by 2 lines.
    expect(getCastingPromptHeight('number', false, 'manual')).toBe(22)
    expect(getCastingPromptHeight('slider', false, 'manual')).toBe(22)
    expect(getCastingPromptHeight('number', true, 'manual')).toBe(22)
  })

  it('preserves the existing slider/number heights for interactive', () => {
    expect(getCastingPromptHeight('number', false, 'interactive')).toBe(5)
    expect(getCastingPromptHeight('number', true, 'interactive')).toBe(6)
    expect(getCastingPromptHeight('slider', false, 'interactive')).toBe(7)
  })

  it("defaults flowKind to 'interactive' so existing callers stay source-compatible", () => {
    expect(getCastingPromptHeight('number', false)).toBe(5)
    expect(getCastingPromptHeight('slider', false)).toBe(7)
  })
})

// ── validateManualInput (pure) ───────────────────────────────────────────────

describe('validateManualInput', () => {
  // The validator is the source of truth for the manual prompt's SPLIT row.
  // It runs incomplete → conservation → suspended-sum → ok in strict priority
  // order. We unit-test the failure-mode branches here because two of them
  // (suspended-sum, conservation+suspended both failing) require non-canonical
  // M values to be reachable — the canonical M = 49/40/32 sequence
  // mathematically rules out a suspended-sum failure when conservation passes.

  it('returns incomplete when any field is null', () => {
    expect(
      validateManualInput({
        pilesL: 5,
        remL: null,
        pilesR: 5,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({ kind: 'incomplete' })
  })

  it('reports conservation failure with the actual total vs unparted', () => {
    // 4·5 + 4 + 4·4 + 4 + 1 = 45, but unparted = 49.
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 4,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({
      kind: 'conservation',
      total: 45,
      unparted: 49,
      leftHeapTotal: 24,
      rightHeapTotal: 20,
    })
  })

  it('reports suspended-sum failure when conservation passes but the suspended sum is off', () => {
    // Non-canonical M to force a reachable suspended-sum failure:
    // M=10, castIndex=1 (cast 2, expected sums {4, 8}).
    //   4·1 + 1 + 4·0 + 4 + 1 = 10 ✓ conservation
    //   suspended sum = 1 + 1 + 4 = 6 (not in {4, 8}).
    const result = validateManualInput({
      pilesL: 1,
      remL: 1,
      pilesR: 0,
      remR: 4,
      unparted: 10,
      castIndex: 1,
    })
    expect(result).toEqual({
      kind: 'suspended-sum',
      sum: 6,
      remL: 1,
      remR: 4,
      expectedLabel: '4 or 8',
    })
  })

  it('rejects rR=0 even when conservation and suspended-sum would otherwise pass', () => {
    // Screenshot scenario: cast 1, M=49, pL=6, rL=4, pR=5, rR=0.
    // Conservation: 4·6+4+4·5+0+1 = 49 ✓ (the +0 sneaks past because the
    // missing 4 was shifted into pR=5). Suspended sum: 1+4+0 = 5 ∈ {5, 9} ✓.
    // Without the zero-remainder guard, the validator returned `ok` with
    // pick=28 — but rR=0 violates the I-Ching never-zero rule.
    const result = validateManualInput({
      pilesL: 6,
      remL: 4,
      pilesR: 5,
      remR: 0,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({ kind: 'zero-remainder', remL: 4, remR: 0 })
  })

  it('rejects rL=0 with the same priority as rR=0', () => {
    const result = validateManualInput({
      pilesL: 5,
      remL: 0,
      pilesR: 6,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({ kind: 'zero-remainder', remL: 0, remR: 4 })
  })

  it('zero-remainder fires before conservation when both fail', () => {
    // pL=0, rL=0, pR=0, rR=0 → total 1 (≠ 49). Zero-remainder must win.
    const result = validateManualInput({
      pilesL: 0,
      remL: 0,
      pilesR: 0,
      remR: 0,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).toBe('zero-remainder')
  })

  it('conservation fires before suspended-sum when both fail', () => {
    // Cast 1, M=49: pL=5, rL=4, pR=4, rR=2 → total 43 (not 49), suspended 7
    // (not in {5, 9}). Conservation must win the priority race.
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 4,
      remR: 2,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).toBe('conservation')
  })

  it('returns ok with leftHeapTotal and rightHeapTotal for a valid commit', () => {
    // Cast 2 of an M=40 round: pL=4, rL=3, pR=4, rR=4 → total 40 ✓,
    // suspended 1+3+4 = 8 ✓. Derived pick = leftHeapTotal = 19.
    const result = validateManualInput({
      pilesL: 4,
      remL: 3,
      pilesR: 4,
      remR: 4,
      unparted: 40,
      castIndex: 1,
    })
    expect(result).toEqual({
      kind: 'ok',
      pick: 19,
      leftHeapTotal: 19,
      rightHeapTotal: 20,
    })
  })

  it('round-1 ok validates a canonical 24/49 split', () => {
    // Cast 1 of M=49: pL=5, rL=4, pR=5, rR=4 → total 49 ✓, suspended 1+4+4 = 9 ✓.
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 5,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({
      kind: 'ok',
      pick: 24,
      leftHeapTotal: 24,
      rightHeapTotal: 24,
    })
  })

  it('conservation result carries heap totals for downstream rendering', () => {
    // pL=5, rL=2 → left = 22; pR=4, rR=3 → right = 19;
    // total = 22 + 19 + 1 = 42 ≠ 40 → conservation fires.
    const result = validateManualInput({
      pilesL: 5,
      remL: 2,
      pilesR: 4,
      remR: 3,
      unparted: 40,
      castIndex: 1,
    })
    expect(result.kind).toBe('conservation')
    if (result.kind !== 'conservation') return
    expect(result.total).toBe(42)
    expect(result.unparted).toBe(40)
    expect(result.leftHeapTotal).toBe(22)
    expect(result.rightHeapTotal).toBe(19)
  })
})

// ── CastingPromptBox — manual branch ────────────────────────────────────────

describe('CastingPromptBox (manual flow)', () => {
  // Baseline: cast 2/3 of line 3, current round has 40 unparted stalks
  // (max = 39, the maximum legal pick is max). Tests opt out of the post-
  // commit reveal dwell with `manualRevealMs={0}` unless they specifically
  // want to observe the reveal text.
  const baseProps = {
    lineNumber: 3 as const,
    castIndex: 1 as const,
    min: 1,
    max: 39,
    unpartedStalks: 40,
    // 100 cols: natural body width 95 + 2 borders = 97; 100 gives the
    // bottom strip room to land both `… 40 stalks accounted` and the
    // `Shift+Tab: back to fix` hint without horizontal pan.
    width: 100,
    inputMode: 'number' as const,
    flowKind: 'manual' as const,
    manualRevealMs: 0,
  }

  // Conservation-passing, suspended-sum-passing 4-field commit for baseProps
  // (cast 2, M=40): pL=4, rL=3, pR=4, rR=4 → split = 19, suspended = 8,
  // next = 32. Used by several tests as a stable valid commit.
  const validBasePropsInput = {
    pilesL: '4',
    remL: '3',
    pilesR: '4',
    remR: '4',
    expectedPick: 19,
    expectedLeftHeapTotal: 19,
    expectedRightHeapTotal: 20,
    expectedSuspended: 8,
    expectedNext: 32,
  }

  // Drive the four fields in sequence, gating Tab→digit transitions on the
  // focus witness so we never write a digit before the next field's
  // `useInput` has registered with Ink's stdin dispatcher.
  async function typeFourFields(
    stdin: { write: (data: string) => unknown },
    onFocusedFieldChange: ReturnType<typeof vi.fn>,
    {
      pilesL,
      remL,
      pilesR,
      remR,
    }: { pilesL: string; remL: string; pilesR: string; remR: string },
  ): Promise<void> {
    stdin.write(pilesL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remL'),
    )
    stdin.write(remL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesR'),
    )
    stdin.write(pilesR)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remR'),
    )
    stdin.write(remR)
    await yieldMacrotask()
  }

  it('renders the title, flow diagram (UNPARTED → heaps → COUNTED/MISSING), question panel, and feedback strip', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={() => {}} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 3/6 · Cast 2/3 · Step 1/4')
    // Flow diagram: UNPARTED source at top, the two heap cards, and the
    // COUNTED/MISSING ledger at the bottom. Nothing typed → COUNTED 1 (just
    // the suspended stalk), MISSING 39 (40 − 1).
    expect(frame).toContain('UNPARTED STALKS:')
    expect(frame).toContain('LEFT HEAP')
    expect(frame).toContain('RIGHT HEAP')
    expect(frame).toContain('COUNTED STALKS:')
    expect(frame).toContain('MISSING STALKS')
    expect(frame).toContain('39')
    expect(frame).toContain('How many piles of 4 stalks')
    expect(frame).toContain('in the LEFT heap?')
    expect(frame).toContain('valid 0 to 10')
    // MISSING owns the count now — the strip carries no "accounted" total.
    expect(frame).not.toContain('accounted')
    expect(frame).toContain('Shift+Tab: go back')
    unmount()
  })

  it('renders ? in unfilled diagram cells (no [_] brackets)', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={() => {}} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const stripped = (lastFrame() ?? '').replaceAll(/\[[0-9;]*m/g, '')
    expect(stripped).not.toMatch(/\[_\]/)
    const questionMarks = stripped.match(/\?/g) ?? []
    expect(questionMarks.length).toBeGreaterThanOrEqual(3)
    unmount()
  })

  it('Tab cycles forward through pilesL → remL → pilesR → remR → pilesL', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // The initial mount fires `pilesL` once via the focus-witness effect.
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesL'),
    )
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remL'),
    )
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesR'),
    )
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remR'),
    )
    stdin.write(TAB)
    // Wrap back to pilesL — the last call should now be `pilesL` again.
    await waitFor(() => {
      const lastCall = onFocusedFieldChange.mock.calls.at(-1)?.[0]
      expect(lastCall).toBe('pilesL')
    })
    unmount()
  })

  it('Shift+Tab cycles focus backward through the same order', async () => {
    // xterm's Shift+Tab is `ESC [ Z` (CSI Z) — Ink's input.js parses this
    // as `{ tab: true, shift: true }`.
    const SHIFT_TAB = '[Z'
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesL'),
    )
    // Shift+Tab from pilesL → remR (last in cycle).
    stdin.write(SHIFT_TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remR'),
    )
    // Shift+Tab again → pilesR.
    stdin.write(SHIFT_TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesR'),
    )
    // Shift+Tab again → remL.
    stdin.write(SHIFT_TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remL'),
    )
    unmount()
  })

  it('counts the MISSING gauge down to 0 as the user types a valid cast', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    // Valid cast (pL4 rL3 pR4 rR4, M=40): COUNTED 19 + 20 + 1 = 40, MISSING 0.
    await waitFor(() => {
      // oxlint-disable-next-line no-control-regex
      const stripped = (lastFrame() ?? '').replaceAll(/\u001B\[[0-9;]*m/g, '')
      expect(stripped).toMatch(/COUNTED STALKS:\s+- 40/)
      expect(stripped).toMatch(/MISSING STALKS\s+0/)
      // Fully valid → strip nudges to commit.
      expect(stripped).toContain('Press Enter to commit')
    })
    unmount()
  })

  it('suspended-sum failure renders the actual remainders (no literal "null" leak)', async () => {
    // Regression guard: the message template formerly interpolated
    // closure-scoped `remL`/`remR` (typed `number | null`); a future
    // refactor that reordered validator priority could let it render as
    // `(1 + null + null)`. The message now reads from the (narrowed)
    // validator return type — so even at the type level the values are
    // `number`, and at runtime they must be the same digits the user
    // typed. Uses an unreachable-in-production M=10 prop to force a
    // reachable suspended-sum failure (conservation+suspended both fire
    // only for non-canonical unparted totals).
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        unpartedStalks={10}
        max={9}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // pilesL=1, remL=1, pilesR=0, remR=4 → conservation total = 10 ✓,
    // suspended sum = 1 + 1 + 4 = 6 ∉ {4, 8} for cast 2 (castIndex=1).
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '1',
      remL: '1',
      pilesR: '0',
      remR: '4',
    })
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      // The actual rendered message must include the typed remainders.
      expect(frame).toMatch(/Suspended sum \(1 \+ 1 \+ 4\) = 6/)
      expect(frame).toContain('expected 4 or 8')
      // oxlint-disable-next-line no-control-regex
      const stripped = frame.replaceAll(/\u001B\[[0-9;]*m/g, '')
      expect(stripped).not.toMatch(/null/)
    })
    unmount()
  })

  it('zero-remainder failure shows a red message identifying which side is 0', async () => {
    // Cast 2, M=40: pL=4, rL=3, pR=5, rR=0 → conservation passes
    // (4·4+3+4·5+0+1 = 40 ✓) and suspended sum 1+3+0 = 4 ∈ {4, 8} ✓, but
    // rR=0 violates the never-zero rule. Without the guard, the validator
    // would return `ok` — instead the SPLIT row should show the red
    // "Right remainder is 0" message.
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '4',
      remL: '3',
      pilesR: '5',
      remR: '0',
    })
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain('Right heap has no remainder')
      expect(frame).toContain('fully divisible heaps yield remainder 4, not 0')
    })
    unmount()
  })

  it('Enter is a no-op when the validator returns zero-remainder', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '4',
      remL: '3',
      pilesR: '5',
      remR: '0',
    })
    stdin.write(ENTER)
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('conservation failure turns the MISSING gauge red (no worded strip message)', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // pL5 rL2 pR4 rR3, M=40: COUNTED 22 + 19 + 1 = 42 → over by 2, MISSING -2.
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '5',
      remL: '2',
      pilesR: '4',
      remR: '3',
    })
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      // oxlint-disable-next-line no-control-regex
      const stripped = frame.replaceAll(/\u001B\[[0-9;]*m/g, '')
      // MISSING shows the (negative) shortfall, in BOLD_RED. Ink may split
      // the `1;91m` SGR into `1m` + `91m`, so assert on the red `91m` code,
      // which is present in either encoding (and nowhere else in the frame).
      expect(stripped).toMatch(/MISSING STALKS\s+-2/)
      expect(frame).toContain('91m')
      // Conservation is owned by MISSING — no worded arithmetic in the strip.
      expect(stripped).not.toContain('22 + 19')
      expect(stripped).not.toContain('expected 40')
      expect(stripped).toContain('Shift+Tab: go back')
    })
    unmount()
  })

  it('Enter is a no-op when the validator does not return ok', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Conservation failure: pL=5, rL=2, pR=4, rR=3 → total 42 ≠ 40.
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '5',
      remL: '2',
      pilesR: '4',
      remR: '3',
    })
    stdin.write(ENTER)
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('Enter on a valid input commits onSubmit(pick) after manualRevealMs={0}', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(validBasePropsInput.expectedPick)
    })
    unmount()
  })

  it('boundary commit: minimum-piles input commits the smallest valid pick', async () => {
    // Smallest pL that yields conservation+suspended for cast 2/M=40 with
    // rL=4, rR=3: 4·pL + 4 + 4·pR + 3 + 1 = 40 → pL + pR = 8. suspended = 1+4+3 = 8 ✓.
    // Take pL=0, pR=8 → pick = 4·0+4 = 4.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '0',
      remL: '4',
      pilesR: '8',
      remR: '3',
    })
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(4)
    })
    unmount()
  })

  it('post-commit reveal swaps the bottom row to the green resolved string', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        manualRevealMs={150}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    stdin.write(ENTER)
    // Reveal appears immediately; onSubmit hasn't fired yet.
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain(
        `→ next cast: ${validBasePropsInput.expectedNext} unparted`,
      )
      expect(frame).toContain('Resolved.')
      expect(frame).toContain('Enter to advance')
    })
    expect(onSubmit).not.toHaveBeenCalled()
    await waitFor(
      () =>
        expect(onSubmit).toHaveBeenCalledWith(validBasePropsInput.expectedPick),
      { timeoutMs: 1000 },
    )
    unmount()
  })

  it('Enter during the reveal dwell skips to advance (fires onSubmit immediately)', async () => {
    // Long dwell so the test sits inside it; the second Enter should
    // short-circuit and fire onSubmit well before the timer would.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        manualRevealMs={2500}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    stdin.write(ENTER)
    // First Enter starts the dwell; onSubmit must not have fired yet.
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    // Second Enter during the dwell fires onSubmit immediately.
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit).toHaveBeenCalledWith(validBasePropsInput.expectedPick)
    unmount()
  }, 5000)

  it('Ctrl+R is NOT consumed by the prompt (no state change, no onSubmit)', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={onSubmit} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const before = lastFrame()
    stdin.write(CTRL_R)
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    // The frame should be unchanged — Ctrl+R is owned by the viewer, not us.
    expect(lastFrame()).toBe(before)
    unmount()
  })

  it('reveal uses byte-identity arithmetic (round-1 commit pinned to 24/49 → next 40)', async () => {
    // Anchor the closed-form helper against the canonical first-round split.
    //   pick = 24, unparted = 49
    //   leftRem  = ((24 - 1) % 4) + 1 = 4
    //   rightAfterPart = 49 - 24 = 25
    //   rightCount     = 25 - 1 = 24
    //   rightRem       = ((24 - 1) % 4) + 1 = 4
    //   next           = 24 - 4 + (24 - 4) = 40
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        castIndex={0}
        max={48}
        unpartedStalks={49}
        manualRevealMs={150}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Conservation + suspended (cast 1 expects {5, 9}) passing input for pick=24:
    //   pilesL=5, remL=4, pilesR=5, remR=4 → total 49 ✓, suspended 9 ✓.
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '5',
      remL: '4',
      pilesR: '5',
      remR: '4',
    })
    stdin.write(ENTER)
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain('→ next cast: 40 unparted')
    })
    unmount()
  })

  it('honours horizontalOffset by slicing each row of the prompt', async () => {
    const onReady = vi.fn()
    const { lastFrame: f0, unmount: u0 } = render(
      <CastingPromptBox
        {...baseProps}
        width={40}
        horizontalOffset={0}
        onSubmit={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    const at0 = f0() ?? ''
    u0()
    // A pan of 20 cols should hide the leading `Line 3/6` chars and reveal
    // text from later in the title row.
    const onReady2 = vi.fn()
    const { lastFrame: f1, unmount: u1 } = render(
      <CastingPromptBox
        {...baseProps}
        width={40}
        horizontalOffset={20}
        onSubmit={() => {}}
        onReady={onReady2}
      />,
    )
    await waitForReady(onReady2)
    const at20 = f1() ?? ''
    u1()
    // The two frames must differ — the pan is observable.
    expect(at20).not.toBe(at0)
    // The 0-offset frame contains the title's leading prefix; the 20-offset
    // frame does not.
    expect(at0).toContain('Line 3/6')
    expect(at20).not.toContain('Line 3/6')
  })

  it('typing a digit appends to the focused buffer; resulting value > max is rejected', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Initially focused on pilesL; max for cast 2 M=40 is floor(40/4) = 10.
    // Type "1" — accepted (1 ≤ 10).
    stdin.write('1')
    await yieldMacrotask()
    // Type "0" — accepted (10 ≤ 10).
    stdin.write('0')
    await yieldMacrotask()
    // Type "0" — would yield 100, rejected.
    stdin.write('0')
    await yieldMacrotask()
    // The diagram should show pilesL = 10 (not 100). Strip ANSI first so the
    // inverse-video escape around the focused cell does not split the match.
    // oxlint-disable-next-line no-control-regex
    const stripped = (lastFrame() ?? '').replaceAll(/\u001B\[[0-9;]*m/g, '')
    expect(stripped).toMatch(/Piles\s+10/)
    expect(stripped).not.toMatch(/Piles\s+100/)
    unmount()
  })

  it('backspace removes the last digit of the focused buffer', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    stdin.write('5')
    await yieldMacrotask()
    // Frame before backspace shows the typed 5 in the pilesL cell.
    // oxlint-disable-next-line no-control-regex
    const stripped0 = (lastFrame() ?? '').replaceAll(/\u001B\[[0-9;]*m/g, '')
    expect(stripped0).toMatch(/Piles\s+5/)
    stdin.write(BACKSPACE)
    await yieldMacrotask()
    // After backspace pilesL is empty; the MISSING gauge returns to its
    // nothing-typed reading — COUNTED 1 (just the suspended stalk), MISSING
    // 39 — and the diagram no longer shows the typed `5`. (A focused empty
    // cell renders as an inverse space — invisible after ANSI strip — so we
    // assert via the gauge and the absence of the digit.)
    // oxlint-disable-next-line no-control-regex
    const stripped1 = (lastFrame() ?? '').replaceAll(/\u001B\[[0-9;]*m/g, '')
    expect(stripped1).toMatch(/COUNTED STALKS:\s+- 1/)
    expect(stripped1).toMatch(/MISSING STALKS\s+39/)
    expect(stripped1).not.toMatch(/Piles\s+5/)
    unmount()
  })
})
