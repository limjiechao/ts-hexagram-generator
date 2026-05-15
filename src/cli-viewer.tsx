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
import wrapAnsi from 'wrap-ansi'

import { CastingPromptBox, QueryEditor } from './cli-editors.js'
import { DEFAULT_MAX_WRAP_WIDTH } from './cli-utils-mode.js'
import {
  BOLD_GREY,
  buildConsultationSections,
  buildPartialCastingSections,
  consultationConsoleOutput,
  consultationFileOutput,
  NORMAL,
  type ConsultationSections,
} from './cli-utils-output.js'
import { makeLineGenerator, stalksBeforeParting } from './index.js'
import { generateRandomConsultation } from './random.js'
import {
  assertIsCastingRecord,
  assertIsFourOperationsResult,
  assertIsHexagram,
  assertIsLine,
  emptyPartialCastingRecord,
  type CastingRecord,
  type FourOperationsResult,
  type Hexagram,
  type Line,
  type PartialCastingRecord,
  type SplitRecord,
} from './types.js'

type TabId = 'casting' | 'transformation' | 'originating' | 'resultant'

interface TabDescriptor {
  id: TabId
  label: string
}

export type FlowKind = 'interactive' | 'random'
type FlowMode = 'awaitingQuery' | 'casting' | 'computing' | 'done'

interface ConsultationViewerProps {
  // Production callers pass a flowKind; the viewer then owns the entire flow.
  flowKind?: FlowKind
  // Test / pre-built callers pass sections + savedPath; the viewer mounts
  // straight into `done` mode and never runs the flow.
  sections?: ConsultationSections
  savedPath?: string
  maxWrapWidth?: number
}

const TAB_BAR_HEIGHT = 1
const FOOTER_HEIGHT = 2
const QUERY_BORDER_HEIGHT = 2
const ELLIPSIS = '…'

// Widest fixed-width structural line (the transformation tab's side-by-side
// diagram + hexagram-name footer) is ~92 display columns; never wrap content
// below this or the ASCII art shreds. Small margin over the measured worst case.
const MIN_CONTENT_WIDTH = 100

const KEY_HINTS =
  'Tab: switch   ↑↓/PgUp/PgDn: scroll   ←→: pan   g/G: top/bottom   q: quit'
const KEY_HINTS_FLOW = 'Esc/Ctrl+C: quit'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Wrap a pre-formatted ANSI string to `width` columns. `trim: false` keeps the
// existing indentation; `hard: true` breaks words longer than the viewport.
function wrapToWidth(content: string, width: number): string {
  return wrapAnsi(content, Math.max(1, width), { hard: true, trim: false })
}

// Resolve the column width to wrap content at: wrap to fit the terminal but
// never wider than `maxWrapWidth`, and never narrower than the section's
// structural floor — so prose hard-wraps while fixed-width diagrams stay intact.
export function computeWrapWidth(
  cols: number,
  maxWrapWidth: number,
  intrinsicWidth: number,
): number {
  return Math.max(
    Math.min(intrinsicWidth, MIN_CONTENT_WIDTH),
    Math.min(cols, maxWrapWidth),
  )
}

// Truncate `text` to `width` display columns, appending an ellipsis when cut.
// ANSI-aware: embedded SGR codes are preserved and never counted as width.
export function truncateEnd(text: string, width: number): string {
  if (width <= 0) return ''
  if (stringWidth(text) <= width) return text
  return `${sliceAnsi(text, 0, Math.max(0, width - 1))}${ELLIPSIS}`
}

// Truncate `text` to `width` display columns from the right — keeps the tail
// and prefixes an ellipsis, so the saved-path filename (the useful part) always
// survives. ANSI-aware (see truncateEnd).
export function truncateStart(text: string, width: number): string {
  if (width <= 0) return ''
  const total = stringWidth(text)
  if (total <= width) return text
  return `${ELLIPSIS}${sliceAnsi(text, total - Math.max(0, width - 1), total)}`
}

