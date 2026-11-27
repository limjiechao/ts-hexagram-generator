import type { ConsultationId } from '#src/consultation-id.js'
import type { Consultation } from '#src/consultation.js'
import type { DeletionRecord } from '#src/deletion-record.js'
import type { Journal } from '#src/journal.js'
import {
  decodeDeletionRecord,
  decodeRecord,
  encodeDeletionRecord,
  encodeRecord,
} from '#src/record-codec.js'
import type { UnreadableReason } from '#src/unreadable-file.js'

/**
 * The format name a Journal bundle opens with, so a file that merely holds
 * JSON is not read as one.
 */
export const journalBundleFormat = 'hexagram-journal'

/**
 * The bundle's own version, apart from the records' `schemaVersion`: a
 * bundle of another version is refused whole (ADR-0046's strict refusal of
 * unknown versions).
 */
export const journalBundleVersion = 1

/**
 * An incoming Consultation a bundle held that did not load, left out of the
 * Journal and reported, while the rest of the bundle merges (ADR-0026).
 * `index` is its place in the bundle's `consultations` array. Its reason is
 * one `decodeRecord` gives, or `duplicate-id` for a later record holding an
 * Id an earlier one held, whose `firstLocation` is `consultations[<index>]`.
 */
export interface LeftOutRecord {
  readonly index: number
  readonly reason: UnreadableReason
}

/**
 * Why a whole bundle is refused, so nothing in it is merged:
 *
 * - `not-json`: the text does not parse as JSON.
 * - `not-a-bundle`: it is not an object whose `format` is
 *   `journalBundleFormat`, whose `version` is `journalBundleVersion`, and
 *   whose `consultations` and `deletionRecords` are arrays.
 * - `invalid-deletion-record`: the Deletion Record at `index` does not
 *   decode; leaving it out could bring a deleted Consultation back
 *   (ADR-0037), so the bundle is refused instead.
 */
export type BundleUnreadableReason =
  | { readonly kind: 'not-json' }
  | { readonly kind: 'not-a-bundle' }
  | { readonly kind: 'invalid-deletion-record'; readonly index: number }

/** A bundle's Journal and what it left out, or why the bundle is refused. */
export type JournalBundleDecodeResult =
  | {
      readonly outcome: 'decoded'
      readonly journal: Journal
      readonly leftOut: readonly LeftOutRecord[]
    }
  | { readonly outcome: 'unreadable'; readonly reason: BundleUnreadableReason }

/**
 * A Journal as the bundle's text (ADR-0037): the one JSON file that
 * `--export-journal` writes and `--merge-journal` reads, and the PWA writes
 * and reads too, so its bytes are fixed and shared. It is an object with,
 * in this order, `format`, `version`, `consultations` (each Consultation's
 * version-2 record as `encodeRecord` gives it) and `deletionRecords` (each
 * as `encodeDeletionRecord` gives it). Consultations are sorted by `id`
 * and Deletion Records by `consultationId`, both in code-point order, so
 * one Journal always gives the same bytes whatever order its Store listed
 * them in. It writes at most one Deletion Record per Consultation Id: of
 * several naming one Id, the earliest `deletedAt` by instant, a tie going
 * to the record whose encoded text is smaller in code-point order. It is
 * indented by two spaces, as `JSON.stringify` indents, with a final
 * newline. It never fails, within the limit `encodeRecord` states for a
 * Moment.
 */
export function encodeJournalBundle(journal: Journal): string {
  const consultations = journal.consultations
    .map(encodeRecord)
    .toSorted((left, right) => compareCodePoints(left.id, right.id))
  const deletionRecords = earliestDeletionRecords(journal.deletionRecords)
    .map(encodeDeletionRecord)
    .toSorted((left, right) =>
      compareCodePoints(left.consultationId, right.consultationId),
    )
  const bundle = {
    format: journalBundleFormat,
    version: journalBundleVersion,
    consultations,
    deletionRecords,
  }
  return `${JSON.stringify(bundle, null, 2)}\n`
}

