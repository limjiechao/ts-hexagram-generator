import { visualWidth } from '@hexagram/text-layout'
import { stripAnsi } from '@hexagram/viewer-core'

// CJK-aware width measurement now lives in @hexagram/text-layout. Re-exported
// here so this module keeps its existing public surface; the ANSI-stripping
// and padding siblings below build on the shared `visualWidth`.
export { visualWidth }

export function plainVisualWidth(text: string): number {
  return visualWidth(stripAnsi(text))
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
