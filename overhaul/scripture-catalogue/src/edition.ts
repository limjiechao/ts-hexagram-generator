import type { Day } from '@hexagram/consultation-journal/divined-at'

import type { EditionId } from '#src/edition-id.js'
import type { ReadingPreference } from '#src/reading-preference.js'
import type { Work } from '#src/work.js'

/** A Chinese Edition, in the one script its Witness gives. */
interface ScriptEdition {
  readonly script: ReadingPreference['script']
  /** Absent, so an Edition is never in both a script and a language. */
  readonly language?: never
}

/** A Translation, in another language. */
interface LanguageEdition {
  readonly language: string
  /** Absent, so an Edition is never in both a script and a language. */
  readonly script?: never
}

/** The concrete source the text was transcribed from. */
interface Witness {
  readonly description: string
  readonly retrievedOn?: Day
}

/**
 * A published text of a Work, in one script or, for a Translation, in
 * another language. Its licence decides, for the Licence Gate, which channels
 * may show its text. When the Edition behind its Witness cannot be
 * identified, it is labelled unidentified, so its text is kept but never
 * presented as a known Edition.
 */
export type Edition = {
  readonly id: EditionId
  readonly work: Work
  readonly witness: Witness
  readonly unidentified: boolean
  readonly licence: 'public-domain' | 'in-copyright'
} & (ScriptEdition | LanguageEdition)
