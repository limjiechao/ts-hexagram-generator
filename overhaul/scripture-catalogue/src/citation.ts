import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { LinePosition } from '@hexagram/oracle/line-position'

/**
 * The All-Moving Statement (用九 / 用六), or the 小象 on it. Only 乾 and 坤
 * carry one; the type does not check the Hexagram.
 */
type AllMoving = 'all-moving'

/** A Hexagram Statement of the 周易 經. */
interface HexagramStatementCitation {
  readonly work: 'zhouyi'
  readonly hexagram: Hexagram
  /** Absent, so a Line Statement is never taken for a Hexagram Statement. */
  readonly line?: never
}

/** A Line Statement of the 周易 經, or an All-Moving Statement. */
interface LineStatementCitation {
  readonly work: 'zhouyi'
  readonly hexagram: Hexagram
  readonly line: LinePosition | AllMoving
}

/** The 彖傳 on one Hexagram. */
interface TuanCitation {
  readonly work: 'tuan'
  readonly hexagram: Hexagram
}

/** The 大象 on one Hexagram. */
interface DaxiangCitation {
  readonly work: 'daxiang'
  readonly hexagram: Hexagram
}

/** The 小象 on one Line, or on an All-Moving Statement. */
interface XiaoxiangCitation {
  readonly work: 'xiaoxiang'
  readonly hexagram: Hexagram
  readonly line: LinePosition | AllMoving
}

/** One Hexagram's 文言, cited whole. */
interface WenyanCitation {
  readonly work: 'wenyan'
  readonly hexagram: Hexagram
}

/** The Yilin Verse for one Transformation, X之X included. */
interface YilinCitation {
  readonly work: 'yilin'
  readonly standing: Hexagram
  readonly emerging: Hexagram
}

/**
 * The Edition-independent name of a passage within a Work, built on Oracle
 * identities; every Edition of the Work is aligned to the same Citations.
 * Its string form (e.g. `110010.4`) is only how URLs and files write it
 * (ADR-0038).
 */
export type Citation =
  | HexagramStatementCitation
  | LineStatementCitation
  | TuanCitation
  | DaxiangCitation
  | XiaoxiangCitation
  | WenyanCitation
  | YilinCitation
