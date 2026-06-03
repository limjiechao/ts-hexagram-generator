// `<PlaygroundApp>` — the Playground orchestrator. Imperative shell
// over the pure `playgroundReducer` (state) and `dispatchPlaygroundKey`
// (input dispatch), plus the isolated `usePulse` hook (display-only timer).
//
// Layout (P6 — sparse banner-aesthetic, no card chrome):
//
//   ScreenShell                                  (title: "Playground")
//     ↳ aboveContent — null
//     ↳ contentSlot
//         ↳ <HexagramDisplay>  — top half: 12 ANSI rows, pan-sliced
//         ↳ <ReadingsPanel>    — bottom half: scrollable readings, only
//                                when exactly 1 line is moving
//     ↳ scrollbarSlot          — <ScrollbarTrack> for the readings panel
//                                (whitespace when readings are hidden)
//     ↳ belowContent
//         ↳ <SaveStrip>        — only when state.mode === 'saving'
//     ↳ footerSlot
//         ↳ key hints line · saved-path / error line
//
// Pan + scroll state lives here as refs so the keymap can mutate without
// triggering a setState cascade; a `forceRender` reducer pokes React on
// each mutation. Identical pattern to `<ConsultationReadout>`.
//
// Save behaviour:
//   - S → dispatch 'beginSave' → <SaveStrip> opens → on submit, fire the
//     async save and dispatch 'saveSucceeded' or 'saveFailed' from its
//     resolution.
//   - The reducer never sees the in-flight save promise; the side effect
//     lives in this component's `handleSaveSubmit` closure.

import path from 'node:path'
import process from 'node:process'

import { saveConsultationFile } from '@hexagram/consultation-file'
import {
  BOLD_GREY,
  clamp,
  computeInnerCols,
  NORMAL,
  ScreenShell,
  ScrollbarTrack,
} from '@hexagram/viewer-core'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactElement,
} from 'react'

import { HexagramDisplay } from './hexagram-display.js'
import { TOP_HALF_ROWS, TOP_HALF_WIDTH } from './playground-display-geometry.js'
import { dispatchPlaygroundKey, toKeymapSlice } from './playground-keymap.js'
import { buildPlaygroundDerivation } from './playground-lines.js'
import {
  initialPlaygroundState,
  playgroundReducer,
} from './playground-state.js'
import { buildReadingsRows, ReadingsPanel } from './readings-panel.js'
import { SAVE_STRIP_ROWS, SaveStrip } from './save-strip.js'
import { usePulse } from './use-pulse.js'

interface PlaygroundAppProps {
  /**
   * Invoked when the user presses Escape with no typing run open. Defaults
   * to `useApp().exit` so the standalone bin quits; the composed CLI
   * passes its `backToHome` handler so Esc returns to the home menu.
   */
  readonly onExit?: () => void
  /**
   * Verb shown after `ESC` in the footer key hints — names the real
   * destination of the top-level Escape exit. Defaults to `'quit'`
   * (standalone behaviour); a host that supplies `onExit` should also
   * pass a matching label (e.g. `'Home'`).
   */
  readonly exitLabel?: string
  /**
   * Directory under which `consultation-<timestamp>.md` is written. Defaults
   * to `<cwd>/consultations`. Tests inject a tmpdir so they don't litter
   * the workspace.
   */
  readonly saveDir?: string
  /**
   * Pulse cadence in milliseconds. Defaults to 540 ms (≈ 5 × the banner's
   * 108 ms tick, matching the home banner's settled-half rhythm without
   * the per-tick churn of a 108 ms beat in the playground's bigger
   * subtree). Tests pass `0` to freeze the pulse and lock frames.
   */
  readonly pulseIntervalMs?: number
  /**
   * Fires exactly once per mount, after this component's `useInput` has
   * bound to Ink's stdin dispatcher. Same contract as `<HomeMenu>`,
   * `<HistoryList>`, `<QueryEditor>`, etc.: a test that writes the first
   * keystroke right after mount must gate on this signal to dodge the
   * bind-race window.
   */
  readonly onReady?: () => void
}

const DEFAULT_PULSE_INTERVAL_MS = 540

/** ASCII formatter for the save-status line in the footer. */
function describeSaveLine(
  savedPath: string | null,
  saveError: string | null,
): string {
  if (saveError !== null) return `✗ Save failed: ${saveError}`
  if (savedPath !== null) return `✓ Saved to ${savedPath}`
  return ''
}

// Title row + the two-line footer reserved by `<ScreenShell>`.
const TITLE_ROWS = 1
const FOOTER_ROWS = 2
// Margin between the top half and the readings panel.
const TOP_TO_READINGS_GAP = 1

