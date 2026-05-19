import { generateRandomConsultation } from '@hexagram/core/random'
import {
  assertIsCastingRecord,
  assertIsHexagram,
  type CastingRecord,
  type Hexagram,
} from '@hexagram/types'
import {
  Box,
  render,
  Text,
  useApp,
  useInput,
  useWindowSize,
  type Instance,
} from 'ink'
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactElement,
} from 'react'
import sliceAnsi from 'slice-ansi'
import stringWidth from 'string-width'

import {
  CastingPromptBox,
  getCastingPromptHeight,
  SLIDER_COMMIT_REVEAL_MS,
} from './casting-prompt-box.js'
import {
  buildConsultationSections,
  buildPartialCastingSections,
  consultationConsoleOutput,
  type ConsultationSections,
} from './output-composers.js'
import { consultationFileOutput } from './output-file.js'
import { BOLD_GREY, NORMAL } from './output-palette.js'
import { QueryEditor } from './query-editor.js'
import { useLineGenerator } from './use-line-generator.js'
import {
  DEFAULT_MAX_WRAP_WIDTH,
  DEFAULT_SLIDER_SWEEP_MS,
  deriveTickMs,
  type InputMode,
} from './utils-mode.js'
import {
  FooterBar,
  KEY_HINTS_FLOW_DEFAULT,
  keyHintsForCasting,
  QueryBox,
  ScrollableSection,
  ScrollbarTrack,
  TabBar,
  type NonEmpty,
  type TabDescriptor,
} from './viewer-chrome.js'
import {
  EMPTY_SECTIONS,
  flowReducer,
  initialFlowState,
  type FlowKind,
} from './viewer-flow.js'
import { dispatchKey, type KeyContext } from './viewer-keymap.js'
import {
  clamp,
  computeWrapWidth,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  MARGIN_CONTENT_TO_NEXT,
  MARGIN_QUERY_TO_TABS,
  QUERY_BORDER_HEIGHT,
  renderProgressBar,
  stripAnsi,
  TAB_BAR_HEIGHT,
  wrapToWidth,
} from './viewer-layout.js'

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

