// Signal 1's proof for paths (ADR-0042, R-255, R-256), run by `drift:prove`
// whenever `--only` names a D code or is absent. It runs `drift:check --root`
// on `fixtures/signal-1/`, a stand-in repo, and expects exit 1 with exactly
// the expected D reports, matched both ways; reports of other codes are
// other signals' to judge (R-214). Every report must be in R-209's order,
// before the "files parsed" line, then signal 1's summary, signal 2's and
// signal 4's, in that order (R-255). It then runs the tool errors and the
// stand-in without an exception file on temporary copies, and the readers
// and the checker in memory, each document with LF and CRLF. The contract
// is `doc-truth-finding.ts`'s.

import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  ExceptionsRead,
  PathCheck,
  SourceRead,
  SourceWord,
} from './doc-truth-finding.js'
import {
  exceptedIn,
  exceptions,
  expected,
  files,
  formerRoots,
  formerRootsIn,
  named,
  scanned,
  sources,
  statuses,
  summary,
} from './fixtures/signal-1/expected.js'
import {
  compareCodes,
  compareReports,
  describeRun,
  type Codes,
  type Report,
} from './prove-signal-4.js'
import { runTsx } from './run-tsx.js'

interface Signal1 {
  readExceptions: (text: string) => ExceptionsRead
  readSource: (text: string) => SourceRead
  checkPaths: (
    root: string,
    words: readonly SourceWord[],
    formerRoots: readonly string[],
    excepted: ReadonlySet<string>,
  ) => Promise<PathCheck>
}

const fixtureRoot = fileURLToPath(
  new URL('fixtures/signal-1/', import.meta.url),
)
const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const checkEntry = fileURLToPath(new URL('check.ts', import.meta.url))
const exceptionFile = 'scripts/drift/doc-truth-exceptions.md'
const reportLine = /^(\S+):(\d+) (D\d): /
const lineEndings: readonly (readonly [string, string])[] = [
  ['LF', '\n'],
  ['CRLF', '\r\n'],
]

function judge(source: Readonly<Record<string, readonly string[]>>) {
  return (only: ReadonlySet<string>, file?: string): Codes => {
    const wanted: Codes = new Map()
    for (const [key, codes] of Object.entries(source)) {
      if (file !== undefined && !key.startsWith(`${file}:`)) continue
      const kept = codes.filter((code) => only.has(code)).toSorted()
      if (kept.length > 0) wanted.set(key, kept)
    }
    return wanted
  }
}

const expectedFor = judge(expected)

// Without an exception file there are no exceptions and no former roots
// (R-254): no D4, the excepted name in `AGENTS.md` is a miss, and the
// `legacy/` paths have no root entry, so are not candidates (R-251).
const withoutExceptions: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(
    Object.entries(expected).filter(
      ([key]) => !key.startsWith(`${exceptionFile}:`),
    ),
  ),
  'AGENTS.md:32': ['D1'],
}

function fileOf(key: string): string {
  return key.replace(/:\d+$/, '')
}

// The summaries in the order R-255 sets: signal 1's counted from the
// expected list, one finding per report line; the stand-in's `CONTEXT.md`
// marks no form and its code holds no ID, so signals 2 and 4 find nothing.
function summaries(): readonly string[] {
  const keys = Object.keys(expected)
  const findings = Object.values(expected).flat().length
  const filesWith = new Set(keys.map(fileOf)).size
  return [
    `signal 1: ${findings} findings in ${filesWith} files (${summary.documentsRead} documents read, ${summary.exceptions} exceptions, former roots: ${summary.formerRoots})`,
    'signal 2: 0 findings in 0 files (0 forms checked, 0 unmarked)',
    'signal 4: 0 findings in 0 files',
  ]
}

// What each D report says (R-255): a one-name D1 word for word; every D
// report quotes its names and cites ADR-0042 and R-195; a D2 says its glob
// matches nothing.
function proveMessages(reports: readonly Report[]): string[] {
  const failures: string[] = []
  for (const report of reports) {
    const names = named[`${report.file}:${report.line}`] ?? []
    const [only] = names
    if (report.code === 'D1' && names.length === 1 && only !== undefined) {
      const want = `${report.file}:${report.line} D1: path "${only}" does not exist; docs name only what exists (ADR-0042, R-195)`
      if (report.text !== want)
        failures.push(
          `drift:check: expected ${JSON.stringify(want)}, got ${JSON.stringify(report.text)} (R-255)`,
        )
      continue
    }
    if (!report.text.includes('ADR-0042') || !report.text.includes('R-195'))
      failures.push(
        `drift:check: ${JSON.stringify(report.text)} does not cite ADR-0042 and R-195 (R-255)`,
      )
    for (const name of names)
      if (!report.text.includes(`"${name}"`))
        failures.push(
          `drift:check: ${JSON.stringify(report.text)} does not quote "${name}" (R-255)`,
        )
    if (report.code === 'D2' && !report.text.includes('matches nothing'))
      failures.push(
        `drift:check: ${JSON.stringify(report.text)} does not say the glob matches nothing (R-255)`,
      )
  }
  return failures
}

