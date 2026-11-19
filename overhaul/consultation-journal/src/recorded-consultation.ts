import type { Transformation } from '@hexagram/oracle/transformation'

import type { ConsultationId } from '#src/consultation-id.js'
import type { DivinedAt } from '#src/divined-at.js'
import type { Query } from '#src/query.js'

/** Divined elsewhere and entered from its Transformation; it has no Casting (ADR-0026). */
export interface RecordedConsultation {
  readonly origin: 'recorded'
  readonly id: ConsultationId
  readonly query: Query
  readonly divinedAt: DivinedAt
  readonly transformation: Transformation
}
