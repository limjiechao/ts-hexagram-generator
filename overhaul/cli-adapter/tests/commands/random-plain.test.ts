import { Buffer } from 'node:buffer'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import { isConsultationId } from '@hexagram/consultation-journal/consultation-id'
import { isQuery } from '@hexagram/consultation-journal/query'
import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import { divide, emptyCasting, nextRound } from '@hexagram/oracle/division'
import type { Remainder } from '@hexagram/oracle/remainder'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import {
  consultationFileName,
  markdownConsultationStore,
} from '@hexagram/store-markdown/markdown-consultation-store'
import { afterEach, describe, expect, it } from 'vitest'

import type { CommandPorts } from '#src/commands/entry-point.js'
import { run, usage } from '#src/commands/hexagram-random.js'
import { journalFailureLine } from '#src/commands/maintenance-reports.js'
import {
  blankQueryLine,
  consultationKeptLine,
  portFailureLine,
  queryNotGivenLine,
  queryPrompt,
} from '#src/commands/plain-casting-wording.js'
import { markdownBodyRenderer } from '#src/readout/markdown-body.js'
import { paletteFor } from '#src/readout/palette.js'
import { plainReadout } from '#src/readout/plain-readout.js'
import { consultationReadoutFor } from '#src/readout/readout-for.js'

import { readoutCases, readoutFixture } from '../support/readout-cases.js'
import {
  chunk,
  ctrlC,
  scriptedTerminal,
  stdinEnds,
  stdinFails,
  typed,
  type ScriptedTerminal,
  type Step,
} from '../support/scripted-terminal.js'

// `hexagram-random` in plain mode (CLI manual, sections 6.3 and 7), driven
// in process through its entry point over a Journal in a fresh folder under
// the system's temporary directory, never the repository's own Journal. The
// Random Source is scripted to give the Picks of the Readout fixtures'
// X之X case, and the Clock reads its Divined At, so stdout can be compared
// with that fixture byte for byte. Every Query is invented.

const line = (text: string): string => `${text}\n`

function castCase(name: string): CastConsultation {
  const found = readoutCases.find((each) => each.name === name)
  if (found?.consultation.origin !== 'cast')
    throw new Error(`no cast Readout case ${name}`)
  return found.consultation
}

/** X之X, cast by Automatic Division, the one such case among the fixtures. */
const xZhiX = castCase('cast-x-zhi-x')
const xZhiXFixture = readoutFixture('plain-cast-x-zhi-x.txt')

/** Crockford's base 32, the ULID alphabet (ADR-0046). */
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** The ten time characters of a ULID for this millisecond. */
function timeCharacters(epochMilliseconds: number): string {
  let text = ''
  let remaining = epochMilliseconds
  for (let at = 0; at < 10; at += 1) {
    text = crockford.charAt(remaining % 32) + text
    remaining = Math.floor(remaining / 32)
  }
  return text
}

/** The random part of the fixtures' Consultation Ids. */
const idRandomPart = '4T7V2M5N6P0R1S2K'
const idDraws = [...idRandomPart].map((symbol) => crockford.indexOf(symbol))

const remainders: readonly Remainder[] = [1, 2, 3, 4]

/**
 * The draws by which the Remainder-Group policy makes this Casting's Picks
 * (ADR-0023): for each Round, the draw of the Pick's Remainder Group, 0 to
 * 3 for Remainders 1 to 4, then its place within the group.
 */
function pickDraws(casting: CompleteCasting): number[] {
  const draws: number[] = []
  let partial: PartialCasting = emptyCasting
  for (const pick of casting.rounds.flat().map((round) => round.pick)) {
    const next = nextRound(partial)
    if (next.outcome !== 'next') throw new Error('the Casting did not replay')
    const at = remainders.findIndex((remainder) =>
      next.round.remainderGroups[remainder].includes(pick),
    )
    const remainder = remainders[at]
    if (remainder === undefined) throw new Error(`no group holds ${pick}`)
    draws.push(at, next.round.remainderGroups[remainder].indexOf(pick))
    const result = divide(partial, pick)
    if (result.outcome !== 'divided') throw new Error(`refused Pick ${pick}`)
    if (result.casting.state === 'partial') partial = result.casting
  }
  return draws
}

/** Every draw a run makes: the eighteen Picks, then the Id's sixteen. */
const allDraws = [...pickDraws(xZhiX.casting), ...idDraws]

