import type { Command } from '#src/commands/entry-point.js'

/** The one line `hexagram-random` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-random [--plain | --no-ui] [--wrap-width <n>] [--numeric-input] [--slider-sweep-ms <n>] [--cast-bounce-ms <n>] [--cast-reveal-ms <n>] [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram-random`: cast with Automatic Division. */
export const run: Command = (argv, io, ports) => {
  throw new Error('Not implemented', { cause: [argv, io, ports] })
}
