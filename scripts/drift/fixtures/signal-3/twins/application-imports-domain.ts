// Linted as overhaul/application/src/application-imports-domain.ts

// Twin for B6: application may import the four domain packages.
import type { Query } from '@hexagram/consultation-journal/query'
import type { Pick } from '@hexagram/oracle/pick'
import type { choosePick } from '@hexagram/remainder-group-policy/choose-pick'
import type { EditionId } from '@hexagram/scripture-catalogue/edition-id'

export type UseCaseQuery = Query
export type UseCasePick = Pick
export type ChoosePick = typeof choosePick
export type UseCaseEditionId = EditionId
