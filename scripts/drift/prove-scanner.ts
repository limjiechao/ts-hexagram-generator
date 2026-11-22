// The scanner's proof (R-208), run by `drift:prove` without `--only` (R-215).
// It matches the scanner's records for each fixture in `fixtures/scanner/`
// against that folder's expected list, both ways; checks which files the
// walk reads (R-210); and runs `drift:check` (R-209):
//
//   tsx scripts/drift/check.ts [--root <dir>]
//
// `<dir>` names a stand-in repo, resolved from the working directory, whose
// `overhaul/` alone is scanned; without it, the repo's own (R-232). A
// completed run prints a line holding `<N> files parsed`, then signal 4's
// summary (R-231). It exits 0 when clean and 2 on a tool error, such as a
// missing root or a file that does not parse; then only the error prints, to
// stderr, naming the root or the file, relative to the repo root with `/`
// (R-220, R-232). Exit 1, a finding, is proved with signal 4
// (`prove-signal-4.ts`).

import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  addedSkipped,
  crlfFixtures,
  expected,
  parseError,
  walked,
} from './fixtures/scanner/expected.js'
import { runTsx, type Run } from './run-tsx.js'
import type { ScanRecord } from './scan-record.js'

type Scanner = typeof import('./scanner.js')

const fixtures = fileURLToPath(new URL('fixtures/scanner/', import.meta.url))
const walkFixture = fileURLToPath(
  new URL('fixtures/scanner-walk/', import.meta.url),
)
const parseErrorFixture = fileURLToPath(
  new URL('fixtures/scanner-parse-error/', import.meta.url),
)
const checkEntry = fileURLToPath(new URL('check.ts', import.meta.url))

function describeRecord(record: ScanRecord | undefined): string {
  return record === undefined
    ? 'no record'
    : `${record.kind} at line ${record.line}: ${JSON.stringify(record.text)}`
}

// Reports the first record that differs, so a missing or extra record fails.
function compareRecords(
  label: string,
  wanted: readonly ScanRecord[],
  scanned: readonly ScanRecord[],
): string[] {
  const length = Math.max(wanted.length, scanned.length)
  for (let index = 0; index < length; index++) {
    const want = wanted[index]
    const got = scanned[index]
    if (
      want?.kind === got?.kind &&
      want?.line === got?.line &&
      want?.text === got?.text
    )
      continue
    return [
      `${label}: record ${index + 1}: expected ${describeRecord(want)}, scanned ${describeRecord(got)} (${wanted.length} expected, ${scanned.length} scanned)`,
    ]
  }
  return []
}

// The comparison itself must fail on a missing or an extra record (R-218).
function proveComparison(): string[] {
  const one: ScanRecord[] = [{ kind: 'comment', line: 1, text: ' x' }]
  const failures: string[] = []
  if (compareRecords('', one, []).length === 0)
    failures.push('the record comparison passes a missing record')
  if (compareRecords('', [], one).length === 0)
    failures.push('the record comparison passes an extra record')
  if (compareRecords('', one, [...one]).length > 0)
    failures.push('the record comparison fails equal records')
  return failures
}

async function proveFixtures(scanner: Scanner): Promise<string[]> {
  const failures: string[] = []
  const names = await readdir(fixtures)
  const onDisk = names.filter((name) => name !== 'expected.ts')
  for (const file of onDisk) {
    if (!Object.hasOwn(expected, file))
      failures.push(`${file}: on disk but missing from expected.ts`)
  }
  for (const [file, records] of Object.entries(expected)) {
    if (!onDisk.includes(file)) {
      failures.push(`${file}: listed in expected.ts but missing`)
      continue
    }
    const text = await readFile(path.join(fixtures, file), 'utf8')
    const variants: [string, string][] = [[file, text]]
    if (crlfFixtures.includes(file))
      variants.push([`${file} (CRLF)`, text.replaceAll('\n', '\r\n')])
    for (const [label, variant] of variants) {
      const result = scanner.scanText(file, variant)
      if (result.ok)
        failures.push(...compareRecords(label, records, result.records))
      else failures.push(`${label}: does not parse: ${result.message}`)
    }
  }
  return failures
}

// Cases built in memory, like the CRLF variants: a block comment spanning
// CRLF, CR, U+2028 or U+2029 lines reads with LF (R-223, R-225), and a `require` or `import()` of a
// no-substitution template is a module specifier, while `vi.mock` and
// `require.resolve` are not module loads (R-211).
const inMemory: readonly (readonly [string, string, readonly ScanRecord[]])[] =
  [
    [
      'crlf-block-comment.ts',
      '/* one\r\n   two */\r\nconst x = 1\r\n',
      [
        { kind: 'comment', line: 1, text: ' one\n   two ' },
        { kind: 'identifier', line: 3, text: 'x' },
      ],
    ],
    ...['\r', '\u2028', '\u2029'].map(
      (terminator) =>
        [
          `block-comment-${JSON.stringify(terminator)}.ts`,
          ['/* one', '   two */', 'const x = 1', ''].join(terminator),
          [
            { kind: 'comment', line: 1, text: ' one\n   two ' },
            { kind: 'identifier', line: 3, text: 'x' },
          ],
        ] as const,
    ),
    [
      'module-specifiers.ts',
      [
        "require('./a.js')",
        'require(`./b.js`)',
        "import('./c.js')",
        'import(`./d.js`)',
        "vi.mock('./e.js')",
        "require.resolve('./f.js')",
        '',
      ].join('\n'),
      [
        { kind: 'string', line: 5, text: './e.js' },
        { kind: 'string', line: 6, text: './f.js' },
      ],
    ],
  ]

