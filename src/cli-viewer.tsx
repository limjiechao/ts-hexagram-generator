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
import { DEFAULT_MAX_WRAP_WIDTH, type InputMode } from './cli-utils-mode.js'
import {
  buildConsultationSections,
  buildPartialCastingSections,
  consultationConsoleOutput,
  type ConsultationSections,
} from './cli-output-composers.js'
import { consultationFileOutput } from './cli-output-file.js'
import { BOLD_GREY, NORMAL } from './cli-output-palette.js'
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
  wrapMode: 'wrap' | 'never'
}

// Used by TabBar / the activeTab lookup. The viewer always has at least the
// `casting` tab, so encoding non-emptiness in the type lets `tabs[0]` serve
// as a safe fallback for the activeIndex lookup under noUncheckedIndexedAccess.
type NonEmpty<T> = readonly [T, ...T[]]

export type FlowKind = 'interactive' | 'random'
type FlowMode = 'awaitingQuery' | 'casting' | 'computing' | 'done'

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
}

const TAB_BAR_HEIGHT = 1
const FOOTER_HEIGHT = 2
const QUERY_BORDER_HEIGHT = 2
const ELLIPSIS = '…'

// Widest fixed-width structural line (the transformation tab's side-by-side
// diagram + hexagram-name footer) is ~92 display columns; never wrap content
// below this or the ASCII art shreds. Small margin over the measured worst case.
const MIN_CONTENT_WIDTH = 100

const KEY_HINTS_TEMPLATE = (n: number): string =>
  `Tab/1-${n}: switch   ↑↓/PgUp/PgDn: scroll   ←→: pan   g/G: top/bottom   Esc/Ctrl+C: quit`

// Footer key hints during the casting phase. The slider's load-bearing key
// is SPACE — without surfacing it here the prompt is undiscoverable. Number
// mode advertises Enter for parity with the in-tab prompt label. ←/→ is the
// horizontal-pan binding the viewer registers when slider content overflows.
function keyHintsForCasting(inputMode: InputMode): string {
  return inputMode === 'slider'
    ? 'SPACE: part   ←→: pan   Esc/Ctrl+C: quit'
    : 'Enter: commit   Esc/Ctrl+C: quit'
}
const KEY_HINTS_FLOW_DEFAULT = 'Esc/Ctrl+C: quit'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// 18 splits total (6 lines × 3 casts). Footer shows casting progress as
// `Casting in progress ·  ■■■□□□…  N/18` to give a glanceable sense of flow
// completion. Filled and empty squares read as discrete units (one per cast)
// and stay legible across the fonts users are likely to have.
function renderProgressBar(completed: number, total: number): string {
  const filled = '■'.repeat(completed)
  const empty = '□'.repeat(total - completed)
  return `Casting in progress ·  ${filled}${empty}  ${completed}/${total}`
}

// Ink's <Text dimColor> wraps its child in [2m…[22m, but embedded [0m
// resets inside the rendered content clear the dim mid-string — the
// result is a sea of mixed-intensity rows. Strip every SGR code from
// the placeholder rows before handing them to Ink, so the entire region
// reads as uniformly dim.
// oxlint-disable-next-line no-control-regex
const ANSI_PATTERN: RegExp = /\[[0-9;]*m/g
function stripAnsi(text: string): string {
  return text.replaceAll(ANSI_PATTERN, '')
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
      <Text>{` ${query}`}</Text>
    </Box>
  )
}

