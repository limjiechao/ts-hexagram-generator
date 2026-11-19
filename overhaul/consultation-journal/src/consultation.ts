import type { CastConsultation } from '#src/cast-consultation.js'
import type { RecordedConsultation } from '#src/recorded-consultation.js'

/** A divination kept on record, never edited, only removed. */
export type Consultation = CastConsultation | RecordedConsultation
