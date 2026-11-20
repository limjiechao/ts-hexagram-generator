import type { Resolution } from '@hexagram/oracle/resolution'
import type { Transformation } from '@hexagram/oracle/transformation'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import { notImplemented } from '#src/not-implemented.js'
import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

/**
 * Use case 3, Resolve a Transformation: the Oracle's Resolution, and the text
 * of its Applicable Passages in each Edition the preference shows, together
 * with the Commentaries and the Yilin Verse the preference asks for. Each
 * passage text carries its Citation. `passageTexts` holds the Resolution's
 * Applicable Passages in order, each followed by its Commentaries, then the
 * Yilin Verse; the order carries no rank (ADR-0024). A Catalogue failure
 * rejects the Promise unchanged.
 */
export function resolveTransformation(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  transformation: Transformation,
  preference: ReadingPreference,
): Promise<{
  readonly resolution: Resolution
  readonly passageTexts: readonly PassageText[]
}> {
  return notImplemented(ports, transformation, preference)
}
