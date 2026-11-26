import type { Command } from '#src/commands/entry-point.js'
import {
  endWith,
  fullScreenOnlyMode,
  parseOptions,
  readingPreferenceRules,
  terminalRefusal,
  type OptionRules,
} from '#src/commands/frame.js'
import { notBuiltLine } from '#src/commands/not-built.js'

const rules = {
  '--wrap-width': { value: 'whole number' },
  '--numeric-input': { value: 'flag' },
  '--slider-sweep-ms': { value: 'whole number' },
  '--cast-bounce-ms': { value: 'whole number' },
  '--cast-reveal-ms': { value: 'whole number' },
  '--manual-reveal-ms': { value: 'whole number' },
  '--banner-interval-ms': { value: 'whole number' },
  ...readingPreferenceRules,
} as const satisfies OptionRules

/** The one line `hexagram` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram [--wrap-width <n>] [--numeric-input] [--slider-sweep-ms <n>] [--cast-bounce-ms <n>] [--cast-reveal-ms <n>] [--manual-reveal-ms <n>] [--banner-interval-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram`: Home. */
export const run: Command = (argv, io) => {
  if (parseOptions(argv, rules) === undefined) return endWith(io, usage)
  const mode = fullScreenOnlyMode(io)
  if (mode === undefined) return endWith(io, terminalRefusal('hexagram'))
  return endWith(io, notBuiltLine('hexagram', mode))
}
