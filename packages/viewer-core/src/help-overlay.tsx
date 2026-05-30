import { Box, Text, useInput, useWindowSize } from 'ink'
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactElement,
} from 'react'

import { computeInnerCols, ScreenShell } from './screen-shell.js'
import { ScrollableSection, ScrollbarTrack } from './viewer-chrome.js'
import { clamp, truncateEnd, wrapToWidth } from './viewer-layout.js'

// Default footer hint — the close + scroll affordances. Callers can override
// with their own wording via the `footerHint` prop.
const DEFAULT_FOOTER_HINT =
  '↑↓ scroll · PgUp/PgDn page · g/G ends · ? or Esc close'

export interface HelpOverlayProps {
  /** `BOLD_GREY` title line at the top of the shell. */
  title: string
  /**
   * The guide body, one entry per logical line. Each entry may carry ANSI SGR
   * codes (rendered raw, like the readout's content) and is hard-wrapped to the
   * inner content width before windowing, so long lines wrap rather than clip.
   */
  lines: string[]
  /** Footer affordance line. Defaults to `DEFAULT_FOOTER_HINT`. */
  footerHint?: string
  /** Fired on `?` or Escape — the host clears its `helpOpen` flag. */
  onClose: () => void
  /**
   * Fired exactly once per mount, after this component's `useInput`
   * registration has bound to Ink's stdin dispatcher — same bind-race witness
   * contract as `ConfirmModal.onReady`. Tests gate the first keystroke on it.
   */
  onReady?: () => void
}

/**
 * Generic full-screen, scrollable help overlay — a `<ScreenShell>` framing a
 * title, a windowed body, and a footer hint. Owns its own `useInput`: arrow /
 * page / g / G scroll the body, `?` or Escape resolve via `onClose`. A host
 * that renders this in place of its main view needs no `inputSuppressed`
 * plumbing — the underlying view is unmounted while the overlay is up.
 *
 * No domain assumptions are baked in — every word on screen comes from props,
 * so each viewer flow can mount its own `?` guide with its own content.
 */
export function HelpOverlay({
  title,
  lines,
  footerHint = DEFAULT_FOOTER_HINT,
  onClose,
  onReady,
}: HelpOverlayProps): ReactElement {
  const { columns, rows: windowRows } = useWindowSize()
  const cols = columns || 80
  const termRows = windowRows || 24
  const innerCols = computeInnerCols(cols)

  // Title (1) + footer (1) bracket the scrollable body.
  const viewportHeight = Math.max(1, termRows - 2)

  // Hard-wrap each guide line to the inner width, then flatten — the wrap may
  // turn one logical line into several display rows.
  const rows = useMemo(
    () => lines.flatMap((line) => wrapToWidth(line, innerCols).split('\n')),
    [lines, innerCols],
  )
  const totalRows = rows.length
  const maxOffset = Math.max(0, totalRows - viewportHeight)

  // Scroll offset in a ref + forceRender, mirroring the readout's scroll model
  // so the gutter and the windowed slice stay in lockstep without re-render
  // churn from a state setter per keypress.
  const offsetRef = useRef(0)
  const [, forceRender] = useReducer((n: number) => n + 1, 0)
  const offset = clamp(offsetRef.current, 0, maxOffset)
  const scrollBy = (delta: number): void => {
    offsetRef.current = clamp(offset + delta, 0, maxOffset)
    forceRender()
  }
  const scrollTo = (target: number): void => {
    offsetRef.current = clamp(target, 0, maxOffset)
    forceRender()
  }

  useInput((input, key) => {
    if (input === '?' || key.escape) {
      onClose()
      return
    }
    if (key.upArrow) scrollBy(-1)
    else if (key.downArrow) scrollBy(1)
    else if (key.pageUp) scrollBy(-(viewportHeight - 1))
    else if (key.pageDown) scrollBy(viewportHeight - 1)
    else if (key.home || input === 'g') scrollTo(0)
    else if (key.end || input === 'G') scrollTo(Number.POSITIVE_INFINITY)
  })

  // ── onReady witness signal ────────────────────────────────────────────────
  // Fires after the `useInput` above binds to Ink's stdin dispatcher — effects
  // run in declaration order, so this is queued right after Ink's own bind
  // effect. See `ConfirmModal.onReady` for the full rationale.
  const readyFiredRef = useRef(false)
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const status =
    totalRows > viewportHeight
      ? `▲ ${offset + 1}–${Math.min(offset + viewportHeight, totalRows)} of ${totalRows} ▼`
      : ''
  const footerLine = truncateEnd(
    status ? `${footerHint}   ${status}` : footerHint,
    innerCols,
  )

  return (
    <ScreenShell
      cols={cols}
      rows={termRows}
      title={title}
      aboveContent={null}
      contentSlot={
        <ScrollableSection
          rows={rows.slice(offset, offset + viewportHeight)}
          viewportHeight={viewportHeight}
        />
      }
      scrollbarSlot={
        <ScrollbarTrack
          offset={offset}
          totalRows={totalRows}
          viewportHeight={viewportHeight}
        />
      }
      belowContent={null}
      footerSlot={
        <Box flexShrink={0}>
          <Text dimColor>{footerLine}</Text>
        </Box>
      }
    />
  )
}
