import type { Trigram } from '@hexagram/oracle/trigram'

import type { Edition } from '#src/edition.js'

/**
 * The name and imagery one Edition gives a Trigram (e.g. 乾 and 天). Like a
 * Hexagram's name, both belong to an Edition, never to the Trigram itself
 * (ADR-0025), so each is labelled with its Edition: the `zhouyi` Edition
 * record of the EditionId that gives it.
 */
export interface TrigramName {
  readonly trigram: Trigram
  readonly edition: Edition
  readonly name: string
  readonly imagery: string
}
