// Linted as overhaul/catalogue-bundled/src/catalogue-bundled-holds-data.ts
// Twin for B1, B2 and B7: the bundled Catalogue may import application's
// types, read the Oracle's table and admit an EditionId, and stays pure.

import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { hexagramTable } from '@hexagram/oracle/hexagram-table'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'

export type BundledCatalogue = ScriptureCatalogue

export function admits(id: string): boolean {
  return isEditionId(id) && hexagramTable.length === 64
}
