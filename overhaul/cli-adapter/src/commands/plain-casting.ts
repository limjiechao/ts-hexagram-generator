import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type {
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'

/*
 * Plain casting (CLI manual, sections 6.3 and 6.4): with `--plain`, or a
 * stdout that is not a TTY, a casting command asks for the Query on one
 * line, casts, prints the Readout and keeps the Cast Consultation. Each
 * command's `run` passes its `io` here in plain mode.
 */

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
 * 4. The Cast Consultation, built with Division Method Automatic or
 *    Virtual (ADR-0027): one Clock read gives its Divined At and its
 *    Consultation Id's time (ADR-0046). Nothing is kept yet.
 * 5. Its Readout, built in the Reading Preference given and written to
 *    stdout by `plainReadout`, with colour unless `NO_COLOR` (ADR-0044).
 * 6. The keep, exactly as built, then the kept line on stderr. Exit 0.
 *
 * Its endings (CLI manual, sections 6.1 and 6.3), each with nothing on
 * stdout but a Readout already written:
 *
 * - stdin ends before a Query is given: the Query-not-given line, exit 1,
 *   nothing kept;
 * - stdin ends mid-Casting (Virtual): the Casting-unfinished line, exit 1,
 *   nothing kept;
 * - `Ctrl+C` while a prompt waits, at the Query or at a Pick: a newline on
 *   stderr, so the shell's prompt starts its own line, exit 0, nothing
 *   kept. From the last line read to the end of the run, `Ctrl+C` is
 *   ignored, so a keep is never cut short;
 * - the Random Source or the Clock fails, in a Division or in building the
 *   Consultation: its line, exit 1, nothing written to stdout, nothing
 *   kept;
 * - the Catalogue fails while the Readout is built: the Catalogue line,
 *   then the keep and the kept line all the same, exit 1; nothing is on
 *   stdout, since the Readout is written whole or not at all. Should that
 *   keep fail too, the Journal line follows the Catalogue line, exit 1;
 * - the keep fails: the Readout is already on stdout, then the Journal
 *   line, exit 1.
 *
 * Before a Query is given, no port is touched and not the Journal's
 * folder; the Reading Preference, checked against the Scripture Catalogue
 * before the run starts, is the only exception, and it never reaches the
 * Journal. The `SIGINT` listener and stdin's listeners are removed, and
 * stdin paused, before the run resolves.
 */

/**
 * `hexagram-random` in plain mode: the Query, then Automatic Division,
 * with no pause between Rounds (the slider's and reveal's options apply to
 * the full-screen Viewer only).
 */
export function randomPlainRun(
  io: CommandIo,
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
  io: CommandIo,
  ports: CommandPorts,
  preference: ReadingPreference,
): Promise<ExitCode> {
  throw new Error('not built', { cause: { io, ports, preference } })
}
