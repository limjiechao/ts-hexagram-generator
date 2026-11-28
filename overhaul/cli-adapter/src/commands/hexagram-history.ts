import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'

import type { Command } from '#src/commands/entry-point.js'
import { exportFormatOf, exportRun } from '#src/commands/export-run.js'
import {
  endWith,
  fullScreenOnlyMode,
  parseOptions,
  readingPreferenceRules,
  terminalRefusal,
  type GivenOptions,
  type OptionRules,
} from '#src/commands/frame.js'
import { importLegacyRun } from '#src/commands/import-legacy-run.js'
import {
  exportJournalRun,
  mergeJournalRun,
} from '#src/commands/journal-bundle-runs.js'
import { notBuiltLine } from '#src/commands/not-built.js'
import { checkedReadingPreference } from '#src/commands/reading-preference-options.js'
import { rerenderBodiesRun } from '#src/commands/rerender-bodies-run.js'

const divisionMethods = [
  'physical',
  'virtual',
  'automatic',
] as const satisfies readonly DivisionMethod[]

function isDivisionMethod(value: string | undefined): value is DivisionMethod {
  return divisionMethods.some((method) => method === value)
}

const rules = {
  ...readingPreferenceRules,
  '--import-legacy': { value: 'paths' },
  '--division-method': { value: divisionMethods },
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
] as const

type MaintenanceOption = (typeof maintenanceOptions)[number]

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
export const run: Command = async (argv, io, ports) => {
  const given = parseOptions(argv, rules)
  if (given === undefined) return endWith(io, usage)
  const asked = maintenanceOptions.filter((option) => given.has(option))
  if (asked.length > 1) return endWith(io, usage)
  const [maintenance] = asked
  if (refusesWith(maintenance, given)) return endWith(io, usage)
  const [exportFile] = given.get('--export-journal') ?? []
  if (exportFile !== undefined) return exportJournalRun(exportFile, io, ports)
  const [mergeFile] = given.get('--merge-journal') ?? []
  if (mergeFile !== undefined) return mergeJournalRun(mergeFile, io, ports)
  if (maintenance === '--rerender-bodies') {
    return rerenderBodiesRun(io, ports.rerenderBodies)
  }
  if (maintenance === '--export') {
    const [target = ''] = given.get('--export') ?? []
    const format = exportFormatOf(target)
    if (format === undefined) return endWith(io, usage)
    const preference = await checkedReadingPreference(
      io,
      ports,
      { name: 'hexagram-history', usage },
      given,
    )
    if (typeof preference === 'number') return preference
    const [filter = ''] = given.get('--filter') ?? []
    return exportRun(
      target,
      format,
      filter,
      preference,
      io,
      ports,
      ports.compilePdf,
    )
  }
  const importPaths = given.get('--import-legacy')
  const [divisionMethod] = given.get('--division-method') ?? []
  if (importPaths !== undefined && isDivisionMethod(divisionMethod)) {
    return importLegacyRun(importPaths, divisionMethod, io, ports)
  }
  if (maintenance !== undefined) {
    return endWith(io, notBuiltLine('hexagram-history', maintenance))
  }
  const mode = fullScreenOnlyMode(io)
  if (mode === undefined)
    return endWith(io, terminalRefusal('hexagram-history'))
  return endWith(io, notBuiltLine('hexagram-history', mode))
}
