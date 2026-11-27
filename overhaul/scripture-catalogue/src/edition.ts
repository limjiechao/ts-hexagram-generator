// Reuses `Day` from `consultation-journal`.
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
  /** The name that heads each block of its text, e.g. `Legge`. */
  readonly shortName: string
  /**
   * Its full bibliographic title, as a list of the Editions shown gives it,
   * e.g. `Legge, Sacred Books of the East vol. 16 (Oxford, 1882)`.
   */
  readonly title: string
  readonly witness: Witness
  readonly unidentified: boolean
  /**
   * `public-domain` text may be shown on every channel; `in-copyright` text,
   * and `terms-unverified` text whose Witness's terms for redistribution are
   * not yet checked, on Private Channels only (ADR-0028).
   */
  readonly licence: 'public-domain' | 'in-copyright' | 'terms-unverified'
} & (ScriptEdition | LanguageEdition)