function QueryBox({
  query,
  width,
}: {
  query: string
  width: number
}): ReactElement {
  return (
    <Box borderStyle="round" width={width} flexShrink={0}>
      {/*
        Raw ANSI content: this <Text> (and its ancestors) must carry no color
        props, or Ink would emit its own SGR codes and override the embedded
        ones.
      */}
      <Text>{query}</Text>
    </Box>
  )
}

function TabBar({
  tabs,
  activeIndex,
  cols,
  locked,
}: {
  tabs: TabDescriptor[]
  activeIndex: number
  cols: number
  locked: boolean
}): ReactElement {
  // Each cell renders as ` label ` — two padding spaces around the label.
  const fullRowWidth = tabs.reduce((sum, tab) => sum + tab.label.length + 2, 0)

  // Below the width the full label row needs, collapse to a compact indicator
  // so the tab bar always stays exactly one row tall.
  if (fullRowWidth > cols) {
    const active = tabs[activeIndex]
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse={!locked} dimColor={locked}>
          {` ${active.label} `}
        </Text>
        <Text dimColor>{` (${activeIndex + 1}/${tabs.length})`}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
      {tabs.map((tab, index) => {
        const active = index === activeIndex
        // While the flow is running, non-active tabs are locked. The active
        // tab (always Casting during the flow) stays highlighted but in
        // `dimColor` instead of `inverse` so the locked state reads visually.
        if (locked) {
          return (
            <Text key={tab.id} bold={active} dimColor>
              {` ${tab.label} `}
            </Text>
          )
        }
        return (
          <Text key={tab.id} bold={active} inverse={active} dimColor={!active}>
            {` ${tab.label} `}
          </Text>
        )
      })}
    </Box>
  )
}

function ScrollableSection({
  rows,
  viewportHeight,
}: {
  rows: string[]
  viewportHeight: number
}): ReactElement {
  return (
    <Box height={viewportHeight} flexDirection="column">
      {/* Raw ANSI content — no color props (see QueryBox). */}
      <Text>{rows.join('\n')}</Text>
    </Box>
  )
}

function FooterBar({
  savedPath,
  cols,
  verticalStatus,
  horizontalStatus,
  flowHint,
  inFlow,
}: {
  savedPath: string
  cols: number
  verticalStatus: string | null
  horizontalStatus: string | null
  flowHint: string | null
  inFlow: boolean
}): ReactElement {
  const segments: string[] = []
  if (verticalStatus) segments.push(verticalStatus)
  if (horizontalStatus) segments.push(horizontalStatus)
  segments.push(inFlow ? KEY_HINTS_FLOW : KEY_HINTS)
  const status = truncateEnd(segments.join('   '), cols)
  // During the flow, replace the saved-path line with a one-line progress
  // hint — there's no saved file yet.
  const bottomLineRaw = inFlow
    ? (flowHint ?? '')
    : `Consultation output saved to ${savedPath}.`
  const bottomLine = truncateStart(bottomLineRaw, cols)

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{status}</Text>
      {/* Raw ANSI constants for parity with the plain-mode "saved to" line. */}
      <Text>{`${BOLD_GREY}${bottomLine}${NORMAL}`}</Text>
    </Box>
  )
}

// ── Flow state machine ───────────────────────────────────────────────────────

interface FlowState {
  mode: FlowMode
  flowKind: FlowKind
  query: string
  queryBuffer: string
  castingBuffer: string
  error: string | null
  lineIndex: 0 | 1 | 2 | 3 | 4 | 5
  castIndex: 0 | 1 | 2
  partialCasting: PartialCastingRecord
  completedLines: Line[]
  sections: ConsultationSections | null
  savedPath: string | null
  saveError: Error | null
}

