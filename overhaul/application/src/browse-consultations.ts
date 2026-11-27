import type { Consultation } from '@hexagram/consultation-journal/consultation'
import { localDate, type Day } from '@hexagram/consultation-journal/divined-at'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'

import type { ConsultationStore } from '#src/consultation-store.js'

/**
 * Use case 4, Browse Consultations: the Consultations whose Query matches the
 * filter, ordered by Divined At, and every Unreadable file. The filter is
 * the list's transient search text, not a Query; an empty filter keeps every
 * Consultation. The use case filters, not the Store. A Store failure rejects
 * the Promise unchanged.
 */
export async function browseConsultations(
  ports: { readonly consultationStore: ConsultationStore },
  filter: string,
): Promise<{
  readonly consultations: readonly Consultation[]
  readonly unreadable: readonly UnreadableFile[]
}> {
  const { consultations, unreadable } = await ports.consultationStore.list()
  const wanted = filter.toLowerCase()
  const matching = consultations.filter((consultation) =>
    consultation.query.toLowerCase().includes(wanted),
  )
  return { consultations: newestFirst(matching), unreadable }
}

/**
 * Sorts ascending on (date in the row's own offset, a Day after that date's
 * Moments, instant, Consultation Id) and reverses, so the newest is first
 * and ties go to the larger Id. The date leads because across offsets
 * ordering by instant alone and putting a Day above its date's Moments
 * would form a cycle.
 */
function newestFirst(
  consultations: readonly Consultation[],
): readonly Consultation[] {
  const keyed = consultations.map((consultation) => ({
    consultation,
    date: localDate(consultation.divinedAt),
  }))
  return keyed
    .toSorted(ascending)
    .toReversed()
    .map(({ consultation }) => consultation)
}

function ascending(
  left: { readonly consultation: Consultation; readonly date: Day },
  right: { readonly consultation: Consultation; readonly date: Day },
): number {
  return (
    compareDays(left.date, right.date) ||
    compare(withinDate(left.consultation), withinDate(right.consultation)) ||
    compare(left.consultation.id, right.consultation.id)
  )
}

/**
 * Calendar order: year, then month, then day. A Moment's date is the one its
 * wall clock reads in its own offset, so rows compare by local date.
 */
function compareDays(left: Day, right: Day): number {
  return (
    compare(left.year, right.year) ||
    compare(left.month, right.month) ||
    compare(left.day, right.day)
  )
}

/** Ascending, a Day sorts after every Moment of its date; Moments sort by instant. */
function withinDate(consultation: Consultation): number {
  const { divinedAt } = consultation
  return divinedAt.precision === 'day'
    ? Number.POSITIVE_INFINITY
    : divinedAt.epochMilliseconds
}

/**
 * Numeric order for numbers; for text, UTF-16 code-unit order, which is
 * code-point order for the ASCII of a Consultation Id.
 */
function compare<Value extends string | number>(
  left: Value,
  right: Value,
): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}
