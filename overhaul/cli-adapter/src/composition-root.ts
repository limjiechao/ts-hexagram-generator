import { beginCasting } from '@hexagram/application/begin-casting'
import { divide } from '@hexagram/application/divide'
import { drawAutomaticPick } from '@hexagram/application/draw-automatic-pick'
import {
  lookUpEditions,
  lookUpHexagramNames,
  lookUpPassageTexts,
} from '@hexagram/application/look-up-catalogue'
import { nextRound } from '@hexagram/application/next-round'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { transcribe } from '@hexagram/application/transcribe'

/** A use case with its ports supplied: its signature minus the ports argument. */
type PortsSupplied<UseCase> = UseCase extends (
  ports: never,
  ...inputs: infer Inputs
) => infer Output
  ? (...inputs: Inputs) => Output
  : never

/**
 * The CLI's composition root (ADR-0037): it takes the driven ports and returns
 * use case 8's lookups and use case 1's Automatic Division step with those
 * ports supplied, and use case 1's steps for a Division by Pick and a Physical
 * Division, which take no ports and so pass through unchanged.
 */
export function composeCli(ports: {
  readonly scriptureCatalogue: ScriptureCatalogue
  readonly randomSource: RandomSource
}): {
  readonly lookUpPassageTexts: PortsSupplied<typeof lookUpPassageTexts>
  readonly lookUpHexagramNames: PortsSupplied<typeof lookUpHexagramNames>
  readonly lookUpEditions: PortsSupplied<typeof lookUpEditions>
  readonly beginCasting: typeof beginCasting
  readonly nextRound: typeof nextRound
  readonly drawAutomaticPick: PortsSupplied<typeof drawAutomaticPick>
  readonly divide: typeof divide
  readonly transcribe: typeof transcribe
} {
  return {
    lookUpPassageTexts: (citation, preference) =>
      lookUpPassageTexts(ports, citation, preference),
    lookUpHexagramNames: (hexagram, preference) =>
      lookUpHexagramNames(ports, hexagram, preference),
    lookUpEditions: (work) => lookUpEditions(ports, work),
    beginCasting,
    nextRound,
    drawAutomaticPick: (remainderGroups) =>
      drawAutomaticPick(ports, remainderGroups),
    divide,
    transcribe,
  }
}
