import type { DivinedAt } from '@hexagram/consultation-journal/divined-at'
import type { Query } from '@hexagram/consultation-journal/query'
import type { RecordedConsultation } from '@hexagram/consultation-journal/recorded-consultation'
import type { Transformation } from '@hexagram/oracle/transformation'

import type { Clock } from '#src/clock.js'
import { buildConsultationId } from '#src/consultation-id-builder.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import type { RandomSource } from '#src/random-source.js'

/**
 * Use case 2, Record a Consultation: keeps a Recorded Consultation, divined
 * elsewhere, and returns it. Divined At is as entered, never the Clock's;
 * the Clock and the Random Source only build its Consultation Id, a ULID
 * (ADR-0046). A Store failure rejects the Promise unchanged. A Clock or
 * Random Source failure, or a Moment a ULID cannot hold, rejects it before
 * anything is kept.
 */
export async function recordConsultation(
  ports: {
    readonly consultationStore: ConsultationStore
    readonly clock: Clock
    readonly randomSource: RandomSource
  },
  query: Query,
  divinedAt: DivinedAt,
  transformation: Transformation,
): Promise<RecordedConsultation> {
  const consultation: RecordedConsultation = {
    origin: 'recorded',
    id: buildConsultationId(
      ports.clock.now().epochMilliseconds,
      ports.randomSource,
    ),
    query,
    divinedAt,
    transformation,
  }
  await ports.consultationStore.keep(consultation)
  return consultation
}
