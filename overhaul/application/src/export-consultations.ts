import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { Resolution } from '@hexagram/oracle/resolution'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'

import { notImplemented } from '#src/not-implemented.js'

/**
 * Use case 9, Export Consultations: the Typst source of a Readout of each
 * Consultation, in the order given. The caller has resolved each one's
 * Transformation, through use case 3 or the engine, so each comes with its
 * Resolution and its passage texts, in the order and the Editions use case
 * 3 gives them. It trusts each Resolution and its passage texts to belong
 * to that Consultation, as keep trusts the caller's Division Method. It
 * reads no Store and no Catalogue, so it takes no ports.
 * Compiling the source to PDF is an adapter's effect.
 */
export function exportConsultations(
  consultations: readonly {
    readonly consultation: Consultation
    readonly resolution: Resolution
    readonly passageTexts: readonly PassageText[]
  }[],
): string {
  return notImplemented(consultations)
}