/** The Cast Consultation a run keeps of this Query, by Automatic Division. */
function expectedConsultation(query: string = xZhiX.query): CastConsultation {
  if (!isQuery(query)) throw new Error('a blank Query')
  const id = `${timeCharacters(xZhiX.divinedAt.epochMilliseconds)}${idRandomPart}`
  if (!isConsultationId(id)) throw new Error(`${id} is no ULID`)
  return {
    ...xZhiX,
    id,
    query,
    divisionMethod: 'automatic',
  }
}

/** The plain Readout of a Consultation, from the bundled Catalogue. */
async function readoutOf(
  consultation: CastConsultation,
  preference: ReadingPreference = defaultReadingPreference,
  colour = true,
): Promise<string> {
  const readout = await consultationReadoutFor(
    { scriptureCatalogue: bundledScriptureCatalogue },
    consultation,
    preference,
  )
  return plainReadout(readout, { colour })
}

/**
 * A Readout without its palette's escape codes: the palette's doc says a
 * Readout without colour is exactly that (ADR-0044).
 */
function withoutColour(text: string): string {
  const palette = paletteFor(true)
  let left = text
  for (const code of [
    palette.heading,
    palette.emphasis,
    palette.moving,
    palette.muted,
    palette.remainder,
    palette.lineValue,
    palette.reset,
  ])
    left = left.replaceAll(code, '')
  return left
}

const folders: string[] = []

afterEach(async () => {
  await Promise.all(
    folders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

/** A Journal folder, not yet created, in a fresh temporary folder. */
async function temporaryJournal(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'random-plain-'))
  folders.push(root)
  return path.join(root, 'journal')
}

/** A Journal folder that cannot be created: its parent is a file. */
async function unwritableJournal(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'random-plain-'))
  folders.push(root)
  await writeFile(path.join(root, 'a-file'), 'not a folder\n')
  return path.join(root, 'a-file', 'journal')
}

async function filesIn(folder: string): Promise<readonly string[]> {
  try {
    const names = await readdir(folder)
    return names.toSorted()
  } catch {
    return []
  }
}

/** What a fresh Store reads back from the Journal folder. */
function keptIn(journalFolder: string) {
  const store = markdownConsultationStore({
    journalFolder,
    renderBody: markdownBodyRenderer({
      scriptureCatalogue: bundledScriptureCatalogue,
    }),
  })
  return store.consultationStore.list()
}

/** The Consultations a fresh Store reads back from the Journal folder. */
async function keptConsultations(journalFolder: string) {
  const { consultations } = await keptIn(journalFolder)
  return consultations
}

interface PortOptions {
  readonly journalFolder: string
  readonly draws?: readonly number[]
  readonly clock?: Clock['now']
  /** The Catalogue the run reads; the Store's bodies always use the bundled one. */
  readonly scriptureCatalogue?: ScriptureCatalogue
  /** Hands the run the Catalogue itself, unrecorded, so its methods keep their `this`. */
  readonly catalogueAsGiven?: boolean
  /** Called as the Store's keep begins. */
  readonly onKeep?: () => void
}

/**
 * The run's ports: the real Markdown Store over the Journal folder, the
 * bundled Catalogue, a Clock that reads X之X's Divined At and a Random
 * Source that gives the scripted draws in turn. Every use is recorded by
 * port, the Journal folder included.
 */
function portsOver(options: PortOptions, touched: string[]): CommandPorts {
  const store = markdownConsultationStore({
    journalFolder: options.journalFolder,
    renderBody: markdownBodyRenderer({
      scriptureCatalogue: bundledScriptureCatalogue,
    }),
  })
  const catalogue = options.scriptureCatalogue ?? bundledScriptureCatalogue
  const scriptureCatalogue: ScriptureCatalogue = {
    passageTexts: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.passageTexts(...args)
    },
    hexagramNames: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.hexagramNames(...args)
    },
    receivedSequenceNumber: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.receivedSequenceNumber(...args)
    },
    trigramNames: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.trigramNames(...args)
    },
    editions: (...args) => {
      touched.push('Scripture Catalogue')
      return catalogue.editions(...args)
    },
  }
  const real = store.consultationStore
  const consultationStore: ConsultationStore = {
    keep: (consultation) => {
      touched.push('Consultation Store')
      options.onKeep?.()
      return real.keep(consultation)
    },
    list: () => {
      touched.push('Consultation Store')
      return real.list()
    },
    get: (id) => {
      touched.push('Consultation Store')
      return real.get(id)
    },
    remove: (record) => {
      touched.push('Consultation Store')
      return real.remove(record)
    },
    deletionRecords: () => {
      touched.push('Consultation Store')
      return real.deletionRecords()
    },
  }
  const draws = options.draws ?? allDraws
  let drawn = 0
  const randomSource: RandomSource = {
    integerBelow: (bound) => {
      touched.push('Random Source')
      const draw = draws[drawn]
      drawn += 1
      if (draw === undefined) throw new Error('the invented entropy ran dry')
      if (draw >= bound) throw new Error(`draw ${draw} is not below ${bound}`)
      return draw
    },
  }
  const now = options.clock ?? (() => xZhiX.divinedAt)
  const clock: Clock = {
    now: () => {
      touched.push('Clock')
      return now()
    },
  }
  const maintenance = (): never => {
    touched.push('Markdown Consultation Store')
    throw new Error('plain casting reached a maintenance run')
  }
  const { journalFolder } = options
  return {
    scriptureCatalogue:
      options.catalogueAsGiven === true ? catalogue : scriptureCatalogue,
    consultationStore,
    randomSource,
    clock,
    get journalFolder(): string {
      touched.push('Journal folder')
      return journalFolder
    },
    moveToLegacy: maintenance,
    rerenderBodies: maintenance,
  }
}

