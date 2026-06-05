import {
  BOLD_GREY,
  clamp,
  computeInnerCols,
  computeWrapWidth,
  dispatchKey,
  FOOTER_HEIGHT,
  FooterBar,
  HEADER_HEIGHT,
  KEY_HINTS_FLOW_DEFAULT,
  MARGIN_CONTENT_TO_NEXT,
  MARGIN_HEADER_TO_QUERY,
  MARGIN_QUERY_TO_TABS,
  NORMAL,
  QUERY_ACCENT_PREFIX_WIDTH,
  QUERY_BORDER_HEIGHT,
  ScreenShell,
  ScrollableSection,
  ScrollbarTrack,
  stripAnsi,
  TAB_BAR_HEIGHT,
  TabBar,
  terminalWidth,
  wrapToWidth,
  type InputMode,
  type KeyContext,
  type NonEmpty,
  type TabDescriptor,
} from '@hexagram/viewer-core'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react'
import sliceAnsi from 'slice-ansi'

import { computeAutoScrollOffset } from './auto-scroll-offset.js'
import type { ConsultationSections } from './output-composers.js'

// `<ConsultationReadout>` — the generic tabbed, scrollable consultation
// readout shell. It owns the chrome (tab bar, scroll/pan state, footer) and
// nothing else: the consultation flow lives in `casting-ui`'s
// `<ConsultationViewer>`, which drives the flow state machine and injects the
// flow-specific widgets through this component's slots.
//
// Slots (both render-props, so the caller's widgets size themselves off the
// readout's single source of truth for `innerCols`):
//   - `querySlot(innerCols)` — the editable-or-read-only query box. The caller
//     renders a `<QueryEditor>` while awaiting the query and a `<QueryBox>`
//     once frozen.
//   - `aboveFooterSlot(innerCols, horizontalOffset)` — an optional region
//     between the scrollable content and the footer, used by the casting flow
//     for the `<CastingPromptBox>`. It receives the resolved horizontal pan
//     offset so the casting prompt box can pan on narrow terminals without
//     reflowing.
//
// `locked` collapses the tab bar to the active tab only and disables tab
// navigation — the casting flow passes `true` while the flow is in progress.

/**
 * Casting-prompt pan wiring. When the above-footer slot hosts content wider
 * than the terminal (the slider-mode casting prompt on a narrow terminal),
 * the readout owns a horizontal pan offset for it; `<` / `>` pan it via the
 * keymap. `contentWidth` is the slot content's intrinsic display width.
 */
export interface CastingPromptPan {
  /** Intrinsic display width of the above-footer slot's content. */
  readonly contentWidth: number
  /**
   * Resets the pan offset to 0 whenever this token changes — the caller
   * passes a per-cast identity string so each new cast starts unpanned.
   */
  readonly resetToken: string
}

