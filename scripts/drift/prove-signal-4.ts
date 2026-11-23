// Signal 4's proof (ADR-0042, R-231, R-235), run by `drift:prove` whenever
// `--only` names an E code or is absent (R-233). It runs `drift:check --root`
// on `fixtures/signal-4/`, a stand-in repo, and expects exit 1 with exactly
// the expected reports, matched both ways, in R-209's order, before the
// "files parsed" line and signal 4's summary (R-231); a run judging a G code
// also needs signal 2's empty summary between them (R-247). It then scans every
// fixture file in memory with each line terminator (R-225) and matches
// `findEphemeralIds` against the same list. The contract is
// `ephemeral-finding.ts`'s.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { EphemeralFinding } from './ephemeral-finding.js'
import { expected, scanned } from './fixtures/signal-4/expected.js'
import { glossaryCodes } from './glossary-finding.js'
import { runTsx, type Run } from './run-tsx.js'
import type { ScanRecord } from './scan-record.js'

interface Signal4 {
  findEphemeralIds: (records: readonly ScanRecord[]) => EphemeralFinding[]
}
type Scanner = typeof import('./scanner.js')

const fixtureRoot = fileURLToPath(
  new URL('fixtures/signal-4/', import.meta.url),
)
const checkEntry = fileURLToPath(new URL('check.ts', import.meta.url))
// Reports from other code families are ignored (R-214).
const reportLine = /^(\S+):(\d+) (E\d): /
const summaryLine = /^signal 4: (\d+) findings in (\d+) files$/
const terminators: readonly (readonly [string, string])[] = [
  ['LF', '\n'],
  ['CRLF', '\r\n'],
  ['CR', '\r'],
  ['U+2028', '\u2028'],
  ['U+2029', '\u2029'],
]

export type Codes = Map<string, string[]>

function judged(codes: readonly string[], only: ReadonlySet<string>): string[] {
  return codes.filter((code) => only.has(code)).toSorted()
}

function expectedFor(only: ReadonlySet<string>, file?: string): Codes {
  const wanted: Codes = new Map()
  for (const [key, codes] of Object.entries(expected)) {
    if (file !== undefined && !key.startsWith(`${file}:`)) continue
    const kept = judged(codes, only)
    if (kept.length > 0) wanted.set(key, kept)
  }
  return wanted
}

// Matches both ways: a missing, extra or differing line each fails.
export function compareCodes(
  label: string,
  wanted: Codes,
  reported: Codes,
): string[] {
  const failures: string[] = []
  const keys = new Set([...wanted.keys(), ...reported.keys()])
  for (const key of [...keys].toSorted()) {
    const want = (wanted.get(key) ?? []).join(', ') || 'none'
    const got = (reported.get(key) ?? []).join(', ') || 'none'
    if (want !== got)
      failures.push(`${label}: ${key}: expected ${want}, reported ${got}`)
  }
  return failures
}

export function describeRun(run: Run): string {
  return `exit ${run.code}, stdout ${JSON.stringify(run.stdout)}, stderr ${JSON.stringify(run.stderr)}`
}

function byCodeUnits(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export interface Report {
  readonly index: number
  readonly file: string
  readonly line: number
  readonly code: string
  readonly text: string
}

export function compareReports(a: Report, b: Report): number {
  return (
    byCodeUnits(a.file, b.file) ||
    a.line - b.line ||
    byCodeUnits(a.code, b.code)
  )
}

// The fixture's `CONTEXT.md` is empty, so signal 2 checks no form; its
// summary still prints, between the "files parsed" line and signal 4's
// (R-247). It is signal 2's output, so only a run judging a G code needs it.
const signal2Summary =
  'signal 2: 0 findings in 0 files (0 forms checked, 0 unmarked)'

function proveSignal2Summary(
  lines: readonly string[],
  parsed: number,
  summary: number,
): string[] {
  const at = lines.indexOf(signal2Summary)
  return at === -1 || at < parsed || (summary !== -1 && at > summary)
    ? [
        `drift:check: no "${signal2Summary}" line between the "files parsed" line and signal 4's summary (R-247)`,
      ]
    : []
}

// The report lines, their order, the citations and the summary (R-209,
// R-231). The summary's finding count is only bounded below by the reports,
// as R-230 leaves open whether it counts reports or IDs.
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
    const cites = report.code === 'E7' ? 'R-199' : 'R-198'
    if (!report.text.includes('ADR-0042') || !report.text.includes(cites))
      failures.push(
        `drift:check: ${JSON.stringify(report.text)} does not cite ADR-0042 and ${cites} (R-231)`,
      )
  }
  const parsed = lines.findIndex((line) =>
    new RegExp(String.raw`(?<!\d)${scanned.length} files parsed\b`).test(line),
  )
  const summary = lines.findIndex((line) => summaryLine.test(line))
  if (parsed === -1)
    failures.push(
      `drift:check: no "${scanned.length} files parsed" line in stdout`,
    )
  if (summary === -1 || summary < parsed)
    failures.push(
      'drift:check: no "signal 4: N findings in M files" line after the "files parsed" line',
    )
  if (parsed !== -1 && reports.some((report) => report.index > parsed))
    failures.push('drift:check: a report follows the "files parsed" line')
  if (glossaryCodes.some((code) => only.has(code)))
    failures.push(...proveSignal2Summary(lines, parsed, summary))
  const [, findings, files] = summaryLine.exec(lines[summary] ?? '') ?? []
  const filesWanted = new Set(
    Object.keys(expected).map((key) => key.replace(/:\d+$/, '')),
  ).size
  if (
    summary !== -1 &&
    (Number(files) !== filesWanted || Number(findings) < reports.length)
  )
    failures.push(
      `drift:check: expected "signal 4: N findings in ${filesWanted} files" with N at least ${reports.length}, got ${JSON.stringify(lines[summary])}`,
    )
  return failures
}

