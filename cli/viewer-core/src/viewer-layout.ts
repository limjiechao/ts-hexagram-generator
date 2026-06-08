import { visualWidth } from '@hexagram/text-layout'
import sliceAnsi from 'slice-ansi'
import wrapAnsi from 'wrap-ansi'

/**
 * Display width of a terminal string in columns. ANSI-aware: embedded SGR
 * escapes count as zero; wide CJK glyphs count as two. A thin re-export of the
 * `visualWidth` function in `@hexagram/text-layout` — the single home for
 * rendered-string width across the codebase (ADR-0021). The CLI layer imports
 * width via this wrapper (or the truncate/pad helpers below), never the
 * `string-width` package directly (raw imports are blocked by the ESLint
 * `no-restricted-imports` fence in `eslint.config.js`, scoped to `cli/**`
 * except `viewer-core`; see ADR-0019/0021). Because `visualWidth` and
 * `terminalWidth` now share one `string-width`-backed table, the saved `.md`
 * diagrams and the live viewer can never disagree on a glyph's width.
 */
export function terminalWidth(text: string): number {
  return visualWidth(text)
}

// Pure layout primitives used by the Ink viewer. Kept separate so the
// orchestrator (`viewer.tsx`) doesn't have to inline geometry maths and
// helper functions, and so anyone wanting to test wrap/truncate behaviour
// doesn't need to mount React.

// ── Layout geometry constants ────────────────────────────────────────────────

export const HEADER_HEIGHT = 1
export const TAB_BAR_HEIGHT = 1
export const FOOTER_HEIGHT = 2
export const QUERY_BORDER_HEIGHT = 0
export const MARGIN_HEADER_TO_QUERY = 1
export const MARGIN_QUERY_TO_TABS = 1
export const MARGIN_CONTENT_TO_NEXT = 1

export const ELLIPSIS = '…'

// Widest fixed-width structural line (the transformation tab's side-by-side
// diagram + hexagram-name footer) is ~92 display columns; never wrap content
// below this or the ASCII art shreds. Small margin over the measured worst
// case.
export const MIN_CONTENT_WIDTH = 100

// ── ANSI helpers ─────────────────────────────────────────────────────────────

// Ink's `<Text dimColor>` wraps its child in `[2m…[22m`, but embedded `[0m`
// resets inside the rendered content clear the dim mid-string — the result
// is a sea of mixed-intensity rows. Strip every SGR code from the
// placeholder rows before handing them to Ink so the entire region reads as
// uniformly dim.
// oxlint-disable-next-line no-control-regex
export const ANSI_PATTERN: RegExp = /\u001B\[[0-9;]*m/g

export function stripAnsi(text: string): string {
  return text.replaceAll(ANSI_PATTERN, '')
}

// Wrap a pre-formatted ANSI string to `width` columns. `trim: false` keeps
// the existing indentation; `hard: true` breaks words longer than the
// viewport.
export function wrapToWidth(content: string, width: number): string {
  return wrapAnsi(content, Math.max(1, width), { hard: true, trim: false })
}

// ── Numeric helpers ──────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Resolve the column width to wrap content at: wrap to fit the terminal but
 * never wider than `maxWrapWidth`, and never narrower than the section's
 * structural floor — so prose hard-wraps while fixed-width diagrams stay
 * intact.
 */
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

/**
 * Truncate `text` to `width` display columns, appending an ellipsis when
 * cut. ANSI-aware: embedded SGR codes are preserved and never counted as
 * width.
 */
export function truncateEnd(text: string, width: number): string {
  if (width <= 0) return ''
  if (terminalWidth(text) <= width) return text
  return `${sliceAnsi(text, 0, Math.max(0, width - 1))}${ELLIPSIS}`
}

/**
 * Truncate `text` to `width` display columns from the right — keeps the
 * tail and prefixes an ellipsis, so the saved-path filename (the useful
 * part) always survives. ANSI-aware (see `truncateEnd`).
 */
export function truncateStart(text: string, width: number): string {
  if (width <= 0) return ''
  const total = terminalWidth(text)
  if (total <= width) return text
  return `${ELLIPSIS}${sliceAnsi(text, total - Math.max(0, width - 1), total)}`
}

/**
 * Slice `text` to the display-column window `[offset, offset + width)` for
 * horizontal panning. ANSI-aware: embedded SGR codes are zero-width and ride
 * along with the visible columns they wrap, so the pan steps by glyph, not by
 * byte. The single home for rendered-string slicing in the CLI layer —
 * panning components import this, never the `slice-ansi` package directly
 * (raw imports are blocked by the ESLint `no-restricted-imports` fence in
 * `eslint.config.js`, scoped to `cli/**` except `viewer-core`; see ADR-0021).
 * Does NOT pad: a caller that needs the window filled to `width` must pad the
 * row to `width` columns before calling (see `manual-prompt.tsx`).
 */
export function panToWindow(
  text: string,
  offset: number,
  width: number,
): string {
  return sliceAnsi(text, offset, offset + width)
}

/**
 * Pad `text` with trailing spaces until its *display width* reaches `width`
 * columns. Display-width-aware: wide CJK glyphs count as two columns and
 * embedded SGR codes count as zero — so a padded line fills an inverse
 * highlight bar edge-to-edge without overshooting and wrapping. Returns
 * `text` unchanged when it already meets or exceeds `width`.
 */
export function padEndToWidth(text: string, width: number): string {
  const current = terminalWidth(text)
  if (current >= width) return text
  return text + ' '.repeat(width - current)
}

// ── Footer / status formatters ───────────────────────────────────────────────

// 18 splits total (6 lines × 3 casts). Footer shows casting progress as
// `Casting in progress ·  ■■■□□□…  N/18` to give a glanceable sense of flow
// completion. Filled and empty squares read as discrete units (one per
// cast) and stay legible across the fonts users are likely to have.
export function renderProgressBar(completed: number, total: number): string {
  const filled = '■'.repeat(completed)
  const empty = '□'.repeat(total - completed)
  return `Casting in progress ·  ${filled}${empty}  ${completed}/${total}`
}