type FlowAction =
  | { type: 'queryChange'; value: string }
  | { type: 'querySubmit' }
  | { type: 'castingBufferChange'; value: string }
  | { type: 'castingError'; message: string | null }
  | { type: 'splitCommitted'; pick: number; max: number; line?: Line }
  | {
      type: 'computeSucceeded'
      sections: ConsultationSections
      savedPath: string
    }
  | { type: 'computeFailed'; error: Error }

function initialFlowState(
  flowKind: FlowKind,
  preBuiltSections: ConsultationSections | null,
  preBuiltSavedPath: string | null,
): FlowState {
  const isDone = preBuiltSections !== null && preBuiltSavedPath !== null
  return {
    mode: isDone ? 'done' : 'awaitingQuery',
    flowKind,
    query: '',
    queryBuffer: '',
    castingBuffer: '',
    error: null,
    lineIndex: 0,
    castIndex: 0,
    partialCasting: emptyPartialCastingRecord(),
    completedLines: [],
    sections: preBuiltSections,
    savedPath: preBuiltSavedPath,
    saveError: null,
  }
}

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'queryChange':
      return { ...state, queryBuffer: action.value }
    case 'querySubmit': {
      if (state.queryBuffer.trim().length === 0) return state
      const query = state.queryBuffer
      // Random skips the casting phase entirely — the picks are generated
      // inside the compute effect.
      return state.flowKind === 'random'
        ? { ...state, query, mode: 'computing' }
        : { ...state, query, mode: 'casting' }
    }
    case 'castingBufferChange':
      return { ...state, castingBuffer: action.value }
    case 'castingError':
      return { ...state, error: action.message }
    case 'splitCommitted': {
      // The split has already been validated by NumberInput and the line
      // generator has been advanced (with the returned Line included when
      // this was the third cast).
      const split: SplitRecord = { pick: action.pick, max: action.max }
      const partialCasting = state.partialCasting.map(
        (line, lineIndex) =>
          (lineIndex === state.lineIndex
            ? line.map((cast, castIndex) =>
                castIndex === state.castIndex ? split : cast,
              )
            : line) as PartialCastingRecord[number],
      ) as PartialCastingRecord
      const completedLines =
        action.line === undefined
          ? state.completedLines
          : [...state.completedLines, action.line]
      // Advance to the next slot. Three casts per line; then the next line.
      const isLastCastOfLine = state.castIndex === 2
      const isLastLine = state.lineIndex === 5
      if (isLastCastOfLine && isLastLine) {
        return {
          ...state,
          mode: 'computing',
          partialCasting,
          completedLines,
          castingBuffer: '',
          error: null,
        }
      }
      const nextLineIndex = (
        isLastCastOfLine ? state.lineIndex + 1 : state.lineIndex
      ) as FlowState['lineIndex']
      const nextCastIndex = (
        isLastCastOfLine ? 0 : state.castIndex + 1
      ) as FlowState['castIndex']
      return {
        ...state,
        partialCasting,
        completedLines,
        lineIndex: nextLineIndex,
        castIndex: nextCastIndex,
        castingBuffer: '',
        error: null,
      }
    }
    case 'computeSucceeded':
      return {
        ...state,
        mode: 'done',
        sections: action.sections,
        savedPath: action.savedPath,
      }
    case 'computeFailed':
      return { ...state, saveError: action.error }
  }
}

// ── ConsultationViewer ───────────────────────────────────────────────────────

const EMPTY_SECTIONS: ConsultationSections = {
  query: '',
  casting: '',
  transformation: '',
  originating: '',
  resultant: null,
}

