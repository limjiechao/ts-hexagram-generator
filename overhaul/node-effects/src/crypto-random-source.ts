import { randomInt } from 'node:crypto'

import type { RandomSource } from '@hexagram/application/random-source'

/**
 * The Random Source drawn from `node:crypto` (ADR-0037). `randomInt` rejects
 * draws that would bias the result, so every bound is uniform, and its range
 * may reach 2⁴⁸, well past the port's 2³².
 */
export const cryptoRandomSource: RandomSource = {
  integerBelow: (bound) => randomInt(bound),
}
