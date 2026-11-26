import type { Figure, Polarity } from '#src/figure.js'
import { lookUpRow } from '#src/hexagram-table.js'
import type { Hexagram } from '#src/hexagram.js'
import type { LinePosition } from '#src/line-position.js'
import type { LineValue } from '#src/line-value.js'
import type { PassageReference } from '#src/passage-reference.js'
import type { Transformation } from '#src/transformation.js'
import type { Trigram } from '#src/trigram.js'

/**
 * A Hexagram with its invariant structure: its Lower and Upper Trigrams and
 * its Nuclear, Inverse and Reversed Hexagrams (ADR-0025).
 */
interface HexagramStructure {
  readonly hexagram: Hexagram
  readonly lowerTrigram: Trigram
  readonly upperTrigram: Trigram
  readonly nuclearHexagram: Hexagram
  readonly inverseHexagram: Hexagram
  readonly reversedHexagram: Hexagram
}

/**
 * What follows from a Transformation, whether cast or chosen, without
 * interpreting it. For X之X the Emerging Hexagram is the Standing one and
 * there are no Moving Lines. The Moving Lines run bottom-up; neither list's
 * order carries a rank (ADR-0024).
 */
export interface Resolution {
  readonly standing: HexagramStructure
  readonly emerging: HexagramStructure
  readonly movingLines: readonly LinePosition[]
  readonly applicablePassages: readonly PassageReference[]
}

/** Old Yin 6 and Young Yin 8 are yin; Young Yang 7 and Old Yang 9 are yang. */
const standingPolarityOf = (value: LineValue): Polarity =>
  value === 7 || value === 9 ? 'yang' : 'yin'

/** A Moving Line is an Old value: Old Yin 6 or Old Yang 9. */
const isMoving = (value: LineValue): boolean => value === 6 || value === 9

/** A Moving Line becomes a Changed Line: 6 turns yang, 9 turns yin. */
const emergingPolarityOf = (value: LineValue): Polarity => {
  if (value === 6) return 'yang'
  if (value === 9) return 'yin'
  return standingPolarityOf(value)
}

const figureOf = (
  transformation: Transformation,
  polarityOf: (value: LineValue) => Polarity,
): Figure => [
  polarityOf(transformation[0]),
  polarityOf(transformation[1]),
  polarityOf(transformation[2]),
  polarityOf(transformation[3]),
  polarityOf(transformation[4]),
  polarityOf(transformation[5]),
]

/** Each Line Value with its Line Position, bottom-up. */
const positioned = (
  transformation: Transformation,
): readonly (readonly [LinePosition, LineValue])[] => {
  const [first, second, third, fourth, fifth, sixth] = transformation
  return [
    [1, first],
    [2, second],
    [3, third],
    [4, fourth],
    [5, fifth],
    [6, sixth],
  ]
}

/** The Hexagram's structure, copied field by field from its row (ADR-0025). */
const structureOf = (hexagram: Hexagram): HexagramStructure => {
  const row = lookUpRow(hexagram)
  return {
    hexagram,
    lowerTrigram: row.lowerTrigram,
    upperTrigram: row.upperTrigram,
    nuclearHexagram: row.nuclearHexagram,
    inverseHexagram: row.inverseHexagram,
    reversedHexagram: row.reversedHexagram,
  }
}

/** 乾 and 坤, the only Hexagrams with an All-Moving Statement. */
const isPureYangOrYin = (figure: Figure): boolean =>
  figure.every((polarity) => polarity === figure[0])

/**
 * The Applicable Passages in order: the Standing Hexagram Statement, the
 * Moving Lines' Line Statements bottom-up, the All-Moving Statement when all
 * six Lines of 乾 or 坤 move, then the Emerging Hexagram Statement, which X之X
 * lacks. The order carries no rank (ADR-0024).
 */
const applicablePassagesOf = (
  standing: Hexagram,
  emerging: Hexagram,
  movingLines: readonly LinePosition[],
): readonly PassageReference[] => {
  if (movingLines.length === 0) return [{ hexagram: standing }]
  const allMoving: readonly PassageReference[] =
    movingLines.length === 6 && isPureYangOrYin(standing)
      ? [{ hexagram: standing, line: 'all-moving' }]
      : []
  return [
    { hexagram: standing },
    ...movingLines.map((line) => ({ hexagram: standing, line })),
    ...allMoving,
    { hexagram: emerging },
  ]
}

/**
 * Resolves a Transformation. Its Applicable Passages are every one ADR-0024
 * names, as passage references, never text.
 */
export function resolve(transformation: Transformation): Resolution {
  const standing = figureOf(transformation, standingPolarityOf)
  const emerging = figureOf(transformation, emergingPolarityOf)
  const movingLines = positioned(transformation)
    .filter(([, value]) => isMoving(value))
    .map(([position]) => position)
  return {
    standing: structureOf(standing),
    emerging: structureOf(emerging),
    movingLines,
    applicablePassages: applicablePassagesOf(standing, emerging, movingLines),
  }
}