// Every report precedes the "files parsed" line, and the summaries follow
// it, each exactly, in order (R-209, R-247, R-255).
function proveOrder(lines: readonly string[], reports: Report[]): string[] {
  const failures: string[] = []
  const sorted = reports.toSorted(compareReports)
  if (sorted.some((report, index) => report !== reports[index]))
    failures.push(
      'drift:check: reports are not sorted by file, line and code (R-209)',
    )
  const parsed = lines.findIndex((line) =>
    new RegExp(String.raw`(?<!\d)${scanned} files parsed\b`).test(line),
  )
  if (parsed === -1)
    failures.push(`drift:check: no "${scanned} files parsed" line in stdout`)
  if (parsed !== -1 && reports.some((report) => report.index > parsed))
    failures.push('drift:check: a report follows the "files parsed" line')
  let previous = parsed
  for (const wanted of summaries()) {
    const at = lines.indexOf(wanted)
    if (at === -1 || at < previous)
      failures.push(
        `drift:check: no "${wanted}" line after the one before it (R-255)`,
      )
    previous = Math.max(previous, at)
  }
  return failures
}

function parseReports(stdout: string): {
  lines: string[]
  reports: Report[]
} {
  const lines = stdout.split('\n')
  const reports: Report[] = []
  for (const [index, text] of lines.entries()) {
    const [, file = '', line = '', code = ''] = reportLine.exec(text) ?? []
    if (code !== '')
      reports.push({ index, file, line: Number(line), code, text })
  }
  return { lines, reports }
}

function reportedCodes(
  reports: readonly Report[],
  only: ReadonlySet<string>,
  failures: string[],
): Codes {
  const reported: Codes = new Map()
  for (const { file, line, code } of reports) {
    if (!only.has(code)) continue
    const key = `${file}:${line}`
    const codes = reported.get(key) ?? []
    if (codes.includes(code))
      failures.push(`drift:check: ${key} ${code} is reported twice (R-230)`)
    reported.set(key, [...codes, code].toSorted())
  }
  return reported
}

async function proveCheck(only: ReadonlySet<string>): Promise<string[]> {
  const run = await runTsx(checkEntry, ['--root', fixtureRoot])
  if (run.code !== 1)
    return [
      `drift:check on signal 1's fixtures: expected exit 1, got ${describeRun(run)}`,
    ]
  const { lines, reports } = parseReports(run.stdout)
  const failures: string[] = []
  const reported = reportedCodes(reports, only, failures)
  return [
    ...failures,
    ...compareCodes('drift:check', expectedFor(only), reported),
    ...proveMessages(reports),
    ...proveOrder(lines, reports),
  ]
}

async function proveFilesListed(): Promise<string[]> {
  const entries = await readdir(fixtureRoot, {
    recursive: true,
    withFileTypes: true,
  })
  const onDisk = entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path
        .relative(fixtureRoot, path.join(entry.parentPath, entry.name))
        .replaceAll('\\', '/'),
    )
    .filter((file) => file !== 'expected.ts')
  return [
    ...onDisk
      .filter((file) => !files.includes(file))
      .map((file) => `${file}: on disk but missing from expected.ts`),
    ...files
      .filter((file) => !onDisk.includes(file))
      .map((file) => `${file}: listed in expected.ts but missing`),
  ]
}

// Edits the stand-in's exception file line by line: `at` is a 1-based line
// to insert before, or to replace when `replace` is set.
function edited(
  text: string,
  at: number,
  line: string,
  replace = false,
): string {
  const lines = text.split('\n')
  lines.splice(at - 1, replace ? 1 : 0, line)
  return lines.join('\n')
}

type ToolError = readonly [
  label: string,
  change: (exceptionText: string) => string,
  naming: string,
  removeAgents?: boolean,
]