interface RunOptions extends PortOptions {
  readonly isTTY?: boolean
  readonly env?: { readonly NO_COLOR?: string; readonly CI?: string }
  readonly stdoutFailsAfterWrite?: Error
  readonly stderrFailsAfterWrite?: Error
  readonly stdoutFailsLate?: Error
  readonly stdinIsTTY?: boolean
  /** Called as the Store's keep begins, with the terminal. */
  readonly duringKeep?: (terminal: ScriptedTerminal) => void
}

/**
 * Runs `hexagram-random` until it resolves or rejects, and checks it let
 * go of the terminal either way.
 */
async function settleRandom(
  argv: readonly string[],
  script: readonly Step[],
  options: RunOptions,
) {
  const terminal = scriptedTerminal({
    isTTY: options.isTTY ?? false,
    env: options.env,
    script,
    stdoutFailsAfterWrite: options.stdoutFailsAfterWrite,
    stderrFailsAfterWrite: options.stderrFailsAfterWrite,
    stdoutFailsLate: options.stdoutFailsLate,
    stdinIsTTY: options.stdinIsTTY,
  })
  const touched: string[] = []
  const [outcome] = await Promise.allSettled([
    run(
      argv,
      terminal.io,
      portsOver(
        {
          ...options,
          onKeep: () => options.duringKeep?.(terminal),
        },
        touched,
      ),
    ),
  ])
  // Before the run ends, its listeners are removed (plain-casting.ts).
  expect(terminal.listening()).toEqual({
    data: 0,
    end: 0,
    stdinError: 0,
    stdoutError: 0,
    stderrError: 0,
    interrupt: 0,
  })
  expect(terminal.unheardInterrupts()).toBe(0)
  expect(terminal.unheardErrors()).toBe(0)
  return {
    outcome,
    stdout: terminal.stdout(),
    stderr: terminal.stderr(),
    pauses: terminal.pauses(),
    touched: [...new Set(touched)],
  }
}

/** Runs `hexagram-random` to its exit code and checks it let go of the terminal. */
async function runRandom(
  argv: readonly string[],
  script: readonly Step[],
  options: RunOptions,
) {
  const { outcome, ...ended } = await settleRandom(argv, script, options)
  if (outcome.status === 'rejected') throw outcome.reason
  return { exitCode: outcome.value, ...ended }
}

/** The kept line for a Consultation kept in this Journal folder. */
function keptLine(
  journalFolder: string,
  consultation: CastConsultation,
  colour = true,
): string {
  return line(
    consultationKeptLine(
      path.join(journalFolder, consultationFileName(consultation)),
      paletteFor(colour),
    ),
  )
}

const prompt = queryPrompt
/**
 * The Query prompt with the newline the run writes when the terminal
 * echoed none: after an answer from a stdin that is not a TTY, and when
 * stdin ends at the prompt.
 */
const promptLine = line(queryPrompt)
const blank = line(blankQueryLine)
const notGiven = line(queryNotGivenLine('hexagram-random'))
const catalogueFailed = line(
  portFailureLine('hexagram-random', 'the Scripture Catalogue cannot be read'),
)
const clockFailed = line(
  portFailureLine('hexagram-random', 'the Clock cannot be read'),
)
const randomFailed = line(
  portFailureLine('hexagram-random', 'the Random Source failed'),
)
const journalFailed = line(journalFailureLine('hexagram-random', 'written'))

const asked = (query: string = xZhiX.query): Step => typed(`${query}\n`)

