// `drift:prove`, the one entry for every drift prover (R-215).
//
// Drift signal 3's prover (ADR-0042): lints every planted violation and clean
// twin under the `overhaul/` path it names, through the repo's real ESLint
// config, and passes only if each plant is reported by exactly its own
// B-number and each twin by none. Reports from rules outside B1 to B12 are
// ignored. Drift signal 4's prover (R-231, `prove-signal-4.ts`) judges E1
// to E7 the same way, signal 2's (R-247, `prove-signal-2.ts`) G1 and G2, and
// signal 1's (R-255, R-264, `prove-signal-1.ts`) D1 to D4. `--only B1,E3`
// limits the run to the codes named; an unknown code is an error that lists
// the valid ones (R-233, R-255).
//
// Without `--only`, it also proves the Oracle-subpath analysis (R-151,
// R-179) on its fixture trees: the analysis must report each fake subpath as
// its expected list says, the two matching both ways (R-184, R-189); the
// scanner (R-208, `prove-scanner.ts`); `--only` itself; and that
// `drift:check` runs at every landing (R-271, `prove-landing.ts`). It then
// checks the working tree is unchanged. Every prover runs, and every failure is listed,
// before the entry exits 1 (R-215).

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { ESLint } from 'eslint'

import { docTruthCodes } from './doc-truth-finding.js'
import { ephemeralCodes } from './ephemeral-finding.js'
import {
  expected as expectedSubpaths,
  type ExpectedVerdict,
} from './fixtures/oracle-subpaths/expected.js'
import { expected } from './fixtures/signal-3/expected.js'
import { glossaryCodes } from './glossary-finding.js'
import { analyseOracleSubpaths } from './oracle-subpaths.js'
import { proveLanding } from './prove-landing.js'
import { proveScanner } from './prove-scanner.js'
import { proveSignal1 } from './prove-signal-1.js'
import { proveSignal2 } from './prove-signal-2.js'
import { proveSignal4 } from './prove-signal-4.js'
import { runTsx } from './run-tsx.js'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const fixtures = fileURLToPath(new URL('fixtures/signal-3/', import.meta.url))
const subpathFixtures = fileURLToPath(
  new URL('fixtures/oracle-subpaths/', import.meta.url),
)
const allFixtures = fileURLToPath(new URL('fixtures/', import.meta.url))
const entryFile = fileURLToPath(import.meta.url)
const boundaryRules = Array.from({ length: 12 }, (_, index) => `B${index + 1}`)
// The codes `--only` accepts, in R-204's family order: B1 to B12, D1 to D4,
// G1 and G2, E1 to E7 (R-204, R-215, R-233, R-255, R-266).
const validCodes: readonly string[] = [
  ...boundaryRules,
  ...docTruthCodes,
  ...glossaryCodes,
  ...ephemeralCodes,
]

function parseOnly(argv: readonly string[]): ReadonlySet<string> | string {
  const index = argv.indexOf('--only')
  if (index === -1) return new Set(validCodes)
  const names = (argv[index + 1] ?? '').split(',').filter(Boolean)
  const unknown = names.filter((name) => !validCodes.includes(name))
  if (names.length === 0 || unknown.length > 0)
    return `--only takes codes from ${validCodes.join(', ')}, as in B1,B2`
  return new Set(names)
}

async function fixtureFiles(): Promise<string[]> {
  const folders = ['plants', 'twins']
  const listed = await Promise.all(
    folders.map(async (folder) => {
      const names = await readdir(path.join(fixtures, folder))
      return names.map((name) => `${folder}/${name}`)
    }),
  )
  return listed.flat()
}

function lintedAs(text: string): string | undefined {
  return /Linted as (overhaul\/[\w./-]+)/.exec(text)?.[1]?.replace(/\.$/, '')
}

// B12's rules need each fixture in a TypeScript program, but a fixture's
// `overhaul/` path is virtual, so no program built from disk holds it. The
// project service admits each one by its exact path to a default project
// with the compiler options lint:check uses (R-157(12)).
function admitting(virtualPaths: readonly string[]): ESLint.Options {
  return {
    cwd: repoRoot,
    overrideConfig: {
      files: ['overhaul/**/*.{ts,tsx,mts,cts,js,mjs,cjs}'],
      languageOptions: {
        parserOptions: {
          project: null,
          projectService: {
            allowDefaultProject: [...virtualPaths],
            defaultProject: 'tsconfig.overhaul-lint.json',
            maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING:
              virtualPaths.length,
          },
        },
      },
    },
  }
}