// Each tool error exits 2, naming the line, and prints no summary (R-220,
// R-253, R-254). The lines are the stand-in exception file's: entry 7's
// reason emptied; entry 7 repeated as line 13; `docs/`, which exists, added
// as a former root on line 17.
const toolErrors: readonly ToolError[] = [
  [
    'a missing reason',
    (text) =>
      edited(text, 7, '| `AGENTS.md` | `docs/planned/guide.md` |  |', true),
    `${exceptionFile}:7`,
  ],
  [
    'a duplicate entry',
    (text) =>
      edited(
        text,
        13,
        '| `AGENTS.md` | `docs/planned/guide.md` | the same entry again |',
      ),
    `${exceptionFile}:13`,
  ],
  [
    'an existing former root',
    (text) => edited(text, 17, '- `docs/`'),
    `${exceptionFile}:17`,
  ],
  ['no AGENTS.md', (text) => text, 'AGENTS.md', true],
]

async function proveToolErrors(only: ReadonlySet<string>): Promise<string[]> {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'drift-signal-1-'))
  try {
    const failures: string[] = []
    const original = await readFile(
      path.join(fixtureRoot, exceptionFile),
      'utf8',
    )
    for (const [
      index,
      [label, change, naming, removeAgents],
    ] of toolErrors.entries()) {
      const repo = path.join(temp, String(index))
      await cp(fixtureRoot, repo, { recursive: true })
      await writeFile(path.join(repo, exceptionFile), change(original))
      if (removeAgents === true) await rm(path.join(repo, 'AGENTS.md'))
      const run = await runTsx(checkEntry, ['--root', repo])
      if (
        run.code !== 2 ||
        !run.stderr.includes(naming) ||
        /files parsed|signal \d:/.test(run.stdout)
      )
        failures.push(
          `drift:check with ${label}: expected exit 2 naming ${naming} and no summary, got ${describeRun(run)}`,
        )
    }
    // No exception file at all is not an error (R-254).
    const bare = path.join(temp, 'no-exception-file')
    await cp(fixtureRoot, bare, { recursive: true })
    await rm(path.join(bare, exceptionFile))
    const run = await runTsx(checkEntry, ['--root', bare])
    if (run.code === 1) {
      const reported = reportedCodes(
        parseReports(run.stdout).reports,
        only,
        failures,
      )
      failures.push(
        ...compareCodes(
          'drift:check without an exception file',
          judge(withoutExceptions)(only),
          reported,
        ),
      )
    } else
      failures.push(
        `drift:check without an exception file: expected exit 1, got ${describeRun(run)}`,
      )
    return failures
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

function describeExceptions(read: ExceptionsRead): string {
  if (!read.ok) return `an error naming line ${read.line}`
  const entries = read.exceptions.map(
    ({ line, file, name }) => `${line} ${file} ${name}`,
  )
  const roots = read.formerRoots.map(({ line, root }) => `${line} ${root}`)
  return `entries [${entries.join('; ')}], former roots [${roots.join('; ')}]`
}

// R-254's seed, word for word, as the real exception file must hold it.
const seed = [
  [
    'docs/adr/0042-how-the-overhaul-is-built.md',
    'docs/manual/cli.md',
    'planned, written and ratified before the CLI phase',
  ],
  [
    'docs/adr/0042-how-the-overhaul-is-built.md',
    'docs/manual/rest.md',
    'planned, written and ratified before the REST phase (R-008)',
  ],
  [
    'docs/adr/0019-domain-cli-boundary.md',
    'cli/cli',
    'a former location the ADR names as history',
  ],
] as const

async function proveExceptions(signal1: Signal1): Promise<string[]> {
  const failures: string[] = []
  const text = await readFile(path.join(fixtureRoot, exceptionFile), 'utf8')
  const want = `entries [${exceptions.map(({ line, file, name }) => `${line} ${file} ${name}`).join('; ')}], former roots [${formerRoots.map(({ line, root }) => `${line} ${root}`).join('; ')}]`
  const cases: [string, string, string][] = lineEndings.map(
    ([ending, terminator]) => [
      `the fixture (${ending})`,
      text.replaceAll('\n', terminator),
      want,
    ],
  )
  cases.push(
    [
      'a missing reason',
      edited(text, 7, '| `AGENTS.md` | `docs/planned/guide.md` |  |', true),
      'an error naming line 7',
    ],
    [
      'a missing cell',
      edited(text, 7, '| `AGENTS.md` | `docs/planned/guide.md` |', true),
      'an error naming line 7',
    ],
    [
      'a duplicate entry',
      edited(text, 13, '| `AGENTS.md` | `docs/planned/guide.md` | again |'),
      'an error naming line 13',
    ],
  )
  for (const [label, caseText, wanted] of cases) {
    const got = describeExceptions(signal1.readExceptions(caseText))
    if (got !== wanted)
      failures.push(`readExceptions, ${label}: expected ${wanted}, read ${got}`)
  }
  const real = signal1.readExceptions(
    await readFile(path.join(repoRoot, exceptionFile), 'utf8'),
  )
  const gotSeed = real.ok
    ? [
        ...real.exceptions.map(({ file, name, reason }) =>
          [file, name, reason].join(' | '),
        ),
        ...real.formerRoots.map(({ root }) => root),
      ]
    : [`an error naming line ${real.line}`]
  const wantSeed = [...seed.map((row) => row.join(' | ')), 'packages/']
  if (gotSeed.join('\n') !== wantSeed.join('\n'))
    failures.push(
      `readExceptions, the real seed: expected ${JSON.stringify(wantSeed)}, read ${JSON.stringify(gotSeed)} (R-254)`,
    )
  return failures
}

async function proveStatuses(signal1: Signal1): Promise<string[]> {
  const failures: string[] = []
  for (const [file, status] of Object.entries(statuses)) {
    const text = await readFile(path.join(fixtureRoot, file), 'utf8')
    for (const [ending, terminator] of lineEndings) {
      const got = signal1.readSource(text.replaceAll('\n', terminator)).status
      if (got !== status)
        failures.push(
          `readSource, ${file} (${ending}): expected status ${JSON.stringify(status)}, read ${JSON.stringify(got)} (R-253)`,
        )
    }
  }
  return failures
}

function describeCounts(counts: ReadonlyMap<string, number>): string {
  return (
    [...counts]
      .map(([root, count]) => `${root} ${count}`)
      .toSorted()
      .join(', ') || 'none'
  )
}

// Every read document through `readSource` and `checkPaths`, given the
// fixture's former roots and that document's exceptions directly, so a
// checker fault is not hidden behind a reader's.
async function proveChecker(
  signal1: Signal1,
  only: ReadonlySet<string>,
): Promise<string[]> {
  const failures: string[] = []
  const roots = formerRoots.map(({ root }) => root)
  for (const file of sources) {
    const text = await readFile(path.join(fixtureRoot, file), 'utf8')
    const excepted = new Set(
      exceptions.filter((entry) => entry.file === file).map(({ name }) => name),
    )
    for (const [ending, terminator] of lineEndings) {
      const label = `checkPaths, ${file} (${ending})`
      const { words } = signal1.readSource(text.replaceAll('\n', terminator))
      const check = await signal1.checkPaths(
        fixtureRoot,
        words,
        roots,
        excepted,
      )
      const reported: Codes = new Map()
      for (const { line, code, names } of check.findings) {
        const key = `${file}:${line}`
        const wantNames = named[key]
        if (
          wantNames !== undefined &&
          names.join(', ') !== wantNames.join(', ')
        )
          failures.push(
            `${label}: ${key} ${code}: expected names ${wantNames.join(', ')}, found ${names.join(', ')}`,
          )
        if (!only.has(code)) continue
        reported.set(key, [...(reported.get(key) ?? []), code].toSorted())
      }
      failures.push(...compareCodes(label, expectedFor(only, file), reported))
      const wantExcepted = (exceptedIn[file] ?? []).join(', ') || 'none'
      const gotExcepted = check.excepted.toSorted().join(', ') || 'none'
      if (gotExcepted !== wantExcepted)
        failures.push(
          `${label}: expected excepted ${wantExcepted}, got ${gotExcepted}`,
        )
      const wantRoots = describeCounts(
        new Map(Object.entries(formerRootsIn[file] ?? {})),
      )
      const gotRoots = describeCounts(check.formerRoots)
      if (gotRoots !== wantRoots)
        failures.push(
          `${label}: expected former roots ${wantRoots}, counted ${gotRoots}`,
        )
    }
  }
  return failures
}

async function proveInMemory(only: ReadonlySet<string>): Promise<string[]> {
  let signal1: Signal1
  try {
    // Loaded here, so a missing module fails this proof alone (R-215).
    signal1 = (await import('./signal-1.js')) as Signal1
  } catch (error) {
    return [`signal-1.ts cannot be loaded: ${String(error)}`]
  }
  return [
    ...(await proveExceptions(signal1)),
    ...(await proveStatuses(signal1)),
    ...(await proveChecker(signal1, only)),
  ]
}

export async function proveSignal1(
  only: ReadonlySet<string>,
): Promise<string[]> {
  return [
    ...(await proveFilesListed()),
    ...(await proveCheck(only)),
    ...(await proveToolErrors(only)),
    ...(await proveInMemory(only)),
  ]
}
