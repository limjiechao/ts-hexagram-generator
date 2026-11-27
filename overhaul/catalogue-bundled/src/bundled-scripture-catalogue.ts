import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'

/**
 * The Scripture Catalogue from bundled literal data, for a Private Channel
 * (ADR-0028, ADR-0032). It reads no file, so the CLI and the REST engine
 * share it (ADR-0037).
 *
 * For a Reading Preference, the Chinese Edition shown is the one in the
 * preference's script; then each of its Translations the Catalogue holds,
 * in the preference's order. The Licence Gate then applies, per Edition:
 * every Edition may be shown on a Private Channel, so it omits nothing here.
 * A passage, name or Edition the data lacks is left out, never substituted.
 * Today no Edition prints the 文言 or the 焦氏易林, so their lookups find no
 * text.
 */
export const bundledScriptureCatalogue: ScriptureCatalogue = {
  passageTexts: (citation, preference) => {
    throw new Error('not built', { cause: { citation, preference } })
  },
  hexagramNames: (hexagram, preference) => {
    throw new Error('not built', { cause: { hexagram, preference } })
  },
  receivedSequenceNumber: (hexagram) => {
    throw new Error('not built', { cause: { hexagram } })
  },
  trigramNames: (trigram, preference) => {
    throw new Error('not built', { cause: { trigram, preference } })
  },
  editions: (work) => {
    throw new Error('not built', { cause: { work } })
  },
}
