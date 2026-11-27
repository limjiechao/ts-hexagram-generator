import type { Journal } from '#src/journal.js'
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
  throw new Error('not built', { cause: journal })
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
  throw new Error('not built', { cause: text })
}
