import { Buffer } from 'node:buffer'
import process from 'node:process'
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
  | { readonly kind: 'error'; readonly error: Error }
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

/**
 * stdin cannot be read, as when it is the null device opened write-only;
 * no end follows.
 */
export const stdinFails = (error: Error): Step => ({ kind: 'error', error })

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
    readonly stdinError: number
    readonly stdoutError: number
    readonly stderrError: number
    readonly interrupt: number
  }
  /** How many times the command paused stdin. */
  readonly pauses: () => number
  /**
   * `Ctrl+C`s that found no listener, which would have killed the process.
   * Each one ends stdin, so the run cannot wait for ever.
   */
  readonly unheardInterrupts: () => number
  /**
   * Stream errors that found no `'error'` listener, which would have thrown
   * in the process.
   */
  readonly unheardErrors: () => number
  /** Fires `Ctrl+C` now, outside the script, at whatever listens. */
  readonly interruptNow: () => void
  /** Emits `'error'` on stdin now, outside the script. */
  readonly stdinFailsNow: (error: Error) => void
  /** Emits `'error'` on stdout now, as a closed pipe (EPIPE) does. */
  readonly stdoutFailsNow: (error: Error) => void
}

/** A listener of any event, called with its event's own arguments. */
type Listener = (value: never) => void

/** Calls each listener with `args`, or counts the event unheard. */
function emit(
  listeners: ReadonlySet<Listener>,
  args: readonly unknown[],
): boolean {
  for (const listener of Array.from(listeners))
    Reflect.apply(listener, undefined, args)
  return listeners.size > 0
}

interface RecordingOutput {
  readonly output: CommandOutput
  readonly errors: Set<Listener>
  /** Whether a write is held, its callback not yet called. */
  readonly holding: () => boolean
  /**
   * Fails the held write: its stream emits `error` on a later turn of the
   * event loop, and only on the turn after that is the write's callback,
   * if it gave one, called with the error.
   */
  readonly failHeldWrite: (error: Error) => void
}

/** A write's callback, as a stream calls it once the chunk is handled. */
type WriteCallback = (error?: Error | null) => void

/**
 * An output that records what is written and calls each write's callback
 * on a later turn of the event loop. Given `failsAfterWrite`, it emits that
 * error on the next tick after its first write. Given `holdsFirstWrite`,
 * the first write's callback waits for `failHeldWrite`. `afterWrite` is
 * called after every write.
 */
function recordingOutput(
  chunks: string[],
  terminal: { readonly isTTY: boolean; readonly columns?: number },
  options: {
    readonly failsAfterWrite?: Error
    readonly holdsFirstWrite?: boolean
    readonly afterWrite?: () => void
    readonly unheard: () => void
  },
): RecordingOutput {
  const errors = new Set<Listener>()
  let failed = false
  let held: { readonly callback: WriteCallback | undefined } | undefined
  let writes = 0
  return {
    errors,
    holding: () => held !== undefined,
    failHeldWrite: (error) => {
      const write = held
      setImmediate(() => {
        if (!emit(errors, [error])) options.unheard()
        setImmediate(() => write?.callback?.(error))
      })
    },
    output: {
      isTTY: terminal.isTTY,
      columns: terminal.columns,
      rows: terminal.isTTY ? 40 : undefined,
      write: (text: string, callback?: WriteCallback) => {
        chunks.push(text)
        writes += 1
        if (options.holdsFirstWrite === true && writes === 1) {
          held = { callback }
        } else if (callback !== undefined) {
          setImmediate(() => {
            callback()
          })
        }
        if (options.failsAfterWrite !== undefined && !failed) {
          failed = true
          const error = options.failsAfterWrite
          process.nextTick(() => {
            if (!emit(errors, [error])) options.unheard()
          })
        }
        options.afterWrite?.()
        return true
      },
      on: (event: 'resize' | 'error', listener: Listener) => {
        if (event === 'error') errors.add(listener)
      },
      off: (event: 'resize' | 'error', listener: Listener) => {
        if (event === 'error') errors.delete(listener)
      },
    },
  }
}

