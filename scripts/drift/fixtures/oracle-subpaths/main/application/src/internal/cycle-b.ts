// Helper for plant P14: closes the cycle, then value-imports oracle
import { cycleA } from '#src/internal/cycle-a.js'
import { pick } from '@hexagram/oracle/pick'

export const cycleB = (): unknown => [cycleA, pick]
