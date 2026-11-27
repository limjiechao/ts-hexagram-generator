import type { LegacyRecord } from '@hexagram/application/import-legacy-files'

/**
 * A file the importer was given, as its adapter read it: the parser reads
 * no file itself, so the CLI and the PWA share it (ADR-0037).
 */
export interface LegacyFile {
  /**
   * The file's name, without its folder. A legacy `.txt` file's name holds
   * its Divined At, as `consultation-YYYY-MM-DDTHH-mm-ss±HHMM.txt`; the
   * extension tells a legacy `.txt` file from a version-1 `.md` one.
   */
  readonly name: string
  /** The file's text, decoded as UTF-8. */
  readonly text: string
}

/**
 * Where a parsed record's Casting came from, for the import's report: why a
 * legacy file has no usable Casting is the importer's concern, never the
 * Journal's (ADR-0026).
 *
 * - `replays`: the file's Picks replay from the Empty Casting to its
 *   Transformation, so it is a Cast Consultation's.
 * - `none`: the file holds no Casting (a legacy file with no table, or a
 *   version-1 file with `casting: null`), so it is a Recorded
 *   Consultation's.
 * - `does-not-replay`: the file holds a Casting that does not replay to its
 *   Transformation, or a stored stalk count that disagrees with the replay,
 *   or one that cannot be read, so it is a Recorded Consultation's.
 */
export type LegacyCasting = 'replays' | 'none' | 'does-not-replay'

/**
 * Why a legacy or version-1 file cannot be imported: a closed list, so each
 * channel words it its own way.
 *
 * - `no-frontmatter`: a `.md` file with no frontmatter to hold a record.
 * - `not-yaml`: a `.md` file whose frontmatter is not YAML.
 * - `not-version-1`: a `.md` file whose record is not a mapping with
 *   `schemaVersion` `1`, other than a version-2 one.
 * - `invalid-field`: the file gives no valid value for the named field of a
 *   Consultation: `divinedAt` from a legacy file's name or a version-1
 *   `timestamp`; `query`, which must not be blank; `transformation` from a
 *   legacy file's Line Values or a version-1 `hexagram`.
 */
export type LegacyUnreadableReason =
  | { readonly kind: 'no-frontmatter' }
  | { readonly kind: 'not-yaml' }
  | { readonly kind: 'not-version-1' }
  | {
      readonly kind: 'invalid-field'
      readonly field: 'divinedAt' | 'query' | 'transformation'
    }

/**
 * What a file holds: a record use case 7 keeps, with where its Casting came
 * from; nothing to import; or why it cannot be imported.
 */
export type LegacyParseResult =
  | {
      readonly outcome: 'parsed'
      readonly record: LegacyRecord
      readonly casting: LegacyCasting
    }
  | { readonly outcome: 'not-legacy' }
  | { readonly outcome: 'unreadable'; readonly reason: LegacyUnreadableReason }

/**
 * Reads one file the importer was given (ADR-0026, ADR-0037):
 *
 * - a name ending `.txt` is a legacy file: its Query, its six Line Values
 *   and, when it has one, its Casting table, in either of its two layouts;
 *   its Divined At is the Moment its name holds, with no milliseconds;
 * - a name ending `.md` is a version-1 file when its frontmatter's
 *   `schemaVersion` is `1`: its `timestamp` is the Divined At, its
 *   `hexagram` mapping, keyed `L6` to `L1`, the Transformation, and its
 *   `casting`, when not null, the Picks, each Line's stalk counts checked
 *   against the replay; a version-2 file is `not-legacy`, so the Journal's
 *   own files are never imported or moved;
 * - any other name is `not-legacy`.
 *
 * A Casting that replays from the Empty Casting, by the Oracle's Divisions,
 * to the file's Transformation makes a Cast Consultation's record; any
 * other file that parses makes a Recorded Consultation's, from the file's
 * Transformation alone. No Casting is ever invented (ADR-0026). The Query
 * is the text the file holds, less only the spaces its layout puts around
 * it. It never throws.
 */
export function parseLegacyFile(file: LegacyFile): LegacyParseResult {
  throw new Error('not built', { cause: file })
}
