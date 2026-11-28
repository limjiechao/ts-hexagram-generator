import type { Buffer } from 'node:buffer'
import path from 'node:path'

import type { RandomSource } from '@hexagram/application/random-source'
import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import type { ConsultationReadout } from '@hexagram/presentation/readout'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import { consultationFileName } from '@hexagram/store-markdown/markdown-consultation-store'

import {
  CatalogueFailureError,
  namingCatalogueFailure,
} from '#src/commands/catalogue-failure.js'
import type {
  CommandInput,
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import { isSet } from '#src/commands/frame.js'
import { journalFailureLine } from '#src/commands/maintenance-reports.js'
import {
  blankQueryLine,
  consultationKeptLine,
  portFailureLine,
  queryNotGivenLine,
  queryPrompt,
  stdinUnreadableLine,
  stdoutUnwritableLine,
  type PlainCastingCommand,
} from '#src/commands/plain-casting-wording.js'
import { composeCli } from '#src/composition-root.js'
import { paletteFor } from '#src/readout/palette.js'
import { plainReadout } from '#src/readout/plain-readout.js'
import { consultationReadoutFor } from '#src/readout/readout-for.js'

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
export async function randomPlainRun(
  io: CommandIo,
  ports: CommandPorts,
  preference: ReadingPreference,
): Promise<ExitCode> {
  const command = 'hexagram-random'
  const reader = lineReader(io.stdin)
  const streams = watchingStreams(io, reader)
  try {
    const query = await askForQuery(io, reader)
    if (query === 'interrupted') return 0
    if (query === 'ended') return endWithLine(io, queryNotGivenLine(command))
    if (query === 'unreadable')
      return endWithLine(io, stdinUnreadableLine(command))
    // The Query is the last line read: from here `Ctrl+C` and a stdin
    // error are heard and ignored, so a keep is never cut short.
    reader.close()

    const cli = composeCli({
      ...ports,
      randomSource: namingItsFailure(ports.randomSource),
    })
    let casting: CompleteCasting
    try {
      casting = castAutomatically(cli)
    } catch (error) {
      if (!(error instanceof RandomSourceFailureError)) throw error
      return endWithLine(
        io,
        portFailureLine(command, 'the Random Source failed'),
      )
    }
    let consultation: CastConsultation
    try {
      consultation = cli.buildCastConsultation(query, casting, 'automatic')
    } catch (error) {
      // Besides the Random Source, building reads only the Clock, so any
      // other failure is the Clock's, a Moment a Consultation Id cannot
      // hold among them (ADR-0046).
      return endWithLine(
        io,
        portFailureLine(
          command,
          error instanceof RandomSourceFailureError
            ? 'the Random Source failed'
            : 'the Clock cannot be read',
        ),
      )
    }
    return await showThenKeep(io, ports, cli, {
      command,
      preference,
      consultation,
      stdoutFailed: streams.stdoutFailed,
      stdoutFails: streams.stdoutFails,
    })
  } finally {
    streams.release()
    reader.close()
  }
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

/** One line on stderr, then exit 1. */
function endWithLine(io: CommandIo, text: string): ExitCode {
  io.stderr.write(`${text}\n`)
  return 1
}

/*
 * What stderr gets once a prompt is answered, or stdin ends at it: nothing.
 * An answer piped in is not echoed, so the next line on stderr follows the
 * prompt on its line.
 */
const afterAnswer: string = ''

/**
 * Asks for the Query until a line holds one: the Query, or how the asking
 * ended. `Ctrl+C` writes a newline, so the shell's prompt starts its own
 * line.
 */
async function askForQuery(
  io: CommandIo,
  reader: LineReader,
): Promise<Query | 'ended' | 'interrupted' | 'unreadable'> {
  for (;;) {
    io.stderr.write(queryPrompt)
    const answer = await reader.next()
    if (answer.kind === 'interrupt') {
      io.stderr.write('\n')
      return 'interrupted'
    }
    if (afterAnswer !== '') io.stderr.write(afterAnswer)
    if (answer.kind === 'end') return 'ended'
    if (answer.kind === 'unreadable') return 'unreadable'
    if (isQuery(answer.line)) return answer.line
    io.stderr.write(`${blankQueryLine}\n`)
  }
}

/** The use cases an Automatic Casting goes through. */
type CastingSteps = Pick<
  ReturnType<typeof composeCli>,
  'beginCasting' | 'nextRound' | 'drawAutomaticPick' | 'divide'
>

/**
 * The eighteen Divisions of Automatic Division, from the Empty Casting
 * (ADR-0038), each Pick drawn by the Remainder-Group policy (ADR-0023).
 */
function castAutomatically(cli: CastingSteps): CompleteCasting {
  let casting = cli.beginCasting()
  for (;;) {
    const next = cli.nextRound(casting)
    if (next.outcome === 'refused')
      throw new Error('a Casting begun here did not replay', { cause: next })
    const pick = cli.drawAutomaticPick(next.round.remainderGroups)
    const divided = cli.divide(casting, pick)
    if (divided.outcome === 'refused')
      throw new Error('a drawn Pick was refused', { cause: divided })
    if (divided.casting.state === 'complete') return divided.casting
    casting = divided.casting
  }
}

/** A failure of the Random Source, so its line can be told from the Clock's. */
class RandomSourceFailureError extends Error {
  override readonly name = 'RandomSourceFailureError'

  constructor(cause: unknown) {
    super('the Random Source failed', { cause })
  }
}

/** The Random Source, its every failure thrown as a `RandomSourceFailureError`. */
function namingItsFailure(randomSource: RandomSource): RandomSource {
  return {
    integerBelow: (bound) => {
      try {
        return randomSource.integerBelow(bound)
      } catch (error) {
        throw new RandomSourceFailureError(error)
      }
    },
  }
}

/**
 * The Readout on stdout, written whole or not at all, then the keep and
 * the kept line. A Catalogue failure writes its line instead of the
 * Readout and still keeps, exit 1; a failed keep writes the Journal line,
 * exit 1. A stdout that failed meanwhile adds its line last, exit 1.
 */
async function showThenKeep(
  io: CommandIo,
  ports: CommandPorts,
  cli: Pick<ReturnType<typeof composeCli>, 'keepCastConsultation'>,
  run: {
    readonly command: PlainCastingCommand
    readonly preference: ReadingPreference
    readonly consultation: CastConsultation
    readonly stdoutFailed: () => boolean
    readonly stdoutFails: () => void
  },
): Promise<ExitCode> {
  const { command, preference, consultation } = run
  const colour = !isSet(io.env.NO_COLOR)
  let exitCode: ExitCode = 0
  let readout: ConsultationReadout | undefined
  // An error that is no Catalogue failure is held until the keep is done,
  // so it never costs the Consultation, then thrown.
  let held: { readonly error: unknown } | undefined
  try {
    readout = await consultationReadoutFor(
      { scriptureCatalogue: namingCatalogueFailure(ports.scriptureCatalogue) },
      consultation,
      preference,
    )
  } catch (error) {
    if (error instanceof CatalogueFailureError) {
      io.stderr.write(
        `${portFailureLine(command, 'the Scripture Catalogue cannot be read')}\n`,
      )
      exitCode = 1
    } else {
      held = { error }
    }
  }
  // Settles once stdout has handled the Readout: a broken pipe may be
  // reported only then, after the keep's line is written.
  const readoutWritten =
    readout === undefined
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          io.stdout.write(plainReadout(readout, { colour }), (error) => {
            if (error !== undefined && error !== null) run.stdoutFails()
            resolve()
          })
        })
  let kept = false
  try {
    await cli.keepCastConsultation(consultation)
    kept = true
  } catch {
    exitCode = endWithLine(io, journalFailureLine(command, 'written'))
  }
  if (kept) {
    const file = path.resolve(
      ports.journalFolder,
      consultationFileName(consultation),
    )
    io.stderr.write(`${consultationKeptLine(file, paletteFor(colour))}\n`)
  }
  await readoutWritten
  if (run.stdoutFailed())
    exitCode = endWithLine(io, stdoutUnwritableLine(command))
  if (held !== undefined) throw held.error
  return exitCode
}

