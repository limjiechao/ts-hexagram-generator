import { BOLD_RED, NORMAL } from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import type { SliderAutoLand } from './bouncing-slider-store.js'
import type { ManualFocusedField } from './manual-diagram.js'
import {
  MANUAL_REVEAL_MS,
  ManualCastingPrompt,
  type ManualDraft,
} from './manual-prompt.js'
import { NumberInput } from './number-input.js'
import {
  SLIDER_COMMIT_REVEAL_MS,
  SliderCastingPrompt,
} from './slider-prompt.js'
import type { FlowKind } from './viewer-flow.js'

// ── CastingPromptBox ────────────────────────────────────────────────────────

export type CastingInputMode = 'slider' | 'number'

/**
 * Rendered height of `<CastingPromptBox>` for a given mode + error state,
 * border included. Colocated with the component because the viewer reserves
 * vertical space for the prompt before mounting it — keeping the contract
 * here means a new input mode can't drift the two numbers out of sync.
 *
 *   slider mode → 5 content rows (title + blank + bar + blank + readout) → 7
 *                 with border
 *   number mode → 2 content rows + optional error → 5 normally, 6 with error
 *   manual flow → always 22 — the vertical flow diagram: slim title / blank /
 *                 2-row UNPARTED header (readout + branch) / 10-row
 *                 heap-card band (LEFT + RIGHT, with the question + dim range
 *                 hint + 3-row drawn-box input + step dots mapped onto the
 *                 right of the band) / 4-row COUNTED/MISSING footer (join +
 *                 COUNTED + rule + MISSING) / blank / feedback strip
 *                 → 20 content rows + 2 border. The feedback strip renders
 *                 one of three branches: editing (blank, or "Press Enter to
 *                 commit" once valid), error (BOLD_RED suspended-sum /
 *                 zero-remainder message), or resolved (BOLD_GREEN next-cast
 *                 unparted) — all with a `Shift+Tab: go back` hint. The
 *                 MISSING gauge owns conservation feedback (red on a wrong
 *                 completed total, green when commit-ready). All rows are
 *                 pre-built ANSI text and sliced by `horizontalOffset` for the
 *                 viewer's narrow-terminal `<` / `>` pan, like the slider.
 */
export function getCastingPromptHeight(
  inputMode: CastingInputMode,
  hasError: boolean,
  flowKind: FlowKind = 'interactive',
): number {
  if (flowKind === 'manual') return 22
  if (inputMode === 'slider') return 7
  return hasError ? 6 : 5
}

interface CastingPromptBoxProps {
  lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  castIndex: 0 | 1 | 2
  min: number
  max: number
  width: number
  inputMode: CastingInputMode
  // Number-mode plumbing — ignored when inputMode === 'slider'.
  buffer?: string
  error?: string | null
  onChange?: (next: string) => void
  onError?: (message: string | null) => void
  // Shared:
  onSubmit: (parsed: number) => void
  /** Slider-mode tick interval; defaults to 80 ms (see `<SliderInput>`). */
  tickMs?: number
  /**
   * Horizontal pan offset, in display columns, applied to slider-mode rows
   * for narrow terminals. The viewer drives this via `<` / `>` during the casting
   * phase. Ignored in number mode (which has no overflow).
   */
  horizontalOffset?: number
  /**
   * Slider-mode auto-land config — supplied only by the random-casting
   * playback. When set the bouncing cursor commits itself on the
   * RNG-predetermined pick after the arm delay; the title also drops the
   * SPACE instruction. Absent for the interactive flow (SPACE-to-commit).
   */
  autoLand?: SliderAutoLand | null
  /**
   * Slider-mode skip callback — supplied only by the random-casting playback
   * (alongside `autoLand`). While auto-land is active, SPACE routes here to
   * abandon the rest of the animation instead of committing a pick. Absent
   * for the interactive flow, whose SPACE commits the cast as before.
   */
  onSkip?: () => void
  /**
   * Slider-mode reveal duration in ms — how long the post-SPACE numeric
   * `Left Heap` / `Right Heap` readout holds before `onSubmit` fires upstream.
   * Defaults to `SLIDER_COMMIT_REVEAL_MS`. Tests opt out by passing `0` to
   * keep multi-cast flow assertions snappy.
   */
  commitRevealMs?: number
  /**
   * Slider-mode mount-witness callback. Forwarded to the underlying
   * `<SliderCastingPrompt>` / `<SliderInput>` and fired exactly once per
   * mount, after `useSliderBounce`'s `useInput` has registered with Ink's
   * stdin dispatcher. Tests gate cross-cast SPACE presses on this signal
   * instead of polling the Braille spinner glyph (the prior incidental
   * proxy). Also fired by the manual-flow branch from the same useEffect
   * that binds its parent `useInput` (Tab + Enter).
   */
  onReady?: () => void
  /**
   * Which casting flow is mounted. `'manual'` swaps the slider/number prompt
   * for the two-field piles+remainder input that drives the physical-yarrow
   * transcription flow. Defaults to `'interactive'` so existing callers stay
   * source-compatible.
   */
  flowKind?: FlowKind
  /**
   * Manual-mode reveal duration in ms — how long the post-Enter
   * `→ Round resolved: …` row holds before `onSubmit` fires upstream.
   * Defaults to `MANUAL_REVEAL_MS`. Tests opt out by passing `0`. Ignored
   * outside `flowKind === 'manual'`.
   */
  manualRevealMs?: number
  /**
   * Manual-mode current-round unparted count — the `M` in the
   * `Unparted stalks: M` row and the basis for the per-field bounds
   * (`piles ∈ [0, floor((max-1)/4)]`, `remainder ∈ [1, 4]`) plus the
   * cross-field range check (derived split ∈ `[1, max-1]`). Conventionally
   * equals `max + 1` (the casting hook keeps `currentMax = unparted - 1`).
   * Required when `flowKind === 'manual'`; ignored otherwise.
   */
  unpartedStalks?: number
  /**
   * Test-only manual-flow focus witness — fires whenever the focused field
   * cycles between `pilesL`, `remL`, `pilesR`, `remR`. Production callers
   * omit it; tests gate Tab→digit pairs on the callback to bypass Ink's
   * `useInput` bind race (see `superpowers:ink-useinput-bind`). Ignored
   * outside `flowKind === 'manual'`.
   */
  onFocusedFieldChange?: (field: ManualFocusedField) => void
  /**
   * Manual-flow draft rehydration / reporting — forwarded to
   * `<ManualCastingPrompt>` so the viewer can preserve in-progress typing
   * across a remount (e.g. opening the help overlay). Ignored outside
   * `flowKind === 'manual'`.
   */
  initialDraft?: ManualDraft
  onDraftChange?: (draft: ManualDraft) => void
}