export function ConsultationViewer({
  flowKind = 'interactive',
  inputMode = 'slider',
  sections: prebuiltSections,
  savedPath: prebuiltSavedPath,
  maxWrapWidth = DEFAULT_MAX_WRAP_WIDTH,
  sliderSweepMs = DEFAULT_SLIDER_SWEEP_MS,
  sliderCommitRevealMs = SLIDER_COMMIT_REVEAL_MS,
}: ConsultationViewerProps): ReactElement {
  const { exit } = useApp()
  const { columns, rows: windowRows } = useWindowSize()
  const cols = columns || 80
  const termRows = windowRows || 24

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
        const plainOutput = consultationConsoleOutput(
          state.query,
          hexagram,
          casting,
        )
        const savedPath = await consultationFileOutput(plainOutput)
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

  // ── Section selection + tab bar ─────────────────────────────────────────

  // While the flow is running we don't yet know whether emerging will exist
  // — show Transformation optimistically; the locked tab bar hides every
  // non-active tab anyway. Once `done`, Transformation + Emerging Hexagram are
  // dropped whenever there are no moving lines.
  const tabs = useMemo<NonEmpty<TabDescriptor>>(() => {
    const hasMovingLines =
      state.mode !== 'done' || state.sections?.emerging != null
    // Seed with the always-present Casting tab so the result is provably
    // non-empty under noUncheckedIndexedAccess.
    const result: [TabDescriptor, ...TabDescriptor[]] = [
      { id: 'casting', label: 'Casting', wrapMode: 'never' },
    ]
    if (hasMovingLines) {
      result.push({
        id: 'transformation',
        label: 'Transformation',
        wrapMode: 'never',
      })
    }
    result.push({
      id: 'standing',
      label: 'Standing Hexagram',
      wrapMode: 'wrap',
    })
    if (hasMovingLines) {
      result.push({
        id: 'emerging',
        label: 'Emerging Hexagram',
        wrapMode: 'wrap',
      })
    }
    return result
  }, [state.mode, state.sections])

  // Tab index management. While the flow is running we hold the active tab at
  // Casting (index 0). Once done, the user can navigate.
  const activeIndexRef = useRef(0)
  const [, forceRender] = useReducer((n: number) => n + 1, 0)
  const offsetsRef = useRef<number[]>([])
  const horizontalOffsetsRef = useRef<number[]>([])
  // Horizontal pan offset for the casting prompt box itself (separate from
  // the active tab's content pan). Slider-mode content can overflow narrow
  // terminals — ←/→ during the casting flow pans this box. Reset to 0
  // whenever a new cast begins (lineIndex/castIndex change) so the next
  // cast's bar is visible from the start.
  const castingHorizontalOffsetRef = useRef<number>(0)
  const lastCastSlotRef = useRef<string>('')
  if (state.mode === 'casting') {
    const slot = `${state.lineIndex}.${state.castIndex}`
    if (lastCastSlotRef.current !== slot) {
      castingHorizontalOffsetRef.current = 0
      lastCastSlotRef.current = slot
    }
  } else {
    lastCastSlotRef.current = ''
    castingHorizontalOffsetRef.current = 0
  }
  // Resize the per-tab offset arrays when the tabs array changes.
  if (offsetsRef.current.length !== tabs.length) {
    offsetsRef.current = tabs.map((_, index) => offsetsRef.current[index] ?? 0)
    horizontalOffsetsRef.current = tabs.map(
      (_, index) => horizontalOffsetsRef.current[index] ?? 0,
    )
  }
  // Clamp active index whenever tabs shrink.
  if (activeIndexRef.current >= tabs.length) {
    activeIndexRef.current = 0
  }
  const activeIndex = activeIndexRef.current

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

  // Inner content width: terminal cols minus paddingX (2) and the scrollbar
  // gutter (1). Every downstream width parameter routes through this so the
  // chrome never collides with the gutter or padding.
  const innerCols = Math.max(1, cols - 2 - 1)

  const queryContent =
    state.mode === 'awaitingQuery' ? state.queryBuffer : state.query
  const wrappedQuery = useMemo(
    () =>
      wrapToWidth(
        queryContent.length === 0 ? ' ' : queryContent,
        Math.max(1, innerCols - 2),
      ),
    [queryContent, innerCols],
  )
  const queryBoxHeight = wrappedQuery.split('\n').length + QUERY_BORDER_HEIGHT

  // Casting prompt box height — sourced from the component so a new input
  // mode can't drift the reserved vertical space out of sync with what the
  // component actually renders. See `getCastingPromptHeight` in
  // `casting-prompt-box.tsx`.
  const castingPromptHeight =
    state.mode === 'casting'
      ? getCastingPromptHeight(inputMode, state.error !== null)
      : 0

  const viewportHeight = Math.max(
    1,
    termRows -
      HEADER_HEIGHT -
      queryBoxHeight -
      MARGIN_QUERY_TO_TABS -
      TAB_BAR_HEIGHT -
      castingPromptHeight -
      MARGIN_CONTENT_TO_NEXT -
      FOOTER_HEIGHT,
  )

  // `activeIndex` was clamped against `tabs.length`, but
  // noUncheckedIndexedAccess still types `tabs[activeIndex]` as `T |
  // undefined`. `tabs[0]` is provably defined (NonEmpty type), so it's the
  // safe fallback.
  const activeTab = tabs[activeIndex] ?? tabs[0]
  const activeContent: string = {
    casting: effectiveSections.casting,
    transformation: effectiveSections.transformation,
    standing: effectiveSections.standing,
    emerging: effectiveSections.emerging ?? '',
  }[activeTab.id]

  const intrinsicWidth = useMemo(
    () =>
      Math.max(
        1,
        ...activeContent.split('\n').map((line) => stringWidth(line)),
      ),
    [activeContent],
  )
  const wrapWidth =
    activeTab.wrapMode === 'never'
      ? intrinsicWidth
      : computeWrapWidth(innerCols, maxWrapWidth, intrinsicWidth)
  const contentRows = useMemo(
    () => wrapToWidth(activeContent, wrapWidth).split('\n'),
    [activeContent, wrapWidth],
  )
  const contentWidth = Math.min(wrapWidth, intrinsicWidth)

  // Scrollable breathers: prepend + append a blank row so the first / last
  // line never butt against the tab bar or the footer when scrolled to the
  // extremes. All offset / slice maths run against `rowsWithBreathers`.
  const rowsWithBreathers = useMemo(
    () => ['', ...contentRows, ''],
    [contentRows],
  )
  const totalRows = rowsWithBreathers.length

  const maxOffset = Math.max(0, totalRows - viewportHeight)
  const offset = clamp(offsetsRef.current[activeIndex] ?? 0, 0, maxOffset)
  const canScrollVertically = totalRows > viewportHeight

  const maxHorizontalOffset = Math.max(0, contentWidth - innerCols)
  const horizontalOffset = clamp(
    horizontalOffsetsRef.current[activeIndex] ?? 0,
    0,
    maxHorizontalOffset,
  )
  const canScrollHorizontally = maxHorizontalOffset > 0

  const visibleRows = rowsWithBreathers
    .slice(offset, offset + viewportHeight)
    .map((row) =>
      sliceAnsi(row, horizontalOffset, horizontalOffset + innerCols),
    )

  const scrollActiveBy = (delta: number): void => {
    offsetsRef.current[activeIndex] = clamp(
      (offsetsRef.current[activeIndex] ?? 0) + delta,
      0,
      maxOffset,
    )
    forceRender()
  }
  const scrollActiveTo = (target: number): void => {
    offsetsRef.current[activeIndex] = clamp(target, 0, maxOffset)
    forceRender()
  }
  const panActiveBy = (delta: number): void => {
    horizontalOffsetsRef.current[activeIndex] = clamp(
      (horizontalOffsetsRef.current[activeIndex] ?? 0) + delta,
      0,
      maxHorizontalOffset,
    )
    forceRender()
  }
  const panCastingPromptBy = (delta: number, ceiling: number): void => {
    castingHorizontalOffsetRef.current = clamp(
      castingHorizontalOffsetRef.current + delta,
      0,
      ceiling,
    )
    forceRender()
  }
  const stepToTab = (delta: number): void => {
    activeIndexRef.current =
      (activeIndexRef.current + delta + tabs.length) % tabs.length
    forceRender()
  }
  const jumpToTab = (index: number): void => {
    if (index >= 0 && index < tabs.length) {
      activeIndexRef.current = index
      forceRender()
    }
  }

  // Intrinsic content width of the casting prompt box (inside its border).
  // Used to drive ←/→ pan during the slider-mode casting flow; the box
  // itself stays at `innerCols` so it never reflows.
  const lineNumber = (state.lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6
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
          // commit (see `<SliderCastingPrompt>`). Width is therefore a pure
          // function of `currentMax`; two 2-digit placeholders model the
          // post-commit form exactly.
          stringWidth(`Stalks: ${currentMax} | Left Heap: 99 | Right Heap: 99`),
        )
      : 0
  const castingInnerWidth = Math.max(1, innerCols - 2) // subtract round border
  const maxCastingHorizontalOffset = Math.max(
    0,
    castingPromptContentWidth - castingInnerWidth,
  )
  const castingHorizontalOffset = clamp(
    castingHorizontalOffsetRef.current,
    0,
    maxCastingHorizontalOffset,
  )
  // Keep the ref clamped so future deltas accumulate from a valid value.
  if (castingHorizontalOffsetRef.current !== castingHorizontalOffset) {
    castingHorizontalOffsetRef.current = castingHorizontalOffset
  }

  // Global input handler. Always handles Escape and Ctrl+C → exit. During
  // the casting flow, ←/→ pan the casting prompt box (slider-mode only,
  // matches the main viewport's panning convention); everything else is
  // owned by the editor. After the flow is done, the full done-mode binding
  // set applies. `q` is intentionally NOT a quit shortcut anymore; the only
  // exits are Esc and Ctrl+C.
  //
  // The dispatch table lives in `viewer-keymap.ts` (a pure module);
  // here we just assemble the per-frame `KeyContext` and delegate. Each
  // pan / scroll closure clamps internally against its current ceiling, so
  // the bindings can stay maths-free.
  useInput((input, key) => {
    const ctx: KeyContext = {
      state,
      inputMode,
      viewportHeight,
      exit,
      panCastingPromptBy: (delta) =>
        panCastingPromptBy(delta, maxCastingHorizontalOffset),
      panCastingPromptByPage: (delta) =>
        panCastingPromptBy(
          delta * (castingInnerWidth - 1),
          maxCastingHorizontalOffset,
        ),
      stepToTab,
      jumpToTab,
      panActiveBy,
      panActiveByPage: (delta) => panActiveBy(delta * (innerCols - 1)),
      scrollActiveBy,
      scrollActiveTo,
    }
    dispatchKey(input, key, ctx)
  })

  const verticalStatus = canScrollVertically
    ? `▲ ${offset + 1}–${Math.min(offset + viewportHeight, totalRows)} of ${totalRows} ▼`
    : null
  const horizontalStatus = canScrollHorizontally
    ? `◀ ${horizontalOffset + 1}–${Math.min(horizontalOffset + innerCols, contentWidth)} of ${contentWidth} ▶`
    : null

  // Wrap-width chip: only show when the active tab actually wraps AND the
  // wrap is biting (i.e. wrapping below the section's intrinsic width).
  const wrapChip =
    activeTab.wrapMode === 'wrap' && wrapWidth < intrinsicWidth
      ? `wrap ${wrapWidth}`
      : null

  // Flow progress hint shown on the bottom line during the flow.
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
    <Box flexDirection="column" paddingX={1} width={cols} height={termRows}>
      <Text>{`${BOLD_GREY}QUERY:${NORMAL}`}</Text>
      {state.mode === 'awaitingQuery' ? (
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
      )}
      <Box marginTop={MARGIN_QUERY_TO_TABS} flexShrink={0}>
        <TabBar
          tabs={tabs}
          activeIndex={activeIndex}
          cols={innerCols}
          locked={state.mode !== 'done'}
        />
      </Box>
      <Box flexGrow={1} flexShrink={1} flexDirection="row" overflow="hidden">
        <Box flexDirection="column" flexGrow={1}>
          {state.mode === 'awaitingQuery' ? (
            // Dim the placeholder casting table while the user is still
            // typing the query. Embedded SGR codes inside the partial output
            // would cancel Ink's `[2m` mid-stream, so strip them first.
            <Box height={viewportHeight} flexDirection="column">
              <Text dimColor>{stripAnsi(visibleRows.join('\n'))}</Text>
            </Box>
          ) : (
            <ScrollableSection
              rows={visibleRows}
              viewportHeight={viewportHeight}
            />
          )}
        </Box>
        <Box width={1} flexShrink={0}>
          <ScrollbarTrack
            offset={offset}
            totalRows={totalRows}
            viewportHeight={viewportHeight}
          />
        </Box>
      </Box>
      {state.mode === 'casting' && (
        <Box marginTop={MARGIN_CONTENT_TO_NEXT} flexShrink={0}>
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
            horizontalOffset={castingHorizontalOffset}
            onChange={(value) =>
              dispatch({ type: 'castingBufferChange', value })
            }
            onSubmit={(parsed) => submitSplit(parsed)}
            onError={(message) => dispatch({ type: 'castingError', message })}
          />
        </Box>
      )}
      <Box
        marginTop={state.mode === 'casting' ? 0 : MARGIN_CONTENT_TO_NEXT}
        flexShrink={0}
      >
        <FooterBar
          savedPath={state.savedPath ?? prebuiltSavedPath ?? ''}
          cols={innerCols}
          verticalStatus={verticalStatus}
          horizontalStatus={horizontalStatus}
          wrapChip={wrapChip}
          flowHint={flowHint}
          inFlow={state.mode !== 'done'}
          flowKeyHints={
            state.mode === 'casting'
              ? keyHintsForCasting(inputMode)
              : KEY_HINTS_FLOW_DEFAULT
          }
          tabsLength={tabs.length}
        />
      </Box>
    </Box>
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
