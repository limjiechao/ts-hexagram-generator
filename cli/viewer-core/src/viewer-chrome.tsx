import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import { BOLD_GREY, BOLD_WHITE, NORMAL } from './output-palette.js'
import type { InputMode } from './viewer-keymap.js'
import { truncateEnd, truncateStart, wrapToWidth } from './viewer-layout.js'

// Presentational chrome for the Ink viewer. Each component is a "dumb"
// React component — props in, JSX out. No state, no side effects.
// `<ConsultationViewer>` (in viewer.tsx) is the orchestrator; it owns
// the flow and composes these pieces.

// ── Tab descriptor ───────────────────────────────────────────────────────────

export type TabId = 'casting' | 'transformation' | 'standing' | 'emerging'

export interface TabDescriptor {
  id: TabId
  label: string
  wrapMode: 'wrap' | 'never'
}

// Used by TabBar / the activeTab lookup in viewer.tsx. The viewer
// always has at least the `casting` tab, so encoding non-emptiness in the
// type lets `tabs[0]` serve as a safe fallback for the activeIndex lookup
// under noUncheckedIndexedAccess.
export type NonEmpty<T> = readonly [T, ...T[]]

// ── Key-hint formatters ──────────────────────────────────────────────────────

export const KEY_HINTS_TEMPLATE = (): string =>
  `Tab switch · ↑↓ scroll · </> pan · g/G ends · Esc quit`

/**
 * The casting flow whose footer hints are being formatted. The interactive
 * flow's SPACE parts the stalks; the random flow auto-drives the slider, so
 * its SPACE instead skips the rest of the casting animation. Mirrors
 * `casting-ui`'s `FlowKind` without importing it (keeps `viewer-core` free of
 * a `casting-ui` dependency — the chrome is shared infrastructure).
 */
export type CastingFlowKind = 'interactive' | 'random' | 'manual'

/**
 * Footer key hints during the casting phase. The slider's load-bearing key
 * is SPACE — without surfacing it here the prompt is undiscoverable. Its verb
 * depends on the flow: the interactive flow parts the stalks on SPACE, the
 * random flow (`flowKind === 'random'`) auto-drives the slider and SPACE
 * instead skips the rest of the animation. Number mode normally advertises
 * Enter for parity with the in-tab prompt label — but the random flow's
 * number-mode reveal is timer-driven with nothing to commit, so it advertises
 * SPACE: skip there too. `<` / `>` is the horizontal-pan binding the viewer
 * registers when slider content overflows.
 *
 * Escape and Ctrl+C are separate keys: Escape is the soft back / exit (its
 * destination named by `exitLabel` — "quit" standalone, or the host's
 * destination in the composed CLI), Ctrl+C always hard-quits. `exitLabel`
 * defaults to `"quit"` so a standalone casting bin reads the same as before.
 * `flowKind` defaults to `"interactive"` so existing callers are unchanged.
 */
export function keyHintsForCasting(
  inputMode: InputMode,
  exitLabel = 'quit',
  flowKind: CastingFlowKind = 'interactive',
): string {
  const exitHints = `Esc: ${exitLabel}   Ctrl+C: quit`
  // The manual flow is its own input branch (two `<NumberInput>` fields +
  // Enter commits the derived pick); `inputMode` is moot here. It does not
  // support pan per locked decision #9, so no `</>: pan` token. The
  // `Ctrl+R rewind line` hint is appended by the viewer's `showRewind`
  // guard, not here.
  if (flowKind === 'manual') {
    return `Enter: commit   Tab/Shift+Tab: field   ${exitHints}`
  }
  if (inputMode !== 'slider') {
    // The random flow's number-mode reveal is driven by the per-cast timer;
    // there is nothing to commit and SPACE skips the rest. The interactive
    // number prompt still commits typed casts on Enter.
    if (flowKind === 'random') return `SPACE: skip   ${exitHints}`
    return `Enter: commit   ${exitHints}`
  }
  const spaceHint = flowKind === 'random' ? 'SPACE: skip' : 'SPACE: part'
  return `${spaceHint}   </>: pan   ${exitHints}`
}

/**
 * Footer key hints for the non-casting flow phases (`awaitingQuery` /
 * `computing`). `exitLabel` names where Escape goes; Ctrl+C always quits.
 */
export function keyHintsFlowDefault(exitLabel = 'quit'): string {
  return `Esc: ${exitLabel}   Ctrl+C: quit`
}