describe('hexagram-random in plain mode: the Readout and the keep', () => {
  it.each([
    { shown: 'stdout not a TTY', argv: [], isTTY: false },
    { shown: '--plain with stdout not a TTY', argv: ['--plain'], isTTY: false },
    { shown: '--plain on a TTY', argv: ['--plain'], isTTY: true },
    { shown: '--no-ui on a TTY', argv: ['--no-ui'], isTTY: true },
  ])(
    '$shown: stdout is the fixture byte for byte; stderr the prompt and the kept line; the file under consultationFileName',
    async ({ argv, isTTY }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(argv, [asked(), stdinEnds], {
        journalFolder,
        isTTY,
      })

      const expected = expectedConsultation()
      expect(ended.stdout).toBe(xZhiXFixture)
      expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
      expect(ended.exitCode).toBe(0)
      expect(ended.pauses).toBeGreaterThan(0)
      expect(await filesIn(journalFolder)).toEqual([
        consultationFileName(expected),
      ])
      expect(await keptIn(journalFolder)).toStrictEqual({
        consultations: [expected],
        unreadable: [],
      })
    },
  )

  it('NO_COLOR: stdout is the fixture with its escape codes removed, and the kept line has none', async () => {
    expect(xZhiXFixture).toContain('\u001B[')
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      env: { NO_COLOR: '1' },
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(withoutColour(xZhiXFixture))
    expect(ended.stdout).not.toContain('\u001B')
    expect(ended.stderr).toBe(
      promptLine + keptLine(journalFolder, expected, false),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('a last Query line with no newline still counts', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [typed(xZhiX.query), stdinEnds], {
      journalFolder,
    })

    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([
      expectedConsultation(),
    ])
  })

  it('a Query line ending in CR LF is kept without the CR', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [typed(`${xZhiX.query}\r\n`)], {
      journalFolder,
    })

    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([
      expectedConsultation(),
    ])
  })

  it('a Query is kept exactly as typed, its leading and trailing spaces included', async () => {
    const spaced =
      '  Will the invented ferry at Westmill run before the thaw?  '
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked(spaced)], { journalFolder })

    const expected = expectedConsultation(spaced)
    expect(ended.stdout).toBe(await readoutOf(expected))
    expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('a Query split across chunks, one cut inside a character, is read whole', async () => {
    const query = 'How will Steward Aelric’s invented journey unfold?'
    const bytes = Buffer.from(`${query}\n`, 'utf8')
    const inside = bytes.indexOf(Buffer.from('’', 'utf8')) + 1
    const journalFolder = await temporaryJournal()
    const ended = await runRandom(
      [],
      [chunk(bytes.subarray(0, inside)), chunk(bytes.subarray(inside))],
      { journalFolder },
    )

    const expected = expectedConsultation(query)
    expect(ended.stdout).toBe(await readoutOf(expected))
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('a blank or whitespace-only Query is asked again', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [typed('\n'), typed('   \n'), asked()], {
      journalFolder,
    })

    expect(ended.stderr).toBe(
      promptLine +
        blank +
        promptLine +
        blank +
        promptLine +
        keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.exitCode).toBe(0)
  })

  it('ignores the options that apply to the full-screen Viewer only, with no pause between Rounds', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom(
      [
        '--wrap-width',
        '40',
        '--numeric-input',
        '--slider-sweep-ms',
        '1',
        '--cast-bounce-ms',
        '600000',
        '--cast-reveal-ms',
        '600000',
      ],
      [asked()],
      { journalFolder },
    )

    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(
      promptLine + keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('lines after the Query are ignored: the first line is the Query, one Consultation kept, exit 0', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [typed(`${xZhiX.query}\nmore\n`)], {
      journalFolder,
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('Ctrl+C while the keep runs is ignored: the Consultation is kept, exit 0', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      duringKeep: (terminal) => {
        terminal.interruptNow()
      },
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })
})

describe('hexagram-random in plain mode: endings before the Query', () => {
  it.each([
    { shown: 'at once', script: [stdinEnds], stderr: promptLine + notGiven },
    {
      shown: 'after a blank line',
      script: [typed('\n'), stdinEnds],
      stderr: promptLine + blank + promptLine + notGiven,
    },
    {
      shown: 'after a whitespace-only last line with no newline',
      script: [typed('   '), stdinEnds],
      stderr: promptLine + blank + promptLine + notGiven,
    },
  ])(
    'stdin ends $shown: the Query-not-given line, exit 1, nothing kept, no port touched',
    async ({ script, stderr }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom([], script, { journalFolder })

      expect(ended.stderr).toBe(stderr)
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(1)
      expect(ended.touched).toEqual([])
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )

  it.each([
    { shown: 'at the Query prompt', script: [ctrlC], stderr: `${prompt}\n` },
    {
      shown: 'after a blank Query',
      script: [typed('  \n'), ctrlC],
      stderr: `${promptLine}${blank}${prompt}\n`,
    },
  ])(
    'Ctrl+C $shown quits: a newline on stderr, exit 0, nothing kept, no port touched',
    async ({ script, stderr }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom([], script, { journalFolder })

      expect(ended.stderr).toBe(stderr)
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(0)
      expect(ended.touched).toEqual([])
      expect(ended.pauses).toBeGreaterThan(0)
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )
})

describe('hexagram-random in plain mode: a failing port', () => {
  it('the Random Source fails in a Division: its line, exit 1, stdout empty, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      draws: allDraws.slice(0, 5),
    })

    expect(ended.stderr).toBe(promptLine + randomFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).not.toContain('Consultation Store')
    expect(await filesIn(journalFolder)).toEqual([])
  })

  it('the Random Source fails while the Consultation Id is built: its line, exit 1, stdout empty, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      draws: allDraws.slice(0, -1),
    })

    expect(ended.stderr).toBe(promptLine + randomFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).not.toContain('Consultation Store')
    expect(await filesIn(journalFolder)).toEqual([])
  })

  it('the Clock fails: its line, exit 1, stdout empty, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      clock: () => {
        throw new Error('the invented clock stopped')
      },
    })

    expect(ended.stderr).toBe(promptLine + clockFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).not.toContain('Consultation Store')
    expect(await filesIn(journalFolder)).toEqual([])
  })

  it('the Clock reads a Moment a Consultation Id cannot hold: the Clock line, exit 1, stdout empty, nothing kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      clock: () => ({
        precision: 'moment',
        epochMilliseconds: 2 ** 48,
        offset: xZhiX.divinedAt.offset,
      }),
    })

    expect(ended.stderr).toBe(promptLine + clockFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).not.toContain('Consultation Store')
    expect(await filesIn(journalFolder)).toEqual([])
  })

  it('the Catalogue fails for the Readout: its line, then the kept line, exit 1, stdout empty, the Consultation kept', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        passageTexts: () => Promise.reject(new Error('the Catalogue failed')),
      },
    })

    const expected = expectedConsultation()
    expect(ended.stderr).toBe(
      promptLine + catalogueFailed + keptLine(journalFolder, expected),
    )
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('the keep fails: the Readout already on stdout, then the Journal line, exit 1', async () => {
    const journalFolder = await unwritableJournal()
    const ended = await runRandom([], [asked()], { journalFolder })

    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(promptLine + journalFailed)
    expect(ended.exitCode).toBe(1)
  })

  it('the Catalogue fails, then the keep: both lines in that order, exit 1, stdout empty', async () => {
    const journalFolder = await unwritableJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        passageTexts: () => Promise.reject(new Error('the Catalogue failed')),
      },
    })

    expect(ended.stderr).toBe(promptLine + catalogueFailed + journalFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
  })
})

