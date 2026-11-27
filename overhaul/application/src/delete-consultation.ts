import type { ConsultationId } from '@hexagram/consultation-journal/consultation-id'

import type { Clock } from '#src/clock.js'
import type { ConsultationStore } from '#src/consultation-store.js'

/**
 * Use case 6, Delete a Consultation: stamps a Deletion Record from the Clock
 * and has the Store remove the Consultation it names. A deletion cannot be
 * undone (ADR-0037). A Store failure rejects the Promise unchanged.
 */
export async function deleteConsultation(
  ports: {
    readonly consultationStore: ConsultationStore
    readonly clock: Clock
  },
  id: ConsultationId,
): Promise<void> {
  await ports.consultationStore.remove({
    consultationId: id,
    deletedAt: ports.clock.now(),
  })
}