async function reportedRules(
  eslint: ESLint,
  text: string,
): Promise<ReadonlySet<string> | string> {
  const virtual = lintedAs(text)
  if (virtual === undefined) return 'names no `Linted as overhaul/...` path'
  const [result] = await eslint.lintText(text, {
    filePath: path.join(repoRoot, virtual),
  })
  const fatal = result?.messages.find((message) => message.fatal)
  if (fatal) return `does not parse: ${fatal.message}`
  const rules = new Set<string>()
  for (const message of result?.messages ?? []) {
    const rule = /^(B\d+):/.exec(message.message)?.[1]
    if (rule !== undefined && boundaryRules.includes(rule)) rules.add(rule)
  }
  return rules
}

function describeRules(rules: Iterable<string>): string {
  return [...rules].join(', ') || 'none'
}

async function prove(only: ReadonlySet<string>): Promise<string[]> {
  const failures: string[] = []
  const onDisk = await fixtureFiles()
  for (const file of onDisk) {
    if (!Object.hasOwn(expected, file))
      failures.push(`${file}: on disk but missing from expected.ts`)
  }
  const texts = new Map<string, string>()
  for (const file of onDisk)
    texts.set(file, await readFile(path.join(fixtures, file), 'utf8'))
  const virtualPaths = [...texts.values()].flatMap(
    (text) => lintedAs(text) ?? [],
  )
  const eslint = new ESLint(admitting(virtualPaths))
  for (const [file, rule] of Object.entries(expected)) {
    if (!onDisk.includes(file)) {
      failures.push(`${file}: listed in expected.ts but missing`)
      continue
    }
    if (rule !== null && !only.has(rule)) continue
    const reported = await reportedRules(eslint, texts.get(file) ?? '')
    if (typeof reported === 'string') {
      failures.push(`${file}: ${reported}`)
      continue
    }
    const judged = [...reported].filter((each) => only.has(each))
    const passes =
      rule === null
        ? judged.length === 0
        : judged.length === 1 && judged[0] === rule
    if (!passes)
      failures.push(
        `${file}: expected ${rule ?? 'none'}, reported ${describeRules(judged)}`,
      )
  }
  return failures
}

function describeVerdict(verdict: ExpectedVerdict): string {
  return typeof verdict === 'string'
    ? verdict
    : `error naming ${verdict.file} and ${verdict.specifier}`
}

async function reportedSubpaths(
  failures: string[],
): Promise<Map<string, ExpectedVerdict>> {
  const reported = new Map<string, ExpectedVerdict>()
  const trees = await readdir(subpathFixtures, { withFileTypes: true })
  for (const tree of trees.filter((entry) => entry.isDirectory())) {
    const result = await analyseOracleSubpaths(
      path.join(subpathFixtures, tree.name),
    )
    if (result.ok) {
      for (const [subpath, { verdict }] of Object.entries(result.subpaths))
        reported.set(`${tree.name}:${subpath}`, verdict)
      continue
    }
    // An error stops a tree's whole analysis, so it is matched to the one
    // subpath its tree lists.
    const listed = Object.keys(expectedSubpaths).filter((key) =>
      key.startsWith(`${tree.name}:`),
    )
    const { file, specifier } = result
    if (listed.length === 1 && listed[0] !== undefined)
      reported.set(listed[0], { verdict: 'error', file, specifier })
    else
      failures.push(
        `${tree.name}: analysis failed naming ${file} and ${specifier}`,
      )
  }
  return reported
}

async function proveSubpaths(): Promise<string[]> {
  const failures: string[] = []
  const reported = await reportedSubpaths(failures)
  for (const key of reported.keys()) {
    if (!Object.hasOwn(expectedSubpaths, key))
      failures.push(`${key}: reported but missing from expected.ts`)
  }
  for (const [key, verdict] of Object.entries(expectedSubpaths)) {
    const actual = reported.get(key)
    if (actual === undefined)
      failures.push(`${key}: listed in expected.ts but not reported`)
    else if (describeVerdict(actual) !== describeVerdict(verdict))
      failures.push(
        `${key}: expected ${describeVerdict(verdict)}, reported ${describeVerdict(actual)}`,
      )
  }
  return failures
}