function editionId(text: string) {
  if (!isEditionId(text)) throw new Error(`${text} is no EditionId`)
  return text
}

describe('hexagram-random in plain mode: the Reading Preference options', () => {
  it.each([
    {
      argv: ['--translation', 'wilhelm-baynes-1967'],
      preference: { translations: [editionId('wilhelm-baynes-1967')] },
    },
    {
      argv: [
        '--translation',
        'wilhelm-baynes-1967',
        '--translation',
        'legge-1882',
      ],
      preference: {
        translations: [
          editionId('wilhelm-baynes-1967'),
          editionId('legge-1882'),
        ],
      },
    },
    {
      argv: ['--translation=legge-1882'],
      preference: { translations: [editionId('legge-1882')] },
    },
    {
      argv: ['--commentary', 'tuan'],
      preference: { commentaries: ['tuan'] as const },
    },
    {
      argv: ['--commentary', 'wenyan', '--commentary', 'tuan'],
      preference: { commentaries: ['wenyan', 'tuan'] as const },
    },
    {
      argv: ['--script', 'simplified', '--yilin'],
      preference: { script: 'simplified', yilinVerse: true } as const,
    },
  ])(
    '$argv: the Readout in that Reading Preference, a given list replacing the default',
    async ({ argv, preference }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(argv, [asked()], { journalFolder })

      const expected = expectedConsultation()
      expect(ended.stdout).toBe(
        await readoutOf(expected, {
          ...defaultReadingPreference,
          ...preference,
        }),
      )
      expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
      expect(ended.exitCode).toBe(0)
    },
  )

  it.each([
    {
      shown: 'an unknown --translation',
      argv: ['--translation', 'legge-1883'],
    },
    {
      shown: 'a Chinese EditionId as a --translation',
      argv: ['--translation', 'wuyingdian-1739'],
    },
    {
      shown: 'the Simplified Chinese EditionId as a --translation',
      argv: ['--translation', 'wuyingdian-1739-simplified'],
    },
    {
      shown: 'a --translation given twice',
      argv: ['--translation', 'legge-1882', '--translation', 'legge-1882'],
    },
  ])(
    '$shown: the usage line before any prompt, exit 1, only the Catalogue touched',
    async ({ argv }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(argv, [asked()], { journalFolder })

      expect(ended.stderr).toBe(line(usage))
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(1)
      expect(
        ended.touched.filter((port) => port !== 'Scripture Catalogue'),
      ).toEqual([])
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )

  it.each([
    { shown: 'an unknown --commentary', argv: ['--commentary', 'bogus'] },
    {
      shown: 'a --commentary not written as its id',
      argv: ['--commentary', 'Tuan'],
    },
    {
      shown: 'a --commentary given twice',
      argv: ['--commentary', 'daxiang', '--commentary', 'daxiang'],
    },
  ])(
    '$shown: the usage line before any prompt, exit 1, no port touched',
    async ({ argv }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(argv, [asked()], { journalFolder })

      expect(ended.stderr).toBe(line(usage))
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(1)
      expect(ended.touched).toEqual([])
      expect(await filesIn(path.dirname(journalFolder))).toEqual([])
    },
  )

  it('the Catalogue fails while a --translation is checked: its line before any prompt, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom(['--translation', 'legge-1882'], [asked()], {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        editions: () => Promise.reject(new Error('the Catalogue failed')),
      },
    })

    expect(ended.stderr).toBe(catalogueFailed)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).toEqual(['Scripture Catalogue'])
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })
})

