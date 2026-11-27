import type { Journal } from '@hexagram/consultation-journal/journal'

import type { ConsultationStore } from '#src/consultation-store.js'
import { notImplemented } from '#src/not-implemented.js'

/*
 * Use case 10, Merging Journals: one Journal is exported and merged into
 * another, so merging both ways leaves both Stores holding the same
 * Consultations and Deletion Records (ADR-0037). A Store failure rejects the
 * Promise unchanged.
 */

/**
 * The Journal of this Store: its Consultations and Deletion Records, the
 * records passed through as the Store gives them, several for one Id
 * included. An Unreadable file is not a Consultation, so it is not
 * exported.
 */
export function exportJournal(ports: {
  readonly consultationStore: ConsultationStore
}): Promise<Journal> {
  return notImplemented(ports)
}

/**
 * What a merge changed in this Store, for its report. `added` counts the
 * distinct Consultation Ids it kept that the Store did not hold; `removed`
 * counts the Consultations the Store held that an incoming Deletion Record
 * removed. Merging the same Journal again gives zero for both.
 */
export interface MergeCounts {
  readonly added: number
  readonly removed: number
}

/**
 * Merges another Journal into this Store: it removes each incoming Deletion
 * Record's Consultation, an Id named by several records removed by its
 * earliest `deletedAt` first, then keeps each incoming Consultation that
 * neither Journal's Deletion Records name. Both steps are idempotent
 * (ADR-0037), so merging the same Journal twice is the same as merging it
 * once. The caller has already replayed each incoming Cast Consultation's
 * Casting to its Transformation (ADR-0026) and left out any that did not
 * replay, so every Consultation in the Journal is kept as it is. It
 * resolves to what it changed.
 */
export function mergeJournal(
  ports: { readonly consultationStore: ConsultationStore },
  journal: Journal,
): Promise<MergeCounts> {
  return notImplemented(ports, journal)
}
