import { isEditionId } from '#src/edition-id.js'
import type { ReadingPreference } from '#src/reading-preference.js'

/**
 * The glossary's default Reading Preference: Traditional script, Legge's
 * Translation, the 大象 and 小象, and no Yilin Verse. Legge's EditionId comes
 * through `isEditionId`, so it would drop out, never pass unchecked, if its
 * slug were malformed.
 */
export const defaultReadingPreference: ReadingPreference = {
  script: 'traditional',
  translations: ['legge-1882'].filter(isEditionId),
  commentaries: ['daxiang', 'xiaoxiang'],
  yilinVerse: false,
}
