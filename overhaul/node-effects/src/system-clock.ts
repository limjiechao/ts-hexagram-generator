import type { Clock } from '@hexagram/application/clock'

/** The Clock read from the system clock, in the system's UTC offset (ADR-0037). */
export const systemClock: Clock = {
  now: () => {
    throw new Error('Not implemented')
  },
}
