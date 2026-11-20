import type { Hexagram } from '#src/hexagram.js'
import type { LinePosition } from '#src/line-position.js'

/** A Hexagram's Hexagram Statement (卦辭). */
interface HexagramStatementReference {
  readonly hexagram: Hexagram
  /** Absent, so a Line Statement is never taken for a Hexagram Statement. */
  readonly line?: never
}

/** The Line Statement (爻辭) of one Line Position of a Hexagram. */
interface LineStatementReference {
  readonly hexagram: Hexagram
  readonly line: LinePosition
}

/**
 * The All-Moving Statement (用九 / 用六). Only 乾 and 坤 carry one; the type
 * does not check the Hexagram.
 */
interface AllMovingStatementReference {
  readonly hexagram: Hexagram
  readonly line: 'all-moving'
}

/**
 * The Oracle's name for a 經 passage, never its text; the Scripture
 * Catalogue's 周易 Citations conform to it.
 */
export type PassageReference =
  | HexagramStatementReference
  | LineStatementReference
  | AllMovingStatementReference
