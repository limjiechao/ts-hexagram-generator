import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { ConsultationId } from '@hexagram/consultation-journal/consultation-id'
import type { DeletionRecord } from '@hexagram/consultation-journal/deletion-record'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'

/**
 * The driven port for one Journal: its Consultations and its Deletion
 * Records (ADR-0037). A kept Consultation is never edited, only removed.
 */
export interface ConsultationStore {
  /**
   * Keeps a new Consultation. Keeping an Id the Store already holds does
   * nothing, since the same Id always means the same content (ADR-0030);
   * with `remove`, this keeps Merging Journals symmetric and idempotent
   * (ADR-0037).
   */
  readonly keep: (consultation: Consultation) => Promise<void>
  /**
   * Every Consultation the Store holds, and every stored record that failed
   * to load as one. Filtering by Query is the use case's work, not the
   * Store's.
   */
  readonly list: () => Promise<{
    readonly consultations: readonly Consultation[]
    readonly unreadable: readonly UnreadableFile[]
  }>
  /**
   * The Consultation with this Id, or `undefined` when there is none; an
   * Unreadable file is reported only by `list`.
   */
  readonly get: (id: ConsultationId) => Promise<Consultation | undefined>
  /**
   * Deletes the Consultation the record names and keeps the record, so that
   * Merging Journals does not bring it back. The caller stamps the record.
   * The record is kept even when the Id was never held or is already
   * deleted, so removing twice is the same as removing once.
   */
  readonly remove: (record: DeletionRecord) => Promise<void>
  /** The Journal's Deletion Records, for Merging Journals. */
  readonly deletionRecords: () => Promise<readonly DeletionRecord[]>
}