function proveInMemory(scanner: Scanner): string[] {
  return inMemory.flatMap(([file, text, records]) => {
    const result = scanner.scanText(file, text)
    return result.ok
      ? compareRecords(file, records, result.records)
      : [`${file}: does not parse: ${result.message}`]
  })
}

async function proveWalk(scanner: Scanner, root: string): Promise<string[]> {
  const failures: string[] = []
  const result = await scanner.scanTree(root)
  if (result.ok) {
    const read = [...result.files.keys()]
    for (const file of read.filter((each) => !walked.includes(each)))
      failures.push(`walk: read ${file}, which is not listed`)
    for (const file of walked.filter((each) => !read.includes(each)))
      failures.push(`walk: did not read ${file}`)
  } else failures.push(`walk: failed naming ${result.file}: ${result.message}`)
  const broken = await scanner.scanTree(parseErrorFixture)
  if (broken.ok || broken.file !== parseError)
    failures.push(
      `parse error: expected an error naming ${parseError}, got ${broken.ok ? 'none' : broken.file}`,
    )
  return failures
}

function describeRun(run: Run): string {
  return `exit ${run.code}, stdout ${JSON.stringify(run.stdout)}, stderr ${JSON.stringify(run.stderr)}`
}

// A clean run: exit 0, the "files parsed" line, then signal 4's summary of
// no findings (R-231).
function isClean(run: Run, parsed: RegExp): boolean {
  const lines = run.stdout.split('\n')
  const count = lines.findIndex((line) => parsed.test(line))
  const summary = lines.indexOf('signal 4: 0 findings in 0 files')
  return run.code === 0 && count !== -1 && summary > count
}

async function proveCheck(
  walkRepo: string,
  brokenRepo: string,
  temp: string,
): Promise<string[]> {
  const failures: string[] = []
  const today = await runTsx(checkEntry, [])
  if (!isClean(today, /\b[1-9]\d* files parsed\b/))
    failures.push(
      `drift:check on today's tree: expected exit 0, "<N> files parsed", then "signal 4: 0 findings in 0 files", got ${describeRun(today)}`,
    )
  const alone = await runTsx(checkEntry, ['--root', walkRepo])
  const count = new RegExp(String.raw`(?<!\d)${walked.length} files parsed\b`)
  if (!isClean(alone, count))
    failures.push(
      `drift:check --root on the walk's stand-in repo: expected exit 0, "${walked.length} files parsed", then "signal 4: 0 findings in 0 files", got ${describeRun(alone)}`,
    )
  const broken = await runTsx(checkEntry, ['--root', brokenRepo])
  const named = `overhaul/${parseError}`
  if (
    broken.code !== 2 ||
    !broken.stderr.includes(named) ||
    /files parsed|signal 4:/.test(broken.stdout)
  )
    failures.push(
      `drift:check on a file that does not parse: expected exit 2 naming ${named} and no summary, got ${describeRun(broken)}`,
    )
  const missing = path.join(temp, 'missing-root')
  const absent = await runTsx(checkEntry, ['--root', missing])
  if (absent.code !== 2 || !absent.stderr.includes('missing-root'))
    failures.push(
      `drift:check on a missing root: expected exit 2 naming it, got ${describeRun(absent)}`,
    )
  return failures
}

export async function proveScanner(): Promise<string[]> {
  const failures = proveComparison()
  const temp = await mkdtemp(path.join(os.tmpdir(), 'drift-scanner-'))
  try {
    // Each fixture is copied into a stand-in repo's `overhaul/`, as
    // `--root` scans (R-232).
    const walkRepo = path.join(temp, 'walk')
    const walkRoot = path.join(walkRepo, 'overhaul')
    const brokenRepo = path.join(temp, 'broken')
    await cp(walkFixture, walkRoot, { recursive: true })
    await cp(parseErrorFixture, path.join(brokenRepo, 'overhaul'), {
      recursive: true,
    })
    for (const file of addedSkipped) {
      const target = path.join(walkRoot, file)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, 'const = ; // a skipped folder\n')
    }
    failures.push(...(await proveCheck(walkRepo, brokenRepo, temp)))
    // Loaded here, not imported at the top, so a missing or broken scanner
    // fails this proof without stopping the entry's other provers (R-215).
    let scanner: Scanner
    try {
      scanner = await import('./scanner.js')
    } catch (error) {
      failures.push(`scanner.ts cannot be loaded: ${String(error)}`)
      return failures
    }
    failures.push(
      ...(await proveFixtures(scanner)),
      ...proveInMemory(scanner),
      ...(await proveWalk(scanner, walkRoot)),
    )
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
  return failures
}
