import { saveConsultationFile } from '@hexagram/consultation-file/file'
import { selectablePickMax } from '@hexagram/core/casting-derivation'
import { generateRandomConsultation } from '@hexagram/core/random-casting'
import {
  assertIsCastingRecord,
  assertIsHexagram,
  type AdvanceableLineState,
  type CastingRecord,
  type Hexagram,
} from '@hexagram/core/types'
import {
  buildConsultationSections,
  buildPartialCastingSections,
  castingTableFollowRow,
  ConsultationReadout,
  type CastingPromptPan,
  type ConsultationSections,
} from '@hexagram/readout'
import {
  ConfirmModal,
  HelpOverlay,
  keyHintsFlowDefault,
  keyHintsForCasting,
  QueryBox,
  renderProgressBar,
  terminalWidth,
} from '@hexagram/viewer-core'
import { render, useApp, useInput, type Instance } from 'ink'
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactElement,
} from 'react'

import type { SliderAutoLand } from './bouncing-slider-store.js'
import {
  CastingPromptBox,
  getCastingPromptHeight,
} from './casting-prompt-box.js'
import { CastingStatus, getCastingStatusHeight } from './casting-status.js'
import { hasUnsavedCastProgress } from './has-unsaved-cast-progress.js'
import { MANUAL_GUIDE_LINES, MANUAL_GUIDE_TITLE } from './manual-guide.js'
import { MANUAL_REVEAL_MS, type ManualDraft } from './manual-prompt.js'
import { QueryEditor } from './query-editor.js'
import { SLIDER_COMMIT_REVEAL_MS, sliderPromptTitle } from './slider-prompt.js'
import {
  DEFAULT_CAST_BOUNCE_MS,
  DEFAULT_CAST_REVEAL_MS,
  DEFAULT_MAX_WRAP_WIDTH,
  DEFAULT_SLIDER_SWEEP_MS,
  deriveTickMs,
  type InputMode,
} from './utils-mode.js'
import {
  EMPTY_SECTIONS,
  flowReducer,
  initialFlowState,
  recordedMaxFor,
  type CastingPlan,
  type FlowAction,
  type FlowKind,
} from './viewer-flow.js'

export { type FlowKind } from './viewer-flow.js'

// The discard-confirm modal occupies the above-footer slot while open. Its
// height is fixed: 2 border rows + 1 title + 2 body lines + 1 prompt = 6.
const DISCARD_MODAL_HEIGHT = 6