function TabBar({
  tabs,
  activeIndex,
  cols,
  locked,
}: {
  tabs: NonEmpty<TabDescriptor>
  activeIndex: number
  cols: number
  locked: boolean
}): ReactElement {
  // `activeIndex` is clamped against `tabs.length` upstream, but
  // noUncheckedIndexedAccess still types `tabs[activeIndex]` as `T |
  // undefined`. `tabs[0]` is provably defined (NonEmpty), so it's the safe
  // fallback when the clamp races with a tab-list shrink.
  const activeTab = tabs[activeIndex] ?? tabs[0]

  // Flow in progress: only the active tab shows, rendered with the same
  // bold+inverse styling as done-mode — there's no agency to switch tabs.
  if (locked) {
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse>{` ${activeTab.label} `}</Text>
      </Box>
    )
  }

  // Done mode: all tabs visible, dim ` · ` separator between them.
  // Each cell renders as ` label ` (label.length + 2); separators add 3 cols.
  const renderedWidth = tabs.reduce(
    (sum, t, i) => sum + t.label.length + 2 + (i > 0 ? 3 : 0),
    0,
  )
  if (renderedWidth > cols) {
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse>{` ${activeTab.label} `}</Text>
        <Text dimColor>{` (${activeIndex + 1}/${tabs.length})`}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
      {tabs.flatMap((tab, index) => {
        const active = index === activeIndex
        const cells: ReactElement[] = [
          <Text key={tab.id} bold={active} inverse={active} dimColor={!active}>
            {` ${tab.label} `}
          </Text>,
        ]
        if (index < tabs.length - 1) {
          cells.push(
            <Text key={`sep-${tab.id}`} dimColor>
              {' · '}
            </Text>,
          )
        }
        return cells
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

// 1-column vertical scrollbar gutter. When content overflows the viewport,
// renders a proportional `█` handle over a `░` track; otherwise reserves the
// column with whitespace so chrome above/below doesn't shift when overflow
// state toggles.
function ScrollbarTrack({
  offset,
  totalRows,
  viewportHeight,
}: {
  offset: number
  totalRows: number
  viewportHeight: number
}): ReactElement {
  if (totalRows <= viewportHeight) {
    return (
      <Text>
        {Array.from({ length: viewportHeight }, () => ' ').join('\n')}
      </Text>
    )
  }
  const handleHeight = Math.max(
    1,
    Math.floor((viewportHeight * viewportHeight) / totalRows),
  )
  const handleTop = Math.floor(
    (offset * (viewportHeight - handleHeight)) /
      Math.max(1, totalRows - viewportHeight),
  )
  const chars: string[] = []
  for (let i = 0; i < viewportHeight; i += 1) {
    chars.push(i >= handleTop && i < handleTop + handleHeight ? '█' : '░')
  }
  return <Text dimColor>{chars.join('\n')}</Text>
}

function FooterBar({
  savedPath,
  cols,
  verticalStatus,
  horizontalStatus,
  wrapChip,
  flowHint,
  inFlow,
  flowKeyHints,
  tabsLength,
}: {
  savedPath: string
  cols: number
  verticalStatus: string | null
  horizontalStatus: string | null
  wrapChip: string | null
  flowHint: string | null
  inFlow: boolean
  flowKeyHints: string
  tabsLength: number
}): ReactElement {
  const segments: string[] = []
  if (verticalStatus) segments.push(verticalStatus)
  if (horizontalStatus) segments.push(horizontalStatus)
  if (wrapChip) segments.push(wrapChip)
  segments.push(inFlow ? flowKeyHints : KEY_HINTS_TEMPLATE(tabsLength))
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

// Recover the user's plain query text from a pre-built `querySection()`
// output of the shape `${BOLD_GREY}QUERY:\n\n  ${BOLD_WHITE}<query>`. Strip
// every SGR code, trim the leading `QUERY:` label + blank line, and return
// the body. Used only on the test-mode `prebuiltSections` entry path so
// the locked QueryBox (which now reads `state.query` directly per R1) has
// something to display.
function extractQueryText(querySection: string): string {
  const stripped = querySection.replaceAll(ANSI_PATTERN, '')
  const lines = stripped.split('\n')
  const queryLine = lines.at(-1) ?? ''
  return queryLine.trim()
}

function initialFlowState(
  flowKind: FlowKind,
  preBuiltSections: ConsultationSections | null,
  preBuiltSavedPath: string | null,
): FlowState {
  const isDone = preBuiltSections !== null && preBuiltSavedPath !== null
  return {
    mode: isDone ? 'done' : 'awaitingQuery',
    flowKind,
    query:
      preBuiltSections === null ? '' : extractQueryText(preBuiltSections.query),
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
  inputMode = 'slider',
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
    // Reset the displayed max synchronously so the immediate re-render shows
    // the new line's first-cast range (1..48) instead of the stale third-cast
    // max from this line. The line-boundary `useEffect` below will idempotently
    // confirm the same value when it (re-)creates the placeholder generator,
    // but that effect fires only after render — too late on its own.
    currentMaxRef.current = stalksBeforeParting.length - 1
    dispatch({ type: 'splitCommitted', pick, max, line })
  }

  // ── Section selection + tab bar ─────────────────────────────────────────

  // While the flow is running we don't yet know whether resultant will exist
  // — show Transformation optimistically; the locked tab bar (T3.3) hides
  // every non-active tab anyway. Once `done`, Transformation + Resultant are
  // dropped whenever there are no moving lines.
  const tabs = useMemo<NonEmpty<TabDescriptor>>(() => {
    const hasMovingLines =
      state.mode !== 'done' || state.sections?.resultant != null
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
    result.push({ id: 'originating', label: 'Originating', wrapMode: 'wrap' })
    if (hasMovingLines) {
      result.push({ id: 'resultant', label: 'Resultant', wrapMode: 'wrap' })
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
            originating: '',
            resultant: null,
          }
        })()

  // Inner content width: terminal cols minus paddingX (2) and the scrollbar
  // gutter (1). Every downstream width parameter routes through this so the
  // chrome never collides with the gutter or padding.
  const innerCols = Math.max(1, cols - 2 - 1)

  const HEADER_HEIGHT = 1
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

  // Casting prompt box height (border 2 + content rows):
  //   slider mode → 3 content rows (title + bar + readout) → 5 total
  //   number mode → 2 content rows + optional error → 5 normally, 6 with error
  const castingPromptHeight =
    state.mode === 'casting'
      ? inputMode === 'slider'
        ? 5
        : state.error === null
          ? 5
          : 6
      : 0

  // Permanent layout gaps: 1 row between QueryBox and TabBar, and 1 row
  // between either the content/prompt block and the footer (the gap collapses
  // into the prompt's own marginTop when casting is active).
  const MARGIN_QUERY_TO_TABS = 1
  const MARGIN_CONTENT_TO_NEXT = 1

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

  // Intrinsic content width of the casting prompt box (inside its border).
  // Used to drive ←/→ pan during the slider-mode casting flow; the box
  // itself stays at `innerCols` so it never reflows.
  const lineNumber = (state.lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6
  const currentMax = currentMaxRef.current
  const castingPromptContentWidth =
    state.mode === 'casting' && inputMode === 'slider'
      ? Math.max(
          stringWidth(
            `Line ${lineNumber}/6 · Cast ${state.castIndex + 1}/3: — Press SPACE to part the stalks`,
          ),
          currentMax + 2, // bar = max + 2 (▕ + cells + ▏)
          stringWidth(`pick: ${currentMax} / ${currentMax}`),
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
  // set applies. `q` is intentionally NOT a quit shortcut anymore (T3.8);
  // the only exits are Esc and Ctrl+C.
  useInput((input, key) => {
    if (key.escape) {
      exit()
      return
    }
    if (key.ctrl && input === 'c') {
      exit()
      return
    }
    // Casting flow: pan the prompt box horizontally if it overflows.
    if (state.mode === 'casting' && inputMode === 'slider') {
      if (key.leftArrow) {
        panCastingPromptBy(
          key.shift ? -(castingInnerWidth - 1) : -1,
          maxCastingHorizontalOffset,
        )
        return
      }
      if (key.rightArrow) {
        panCastingPromptBy(
          key.shift ? castingInnerWidth - 1 : 1,
          maxCastingHorizontalOffset,
        )
        return
      }
    }
    if (state.mode !== 'done') return // editors handle other keys
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
    // Digit shortcuts 1-9 jump to that tab index (1-indexed). Range is
    // defensive against future tab additions; the < tabs.length check gates.
    if (input >= '1' && input <= '9') {
      const target = Number.parseInt(input, 10) - 1
      if (target >= 0 && target < tabs.length) {
        activeIndexRef.current = target
        forceRender()
        return
      }
    }
    if (key.leftArrow) {
      panActiveBy(key.shift ? -(innerCols - 1) : -1)
      return
    }
    if (key.rightArrow) {
      panActiveBy(key.shift ? innerCols - 1 : 1)
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
            // T3.7 — dim the placeholder casting table while the user is still
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
            lineNumber={lineNumber}
            castIndex={state.castIndex}
            min={1}
            max={currentMax}
            buffer={state.castingBuffer}
            error={state.error}
            width={innerCols}
            inputMode={inputMode}
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
 * Render the consultation as a full-screen, tabbed Ink viewer and resolve once
 * the user exits. Uses the alternate screen buffer so the terminal's prior
 * contents are restored on exit.
 *
 * Two call shapes:
 *   - `runConsultationViewer({ flowKind, inputMode, maxWrapWidth })` —
 *     production: the viewer owns the flow (collects the query and 18 picks
 *     in-tab).
 *   - `runConsultationViewer(sections, savedPath, maxWrapWidth)` — back-compat
 *     for callers that already built everything (currently just tests).
 */
export async function runConsultationViewer(
  argsOrSections:
    | { flowKind: FlowKind; inputMode?: InputMode; maxWrapWidth?: number }
    | ConsultationSections,
  maybeSavedPath?: string,
  maybeMaxWrapWidth?: number,
): Promise<void> {
  let instance: Instance
  if ('flowKind' in argsOrSections) {
    instance = render(
      <ConsultationViewer
        flowKind={argsOrSections.flowKind}
        inputMode={argsOrSections.inputMode}
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