/** Default flow key hints — Escape exits ("quit"), Ctrl+C hard-quits. */
export const KEY_HINTS_FLOW_DEFAULT: string = keyHintsFlowDefault()

// ── Components ───────────────────────────────────────────────────────────────

// Accent-bar prefix width: `▌ ` = 2 display columns.
export const QUERY_ACCENT_BAR_PREFIX = '▌ '
export const QUERY_ACCENT_PREFIX_WIDTH = 2

/**
 * Read-only query display. Renders the query with a left `▌` accent bar on
 * every wrapped line, query text in `BOLD_WHITE`, no border.
 */
export function QueryBox({
  query,
  width,
}: {
  query: string
  width: number
}): ReactElement {
  const textWidth = Math.max(1, width - QUERY_ACCENT_PREFIX_WIDTH)
  const wrapped = wrapToWidth(query.length === 0 ? ' ' : query, textWidth)
  const lines = wrapped.split('\n')
  return (
    <Box flexDirection="column" flexShrink={0}>
      {lines.map((line, index) => (
        <Text key={index}>
          <Text dimColor>{QUERY_ACCENT_BAR_PREFIX}</Text>
          <Text>{`${BOLD_WHITE}${line}${NORMAL}`}</Text>
        </Text>
      ))}
    </Box>
  )
}

export function TabBar({
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
  // Bracketed number prefix for the active tab — `<N>` reads as a key hint
  // (press N to jump to that tab), 1-based to match the keyboard shortcut.
  const activeNumber = activeIndex + 1
  const activeLabel = `<${activeNumber}> ${activeTab.label}`

  // Flow in progress: only the active tab shows, rendered with the same
  // bold+inverse styling as done-mode — there's no agency to switch tabs.
  if (locked) {
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse>{` ${activeLabel} `}</Text>
      </Box>
    )
  }

  // Done mode: all tabs visible, dim ` · ` separator between them.
  // Each cell renders as ` <N> label ` (`<N> ` is 4 chars + label + 2 pad
  // spaces); separators add 3 cols.
  const renderedWidth = tabs.reduce(
    (sum, t, i) => sum + 4 + t.label.length + 2 + (i > 0 ? 3 : 0),
    0,
  )
  if (renderedWidth > cols) {
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse>{` ${activeLabel} `}</Text>
        <Text dimColor>{` (${activeNumber}/${tabs.length})`}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
      {tabs.flatMap((tab, index) => {
        const active = index === activeIndex
        const numberedLabel = `<${index + 1}> ${tab.label}`
        const cells: ReactElement[] = [
          <Text key={tab.id} bold={active} inverse={active} dimColor={!active}>
            {` ${numberedLabel} `}
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

export function ScrollableSection({
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

/**
 * 1-column vertical scrollbar gutter. When content overflows the viewport,
 * renders a proportional `█` handle over a `░` track; otherwise reserves
 * the column with whitespace so chrome above/below doesn't shift when
 * overflow state toggles.
 */
export function ScrollbarTrack({
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

export function FooterBar({
  savedPath,
  cols,
  verticalStatus,
  horizontalStatus,
  wrapChip,
  flowHint,
  inFlow,
  flowKeyHints,
  doneKeyHints,
}: {
  savedPath: string
  cols: number
  verticalStatus: string | null
  horizontalStatus: string | null
  wrapChip: string | null
  flowHint: string | null
  inFlow: boolean
  flowKeyHints: string
  /**
   * Key-hint line shown in done (unlocked) mode. Defaults to
   * `KEY_HINTS_TEMPLATE()`; the loaded-history readout overrides it so the
   * footer reads "Esc back to history" instead of "Esc quit".
   */
  doneKeyHints?: string
}): ReactElement {
  // Hints are rendered first (left) so they are never the thing that
  // truncates. Scroll/pan/wrap status is pushed to the right — that is what
  // degrades gracefully on overflow (it is regenerable glance-info).
  const hints = inFlow ? flowKeyHints : (doneKeyHints ?? KEY_HINTS_TEMPLATE())
  const statusParts: string[] = []
  if (verticalStatus) statusParts.push(verticalStatus)
  if (horizontalStatus) statusParts.push(horizontalStatus)
  if (wrapChip) statusParts.push(wrapChip)
  const statusStr = statusParts.join('   ')
  const full = statusStr ? `${hints}   ${statusStr}` : hints
  const status = truncateEnd(full, cols)
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