interface ConsultationViewerProps {
  // Production callers pass a flowKind; the viewer then owns the entire flow.
  flowKind?: FlowKind
  // Casting input mode: 'slider' (default) is the bouncing-slider prompt;
  // 'number' restores the legacy typed input via `--numeric-input`.
  inputMode?: InputMode
  // Test / pre-built callers pass sections + savedPath; the viewer mounts
  // straight into `done` mode and never runs the flow.
  sections?: ConsultationSections
  savedPath?: string
  maxWrapWidth?: number
  // End-to-end slider sweep duration in ms; each cast derives its own
  // `tickMs` from this so wider ranges move faster cell-by-cell.
  sliderSweepMs?: number
  // Random-flow only: the ceremonial bounce arm delay in ms. The slider
  // bounces freely for this long before it is allowed to auto-land on the
  // RNG-predetermined pick. Ignored by the interactive flow.
  castBounceMs?: number
  // Random-flow + number-input mode only: the per-cast dwell in ms for the
  // text-based progressive reveal. A timer fires every `castRevealMs` and
  // dispatches the next `splitCommitted`. Ignored by the slider mode (which
  // is driven by the bounce animation) and by the interactive flow.
  castRevealMs?: number
  // How long the slider's post-SPACE numeric reveal holds before the cast
  // commits upstream. Forwarded to `<CastingPromptBox commitRevealMs>`;
  // tests pass `0` to bypass the dwell.
  sliderCommitRevealMs?: number
  // Soft back / exit callback — fired when Escape is pressed (after a discard
  // confirmation, when there is unsaved cast progress). Defaults to Ink's
  // `useApp().exit`, so the standalone casting bins quit on Escape as before;
  // the composed CLI injects a handler that routes back to its Home menu.
  onExit?: () => void
  // Verb shown after `Esc` in the footer key hints — names the real
  // destination of the soft-back Escape. Defaults to `"quit"` (the standalone
  // bins); the composed CLI passes e.g. `"home"`.
  exitLabel?: string
  // Test-only witness — forwarded to `<CastingStatus onReady>` so tests can
  // gate cross-cast keystrokes on the status widget's `useInput` being live,
  // sidestepping Ink's bind race. The status widget is keyed by
  // `${lineNumber}-${state.castIndex}` and remounts per cast; `onReady`
  // re-fires on each remount (the component's `wasActiveRef` resets per
  // mount), so this callback is invoked once per cast slot. Production
  // callers don't need this and leave it `undefined` — the component's
  // optional `onReady` then no-ops.
  onCastingStatusReady?: () => void
  // Test-only mount-witness — forwarded to the slider-mode
  // `<CastingPromptBox onReady>`. Fires once per slider mount, after its
  // `useInput` has registered with Ink's stdin dispatcher. Tests gate the
  // next cross-cast SPACE press on this signal (via `waitForReady(spy)`)
  // instead of polling the Braille spinner glyph. Production callers omit
  // it; ignored in `inputMode: 'number'` and during the number-mode random
  // playback (which mounts `<CastingStatus>` instead of the slider prompt).
  onSliderReady?: () => void
  // Manual-flow reveal duration in ms — how long the manual prompt holds the
  // post-Enter `→ Round resolved: …` row before firing `onSubmit` upstream.
  // Defaults to `MANUAL_REVEAL_MS`; tests opt out with `0`. Ignored outside
  // `flowKind === 'manual'`.
  manualRevealMs?: number
  // Manual-flow mount-witness — forwarded to the manual `<CastingPromptBox
  // onReady>`. Fires once per manual-prompt mount (each cast remounts), so
  // tests can gate cross-cast Tab/Enter on this signal instead of timing
  // races. Production callers omit it.
  onManualPromptReady?: () => void
  // Manual-flow focus witness — forwarded to the manual `<CastingPromptBox
  // onFocusedFieldChange>`. Fires whenever the focused field cycles between
  // `pilesL`, `remL`, `pilesR`, `remR`. Tests use it to gate Tab→digit pairs
  // across the four-field manual layout; production callers omit it.
  onManualFocusedFieldChange?: (
    field: 'pilesL' | 'remL' | 'pilesR' | 'remR',
  ) => void
}

// Which exit path a pending discard confirmation belongs to. `back` is the
// Escape (soft-back) path → routes to the injected `onExit`; `quit` is the
// Ctrl+C path → routes to a hard quit. `null` means no confirmation is open.
type DiscardPath = 'back' | 'quit' | null

/**
 * `<ConsultationViewer>` — the casting-flow wrapper. It owns the flow state
 * machine (`viewer-flow.ts`), the line generator, and the compute/save
 * effect, then injects the casting-flow widgets (`<QueryEditor>` /
 * `<CastingPromptBox>`) into `<ConsultationReadout>`'s slots and delegates
 * all chrome (tab bar, scrolling, footer) to it.
 */
