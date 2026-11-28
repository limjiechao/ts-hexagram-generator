import type { ConsultationReadout } from '@hexagram/presentation/readout'
import { typstExport } from '@hexagram/presentation/typst-export'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import { browseConsultations } from '#src/browse-consultations.js'
import { consultationReadoutFor } from '#src/consultation-readout.js'
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
export async function exportConsultations(
  ports: {
    readonly consultationStore: ConsultationStore
    readonly scriptureCatalogue: ScriptureCatalogue
  },
  filter: string,
  preference: ReadingPreference,
): Promise<ExportedConsultations> {
  const { consultations } = await browseConsultations(ports, filter)
  const [first, ...rest] = consultations
  if (first === undefined) return { outcome: 'none-matching' }
  const readouts: [ConsultationReadout, ...ConsultationReadout[]] = [
    await consultationReadoutFor(ports, first, preference),
  ]
  for (const consultation of rest)
    readouts.push(await consultationReadoutFor(ports, consultation, preference))
  return {
    outcome: 'exported',
    consultations: readouts.length,
    typst: typstExport(readouts, preference.script),
  }
}
