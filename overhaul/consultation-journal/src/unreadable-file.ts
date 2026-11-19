/**
 * A stored record that failed to load as a Consultation: not a
 * Consultation, but a candidate that failed to become one, counted and
 * shown separately.
 */
export interface UnreadableFile {
  /** Where the record is, in the Consultation Store's own terms. */
  readonly location: string
  /** Why it failed to load, written for people. */
  readonly reason: string
}
