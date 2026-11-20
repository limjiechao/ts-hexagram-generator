import type { Polarity } from '#src/figure.js'

/**
 * One of the eight three-line figures (乾 兌 離 震 巽 坎 艮 坤): three
 * Polarities, read bottom-up like a Hexagram's Figure.
 */
export type Trigram = readonly [Polarity, Polarity, Polarity]
