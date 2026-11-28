import type { Buffer } from 'node:buffer'

import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type {
  CommandInput,
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'

/*
 * Plain casting (CLI manual, sections 6.3 and 6.4): with `--plain`, or a
 * stdout that is not a TTY, a casting command asks for the Query on one
 * line, casts, keeps the Cast Consultation and prints its Readout. The
 * widened terminal below is a draft of `CommandIo`'s widening: once
 * ratified it folds into `entry-point.ts`, and each command's `run` passes
 * its `io` here in plain mode.
 */

/**
 * The stdin plain casting reads lines from: `CommandInput` with its end, so
 * a closed stdin ends the run, and `pause`, so a stdin read to its last
 * line no longer holds the process open once the run ends.
 */
export interface PlainInput extends CommandInput {
  readonly on: {
    (event: 'data', listener: (chunk: string | Buffer) => void): unknown
    (event: 'end', listener: () => void): unknown
  }
  readonly off: {
    (event: 'data', listener: (chunk: string | Buffer) => void): unknown
    (event: 'end', listener: () => void): unknown
  }
  readonly pause: () => unknown
}

/**
 * The interrupt a command hears: `Ctrl+C` at a terminal whose stdin is not
 * in raw mode reaches the process as `SIGINT`, never as a byte on stdin.
 * The process fits it; a test passes a fake it can fire.
 */
export interface CommandSignals {
  readonly on: (event: 'SIGINT', listener: () => void) => unknown
  readonly off: (event: 'SIGINT', listener: () => void) => unknown
}

/** `CommandIo` as plain casting needs it: lines from stdin, and `Ctrl+C`. */
export type PlainIo = Omit<CommandIo, 'stdin'> & {
  readonly stdin: PlainInput
  readonly signals: CommandSignals
}

/*
 * What both runs share, in order:
 *
 * 1. (`hexagram-interactive` only) the welcome, on stderr.
 * 2. The Query prompt on stderr, then one line from stdin: its newline and
 *    a `\r` before it are dropped, and a last line with no newline still
 *    counts. A blank line writes the blank-Query line and asks again. The
 *    Query is kept exactly as typed otherwise.
 * 3. The eighteen Divisions, through use case 1's steps from the Empty
 *    Casting (ADR-0038): Automatic draws each Pick by the Remainder-Group
 *    policy (ADR-0023); Virtual writes each Line's heading and a Pick
 *    prompt per Round on stderr and reads one line, re-asking after the
 *    invalid-Pick line until the Pick is valid.
 * 4. The keep, with Division Method Automatic or Virtual (ADR-0027). The
 *    Divined At is the keep's own Moment, and the Readout shows it (CLI
 *    manual, section 5), so the keep comes before the Readout. Then the kept line, on stderr.
 * 5. The Readout, built in the Reading Preference given and written to
 *    stdout by `plainReadout`, with colour unless `NO_COLOR` (ADR-0044).
 *    Exit 0.
 *
 * Its endings (CLI manual, sections 6.1 and 6.3), each
 * with nothing on stdout but a Readout already written:
 *
 * - stdin ends before a Query is given: the Query-not-given line, exit 1,
 *   nothing kept, no port touched;
 * - stdin ends mid-Casting (Virtual): the Casting-unfinished line, exit 1,
 *   nothing kept;
 * - `Ctrl+C` while a prompt waits, at the Query or at a Pick: a newline on
 *   stderr, so the shell's prompt starts its own line, exit 0, nothing
 *   kept. From the last line read to the end of the run, `Ctrl+C` is
 *   ignored, so a keep is never cut short;
 * - the Random Source or the Clock fails: its line, exit 1, nothing kept;
 * - the keep fails: the Journal line, exit 1; no Readout is written, since
 *   the Consultation has no Divined At;
 * - the Catalogue fails after the keep: the kept line is already written,
 *   then the Catalogue line, exit 1; the Consultation stays kept.
 *
 * No port, and not the Journal's folder, is touched before a Query is
 * given. The `SIGINT` listener and stdin's listeners are removed, and
 * stdin paused, before the run resolves.
 */

/**
 * `hexagram-random` in plain mode: the Query, then Automatic Division,
 * with no pause between Rounds (the slider's and reveal's options apply to
 * the full-screen Viewer only).
 */
export function randomPlainRun(
  io: PlainIo,
  ports: CommandPorts,
  preference: ReadingPreference,
): Promise<ExitCode> {
  throw new Error('not built', { cause: { io, ports, preference } })
}

/**
 * `hexagram-interactive` in plain mode: the welcome, the Query, then
 * Virtual Division by a typed Pick for each Round. Plain mode always takes
 * typed input (CLI manual, section 6.4).
 */
export function interactivePlainRun(
  io: PlainIo,
  ports: CommandPorts,
  preference: ReadingPreference,
): Promise<ExitCode> {
  throw new Error('not built', { cause: { io, ports, preference } })
}