export interface ConsultationReadoutProps {
  /** The per-tab section strings to render. */
  readonly sections: ConsultationSections
  /**
   * When true, the tab bar collapses to the active tab and tab navigation is
   * disabled. The casting flow passes `true` while the flow is in progress.
   */
  readonly locked: boolean
  /**
   * Footer-bottom path shown once the consultation is saved. Empty while a
   * flow is still in progress (the footer then shows `flowHint` instead).
   */
  readonly savedPath: string
  /** Cap on the content wrap width for wrapping tabs. */
  readonly maxWrapWidth: number
  /**
   * The query box slot — editable or read-only, rendered above the tabs.
   * A render-prop: receives the readout's `innerCols` so the widget sizes
   * itself off the readout's single source of truth.
   */
  readonly querySlot: (innerCols: number) => ReactNode
  /**
   * Raw query text, used only to size the query box's reserved height so the
   * layout doesn't jump between the editable and frozen query renders.
   */
  readonly queryText: string
  /**
   * When true, the placeholder content area is rendered with `dimColor`
   * (used while the query is still being typed).
   */
  readonly dimContent?: boolean
  /**
   * Optional above-footer slot (the casting prompt box). Receives the
   * readout's `innerCols` and the resolved horizontal pan offset.
   */
  readonly aboveFooterSlot?: (
    innerCols: number,
    horizontalOffset: number,
  ) => ReactNode
  /** Reserved height for the above-footer slot. 0 when absent. */
  readonly aboveFooterHeight?: number
  /** Casting-prompt pan wiring; omit when there is no pannable slot. */
  readonly castingPromptPan?: CastingPromptPan
  /**
   * Auto-follow scroll target for the active (Casting) tab during a casting
   * flow. `row` is in content-row space (the casting section's own rows, before
   * the readout's leading breather). The readout seats it near the viewport
   * bottom once per distinct row (i.e. once per line), via a render-phase guard,
   * so a manual scroll within a line is not clobbered. `null` / omitted disables
   * auto-follow (every non-casting mode).
   */
  readonly autoScrollTarget?: {
    readonly row: number
    readonly align: 'bottom'
  } | null
  /** One-line progress hint shown on the footer-bottom line during a flow. */
  readonly flowHint?: string | null
  /** Footer key hints shown while `locked`. */
  readonly flowKeyHints?: string
  /**
   * Footer key hints shown in the done (unlocked) state. Defaults to the
   * standard viewer hints; the loaded-history readout overrides it so the
   * footer reads "Esc back to history" instead of "Esc quit".
   */
  readonly doneKeyHints?: string
  /** Input mode — forwarded to the keymap (`slider` enables prompt panning). */
  readonly inputMode?: InputMode
  /** Optional title (unused by the casting flow; reserved for standalone use). */
  readonly title?: string
  /** Optional notice line shown above the footer. */
  readonly notice?: string
  /**
   * Soft back / exit callback — bound to Escape. Defaults to Ink's
   * `useApp().exit`. The casting viewer injects a handler that may interpose
   * a discard confirmation before routing to its own `onExit`.
   */
  readonly onExit?: () => void
  /**
   * Hard quit callback — bound to Ctrl+C. Defaults to Ink's `useApp().exit`
   * so standalone readouts treat Ctrl+C exactly as before. The casting viewer
   * injects a handler that may interpose a discard confirmation; on confirm
   * it quits the program outright.
   */
  readonly onHardQuit?: () => void
  /**
   * When true, the readout's `useInput` becomes a no-op — every keypress is
   * ignored without dispatching. The casting viewer raises this while its
   * discard-confirm modal is open so the modal's own `useInput` is the sole
   * actor on Y/N/Esc (Ink fans every keypress out to all mounted hooks).
   */
  readonly inputSuppressed?: boolean
  /**
   * Fired exactly once per mount, in a `useEffect` that runs after this
   * component's `useInput` registration has been bound to Ink's stdin
   * dispatcher. The contract is: by the time `onReady` is called, the next
   * `stdin.write(...)` will be received by this readout's `useInput` handler.
   *
   * Exists to defuse the `useInput` bind race: Ink registers a `useInput`
   * handler inside its own `useEffect`, which runs *after* the render commit
   * on the next macrotask. Bytes written between commit and bind get
   * dispatched to ancestor handlers and silently dropped. Because effects
   * fire in declaration order, the `useEffect` powering this callback is
   * queued immediately after the `useInput` hook above and therefore runs
   * only once Ink's listener is in place. Defaults to a no-op.
   */
  readonly onReady?: () => void
}

// The four tabs the readout can show, derived from the sections. The Casting
// tab is always present, so the result is provably non-empty.
function deriveTabs(
  sections: ConsultationSections,
  locked: boolean,
): NonEmpty<TabDescriptor> {
  // While locked we don't yet know whether emerging will exist — show
  // Transformation optimistically; the locked tab bar hides every non-active
  // tab anyway. Once unlocked, drop Transformation + Emerging when there are
  // no moving lines.
  const hasMovingLines = locked || sections.emerging != null
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
  result.push({ id: 'standing', label: 'Standing Hexagram', wrapMode: 'wrap' })
  if (hasMovingLines) {
    result.push({
      id: 'emerging',
      label: 'Emerging Hexagram',
      wrapMode: 'wrap',
    })
  }
  return result
}

