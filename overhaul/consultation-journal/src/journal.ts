import type { Consultation } from '#src/consultation.js'
import type { DeletionRecord } from '#src/deletion-record.js'

/**
 * The Consultations of one Consultation Store, together with its Deletion
 * Records, as one Journal hands them to another when Merging Journals
 * (ADR-0037).
 */
export interface Journal {
  readonly consultations: readonly Consultation[]
  readonly deletionRecords: readonly DeletionRecord[]
}
