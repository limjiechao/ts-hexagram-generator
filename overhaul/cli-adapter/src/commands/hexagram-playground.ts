import type { Command } from '#src/commands/entry-point.js'

/** The one line `hexagram-playground` prints to stderr on an unknown option or a bad value. */
export const usage =
  'usage: hexagram-playground [--script traditional|simplified] [--translation <edition>]... [--commentary <work>]... [--yilin]'

/** `hexagram-playground`: explore a Transformation. */
export const run: Command = (argv, io, ports) => {
  throw new Error('Not implemented', { cause: [argv, io, ports] })
}