export function PlaygroundApp({
  onExit,
  exitLabel,
  saveDir,
  pulseIntervalMs = DEFAULT_PULSE_INTERVAL_MS,
  onReady,
}: PlaygroundAppProps): ReactElement {
  const { exit } = useApp()
  const handleExit = onExit ?? exit
  const effectiveExitLabel = exitLabel ?? 'quit'
  const { columns, rows } = useWindowSize()
  const cols = columns || 80
  const termRows = rows || 24
  const innerCols = computeInnerCols(cols)

  const [state, dispatch] = useReducer(
    playgroundReducer,
    undefined,
    initialPlaygroundState,
  )

  const pulseOn = usePulse(pulseIntervalMs)
  const derivation = buildPlaygroundDerivation(state.lines)

  // ── Pan + scroll state ────────────────────────────────────────────────────
  // Held in refs so the keymap can mutate them synchronously without
  // round-tripping through React's commit phase; a `forceRender` reducer
  // pokes the tree on each mutation. Matches `<ConsultationReadout>`'s pattern.
  const panOffsetRef = useRef(0)
  const scrollOffsetRef = useRef(0)
  const [, forceRender] = useReducer((n: number) => n + 1, 0)

  // ── Viewport maths ────────────────────────────────────────────────────────
  const showReadings = derivation.singleMovingIndex !== null
  const isSaving = state.mode === 'saving'
  const readingsViewportHeight = Math.max(
    1,
    termRows -
      TITLE_ROWS -
      TOP_HALF_ROWS -
      (showReadings ? TOP_TO_READINGS_GAP : 0) -
      (isSaving ? SAVE_STRIP_ROWS : 0) -
      FOOTER_ROWS,
  )

  // Pan ceiling — anything beyond `TOP_HALF_WIDTH - innerCols` is unreachable.
  const maxPanOffset = Math.max(0, TOP_HALF_WIDTH - innerCols)
  const panOffset = clamp(panOffsetRef.current, 0, maxPanOffset)
  if (panOffsetRef.current !== panOffset) panOffsetRef.current = panOffset

  // Readings rows — built synchronously from current state so the host (not
  // the panel) is the authority on totalRows. The gutter reserves 1 col for
  // the scrollbar whether or not it ends up mounted; that keeps the wrap
  // width stable across overflow toggles.
  const readingsWrapWidth = Math.max(1, Math.min(TOP_HALF_WIDTH, innerCols) - 1)
  const readingsRows: readonly string[] = useMemo(() => {
    if (!showReadings) return []
    const idx = derivation.singleMovingIndex as 0 | 1 | 2 | 3 | 4 | 5
    return buildReadingsRows(derivation.standing, idx, readingsWrapWidth)
  }, [
    showReadings,
    derivation.singleMovingIndex,
    derivation.standing,
    readingsWrapWidth,
  ])
  const readingsOverflows = readingsRows.length > readingsViewportHeight

  // Scroll ceiling — clamp to current readings height.
  const maxScrollOffset = Math.max(
    0,
    readingsRows.length - readingsViewportHeight,
  )
  const scrollOffset = clamp(scrollOffsetRef.current, 0, maxScrollOffset)
  if (scrollOffsetRef.current !== scrollOffset)
    scrollOffsetRef.current = scrollOffset

  // ── Keymap callbacks ──────────────────────────────────────────────────────
  const panTopBy = useCallback(
    (delta: number) => {
      const next = clamp(panOffsetRef.current + delta, 0, maxPanOffset)
      if (next === panOffsetRef.current) return
      panOffsetRef.current = next
      forceRender()
    },
    [maxPanOffset],
  )
  const scrollReadingsBy = useCallback(
    (delta: number) => {
      // `Number.±INFINITY` deltas mean "one page" — the host translates them
      // now that it knows the viewport height (keymap stays viewport-agnostic).
      const pageStep = Math.max(1, readingsViewportHeight - 1)
      let effective = delta
      if (delta === Number.POSITIVE_INFINITY) effective = pageStep
      if (delta === Number.NEGATIVE_INFINITY) effective = -pageStep
      const next = clamp(
        scrollOffsetRef.current + effective,
        0,
        maxScrollOffset,
      )
      if (next === scrollOffsetRef.current) return
      scrollOffsetRef.current = next
      forceRender()
    },
    [maxScrollOffset, readingsViewportHeight],
  )
  const scrollReadingsTo = useCallback(
    (target: number) => {
      const next = clamp(target, 0, maxScrollOffset)
      if (next === scrollOffsetRef.current) return
      scrollOffsetRef.current = next
      forceRender()
    },
    [maxScrollOffset],
  )

  // Reset scroll whenever the readings target changes (different moving
  // line, or readings hide/show). Stops the user from landing on a stale
  // offset that belongs to a previous reading.
  const readingsKey = showReadings
    ? `${derivation.singleMovingIndex}-${state.lines.join(',')}`
    : 'none'
  const lastReadingsKeyRef = useRef(readingsKey)
  if (lastReadingsKeyRef.current !== readingsKey) {
    lastReadingsKeyRef.current = readingsKey
    scrollOffsetRef.current = 0
  }

  useInput((input, key) => {
    // The save editor owns input — let it handle everything.
    if (state.mode === 'saving') return
    // Ctrl+C is the hard quit from every screen — never routed through the
    // injected `onExit` (which the composed host uses for soft-back-to-home).
    if (key.ctrl && input === 'c') {
      exit()
      return
    }
    // `state` is closed over by Ink's re-registered handler on each render,
    // so `toKeymapSlice(state)` always reflects the latest reducer output.
    dispatchPlaygroundKey(input, key, {
      state: toKeymapSlice(state),
      dispatch,
      exit: handleExit,
      panTopBy,
      scrollReadingsBy,
      scrollReadingsTo,
    })
  })

  // ── onReady witness signal ────────────────────────────────────────────────
  // Fires after this component's `useInput` registration above has bound to
  // Ink's stdin dispatcher. Same pattern as `<HomeMenu>`,
  // `<HistoryList>`, `<QueryEditor>`. Guarded by a ref so it fires exactly
  // once per mount even if `onReady` identity changes between renders.
  const readyFiredRef = useRef(false)
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveSubmit = useCallback(
    (query: string) => {
      const params: Parameters<typeof saveConsultationFile>[0] = {
        query,
        hexagram: state.lines,
        casting: null,
      }
      if (saveDir !== undefined) params.dir = saveDir
      saveConsultationFile(params)
        .then((filePath) => {
          // Show the cwd-relative path when the consultation lives inside
          // the working tree (the common case); otherwise fall back to the
          // absolute path so the user isn't squinting at `../../..`.
          const relative = path.relative(process.cwd(), filePath)
          const display = relative.startsWith('..') ? filePath : relative
          dispatch({ type: 'saveSucceeded', relativePath: display })
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          dispatch({ type: 'saveFailed', message })
        })
    },
    [state.lines, saveDir],
  )

  const handleSaveCancel = useCallback(() => {
    dispatch({ type: 'cancelSave' })
  }, [])

  const contentSlot = (
    <Box flexDirection="column" alignItems="center">
      <HexagramDisplay
        standing={derivation.standing}
        emerging={derivation.emerging}
        hasMoving={derivation.hasMoving}
        focusIndex={state.focusIndex}
        pulse={pulseOn}
        panOffset={panOffset}
        innerCols={innerCols}
      />
      {showReadings && (
        <Box
          marginTop={TOP_TO_READINGS_GAP}
          flexDirection="row"
          width={Math.min(TOP_HALF_WIDTH, innerCols)}
        >
          <Box flexGrow={1} flexShrink={1}>
            <ReadingsPanel
              rows={readingsRows}
              viewportHeight={readingsViewportHeight}
              scrollOffset={scrollOffset}
            />
          </Box>
          {/* Reserve the 1-col gutter unconditionally; only mount the
              scrollbar inside it when readings overflow the viewport. */}
          <Box width={1} flexShrink={0}>
            {readingsOverflows && (
              <ScrollbarTrack
                offset={scrollOffset}
                totalRows={readingsRows.length}
                viewportHeight={readingsViewportHeight}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  )

  // Scrollbar lives inside `contentSlot` next to the readings panel so its
  // vertical extent matches what it scrolls. The shell's right gutter stays
  // empty.
  const scrollbarSlot = null

  const belowContent = isSaving ? (
    <SaveStrip
      innerCols={innerCols}
      onSubmit={handleSaveSubmit}
      onCancel={handleSaveCancel}
    />
  ) : null

  const saveLine = describeSaveLine(state.savedPath, state.saveError)
  const panChip =
    maxPanOffset > 0
      ? `◀ ${panOffset + 1}–${Math.min(panOffset + innerCols, TOP_HALF_WIDTH)} of ${TOP_HALF_WIDTH} ▶`
      : ''
  const keyHints =
    ` Tab focus ↑ · ⇧Tab focus ↓ · SPACE flip · ←/→ cycle · 6/7/8/9 type · ` +
    `</> pan · ↑↓ scroll · g/G ends · Del undo · r reset · S save · ` +
    `ESC ${effectiveExitLabel}`
  // Second footer row carries the save-status line on the left and the pan
  // chip on the right (when panning is reachable). `justifyContent` keeps
  // them from colliding on narrow terminals.
  const footer = (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{keyHints}</Text>
      <Box flexDirection="row" justifyContent="space-between">
        <Text>{`${BOLD_GREY}${saveLine}${NORMAL}`}</Text>
        {panChip.length > 0 && <Text dimColor>{panChip}</Text>}
      </Box>
    </Box>
  )

  return (
    <ScreenShell
      cols={cols}
      rows={termRows}
      title="Playground"
      aboveContent={null}
      contentSlot={contentSlot}
      scrollbarSlot={scrollbarSlot}
      belowContent={belowContent}
      footerSlot={footer}
    />
  )
}