export function ConsultationViewer({
  flowKind = 'interactive',
  inputMode = 'slider',
  sections: prebuiltSections,
  savedPath: prebuiltSavedPath,
  maxWrapWidth = DEFAULT_MAX_WRAP_WIDTH,
  sliderSweepMs = DEFAULT_SLIDER_SWEEP_MS,
  castBounceMs = DEFAULT_CAST_BOUNCE_MS,
  castRevealMs = DEFAULT_CAST_REVEAL_MS,
  sliderCommitRevealMs = SLIDER_COMMIT_REVEAL_MS,
  onExit,
  exitLabel = 'quit',
  onCastingStatusReady,
  onSliderReady,
  manualRevealMs = MANUAL_REVEAL_MS,
  onManualPromptReady,
  onManualFocusedFieldChange,
}: ConsultationViewerProps): ReactElement {
  const { exit } = useApp()
  // The soft-back destination — the injected `onExit`, or Ink's program exit
  // for the standalone casting bins (which pass no `onExit`).
  const exitViewer = onExit ?? exit

  const [state, dispatch] = useReducer(flowReducer, undefined, () =>
    initialFlowState(
      flowKind,
      prebuiltSections ?? null,
      prebuiltSavedPath ?? null,
    ),
  )

  // Mid-cast discard confirmation. When an exit is attempted with unsaved
  // progress, the viewer interposes a `<ConfirmModal>` instead of exiting
  // immediately; `confirmingDiscard` records which key path (`back` = Escape,
  // `quit` = Ctrl+C) is waiting on the confirmation. The confirmation lives
  // here, inside the viewer — only the viewer knows its own flow progress.
  const [confirmingDiscard, setConfirmingDiscard] = useState<DiscardPath>(null)

  // The `?` help overlay (manual flow only, for now). Orthogonal UI state — not
  // a flow mode — so it lives here, not in the reducer. While open, the viewer
  // renders the full-screen `<HelpOverlay>` in place of `<ConsultationReadout>`.
  const [helpOpen, setHelpOpen] = useState(false)
  // The current manual cast's draft, lifted out of `<ManualCastingPrompt>` so
  // opening help (which unmounts the readout subtree) doesn't lose in-progress
  // typing. Re-seeded into the prompt as `initialDraft` on remount.
  const manualDraftRef = useRef<ManualDraft | null>(null)

  // Manual flow's Ctrl+R rewind. Gated to `mode === 'casting' && flowKind
  // === 'manual'` so it never fires for interactive/random. One pure dispatch
  // resets both the slot pointer AND the per-line algorithm (`lineState`) in
  // the reducer — there is no imperative ref to reset first (the old
  // ref-before-dispatch ordering is gone). See spec § "Ctrl+R handler
  // location" and the `lineRewound` reducer tests.
  useInput(
    (input, key) => {
      if (key.ctrl && input === 'r') {
        dispatch({ type: 'lineRewound' })
        return
      }
      // `?` opens the manual help overlay. Closing is owned by the overlay's
      // own `useInput`; this handler is gated off (`!helpOpen`) while it's up.
      if (input === '?') {
        setHelpOpen(true)
      }
    },
    {
      isActive:
        state.mode === 'casting' && state.flowKind === 'manual' && !helpOpen,
    },
  )

  // The current cast's selectable range. The interactive/manual flows derive
  // it from the reducer's `lineState` (the single owner of the per-line
  // algorithm); the random flow reads it straight from the predetermined plan
  // (`SplitRecord.max`, which equals what `lineState` would derive).
  const currentMax =
    state.castingPlan === null
      ? recordedMaxFor(state.lineState)
      : state.castingPlan.casting[state.lineIndex][state.castIndex].max

  // The reachable pick ceiling — one below the recorded `SplitRecord.max`.
  // `currentMax` (= stalks - 1) already reserves the right heap's suspended
  // stalk (掛一); reserving a SECOND stalk here keeps a countable stalk on the
  // right after the suspension, so its remainder is always 1..4, never 0 (a
  // heap divisible by four counts its last group as the remainder). The slider
  // cursor / typed input are capped at this value, while `currentMax` is still
  // RECORDED (so the `Stalks` readout and conservation are unchanged) and the
  // true stalk count `currentMax + 1` is passed to the prompt as `stalksTotal`.
  // The random flow's plan picks are likewise ≤ this ceiling (see
  // `splitStalksRandomly`), so the slider auto-land target is always reachable.
  // The rule lives in `@hexagram/core` — see `selectablePickMax`.
  const reachablePickMax = selectablePickMax(currentMax)

  // The random flow's per-cast slider auto-land config — the RNG-chosen pick
  // as the target plus the ceremonial bounce arm delay. `null` for the
  // interactive flow, which commits on SPACE.
  //
  // Memoized so its object identity is stable across the slider's ticks. Each
  // tick triggers a viewer re-render; without this memo a fresh object literal
  // would be created every render, defeating `BouncingSliderStore.setRange`'s
  // reference-equality guard and restarting the `setInterval` once per tick
  // (effective tick rate → `tickMs + renderTime`). Keyed on the plan plus the
  // current slot so the identity only changes when the auto-land target does.
  const castingAutoLand: SliderAutoLand | null = useMemo(
    () =>
      state.castingPlan === null
        ? null
        : {
            target:
              state.castingPlan.casting[state.lineIndex][state.castIndex].pick,
            armDelayMs: castBounceMs,
          },
    [state.castingPlan, state.lineIndex, state.castIndex, castBounceMs],
  )

  // Build the `splitCommitted` action for the random flow's current slot — the
  // plan's pick for this slot. The reducer derives `max` and the resolved line
  // itself via `performCast`. Shared by the slider's `onSubmit` and the number
  // mode's per-cast timer. Caller must guarantee a non-null plan.
  const randomSplitAction = (plan: CastingPlan): FlowAction => ({
    type: 'splitCommitted',
    pick: plan.casting[state.lineIndex][state.castIndex].pick,
  })

  // The casting prompt's `onSubmit`. Both flows dispatch `splitCommitted` with
  // a single `pick` — the reducer (the per-line algorithm's sole owner) runs
  // `performCast` and derives `max` + the resolved line. The interactive/manual
  // flows pass the user's pick; the random flow reads the plan's pick (the
  // slider auto-land hands back that same pick anyway).
  const handleCastSubmit = (pick: number): void => {
    if (state.castingPlan === null) {
      dispatch({ type: 'splitCommitted', pick })
      return
    }
    dispatch(randomSplitAction(state.castingPlan))
  }

  // SPACE-to-skip during random playback. The slider routes SPACE here (via
  // `<CastingPromptBox onSkip>`) instead of advancing one cast; the reducer's
  // pure `playbackSkipped` action fills the partial casting record and
  // completed lines from the already-generated plan and jumps to `computing`.
  // Wired only for the random flow — the `onSkip` prop is `undefined` for the
  // interactive flow (no auto-land), so its SPACE keeps committing the pick.
  const handleSkipPlayback = (): void => {
    dispatch({ type: 'playbackSkipped' })
  }

  // ── Exit handlers — gated by `hasUnsavedCastProgress` ───────────────────
  // Escape (soft back): with unsaved progress, open the discard confirm on
  // the `back` path; otherwise route straight to the injected `onExit`.
  const handleExitAttempt = (): void => {
    if (hasUnsavedCastProgress(state)) {
      setConfirmingDiscard('back')
    } else {
      exitViewer()
    }
  }
  // Ctrl+C (hard quit): with unsaved progress, open the discard confirm on
  // the `quit` path; otherwise quit the program outright.
  const handleHardQuitAttempt = (): void => {
    if (hasUnsavedCastProgress(state)) {
      setConfirmingDiscard('quit')
    } else {
      exit()
    }
  }

  // The compute effect builds the consultation sections and persists the
  // reading to disk. Fires exactly once per `mode === 'computing'`
  // transition. Both flows reach `computing` with `completedLines` /
  // `partialCasting` fully populated — the interactive flow fills them via
  // the line generator, the random flow by playing its plan back cast-by-cast
  // — so `computing` is identical for both.
  useEffect(() => {
    if (state.mode !== 'computing') return
    let cancelled = false
    const runCompute = async (): Promise<void> => {
      try {
        assertIsHexagram(state.completedLines)
        assertIsCastingRecord(state.partialCasting)
        const hexagram: Hexagram = state.completedLines
        const casting: CastingRecord = state.partialCasting
        const sections = buildConsultationSections(
          state.query,
          hexagram,
          casting,
        )
        const savedPath = await saveConsultationFile({
          query: state.query,
          hexagram,
          casting,
        })
        if (!cancelled)
          dispatch({ type: 'computeSucceeded', sections, savedPath })
      } catch (error) {
        if (!cancelled)
          dispatch({
            type: 'computeFailed',
            error: error instanceof Error ? error : new Error(String(error)),
          })
      }
    }
    runCompute().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [state.mode, state.query, state.completedLines, state.partialCasting])

  // Whether this render is the random flow playing back in number-input mode
  // — the accessibility / non-colour fallback. In this mode the above-footer
  // slot shows the plain-text `<CastingStatus>` widget instead of the typed
  // `<NumberInput>` prompt, and a per-cast timer (below) drives the eighteen
  // `splitCommitted`s. The slider mode and the interactive flow are unaffected.
  const isNumberRandomPlayback =
    state.flowKind === 'random' && inputMode === 'number'

  // ── Number-mode random reveal timer ─────────────────────────────────────
  // The text-reveal pacing timer. Side effect → it lives here in the
  // imperative shell, not in the pure reducer. While the random flow is
  // mid-`casting` in number mode, it schedules ONE `setTimeout` per cast slot
  // (the effect's `lineIndex`/`castIndex` deps re-arm it for the next slot
  // after each advance) that dispatches `splitCommitted` with the plan-derived
  // payload. It is suspended while the discard-confirm modal is open — the
  // reveal must not advance behind the modal — and cleared on unmount, so no
  // timer leaks and no cast double-fires.
  useEffect(() => {
    if (!isNumberRandomPlayback) return
    if (state.mode !== 'casting') return
    if (confirmingDiscard !== null) return
    if (state.castingPlan === null) return
    const plan = state.castingPlan
    const timer = setTimeout(() => {
      dispatch(randomSplitAction(plan))
    }, castRevealMs)
    return () => {
      clearTimeout(timer)
    }
    // The effect captures a `plan` snapshot at the top of its run, so the
    // scheduled callback always reads the plan that was current when the timer
    // was armed — never a stale or later closure. `randomSplitAction` is a
    // fresh closure each render, but it closes only over `state.lineIndex`,
    // `state.castIndex`, and `state.castingPlan` (via `plan.casting[...]` /
    // `plan.hexagram[...]`) — all three are already in the deps below, so the
    // listed deps capture every input that changes the scheduled action.
    // Re-adding `randomSplitAction` itself would be redundant churn. The
    // cleanup clears any pending timeout before the next slot's is armed.
    // oxlint-disable-next-line exhaustive-deps
  }, [
    isNumberRandomPlayback,
    state.mode,
    state.lineIndex,
    state.castIndex,
    state.castingPlan,
    confirmingDiscard,
    castRevealMs,
  ])

  // ── Section selection ───────────────────────────────────────────────────

  // Once `done`, the sections come from the completed flow; while the flow
  // is running, the casting table is re-rendered from the partial record
  // (the other tabs are locked away anyway).
  const effectiveSections: ConsultationSections =
    state.mode === 'done'
      ? (state.sections ?? EMPTY_SECTIONS)
      : (() => {
          const partial = buildPartialCastingSections(
            state.query.length > 0 ? state.query : state.queryBuffer,
            state.partialCasting,
          )
          return {
            query: partial.query,
            casting: partial.casting,
            transformation: '',
            standing: '',
            emerging: null,
          }
        })()

  const locked = state.mode !== 'done'

  const queryContent =
    state.mode === 'awaitingQuery' ? state.queryBuffer : state.query

  // ── Query slot — editable while awaiting, frozen once submitted ──────────

  // Query-submit handler. The random flow generates its casting plan HERE, in
  // the imperative shell — `generateRandomConsultation()`'s `crypto.randomInt`
  // is the only randomness source and must stay out of the pure reducer. The
  // plan rides along as the `querySubmit` action payload; the reducer just
  // stores it. The interactive flow carries no plan.
  const handleQuerySubmit = (): void => {
    if (state.flowKind === 'random') {
      const plan = generateRandomConsultation()
      dispatch({ type: 'querySubmit', plan })
    } else {
      dispatch({ type: 'querySubmit' })
    }
  }

  const querySlot = (innerCols: number): ReactElement =>
    state.mode === 'awaitingQuery' ? (
      <QueryEditor
        value={state.queryBuffer}
        focused
        placeholder="Enter your query for the oracle."
        width={innerCols}
        onChange={(next) => dispatch({ type: 'queryChange', value: next })}
        onSubmit={handleQuerySubmit}
      />
    ) : (
      <QueryBox query={state.query} width={innerCols} />
    )

  // ── Casting prompt slot (above-footer) ──────────────────────────────────

  const lineNumber = (state.lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6
  // Auto-follow scroll: while casting, pin the just-completed line's row near
  // the bottom of the Casting table so the row being cast stays visible even
  // when the prompt box (especially the tall manual one) shrinks the table
  // viewport. Anchoring the just-completed line (rather than the active one)
  // keeps a line on screen through its third cast — that cast fills the cell
  // and advances the line pointer in the same update, so pinning the new
  // active line would scroll the just-filled result off before it's seen.
  const autoScrollTarget =
    state.mode === 'casting'
      ? {
          row: castingTableFollowRow(state.lineIndex),
          align: 'bottom' as const,
        }
      : null
  // Casting prompt box height — sourced from the component so a new input
  // mode can't drift the reserved vertical space out of sync with what the
  // component actually renders. The number-mode random reveal shows the
  // `<CastingStatus>` widget instead of a prompt, so it reserves that
  // widget's own height.
  const castingPromptHeight = ((): number => {
    if (state.mode !== 'casting') return 0
    if (isNumberRandomPlayback) return getCastingStatusHeight()
    return getCastingPromptHeight(
      inputMode,
      state.error !== null,
      state.flowKind,
    )
  })()

  // Intrinsic content width of the casting prompt box (inside its border) —
  // drives the `<` / `>` pan during the slider-mode casting flow.
  const castingPromptContentWidth =
    state.mode === 'casting' && inputMode === 'slider'
      ? Math.max(
          // Match the title `<SliderCastingPrompt>` actually renders for the
          // active flow — the random flow (`castingPlan !== null`) uses the
          // shorter "parting the stalks" title, so sizing the pan with the
          // interactive SPACE title would over-reserve ~13 columns. Built via
          // the shared `sliderPromptTitle` helper so this measurement can
          // never drift from the string the component renders.
          terminalWidth(
            sliderPromptTitle(
              lineNumber,
              state.castIndex,
              state.castingPlan !== null,
            ),
          ),
          reachablePickMax + 2, // bar = reachable cells + 2 (▕ + cells + ▏)
          // Readout below the bar is
          // `Stalks: <currentMax + 1> | Left Heap: <cell> | Right Heap: <cell> + 1 suspended`,
          // where each heap cell renders at a stable 2-column width —
          // leading-space + glyph during ticking, padStart(2) on the numeric
          // pick after commit. `Stalks` shows the true stalk count
          // `currentMax + 1` (the slider's `stalksTotal`), and the right heap
          // carries the trailing `+ 1 suspended`. Width is therefore a pure
          // function of `currentMax`; two 2-digit placeholders model the
          // post-commit form exactly.
          terminalWidth(
            `Stalks: ${currentMax + 1} | Left Heap: 99 | Right Heap: 99 + 1 suspended`,
          ),
        )
      : 0

  // The casting-prompt pan is suspended while the discard modal is open — the
  // slot then hosts the modal, not the pannable prompt box.
  const castingPromptPan: CastingPromptPan | undefined =
    state.mode === 'casting' && confirmingDiscard === null
      ? {
          contentWidth: castingPromptContentWidth,
          // Reset the pan whenever a new cast begins so the next cast's bar
          // is visible from the start.
          resetToken: `${state.lineIndex}.${state.castIndex}`,
        }
      : undefined

  // ── Discard-confirm modal slot ──────────────────────────────────────────
  // When `confirmingDiscard` is set, the above-footer slot renders the
  // `<ConfirmModal>` (it is visible across `awaitingQuery` / `casting` /
  // `computing`). On confirm the slot routes per path — `back` → the injected
  // `onExit`, `quit` → a hard program quit; on cancel it just clears the
  // confirmation. `<ConfirmModal>` owns its own `useInput`, so the readout's
  // keymap is frozen via `inputSuppressed` while the modal is open.
  const discardModalSlot = (innerCols: number): ReactElement => (
    <ConfirmModal
      title="Discard this consultation?"
      bodyLines={[
        'The cast in progress has not been saved.',
        {
          // Ctrl+C always hard-quits. Esc routes to the host's exit — the
          // standalone bins quit, so both keys read "quit"; the composed
          // app's Esc returns to its Home menu (`exitLabel` is the
          // destination noun, e.g. "Home").
          text:
            confirmingDiscard === 'back' && exitLabel !== 'quit'
              ? `Confirming will discard it and return to ${exitLabel}.`
              : 'Confirming will discard it and quit.',
          tone: 'alert',
        },
      ]}
      prompt="Press Y to discard · N to keep casting"
      innerCols={innerCols}
      onConfirm={() => {
        const path = confirmingDiscard
        setConfirmingDiscard(null)
        if (path === 'quit') exit()
        else exitViewer()
      }}
      onCancel={() => {
        setConfirmingDiscard(null)
      }}
    />
  )

  const castingPromptSlot = (
    innerCols: number,
    horizontalOffset: number,
  ): ReactElement => (
    <CastingPromptBox
      key={`${lineNumber}-${state.castIndex}`}
      lineNumber={lineNumber}
      castIndex={state.castIndex}
      min={1}
      max={reachablePickMax}
      stalksTotal={currentMax + 1}
      buffer={state.castingBuffer}
      error={state.error}
      width={innerCols}
      inputMode={inputMode}
      flowKind={state.flowKind}
      manualRevealMs={manualRevealMs}
      unpartedStalks={currentMax + 1}
      // Mid-casting `state.lineState` is always advanceable (the reducer resets
      // to initialLineState after each line; a line in flight is 0th/1st/2nd
      // cast), so this assert never narrows away a real '3rd-cast'. Same
      // narrowing `recordedMaxFor(state.lineState)` above relies on.
      lineState={state.lineState as AdvanceableLineState}
      tickMs={deriveTickMs(sliderSweepMs, reachablePickMax)}
      commitRevealMs={sliderCommitRevealMs}
      horizontalOffset={horizontalOffset}
      autoLand={castingAutoLand}
      onSkip={castingAutoLand === null ? undefined : handleSkipPlayback}
      onChange={(value) => dispatch({ type: 'castingBufferChange', value })}
      onSubmit={handleCastSubmit}
      onError={(message) => dispatch({ type: 'castingError', message })}
      onReady={
        state.flowKind === 'manual' ? onManualPromptReady : onSliderReady
      }
      onFocusedFieldChange={
        state.flowKind === 'manual' ? onManualFocusedFieldChange : undefined
      }
      initialDraft={manualDraftRef.current ?? undefined}
      onDraftChange={(draft) => {
        manualDraftRef.current = draft
      }}
    />
  )

  // Number-mode random reveal slot — the plain-text `<CastingStatus>` widget.
  // It replaces the typed `<NumberInput>` prompt: the random flow takes no
  // casting input, the per-cast timer drives the advance, and SPACE (caught
  // by the widget's own `useInput`) skips the reveal. Its `useInput` is gated
  // off while the discard modal is open so the modal owns the keyboard.
  const castingStatusSlot = (innerCols: number): ReactElement => (
    <CastingStatus
      key={`${lineNumber}-${state.castIndex}`}
      lineNumber={lineNumber}
      castIndex={state.castIndex}
      width={innerCols}
      active={confirmingDiscard === null}
      onSkip={handleSkipPlayback}
      onReady={onCastingStatusReady}
    />
  )

  // The casting widget shown during `casting` — the number-mode random reveal
  // swaps the typed prompt for the text status widget; every other casting
  // configuration keeps the `<CastingPromptBox>`.
  const castingCastingSlot = isNumberRandomPlayback
    ? castingStatusSlot
    : castingPromptSlot
  // The above-footer slot hosts the discard modal when one is open, otherwise
  // the casting widget during `casting`, otherwise nothing.
  const castingSlotOrNothing =
    state.mode === 'casting' ? castingCastingSlot : undefined
  const aboveFooterSlot =
    confirmingDiscard === null ? castingSlotOrNothing : discardModalSlot

  // Slot height tracks whichever content the slot is showing.
  const aboveFooterHeight =
    confirmingDiscard === null ? castingPromptHeight : DISCARD_MODAL_HEIGHT

  // ── Footer-bottom flow hint ─────────────────────────────────────────────

  const flowHint = (() => {
    if (state.mode === 'awaitingQuery')
      return 'Type your query and press Enter.'
    if (state.mode === 'casting')
      return renderProgressBar(state.lineIndex * 3 + state.castIndex, 18)
    if (state.mode === 'computing')
      return state.saveError === null
        ? 'Saving consultation…'
        : `Save failed: ${state.saveError.message}`
    return null
  })()

  const readoutTitle = `Consultation · ${state.flowKind}`

  // The `?` help overlay takes over the whole screen. Rendering it in place of
  // the readout unmounts the casting prompt — its in-progress draft survives
  // via `manualDraftRef` (re-seeded as `initialDraft` when the prompt remounts
  // on close). The flow state machine lives in this component, so it is
  // untouched by the readout subtree coming and going.
  if (helpOpen) {
    return (
      <HelpOverlay
        title={MANUAL_GUIDE_TITLE}
        lines={MANUAL_GUIDE_LINES}
        footerHint="↑↓ scroll · PgUp/PgDn page · g/G ends · ? or Esc close"
        onClose={() => {
          setHelpOpen(false)
        }}
      />
    )
  }

  return (
    <ConsultationReadout
      sections={effectiveSections}
      locked={locked}
      savedPath={state.savedPath ?? prebuiltSavedPath ?? ''}
      maxWrapWidth={maxWrapWidth}
      querySlot={querySlot}
      queryText={queryContent}
      dimContent={state.mode === 'awaitingQuery'}
      aboveFooterSlot={aboveFooterSlot}
      aboveFooterHeight={aboveFooterHeight}
      castingPromptPan={castingPromptPan}
      flowHint={flowHint}
      flowKeyHints={
        state.mode === 'casting'
          ? // `keyHintsForCasting` already advertises Enter + Tab/Shift+Tab +
            // Esc + Ctrl+C for the manual flow (and the random/interactive
            // equivalents for those flows). The viewer only appends
            // `· Ctrl+R rewind line` once there's a completed cast to rewind,
            // since that gate depends on viewer state the hint helper can't see.
            (() => {
              const base = keyHintsForCasting(
                inputMode,
                exitLabel,
                state.flowKind,
              )
              if (state.flowKind !== 'manual') return base
              const showRewind = state.lineIndex > 0 || state.castIndex > 0
              const withRewind = showRewind
                ? `${base}   · Ctrl+R rewind line`
                : base
              return `${withRewind}   · ?: help`
            })()
          : keyHintsFlowDefault(exitLabel)
      }
      inputMode={inputMode}
      autoScrollTarget={autoScrollTarget}
      title={readoutTitle}
      onExit={handleExitAttempt}
      onHardQuit={handleHardQuitAttempt}
      inputSuppressed={confirmingDiscard !== null}
    />
  )
}

/**
 * Render the consultation as a full-screen, tabbed Ink viewer and resolve
 * once the user exits. Uses the alternate screen buffer so the terminal's
 * prior contents are restored on exit.
 *
 * Two call shapes:
 *   - `runConsultationViewer({ flowKind, inputMode, maxWrapWidth, sliderSweepMs, castBounceMs, castRevealMs, sliderCommitRevealMs })` —
 *     production: the viewer owns the flow (collects the query and 18 picks
 *     in-tab).
 *   - `runConsultationViewer(sections, savedPath, maxWrapWidth)` —
 *     back-compat for callers that already built everything (currently
 *     just tests).
 */
export async function runConsultationViewer(
  argsOrSections:
    | {
        flowKind: FlowKind
        inputMode?: InputMode
        maxWrapWidth?: number
        sliderSweepMs?: number
        castBounceMs?: number
        castRevealMs?: number
        sliderCommitRevealMs?: number
        manualRevealMs?: number
      }
    | ConsultationSections,
  maybeSavedPath?: string,
  maybeMaxWrapWidth?: number,
): Promise<void> {
  const instance: Instance =
    'flowKind' in argsOrSections
      ? render(
          <ConsultationViewer
            flowKind={argsOrSections.flowKind}
            inputMode={argsOrSections.inputMode}
            maxWrapWidth={argsOrSections.maxWrapWidth}
            sliderSweepMs={argsOrSections.sliderSweepMs}
            castBounceMs={argsOrSections.castBounceMs}
            castRevealMs={argsOrSections.castRevealMs}
            sliderCommitRevealMs={argsOrSections.sliderCommitRevealMs}
            manualRevealMs={argsOrSections.manualRevealMs}
          />,
          { alternateScreen: true },
        )
      : render(
          <ConsultationViewer
            sections={argsOrSections}
            savedPath={maybeSavedPath ?? ''}
            maxWrapWidth={maybeMaxWrapWidth}
          />,
          { alternateScreen: true },
        )
  await instance.waitUntilExit()
}

/**
 * Thin convenience wrapper over `runConsultationViewer` for the
 * `hexagram-manual` bin and composed-shell menu entry. Pinned to
 * `flowKind: 'manual'`, `inputMode: 'number'` (the manual prompt is its own
 * branch — `inputMode` is moot, but `'number'` keeps any downstream input-
 * mode probes consistent). `--wrap-width` is the only knob exposed to the
 * bin; tests can also pass `manualRevealMs: 0` to bypass the reveal dwell.
 */
export function runManualConsultationViewer(opts: {
  maxWrapWidth?: number
  manualRevealMs?: number
}): Promise<void> {
  return runConsultationViewer({
    flowKind: 'manual',
    inputMode: 'number',
    maxWrapWidth: opts.maxWrapWidth,
    manualRevealMs: opts.manualRevealMs,
  })
}
