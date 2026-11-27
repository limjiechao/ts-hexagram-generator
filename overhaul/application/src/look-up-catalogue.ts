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

import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

/*
 * Use case 8, Look up the catalogue: one lookup per kind of thing looked up,
 * each returning the Scripture Catalogue's own values: a list, possibly
 * empty, or a Hexagram's one Received Sequence Number. An explicit lookup
 * returns what was asked for, the Licence Gate applying. A Catalogue failure
 * rejects the Promise unchanged.
 */

/** A passage's text, or a Yilin Verse's, in each Edition the preference shows. */
export function lookUpPassageTexts(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  citation: Citation,
  preference: ReadingPreference,
): Promise<readonly PassageText[]> {
  return ports.scriptureCatalogue.passageTexts(citation, preference)
}

/** A Hexagram's name in each Edition the preference shows. */
export function lookUpHexagramNames(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  hexagram: Hexagram,
  preference: ReadingPreference,
): Promise<readonly HexagramName[]> {
  return ports.scriptureCatalogue.hexagramNames(hexagram, preference)
}

/** A Hexagram's Received Sequence Number. */
export function lookUpReceivedSequenceNumber(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  hexagram: Hexagram,
): Promise<ReceivedSequenceNumber> {
  throw new Error('not built', { cause: { ports, hexagram } })
}

/** A Trigram's name and imagery in each Edition the preference shows. */
export function lookUpTrigramNames(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  trigram: Trigram,
  preference: ReadingPreference,
): Promise<readonly TrigramName[]> {
  throw new Error('not built', { cause: { ports, trigram, preference } })
}

/** Every Edition of a Work. */
export function lookUpEditions(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  work: Work,
): Promise<readonly Edition[]> {
  return ports.scriptureCatalogue.editions(work)
}
