// Helper for twin T7: imports cycle-d, which imports this file back
import { cycleD } from '#src/internal/cycle-d.js'

export const cycleC = (): unknown => cycleD
