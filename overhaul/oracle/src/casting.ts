import type { Round } from '#src/round.js'
import type { Transformation } from '#src/transformation.js'

declare const complete: unique symbol

/** The three Rounds that make one Line (三變成爻). */
type LineRounds = readonly [Round, Round, Round]

/**
 * A Casting short of its eighteenth Round, held by the caller between
 * Divisions. Its Rounds are grouped by Line, bottom-up: every Line but the
 * last holds three, the last one to three, and an empty Casting none.
 */
export interface PartialCasting {
  readonly state: 'partial'
  readonly rounds: readonly (readonly Round[])[]
}

/**
 * A Casting of all eighteen Rounds, three per Line, bottom-up, and the one
 * Transformation they yield. The Oracle's last Division step makes one, so
 * keeping it needs no replay; a Casting loaded from a Markdown file is
 * replayed to its Transformation, as a file can be edited by hand (ADR-0030).
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