// `--only` as R-215 and R-233 set it: an unknown code, alone or beside a
// valid one, is an error listing every valid code; valid ones, B, D, G and
// E codes mixed, run only those codes, and skip the analysis, the scanner
// and the clean-tree check. `Z1` never becomes a valid code, and the error
// lists all 25, D3 among them (R-266).
async function proveOnly(): Promise<string[]> {
  const failures: string[] = []
  if (validCodes.length !== 25)
    failures.push(
      `--only: expected 25 valid codes, found ${String(validCodes.length)}: ${validCodes.join(', ')} (R-266)`,
    )
  for (const codes of ['Z1', 'B1,Z1']) {
    const run = await runTsx(entryFile, ['--only', codes])
    const listed = validCodes.every((code) =>
      new RegExp(String.raw`\b${code}\b`).test(run.stderr),
    )
    if (run.code !== 1 || !listed)
      failures.push(
        `--only ${codes}: expected exit 1 listing ${validCodes.join(', ')}, got exit ${String(run.code)}: ${run.stderr.trim()}`,
      )
  }
  for (const codes of [
    'B3',
    'E3',
    'G1',
    'B3,E3',
    'G2,E3',
    'D1',
    'D3',
    'B3,D3,E3',
    'B3,D4,E3',
  ]) {
    const run = await runTsx(entryFile, ['--only', codes])
    const scope = codes.replaceAll(',', ', ')
    if (
      run.code !== 0 ||
      run.stdout.trim() !== `drift:prove passed for ${scope}.`
    )
      failures.push(
        `--only ${codes}: expected exit 0 proving ${scope} alone, got exit ${String(run.code)}: ${(run.stdout + run.stderr).trim()}`,
      )
  }
  return failures
}

// Git's status cannot see ignored files, such as a `dist` the analysis might
// build among the fixtures, so every fixture folder is also hashed whole.
async function fixtureFilesHashed(): Promise<string[]> {
  const entries = await readdir(allFixtures, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .toSorted()
}

async function workingTreeState(): Promise<string> {
  const { stdout } = await promisify(execFile)(
    'git',
    ['status', '--porcelain', '--untracked-files=all'],
    { cwd: repoRoot },
  )
  const hash = createHash('sha256').update(stdout)
  for (const file of await fixtureFilesHashed())
    hash.update(file).update(await readFile(file))
  return hash.digest('hex')
}

// The hash must cover every tracked fixture, the scanner's included (R-215).
async function proveHashCoversFixtures(): Promise<string[]> {
  const { stdout } = await promisify(execFile)(
    'git',
    ['ls-files', '-z', '--', 'scripts/drift/fixtures'],
    { cwd: repoRoot },
  )
  const hashed = new Set(await fixtureFilesHashed())
  return stdout
    .split('\0')
    .filter(Boolean)
    .filter((file) => !hashed.has(path.join(repoRoot, file)))
    .map((file) => `${file}: tracked but not in the clean-tree hash`)
}

// A prover that throws is one failure; it does not stop the others (R-215).
async function collect(
  name: string,
  prover: () => Promise<string[]>,
): Promise<string[]> {
  try {
    return await prover()
  } catch (error) {
    return [`${name} stopped: ${String(error)}`]
  }
}

const only = parseOnly(process.argv.slice(2))
if (typeof only === 'string') {
  console.error(`drift:prove: ${only}`)
  process.exit(1)
}
const analysed = !process.argv.slice(2).includes('--only')
const before = analysed ? await workingTreeState() : ''
const failures: string[] = []
if (boundaryRules.some((rule) => only.has(rule)))
  failures.push(...(await collect('the boundary prover', () => prove(only))))
if (docTruthCodes.some((code) => only.has(code)))
  failures.push(
    ...(await collect("signal 1's prover", () => proveSignal1(only))),
  )
if (glossaryCodes.some((code) => only.has(code)))
  failures.push(
    ...(await collect("signal 2's prover", () => proveSignal2(only))),
  )
if (ephemeralCodes.some((code) => only.has(code)))
  failures.push(
    ...(await collect("signal 4's prover", () => proveSignal4(only))),
  )
if (analysed) {
  failures.push(
    ...(await collect('the Oracle-subpath analysis', proveSubpaths)),
    ...(await collect('the scanner proof', proveScanner)),
    ...(await collect('the --only proof', proveOnly)),
    ...(await collect('the clean-tree hash', proveHashCoversFixtures)),
    ...(await collect('the landing proof', proveLanding)),
  )
  if ((await workingTreeState()) !== before)
    failures.push('the working tree changed during the proof')
}
const scope =
  describeRules(validCodes.filter((code) => only.has(code))) +
  (analysed
    ? ', the Oracle-subpath analysis (R-151), the scanner (R-208), --only (R-215) and the landing wiring (R-271)'
    : '')
if (failures.length > 0) {
  console.error(`drift:prove failed for ${scope}:`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}
console.info(`drift:prove passed for ${scope}.`)
