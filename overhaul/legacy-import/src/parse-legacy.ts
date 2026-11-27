import type { LegacyRecord } from '@hexagram/application/import-legacy-files'
import {
  isDay,
  isUtcOffset,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import { divide, emptyCasting } from '@hexagram/oracle/division'
import type { Transformation } from '@hexagram/oracle/transformation'
import jsYaml from 'js-yaml'

/**
 * A file the importer was given, as its adapter read it: the parser reads
 * no file itself, so the CLI and the PWA share it (ADR-0037).
 */
export interface LegacyFile {
  /**
   * The file's name, without its folder. A legacy `.txt` file's name holds
   * its Divined At, as `consultation-YYYY-MM-DDTHH-mm-ss±HHMM.txt`; the
   * extension tells a legacy `.txt` file from a version-1 `.md` one.
   */
  readonly name: string
  /** The file's text, decoded as UTF-8. */
  readonly text: string
}

/**
 * Where a parsed record's Casting came from, for the import's report: why a
 * legacy file has no usable Casting is the importer's concern, never the
 * Journal's (ADR-0026).
 *
 * - `replays`: the file's Picks replay from the Empty Casting to its
 *   Transformation, so it is a Cast Consultation's.
 * - `none`: the file holds no Casting (a legacy file with no table, or a
 *   version-1 file with no `casting` key, whose writer wrote
 *   `castingAbsence` instead), so it is a Recorded Consultation's.
 * - `does-not-replay`: the file holds a Casting that does not replay to its
 *   Transformation, or a stored stalk count or Right Heap that disagrees
 *   with the replay, or a table of fewer than six rows, or one that cannot
 *   be read, so it is a Recorded Consultation's.
 */
export type LegacyCasting = 'replays' | 'none' | 'does-not-replay'

/**
 * Why a legacy or version-1 file cannot be imported: a closed list, so each
 * channel words it its own way.
 *
 * - `no-frontmatter`: a `.md` file with no frontmatter to hold a record.
 * - `not-yaml`: a `.md` file whose frontmatter is not YAML.
 * - `not-version-1`: a `.md` file whose record is not a mapping with
 *   `schemaVersion` `1`, other than a version-2 one; an empty frontmatter
 *   among them.
 * - `invalid-field`: the file gives no valid value for the named field of a
 *   Consultation: `divinedAt` from a legacy file's name or a version-1
 *   `timestamp`; `query`, which must not be blank nor the old app's
 *   `(Query not provided)`; `transformation` from a legacy file's Line
 *   Values or a version-1 `hexagram`. When several fields are bad, the
 *   first in ADR-0046's order is named: `divinedAt`, `query`, then
 *   `transformation`.
 */
export type LegacyUnreadableReason =
  | { readonly kind: 'no-frontmatter' }
  | { readonly kind: 'not-yaml' }
  | { readonly kind: 'not-version-1' }
  | {
      readonly kind: 'invalid-field'
      readonly field: 'divinedAt' | 'query' | 'transformation'
    }

/**
 * What a file holds: a record use case 7 keeps, with where its Casting came
 * from; nothing to import; or why it cannot be imported.
 */
export type LegacyParseResult =
  | {
      readonly outcome: 'parsed'
      readonly record: LegacyRecord
      readonly casting: LegacyCasting
    }
  | { readonly outcome: 'not-legacy' }
  | { readonly outcome: 'unreadable'; readonly reason: LegacyUnreadableReason }

/**
 * Reads one file the importer was given (ADR-0026, ADR-0037):
 *
 * - a name ending `.txt` is a legacy file: its Query, its six Line Values
 *   and, when it has one, its Casting table, in either of its two layouts,
 *   read after ANSI SGR sequences, and only those, are stripped; its
 *   Divined At is the Moment its name holds, with no milliseconds, and the
 *   name must be exactly `consultation-YYYY-MM-DDTHH-mm-ss±HHMM.txt`;
 * - a name ending `.md` is a version-1 file when its frontmatter's
 *   `schemaVersion` is `1`: its `timestamp` is the Divined At, a string
 *   `YYYY-MM-DDTHH:mm:ss`, then an optional fraction truncated to the
 *   millisecond, then `Z` (read as `+00:00`), `±HH:MM` or `±HHMM`; its
 *   `hexagram` mapping, keyed `L6` to `L1`, the Transformation, and its
 *   `casting`, when the key is present, the Picks, each Line's stalk counts
 *   checked against the replay; a version-2 file is `not-legacy`, so the
 *   Journal's own files are never imported or moved;
 * - any other name is `not-legacy`.
 *
 * The importer's adapter chooses which files to pass: the regular files
 * directly in a folder given whose names end `.txt` or `.md`, matched
 * case-sensitively, with no recursion, so `legacy/` and `deleted/` are
 * never read; non-regular entries in a folder are ignored, and a path
 * named explicitly that is not a regular file is skipped as not a regular
 * file without reaching the parser.
 *
 * A Casting that replays from the Empty Casting, by the Oracle's Divisions,
 * to the file's Transformation makes a Cast Consultation's record; any
 * other file that parses makes a Recorded Consultation's, from the file's
 * Transformation alone. No Casting is ever invented (ADR-0026). The Query
 * is the text the file holds; a legacy file's multi-line Query loses only
 * the layout's exact two-space indent on each line. A Divined At in any
 * other form, or naming a date or time that does not exist, is
 * `invalid-field` `divinedAt`, never normalised. A file saved with Windows
 * line endings is read as its LF copy: each `\r\n` is read as `\n` before
 * either layout is parsed, and a lone `\r` is kept as it is. It never
 * throws.
 */
export function parseLegacyFile(file: LegacyFile): LegacyParseResult {
  const text = file.text.replaceAll('\r\n', '\n')
  if (file.name.endsWith('.txt')) return parseLegacyText(file.name, text)
  if (file.name.endsWith('.md')) return parseVersion1(text)
  return { outcome: 'not-legacy' }
}

/**
 * One Round as a file stored it: its stalks less the Hung Stalk, as both
 * the legacy table's `Stalks` and version 1's `recordedMax` wrote them, and
 * its Pick.
 */
interface StoredRound {
  readonly stalksLessHung: number
  readonly pick: number
}

/** A file's Casting, Line 1 first, three Rounds a Line; undefined when it cannot be read. */
type StoredLines = readonly (readonly StoredRound[])[] | undefined

/** Whether a file holds a Casting, and if so what it stored. */
type HeldCasting =
  | { readonly held: false }
  | { readonly held: true; readonly lines: StoredLines }

const placeholderQuery = '(Query not provided)'

function invalidField(
  field: 'divinedAt' | 'query' | 'transformation',
): LegacyParseResult {
  return { outcome: 'unreadable', reason: { kind: 'invalid-field', field } }
}

function unreadable(
  kind: 'no-frontmatter' | 'not-yaml' | 'not-version-1',
): LegacyParseResult {
  return { outcome: 'unreadable', reason: { kind } }
}

function validQuery(text: unknown): Query | undefined {
  if (typeof text !== 'string' || !isQuery(text)) return undefined
  return text.trim() === placeholderQuery ? undefined : text
}

function isTransformation(
  values: readonly unknown[],
): values is Transformation {
  return (
    values.length === 6 &&
    values.every(
      (value) =>
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 6 &&
        value <= 9,
    )
  )
}

/**
 * The record a file's fields make: a Cast Consultation's when its Casting
 * replays to its Transformation, and a Recorded Consultation's otherwise.
 */
function parsedRecord(
  fields: {
    readonly query: Query
    readonly divinedAt: Moment
    readonly transformation: Transformation
  },
  casting: HeldCasting,
): LegacyParseResult {
  const { query, divinedAt, transformation } = fields
  const recorded = {
    query,
    divinedAt,
    casting: undefined,
    transformation,
  } as const
  if (!casting.held) {
    return { outcome: 'parsed', record: recorded, casting: 'none' }
  }
  const replayedCasting =
    casting.lines === undefined ? undefined : replayed(casting.lines)
  if (
    replayedCasting !== undefined &&
    replayedCasting.transformation.every(
      (value, index) => value === transformation[index],
    )
  ) {
    return {
      outcome: 'parsed',
      record: { query, divinedAt, casting: replayedCasting },
      casting: 'replays',
    }
  }
  return { outcome: 'parsed', record: recorded, casting: 'does-not-replay' }
}

/**
 * Divides by each stored Pick in turn from the Empty Casting, and gives the
 * complete Casting when every Division is taken and every stored stalk count
 * is the replay's own less the Hung Stalk.
 */
function replayed(
  lines: readonly (readonly StoredRound[])[],
): CompleteCasting | undefined {
  if (lines.length !== 6 || lines.some((line) => line.length !== 3)) {
    return undefined
  }
  const rounds = lines.flat()
  let casting: PartialCasting = emptyCasting
  for (const { pick } of rounds) {
    const result = divide(casting, pick)
    if (result.outcome === 'refused') return undefined
    if (result.casting.state === 'complete') {
      const agrees = result.casting.rounds
        .flat()
        .every(
          (round, index) => round.stalks - 1 === rounds[index]?.stalksLessHung,
        )
      return agrees ? result.casting : undefined
    }
    casting = result.casting
  }
  return undefined
}

/**
 * The Moment of a date and a wall-clock time in an offset, or undefined
 * when the date or the time does not exist or the offset is not one.
 */
function momentOf(fields: {
  readonly year: string
  readonly month: string
  readonly day: string
  readonly hours: string
  readonly minutes: string
  readonly seconds: string
  readonly milliseconds: number
  readonly offset: string
}): Moment | undefined {
  const { offset } = fields
  const day = {
    precision: 'day',
    year: Number(fields.year),
    month: Number(fields.month),
    day: Number(fields.day),
  } as const
  const hours = Number(fields.hours)
  const minutes = Number(fields.minutes)
  const seconds = Number(fields.seconds)
  if (!isDay(day) || hours > 23 || minutes > 59 || seconds > 59) {
    return undefined
  }
  if (!isUtcOffset(offset)) return undefined
  // Date.UTC reads the years 0 to 99 as 1900 to 1999, so the date is set on
  // its own.
  const instant = new Date(0)
  instant.setUTCFullYear(day.year, day.month - 1, day.day)
  instant.setUTCHours(hours, minutes, seconds, fields.milliseconds)
  const sign = offset.startsWith('-') ? -1 : 1
  const offsetMinutes =
    sign * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)))
  return {
    precision: 'moment',
    epochMilliseconds: instant.getTime() - offsetMinutes * 60_000,
    offset,
  }
}