/** What a prompt gets: a line, the end of stdin, a stdin error, or `Ctrl+C`. */
type Answer =
  | { readonly kind: 'line'; readonly line: string }
  | { readonly kind: 'end' }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'interrupt' }

interface LineReader {
  /** The next line, or the end of stdin, or `Ctrl+C` while it waits. */
  readonly next: () => Promise<Answer>
  /** Hands `Ctrl+C` to a prompt that waits; with none waiting, it does nothing. */
  readonly interrupt: () => void
  /**
   * Hears that stdin cannot be read: the lines already read come first,
   * then every prompt gets `unreadable`. Once closed, it does nothing.
   */
  readonly fail: () => void
  /** Stops reading and pauses stdin; reading nothing more, it may be called again. */
  readonly close: () => void
}

/** A line without the `\r` that a CR LF or CR-ended input leaves on it. */
function withoutFinalReturn(line: string): string {
  return line.endsWith('\r') ? line.slice(0, -1) : line
}

/**
 * Reads stdin line by line from the moment it is made. A line's newline,
 * and a `\r` before it, are dropped; a last line with no newline still
 * counts, a `\r` at the very end of input dropped as well. Bytes are
 * decoded as UTF-8 as they come, so a character split across chunks is
 * read whole.
 */
function lineReader(stdin: CommandInput): LineReader {
  const decoder = new TextDecoder('utf-8')
  const lines: string[] = []
  let partial = ''
  let ended = false
  let unreadable = false
  let closed = false
  let waiting: ((answer: Answer) => void) | undefined

  function answer(given: Answer): void {
    const resolve = waiting
    waiting = undefined
    resolve?.(given)
  }

  function offer(): void {
    if (waiting === undefined) return
    const line = lines.shift()
    if (line !== undefined) answer({ kind: 'line', line })
    else if (unreadable) answer({ kind: 'unreadable' })
    else if (ended) answer({ kind: 'end' })
  }

  function onData(chunk: string | Buffer): void {
    partial +=
      typeof chunk === 'string'
        ? chunk
        : decoder.decode(chunk, { stream: true })
    let newline = partial.indexOf('\n')
    while (newline !== -1) {
      const line = partial.slice(0, newline)
      lines.push(withoutFinalReturn(line))
      partial = partial.slice(newline + 1)
      newline = partial.indexOf('\n')
    }
    offer()
  }

  function onEnd(): void {
    partial += decoder.decode()
    if (partial !== '') lines.push(withoutFinalReturn(partial))
    partial = ''
    ended = true
    offer()
  }

  stdin.on('data', onData)
  stdin.on('end', onEnd)

  return {
    next: () =>
      new Promise((resolve) => {
        waiting = resolve
        offer()
      }),
    interrupt: () => {
      answer({ kind: 'interrupt' })
    },
    fail: () => {
      if (closed) return
      unreadable = true
      offer()
    },
    close: () => {
      if (closed) return
      closed = true
      stdin.off('data', onData)
      stdin.off('end', onEnd)
      stdin.pause()
    },
  }
}