const stdinUnreadable = line('hexagram-random: stdin cannot be read')
const stdoutUnwritable = line('hexagram-random: stdout cannot be written')

/** A closed pipe's write error, as Node reports it. */
function brokenPipe(): Error {
  return Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })
}

/**
 * A list that resolves as a value but throws `error` at any use: the
 * failure comes after the port has answered, so no port failed.
 */
function throwingList(error: Error): never[] {
  return new Proxy<never[]>([], {
    get: (_target, key) => {
      // Not thenable, so it resolves as a value.
      if (key === 'then') return
      throw error
    },
  })
}

describe('hexagram-random in plain mode: only a Catalogue port failure is the Catalogue line', () => {
  it('an error from no port while the Readout is built: the keep still runs, then the run rejects with that error', async () => {
    const bug = new Error('an invented bug in building the Readout')
    const journalFolder = await temporaryJournal()
    const ended = await settleRandom([], [asked()], {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        trigramNames: () => Promise.resolve(throwingList(bug)),
      },
    })

    const expected = expectedConsultation()
    expect(ended.outcome.status === 'rejected' && ended.outcome.reason).toBe(
      bug,
    )
    expect(ended.stdout).toBe('')
    expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it.each([
    {
      shown: 'throws a TypeError',
      passageTexts: (): never => {
        throw new TypeError('bug')
      },
    },
    {
      shown: 'rejects with a TypeError',
      passageTexts: () => Promise.reject(new TypeError('bug')),
    },
  ])(
    'a Catalogue port that $shown is still the Catalogue line, then the kept line, exit 1',
    async ({ passageTexts }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom([], [asked()], {
        journalFolder,
        scriptureCatalogue: { ...bundledScriptureCatalogue, passageTexts },
      })

      const expected = expectedConsultation()
      expect(ended.stderr).toBe(
        promptLine + catalogueFailed + keptLine(journalFolder, expected),
      )
      expect(ended.stdout).toBe('')
      expect(ended.exitCode).toBe(1)
      expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
    },
  )

  it('--translation legge-1882 with an error from no port while it is checked: the run rejects with that error, no Catalogue line', async () => {
    const bug = new Error('an invented bug in checking the options')
    const journalFolder = await temporaryJournal()
    const ended = await settleRandom(
      ['--translation', 'legge-1882'],
      [asked()],
      {
        journalFolder,
        scriptureCatalogue: {
          ...bundledScriptureCatalogue,
          editions: () => Promise.resolve(throwingList(bug)),
        },
      },
    )

    expect(ended.outcome.status === 'rejected' && ended.outcome.reason).toBe(
      bug,
    )
    expect(ended.stderr).toBe('')
    expect(ended.stdout).toBe('')
    // The Editions are looked up to check the option; nothing else is.
    expect(
      ended.touched.filter((port) => port !== 'Scripture Catalogue'),
    ).toEqual([])
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })
})

describe('hexagram-random in plain mode: a carriage return at the very end of input', () => {
  it('a Query, then a CR, then stdin ends: the Query is kept without the CR', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [typed(`${xZhiX.query}\r`), stdinEnds], {
      journalFolder,
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('a lone CR, then stdin ends: a blank Query, asked again, then the Query-not-given line, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [typed('\r'), stdinEnds], {
      journalFolder,
    })

    expect(ended.stderr).toBe(promptLine + blank + promptLine + notGiven)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).toEqual([])
  })

  it('a CR inside a Query line is kept as typed', async () => {
    const query = 'Will the invented ferry\rrun before the thaw?'
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked(query)], { journalFolder })

    const expected = expectedConsultation(query)
    expect(ended.stdout).toBe(await readoutOf(expected))
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })
})

