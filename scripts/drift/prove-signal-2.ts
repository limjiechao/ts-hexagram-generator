// Signal 2's proof (ADR-0042, R-247, R-248), run by `drift:prove` whenever
// `--only` names a G code or is absent. It runs `drift:check --root` on
// `fixtures/signal-2/`, a stand-in repo with an invented `CONTEXT.md`, and
// expects exit 1 with exactly the expected G reports, matched both ways, and
// the one E report R-247 plants; reports of other E codes, and on other
// lines, are signal 4's to judge. Every report must be in R-209's order,
// before the "files parsed" line, signal 2's summary and signal 4's, in that
// order; a run judging a D code also needs signal 1's empty summary before
// signal 2's (R-255). A root without `CONTEXT.md`, or with a broken span,
// exits 2 (R-243).
// It then runs `readGlossary` and `findGlossaryForms` in memory. The contract
// is `glossary-finding.ts`'s.

import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { docTruthCodes } from './doc-truth-finding.js'
import {
  ephemeralLine,
  expected,
  formsAt,
  glossary,
  named,
  scanned,
} from './fixtures/signal-2/expected.js'
import type {
  AvoidForm,
  GlossaryFinding,
  GlossaryRead,
} from './glossary-finding.js'
import {
  compareCodes,
  compareReports,
  describeRun,
  proveSignal1Summary,
  type Codes,
  type Report,
} from './prove-signal-4.js'
import { runTsx } from './run-tsx.js'
import type { ScanRecord } from './scan-record.js'

interface Signal2 {
  readGlossary: (text: string) => GlossaryRead
  findGlossaryForms: (
    file: string,
    records: readonly ScanRecord[],
    forms: readonly AvoidForm[],
  ) => GlossaryFinding[]
}
type Scanner = typeof import('./scanner.js')

const fixtureRoot = fileURLToPath(
  new URL('fixtures/signal-2/', import.meta.url),
)
const checkEntry = fileURLToPath(new URL('check.ts', import.meta.url))
const reportLine = /^(\S+):(\d+) ([A-Z]\d+): /

// The codes judged on a line: G codes everywhere, an E code only on R-247's
// one E line; each only when `--only` names it.
function judged(
  key: string,
  codes: readonly string[],
  only: ReadonlySet<string>,
): string[] {
  return codes
    .filter(
      (code) =>
        only.has(code) && (code.startsWith('G') || key === ephemeralLine),
    )
    .toSorted()
}

function expectedFor(only: ReadonlySet<string>, file?: string): Codes {
  const wanted: Codes = new Map()
  for (const [key, codes] of Object.entries(expected)) {
    if (file !== undefined && !key.startsWith(`${file}:`)) continue
    const kept = judged(key, codes, only)
    if (kept.length > 0) wanted.set(key, kept)
  }
  return wanted
}

// The summary lines the fixture must print, counted from the expected list:
// one finding per report line (R-230, R-236).
function summaries(): readonly [string, string] {
  const count = (family: string): [number, number] => {
    let findings = 0
    const files = new Set<string>()
    for (const [key, codes] of Object.entries(expected))
      for (const code of codes)
        if (code.startsWith(family)) {
          findings += 1
          files.add(key.replace(/:\d+$/, ''))
        }
    return [findings, files.size]
  }
  const [g, gFiles] = count('G')
  const [e, eFiles] = count('E')
  return [
    `signal 2: ${g} findings in ${gFiles} files (${glossary.forms.length} forms checked, ${glossary.unmarked} unmarked)`,
    `signal 4: ${e} findings in ${eFiles} files`,
  ]
}

// The order of every report and summary line, the citations, and what the
// named reports say about their forms (R-209, R-247).
function proveOutput(
  lines: readonly string[],
  reports: Report[],
  only: ReadonlySet<string>,
): string[] {
  const failures: string[] = []
  const sorted = reports.toSorted(compareReports)
  if (sorted.some((report, index) => report !== reports[index]))
    failures.push(
      'drift:check: reports are not sorted by file, line and code (R-209)',
    )
  for (const report of reports) {
    if (!report.code.startsWith('G')) continue
    if (!report.text.includes('ADR-0042') || !report.text.includes('R-197'))
      failures.push(
        `drift:check: ${JSON.stringify(report.text)} does not cite ADR-0042 and R-197 (R-247)`,
      )
    for (const phrase of named[`${report.file}:${report.line}`] ?? [])
      if (!report.text.includes(phrase))
        failures.push(
          `drift:check: ${JSON.stringify(report.text)} does not name ${phrase} (R-247)`,
        )
  }
  const parsed = lines.findIndex((line) =>
    new RegExp(String.raw`(?<!\d)${scanned.length} files parsed\b`).test(line),
  )
  const [signal2, signal4] = summaries()
  const second = lines.indexOf(signal2)
  const fourth = lines.indexOf(signal4)
  if (parsed === -1)
    failures.push(
      `drift:check: no "${scanned.length} files parsed" line in stdout`,
    )
  if (second === -1 || second < parsed)
    failures.push(
      `drift:check: no "${signal2}" line after the "files parsed" line`,
    )
  if (fourth === -1 || fourth < second)
    failures.push(`drift:check: no "${signal4}" line after signal 2's summary`)
  if (parsed !== -1 && reports.some((report) => report.index > parsed))
    failures.push('drift:check: a report follows the "files parsed" line')
  if (docTruthCodes.some((code) => only.has(code)))
    failures.push(...proveSignal1Summary(lines, parsed, second))
  return failures
}