async function proveCheck(only: ReadonlySet<string>): Promise<string[]> {
  const run = await runTsx(checkEntry, ['--root', fixtureRoot])
  if (run.code !== 1)
    return [
      `drift:check on signal 4's fixtures: expected exit 1, got ${describeRun(run)}`,
    ]
  const lines = run.stdout.split('\n')
  const reports: Report[] = []
  const reported: Codes = new Map()
  const failures: string[] = []
  for (const [index, text] of lines.entries()) {
    const [, file = '', line = '', code = ''] = reportLine.exec(text) ?? []
    if (code === '') continue
    reports.push({ index, file, line: Number(line), code, text })
    if (!only.has(code)) continue
    const key = `${file}:${line}`
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

// A template-literal test name broken across lines: cooking keeps U+2028
// and U+2029, which are still line breaks (R-225), so the ID reports the
// line after the break (R-230).
const templateName = 'in-memory/template-name.test.ts'
const templateNameText = ['', 'it(`a', 'R-123 b`, () => {})', ''].join('\n')
const templateNameExpected: Codes = new Map([[`${templateName}:3`, ['E7']]])

// Every fixture file, and the template name above, scanned in memory with
// each line terminator, finds the same lines: comment text reads every
// terminator as `\n` (R-225), and a finding inside a multi-line comment,
// such as the JSDoc in `comment-forms.tsx`, reports its own line (R-230).
async function proveInMemory(only: ReadonlySet<string>): Promise<string[]> {
  let signal4: Signal4
  let scanner: Scanner
  try {
    // Loaded here, so a missing module fails this proof alone (R-215).
    signal4 = (await import('./signal-4.js')) as Signal4
    scanner = await import('./scanner.js')
  } catch (error) {
    return [`signal-4.ts cannot be loaded: ${String(error)}`]
  }
  const cases: [string, string, Codes][] = []
  for (const file of scanned) {
    const text = await readFile(path.join(fixtureRoot, file), 'utf8')
    cases.push([file, text, expectedFor(only, file)])
  }
  const templateWanted: Codes = new Map()
  for (const [key, codes] of templateNameExpected) {
    const kept = judged(codes, only)
    if (kept.length > 0) templateWanted.set(key, kept)
  }
  cases.push([templateName, templateNameText, templateWanted])
  const failures: string[] = []
  for (const [file, text, wanted] of cases) {
    for (const [name, terminator] of terminators) {
      const label = `${file} (${name})`
      const result = scanner.scanText(file, text.replaceAll('\n', terminator))
      if (!result.ok) {
        failures.push(`${label}: does not parse: ${result.message}`)
        continue
      }
      const reported: Codes = new Map()
      for (const { line, code } of signal4.findEphemeralIds(result.records)) {
        if (!only.has(code)) continue
        const key = `${file}:${line}`
        reported.set(key, [...(reported.get(key) ?? []), code])
      }
      for (const [key, codes] of reported) reported.set(key, codes.toSorted())
      failures.push(...compareCodes(label, wanted, reported))
    }
  }
  return failures
}

export async function proveSignal4(
  only: ReadonlySet<string>,
): Promise<string[]> {
  return [
    ...(await proveFilesListed()),
    ...(await proveCheck(only)),
    ...(await proveInMemory(only)),
  ]
}