// --- legacy `.txt` files ---------------------------------------------------

// A copy saved from a coloured terminal holds ANSI SGR sequences; no other
// escape is stripped.
// oxlint-disable-next-line no-control-regex
const sgrSequence = /\u001B\[[0-9;]*m/gu

const legacyNamePattern =
  /^consultation-(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hours>\d{2})-(?<minutes>\d{2})-(?<seconds>\d{2})(?<sign>[+-])(?<offsetHours>\d{2})(?<offsetMinutes>\d{2})\.txt$/u

function parseLegacyText(name: string, text: string): LegacyParseResult {
  const divinedAt = legacyDivinedAt(name)
  if (divinedAt === undefined) return invalidField('divinedAt')
  const lines = text.replaceAll(sgrSequence, '').split('\n')
  const query = validQuery(legacyQuery(lines))
  if (query === undefined) return invalidField('query')
  const transformation = legacyTransformation(lines)
  if (transformation === undefined) return invalidField('transformation')
  const casting: HeldCasting = lines.includes('CASTING:')
    ? { held: true, lines: legacyTable(lines) }
    : { held: false }
  return parsedRecord({ query, divinedAt, transformation }, casting)
}

/** The Moment a legacy file's name holds, in its own offset, with no milliseconds. */
function legacyDivinedAt(name: string): Moment | undefined {
  const groups = legacyNamePattern.exec(name)?.groups
  if (groups === undefined) return undefined
  const {
    year = '',
    month = '',
    day = '',
    hours = '',
    minutes = '',
    seconds = '',
    sign = '',
    offsetHours = '',
    offsetMinutes = '',
  } = groups
  return momentOf({
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    milliseconds: 0,
    offset: `${sign}${offsetHours}:${offsetMinutes}`,
  })
}

/**
 * The lines after `QUERY:` and its blank line, up to the next blank line,
 * each without the layout's exact two-space indent.
 */
function legacyQuery(lines: readonly string[]): string | undefined {
  const heading = lines.indexOf('QUERY:')
  if (heading === -1 || lines[heading + 1] !== '') return undefined
  const end = lines.indexOf('', heading + 2)
  return lines
    .slice(heading + 2, end === -1 ? undefined : end)
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n')
}

const lineValuesPattern = /^ {2}(\d+(?:,\s*\d+){5})\s*$/u

/** The first Line Values, bottom first, under `(First is line at bottom)`. */
function legacyTransformation(
  lines: readonly string[],
): Transformation | undefined {
  const heading = lines.indexOf('(First is line at bottom)')
  if (heading === -1 || lines[heading + 1] !== '') return undefined
  const values = lineValuesPattern.exec(lines[heading + 2] ?? '')?.[1]
  if (values === undefined) return undefined
  const lineValues = values.split(',').map((value) => Number(value.trim()))
  return isTransformation(lineValues) ? lineValues : undefined
}

/**
 * The Casting table's rows, in either layout: HEAP, each Round's `Stalks`,
 * `Left Heap` and `Right Heap`, or SPLIT, each Round's `Stalks` and
 * `Split`, the left heap being the Pick. Undefined unless each Line from 1
 * to 6 has exactly one row that reads, and each Right Heap is its Stalks
 * less its Left Heap.
 */
function legacyTable(lines: readonly string[]): StoredLines {
  const byPosition = new Map<number, readonly StoredRound[]>()
  for (const line of lines) {
    if (!line.startsWith('│')) continue
    const [label = '', ...cells] = line
      .split('│')
      .slice(1, -1)
      .map((cell) => cell.trim())
    const position = /^(?:Line )?(?<position>[1-6])$/u.exec(label)?.groups
      ?.position
    if (position === undefined) continue
    const rounds = tableRounds(cells)
    if (rounds === undefined || byPosition.has(Number(position))) {
      return undefined
    }
    byPosition.set(Number(position), rounds)
  }
  const ordered: (readonly StoredRound[])[] = []
  for (const position of [1, 2, 3, 4, 5, 6]) {
    const rounds = byPosition.get(position)
    if (rounds === undefined) return undefined
    ordered.push(rounds)
  }
  return ordered
}

/** One row's three Rounds, from nine HEAP cells or six SPLIT cells. */
function tableRounds(
  cells: readonly string[],
): readonly StoredRound[] | undefined {
  if (!cells.every((cell) => /^\d+$/u.test(cell))) return undefined
  const numbers = cells.map(Number)
  const width = numbers.length / 3
  if (width !== 2 && width !== 3) return undefined
  const rounds: StoredRound[] = []
  for (let at = 0; at < numbers.length; at += width) {
    const [stalksLessHung = 0, pick = 0, rightHeap] = numbers.slice(
      at,
      at + width,
    )
    if (rightHeap !== undefined && rightHeap !== stalksLessHung - pick) {
      return undefined
    }
    rounds.push({ stalksLessHung, pick })
  }
  return rounds
}

// --- version-1 `.md` files ---------------------------------------------------

const timestampPattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hours>\d{2}):(?<minutes>\d{2}):(?<seconds>\d{2})(?:\.(?<fraction>\d+))?(?<offset>Z|[+-]\d{2}:?\d{2})$/u