/**
 * What the run hears besides lines, from start to end: `Ctrl+C` and a
 * stdin error go to the reader, which ignores them once closed; a stdout
 * error, by its event or a write's callback, is remembered once, so the keep still runs and its line comes after;
 * a stderr error is heard and ignored, since there is nowhere left to say
 * so. Unheard, a stream's error would end the process.
 */
function watchingStreams(
  io: CommandIo,
  reader: LineReader,
): {
  readonly stdoutFailed: () => boolean
  readonly stdoutFails: () => void
  readonly release: () => void
} {
  let stdoutFailed = false
  const onInterrupt = (): void => {
    reader.interrupt()
  }
  const onStdinError = (): void => {
    reader.fail()
  }
  const onStdoutError = (): void => {
    stdoutFailed = true
  }
  const onStderrError = (): void => {}
  io.signals.on('SIGINT', onInterrupt)
  io.stdin.on('error', onStdinError)
  io.stdout.on('error', onStdoutError)
  io.stderr.on('error', onStderrError)
  return {
    stdoutFailed: () => stdoutFailed,
    stdoutFails: onStdoutError,
    release: () => {
      io.signals.off('SIGINT', onInterrupt)
      io.stdin.off('error', onStdinError)
      io.stdout.off('error', onStdoutError)
      io.stderr.off('error', onStderrError)
    },
  }
}
