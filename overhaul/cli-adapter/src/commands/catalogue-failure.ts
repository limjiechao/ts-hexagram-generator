import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'

/**
 * A failure of the Scripture Catalogue port, so a command's Catalogue line
 * is written for the port's own failures only, and any other error stays an
 * error.
 */
export class CatalogueFailureError extends Error {
  override readonly name = 'CatalogueFailureError'

  constructor(cause: unknown) {
    super('the Scripture Catalogue cannot be read', { cause })
  }
}

/** One lookup, its throw or rejection becoming a `CatalogueFailureError`. */
function naming<Inputs extends unknown[], Output>(
  lookUp: (...inputs: Inputs) => Promise<Output>,
): (...inputs: Inputs) => Promise<Output> {
  return async (...inputs) => {
    try {
      return await lookUp(...inputs)
    } catch (error) {
      throw new CatalogueFailureError(error)
    }
  }
}

/**
 * The Scripture Catalogue, its every failure thrown as a
 * `CatalogueFailureError`. Each lookup is called on the Catalogue, so one
 * that reads `this` still finds it. What a lookup resolves to is passed on
 * as it is, so an error in using it is no failure of the port.
 */
export function namingCatalogueFailure(
  catalogue: ScriptureCatalogue,
): ScriptureCatalogue {
  return {
    passageTexts: naming((...inputs) => catalogue.passageTexts(...inputs)),
    hexagramNames: naming((...inputs) => catalogue.hexagramNames(...inputs)),
    receivedSequenceNumber: naming((...inputs) =>
      catalogue.receivedSequenceNumber(...inputs),
    ),
    trigramNames: naming((...inputs) => catalogue.trigramNames(...inputs)),
    editions: naming((...inputs) => catalogue.editions(...inputs)),
  }
}
