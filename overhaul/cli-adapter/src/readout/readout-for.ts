import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { ConsultationReadout } from '@hexagram/presentation/readout'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

/**
 * A Consultation's Readout in the Reading Preference given: use case 3
 * resolves its Transformation, use case 8 looks up the names of each
 * Hexagram and Trigram `presentation` lists, both with the same preference,
 * and `presentation` builds the Readout. It takes the Catalogue port alone,
 * not the composed use cases, so the Store's body renderer can be built
 * from it before the Store exists. A Catalogue failure rejects the Promise
 * unchanged.
 */
export function consultationReadoutFor(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  consultation: Consultation,
  preference: ReadingPreference,
): Promise<ConsultationReadout> {
  throw new Error('not built', { cause: { ports, consultation, preference } })
}
