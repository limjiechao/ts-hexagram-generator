import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type { ConsultationStore } from '#src/consultation-store.js'
import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

/**
 * What use case 9 gives back: the Typst source of the export and how many
 * Consultations it holds, or that no Consultation matched the filter. With
 * none there is no source, since a document holds at least one Readout.
 */
export type ExportedConsultations =
  | {
      readonly outcome: 'exported'
      /** How many Readouts the source holds; at least 1. */
      readonly consultations: number
      readonly typst: string
    }
  | { readonly outcome: 'none-matching' }

/**
 * Use case 9, Export Consultations: the Typst source of a Readout of each
 * Consultation whose Query matches the filter, in the browse list's order,
 * in the Reading Preference given. It lists the Store through use case 4,
 * so the filter means what the browse list's filter means, and an empty
 * filter keeps every Consultation; Unreadable files are left out and not
 * counted. Each Readout is built as every other Readout is: use case 3
 * resolves the Transformation and use case 8 looks up the names, both with
 * this preference, one lookup at a time, so the first failure stops every
 * later one. `presentation` renders the Readouts as one Typst document. It
 * never writes to the Store. A Store or Catalogue failure rejects the
 * Promise unchanged. Compiling the source to PDF is an adapter's effect
 * (ADR-0037).
 */
export function exportConsultations(
  ports: {
    readonly consultationStore: ConsultationStore
    readonly scriptureCatalogue: ScriptureCatalogue
  },
  filter: string,
  preference: ReadingPreference,
): Promise<ExportedConsultations> {
  throw new Error('not built', { cause: { ports, filter, preference } })
}