export function ConsultationViewer({
  flowKind = 'interactive',
  sections: prebuiltSections,
  savedPath: prebuiltSavedPath,
  maxWrapWidth = DEFAULT_MAX_WRAP_WIDTH,
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

  // Per-line generator. Held in a ref so reducer reductions stay pure; we
  // advance it imperatively when the user submits a split and dispatch the
  // resulting `splitCommitted` action with the next slot's `max` and (on the
  // third cast) the returned Line.
  const lineGeneratorRef = useRef<Generator<
    FourOperationsResult,
    Line,
    number
  > | null>(null)
  const currentMaxRef = useRef<number>(stalksBeforeParting.length - 1)

  // (Re)create the generator when the casting phase starts a new line.
  useEffect(() => {
    if (state.mode !== 'casting') return
    if (state.castIndex !== 0) return
    if (lineGeneratorRef.current !== null) return // already initialised for this line
    const generator = makeLineGenerator({
      unpartedStalks: stalksBeforeParting,
      suspendedFromNextRound: [],
      partStalksAtIndex: 1, // placeholder; the real pick goes in via .next(pick) on the 2nd round
    })
    lineGeneratorRef.current = generator
    currentMaxRef.current = stalksBeforeParting.length - 1
  }, [state.mode, state.castIndex, state.lineIndex])

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
    // Fire-and-forget — `runCompute` swallows all errors via the inner catch
    // and converts them into `computeFailed` dispatches; the `.catch(() => {})`
    // satisfies the `no-floating-promises` lint without doubling up reporting.
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

  // Submit a casting split: synchronously advance the line generator,
  // capture the next round's `max` (and the returned Line on the third
  // cast), then dispatch `splitCommitted`.
  const submitSplit = (pick: number): void => {
    if (state.mode !== 'casting') return
    const generator = lineGeneratorRef.current
    if (generator === null) return
    const max = currentMaxRef.current
    if (state.castIndex === 0) {
      // First cast: this `pick` is the seed parted-at index. Drive the
      // generator forward to yield round one's result, then capture the
      // selectable range for round two.
      // Re-create the generator with the real pick (the placeholder ctor
      // above is replaced lazily here on the first split).
      const fresh = makeLineGenerator({
        unpartedStalks: stalksBeforeParting,
        suspendedFromNextRound: [],
        partStalksAtIndex: pick,
      })
      const round1 = fresh.next().value
      assertIsFourOperationsResult(round1)
      lineGeneratorRef.current = fresh
      currentMaxRef.current = round1.unpartedStalks.length - 1
      dispatch({ type: 'splitCommitted', pick, max })
      return
    }
    if (state.castIndex === 1) {
      const round2 = generator.next(pick).value
      assertIsFourOperationsResult(round2)
      currentMaxRef.current = round2.unpartedStalks.length - 1
      dispatch({ type: 'splitCommitted', pick, max })
      return
    }
    // Third cast — pump the final round, then read the returned Line.
    const round3 = generator.next(pick).value
    assertIsFourOperationsResult(round3)
    const { value: line } = generator.next()
    assertIsLine(line)
    lineGeneratorRef.current = null // ready for the next line
    dispatch({ type: 'splitCommitted', pick, max, line })
  }

  // ── Section selection + tab bar ─────────────────────────────────────────

  // While the flow is running we display all four tab slots (even if the
  // resultant won't ultimately appear) — there's no way to know yet. After
  // `done`, the resultant slot is dropped when there are no moving lines.
  const tabs = useMemo<TabDescriptor[]>(() => {
    const base: TabDescriptor[] = [
      { id: 'casting', label: 'Casting' },
      { id: 'transformation', label: 'Transformation' },
      { id: 'originating', label: 'Originating' },
    ]
    if (state.mode !== 'done' || state.sections?.resultant != null) {
      base.push({ id: 'resultant', label: 'Resultant' })
    }
    return base
  }, [state.mode, state.sections])

  // Tab index management. While the flow is running we hold the active tab at
  // Casting (index 0). Once done, the user can navigate.
  const activeIndexRef = useRef(0)
  const [, forceRender] = useReducer((n: number) => n + 1, 0)
  const offsetsRef = useRef<number[]>([])
  const horizontalOffsetsRef = useRef<number[]>([])
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
            originating: '',
            resultant: null,
          }
        })()

  const wrappedQuery = useMemo(
    () => wrapToWidth(effectiveSections.query, cols - 2),
    [effectiveSections.query, cols],
  )
  const queryBoxHeight = wrappedQuery.split('\n').length + QUERY_BORDER_HEIGHT

  // Casting prompt box height: 3 rows + 1 if there's an error to display.
  const castingPromptHeight =
    state.mode === 'casting' ? (state.error === null ? 5 : 6) : 0

  const viewportHeight = Math.max(
    1,
    termRows -
      queryBoxHeight -
      TAB_BAR_HEIGHT -
      castingPromptHeight -
      FOOTER_HEIGHT,
  )

  const activeTab = tabs[activeIndex]
  const activeContent =
    activeTab.id === 'casting'
      ? effectiveSections.casting
      : activeTab.id === 'transformation'
        ? effectiveSections.transformation
        : activeTab.id === 'originating'
          ? effectiveSections.originating
          : (effectiveSections.resultant ?? '')

  const intrinsicWidth = useMemo(
    () =>
      activeContent
        .split('\n')
        .reduce((widest, line) => Math.max(widest, stringWidth(line)), 1),
    [activeContent],
  )
  const wrapWidth = computeWrapWidth(cols, maxWrapWidth, intrinsicWidth)
  const contentRows = useMemo(
    () => wrapToWidth(activeContent, wrapWidth).split('\n'),
    [activeContent, wrapWidth],
  )
  const contentWidth = Math.min(wrapWidth, intrinsicWidth)

  const maxOffset = Math.max(0, contentRows.length - viewportHeight)
  const offset = clamp(offsetsRef.current[activeIndex] ?? 0, 0, maxOffset)
  const canScrollVertically = contentRows.length > viewportHeight

  const maxHorizontalOffset = Math.max(0, contentWidth - cols)
  const horizontalOffset = clamp(
    horizontalOffsetsRef.current[activeIndex] ?? 0,
    0,
    maxHorizontalOffset,
  )
  const canScrollHorizontally = maxHorizontalOffset > 0

  const visibleRows = contentRows
    .slice(offset, offset + viewportHeight)
    .map((row) => sliceAnsi(row, horizontalOffset, horizontalOffset + cols))

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
  const stepToTab = (delta: number): void => {
    activeIndexRef.current =
      (activeIndexRef.current + delta + tabs.length) % tabs.length
    forceRender()
  }

  // Global input handler. Always handles Escape and Ctrl+C → exit. Reads
  // `q`/Tab/arrows etc. ONLY when the flow is done — otherwise the editors
  // own the keyboard.
  useInput((input, key) => {
    if (key.escape) {
      exit()
      return
    }
    if (key.ctrl && input === 'c') {
      exit()
      return
    }
    if (state.mode !== 'done') return // editors handle other keys
    if (input === 'q') {
      exit()
      return
    }
    if (key.tab && key.shift) {
      stepToTab(-1)
      return
    }
    if (key.tab || input === ']') {
      stepToTab(1)
      return
    }
    if (input === '[') {
      stepToTab(-1)
      return
    }
    if (key.leftArrow) {
      panActiveBy(key.shift ? -(cols - 1) : -1)
      return
    }
    if (key.rightArrow) {
      panActiveBy(key.shift ? cols - 1 : 1)
      return
    }
    if (key.upArrow) {
      scrollActiveBy(-1)
      return
    }
    if (key.downArrow) {
      scrollActiveBy(1)
      return
    }
    if (key.pageUp) {
      scrollActiveBy(-(viewportHeight - 1))
      return
    }
    if (key.pageDown) {
      scrollActiveBy(viewportHeight - 1)
      return
    }
    if (key.home || input === 'g') {
      scrollActiveTo(0)
      return
    }
    if (key.end || input === 'G') {
      scrollActiveTo(maxOffset)
    }
  })

  const verticalStatus = canScrollVertically
    ? `▲ ${offset + 1}–${Math.min(offset + viewportHeight, contentRows.length)} of ${contentRows.length} ▼`
    : null
  const horizontalStatus = canScrollHorizontally
    ? `◀ ${horizontalOffset + 1}–${Math.min(horizontalOffset + cols, contentWidth)} of ${contentWidth} ▶`
    : null

  // Flow progress hint shown on the bottom line during the flow.
  const flowHint = (() => {
    if (state.mode === 'awaitingQuery')
      return 'Type your query and press Enter.'
    if (state.mode === 'casting')
      return `Casting in progress · Line ${state.lineIndex + 1}/6 · Cast ${state.castIndex + 1}/3`
    if (state.mode === 'computing')
      return state.saveError === null
        ? 'Saving consultation…'
        : `Save failed: ${state.saveError.message}`
    return null
  })()

  const lineNumber = (state.lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6
  const currentMax = currentMaxRef.current

  return (
    <Box flexDirection="column" width={cols} height={termRows}>
      {state.mode === 'awaitingQuery' ? (
        <QueryEditor
          value={state.queryBuffer}
          focused
          placeholder="Enter your query for the oracle."
          width={cols}
          onChange={(next) => dispatch({ type: 'queryChange', value: next })}
          onSubmit={() => dispatch({ type: 'querySubmit' })}
        />
      ) : (
        <QueryBox query={wrappedQuery} width={cols} />
      )}
      <TabBar
        tabs={tabs}
        activeIndex={activeIndex}
        cols={cols}
        locked={state.mode !== 'done'}
      />
      <Box flexGrow={1} flexShrink={1} flexDirection="column" overflow="hidden">
        <ScrollableSection rows={visibleRows} viewportHeight={viewportHeight} />
      </Box>
      {state.mode === 'casting' && (
        <CastingPromptBox
          lineNumber={lineNumber}
          castIndex={state.castIndex}
          min={1}
          max={currentMax}
          buffer={state.castingBuffer}
          error={state.error}
          width={cols}
          onChange={(value) => dispatch({ type: 'castingBufferChange', value })}
          onSubmit={(parsed) => submitSplit(parsed)}
          onError={(message) => dispatch({ type: 'castingError', message })}
        />
      )}
      <FooterBar
        savedPath={state.savedPath ?? prebuiltSavedPath ?? ''}
        cols={cols}
        verticalStatus={verticalStatus}
        horizontalStatus={horizontalStatus}
        flowHint={flowHint}
        inFlow={state.mode !== 'done'}
      />
    </Box>
  )
}

