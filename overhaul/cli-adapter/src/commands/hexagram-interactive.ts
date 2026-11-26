import type { Command } from '#src/commands/entry-point.js'

/** The one line `hexagram-interactive` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-interactive [--plain | --no-ui] [--wrap-width <n>] [--numeric-input] [--slider-sweep-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram-interactive`: cast with Virtual Division. */
export const run: Command = (argv, io, ports) => {
  throw new Error('Not implemented', { cause: [argv, io, ports] })
}
