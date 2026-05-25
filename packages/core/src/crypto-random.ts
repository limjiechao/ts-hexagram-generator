import { randomInt } from 'node:crypto'

// Drop-in replacement for `Math.random` backed by `node:crypto.randomInt`,
// so callers that need a `[0, 1)` float (e.g. animation RNGs) don't depend
// on V8's pseudorandom generator. `randomInt(min, max)` is exclusive on
// `max`, so the result is always strictly less than 1.
//
// The default `MAX` is 2^48 - 1 — `randomInt`'s maximum safe range and
// also the largest value that divides evenly into a JS double without
// losing precision in the low bits.
export const cryptoRandom = (MIN = 0, MAX = 281_474_976_710_655): number =>
  randomInt(MIN, MAX) / MAX
