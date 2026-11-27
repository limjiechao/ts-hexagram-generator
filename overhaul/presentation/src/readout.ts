import type { DivinedAt } from '@hexagram/consultation-journal/divined-at'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import type { Query } from '@hexagram/consultation-journal/query'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { LinePosition } from '@hexagram/oracle/line-position'
import type { LineValue } from '@hexagram/oracle/line-value'
import type { PassageReference } from '@hexagram/oracle/passage-reference'
import type { Remainder } from '@hexagram/oracle/remainder'
import type { SetAside } from '@hexagram/oracle/set-aside'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import type { HexagramName } from '@hexagram/scripture-catalogue/hexagram-name'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { ReceivedSequenceNumber } from '@hexagram/scripture-catalogue/received-sequence-number'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'

/*
 * The Readout as data: what a Readout shows, in the order it shows it, and
 * no medium's bytes. Plain output, the Ink sections and the Markdown body
 * are renderers of it in the CLI adapter, and the Typst export one in this
 * package (ADR-0022: the monospace renderers are the CLI's). Glyphs,
 * colour, headings' wording beyond the labels below, widths and wrapping
 * are each renderer's.
 */

/**
 * A Hexagram with what the Catalogue attaches to it: its Received Sequence
 * Number and its name in each Edition the Reading Preference shows, in that
 * order.
 */
export interface NamedHexagram {
  readonly hexagram: Hexagram
  readonly receivedSequenceNumber: ReceivedSequenceNumber
  readonly names: readonly HexagramName[]
}

/**
 * One Line of a Figure as a Readout shows it. `change` is `moving` for a
 * Moving Line of the Standing Hexagram, `changed` for the Changed Line it
 * becomes in the Emerging Hexagram, and `static` otherwise; X之X has neither.
 * A renderer that colours a Moving or Changed Line also marks it with text,
 * so the meaning survives `NO_COLOR` (ADR-0044).
 */
export interface FigureLine {
  readonly position: LinePosition
  readonly value: LineValue
  readonly change: 'moving' | 'changed' | 'static'
}

/**
 * A Hexagram drawn as its Figure: its names, its six Lines bottom-up
 * (Position 1 first, whatever order a medium draws them in), and its Upper
 * and Lower Trigrams' name and imagery in each Edition shown.
 */
export interface HexagramFigure {
  readonly hexagram: NamedHexagram
  readonly lines: readonly [
    FigureLine,
    FigureLine,
    FigureLine,
    FigureLine,
    FigureLine,
    FigureLine,
  ]
  readonly upperTrigram: readonly TrigramName[]
  readonly lowerTrigram: readonly TrigramName[]
}

/** A Commentary the Reading Preference asks for: one Work's text on a passage. */
export interface CommentaryOnPassage {
  readonly work: ReadingPreference['commentaries'][number]
  /** The Work's name as a heading gives it: 彖傳, 大象, 小象 or 文言. */
  readonly label: string
  /**
   * Its text in each Edition shown, in the preference's order, each block
   * headed by its Edition's short name. Never empty: a Commentary
   * no Edition shown gives is left out.
   */
  readonly texts: readonly PassageText[]
}

/**
 * One Applicable Passage with its text and the Commentaries that follow it,
 * in the Reading Preference's order. 文言 is whole, never split by Line.
 */
export interface PassageShown {
  readonly reference: PassageReference
  /**
   * The passage's name as a heading gives it: 卦辭 for a Hexagram Statement,
   * the Line's traditional name for a Line Statement (初九, 六二, … 上六,
   * from its Line Position and Line Value), 用九 or 用六 for the All-Moving
   * Statement.
   */
  readonly label: string
  /**
   * Its text in each Edition shown: the Chinese in the preference's script,
   * then each Translation in order, each block headed by its Edition's short
   * name. Empty when no Edition shown gives it; a Translation
   * lacking it shows nothing, and no other is put in its place.
   */
  readonly texts: readonly PassageText[]
  readonly commentaries: readonly CommentaryOnPassage[]
}

/**
 * A Hexagram tab: the Hexagram's Figure, its Nuclear, Inverse and Reversed
 * Hexagrams by number and name, as structure only (ADR-0025), then its
 * Applicable Passages. Read across the Standing then the Emerging tab, the
 * passages are in the Resolution's order (ADR-0024): the Standing tab
 * holds the Standing Hexagram's Hexagram Statement, the Moving Lines' Line
 * Statements bottom-up and the All-Moving Statement; the Emerging tab holds
 * the Emerging Hexagram's Hexagram Statement, and none for X之X.
 */
export interface HexagramTab {
  readonly figure: HexagramFigure
  readonly nuclearHexagram: NamedHexagram
  readonly inverseHexagram: NamedHexagram
  readonly reversedHexagram: NamedHexagram
  readonly passages: readonly PassageShown[]
}

/**
 * One Round of the Casting ledger: the stalks it started from, the left
 * heap (the Pick) and the right heap, each counted off in fours to its
 * piles and Remainder, the Hung Stalk taken from the right heap, and the
 * Set-aside. `remainingFours` is the stalks left after the Set-aside,
 * divided by four; on a Line's third Round it equals the Line Value, which
 * `lineValue` then gives, and is otherwise undefined.
 */
export interface LedgerRound {
  readonly line: LinePosition
  readonly round: 1 | 2 | 3
  readonly stalks: number
  readonly leftHeap: number
  readonly leftPiles: number
  readonly leftRemainder: Remainder
  readonly rightHeap: number
  readonly rightPiles: number
  readonly rightRemainder: Remainder
  readonly setAside: SetAside
  readonly remainingFours: number
  readonly lineValue: LineValue | undefined
}

/**
 * The Casting tab. A Cast Consultation's eighteen Rounds as a ledger, from
 * Line 6 at the top to Line 1 at the bottom, each Line's third Round above
 * its first, with its Division Method; a Recorded Consultation shows that it
 * has no Casting.
 */
export type CastingTab =
  | {
      readonly origin: 'cast'
      readonly divisionMethod: DivisionMethod
      readonly rounds: readonly LedgerRound[]
    }
  | { readonly origin: 'recorded' }

/**
 * The Readout of a Transformation, cast or chosen: the Transformation tab
 * (the Standing and Emerging Hexagrams side by side), the two Hexagram tabs,
 * the Yilin Verse when the preference asks for it, and the closing list of
 * Editions shown, each with its Witness.
 */
export interface TransformationReadout {
  readonly transformation: {
    readonly standing: HexagramFigure
    readonly emerging: HexagramFigure
  }
  readonly standing: HexagramTab
  readonly emerging: HexagramTab
  /** Its text in each Edition shown; empty when not asked for or not held. */
  readonly yilinVerse: readonly PassageText[]
  /**
   * Each Edition whose text or names the Readout shows, once per EditionId,
   * in the order it first appears (the names, then the passages with their
   * Commentaries, then the Yilin Verse), each given as the record in which
   * its EditionId first appears, a Commentary's or the Yilin Verse's where
   * that comes first. A renderer lists each with its title, its Witness's
   * description, which carries any conversion label, and "unidentified"
   * where it applies.
   */
  readonly editions: readonly Edition[]
}

/**
 * The Readout of a Consultation: the Query shown above the tabs, its
 * Divined At, the Casting tab, then the Transformation's Readout.
 */
export interface ConsultationReadout extends TransformationReadout {
  readonly query: Query
  readonly divinedAt: DivinedAt
  readonly casting: CastingTab
}
