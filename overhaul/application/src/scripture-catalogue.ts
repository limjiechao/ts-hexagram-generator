import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { Trigram } from '@hexagram/oracle/trigram'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import type { HexagramName } from '@hexagram/scripture-catalogue/hexagram-name'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { ReceivedSequenceNumber } from '@hexagram/scripture-catalogue/received-sequence-number'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'
import type { Work } from '@hexagram/scripture-catalogue/work'

/**
 * The driven port for the Scripture Catalogue's texts, names and Editions
 * (ADR-0037). The adapter applies the reader's Reading Preference, then the
 * Licence Gate for the channel it is built for; gated or missing text is
 * omitted, never substituted, so a lookup may return an empty list.
 * The preference's `yilinVerse` and `commentaries` shape what a reading
 * shows, not an explicit lookup: a `yilin` Citation always asks for its Yilin
 * Verse, and a Commentary's Citation for its text. The Licence Gate still
 * applies to both.
 */
export interface ScriptureCatalogue {
  /**
   * The Citation's text in each Edition the preference shows: the Chinese in
   * its script, then each Translation in order. A Translation the Catalogue
   * does not hold shows nothing, as one lacking the passage does.
   */
  readonly passageTexts: (
    citation: Citation,
    preference: ReadingPreference,
  ) => Promise<readonly PassageText[]>
  /** The Hexagram's name in each Edition the preference shows, in the same order. */
  readonly hexagramNames: (
    hexagram: Hexagram,
    preference: ReadingPreference,
  ) => Promise<readonly HexagramName[]>
  /**
   * The Hexagram's place in the received text's order. It names no Edition
   * and no Licence Gate applies: it is not text, and it is the same in every
   * Edition the Catalogue holds.
   */
  readonly receivedSequenceNumber: (
    hexagram: Hexagram,
  ) => Promise<ReceivedSequenceNumber>
  /**
   * The Trigram's name and imagery in each Edition the preference shows, in
   * the same order as a Hexagram's names.
   */
  readonly trigramNames: (
    trigram: Trigram,
    preference: ReadingPreference,
  ) => Promise<readonly TrigramName[]>
  /**
   * Every Edition of the Work. The Licence Gate hides an Edition's text, never
   * the Edition itself.
   */
  readonly editions: (work: Work) => Promise<readonly Edition[]>
}
