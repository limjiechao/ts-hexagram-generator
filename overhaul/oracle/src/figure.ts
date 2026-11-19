export type Polarity = 'yin' | 'yang'

/**
 * The six polarities of a Hexagram, read bottom-up, so index 0 is Line
 * Position 1. A Hexagram's only identity (ADR-0025).
 */
export type Figure = readonly [
  Polarity,
  Polarity,
  Polarity,
  Polarity,
  Polarity,
  Polarity,
]
