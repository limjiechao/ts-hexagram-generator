import type { LinePosition } from '@hexagram/oracle/line-position'
import type { LineValue } from '@hexagram/oracle/line-value'
import type { FigureLine, HexagramFigure } from '@hexagram/presentation/readout'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'

import type { Palette } from '#src/readout/palette.js'

/*
 * A Hexagram's Figure drawn as monospace rows (ADR-0022), Line 6 at the top.
 * A Moving Line's glyph carries ○ or ✕ whether or not colour is on, so the
 * meaning survives `NO_COLOR` (ADR-0044).
 */

const lineGlyphs: Readonly<Record<LineValue, string>> = {
  6: '━━━ ✕ ━━━',
  7: '━━━━━━━━━',
  8: '━━━   ━━━',
  9: '━━━━○━━━━',
}

const positionLabels: Readonly<Record<LinePosition, string>> = {
  1: '（初, 1st）',
  2: '（二, 2nd）',
  3: '（三, 3rd）',
  4: '（四, 4th）',
  5: '（五, 5th）',
  6: '（上, 6th）',
}

/** Where the Transformation tab's Emerging column starts. */
export const emergingColumn = 46

/** The connector from a Moving Line to the Changed Line it becomes. */
const movingArrow = `${'─'.repeat(17)}▶ `
const staticGap = ' '.repeat(movingArrow.length)

/** A Line's colour: a Moving Line's stands out. */
export const lineColour = (line: FigureLine, palette: Palette): string =>
  line.change === 'moving' ? palette.moving : palette.emphasis

/** The Lines top-down, as they are drawn. */
const topDown = (figure: HexagramFigure): readonly FigureLine[] =>
  figure.lines.toReversed()

/**
 * The Transformation tab's Line rows: each Line of the Standing Hexagram
 * beside the Line it becomes in the Emerging Hexagram, an arrow joining a
 * Moving Line to its Changed Line.
 */
export function transformationRows(
  standing: HexagramFigure,
  emerging: HexagramFigure,
  palette: Palette,
): readonly string[] {
  const half = (line: FigureLine): string => {
    const colour = lineColour(line, palette)
    return (
      `${colour}${String(line.value)}${palette.reset}` +
      `  ${colour}${lineGlyphs[line.value]}${palette.reset}` +
      `  ${positionLabels[line.position]}`
    )
  }
  const becomes = topDown(emerging)
  return topDown(standing).map((line, index) => {
    const changed = becomes[index]
    const gap = line.change === 'moving' ? movingArrow : staticGap
    return `  ${half(line)}${gap}${changed === undefined ? '' : half(changed)}`
  })
}

/** A Trigram's imagery in its first Edition, and in the others. */
const imagery = (
  names: readonly TrigramName[],
): { readonly first: string; readonly others: string } => ({
  first: names[0]?.imagery ?? '',
  others: names
    .slice(1)
    .map((each) => each.imagery)
    .join(' / '),
})

/**
 * A Hexagram tab's diagram rows: each Line, then a brace over each Trigram
 * naming its imagery, the first Edition's on the brace's middle row and the
 * others' below it.
 */
export function diagramRows(
  figure: HexagramFigure,
  palette: Palette,
): readonly string[] {
  const upper = imagery(figure.upperTrigram)
  const lower = imagery(figure.lowerTrigram)
  const braces = [
    '──┐',
    `──┼── ${upper.first}（上卦）`,
    `──┘   ${upper.others} (upper trigram)`,
    '──┐',
    `──┼── ${lower.first}（下卦）`,
    `──┘   ${lower.others} (lower trigram)`,
  ]
  return topDown(figure).map(
    (line, index) =>
      `  ${lineColour(line, palette)}${String(line.value)}  ${lineGlyphs[line.value]}  ${palette.reset}` +
      `${positionLabels[line.position]}${braces[index] ?? ''}`,
  )
}
