import type { ConsultationId } from '@hexagram/consultation-journal/consultation-id'
import type { BundleUnreadableReason } from '@hexagram/consultation-journal/journal-bundle'
import type { UnreadableReason } from '@hexagram/consultation-journal/unreadable-file'

/*
 * The words `hexagram-history`'s maintenance runs print. A report's lines go
 * to stdout and the run exits 0, even with files skipped or left out; a
 * refusal or a failure is one line on stderr and exit 1. Counts are
 * written in lower case, as the browse list's title writes them, and a
 * count of one takes the singular.
 */

/**
 * Why a stored record failed to load, as a report words it, after a
 * colon: for example `Left out consultations[3]: its Casting does not
 * replay to its Transformation`. It is the one wording of these
 * reasons, shared with the browse footer's `Cannot open — <reason>`.
 *
 * - `no-frontmatter`: `it has no frontmatter`
 * - `not-yaml`: `its frontmatter is not YAML`
 * - `not-version-2`: `it is not a version-2 record`
 * - `invalid-field`: `its <field> is missing or invalid`, the field by its
 *   record key, such as `divinedAt`
 * - `casting-does-not-replay`: `its Casting does not replay to its
 *   Transformation`
 * - `duplicate-id`: `its Consultation Id is already held by
 *   <firstLocation>`
 */
export function unreadableReasonText(reason: UnreadableReason): string {
  switch (reason.kind) {
    case 'no-frontmatter':
      return 'it has no frontmatter'
    case 'not-yaml':
      return 'its frontmatter is not YAML'
    case 'not-version-2':
      return 'it is not a version-2 record'
    case 'invalid-field':
      return `its ${reason.field} is missing or invalid`
    case 'casting-does-not-replay':
      return 'its Casting does not replay to its Transformation'
    case 'duplicate-id':
      return `its Consultation Id is already held by ${reason.firstLocation}`
  }
}

/**
 * A failure that stops a maintenance run, on stderr before exit 1:
 * `hexagram-history: the Journal cannot be read` when listing the Journal
 * or its Deletion Records fails, and `hexagram-history: the Journal cannot
 * be written` when keeping, removing or moving fails.
 */
export function journalFailureLine(failure: 'read' | 'written'): string {
  return `hexagram-history: the Journal cannot be ${failure}`
}

/**
 * `--export-journal`'s one line, for example `Exported 40 consultations and
 * 2 deletion records to journal.json.`, the file as the user gave it. It
 * counts what the bundle holds: one Deletion Record per Consultation Id,
 * however many the Store keeps for it.
 */
export function exportedLine(
  file: string,
  counts: { readonly consultations: number; readonly deletionRecords: number },
): string {
  return `Exported ${counted(counts.consultations, 'consultation')} and ${counted(counts.deletionRecords, 'deletion record')} to ${file}.`
}

/** A count and its noun, singular for a count of one. */
function counted(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`
}

/**
 * `--export-journal`'s refusal, on stderr before exit 1, when a file
 * already holds the path: `hexagram-history: journal.json already exists`.
 * A bundle is never written over a file.
 */
export function exportTargetExistsLine(file: string): string {
  return `hexagram-history: ${file} already exists`
}

/**
 * `--merge-journal`'s refusal, on stderr before exit 1, when the file
 * cannot be read at all and nothing is merged:
 * `hexagram-history: journal.json cannot be read`.
 */
export function bundleUnreadableLine(file: string): string {
  return `hexagram-history: ${file} cannot be read`
}

/**
 * `--merge-journal`'s refusal, on stderr before exit 1, when the bundle is
 * refused whole and nothing is merged. The CLI reads the file as strict
 * UTF-8, so a byte that is not UTF-8, or a byte-order mark, makes it not
 * a Journal bundle:
 * `hexagram-history: journal.json is not a Journal bundle` when it is not
 * JSON or not a bundle, and `hexagram-history: journal.json has a Deletion
 * Record that cannot be read, deletionRecords[2]` when one does not decode.
 */
export function bundleRefusedLine(
  file: string,
  reason: BundleUnreadableReason,
): string {
  if (reason.kind === 'invalid-deletion-record') {
    return `hexagram-history: ${file} has a Deletion Record that cannot be read, deletionRecords[${String(reason.index)}]`
  }
  return `hexagram-history: ${file} is not a Journal bundle`
}

/**
 * One line for each incoming Consultation a merge leaves out, in the
 * bundle's order, before the summary: `Left out consultations[3]: ` and
 * `unreadableReasonText`'s words.
 */
export function leftOutLine(index: number, reason: UnreadableReason): string {
  return `Left out consultations[${String(index)}]: ${unreadableReasonText(reason)}`
}

/**
 * `--merge-journal`'s summary, for example `Merged journal.json: 3 added,
 * 1 removed by Deletion Records, 1 left out.`, every count shown even when
 * zero.
 */
export function mergedLine(
  file: string,
  counts: {
    readonly added: number
    readonly removed: number
    readonly leftOut: number
  },
): string {
  return `Merged ${file}: ${String(counts.added)} added, ${String(counts.removed)} removed by Deletion Records, ${String(counts.leftOut)} left out.`
}

/**
 * One line for each file an import keeps, in the order the files were
 * read, the path as the user gave it or as found in a folder given:
 *
 * - `Kept old/consultation-2026-03-16T13-28-33+0800.txt as a Cast
 *   Consultation, 01M6E6AHA84T7V2M5N6P0R1S2K`
 * - `Kept … as a Recorded Consultation, <Id>: the file holds no Casting`
 * - `Kept … as a Recorded Consultation, <Id>: its Casting does not replay
 *   to its Transformation`
 */
export function keptLine(
  file: string,
  id: ConsultationId,
  casting: 'replays' | 'none' | 'does-not-replay',
): string {
  throw new Error('not built', { cause: [file, id, casting] })
}

/**
 * One line for each file an import skips, which stays where it is:
 * `Skipped <path>: ` and the reason's words. A file that holds nothing to
 * import, such as a version-2 file, gets no line. The legacy reasons are
 * worded as follows; the function that words them takes `legacy-import`'s
 * reason once `cli-adapter` may import that package:
 *
 * - `no-frontmatter`: `it has no frontmatter`
 * - `not-yaml`: `its frontmatter is not YAML`
 * - `not-version-1`: `it is not a version-1 record`
 * - `invalid-field` `divinedAt`: `it gives no valid Divined At`
 * - `invalid-field` `query`: `it gives no Query`
 * - `invalid-field` `transformation`: `it gives no valid Transformation`
 * - a file that is not a regular file: `it is not a regular file`
 */
export function skippedLine(file: string, reasonText: string): string {
  throw new Error('not built', { cause: [file, reasonText] })
}

/**
 * `--import-legacy`'s summary, for example `Imported 12 of 14 files (9
 * cast, 3 recorded); 2 skipped. Originals moved to legacy/ in the Journal
 * folder.`, every count shown even when zero. A Store failure
 * partway prints the lines of the files already kept, then
 * `journalFailureLine('written')`, and no summary.
 */
export function importedLine(counts: {
  readonly cast: number
  readonly recorded: number
  readonly skipped: number
}): string {
  throw new Error('not built', { cause: counts })
}
