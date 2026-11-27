// Linted as overhaul/legacy-import/src/legacy-import-replays.ts
// Twin for B1, B2 and B7: the legacy import may import application's types,
// call the Oracle and use the Journal's guards, and stays pure.

import type { LegacyRecord } from '@hexagram/application/import-legacy-files'
import { isConsultationId } from '@hexagram/consultation-journal/consultation-id'
import { isQuery } from '@hexagram/consultation-journal/query'
import { divide, emptyCasting } from '@hexagram/oracle/division'

export type ParsedRecord = LegacyRecord

export function firstRoundDivides(pick: number): boolean {
  return divide(emptyCasting, pick).outcome === 'divided'
}

export function admits(query: string, id: string): boolean {
  return isQuery(query) && isConsultationId(id)
}