describe('hexagram-random in plain mode: a stream that fails', () => {
  it('stdin cannot be read before the Query: its line, exit 1, nothing kept, no port touched', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom(
      [],
      [stdinFails(new Error('EISDIR: illegal operation on a directory, read'))],
      { journalFolder },
    )

    expect(ended.stderr).toBe(promptLine + stdinUnreadable)
    expect(ended.stdout).toBe('')
    expect(ended.exitCode).toBe(1)
    expect(ended.touched).toEqual([])
    expect(ended.pauses).toBeGreaterThan(0)
    expect(await filesIn(path.dirname(journalFolder))).toEqual([])
  })

  it('stdin fails after the Query: heard and ignored, the Consultation kept, exit 0', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      duringKeep: (terminal) => {
        terminal.stdinFailsNow(new Error('an invented read error'))
      },
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
    expect(ended.exitCode).toBe(0)
    expect(ended.pauses).toBeGreaterThan(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('stdout fails (EPIPE) on the tick after the Readout: the keep completes, its line, then the stdout line, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      stdoutFailsAfterWrite: brokenPipe(),
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(
      promptLine + keptLine(journalFolder, expected) + stdoutUnwritable,
    )
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('stdout fails (EPIPE) while the keep is pending: the keep completes, its line, then the stdout line, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      duringKeep: (terminal) => {
        terminal.stdoutFailsNow(brokenPipe())
      },
    })

    const expected = expectedConsultation()
    expect(ended.stderr).toBe(
      promptLine + keptLine(journalFolder, expected) + stdoutUnwritable,
    )
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it('stdout fails (EPIPE) and the keep fails: the Journal line, then the stdout line, exit 1', async () => {
    const journalFolder = await unwritableJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      stdoutFailsAfterWrite: brokenPipe(),
    })

    expect(ended.stderr).toBe(promptLine + journalFailed + stdoutUnwritable)
    expect(ended.exitCode).toBe(1)
  })

  it('stderr fails: heard and ignored, the Consultation kept, exit 0', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      stderrFailsAfterWrite: brokenPipe(),
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
    expect(ended.exitCode).toBe(0)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })
})

/**
 * The bundled Catalogue behind a class whose methods read `this`, as a
 * Catalogue built as a class may: called detached, each one throws.
 */
class CatalogueReadingThis implements ScriptureCatalogue {
  readonly #inner: ScriptureCatalogue = bundledScriptureCatalogue

  passageTexts(...args: Parameters<ScriptureCatalogue['passageTexts']>) {
    return this.#inner.passageTexts(...args)
  }

  hexagramNames(...args: Parameters<ScriptureCatalogue['hexagramNames']>) {
    return this.#inner.hexagramNames(...args)
  }

  receivedSequenceNumber(
    ...args: Parameters<ScriptureCatalogue['receivedSequenceNumber']>
  ) {
    return this.#inner.receivedSequenceNumber(...args)
  }

  trigramNames(...args: Parameters<ScriptureCatalogue['trigramNames']>) {
    return this.#inner.trigramNames(...args)
  }

  editions(...args: Parameters<ScriptureCatalogue['editions']>) {
    return this.#inner.editions(...args)
  }
}