/**
 * A terminal whose stdout is a TTY or not, with the environment given,
 * whose stdin and `Ctrl+C` follow `script`. Given `stdoutFailsAfterWrite`
 * or `stderrFailsAfterWrite`, that stream emits the error on the next
 * tick after its first write. Given `stdoutFailsLate`, stdout holds its
 * first write and fails it once stderr is next written to: the error
 * comes after `write` has returned, and before the write's callback.
 */
export function scriptedTerminal(options: {
  readonly isTTY: boolean
  readonly env?: CommandIo['env']
  readonly script: readonly Step[]
  readonly stdoutFailsAfterWrite?: Error
  readonly stderrFailsAfterWrite?: Error
  readonly stdoutFailsLate?: Error
  /** Whether stdin is a TTY, which echoes what is typed; not, by default. */
  readonly stdinIsTTY?: boolean
}): ScriptedTerminal {
  const stdout: string[] = []
  const stderr: string[] = []
  const data = new Set<Listener>()
  const end = new Set<Listener>()
  const stdinErrors = new Set<Listener>()
  const interrupt = new Set<() => void>()
  const pending = [...options.script]
  let scheduled = false
  let pauses = 0
  let unheard = 0
  let unheardErrors = 0
  const errorUnheard = (): void => {
    unheardErrors += 1
  }

  function deliver(): void {
    scheduled = false
    if (data.size === 0) return
    const step = pending.shift()
    if (step === undefined) return
    switch (step.kind) {
      case 'bytes':
        emit(data, [step.bytes])
        break
      case 'end':
        pending.length = 0
        emit(end, [])
        break
      case 'error':
        pending.length = 0
        if (!emit(stdinErrors, [step.error])) errorUnheard()
        break
      case 'interrupt':
        if (interrupt.size === 0) {
          unheard += 1
          pending.splice(0, pending.length, stdinEnds)
        } else {
          for (const listener of Array.from(interrupt)) listener()
        }
        break
    }
    schedule()
  }

  function schedule(): void {
    if (scheduled || pending.length === 0) return
    scheduled = true
    setImmediate(deliver)
  }

  function stdinListeners(event: 'data' | 'end' | 'error'): Set<Listener> {
    if (event === 'data') return data
    if (event === 'end') return end
    return stdinErrors
  }

  const columns = options.isTTY ? 120 : undefined
  const late = options.stdoutFailsLate
  const out = recordingOutput(
    stdout,
    { isTTY: options.isTTY, columns },
    {
      failsAfterWrite: options.stdoutFailsAfterWrite,
      holdsFirstWrite: late !== undefined,
      unheard: errorUnheard,
    },
  )
  let failedLate = false
  const err = recordingOutput(
    stderr,
    { isTTY: options.isTTY, columns },
    {
      failsAfterWrite: options.stderrFailsAfterWrite,
      afterWrite: () => {
        if (late === undefined || failedLate || !out.holding()) return
        failedLate = true
        out.failHeldWrite(late)
      },
      unheard: errorUnheard,
    },
  )
  const io: CommandIo = {
    stdin: {
      isTTY: options.stdinIsTTY ?? false,
      on: (event: 'data' | 'end' | 'error', listener: Listener) => {
        stdinListeners(event).add(listener)
        schedule()
      },
      off: (event: 'data' | 'end' | 'error', listener: Listener) => {
        stdinListeners(event).delete(listener)
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
    stdout: out.output,
    stderr: err.output,
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
      stdinError: stdinErrors.size,
      stdoutError: out.errors.size,
      stderrError: err.errors.size,
      interrupt: interrupt.size,
    }),
    pauses: () => pauses,
    unheardInterrupts: () => unheard,
    unheardErrors: () => unheardErrors,
    interruptNow: () => {
      for (const listener of Array.from(interrupt)) listener()
    },
    stdinFailsNow: (error) => {
      if (!emit(stdinErrors, [error])) errorUnheard()
    },
    stdoutFailsNow: (error) => {
      if (!emit(out.errors, [error])) errorUnheard()
    },
  }
}
