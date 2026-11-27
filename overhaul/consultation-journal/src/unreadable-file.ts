/**
 * A field of the version-2 record (ADR-0046) other than `schemaVersion`,
 * which a wrong or missing value makes `not-version-2` instead.
 */
export type RecordField =
  | 'id'
  | 'divinedAt'
  | 'query'
  | 'transformation'
  | 'casting'
  | 'divisionMethod'

/**
 * Why a stored record failed to load as a Consultation: a closed list, so
 * every channel words each reason its own way.
 *
 * - `no-frontmatter`: the file has no frontmatter to hold a record.
 * - `not-yaml`: the frontmatter is not YAML.
 * - `not-version-2`: the record is not a mapping whose `schemaVersion` is
 *   `2`, a version-1 file among them (ADR-0046).
 * - `invalid-field`: the named field is missing, or holds a value the
 *   record does not allow, including `casting` without `divisionMethod` or
 *   the reverse, and a Day as a Cast Consultation's Divined At.
 * - `casting-does-not-replay`: the Casting's Picks do not replay from the
 *   Empty Casting to its Transformation (ADR-0026, ADR-0046).
 * - `duplicate-id`: a second stored record holding a Consultation Id the
 *   Store has already read; `firstLocation` is where the first one is.
 *
 * The first two and the last arise in a Store; the codec reports the other
 * three.
 */
export type UnreadableReason =
  | { readonly kind: 'no-frontmatter' }
  | { readonly kind: 'not-yaml' }
  | { readonly kind: 'not-version-2' }
  | { readonly kind: 'invalid-field'; readonly field: RecordField }
  | { readonly kind: 'casting-does-not-replay' }
  | { readonly kind: 'duplicate-id'; readonly firstLocation: string }

/**
 * A stored record that failed to load as a Consultation: not a
 * Consultation, but a candidate that failed to become one, counted and
 * shown separately.
 */
export interface UnreadableFile {
  /** Where the record is, in the Consultation Store's own terms. */
  readonly location: string
  /** Why it failed to load. */
  readonly reason: UnreadableReason
}
