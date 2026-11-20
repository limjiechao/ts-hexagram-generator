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
 * The Journal of this Store: its Consultations and Deletion Records. An
 * Unreadable file is not a Consultation, so it is not exported.
 */
export function exportJournal(ports: {
  readonly consultationStore: ConsultationStore
}): Promise<Journal> {
  return notImplemented(ports)
}

/**
 * Merges another Journal into this Store: it removes each incoming Deletion
 * Record's Consultation, then keeps each incoming Consultation that neither
 * Journal's Deletion Records name. Both steps are idempotent (ADR-0037), so
 * merging the same Journal twice is the same as merging it once. The caller
 * has already replayed each incoming Cast Consultation's Casting to its
 * Transformation (ADR-0026) and left out any that did not replay, so every
 * Consultation in the Journal is kept as it is.
 */
export function mergeJournal(
  ports: { readonly consultationStore: ConsultationStore },
  journal: Journal,
): Promise<void> {
  return notImplemented(ports, journal)
}
