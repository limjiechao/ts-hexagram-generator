import type { Moment } from '@hexagram/consultation-journal/divined-at'

/** The driven port for the current moment (ADR-0037). */
export interface Clock {
  /** The current instant, with the UTC offset it is read in. */
  readonly now: () => Moment
}
