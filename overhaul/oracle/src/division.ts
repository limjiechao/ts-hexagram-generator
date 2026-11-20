import type { Casting, PartialCasting } from '#src/casting.js'
import type { LinePosition } from '#src/line-position.js'
import type { Pick } from '#src/pick.js'
import type { Remainder } from '#src/remainder.js'

/** ADR-0038's Empty Casting: no Rounds yet, so the next Round has 49 stalks. */
export const emptyCasting: PartialCasting = { state: 'partial', rounds: [] }

/**
 * What a person reads off the heaps after a Physical Division: the piles of
 * four and the Remainder on each side. Any field may be absent, as the step
 * checks that the Transcription is complete.
 */
export interface Transcription {
  readonly pilesLeft: number | undefined
  readonly remainderLeft: number | undefined
  readonly pilesRight: number | undefined
  readonly remainderRight: number | undefined
}

/**
 * The rule a Division broke: ADR-0023's valid Pick, one of ADR-0038's
 * Transcription checks (complete, Remainders 1–4, conservation, Set-aside),
 * or `replay` when the incoming partial Casting's Picks do not replay.
 */
export type DivisionRule =
  | 'valid-pick'
  | 'complete'
  | 'remainders'
  | 'conservation'
  | 'set-aside'
  | 'replay'

/**
 * Why a Division was not taken, naming what ADR-0038's `422` names, except
 * the valid range, which `nextRound` gives. The Pick is absent when an
 * incomplete Transcription yields none. A `replay` refusal names the first
 * Round that fails to replay, with its recorded Line, Round and stalks.
 */
export interface Refusal {
  readonly line: LinePosition
  readonly round: 1 | 2 | 3
  readonly stalks: number
  readonly pick: Pick | undefined
  readonly rule: DivisionRule
}

/** The next Casting, complete after the eighteenth Round, or a refusal. */
export type DivisionResult =
  | { readonly outcome: 'divided'; readonly casting: Casting }
  | { readonly outcome: 'refused'; readonly refusal: Refusal }

/**
 * The Round a partial Casting awaits, in ADR-0038's JSON shape: its stalks,
 * its valid Picks 1 to stalks − 2 (ADR-0023), and those Picks grouped by the
 * left Remainder they leave.
 */
export interface NextRound {
  readonly stalks: number
  readonly validPicks: { readonly min: Pick; readonly max: Pick }
  readonly remainderGroups: Readonly<Record<Remainder, readonly Pick[]>>
}

/** The Round a partial Casting awaits, or a refusal. */
export type NextRoundResult =
  | { readonly outcome: 'next'; readonly round: NextRound }
  | {
      readonly outcome: 'refused'
      readonly refusal: Refusal & { readonly rule: 'replay' }
    }

/**
 * Gives the Round a partial Casting awaits. It first replays the Casting's
 * Picks and refuses, with rule `replay`, a Casting that does not replay.
 */
export function nextRound(casting: PartialCasting): NextRoundResult {
  return notImplemented(casting)
}

/**
 * Takes the next Round from a Pick. It first replays the incoming partial
 * Casting's Picks and refuses, with rule `replay`, a Casting that does not
 * replay.
 */
export function divide(casting: PartialCasting, pick: Pick): DivisionResult {
  return notImplemented(casting, pick)
}

/**
 * Takes the next Round from a Transcription. It first replays the incoming
 * partial Casting's Picks and refuses, with rule `replay`, a Casting that
 * does not replay.
 */
export function transcribe(
  casting: PartialCasting,
  transcription: Transcription,
): DivisionResult {
  return notImplemented(casting, transcription)
}

/** Carries the inputs as the cause, so each signature keeps its names. */
function notImplemented(...inputs: readonly unknown[]): never {
  throw new Error('Not implemented', { cause: inputs })
}
