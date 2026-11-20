import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { PassageReference } from '@hexagram/oracle/passage-reference'

/**
 * A passage of the 周易 經, named by the Oracle's Passage Reference: a
 * Hexagram Statement, a Line Statement or an All-Moving Statement.
 */
type ZhouyiCitation = { readonly work: 'zhouyi' } & PassageReference

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

/**
 * The 小象 on one Line, or on the All-Moving Statement, named by `line` as a
 * Passage Reference names the passage. Only 乾 and 坤 carry an All-Moving
 * Statement; the type does not check the Hexagram.
 */
interface XiaoxiangCitation {
  readonly work: 'xiaoxiang'
  readonly hexagram: Hexagram
  readonly line: NonNullable<PassageReference['line']>
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
  | ZhouyiCitation
  | TuanCitation
  | DaxiangCitation
  | XiaoxiangCitation
  | WenyanCitation
  | YilinCitation
