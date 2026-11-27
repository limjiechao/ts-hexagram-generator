import type { Consultation } from '@hexagram/consultation-journal/consultation'
import type { ConsultationId } from '@hexagram/consultation-journal/consultation-id'

import type { ConsultationStore } from '#src/consultation-store.js'

/**
 * Use case 5, Open a Consultation: loads it, and never writes to the Store
 * (ADR-0037). It returns `undefined` when the Store holds no Consultation with
 * this Id. A Store failure rejects the Promise unchanged. The caller resolves
 * the Consultation's Transformation: the CLI through use case 3, the PWA
 * through the engine.
 */
export function openConsultation(
  ports: { readonly consultationStore: ConsultationStore },
  id: ConsultationId,
): Promise<Consultation | undefined> {
  return ports.consultationStore.get(id)
}
