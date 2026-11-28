import type { Buffer } from 'node:buffer'
import path from 'node:path'

import { consultationReadoutFor } from '@hexagram/application/consultation-readout'
import type { RandomSource } from '@hexagram/application/random-source'
import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import { isQuery } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import type { NextRound } from '@hexagram/oracle/division'
import type { LinePosition } from '@hexagram/oracle/line-position'
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
  CommandOutput,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import { isSet, isWholeNumber } from '#src/commands/frame.js'
import { journalFailureLine } from '#src/commands/maintenance-reports.js'
import {
  blankQueryLine,
  castingUnfinishedLine,
  consultationKeptLine,
  invalidPickLine,
  lineHeading,
  pickPrompt,
  portFailureLine,
  queryNotGivenLine,
  queryPrompt,
  stdinUnreadableLine,
  stdoutUnwritableLine,
  welcomeText,
  type PlainCastingCommand,
} from '#src/commands/plain-casting-wording.js'
import { composeCli } from '#src/composition-root.js'
import { paletteFor, type Palette } from '#src/readout/palette.js'
import { plainReadout } from '#src/readout/plain-readout.js'

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
 *    Query is kept exactly as typed otherwise. Wherever the terminal
 *    echoed no newline after a prompt, stderr writes one.
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
 * - stdin cannot be read while the run still reads it, at the Query or at
 *   a Pick: the stdin line, exit 1, nothing kept. Once nothing more is
 *   read, a stdin error is heard and ignored;
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
  return plainCastingRun(io, ports, preference, {
    command: 'hexagram-random',
    divisionMethod: 'automatic',
    welcome: false,
    cast: ({ cli }) => castAutomatically(cli),
  })
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
  return plainCastingRun(io, ports, preference, {
    command: 'hexagram-interactive',
    divisionMethod: 'virtual',
    welcome: true,
    cast: castVirtually,
  })
}

/** How asking ended when no answer came: `Ctrl+C`, stdin's end, or a stdin error. */
type Unanswered = 'interrupted' | 'ended' | 'unreadable'

/** `askUntilAccepted` over the run's stdin and stderr. */
type Ask = <Value>(
  prompt: string,
  accept: (line: string) => Value | undefined,
  refusal: string,
) => Promise<{ readonly value: Value } | Unanswered>

/** What casting may use: the use cases, the asking, stderr and its palette. */
interface CastingTools {
  readonly cli: ReturnType<typeof composeCli>
  readonly ask: Ask
  readonly stderr: CommandOutput
  readonly palette: Palette
}

/** What a command brings to the run both plain casting commands share. */
interface PlainCasting {
  readonly command: PlainCastingCommand
  readonly divisionMethod: DivisionMethod
  /** Whether the welcome comes before the Query prompt. */
  readonly welcome: boolean
  /** The complete Casting, or how asking for its Picks ended. */
  readonly cast: (
    tools: CastingTools,
  ) => CompleteCasting | Promise<CompleteCasting | Unanswered>
}

/** The run both plain casting commands share, in the order above. */
async function plainCastingRun(
  io: CommandIo,
  ports: CommandPorts,
  preference: ReadingPreference,
  casting: PlainCasting,
): Promise<ExitCode> {
  const { command } = casting
  const reader = lineReader(io.stdin)
  const streams = watchingStreams(io, reader)
  const ask: Ask = (prompt, accept, refusal) =>
    askUntilAccepted(io, reader, prompt, accept, refusal)
  const colour = !isSet(io.env.NO_COLOR)
  const palette = paletteFor(colour)
  try {
    if (casting.welcome) io.stderr.write(welcomeText(palette))
    const asked = await ask(
      queryPrompt,
      (line) => (isQuery(line) ? line : undefined),
      blankQueryLine,
    )
    if (typeof asked === 'string')
      return endedUnanswered(io, command, asked, queryNotGivenLine(command))

    const cli = composeCli({
      ...ports,
      randomSource: namingItsFailure(ports.randomSource),
    })
    let cast: CompleteCasting | Unanswered
    try {
      cast = await casting.cast({ cli, ask, stderr: io.stderr, palette })
    } catch (error) {
      if (!(error instanceof RandomSourceFailureError)) throw error
      return endWithLine(
        io,
        portFailureLine(command, 'the Random Source failed'),
      )
    }
    if (typeof cast === 'string')
      return endedUnanswered(io, command, cast, castingUnfinishedLine(command))
    // The last line is read: from here `Ctrl+C` and a stdin error are heard
    // and ignored, so a keep is never cut short.
    reader.close()

    let consultation: CastConsultation
    try {
      consultation = cli.buildCastConsultation(
        asked.value,
        cast,
        casting.divisionMethod,
      )
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
      colour,
      palette,
      stdoutFailed: streams.stdoutFailed,
      stdoutFails: streams.stdoutFails,
    })
  } finally {
    streams.release()
    reader.close()
  }
}

/**
 * The ending when a prompt got no answer: exit 0 on `Ctrl+C`; the stdin
 * line, exit 1, when stdin cannot be read; and `endedLine`, exit 1, when
 * stdin ended.
 */