async function proveCheck(only: ReadonlySet<string>): Promise<string[]> {
  const run = await runTsx(checkEntry, ['--root', fixtureRoot])
  if (run.code !== 1)
    return [
      `drift:check on signal 2's fixtures: expected exit 1, got ${describeRun(run)}`,
    ]
  const lines = run.stdout.split('\n')
  const reports: Report[] = []
  const reported: Codes = new Map()
  const failures: string[] = []
  for (const [index, text] of lines.entries()) {
    const [, file = '', line = '', code = ''] = reportLine.exec(text) ?? []
    if (code === '') continue
    reports.push({ index, file, line: Number(line), code, text })
    const key = `${file}:${line}`
    if (judged(key, [code], only).length === 0) continue
    const codes = reported.get(key) ?? []
    if (codes.includes(code))
      failures.push(`drift:check: ${key} ${code} is reported twice (R-230)`)
    reported.set(key, [...codes, code].toSorted())
  }
  return [
    ...failures,
    ...compareCodes('drift:check', expectedFor(only), reported),
    ...proveOutput(lines, reports, only),
  ]
}

async function proveFilesListed(): Promise<string[]> {
  const entries = await readdir(path.join(fixtureRoot, 'overhaul'), {
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
  return [
    ...onDisk
      .filter((file) => !scanned.includes(file))
      .map((file) => `${file}: on disk but missing from expected.ts`),
    ...scanned
      .filter((file) => !onDisk.includes(file))
      .map((file) => `${file}: listed in expected.ts but missing`),
  ]
}

// A broken span in a stand-in's `CONTEXT.md`, on its second line.
const brokenGlossary = '_Avoid_: `heap`,\n`split\npoint`.\n'

// Tool errors (R-243): with no `CONTEXT.md`, or with one `readGlossary`
// rejects, `drift:check` exits 2 naming it, and prints no summary (R-220).
async function proveToolErrors(): Promise<string[]> {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'drift-signal-2-'))
  try {
    const failures: string[] = []
    const cases: [string, string | undefined, string][] = [
      ['missing', undefined, 'CONTEXT.md'],
      ['broken', brokenGlossary, 'CONTEXT.md:2'],
    ]
    for (const [name, glossaryText, naming] of cases) {
      const repo = path.join(temp, name)
      await cp(
        path.join(fixtureRoot, 'overhaul'),
        path.join(repo, 'overhaul'),
        {
          recursive: true,
        },
      )
      // The stand-in's `AGENTS.md` comes too, so only `CONTEXT.md` is at
      // fault (R-253).
      await cp(
        path.join(fixtureRoot, 'AGENTS.md'),
        path.join(repo, 'AGENTS.md'),
      )
      if (glossaryText !== undefined)
        await writeFile(path.join(repo, 'CONTEXT.md'), glossaryText)
      const run = await runTsx(checkEntry, ['--root', repo])
      if (
        run.code !== 2 ||
        !run.stderr.includes(naming) ||
        /files parsed|signal [24]:/.test(run.stdout)
      )
        failures.push(
          `drift:check with a ${name} CONTEXT.md: expected exit 2 naming ${naming} and no summary, got ${describeRun(run)}`,
        )
    }
    return failures
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

type GlossaryCase = readonly [
  label: string,
  text: string,
  wanted: { forms: readonly AvoidForm[]; unmarked: number } | number,
]

function heap(lines: number[]): AvoidForm {
  return { form: 'heap', lines }
}

// `readGlossary`'s cases (R-243). A number is the line an error must name.
async function glossaryCases(): Promise<readonly GlossaryCase[]> {
  const text = await readFile(path.join(fixtureRoot, 'CONTEXT.md'), 'utf8')
  return [
    ['the fixture', text, glossary],
    ['the fixture (CRLF)', text.replaceAll('\n', '\r\n'), glossary],
    [
      'a wrapped list',
      '_Avoid_: lookup,\n`search term`, filter.\n',
      { forms: [{ form: 'search term', lines: [2] }], unmarked: 2 },
    ],
    [
      'a qualifier outside the span',
      '_Avoid_: `gua` (in English text), `yao`.\n',
      {
        forms: [
          { form: 'gua', lines: [1] },
          { form: 'yao', lines: [1] },
        ],
        unmarked: 0,
      },
    ],
    [
      'a span outside any list',
      'Prose names `split point`.\n\n_Avoid_: `heap`.\n',
      { forms: [heap([3])], unmarked: 0 },
    ],
    [
      'the next paragraph',
      '_Avoid_: `heap`.\n\nProse names `split point`.\n',
      { forms: [heap([1])], unmarked: 0 },
    ],
    [
      'duplicates',
      '_Avoid_: `heap`, `heap`.\n\n_Avoid_: `heap`, pile.\n',
      { forms: [heap([1, 3])], unmarked: 1 },
    ],
    [
      'commas inside parentheses',
      '_Avoid_: pile (for a stalk, or a coin), `heap`.\n',
      { forms: [heap([1])], unmarked: 1 },
    ],
    ['a span broken across lines', brokenGlossary, 2],
    ['an empty span', '_Avoid_: `heap`,\nfilter, ``.\n', 2],
    ['a span with no token', '# Glossary\n\n_Avoid_: `->`.\n', 3],
  ]
}

function describeForms(forms: readonly AvoidForm[]): string {
  return forms
    .map(({ form, lines }) => `${form} (${lines.join(', ')})`)
    .toSorted()
    .join('; ')
}

async function proveGlossary(signal2: Signal2): Promise<string[]> {
  const failures: string[] = []
  for (const [label, text, wanted] of await glossaryCases()) {
    const read = signal2.readGlossary(text)
    const want =
      typeof wanted === 'number'
        ? `an error naming line ${wanted}`
        : `${describeForms(wanted.forms)}, ${wanted.unmarked} unmarked`
    const got = read.ok
      ? `${describeForms(read.forms)}, ${read.unmarked} unmarked`
      : `an error naming line ${read.line}`
    if (want !== got)
      failures.push(`readGlossary, ${label}: expected ${want}, read ${got}`)
  }
  return failures
}

// Every fixture file through the scanner and `findGlossaryForms`, given the
// fixture's forms directly, so a matcher fault is not hidden behind a
// reader's.
async function proveMatcher(
  signal2: Signal2,
  scanner: Scanner,
  only: ReadonlySet<string>,
): Promise<string[]> {
  const failures: string[] = []
  for (const file of scanned) {
    const text = await readFile(path.join(fixtureRoot, file), 'utf8')
    const result = scanner.scanText(file, text)
    if (!result.ok) {
      failures.push(`${file}: does not parse: ${result.message}`)
      continue
    }
    const reported: Codes = new Map()
    const found = signal2.findGlossaryForms(
      file,
      result.records,
      glossary.forms,
    )
    for (const { line, code, forms } of found) {
      const key = `${file}:${line}`
      const wantForms = formsAt[key]
      if (
        wantForms !== undefined &&
        forms.toSorted().join(', ') !== wantForms.join(', ')
      )
        failures.push(
          `findGlossaryForms: ${key} ${code}: expected forms ${wantForms.join(', ')}, found ${forms.join(', ')}`,
        )
      if (!only.has(code)) continue
      reported.set(key, [...(reported.get(key) ?? []), code].toSorted())
    }
    // The matcher sees no E code, so the E line is judged by its G code.
    const wanted = expectedFor(only, file)
    for (const [key, codes] of wanted) {
      const gCodes = codes.filter((code) => code.startsWith('G'))
      if (gCodes.length > 0) wanted.set(key, gCodes)
      else wanted.delete(key)
    }
    failures.push(...compareCodes('findGlossaryForms', wanted, reported))
  }
  return failures
}

async function proveInMemory(only: ReadonlySet<string>): Promise<string[]> {
  let signal2: Signal2
  let scanner: Scanner
  try {
    // Loaded here, so a missing module fails this proof alone (R-215).
    signal2 = (await import('./signal-2.js')) as Signal2
    scanner = await import('./scanner.js')
  } catch (error) {
    return [`signal-2.ts cannot be loaded: ${String(error)}`]
  }
  return [
    ...(await proveGlossary(signal2)),
    ...(await proveMatcher(signal2, scanner, only)),
  ]
}

export async function proveSignal2(
  only: ReadonlySet<string>,
): Promise<string[]> {
  return [
    ...(await proveFilesListed()),
    ...(await proveCheck(only)),
    ...(await proveToolErrors()),
    ...(await proveInMemory(only)),
  ]
}
