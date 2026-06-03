import { Box, Text, useInput } from 'ink'
import { useEffect, useRef, useState, type ReactElement } from 'react'
import sliceAnsi from 'slice-ansi'
import stringWidth from 'string-width'

import {
  bottomStripRow,
  DIAGRAM_WIDTH,
  flowFooterRows,
  flowHeaderRows,
  focusedInputBoxRows,
  MANUAL_BODY_GAP,
  MANUAL_FIELD_ORDER,
  MANUAL_NATURAL_BODY_WIDTH,
  manualTitleRow,
  questionPanelRows,
  stepDotsRow,
  twoHeapDiagramRows,
  type BottomStripArgs,
  type ManualDiagramState,
  type ManualFocusedField,
  type MissingColor,
} from './manual-diagram.js'
import {
  computeManualRoundResult,
  parseManualBuffer,
  validateManualInput,
} from './manual-validation.js'

// How long the manual-mode prompt holds its green `∴ LEFT HEAP … SUSPENDED …
// NEXT CAST …` reveal after Enter before forwarding `onSubmit` upstream.
// 2500 ms gives the user time to read the four-field resolved row (heaps,
// suspended count, next-cast unparted) without the eighteen-cast flow
// dragging. Tests opt out via `manualRevealMs={0}` to keep multi-cast
// assertions snappy; the skip-to-advance Enter shortcut lets the user cut
// the dwell short mid-reveal.
export const MANUAL_REVEAL_MS = 2500

interface ManualCastingPromptProps {
  lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  castIndex: 0 | 1 | 2
  width: number
  unpartedStalks: number
  manualRevealMs: number
  horizontalOffset: number
  onSubmit: (parsed: number) => void
  onReady?: () => void
  onFocusedFieldChange?: (field: ManualFocusedField) => void
  /**
   * Restore the four field buffers + focus + commit on mount — but only when
   * `castKey` matches this cast's `${lineNumber}-${castIndex}`. Lets the viewer
   * preserve in-progress typing across an unmount/remount (e.g. opening the
   * full-screen help overlay) without persisting it into a different cast.
   */
  initialDraft?: ManualDraft
  /**
   * Reports the live draft up whenever a buffer / focus / commit changes (and
   * once on mount). The viewer stashes it in a ref so `initialDraft` can
   * rehydrate the prompt after a remount. Omitted by non-manual callers.
   */
  onDraftChange?: (draft: ManualDraft) => void
}

interface ManualCommit {
  pick: number
  next: number
}

/**
 * The full editable state of one manual cast — the four field buffers, the
 * focused field, and the resolved commit (if Enter has fired). Tagged with
 * `castKey` (`${lineNumber}-${castIndex}`) so a stale draft is never restored
 * into a different cast. Lifted out of `<ManualCastingPrompt>` so the viewer
 * can carry it across a remount.
 */
export interface ManualDraft {
  castKey: string
  pilesLBuffer: string
  remLBuffer: string
  pilesRBuffer: string
  remRBuffer: string
  focusedField: ManualFocusedField
  committed: ManualCommit | null
}

// Field-router helpers — used by the parent `useInput` digit/backspace
// branches to dispatch the appropriate state setter (and read the current
// buffer) for the currently-focused field without a nested switch in the
// handler body.
function manualSetterForField(
  field: ManualFocusedField,
  setters: {
    setPilesLBuffer: (s: string) => void
    setRemLBuffer: (s: string) => void
    setPilesRBuffer: (s: string) => void
    setRemRBuffer: (s: string) => void
  },
): (s: string) => void {
  switch (field) {
    case 'pilesL':
      return setters.setPilesLBuffer
    case 'remL':
      return setters.setRemLBuffer
    case 'pilesR':
      return setters.setPilesRBuffer
    case 'remR':
      return setters.setRemRBuffer
  }
}

