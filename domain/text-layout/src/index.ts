import stringWidth from 'string-width'

/**
 * Compute the display width of a string, counting CJK and other fullwidth
 * characters as two columns and everything else as one. Used by `padToColumn`
 * to keep fixed-width diagrams aligned even when they contain Chinese
 * characters or fullwidth punctuation.
 *
 * The single home for rendered-string width across the whole codebase (ADR-0021):
 * backed by `string-width`'s maintained East-Asian-width table, it is correct on
 * arbitrary glyphs the old hand-rolled ranges silently mis-measured — emoji,
 * supplementary-plane CJK (U+20000+), and zero-width combining marks. The CLI
 * layer's `terminalWidth` is a thin re-export of this function, so the saved
 * `.md` diagrams and the live terminal viewer can never disagree on a glyph's
 * width. `string-width` strips ANSI internally, so this is also ANSI-aware (the
 * diagram text fed to it is raw, so that costs nothing here).
 */
export function visualWidth(text: string): number {
  return stringWidth(text)
}

// Pad text to targetColumn with at least minGap spaces.
export function padToColumn(
  text: string,
  targetColumn: number,
  minGap = 1,
): string {
  return text + ' '.repeat(Math.max(minGap, targetColumn - visualWidth(text)))
}

/** Right-align `text` within `width` visual columns (CJK-aware). */
export function padStartVisual(text: string, width: number): string {
  return ' '.repeat(Math.max(0, width - visualWidth(text))) + text
}

/** Centre `text` within `width` visual columns (CJK-aware). */
export function centerVisual(text: string, width: number): string {
  const total = Math.max(0, width - visualWidth(text))
  const left = Math.floor(total / 2)
  return ' '.repeat(left) + text + ' '.repeat(total - left)
}
