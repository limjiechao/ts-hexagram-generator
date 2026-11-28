import { Buffer } from 'node:buffer'
import { setImmediate } from 'node:timers'

import type { CommandIo, CommandOutput } from '#src/commands/entry-point.js'

// A terminal for driving a command in process: stdout and stderr recorded,
// and a stdin and an interrupt that follow a script, as a person or a pipe
// would. Like a child's piped stdin, each step arrives on a later turn of
// the event loop, and only while something reads stdin, so a step waits
// for the command to listen, as a paused stream holds its bytes.

/** One thing the terminal does, in the script's order. */
export type Step =
  | { readonly kind: 'bytes'; readonly bytes: Buffer }
  | { readonly kind: 'end' }
  | { readonly kind: 'interrupt' }

/** Text typed or piped, as UTF-8 bytes in one chunk. */
export const typed = (text: string): Step => ({
  kind: 'bytes',
  bytes: Buffer.from(text, 'utf8'),
})

/** Raw bytes in one chunk, which may end partway through a character. */
export const chunk = (bytes: Buffer): Step => ({ kind: 'bytes', bytes })

/** stdin ends: the pipe closes, or `Ctrl+D` at an empty line. */
export const stdinEnds: Step = { kind: 'end' }

/** `Ctrl+C`, which reaches the process as `SIGINT`, never as a byte. */
export const ctrlC: Step = { kind: 'interrupt' }

export interface ScriptedTerminal {
  readonly io: CommandIo
  readonly stdout: () => string
  readonly stderr: () => string
  /** The listeners still attached, which must be none once a run ends. */
  readonly listening: () => {
    readonly data: number
    readonly end: number
    readonly interrupt: number
  }
  /** How many times the command paused stdin. */
  readonly pauses: () => number
  /**
   * `Ctrl+C`s that found no listener, which would have killed the process.
   * Each one ends stdin, so the run cannot wait for ever.
   */
  readonly unheardInterrupts: () => number
  /** Fires `Ctrl+C` now, outside the script, at whatever listens. */
  readonly interruptNow: () => void
}

function recordingOutput(
  chunks: string[],
  terminal: { readonly isTTY: boolean; readonly columns?: number },
): CommandOutput {
  return {
    isTTY: terminal.isTTY,
    columns: terminal.columns,
    rows: terminal.isTTY ? 40 : undefined,
    write: (text) => {
      chunks.push(text)
      return true
    },
    on: () => {},
    off: () => {},
  }
}

/**
 * A terminal whose stdout is a TTY or not, with the environment given,
 * whose stdin and `Ctrl+C` follow `script`.
 */
export function scriptedTerminal(options: {
  readonly isTTY: boolean
  readonly env?: CommandIo['env']
  readonly script: readonly Step[]
}): ScriptedTerminal {
  const stdout: string[] = []
  const stderr: string[] = []
  const data = new Set<(bytes: Buffer) => void>()
  const end = new Set<(bytes: Buffer) => void>()
  const interrupt = new Set<() => void>()
  const pending = [...options.script]
  let scheduled = false
  let pauses = 0
  let unheard = 0

  function deliver(): void {
    scheduled = false
    if (data.size === 0) return
    const step = pending.shift()
    if (step === undefined) return
    if (step.kind === 'bytes') {
      for (const listener of Array.from(data)) listener(step.bytes)
    } else if (step.kind === 'end') {
      pending.length = 0
      // 'end' carries no argument.
      for (const listener of Array.from(end))
        Reflect.apply(listener, undefined, [])
    } else if (interrupt.size === 0) {
      unheard += 1
      pending.splice(0, pending.length, stdinEnds)
    } else {
      for (const listener of Array.from(interrupt)) listener()
    }
    schedule()
  }

  function schedule(): void {
    if (scheduled || pending.length === 0) return
    scheduled = true
    setImmediate(deliver)
  }

  const columns = options.isTTY ? 120 : undefined
  const io: CommandIo = {
    stdin: {
      isTTY: false,
      on: (event: 'data' | 'end', listener: (bytes: Buffer) => void) => {
        if (event === 'data') data.add(listener)
        else end.add(listener)
        schedule()
      },
      off: (event: 'data' | 'end', listener: (bytes: Buffer) => void) => {
        if (event === 'data') data.delete(listener)
        else end.delete(listener)
      },
      pause: () => {
        pauses += 1
      },
    },
    signals: {
      on: (_event: 'SIGINT', listener: () => void) => {
        interrupt.add(listener)
      },
      off: (_event: 'SIGINT', listener: () => void) => {
        interrupt.delete(listener)
      },
    },
    stdout: recordingOutput(stdout, { isTTY: options.isTTY, columns }),
    stderr: recordingOutput(stderr, { isTTY: options.isTTY, columns }),
    isTTY: options.isTTY,
    rows: options.isTTY ? 40 : undefined,
    columns,
    env: options.env ?? {},
  }

  return {
    io,
    stdout: () => stdout.join(''),
    stderr: () => stderr.join(''),
    listening: () => ({
      data: data.size,
      end: end.size,
      interrupt: interrupt.size,
    }),
    pauses: () => pauses,
    unheardInterrupts: () => unheard,
    interruptNow: () => {
      for (const listener of Array.from(interrupt)) listener()
    },
  }
}
