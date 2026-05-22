import { saveConsultationFile } from '@hexagram/consultation-file/file'
import { generateRandomConsultation } from '@hexagram/core/random'
import {
  assertIsCastingRecord,
  assertIsHexagram,
  type CastingRecord,
  type Hexagram,
} from '@hexagram/types'
import {
  buildConsultationSections,
  buildPartialCastingSections,
  ConfirmModal,
  ConsultationReadout,
  keyHintsFlowDefault,
  keyHintsForCasting,
  QueryBox,
  renderProgressBar,
  type CastingPromptPan,
  type ConsultationSections,
} from '@hexagram/viewer-core'
import { render, useApp, type Instance } from 'ink'
import { useEffect, useReducer, useState, type ReactElement } from 'react'
import stringWidth from 'string-width'

import {
  CastingPromptBox,
  getCastingPromptHeight,
  SLIDER_COMMIT_REVEAL_MS,
  type SliderAutoLand,
} from './casting-prompt-box.js'
import { hasUnsavedCastProgress } from './has-unsaved-cast-progress.js'
import { QueryEditor } from './query-editor.js'
import { useLineGenerator } from './use-line-generator.js'
import {
  DEFAULT_CAST_BOUNCE_MS,
  DEFAULT_MAX_WRAP_WIDTH,
  DEFAULT_SLIDER_SWEEP_MS,
  deriveTickMs,
  type InputMode,
} from './utils-mode.js'
import {
  EMPTY_SECTIONS,
  flowReducer,
  initialFlowState,
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
  sliderCommitRevealMs = SLIDER_COMMIT_REVEAL_MS,
  onExit,
  exitLabel = 'quit',
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

  // The interactive line generator — drives the interactive casting flow.
  // The random flow never consults `submitSplit`/`interactiveMax`; it reads
  // its picks and selectable ranges straight from `state.castingPlan`. The
  // hook is still called unconditionally (Rules of Hooks); for a random flow
  // its `submitSplit` is simply never invoked.
  const { submitSplit, currentMax: interactiveMax } = useLineGenerator(
    state,
    dispatch,
  )

  // The current cast's selectable range. For the interactive flow it comes
  // from the line generator; for the random flow it is read straight from the
  // predetermined plan (`SplitRecord.max`).
  const currentMax =
    state.castingPlan === null
      ? interactiveMax
      : state.castingPlan.casting[state.lineIndex][state.castIndex].max

  // The random flow's per-cast slider auto-land config — the RNG-chosen pick
  // as the target plus the ceremonial bounce arm delay. `null` for the
  // interactive flow, which commits on SPACE.
  const castingAutoLand: SliderAutoLand | null =
    state.castingPlan === null
      ? null
      : {
          target:
            state.castingPlan.casting[state.lineIndex][state.castIndex].pick,
          armDelayMs: castBounceMs,
        }

  // The casting prompt's `onSubmit`. For the interactive flow it threads
  // through the line generator (`submitSplit`); for the random flow the pick
  // is already known from the plan, so it dispatches `splitCommitted`
  // directly — with the plan's resolved hexagram line on the third cast.
  const handleCastSubmit = (pick: number): void => {
    if (state.castingPlan === null) {
      submitSplit(pick)
      return
    }
    const { max } = state.castingPlan.casting[state.lineIndex][state.castIndex]
    const line =
      state.castIndex === 2
        ? state.castingPlan.hexagram[state.lineIndex]
        : undefined
    dispatch({ type: 'splitCommitted', pick, max, line })
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
  // Casting prompt box height — sourced from the component so a new input
  // mode can't drift the reserved vertical space out of sync with what the
  // component actually renders.
  const castingPromptHeight =
    state.mode === 'casting'
      ? getCastingPromptHeight(inputMode, state.error !== null)
      : 0

  // Intrinsic content width of the casting prompt box (inside its border) —
  // drives the ←/→ pan during the slider-mode casting flow.
  const castingPromptContentWidth =
    state.mode === 'casting' && inputMode === 'slider'
      ? Math.max(
          stringWidth(
            `Line ${lineNumber}/6 · Cast ${state.castIndex + 1}/3: — Press SPACE to part the stalks`,
          ),
          currentMax + 2, // bar = max + 2 (▕ + cells + ▏)
          // Readout below the bar is
          // `Stalks: <max> | Left Heap: <cell> | Right Heap: <cell>`, where
          // each heap cell renders at a stable 2-column width — leading-space
          // + glyph during ticking, padStart(2) on the numeric pick after
          // commit. Width is therefore a pure function of `currentMax`; two
          // 2-digit placeholders model the post-commit form exactly.
          stringWidth(`Stalks: ${currentMax} | Left Heap: 99 | Right Heap: 99`),
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
      max={currentMax}
      buffer={state.castingBuffer}
      error={state.error}
      width={innerCols}
      inputMode={inputMode}
      tickMs={deriveTickMs(sliderSweepMs, currentMax)}
      commitRevealMs={sliderCommitRevealMs}
      horizontalOffset={horizontalOffset}
      autoLand={castingAutoLand}
      onChange={(value) => dispatch({ type: 'castingBufferChange', value })}
      onSubmit={handleCastSubmit}
      onError={(message) => dispatch({ type: 'castingError', message })}
    />
  )

  // The above-footer slot hosts the discard modal when one is open, otherwise
  // the casting prompt box during `casting`, otherwise nothing.
  const castingSlotOrNothing =
    state.mode === 'casting' ? castingPromptSlot : undefined
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
          ? keyHintsForCasting(inputMode, exitLabel)
          : keyHintsFlowDefault(exitLabel)
      }
      inputMode={inputMode}
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
 *   - `runConsultationViewer({ flowKind, inputMode, maxWrapWidth, sliderSweepMs, castBounceMs, sliderCommitRevealMs })` —
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
        sliderCommitRevealMs?: number
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
            sliderCommitRevealMs={argsOrSections.sliderCommitRevealMs}
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
