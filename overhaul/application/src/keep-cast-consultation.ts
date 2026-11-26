import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import type { Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'

import type { Clock } from '#src/clock.js'
import { buildConsultationId } from '#src/consultation-id-builder.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import type { RandomSource } from '#src/random-source.js'

/**
 * Use case 1's last step: keeps the Cast Consultation and returns it. It
 * takes only a complete Casting and does no replay (ADR-0026). Its
 * Consultation Id is a ULID built from the Clock and the Random Source
 * (ADR-0030), its Divined At is the Clock's Moment, and its Transformation
 * is copied from the Casting. A Store failure rejects the Promise unchanged.
 * It trusts the caller's Division Method, because the Casting does not
 * record who divided it (ADR-0027). It reads the Clock once, so the Id's time
 * and Divined At are the same Moment, and a Clock or Random Source failure, or
 * a Moment a ULID cannot hold, rejects the Promise before anything is kept.
 */
export async function keepCastConsultation(
  ports: {
    readonly consultationStore: ConsultationStore
    readonly clock: Clock
    readonly randomSource: RandomSource
  },
  query: Query,
  casting: CompleteCasting,
  divisionMethod: DivisionMethod,
): Promise<CastConsultation> {
  const divinedAt = ports.clock.now()
  const consultation: CastConsultation = {
    origin: 'cast',
    id: buildConsultationId(divinedAt.epochMilliseconds, ports.randomSource),
    query,
    divinedAt,
    transformation: casting.transformation,
    casting,
    divisionMethod,
  }
  await ports.consultationStore.keep(consultation)
  return consultation
}