const positionKeys = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const

function isMapping(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseVersion1(text: string): LegacyParseResult {
  const yaml = frontmatterOf(text)
  if (yaml === undefined) return unreadable('no-frontmatter')
  let record: unknown
  try {
    // The Core schema reads only the JSON data model; the default schema
    // would also run `!!js/*` tags.
    record = jsYaml.safeLoad(yaml, { schema: jsYaml.CORE_SCHEMA })
  } catch {
    return unreadable('not-yaml')
  }
  if (!isMapping(record)) return unreadable('not-version-1')
  if (record.schemaVersion === 2) return { outcome: 'not-legacy' }
  if (record.schemaVersion !== 1) return unreadable('not-version-1')
  const divinedAt = version1DivinedAt(record.timestamp)
  if (divinedAt === undefined) return invalidField('divinedAt')
  const query = validQuery(record.query)
  if (query === undefined) return invalidField('query')
  const transformation = version1Transformation(record.hexagram)
  if (transformation === undefined) return invalidField('transformation')
  const casting: HeldCasting =
    'casting' in record
      ? { held: true, lines: version1Casting(record.casting) }
      : { held: false }
  return parsedRecord({ query, divinedAt, transformation }, casting)
}

/**
 * The YAML between a first line `---` and the next line that is exactly
 * `---`, or undefined when the file does not open so.
 */
function frontmatterOf(text: string): string | undefined {
  if (!text.startsWith('---\n')) return undefined
  // Start at the opener's own newline, so an empty block closes at once.
  let from = 3
  for (;;) {
    const at = text.indexOf('\n---', from)
    if (at === -1) return undefined
    const end = at + '\n---'.length
    if (end === text.length || text[end] === '\n') {
      return text.slice(4, Math.max(4, at))
    }
    from = at + 1
  }
}

function version1DivinedAt(timestamp: unknown): Moment | undefined {
  if (typeof timestamp !== 'string') return undefined
  const groups = timestampPattern.exec(timestamp)?.groups
  if (groups === undefined) return undefined
  const {
    year = '',
    month = '',
    day = '',
    hours = '',
    minutes = '',
    seconds = '',
    fraction = '',
    offset = '',
  } = groups
  let colonOffset = offset
  if (offset === 'Z') colonOffset = '+00:00'
  else if (!offset.includes(':')) {
    colonOffset = `${offset.slice(0, 3)}:${offset.slice(3)}`
  }
  return momentOf({
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    milliseconds: Number(fraction.slice(0, 3).padEnd(3, '0')),
    offset: colonOffset,
  })
}

/** The `hexagram` mapping, keyed `L6` to `L1`, as a Transformation bottom first. */
function version1Transformation(hexagram: unknown): Transformation | undefined {
  if (!isMapping(hexagram)) return undefined
  const lineValues = positionKeys.map((key) => hexagram[key])
  return isTransformation(lineValues) ? lineValues : undefined
}

/** The `casting` mapping, keyed `L6` to `L1`, each Line's Rounds as `{ pick, recordedMax }`. */
function version1Casting(casting: unknown): StoredLines {
  if (!isMapping(casting)) return undefined
  const lines: (readonly StoredRound[])[] = []
  for (const key of positionKeys) {
    const rounds = casting[key]
    if (!Array.isArray(rounds) || rounds.length !== 3) return undefined
    const stored: StoredRound[] = []
    for (const round of rounds) {
      if (!isMapping(round)) return undefined
      const { pick, recordedMax } = round
      if (!Number.isInteger(pick) || !Number.isInteger(recordedMax)) {
        return undefined
      }
      stored.push({ stalksLessHung: Number(recordedMax), pick: Number(pick) })
    }
    lines.push(stored)
  }
  return lines
}
