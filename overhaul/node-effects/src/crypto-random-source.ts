import type { RandomSource } from '@hexagram/application/random-source'

/** The Random Source drawn from `node:crypto` (ADR-0037). */
export const cryptoRandomSource: RandomSource = {
  integerBelow: (bound) => {
    throw new Error('Not implemented', { cause: [bound] })
  },
}