function manualBufferForField(
  field: ManualFocusedField,
  buffers: {
    pilesLBuffer: string
    remLBuffer: string
    pilesRBuffer: string
    remRBuffer: string
  },
): string {
  switch (field) {
    case 'pilesL':
      return buffers.pilesLBuffer
    case 'remL':
      return buffers.remLBuffer
    case 'pilesR':
      return buffers.pilesRBuffer
    case 'remR':
      return buffers.remRBuffer
  }
}

/**
 * Manual-mode body of `<CastingPromptBox>` — the four-field
 * piles+remainder prompt used by the `hexagram-manual` flow. Users physically
 * casting yarrow stalks observe the post-sort heaps and remainders on both
 * sides of the table, then transcribe all four numbers here; we derive the
 * canonical split index (`4 × pilesL + remL`) and hand it upstream as if it
 * were a typed cast.
 *
 * Layout (20 content rows + 2 border = 22 rows total) is a vertical flow
 * diagram: slim title (`Line N/6 · Cast C/3 · Step P/4`) / blank / 2-row
 * UNPARTED header (`UNPARTED STALKS: N` + branch) / 10-row heap-card
 * band (LEFT + RIGHT cards, each: header / Piles / Fours ×4 / sep / Subtotal /
 * Remainder / Suspended-or-blank / sep / Total / footer), with the question +
 * dim range hint + 3-row drawn-box input + step dots mapped onto the right of
 * the band / 4-row COUNTED-MISSING footer (join + `COUNTED STALKS: - N`
 * + rule + `MISSING STALKS N`) / blank / one-row feedback strip. The MISSING
 * gauge is the live conservation readout — neutral mid-countdown, green when
 * commit-ready, red on a completed wrong total. Each row is pre-built ANSI text
 * and sliced by `horizontalOffset` for the viewer's narrow-terminal `<` / `>`
 * pan, mirroring `<SliderCastingPrompt>`.
 *
 * Tab cycles focus forward through `pilesL → remL → pilesR → remR → pilesL`;
 * Shift+Tab cycles backward. Digit/backspace input is owned by this
 * component's `useInput` (the focused input box is plain text, not a
 * `<NumberInput>` child); the validator + commit path are likewise local.
 *
 * Validator priority (first failing check wins): incomplete → zero-remainder
 * → conservation → suspended-sum → ok. Conservation is surfaced by the red
 * MISSING gauge (never as strip text); the feedback strip's error branch
 * renders only the suspended-sum / zero-remainder messages. The diagram's
 * active cells stay inverse-video on the focused field even in error.
 *
 * On a valid Enter:
 *   - local `committed = { pick, next }` captures the resolved pick plus the
 *     closed-form next-round unparted count,
 *   - both heap cards switch to BOLD_GREEN and the right pane swaps to
 *     `Resolved. / blank / Enter to advance (or wait 2.5 s)`,
 *   - the bottom strip swaps to a green `→ next cast: N unparted`,
 *   - a `manualRevealMs`-delayed `setTimeout` fires `onSubmit(pick)`
 *     upstream (tests opt out with `manualRevealMs={0}`, which short-circuits
 *     to a synchronous dispatch),
 *   - pressing Enter again during the dwell fires `onSubmit` immediately
 *     (skip-to-advance), so a confident caster doesn't have to wait out the
 *     full reveal.
 *
 * The rendered height is locked at
 * `getCastingPromptHeight(_, _, 'manual') = 22`.
 */
