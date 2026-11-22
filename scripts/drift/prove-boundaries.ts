// Drift signal 3's prover (ADR-0042): lints every planted violation and clean
// twin under the `overhaul/` path it names, through the repo's real ESLint
// config, and exits 0 only if each plant is reported by exactly its own
// B-number and each twin by none. Reports from rules outside B1 to B12 are
// ignored. `--only B1,B2` limits the run to the rules named.
//
// Without `--only`, it also proves the Oracle-subpath analysis (R-151,
// R-179) on its fixture trees: the analysis must report each fake subpath as
// its expected list says, the two matching both ways, and leave the working
// tree unchanged (R-184, R-189).

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { ESLint } from 'eslint'

import {
  expected as expectedSubpaths,
  type ExpectedVerdict,
} from './fixtures/oracle-subpaths/expected.js'
import { expected } from './fixtures/signal-3/expected.js'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const fixtures = fileURLToPath(new URL('fixtures/signal-3/', import.meta.url))
const subpathFixtures = fileURLToPath(
  new URL('fixtures/oracle-subpaths/', import.meta.url),
)
const boundaryRules = Array.from({ length: 12 }, (_, index) => `B${index + 1}`)

function parseOnly(argv: readonly string[]): ReadonlySet<string> {
  const index = argv.indexOf('--only')
  if (index === -1) return new Set(boundaryRules)
  const names = (argv[index + 1] ?? '').split(',').filter(Boolean)
  const unknown = names.filter((name) => !boundaryRules.includes(name))
  if (names.length === 0 || unknown.length > 0)
    throw new Error(`--only takes B-numbers from B1 to B12, as in B1,B2`)
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

// The analysis entry point, `scripts/drift/oracle-subpaths.ts` (R-178, R-180).
// `packagesRoot` stands for `overhaul/`: its `application` folder's subpaths
// are analysed. A subpath is its export key; a file is relative to
// `packagesRoot`, with `/` separators.
type SubpathVerdict =
  | { readonly verdict: 'loads'; readonly chain: readonly string[] }
  | { readonly verdict: 'free' }
type SubpathAnalysis =
  | {
      readonly ok: true
      readonly subpaths: Readonly<Record<string, SubpathVerdict>>
    }
  | {
      readonly ok: false
      readonly file: string
      readonly specifier: string
      readonly message: string
    }
type AnalyseOracleSubpaths = (packagesRoot: string) => Promise<SubpathAnalysis>

async function loadAnalysis(): Promise<AnalyseOracleSubpaths | string> {
  try {
    const loaded: { analyseOracleSubpaths?: unknown } =
      await import('./oracle-subpaths.js')
    if (typeof loaded.analyseOracleSubpaths === 'function')
      return loaded.analyseOracleSubpaths as AnalyseOracleSubpaths
    return 'oracle-subpaths.ts exports no analyseOracleSubpaths function'
  } catch (error) {
    return `cannot load oracle-subpaths.ts: ${String(error)}`
  }
}

function describeVerdict(verdict: ExpectedVerdict): string {
  return typeof verdict === 'string'
    ? verdict
    : `error naming ${verdict.file} and ${verdict.specifier}`
}

async function reportedSubpaths(
  analyse: AnalyseOracleSubpaths,
  failures: string[],
): Promise<Map<string, ExpectedVerdict>> {
  const reported = new Map<string, ExpectedVerdict>()
  const trees = await readdir(subpathFixtures, { withFileTypes: true })
  for (const tree of trees.filter((entry) => entry.isDirectory())) {
    const result = await analyse(path.join(subpathFixtures, tree.name))
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
  const analyse = await loadAnalysis()
  if (typeof analyse === 'string') return [analyse]
  const failures: string[] = []
  const reported = await reportedSubpaths(analyse, failures)
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

// Git's status cannot see ignored files, such as a `dist` the analysis might
// build among the fixtures, so the fixture trees are also hashed whole.
async function workingTreeState(): Promise<string> {
  const { stdout } = await promisify(execFile)(
    'git',
    ['status', '--porcelain', '--untracked-files=all'],
    { cwd: repoRoot },
  )
  const hash = createHash('sha256').update(stdout)
  const entries = await readdir(subpathFixtures, {
    recursive: true,
    withFileTypes: true,
  })
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .toSorted()
  for (const file of files) hash.update(file).update(await readFile(file))
  return hash.digest('hex')
}

const only = parseOnly(process.argv.slice(2))
const analysed = !process.argv.slice(2).includes('--only')
const before = analysed ? await workingTreeState() : ''
const failures = await prove(only)
if (analysed) {
  failures.push(...(await proveSubpaths()))
  if ((await workingTreeState()) !== before)
    failures.push('the working tree changed during the proof')
}
const scope =
  describeRules(boundaryRules.filter((rule) => only.has(rule))) +
  (analysed ? ' and the Oracle-subpath analysis (R-151)' : '')
if (failures.length > 0) {
  console.error(`drift:prove failed for ${scope}:`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}
console.info(`drift:prove passed for ${scope}.`)
