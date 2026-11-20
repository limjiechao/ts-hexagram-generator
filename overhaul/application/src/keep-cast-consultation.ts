import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import type { Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'

import type { Clock } from '#src/clock.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { notImplemented } from '#src/not-implemented.js'
import type { RandomSource } from '#src/random-source.js'

/**
 * Use case 1's last step: keeps the Cast Consultation and returns it. Only
 * the Oracle makes a complete Casting, so it is kept without replay. Its
 * Consultation Id is a ULID built from the Clock and the Random Source
 * (ADR-0030), its Divined At is the Clock's Moment, and its Transformation
 * is copied from the Casting. A Store failure rejects the Promise unchanged.
 * It trusts the caller's Division Method, because the Casting does not
 * record who divided it (ADR-0027).
 */
export function keepCastConsultation(
  ports: {
    readonly consultationStore: ConsultationStore
    readonly clock: Clock
    readonly randomSource: RandomSource
  },
  query: Query,
  casting: CompleteCasting,
  divisionMethod: DivisionMethod,
): Promise<CastConsultation> {
  return notImplemented(ports, query, casting, divisionMethod)
}
