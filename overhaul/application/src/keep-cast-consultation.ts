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
 * (ADR-0046), its Divined At is the Clock's Moment, and its Transformation
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

/*
 * Use case 1's last step, split in two so the Cast Consultation exists
 * before it is kept: a Readout can show it, Divined At included, before the
 * Journal is written, and stays shown when the keep fails. Once ratified,
 * the two below replace `keepCastConsultation` above, and the second takes
 * its name.
 */

/**
 * Builds the Cast Consultation from a complete Casting, without keeping
 * it. It does no replay (ADR-0026). It reads the Clock once: that Moment is
 * the Divined At and the time of the Consultation Id, a ULID whose random
 * part comes from the Random Source (ADR-0046). Its Transformation is
 * copied from the Casting, and it trusts the caller's Division Method,
 * because the Casting does not record who divided it (ADR-0027). A Clock
 * or Random Source failure, or a Moment a ULID cannot hold, throws.
 */
export function buildCastConsultation(
  ports: {
    readonly clock: Clock
    readonly randomSource: RandomSource
  },
  query: Query,
  casting: CompleteCasting,
  divisionMethod: DivisionMethod,
): CastConsultation {
  throw new Error('not built', {
    cause: { ports, query, casting, divisionMethod },
  })
}

/**
 * Keeps a Cast Consultation `buildCastConsultation` built, exactly as
 * built: it reads neither the Clock nor the Random Source, so the Divined
 * At a Readout showed is the one kept. A Store failure rejects the Promise
 * unchanged. Keeping it again is keeping an Id the Journal already holds,
 * which does nothing, so a failed keep may be retried.
 */
export function keepBuiltCastConsultation(
  ports: { readonly consultationStore: ConsultationStore },
  consultation: CastConsultation,
): Promise<void> {
  throw new Error('not built', { cause: { ports, consultation } })
}
