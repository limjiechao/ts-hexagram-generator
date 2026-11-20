import type { Hexagram } from '#src/hexagram.js'
import type { LinePosition } from '#src/line-position.js'
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

/**
 * Resolves a Transformation. Its Applicable Passages are every one ADR-0024
 * names, as passage references, never text.
 */
export function resolve(transformation: Transformation): Resolution {
  // Carries the input as the cause, so the signature keeps its name.
  throw new Error('Not implemented', { cause: [transformation] })
}