export function ManualCastingPrompt({
  lineNumber,
  castIndex,
  width,
  unpartedStalks,
  manualRevealMs,
  horizontalOffset,
  onSubmit,
  onReady,
  onFocusedFieldChange,
  initialDraft,
  onDraftChange,
}: ManualCastingPromptProps): ReactElement {
  // Rehydrate from a lifted draft only when it belongs to THIS cast — a draft
  // tagged with a different `castKey` is from a prior cast and must not bleed
  // in (a fresh cast always starts empty). Read once via lazy useState
  // initialisers; later draft identity changes never overwrite live typing.
  const castKey = `${lineNumber}-${castIndex}`
  const restored = initialDraft?.castKey === castKey ? initialDraft : null
  const [pilesLBuffer, setPilesLBuffer] = useState(restored?.pilesLBuffer ?? '')
  const [remLBuffer, setRemLBuffer] = useState(restored?.remLBuffer ?? '')
  const [pilesRBuffer, setPilesRBuffer] = useState(restored?.pilesRBuffer ?? '')
  const [remRBuffer, setRemRBuffer] = useState(restored?.remRBuffer ?? '')
  const [focusedField, setFocusedField] = useState<ManualFocusedField>(
    restored?.focusedField ?? 'pilesL',
  )
  const [committed, setCommitted] = useState<ManualCommit | null>(
    restored?.committed ?? null,
  )

  // Per-field bounds. Piles ∈ [0, floor(unparted/4)] — a UX guard; the
  // validator's conservation check is the source of truth for the
  // cross-field invariant, so per-field bounds can be lenient without
  // letting an invalid commit through. Remainders ∈ [1, 4] (I Ching: a
  // heap divisible by 4 yields remainder 4, never 0). The digit-input
  // branch in `useInput` below treats `remMax = 4` as an inclusive cap on
  // the typed buffer parse — a leniently-typed `0` reaches the validator
  // and surfaces as `zero-remainder`, matching the same error path the
  // user got with the legacy NumberInput.
  const pilesMax = Math.max(0, Math.floor(unpartedStalks / 4))
  const remMax = 4

  // Live-parse each buffer.
  const pilesL = parseManualBuffer(pilesLBuffer)
  const remL = parseManualBuffer(remLBuffer)
  const pilesR = parseManualBuffer(pilesRBuffer)
  const remR = parseManualBuffer(remRBuffer)
  const validation = validateManualInput({
    pilesL,
    remL,
    pilesR,
    remR,
    unparted: unpartedStalks,
    castIndex,
  })

  // Live heap totals — used by the bottom strip to mirror the user's typing
  // even before all four fields are populated. Treat a null parse as 0 so
  // the row never disappears; an absent field is a partial total, not an
  // error.
  const liveLeftTotal = 4 * (pilesL ?? 0) + (remL ?? 0)
  const liveRightTotal = 4 * (pilesR ?? 0) + (remR ?? 0)

  // Latest-`onSubmit` and -`onFocusedFieldChange` refs so the related
  // effects don't re-run on every parent re-render with a fresh closure.
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => {
    onSubmitRef.current = onSubmit
  })
  const onFocusedFieldChangeRef = useRef(onFocusedFieldChange)
  useEffect(() => {
    onFocusedFieldChangeRef.current = onFocusedFieldChange
  })
  const onDraftChangeRef = useRef(onDraftChange)
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange
  })

  // Report the live draft up on every change (and once on mount) so the viewer
  // can rehydrate it after a remount (e.g. the help overlay). Keyed by
  // `castKey` so the viewer knows which cast the stashed draft belongs to.
  useEffect(() => {
    onDraftChangeRef.current?.({
      castKey,
      pilesLBuffer,
      remLBuffer,
      pilesRBuffer,
      remRBuffer,
      focusedField,
      committed,
    })
  }, [
    castKey,
    pilesLBuffer,
    remLBuffer,
    pilesRBuffer,
    remRBuffer,
    focusedField,
    committed,
  ])

  // Tab / Shift+Tab / Enter / digit / backspace handler. The parent owns
  // both the focus cycle and the gated commit; digit + backspace handling
  // moved here in the Phase 7 redesign (the focused input box is plain
  // text, no `<NumberInput>` child intercepting keystrokes).
  useInput((input, key) => {
    if (key.tab) {
      // Tab order: pilesL → remL → pilesR → remR → pilesL.
      // Shift+Tab reverses it.
      const current = MANUAL_FIELD_ORDER.indexOf(focusedField)
      const step = key.shift ? -1 : 1
      const next =
        MANUAL_FIELD_ORDER[
          (current + step + MANUAL_FIELD_ORDER.length) %
            MANUAL_FIELD_ORDER.length
        ]!
      setFocusedField(next)
      return
    }
    if (key.return) {
      // Skip-to-advance: if a commit is already in flight (the reveal dwell
      // is running), Enter fires onSubmit immediately and lets the dwell
      // timer's cleanup tear down naturally. `committed.pick` is stable.
      if (committed !== null) {
        onSubmitRef.current(committed.pick)
        return
      }
      // First Enter: commit only when the validator passes.
      if (validation.kind !== 'ok') return
      const result = computeManualRoundResult(
        validation.pick,
        castIndex,
        unpartedStalks,
      )
      setCommitted({
        pick: validation.pick,
        next: result.next,
      })
      return
    }
    // While the reveal-dwell is showing the resolved view, freeze the
    // buffers — neither digits nor backspace mutate them. Only the
    // skip-to-advance Enter (above) is honoured.
    if (committed !== null) return
    // Backspace / DEL — remove the last char from the focused buffer.
    if (key.backspace || key.delete) {
      const setter = manualSetterForField(focusedField, {
        setPilesLBuffer,
        setRemLBuffer,
        setPilesRBuffer,
        setRemRBuffer,
      })
      const currentBuffer = manualBufferForField(focusedField, {
        pilesLBuffer,
        remLBuffer,
        pilesRBuffer,
        remRBuffer,
      })
      setter(currentBuffer.slice(0, -1))
      return
    }
    // Digit input — append if the resulting parse fits the field's per-field
    // max. Piles cap at `floor(unparted/4)`; remainders cap at 4. A leading
    // `0` in a remainder field is allowed through to the validator (which
    // surfaces it as `zero-remainder`). Ink can batch multiple digits into
    // one `input` chunk (`stdin.write('24')` arrives whole); accept any
    // all-digit run for parity with `<NumberInput>`. Control sequences
    // (arrow keys, etc.) contain non-digit bytes and fail the regex.
    if (input.length > 0 && /^\d+$/.test(input)) {
      const setter = manualSetterForField(focusedField, {
        setPilesLBuffer,
        setRemLBuffer,
        setPilesRBuffer,
        setRemRBuffer,
      })
      const currentBuffer = manualBufferForField(focusedField, {
        pilesLBuffer,
        remLBuffer,
        pilesRBuffer,
        remRBuffer,
      })
      const nextBuffer = currentBuffer + input
      const parsed = Number.parseInt(nextBuffer, 10)
      const max =
        focusedField === 'pilesL' || focusedField === 'pilesR'
          ? pilesMax
          : remMax
      if (Number.isInteger(parsed) && parsed <= max) {
        setter(nextBuffer)
      }
      return
    }
  })

  // Reveal-dwell timer. Fires `onSubmit(pick)` after `manualRevealMs`
  // milliseconds — or synchronously when the caller opts out with
  // `manualRevealMs={0}`. The skip-to-advance Enter path above fires
  // `onSubmit` directly and lets this cleanup run on unmount.
  useEffect(() => {
    if (committed === null) return
    if (manualRevealMs === 0) {
      onSubmitRef.current(committed.pick)
      return
    }
    const timer = setTimeout(() => {
      onSubmitRef.current(committed.pick)
    }, manualRevealMs)
    return () => {
      clearTimeout(timer)
    }
  }, [committed, manualRevealMs])

  // Mount-witness — fires once per mount, on the same useEffect tick the
  // parent `useInput` registers under, so tests can gate cross-state
  // keystrokes on `onReady` instead of polling render output.
  const onReadyFiredRef = useRef(false)
  useEffect(() => {
    if (onReadyFiredRef.current) return
    onReadyFiredRef.current = true
    onReady?.()
  }, [onReady])

  // Focus witness — fires whenever the focused field changes, including
  // the initial mount. Tests gate Tab→digit pairs on this signal to bypass
  // Ink's `useInput` bind race; production callers omit
  // `onFocusedFieldChange` and the ref-call is a no-op.
  useEffect(() => {
    onFocusedFieldChangeRef.current?.(focusedField)
  }, [focusedField])

  // ── Render: row-builder composition + sliceAnsi pan ───────────────────

  const innerContentWidth = Math.max(1, width - 2)
  // Natural body width: diagramWidth (42) + 8-col gap + right-pane (45 —
  // widest question: "How many piles of 4 stalks in the RIGHT heap?" = 45
  // cols). Sliced against innerContentWidth so the exact figure matters
  // only as a floor on narrow terminals.
  const naturalBodyWidth = MANUAL_NATURAL_BODY_WIDTH
  const renderWidth = Math.max(innerContentWidth, naturalBodyWidth)

  // ── Horizontal centering (manual prompt only) ─────────────────────────
  // Center the body block (natural width 95) as one rigid unit, and the
  // title text independently, both within innerContentWidth. Both clamp to 0
  // below their natural width, where the existing pad-to-renderWidth +
  // sliceAnsi pan takes over unchanged. The strip is built at
  // `renderWidth - leadingPadBody` and prepended with the same pad, so its
  // left element lands at the body-left-edge while `Shift+Tab` stays pinned
  // to the box's right edge.
  const leadingPadBody = Math.max(
    0,
    Math.floor((innerContentWidth - naturalBodyWidth) / 2),
  )
  const stripRenderWidth = renderWidth - leadingPadBody

  // Diagram state drives editing / error / resolved colouring. Validator
  // `incomplete` and `ok` are both "editing" — the user is mid-flow and
  // hasn't surfaced an actionable error yet.
  const isEditingValidation =
    validation.kind === 'incomplete' || validation.kind === 'ok'
  let diagramState: ManualDiagramState
  if (committed !== null) {
    diagramState = 'resolved'
  } else if (isEditingValidation) {
    diagramState = 'editing'
  } else {
    diagramState = 'error'
  }

  // Row 1: title.
  const titleRow = manualTitleRow(lineNumber, castIndex, focusedField)
  const leadingPadTitle = Math.max(
    0,
    Math.floor((innerContentWidth - stringWidth(titleRow)) / 2),
  )
  const centeredTitleRow = ' '.repeat(leadingPadTitle) + titleRow

  // Left half is the vertical flow diagram: UNPARTED header (2 rows) → the
  // 10-row heap-card band → COUNTED/MISSING footer (4 rows). The card band's
  // 10 rows are the only ones paired with right-pane content.
  const flowHeader = flowHeaderRows(unpartedStalks)
  const cardBand = twoHeapDiagramRows({
    pilesL,
    remL,
    pilesR,
    remR,
    focusedField,
    state: diagramState,
  })
  // COUNTED ticks live (untyped fields → 0; +1 always-suspended). MISSING is
  // the conservation gauge: green when fully commit-ready, red on a completed
  // wrong total, neutral mid-countdown (incomplete / suspended-sum / zero-rem).
  const counted = liveLeftTotal + liveRightTotal + 1
  const missing = unpartedStalks - counted
  let missingColor: MissingColor = 'neutral'
  if (committed !== null || validation.kind === 'ok') {
    missingColor = 'green'
  } else if (validation.kind === 'conservation') {
    missingColor = 'red'
  }
  const flowFooter = flowFooterRows({ counted, missing, missingColor })

  // Right pane aligned to the 10-row card band: question + dim range hint sit
  // beside Piles / Fours; the 3-row input box beside Subtotal / Remainder /
  // Suspended; the step dots beside Total. Header / separators / footer rows
  // get a blank right. During the resolved dwell the input box collapses.
  const qRows = questionPanelRows({
    focusedField,
    unpartedStalks,
    state: diagramState === 'resolved' ? 'resolved' : 'editing',
  })
  const inputRows =
    committed === null
      ? focusedInputBoxRows({
          value: manualBufferForField(focusedField, {
            pilesLBuffer,
            remLBuffer,
            pilesRBuffer,
            remRBuffer,
          }),
          focused: true,
        })
      : ['', '', '']
  const dotsRow = committed === null ? stepDotsRow(focusedField) : ''
  const cardRightPane = [
    '', // header
    qRows[0] ?? '', // Piles → question
    qRows[1] ?? '', // Fours → range hint
    '', // separator
    inputRows[0] ?? '', // Subtotal → input box top
    inputRows[1] ?? '', // Remainder → input box mid
    inputRows[2] ?? '', // Suspended → input box bottom
    '', // separator
    dotsRow, // Total → step dots
    '', // footer
  ]

  // Compose each body row from a left half (flow diagram, display width
  // DIAGRAM_WIDTH) and a right half, gap = 8. Pad the whole row out to
  // `renderWidth` so successive slices land at predictable offsets.
  const composeBodyRow = (leftRow: string, rightRow: string): string => {
    const leftWidth = stringWidth(leftRow)
    const rightWidth = stringWidth(rightRow)
    const leftPadTrail = Math.max(0, DIAGRAM_WIDTH - leftWidth)
    const middleGap = MANUAL_BODY_GAP
    const totalSoFar = DIAGRAM_WIDTH + middleGap + rightWidth
    const trailingPad = Math.max(0, renderWidth - totalSoFar)
    return `${leftRow}${' '.repeat(leftPadTrail)}${' '.repeat(middleGap)}${rightRow}${' '.repeat(trailingPad)}`
  }
  const padBody = (row: string): string => ' '.repeat(leadingPadBody) + row
  const bodyRows = [
    ...flowHeader.map((row) => padBody(composeBodyRow(row, ''))),
    ...cardBand.map((row, i) =>
      padBody(composeBodyRow(row, cardRightPane[i] ?? '')),
    ),
    ...flowFooter.map((row) => padBody(composeBodyRow(row, ''))),
  ]

  // Row 9: the one-row bottom strip — editing / error / resolved branch
  // selected from the validator + committed state.
  const bottomStripBranchArgs = ((): BottomStripArgs => {
    if (committed !== null) {
      return {
        branch: 'resolved',
        next: committed.next,
        renderWidth: stripRenderWidth,
      }
    }
    if (validation.kind === 'suspended-sum') {
      return {
        branch: 'error',
        errorKind: 'suspended-sum',
        remL: validation.remL,
        remR: validation.remR,
        sum: validation.sum,
        expectedLabel: validation.expectedLabel,
        renderWidth: stripRenderWidth,
      }
    }
    if (validation.kind === 'zero-remainder') {
      return {
        branch: 'error',
        errorKind: 'zero-remainder',
        remL: validation.remL,
        remR: validation.remR,
        renderWidth: stripRenderWidth,
      }
    }
    // incomplete | conservation | ok — conservation is surfaced by the MISSING
    // gauge (red), not the strip, so it shares the blank editing branch.
    return {
      branch: 'editing',
      commitReady: validation.kind === 'ok',
      renderWidth: stripRenderWidth,
    }
  })()
  const stripRow =
    ' '.repeat(leadingPadBody) + bottomStripRow(bottomStripBranchArgs)

  // Stack the 20 content rows (title / blank / 2 flow-header / 10 card-band /
  // 4 flow-footer / blank / feedback strip), pad each to renderWidth, then
  // slice by horizontalOffset for the viewer's `<` / `>` narrow-terminal pan.
  const allRows = [centeredTitleRow, '', ...bodyRows, '', stripRow]
  const slicedRows = allRows.map((row) => {
    const padded = row + ' '.repeat(Math.max(0, renderWidth - stringWidth(row)))
    return sliceAnsi(
      padded,
      horizontalOffset,
      horizontalOffset + innerContentWidth,
    )
  })

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>{slicedRows[0]!}</Text>
      {slicedRows.slice(1).map((row, i) => (
        <Text key={`row-${i}`}>{row}</Text>
      ))}
    </Box>
  )
}
