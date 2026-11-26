import type { Buffer } from 'node:buffer'

import type { composeCli } from '#src/composition-root.js'

/** What a command may end with: 0 on a normal ending, 1 on a refusal or an error. */
export type ExitCode = 0 | 1

/**
 * The stdin a command reads: only what it uses, so the process's stdin and a
 * test's fake both fit.
 */
export interface CommandInput {
  readonly isTTY?: boolean
  readonly setRawMode?: (mode: boolean) => unknown
  readonly on: (
    event: 'data',
    listener: (chunk: string | Buffer) => void,
  ) => unknown
  readonly off: (
    event: 'data',
    listener: (chunk: string | Buffer) => void,
  ) => unknown
}

/**
 * A stdout or stderr a command writes to: only what it uses, so the process's
 * streams and a test's fake both fit.
 */
export interface CommandOutput {
  readonly isTTY?: boolean
  readonly columns?: number
  readonly rows?: number
  readonly write: (chunk: string) => unknown
  readonly on: (event: 'resize', listener: () => void) => unknown
  readonly off: (event: 'resize', listener: () => void) => unknown
}

/**
 * The terminal a command runs in. The bin passes the process's own; a test
 * passes fakes, so a TTY can be driven in process.
 */
export interface CommandIo {
  readonly stdin: CommandInput
  readonly stdout: CommandOutput
  readonly stderr: CommandOutput
  /**
   * Whether stdout is a TTY. Only stdout decides between full-screen and plain
   * mode, or a refusal (ADR-0010, amended by ADR-0044).
   */
  readonly isTTY: boolean
  /** The terminal's size when the command starts; undefined when stdout is not a TTY. */
  readonly rows: number | undefined
  readonly columns: number | undefined
  /**
   * The environment variables a command reads. `NO_COLOR` removes colour and
   * forces typed input; `CI` forces typed input, or refuses an Ink-only
   * command (ADR-0044).
   */
  readonly env: {
    readonly NO_COLOR?: string | undefined
    readonly CI?: string | undefined
  }
}

/**
 * The adapters a command works through: the four driven ports, as the
 * composition root takes them (ADR-0037), and the Journal's folder
 * (ADR-0020).
 */
export type CommandPorts = Parameters<typeof composeCli>[0] & {
  readonly journalFolder: string
}

/**
 * A command's in-process entry point. `argv` holds the arguments
 * after the command's name. It resolves to the exit code; the bin passes the
 * process and the real adapters, and sets the process's exit code from it.
 */
export type Command = (
  argv: readonly string[],
  io: CommandIo,
  ports: CommandPorts,
) => Promise<ExitCode>