/**
 * Reads a bundle's text. Each Consultation is loaded by `decodeRecord`, so
 * each Cast Consultation's Casting is replayed to its Transformation
 * (ADR-0026); one that does not load is left out with its reason, and so is
 * a later record holding an Id already loaded. Every Deletion Record must
 * decode, or the whole bundle is refused. Deletion Records naming one Id
 * more than once are accepted and all kept in the Journal. It accepts
 * records and Deletion Records in any order and any JSON layout, and
 * ignores fields it does not name. It never throws.
 */
export function decodeJournalBundle(text: string): JournalBundleDecodeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { outcome: 'unreadable', reason: { kind: 'not-json' } }
  }
  if (!isBundle(parsed)) {
    return { outcome: 'unreadable', reason: { kind: 'not-a-bundle' } }
  }
  const deletionRecords: DeletionRecord[] = []
  for (const [index, data] of parsed.deletionRecords.entries()) {
    const decoded = decodeDeletionRecord(data)
    if (decoded.outcome !== 'decoded') {
      return {
        outcome: 'unreadable',
        reason: { kind: 'invalid-deletion-record', index },
      }
    }
    deletionRecords.push(decoded.deletionRecord)
  }
  const consultations: Consultation[] = []
  const leftOut: LeftOutRecord[] = []
  const firstIndexOf = new Map<ConsultationId, number>()
  for (const [index, record] of parsed.consultations.entries()) {
    const decoded = decodeRecord(record)
    if (decoded.outcome !== 'decoded') {
      leftOut.push({ index, reason: decoded.reason })
      continue
    }
    const { consultation } = decoded
    const firstIndex = firstIndexOf.get(consultation.id)
    if (firstIndex !== undefined) {
      leftOut.push({
        index,
        reason: {
          kind: 'duplicate-id',
          firstLocation: `consultations[${String(firstIndex)}]`,
        },
      })
      continue
    }
    firstIndexOf.set(consultation.id, index)
    consultations.push(consultation)
  }
  return {
    outcome: 'decoded',
    journal: { consultations, deletionRecords },
    leftOut,
  }
}

/** A parsed bundle whose header and arrays are checked, its records not. */
interface ParsedBundle {
  readonly consultations: readonly unknown[]
  readonly deletionRecords: readonly unknown[]
}

function isBundle(value: unknown): value is ParsedBundle {
  return (
    typeof value === 'object' &&
    value !== null &&
    'format' in value &&
    value.format === journalBundleFormat &&
    'version' in value &&
    value.version === journalBundleVersion &&
    'consultations' in value &&
    Array.isArray(value.consultations) &&
    'deletionRecords' in value &&
    Array.isArray(value.deletionRecords)
  )
}

/** Of the Deletion Records naming each Id, the one the bundle writes. */
function earliestDeletionRecords(
  deletionRecords: readonly DeletionRecord[],
): readonly DeletionRecord[] {
  const earliest = new Map<ConsultationId, DeletionRecord>()
  for (const candidate of deletionRecords) {
    const kept = earliest.get(candidate.consultationId)
    if (kept === undefined || isEarlier(candidate, kept)) {
      earliest.set(candidate.consultationId, candidate)
    }
  }
  return [...earliest.values()]
}

function isEarlier(candidate: DeletionRecord, kept: DeletionRecord): boolean {
  const difference =
    candidate.deletedAt.epochMilliseconds - kept.deletedAt.epochMilliseconds
  if (difference !== 0) return difference < 0
  // Both name one Id, so their encoded texts differ only in `deletedAt`.
  return (
    compareCodePoints(
      encodeDeletionRecord(candidate).deletedAt,
      encodeDeletionRecord(kept).deletedAt,
    ) < 0
  )
}

/**
 * Code-point order. The default string order compares UTF-16 code units,
 * which differs from it beyond the Basic Multilingual Plane.
 */
function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (point) => point.codePointAt(0) ?? 0)
  const rightPoints = Array.from(right, (point) => point.codePointAt(0) ?? 0)
  const length = Math.min(leftPoints.length, rightPoints.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0)
    if (difference !== 0) return difference
  }
  return leftPoints.length - rightPoints.length
}
