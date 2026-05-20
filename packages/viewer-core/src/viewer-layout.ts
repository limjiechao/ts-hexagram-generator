import sliceAnsi from 'slice-ansi'
import stringWidth from 'string-width'
import wrapAnsi from 'wrap-ansi'

// Pure layout primitives used by the Ink viewer. Kept separate so the
// orchestrator (`viewer.tsx`) doesn't have to inline geometry maths and
// helper functions, and so anyone wanting to test wrap/truncate behaviour
// doesn't need to mount React.

// ── Layout geometry constants ────────────────────────────────────────────────

export const HEADER_HEIGHT = 1
export const TAB_BAR_HEIGHT = 1
export const FOOTER_HEIGHT = 2
export const QUERY_BORDER_HEIGHT = 0
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
  if (stringWidth(text) <= width) return text
  return `${sliceAnsi(text, 0, Math.max(0, width - 1))}${ELLIPSIS}`
}

/**
 * Truncate `text` to `width` display columns from the right — keeps the
 * tail and prefixes an ellipsis, so the saved-path filename (the useful
 * part) always survives. ANSI-aware (see `truncateEnd`).
 */
export function truncateStart(text: string, width: number): string {
  if (width <= 0) return ''
  const total = stringWidth(text)
  if (total <= width) return text
  return `${ELLIPSIS}${sliceAnsi(text, total - Math.max(0, width - 1), total)}`
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