describe('hexagram-random in plain mode: a late stdout failure, a Catalogue reading this, and an error with a stdout failure', () => {
  it('stdout fails after write returns and before its callback: the Readout, the kept line, the stdout line, exit 1', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      stdoutFailsLate: brokenPipe(),
    })

    const expected = expectedConsultation()
    expect(ended.stdout).toBe(xZhiXFixture)
    expect(ended.stderr).toBe(
      promptLine + keptLine(journalFolder, expected) + stdoutUnwritable,
    )
    expect(ended.exitCode).toBe(1)
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })

  it.each([
    { shown: 'with no option', argv: [] },
    {
      shown: 'with --translation legge-1882',
      argv: ['--translation', 'legge-1882'],
    },
  ])(
    'a Catalogue whose methods read this still gives the Readout, $shown',
    async ({ argv }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(argv, [asked()], {
        journalFolder,
        scriptureCatalogue: new CatalogueReadingThis(),
        catalogueAsGiven: true,
      })

      const expected = expectedConsultation()
      expect(ended.stdout).toBe(xZhiXFixture)
      expect(ended.stderr).toBe(promptLine + keptLine(journalFolder, expected))
      expect(ended.exitCode).toBe(0)
    },
  )

  it('an error from no port while the Readout is built, and stdout fails during the keep: the kept line, the stdout line, then the run rejects with that error', async () => {
    const bug = new Error('an invented bug in building the Readout')
    const journalFolder = await temporaryJournal()
    const ended = await settleRandom([], [asked()], {
      journalFolder,
      scriptureCatalogue: {
        ...bundledScriptureCatalogue,
        trigramNames: () => Promise.resolve(throwingList(bug)),
      },
      duringKeep: (terminal) => {
        terminal.stdoutFailsNow(brokenPipe())
      },
    })

    const expected = expectedConsultation()
    expect(ended.outcome.status === 'rejected' && ended.outcome.reason).toBe(
      bug,
    )
    expect(ended.stdout).toBe('')
    expect(ended.stderr).toBe(
      promptLine + keptLine(journalFolder, expected) + stdoutUnwritable,
    )
    expect(await keptConsultations(journalFolder)).toStrictEqual([expected])
  })
})

describe('hexagram-random in plain mode: a newline wherever the terminal echoed none', () => {
  it('stdin a TTY, the Query answered: the terminal echoed the line, so no newline follows the prompt', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom(['--plain'], [asked()], {
      journalFolder,
      isTTY: true,
      stdinIsTTY: true,
    })

    expect(ended.stderr).toBe(
      prompt + keptLine(journalFolder, expectedConsultation()),
    )
    expect(ended.exitCode).toBe(0)
  })

  it('stdin a TTY, a blank Query then the Query: no newline after either prompt', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom(['--plain'], [typed('\n'), asked()], {
      journalFolder,
      isTTY: true,
      stdinIsTTY: true,
    })

    expect(ended.stderr).toBe(
      prompt + blank + prompt + keptLine(journalFolder, expectedConsultation()),
    )
  })

  it('stdin not a TTY, the Query answered: a newline after the prompt', async () => {
    const journalFolder = await temporaryJournal()
    const ended = await runRandom([], [asked()], {
      journalFolder,
      stdinIsTTY: false,
    })

    expect(ended.stderr).toBe(
      `${queryPrompt}\n${consultationKeptLine(
        path.join(journalFolder, consultationFileName(expectedConsultation())),
        paletteFor(true),
      )}\n`,
    )
    expect(ended.exitCode).toBe(0)
  })

  it.each([
    { shown: 'a TTY', stdinIsTTY: true },
    { shown: 'not a TTY', stdinIsTTY: false },
  ])(
    'stdin $shown ends at the Query prompt: a newline, then the Query-not-given line',
    async ({ stdinIsTTY }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(['--plain'], [stdinEnds], {
        journalFolder,
        isTTY: true,
        stdinIsTTY,
      })

      expect(ended.stderr).toBe(
        `${queryPrompt}\n${queryNotGivenLine('hexagram-random')}\n`,
      )
      expect(ended.exitCode).toBe(1)
      expect(ended.touched).toEqual([])
    },
  )

  it.each([
    { shown: 'a TTY', stdinIsTTY: true },
    { shown: 'not a TTY', stdinIsTTY: false },
  ])(
    'stdin $shown, Ctrl+C at the Query prompt: one newline, never two',
    async ({ stdinIsTTY }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(['--plain'], [ctrlC], {
        journalFolder,
        isTTY: true,
        stdinIsTTY,
      })

      expect(ended.stderr).toBe(`${queryPrompt}\n`)
      expect(ended.exitCode).toBe(0)
    },
  )

  it.each([
    { shown: 'a TTY', stdinIsTTY: true, first: prompt },
    { shown: 'not a TTY', stdinIsTTY: false, first: promptLine },
  ])(
    'stdin $shown, Ctrl+C after a blank Query: the second prompt gets one newline, never two',
    async ({ stdinIsTTY, first }) => {
      const journalFolder = await temporaryJournal()
      const ended = await runRandom(['--plain'], [typed('  \n'), ctrlC], {
        journalFolder,
        isTTY: true,
        stdinIsTTY,
      })

      expect(ended.stderr).toBe(`${first}${blank}${queryPrompt}\n`)
      expect(ended.exitCode).toBe(0)
    },
  )
})
