import type { ConsultationId } from '#src/consultation-id.js'
import type { Moment } from '#src/divined-at.js'

/**
 * That a Consultation was deleted: only its Id and when it was deleted
 * remain, so that Merging Journals does not bring it back. Permanent once
 * kept (ADR-0037).
 */
export interface DeletionRecord {
  readonly consultationId: ConsultationId
  readonly deletedAt: Moment
}
