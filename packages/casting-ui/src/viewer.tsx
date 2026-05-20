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
  ConsultationReadout,
  KEY_HINTS_FLOW_DEFAULT,
  keyHintsForCasting,
  QueryBox,
  renderProgressBar,
  type CastingPromptPan,
  type ConsultationSections,
} from '@hexagram/viewer-core'
import { render, type Instance } from 'ink'
import { useEffect, useReducer, type ReactElement } from 'react'
import stringWidth from 'string-width'

import {
  CastingPromptBox,
  getCastingPromptHeight,
  SLIDER_COMMIT_REVEAL_MS,
} from './casting-prompt-box.js'
import { QueryEditor } from './query-editor.js'
import { useLineGenerator } from './use-line-generator.js'
import {
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
  // How long the slider's post-SPACE numeric reveal holds before the cast
  // commits upstream. Forwarded to `<CastingPromptBox commitRevealMs>`;
  // tests pass `0` to bypass the dwell.
  sliderCommitRevealMs?: number
}

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
  sliderCommitRevealMs = SLIDER_COMMIT_REVEAL_MS,
}: ConsultationViewerProps): ReactElement {
  const [state, dispatch] = useReducer(flowReducer, undefined, () =>
    initialFlowState(
      flowKind,
      prebuiltSections ?? null,
      prebuiltSavedPath ?? null,
    ),
  )

  const { submitSplit, currentMax } = useLineGenerator(state, dispatch)

  // The compute effect derives the hexagram + casting (for random) and
  // persists the consultation to disk. Fires exactly once per
  // `mode === 'computing'` transition.
  useEffect(() => {
    if (state.mode !== 'computing') return
    let cancelled = false
    const runCompute = async (): Promise<void> => {
      try {
        let hexagram: Hexagram
        let casting: CastingRecord
        if (state.flowKind === 'random') {
          const result = generateRandomConsultation()
          hexagram = result.hexagram
          casting = result.casting
        } else {
          assertIsHexagram(state.completedLines)
          assertIsCastingRecord(state.partialCasting)
          hexagram = state.completedLines
          casting = state.partialCasting
        }
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
  }, [
    state.mode,
    state.flowKind,
    state.query,
    state.completedLines,
    state.partialCasting,
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

  const querySlot = (innerCols: number): ReactElement =>
    state.mode === 'awaitingQuery' ? (
      <QueryEditor
        value={state.queryBuffer}
        focused
        placeholder="Enter your query for the oracle."
        width={innerCols}
        onChange={(next) => dispatch({ type: 'queryChange', value: next })}
        onSubmit={() => dispatch({ type: 'querySubmit' })}
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

  const castingPromptPan: CastingPromptPan | undefined =
    state.mode === 'casting'
      ? {
          contentWidth: castingPromptContentWidth,
          // Reset the pan whenever a new cast begins so the next cast's bar
          // is visible from the start.
          resetToken: `${state.lineIndex}.${state.castIndex}`,
        }
      : undefined

  const aboveFooterSlot =
    state.mode === 'casting'
      ? (innerCols: number, horizontalOffset: number): ReactElement => (
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
            onChange={(value) =>
              dispatch({ type: 'castingBufferChange', value })
            }
            onSubmit={(parsed) => submitSplit(parsed)}
            onError={(message) => dispatch({ type: 'castingError', message })}
          />
        )
      : undefined

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
      aboveFooterHeight={castingPromptHeight}
      castingPromptPan={castingPromptPan}
      flowHint={flowHint}
      flowKeyHints={
        state.mode === 'casting'
          ? keyHintsForCasting(inputMode)
          : KEY_HINTS_FLOW_DEFAULT
      }
      inputMode={inputMode}
    />
  )
}

/**
 * Render the consultation as a full-screen, tabbed Ink viewer and resolve
 * once the user exits. Uses the alternate screen buffer so the terminal's
 * prior contents are restored on exit.
 *
 * Two call shapes:
 *   - `runConsultationViewer({ flowKind, inputMode, maxWrapWidth, sliderSweepMs, sliderCommitRevealMs })` —
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