/**
 * Render the consultation as a full-screen, tabbed Ink viewer and resolve once
 * the user exits. Uses the alternate screen buffer so the terminal's prior
 * contents are restored on exit.
 *
 * Two call shapes:
 *   - `runConsultationViewer({ flowKind, maxWrapWidth })` — production: the
 *     viewer owns the flow (collects the query and 18 picks in-tab).
 *   - `runConsultationViewer(sections, savedPath, maxWrapWidth)` — back-compat
 *     for callers that already built everything (currently just tests).
 */
export async function runConsultationViewer(
  argsOrSections:
    | { flowKind: FlowKind; maxWrapWidth?: number }
    | ConsultationSections,
  maybeSavedPath?: string,
  maybeMaxWrapWidth?: number,
): Promise<void> {
  let instance: Instance
  if ('flowKind' in argsOrSections) {
    instance = render(
      <ConsultationViewer
        flowKind={argsOrSections.flowKind}
        maxWrapWidth={argsOrSections.maxWrapWidth}
      />,
      { alternateScreen: true },
    )
  } else {
    instance = render(
      <ConsultationViewer
        sections={argsOrSections}
        savedPath={maybeSavedPath ?? ''}
        maxWrapWidth={maybeMaxWrapWidth}
      />,
      { alternateScreen: true },
    )
  }
  await instance.waitUntilExit()
}
