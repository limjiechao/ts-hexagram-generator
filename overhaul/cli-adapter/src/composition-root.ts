import {
  lookUpEditions,
  lookUpHexagramNames,
  lookUpPassageTexts,
} from '@hexagram/application/look-up-catalogue'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'

/** A use case with its ports supplied: its signature minus the ports argument. */
type PortsSupplied<UseCase> = UseCase extends (
  ports: never,
  ...inputs: infer Inputs
) => infer Output
  ? (...inputs: Inputs) => Output
  : never

/**
 * The CLI's composition root (ADR-0037): it takes the driven ports and returns
 * use case 8's lookups with those ports supplied.
 */
export function composeCli(ports: {
  readonly scriptureCatalogue: ScriptureCatalogue
}): {
  readonly lookUpPassageTexts: PortsSupplied<typeof lookUpPassageTexts>
  readonly lookUpHexagramNames: PortsSupplied<typeof lookUpHexagramNames>
  readonly lookUpEditions: PortsSupplied<typeof lookUpEditions>
} {
  return {
    lookUpPassageTexts: (citation, preference) =>
      lookUpPassageTexts(ports, citation, preference),
    lookUpHexagramNames: (hexagram, preference) =>
      lookUpHexagramNames(ports, hexagram, preference),
    lookUpEditions: (work) => lookUpEditions(ports, work),
  }
}
