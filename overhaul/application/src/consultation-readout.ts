import type { Consultation } from '@hexagram/consultation-journal/consultation'
import {
  consultationReadout,
  hexagramsNamed,
  trigramsNamed,
} from '@hexagram/presentation/build-readout'
import type {
  ConsultationReadout,
  NamedHexagram,
} from '@hexagram/presentation/readout'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'

import {
  lookUpHexagramNames,
  lookUpReceivedSequenceNumber,
  lookUpTrigramNames,
} from '#src/look-up-catalogue.js'
import { resolveTransformation } from '#src/resolve-transformation.js'
import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

/**
 * A Consultation's Readout in the Reading Preference given: use case 3
 * resolves its Transformation, use case 8 looks up the names of each
 * Hexagram and Trigram `presentation` lists, both with the same preference,
 * and `presentation` builds the Readout. It takes the Catalogue port alone,
 * not the composed use cases, so the Store's body renderer can be built
 * from it before the Store exists. A Catalogue failure rejects the Promise
 * unchanged.
 */
export async function consultationReadoutFor(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  consultation: Consultation,
  preference: ReadingPreference,
): Promise<ConsultationReadout> {
  const resolved = await resolveTransformation(
    ports,
    consultation.transformation,
    preference,
  )
  // One lookup at a time, as use case 3 does, so the first rejection stops
  // every later lookup.
  const hexagrams: NamedHexagram[] = []
  for (const hexagram of hexagramsNamed(resolved.resolution)) {
    hexagrams.push({
      hexagram,
      receivedSequenceNumber: await lookUpReceivedSequenceNumber(
        ports,
        hexagram,
      ),
      names: await lookUpHexagramNames(ports, hexagram, preference),
    })
  }
  const trigrams: TrigramName[] = []
  for (const trigram of trigramsNamed(resolved.resolution))
    trigrams.push(...(await lookUpTrigramNames(ports, trigram, preference)))
  return consultationReadout(consultation, resolved, { hexagrams, trigrams })
}
