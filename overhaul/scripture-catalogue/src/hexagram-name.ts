import type { Hexagram } from '@hexagram/oracle/hexagram'

import type { Edition } from '#src/edition.js'

/**
 * The name one Edition gives a Hexagram. Names belong to an Edition, never to
 * the Hexagram itself (ADR-0025), so each is labelled with its Edition: the
 * `zhouyi` Edition record of the EditionId that gives it.
 */
export interface HexagramName {
  readonly hexagram: Hexagram
  readonly edition: Edition
  readonly name: string
}
