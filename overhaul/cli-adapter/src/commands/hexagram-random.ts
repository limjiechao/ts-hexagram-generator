import {
  CatalogueFailureError,
  namingCatalogueFailure,
} from '#src/commands/catalogue-failure.js'
import type { Command } from '#src/commands/entry-point.js'
import {
  castingMode,
  endWith,
  parseOptions,
  readingPreferenceRules,
  type GivenOptions,
  type OptionRules,
} from '#src/commands/frame.js'
import { notBuiltLine } from '#src/commands/not-built.js'
import { portFailureLine } from '#src/commands/plain-casting-wording.js'
import { randomPlainRun } from '#src/commands/plain-casting.js'
import { readingPreferenceFrom } from '#src/commands/reading-preference-options.js'
import { composeCli } from '#src/composition-root.js'

const rules = {
  '--plain': { value: 'flag', aliases: ['--no-ui'] },
  '--wrap-width': { value: 'whole number' },
  '--numeric-input': { value: 'flag' },
  '--slider-sweep-ms': { value: 'whole number' },
  '--cast-bounce-ms': { value: 'whole number' },
  '--cast-reveal-ms': { value: 'whole number' },
  ...readingPreferenceRules,
} as const satisfies OptionRules

/** The one line `hexagram-random` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-random [--plain | --no-ui] [--wrap-width <n>] [--numeric-input] [--slider-sweep-ms <n>] [--cast-bounce-ms <n>] [--cast-reveal-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

type ReadingOption = keyof typeof readingPreferenceRules

/** The Reading Preference options among the options given. */
function readingOptionsOf(
  given: GivenOptions<typeof rules>,
): GivenOptions<typeof readingPreferenceRules> {
  return new Map(
    [...given].filter((entry): entry is [ReadingOption, readonly string[]] =>
      Object.keys(readingPreferenceRules).includes(entry[0]),
    ),
  )
}

/** `hexagram-random`: cast with Automatic Division. */
export const run: Command = async (argv, io, ports) => {
  const given = parseOptions(argv, rules)
  if (given === undefined) return endWith(io, usage)
  let preference
  try {
    preference = await readingPreferenceFrom(
      // The four ports one by one: spreading `ports` would read the
      // Journal's folder, which nothing before the Query may touch.
      composeCli({
        scriptureCatalogue: namingCatalogueFailure(ports.scriptureCatalogue),
        randomSource: ports.randomSource,
        consultationStore: ports.consultationStore,
        clock: ports.clock,
      }),
      readingOptionsOf(given),
    )
  } catch (error) {
    if (!(error instanceof CatalogueFailureError)) throw error
    return endWith(
      io,
      portFailureLine(
        'hexagram-random',
        'the Scripture Catalogue cannot be read',
      ),
    )
  }
  if (preference === undefined) return endWith(io, usage)
  const mode = castingMode(io, {
    plain: given.has('--plain'),
    numericInput: given.has('--numeric-input'),
  })
  if (mode === 'plain mode') return randomPlainRun(io, ports, preference)
  return endWith(io, notBuiltLine('hexagram-random', mode))
}
