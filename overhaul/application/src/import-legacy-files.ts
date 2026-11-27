import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type {
  DivinedAt,
  Moment,
} from '@hexagram/consultation-journal/divined-at'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import type { Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import type { Transformation } from '@hexagram/oracle/transformation'

import type { Clock } from '#src/clock.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { notImplemented } from '#src/not-implemented.js'
import type { RandomSource } from '#src/random-source.js'

/** What every legacy record holds. */
interface LegacyFields {
  readonly query: Query
}

/**
 * A legacy file as the legacy importer parsed it: a complete Casting, which
 * the caller has already replayed, or a Transformation alone (ADR-0026). A
 * Cast Consultation's Divined At is always a Moment (ADR-0046).
 */
export type LegacyRecord =
  | (LegacyFields & {
      readonly divinedAt: Moment
      readonly casting: CompleteCasting
    })
  | (LegacyFields & {
      readonly divinedAt: DivinedAt
      readonly casting: undefined
      readonly transformation: Transformation
    })

/**
 * Use case 7, Import legacy files: keeps each record, one with a Casting as a
 * Cast Consultation whose Transformation is copied from the Casting, one
 * without as a Recorded Consultation (ADR-0026), and returns them in the
 * records' order. The one Division Method, which the person importing
 * knows, applies to every Cast Consultation (ADR-0046); it is trusted, as
 * keep trusts it, because a Casting does not record who divided it
 * (ADR-0027). Each kept Consultation gets a new Consultation Id, a ULID built
 * from the Clock and the Random Source (ADR-0046).
 *
 * It reads the Store's Deletion Records once per call, before its first
 * keep. A drawn Id that a Deletion Record names is drawn again, with the
 * same Clock time and 16 fresh draws from the Random Source, so a new
 * Consultation is never born deleted; every record is still kept and
 * returned in order. A failed read rejects the Promise unchanged.
 *
 * The import is a migration, run once: importing the same files twice
 * keeps each of their Consultations twice, under new Ids.
 *
 * It returns the kept Consultations only: every record it is given can be
 * kept, and a file that could not be parsed never becomes a record, so the
 * adapter reports it. A Store failure rejects the Promise unchanged.
 */
export function importLegacyFiles(
  ports: {
    readonly consultationStore: ConsultationStore
    readonly clock: Clock
    readonly randomSource: RandomSource
  },
  records: readonly LegacyRecord[],
  divisionMethod: DivisionMethod,
): Promise<readonly Consultation[]> {
  return notImplemented(ports, records, divisionMethod)
}
