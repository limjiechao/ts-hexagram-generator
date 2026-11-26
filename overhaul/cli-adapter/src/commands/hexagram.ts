import type { Command } from '#src/commands/entry-point.js'

/** The one line `hexagram` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram [--wrap-width <n>] [--numeric-input] [--slider-sweep-ms <n>] [--cast-bounce-ms <n>] [--cast-reveal-ms <n>] [--manual-reveal-ms <n>] [--banner-interval-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram`: Home. */
export const run: Command = (argv, io, ports) => {
  throw new Error('Not implemented', { cause: [argv, io, ports] })
}
