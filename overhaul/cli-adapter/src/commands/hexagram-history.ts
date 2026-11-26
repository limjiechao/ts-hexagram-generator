import type { Command } from '#src/commands/entry-point.js'
import {
  endWith,
  fullScreenOnlyMode,
  parseOptions,
  readingPreferenceRules,
  terminalRefusal,
  type GivenOptions,
  type OptionRules,
} from '#src/commands/frame.js'
import {
  notBuiltLine,
  type MaintenanceOption,
} from '#src/commands/not-built.js'

const rules = {
  ...readingPreferenceRules,
  '--import-legacy': { value: 'paths' },
  '--division-method': { value: ['physical', 'virtual', 'automatic'] },
  '--rerender-bodies': { value: 'flag' },
  '--export': { value: 'text' },
  '--filter': { value: 'text' },
  '--export-journal': { value: 'text' },
  '--merge-journal': { value: 'text' },
} as const satisfies OptionRules

/** The maintenance options, which exclude each other. */
const maintenanceOptions = [
  '--import-legacy',
  '--rerender-bodies',
  '--export',
  '--export-journal',
  '--merge-journal',
] as const satisfies readonly MaintenanceOption[]

/**
 * Whether an option is given that does not apply to the run asked for:
 * `--division-method` is required with `--import-legacy` and refused
 * elsewhere, `--filter` applies only to `--export`, and the Reading
 * Preference applies only to browsing and `--export`, the runs that produce
 * a Readout.
 */
function refusesWith(
  maintenance: MaintenanceOption | undefined,
  given: GivenOptions<typeof rules>,
): boolean {
  if (given.has('--division-method') !== (maintenance === '--import-legacy'))
    return true
  if (given.has('--filter') && maintenance !== '--export') return true
  const showsReadout = maintenance === undefined || maintenance === '--export'
  return (
    !showsReadout &&
    [...given.keys()].some((option) =>
      Object.keys(readingPreferenceRules).includes(option),
    )
  )
}

/** The one line `hexagram-history` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-history [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin] [--export <path> [--filter <text>]] | --import-legacy [<path>...] --division-method physical|virtual|automatic | --rerender-bodies | --export-journal <file> | --merge-journal <file>'

/** `hexagram-history`: browse, open and delete, and the maintenance options. */
export const run: Command = (argv, io) => {
  const given = parseOptions(argv, rules)
  if (given === undefined) return endWith(io, usage)
  const asked = maintenanceOptions.filter((option) => given.has(option))
  if (asked.length > 1) return endWith(io, usage)
  const [maintenance] = asked
  if (refusesWith(maintenance, given)) return endWith(io, usage)
  if (maintenance !== undefined) {
    return endWith(io, notBuiltLine('hexagram-history', maintenance))
  }
  const mode = fullScreenOnlyMode(io)
  if (mode === undefined)
    return endWith(io, terminalRefusal('hexagram-history'))
  return endWith(io, notBuiltLine('hexagram-history', mode))
}
