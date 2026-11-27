import type { Round } from '#src/round.js'
import type { Transformation } from '#src/transformation.js'

declare const complete: unique symbol

/** The three Rounds that make one Line (三變成爻). */
type LineRounds = readonly [Round, Round, Round]

/** The finished Lines before the unfinished one: none to five. */
type FinishedLines =
  | readonly []
  | readonly [LineRounds]
  | readonly [LineRounds, LineRounds]
  | readonly [LineRounds, LineRounds, LineRounds]
  | readonly [LineRounds, LineRounds, LineRounds, LineRounds]
  | readonly [LineRounds, LineRounds, LineRounds, LineRounds, LineRounds]

/** The unfinished Line's Rounds so far, if it has any: one or two. */
type UnfinishedLine =
  | readonly []
  | readonly [readonly [Round]]
  | readonly [readonly [Round, Round]]

/**
 * A Casting short of its eighteenth Round, held by the caller between
 * Divisions. Its Rounds are grouped by Line, bottom-up, and its type admits
 * only the shapes a Casting passes through on the way to eighteen.
 *
 * The type holds those limits: the Oracle runs no shape check at run time,
 * and replays only the Rounds it is given. Untyped data is the adapter's to
 * reject before it reaches the Oracle, as ADR-0038's strict URLs do.
 */
export interface PartialCasting {
  readonly state: 'partial'
  readonly rounds: readonly [...FinishedLines, ...UnfinishedLine]
}

/**
 * A Casting of all eighteen Rounds, three per Line, bottom-up, and the one
 * Transformation they yield. The Oracle's last Division step makes one, so
 * keeping it needs no replay; a Casting loaded from a Markdown file is
 * replayed to its Transformation, as a file can be edited by hand (ADR-0046).
 * The PWA, which has no Oracle (ADR-0037), makes one from the engine's
 * complete Casting.
 */
export interface CompleteCasting {
  readonly [complete]: true
  readonly state: 'complete'
  readonly rounds: readonly [
    LineRounds,
    LineRounds,
    LineRounds,
    LineRounds,
    LineRounds,
    LineRounds,
  ]
  readonly transformation: Transformation
}

export type Casting = CompleteCasting | PartialCasting