function endedUnanswered(
  io: CommandIo,
  command: PlainCastingCommand,
  unanswered: Unanswered,
  endedLine: string,
): ExitCode {
  if (unanswered === 'interrupted') return 0
  if (unanswered === 'unreadable')
    return endWithLine(io, stdinUnreadableLine(command))
  return endWithLine(io, endedLine)
}

/** One line on stderr, then exit 1. */
function endWithLine(io: CommandIo, text: string): ExitCode {
  io.stderr.write(`${text}\n`)
  return 1
}

/**
 * Whether no newline was echoed after a prompt, so stderr must end the
 * prompt's line itself, once. A terminal echoes the Enter of an answer
 * typed at it, but no newline for `Ctrl+C`, for stdin's end, for a stdin
 * that cannot be read, for an answer piped in, or for a last line that
 * stdin's end, not Enter, ended.
 */
function echoedNoNewline(io: CommandIo, answer: Answer): boolean {
  if (answer.kind !== 'line') return true
  return !answer.endedByNewline || io.stdin.isTTY !== true
}

/**
 * Asks with `prompt` until `accept` takes a line, writing `refusal` after
 * each line it refuses. Wherever no newline was echoed, `Ctrl+C` included,
 * stderr writes one, so the next line, or the shell's prompt, starts its
 * own line.
 */
async function askUntilAccepted<Value>(
  io: CommandIo,
  reader: LineReader,
  prompt: string,
  accept: (line: string) => Value | undefined,
  refusal: string,
): Promise<{ readonly value: Value } | Unanswered> {
  for (;;) {
    io.stderr.write(prompt)
    const answer = await reader.next()
    if (echoedNoNewline(io, answer)) io.stderr.write('\n')
    if (answer.kind === 'interrupt') return 'interrupted'
    if (answer.kind === 'end') return 'ended'
    if (answer.kind === 'unreadable') return 'unreadable'
    const value = accept(answer.line)
    if (value !== undefined) return { value }
    io.stderr.write(`${refusal}\n`)
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

const linePositions = [
  1, 2, 3, 4, 5, 6,
] as const satisfies readonly LinePosition[]

/**
 * The eighteen Divisions of Virtual Division, from the Empty Casting
 * (ADR-0038): before each Line's first Round its heading, bottom-up from
 * Line 1, then for each Round a Pick asked for until it is among the
 * Round's valid Picks (ADR-0023). Asking may end unanswered.
 */
async function castVirtually(
  tools: CastingTools,
): Promise<CompleteCasting | Unanswered> {
  const { cli, ask, stderr, palette } = tools
  let casting = cli.beginCasting()
  for (let round = 0; ; round += 1) {
    const next = cli.nextRound(casting)
    if (next.outcome === 'refused')
      throw new Error('a Casting begun here did not replay', { cause: next })
    const position = linePositions[Math.floor(round / 3)]
    if (round % 3 === 0 && position !== undefined)
      stderr.write(lineHeading(position, palette))
    const { validPicks } = next.round
    const picked = await ask(
      pickPrompt(validPicks),
      (line) => pickAmong(line, validPicks),
      invalidPickLine(validPicks),
    )
    if (typeof picked === 'string') return picked
    const divided = cli.divide(casting, picked.value)
    if (divided.outcome === 'refused')
      throw new Error('a valid Pick was refused', { cause: divided })
    if (divided.casting.state === 'complete') return divided.casting
    casting = divided.casting
  }
}

/**
 * The Pick a typed line gives, or undefined when it is none of the
 * Round's valid Picks: a positive whole number, whatever `trim` strips
 * around it ignored.
 */
function pickAmong(
  line: string,
  validPicks: NextRound['validPicks'],
): number | undefined {
  const digits = line.trim()
  if (!isWholeNumber(digits)) return undefined
  const pick = Number(digits)
  return pick >= validPicks.min && pick <= validPicks.max ? pick : undefined
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
    readonly colour: boolean
    readonly palette: Palette
    readonly stdoutFailed: () => boolean
    readonly stdoutFails: () => void
  },
): Promise<ExitCode> {
  const { command, preference, consultation, colour, palette } = run
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
    io.stderr.write(`${consultationKeptLine(file, palette)}\n`)
  }
  await readoutWritten
  if (run.stdoutFailed())
    exitCode = endWithLine(io, stdoutUnwritableLine(command))
  if (held !== undefined) throw held.error
  return exitCode
}

/** What a prompt gets: a line, the end of stdin, a stdin error, or `Ctrl+C`. */
type Answer =
  | {
      readonly kind: 'line'
      readonly line: string
      /** False for a last line that stdin's end ended instead. */
      readonly endedByNewline: boolean
    }
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
  const lines: { readonly line: string; readonly endedByNewline: boolean }[] =
    []
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
    const next = lines.shift()
    if (next !== undefined) answer({ kind: 'line', ...next })
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
      lines.push({ line: withoutFinalReturn(line), endedByNewline: true })
      partial = partial.slice(newline + 1)
      newline = partial.indexOf('\n')
    }
    offer()
  }

  function onEnd(): void {
    partial += decoder.decode()
    if (partial !== '')
      lines.push({ line: withoutFinalReturn(partial), endedByNewline: false })
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
 * error, by its event or a write's callback, is remembered once, so the
 * keep still runs and its line comes after; a stderr error is heard and
 * ignored, since there is nowhere left to say so. Unheard, a stream's
 * error would end the process.
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
