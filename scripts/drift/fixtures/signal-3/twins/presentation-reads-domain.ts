// Linted as overhaul/presentation/src/presentation-reads-domain.ts
// Twin for B1, B2 and B5: presentation may load the whole of oracle,
// consultation-journal and scripture-catalogue, and stays pure.

import { localDate } from '@hexagram/consultation-journal/divined-at'
import { resolve } from '@hexagram/oracle/resolution'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'

export const readoutParts = { localDate, resolve, defaultReadingPreference }
