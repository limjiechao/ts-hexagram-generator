import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import {
  CastingPromptBox,
  getCastingPromptHeight,
} from '../src/casting-prompt-box'
import { BACKSPACE, CTRL_R, ENTER, TAB } from './helpers/keystrokes'

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

  // Strip ANSI, split into lines, and return the count of leading spaces on
  // the first line containing `needle` (−1 if no such line). Used to assert
  // horizontal centering offsets without depending on exact trailing padding.
  function leadingSpacesOf(frame: string, needle: string): number {
    // oxlint-disable-next-line no-control-regex
    const stripped = frame.replaceAll(/\[[0-9;]*m/g, '')
    for (const rawLine of stripped.split('\n')) {
      // Drop the box's left border glyph (chrome) so the count reflects the
      // content's own leading pad, not the border.
      const line = rawLine.replace(/^[│╭╰╮╯]/, '')
      if (line.includes(needle)) {
        return line.length - line.trimStart().length
      }
    }
    return -1
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

  it('centers the body block and title within a wide box', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        width={140}
        onSubmit={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    // width 140 → innerContentWidth 138; body natural width 95 →
    // leadingPadBody = floor((138-95)/2) = 21; title is 30 cols →
    // leadingPadTitle = floor((138-30)/2) = 54.
    expect(leadingSpacesOf(frame, 'UNPARTED STALKS:')).toBe(21)
    expect(leadingSpacesOf(frame, 'LEFT HEAP')).toBe(21)
    expect(leadingSpacesOf(frame, 'COUNTED STALKS:')).toBe(21)
    expect(leadingSpacesOf(frame, 'Line 3/6 · Cast 2/3 · Step 1/4')).toBe(54)
    unmount()
  })

  it('does not center the body below its natural width; title still centers', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        width={80}
        onSubmit={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    // width 80 → innerContentWidth 78 < 95 → leadingPadBody = 0 (body left-
    // aligned exactly as before). Title is 30 cols → leadingPadTitle =
    // floor((78-30)/2) = 24, so the title still centers independently.
    expect(leadingSpacesOf(frame, 'UNPARTED STALKS:')).toBe(0)
    expect(leadingSpacesOf(frame, 'Line 3/6 · Cast 2/3 · Step 1/4')).toBe(24)
    unmount()
  })

  it('aligns the strip hint to the body-left-edge with Shift+Tab pinned right', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        width={140}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Type a conservation- and suspended-sum-valid 4-field input (no Enter):
    // validation becomes `ok`, so the editing strip shows "Press Enter to
    // commit" on the left.
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: validBasePropsInput.pilesL,
      remL: validBasePropsInput.remL,
      pilesR: validBasePropsInput.pilesR,
      remR: validBasePropsInput.remR,
    })
    const frame = lastFrame() ?? ''
    // Left element starts at the body's left edge (leadingPadBody = 21).
    expect(leadingSpacesOf(frame, 'Press Enter to commit')).toBe(21)
    // The global nav hint is still present (right-pinned to the box edge).
    // oxlint-disable-next-line no-control-regex
    const stripped = frame.replaceAll(/\[[0-9;]*m/g, '')
    const stripLine =
      stripped.split('\n').find((l) => l.includes('Press Enter to commit')) ??
      ''
    expect(stripLine).toContain('Shift+Tab: go back')
    // Right-pinned: the hint sits at the end of the content, immediately
    // before the box's right border.
    expect(stripLine).toMatch(/Shift\+Tab: go back[│ ]*$/)
    unmount()
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
