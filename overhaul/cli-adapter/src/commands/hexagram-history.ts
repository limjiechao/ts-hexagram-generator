import type { Command } from '#src/commands/entry-point.js'

/** The one line `hexagram-history` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-history [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin] [--export <path> [--filter <text>]] | --import-legacy [<path>...] --division-method physical|virtual|automatic | --rerender-bodies | --export-journal <file> | --merge-journal <file>'

/** `hexagram-history`: browse, open and delete, and the maintenance options. */
export const run: Command = (argv, io, ports) => {
  throw new Error('Not implemented', { cause: [argv, io, ports] })
}
