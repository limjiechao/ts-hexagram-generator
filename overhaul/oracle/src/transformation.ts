import type { LineValue } from '#src/line-value.js'

/**
 * One of the 4,096 outcomes of a divination: six Line Values, read bottom-up,
 * so index 0 is Line Position 1. With no Moving Line it is the identity X之X.
 */
export type Transformation = readonly [
  LineValue,
  LineValue,
  LineValue,
  LineValue,
  LineValue,
  LineValue,
]
