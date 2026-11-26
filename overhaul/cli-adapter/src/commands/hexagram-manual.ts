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
  '--manual-reveal-ms': { value: 'whole number' },
  ...readingPreferenceRules,
} as const satisfies OptionRules

/** The fewest rows the Physical Division form fits in (ADR-0011). */
const minimumRows = 32

/** The one line `hexagram-manual` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-manual [--wrap-width <n>] [--manual-reveal-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram-manual`: cast with Physical Division. */
export const run: Command = (argv, io) => {
  if (parseOptions(argv, rules) === undefined) return endWith(io, usage)
  const mode = fullScreenOnlyMode(io)
  if (mode === undefined) return endWith(io, terminalRefusal('hexagram-manual'))
  if (io.rows !== undefined && io.rows < minimumRows) {
    return endWith(
      io,
      `hexagram-manual needs a terminal at least ${minimumRows} rows tall; yours is ${io.rows}`,
    )
  }
  return endWith(io, notBuiltLine('hexagram-manual', mode))
}
