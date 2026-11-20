import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'

import type { ConsultationStore } from '#src/consultation-store.js'
import { notImplemented } from '#src/not-implemented.js'

/**
 * Use case 4, Browse Consultations: the Consultations whose Query matches the
 * filter, ordered by Divined At, and every Unreadable file. The filter is
 * the list's transient search text, not a Query; an empty filter keeps every
 * Consultation. The use case filters, not the Store. A Store failure rejects
 * the Promise unchanged.
 */
export function browseConsultations(
  ports: { readonly consultationStore: ConsultationStore },
  filter: string,
): Promise<{
  readonly consultations: readonly Consultation[]
  readonly unreadable: readonly UnreadableFile[]
}> {
  return notImplemented(ports, filter)
}
