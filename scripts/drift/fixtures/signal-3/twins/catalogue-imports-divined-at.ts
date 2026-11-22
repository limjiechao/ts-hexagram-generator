// Linted as overhaul/scripture-catalogue/src/catalogue-imports-divined-at.ts

// Twin for B5: scripture-catalogue may import oracle and
// consultation-journal's `divined-at`.
import type { Day } from '@hexagram/consultation-journal/divined-at'
import type { Pick } from '@hexagram/oracle/pick'

export type RetrievedOn = Day
export type CataloguePick = Pick
