/**
 * The driven port for uniform random integers (ADR-0037). Only integers
 * cross it; the Remainder-Group policy that turns them into a Pick lives
 * outside it (ADR-0023).
 */
export interface RandomSource {
  /**
   * An integer from 0 to `bound − 1`, each equally likely. The caller
   * guarantees that `bound` is a positive integer no greater than 2³²; the
   * port does not check it.
   */
  readonly integerBelow: (bound: number) => number
}
