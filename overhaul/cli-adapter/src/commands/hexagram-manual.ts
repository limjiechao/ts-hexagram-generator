import type { Command } from '#src/commands/entry-point.js'

/** The one line `hexagram-manual` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-manual [--wrap-width <n>] [--manual-reveal-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram-manual`: cast with Physical Division. */
export const run: Command = (argv, io, ports) => {
  throw new Error('Not implemented', { cause: [argv, io, ports] })
}
