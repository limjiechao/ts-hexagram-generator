import type { Command } from '#src/commands/entry-point.js'
import {
  castingMode,
  endWith,
  parseOptions,
  readingPreferenceRules,
  type OptionRules,
} from '#src/commands/frame.js'
import { notBuiltLine } from '#src/commands/not-built.js'
import { interactivePlainRun } from '#src/commands/plain-casting.js'
import { checkedReadingPreference } from '#src/commands/reading-preference-options.js'

const rules = {
  '--plain': { value: 'flag', aliases: ['--no-ui'] },
  '--wrap-width': { value: 'whole number' },
  '--numeric-input': { value: 'flag' },
  '--slider-sweep-ms': { value: 'whole number' },
  ...readingPreferenceRules,
} as const satisfies OptionRules

/** The one line `hexagram-interactive` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-interactive [--plain | --no-ui] [--wrap-width <n>] [--numeric-input] [--slider-sweep-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram-interactive`: cast with Virtual Division. */
export const run: Command = async (argv, io, ports) => {
  const given = parseOptions(argv, rules)
  if (given === undefined) return endWith(io, usage)
  const preference = await checkedReadingPreference(
    io,
    ports,
    { name: 'hexagram-interactive', usage },
    given,
  )
  if (typeof preference === 'number') return preference
  const mode = castingMode(io, {
    plain: given.has('--plain'),
    numericInput: given.has('--numeric-input'),
  })
  if (mode === 'plain mode') return interactivePlainRun(io, ports, preference)
  return endWith(io, notBuiltLine('hexagram-interactive', mode))
}
