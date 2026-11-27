import type { Consultation } from '@hexagram/consultation-journal/consultation'
import { encodeRecord } from '@hexagram/consultation-journal/record-codec'
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
    // The record writes a Day as `YYYY-MM-DD` and a Moment as its date-time
    // in its own offset, so its first ten characters are the row's local
    // date, and they compare as text in date order.
    date: encodeRecord(consultation).divinedAt.slice(0, 10),
  }))
  return keyed
    .toSorted(ascending)
    .toReversed()
    .map(({ consultation }) => consultation)
}

function ascending(
  left: { readonly consultation: Consultation; readonly date: string },
  right: { readonly consultation: Consultation; readonly date: string },
): number {
  return (
    compare(left.date, right.date) ||
    compare(withinDate(left.consultation), withinDate(right.consultation)) ||
    compare(left.consultation.id, right.consultation.id)
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
 * code-point order for the ASCII of a date or a Consultation Id.
 */
function compare<Value extends string | number>(
  left: Value,
  right: Value,
): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}
