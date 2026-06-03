// ---------------------------------------------------------------------------
// CJK-aware width measurement (replicates `visualWidth` from
// `viewer-core/output-sections.ts` — kept local so this module has no
// internal-only import on a viewer-core helper).
// ---------------------------------------------------------------------------

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

const ANSI_PATTERN = /\[[0-9;]*m/g

export function plainVisualWidth(text: string): number {
  return visualWidth(text.replace(ANSI_PATTERN, ''))
}

export function padRightToWidth(row: string, target: number): string {
  const gap = target - plainVisualWidth(row)
  return gap > 0 ? `${row}${' '.repeat(gap)}` : row
}

// Pad an already-coloured cell to `target` display cols. ANSI codes are
// zero-width, so we measure only the plain content.
export function padCellToWidth(cell: string, target: number): string {
  const gap = target - plainVisualWidth(cell)
  return gap > 0 ? `${cell}${' '.repeat(gap)}` : cell
}

export function capitalizeFirst(text: string): string {
  if (text.length === 0) return text
  return `${text[0]!.toUpperCase()}${text.slice(1)}`
}
