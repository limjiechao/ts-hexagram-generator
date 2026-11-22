// Helper for plant P14: imports cycle-b, which imports this file back
import { cycleB } from '#src/internal/cycle-b.js'

export const cycleA = (): unknown => cycleB