export function ConsultationReadout({
  sections,
  locked,
  savedPath,
  maxWrapWidth,
  querySlot,
  queryText,
  dimContent = false,
  aboveFooterSlot,
  aboveFooterHeight = 0,
  castingPromptPan,
  autoScrollTarget,
  flowHint = null,
  flowKeyHints = KEY_HINTS_FLOW_DEFAULT,
  doneKeyHints,
  inputMode = 'slider',
  title,
  notice,
  onExit,
  onHardQuit,
  inputSuppressed = false,
  onReady,
}: ConsultationReadoutProps): ReactElement {
  const { exit } = useApp()
  const exitReadout = onExit ?? exit
  const hardQuitReadout = onHardQuit ?? exit
  const { columns, rows: windowRows } = useWindowSize()
  const cols = columns || 80
  const termRows = windowRows || 24

  const tabs = useMemo(() => deriveTabs(sections, locked), [sections, locked])

  // Tab index management. While locked the active tab is held at Casting
  // (index 0); once unlocked the user can navigate.
  const activeIndexRef = useRef(0)
  const [, forceRender] = useReducer((n: number) => n + 1, 0)
  const offsetsRef = useRef<number[]>([])
  // Last row auto-follow scrolled to; guards the render-phase write below so it
  // fires once per distinct row (i.e. once per casting line), not every render.
  const lastAutoScrollRowRef = useRef<number>(-1)
  const horizontalOffsetsRef = useRef<number[]>([])
  // Horizontal pan offset for the above-footer slot (separate from the
  // active tab's content pan). Reset to 0 whenever the caller's reset token
  // changes so each new cast's content is visible from the start.
  const castingHorizontalOffsetRef = useRef<number>(0)
  const lastResetTokenRef = useRef<string>('')
  if (castingPromptPan) {
    if (lastResetTokenRef.current !== castingPromptPan.resetToken) {
      castingHorizontalOffsetRef.current = 0
      lastResetTokenRef.current = castingPromptPan.resetToken
    }
  } else {
    lastResetTokenRef.current = ''
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

  // Inner content width: terminal cols minus paddingX (2) and the scrollbar
  // gutter (1) — same formula as ScreenShell's computeInnerCols.
  const innerCols = computeInnerCols(cols)

  // The accent-bar prefix `▌ ` occupies 2 display columns on every line, so
  // wrap at innerCols − 2 so the text never overflows onto a new line.
  const wrappedQuery = useMemo(
    () =>
      wrapToWidth(
        queryText.length === 0 ? ' ' : queryText,
        Math.max(1, innerCols - QUERY_ACCENT_PREFIX_WIDTH),
      ),
    [queryText, innerCols],
  )
  // QUERY_BORDER_HEIGHT is 0 — the accent-bar treatment has no border rows.
  const queryBoxHeight = wrappedQuery.split('\n').length + QUERY_BORDER_HEIGHT

  const titleHeight = title == null ? 0 : 1
  const noticeHeight = notice == null ? 0 : 1

  const viewportHeight = Math.max(
    1,
    termRows -
      titleHeight -
      HEADER_HEIGHT -
      MARGIN_HEADER_TO_QUERY -
      queryBoxHeight -
      MARGIN_QUERY_TO_TABS -
      TAB_BAR_HEIGHT -
      aboveFooterHeight -
      noticeHeight -
      MARGIN_CONTENT_TO_NEXT -
      FOOTER_HEIGHT,
  )

  // `activeIndex` was clamped against `tabs.length`, but
  // noUncheckedIndexedAccess still types `tabs[activeIndex]` as `T |
  // undefined`. `tabs[0]` is provably defined (NonEmpty type).
  const activeTab = tabs[activeIndex] ?? tabs[0]
  const activeContent: string = {
    casting: sections.casting,
    transformation: sections.transformation,
    standing: sections.standing,
    emerging: sections.emerging ?? '',
  }[activeTab.id]

  const intrinsicWidth = useMemo(
    () =>
      Math.max(
        1,
        ...activeContent.split('\n').map((line) => terminalWidth(line)),
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
  // line never butt against the tab bar or the footer at the extremes.
  const rowsWithBreathers = useMemo(
    () => ['', ...contentRows, ''],
    [contentRows],
  )
  const totalRows = rowsWithBreathers.length

  const maxOffset = Math.max(0, totalRows - viewportHeight)
  // ── Auto-follow scroll (render-phase, once per distinct row) ──────────────
  // Mirrors the lastResetTokenRef pattern: when the casting flow advances to a
  // new line, seat that line's active row near the viewport bottom by writing
  // the active tab's offset here, during render, so the new position lands on
  // the first paint (no post-commit effect, no extra render). Guarded by row
  // value so casts within a line — and manual scrolls — are not overridden;
  // reset when auto-follow is off so re-entry re-pins from scratch.
  if (autoScrollTarget == null) {
    lastAutoScrollRowRef.current = -1
  } else if (autoScrollTarget.row !== lastAutoScrollRowRef.current) {
    offsetsRef.current[activeIndex] = computeAutoScrollOffset({
      row: autoScrollTarget.row,
      viewportHeight,
      maxOffset,
    })
    lastAutoScrollRowRef.current = autoScrollTarget.row
  }
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

  // Casting-prompt pan ceiling — the slot content can overflow narrow
  // terminals; `<` / `>` pan it. The box itself stays at `innerCols` so it
  // never reflows.
  const castingInnerWidth = Math.max(1, innerCols - 2) // subtract round border
  const maxCastingHorizontalOffset = Math.max(
    0,
    (castingPromptPan?.contentWidth ?? 0) - castingInnerWidth,
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

  // The keymap only reads `state.mode`; `locked` maps onto the casting
  // flow's non-`done` modes. When the readout hosts a pannable casting
  // prompt the slider keymap bindings apply (`casting`), otherwise a locked
  // readout behaves as `awaitingQuery` and an unlocked one as `done`.
  const lockedMode: KeyContext['state']['mode'] =
    castingPromptPan == null ? 'awaitingQuery' : 'casting'
  const keymapMode: KeyContext['state']['mode'] = locked ? lockedMode : 'done'

  // Global input handler. The dispatch table lives in `viewer-keymap.ts`;
  // here we just assemble the per-frame `KeyContext` and delegate. While
  // `inputSuppressed` is set (a host modal is open) the callback short-
  // circuits so the modal's own `useInput` is the sole actor on the keypress.
  useInput((input, key) => {
    if (inputSuppressed) return
    const ctx: KeyContext = {
      state: { mode: keymapMode },
      inputMode,
      viewportHeight,
      exit: exitReadout,
      hardQuit: hardQuitReadout,
      panCastingPromptBy: (delta) =>
        panCastingPromptBy(delta, maxCastingHorizontalOffset),
      stepToTab,
      jumpToTab,
      panActiveBy,
      scrollActiveBy,
      scrollActiveTo,
    }
    dispatchKey(input, key, ctx)
  })

  // ── onReady witness signal ────────────────────────────────────────────────
  // Fires after this component's `useInput` registration above has bound to
  // Ink's stdin dispatcher. Effects run in declaration order, so this
  // `useEffect` is queued immediately after the one Ink uses internally for
  // `useInput` — by the time `onReady` is invoked, the next `stdin.write` is
  // guaranteed to land on the handler above. Guarded by a ref so it fires
  // exactly once per mount even if `onReady` identity changes between
  // renders (a re-fire would defeat its meaning as a one-shot ready latch).
  const readyFiredRef = useRef(false)
  // `onReady` is read once on mount; subsequent identity changes do not
  // re-fire the latch. The empty dep array is intentional and is NOT a
  // missing-dep mistake — see the JSDoc on `onReady` for the contract.
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const aboveContent = (
    <>
      <Text>{`${BOLD_GREY}QUERY:${NORMAL}`}</Text>
      {/* One blank line sets the QUERY: label off from the accent-bar query. */}
      <Box marginTop={MARGIN_HEADER_TO_QUERY} flexShrink={0}>
        {querySlot(innerCols)}
      </Box>
      <Box marginTop={MARGIN_QUERY_TO_TABS} flexShrink={0}>
        <TabBar
          tabs={tabs}
          activeIndex={activeIndex}
          cols={innerCols}
          locked={locked}
        />
      </Box>
    </>
  )

  const contentNode = dimContent ? (
    // Dim the placeholder content while the query is still being
    // typed. Embedded SGR codes inside the partial output would
    // cancel Ink's `[2m` mid-stream, so strip them first.
    <Box height={viewportHeight} flexDirection="column">
      <Text dimColor>{stripAnsi(visibleRows.join('\n'))}</Text>
    </Box>
  ) : (
    <ScrollableSection rows={visibleRows} viewportHeight={viewportHeight} />
  )

  const belowContent =
    notice != null || (aboveFooterSlot != null && aboveFooterHeight > 0) ? (
      <>
        {notice != null && (
          <Box flexShrink={0}>
            <Text dimColor>{notice}</Text>
          </Box>
        )}
        {aboveFooterSlot != null && aboveFooterHeight > 0 && (
          <Box marginTop={MARGIN_CONTENT_TO_NEXT} flexShrink={0}>
            {aboveFooterSlot(innerCols, castingHorizontalOffset)}
          </Box>
        )}
      </>
    ) : null

  const footerNode = (
    <Box
      marginTop={
        aboveFooterSlot != null && aboveFooterHeight > 0
          ? 0
          : MARGIN_CONTENT_TO_NEXT
      }
      flexShrink={0}
    >
      <FooterBar
        savedPath={savedPath}
        cols={innerCols}
        verticalStatus={verticalStatus}
        horizontalStatus={horizontalStatus}
        wrapChip={wrapChip}
        flowHint={flowHint}
        inFlow={locked}
        flowKeyHints={flowKeyHints}
        doneKeyHints={doneKeyHints}
      />
    </Box>
  )

  return (
    <ScreenShell
      cols={cols}
      rows={termRows}
      title={title}
      aboveContent={aboveContent}
      contentSlot={contentNode}
      scrollbarSlot={
        <ScrollbarTrack
          offset={offset}
          totalRows={totalRows}
          viewportHeight={viewportHeight}
        />
      }
      belowContent={belowContent}
      footerSlot={footerNode}
    />
  )
}