/**
 * The bordered prompt that hosts the casting input during the flow.
 *
 * Two visual modes:
 *  - **slider** (default): five-row layout — verbatim title, blank spacer,
 *    centred bouncing-slider bar, blank spacer, centred
 *    `Stalks: <max + 1> | Left Heap:  <spinner> | Right Heap:  <spinner> + 1 suspended`
 *    readout (both Braille glyphs advanced one frame per tick — the left
 *    walks the cycle clockwise, the right anticlockwise; the live cursor
 *    value stays hidden). `Stalks` is `max + 1` — the true stalk count —
 *    because `max` is only the left-heap pick ceiling, held one short so the
 *    right heap keeps a stalk to suspend (掛一); that suspended stalk is the
 *    trailing `+ 1 suspended` on the right. Each heap cell — both glyph and
 *    pick — is rendered at a stable 2-column width so the readout never
 *    shifts laterally across the ticking → reveal transition or across
 *    (pick, max − pick) splits of differing digit counts. On SPACE, the
 *    cursor freezes and the readout swaps the glyphs for the concrete
 *    `Left Heap: <pick> | Right Heap: <max − pick> + 1 suspended` (each value
 *    padStart'd to 2 columns) for `SLIDER_COMMIT_REVEAL_MS` before
 *    `onSubmit` fires upstream — see the state list on
 *    `<SliderCastingPrompt>`. Rows are pre-built strings padded to at
 *    least the inner box width and sliced via `sliceAnsi` against
 *    `horizontalOffset`, so the box never reflows on narrow terminals
 *    (`<` / `>` in the viewer pans it).
 *  - **number**: the legacy typed-number prompt + `<NumberInput>` row.
 *    Unchanged from before the slider feature; opted into via
 *    `--numeric-input`.
 *
 * Rendered height: slider mode = 7 (border 2 + 5 content rows). Number mode
 * = 5 rows normally, 6 when `error !== null`. The viewer's layout maths
 * accounts for both via `castingPromptHeight`.
 */
export function CastingPromptBox({
  lineNumber,
  castIndex,
  min,
  max,
  width,
  inputMode,
  buffer = '',
  error = null,
  onChange,
  onError,
  onSubmit,
  tickMs = 80,
  horizontalOffset = 0,
  commitRevealMs = SLIDER_COMMIT_REVEAL_MS,
  autoLand = null,
  onSkip,
  onReady,
  flowKind = 'interactive',
  manualRevealMs = MANUAL_REVEAL_MS,
  unpartedStalks,
  onFocusedFieldChange,
  initialDraft,
  onDraftChange,
}: CastingPromptBoxProps): ReactElement {
  if (flowKind === 'manual') {
    // Defensive default — the viewer threads `unpartedStalks` explicitly, but
    // callers that omit it for `flowKind === 'manual'` get a sensible
    // baseline (current round's unparted == max + 1). This matches the
    // `useLineGenerator` invariant that `currentMax = unparted - 1`.
    const unparted = unpartedStalks ?? max + 1
    return (
      <ManualCastingPrompt
        lineNumber={lineNumber}
        castIndex={castIndex}
        width={width}
        unpartedStalks={unparted}
        manualRevealMs={manualRevealMs}
        horizontalOffset={horizontalOffset}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
        initialDraft={initialDraft}
        onDraftChange={onDraftChange}
      />
    )
  }
  if (inputMode === 'slider') {
    return (
      <SliderCastingPrompt
        lineNumber={lineNumber}
        castIndex={castIndex}
        min={min}
        max={max}
        width={width}
        tickMs={tickMs}
        horizontalOffset={horizontalOffset}
        commitRevealMs={commitRevealMs}
        autoLand={autoLand}
        onSkip={onSkip}
        onSubmit={onSubmit}
        onReady={onReady}
      />
    )
  }

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>{`Line ${lineNumber}/6 · Cast ${castIndex + 1}/3`}</Text>
      <Box flexDirection="row">
        <Text>{`Divide the stalks. Pick a number from ${min} to ${max}: `}</Text>
        <NumberInput
          value={buffer}
          focused
          min={min}
          max={max}
          onChange={onChange ?? (() => {})}
          onSubmit={onSubmit}
          onError={onError ?? (() => {})}
        />
      </Box>
      {error !== null && <Text>{`${BOLD_RED}${error}${NORMAL}`}</Text>}
    </Box>
  )
}
