/**
 * Compute the display width of a string, counting CJK and other fullwidth
 * characters as two columns and everything else as one. Used by
 * `padToColumn` to keep fixed-width diagrams aligned even when they contain
 * Chinese characters or fullwidth punctuation.
 */
export function visualWidth(text: string): number {
  let width = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    const isFullwidth =
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
      (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
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
