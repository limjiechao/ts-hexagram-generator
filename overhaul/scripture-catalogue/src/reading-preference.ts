import type { EditionId } from '#src/edition-id.js'
import type { Work } from '#src/work.js'

/**
 * What the person viewing wants shown with a Resolution. It belongs to the
 * viewer, never to a Consultation, and the Licence Gate applies after it.
 */
export interface ReadingPreference {
  /** The Chinese script, never converted from the other (see Edition). */
  readonly script: 'traditional' | 'simplified'
  /** Translations to show, in order; one lacking a passage shows nothing. */
  readonly translations: readonly EditionId[]
  /** Commentaries, from the 十翼 Works, to show with each Applicable Passage. */
  readonly commentaries: readonly Extract<
    Work,
    'tuan' | 'daxiang' | 'xiaoxiang' | 'wenyan'
  >[]
  /** Whether to show the Transformation's Yilin Verse. */
  readonly yilinVerse: boolean
}
