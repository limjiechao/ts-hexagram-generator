import type { CompleteCasting } from '@hexagram/oracle/casting'
import type { Transformation } from '@hexagram/oracle/transformation'

import type { ConsultationId } from '#src/consultation-id.js'
import type { Moment } from '#src/divined-at.js'
import type { DivisionMethod } from '#src/division-method.js'
import type { Query } from '#src/query.js'

/**
 * Divined in the app, so its Divined At is always a Moment (ADR-0030). Its
 * Transformation is the one its Casting yields (ADR-0026).
 */
export interface CastConsultation {
  readonly origin: 'cast'
  readonly id: ConsultationId
  readonly query: Query
  readonly divinedAt: Moment
  /** Repeated from its Casting, so every Consultation carries one here. */
  readonly transformation: Transformation
  readonly casting: CompleteCasting
  readonly divisionMethod: DivisionMethod
}
