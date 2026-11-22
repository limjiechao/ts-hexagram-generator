// Boundary rule data: the ADR-0019 domain→cli boundary, factored out of eslint.config.js so the rule
// data has ONE home and can be unit-tested in process (domain/core/tests/
// eslint-domain-boundary.test.ts) without evaluating the full flat config,
// and, at the end, the overhaul's drift signal 3.
//
// The dependency arrow points cli → domain, never the reverse: a `domain/*`
// file may not import any `cli/*` package.

import { existsSync } from 'node:fs'
import { isBuiltin } from 'node:module'
import path from 'node:path'

// The eight cli/* package names (ADR-0019). Seven are runtime packages in the
// cli → domain DAG; `@hexagram/test-utils` is a private, dev-only test-helper
// leaf that sits OUTSIDE the runtime DAG. It is listed here deliberately, not
// by oversight: the boundary ban must also stop a domain test from importing a
// cli test helper, so a shared helper a domain test needs is homed in domain
// (e.g. @hexagram/core/sample-casting) rather than reached for across the wall.
export const cliPackageNames = [
  '@hexagram/viewer-core',
  '@hexagram/readout',
  '@hexagram/casting-ui',
  '@hexagram/history-ui',
  '@hexagram/playground-ui',
  '@hexagram/shell',
  '@hexagram/test-utils',
  '@hexagram/text-grid',
]

const boundaryMessage =
  'domain/* must not import cli/* (ADR-0019): the dependency arrow points cli → domain. Express the intent medium-neutrally (consultation-view IR or text-layout) and let a cli/* serializer render it.'

// S14 drift-guard: `no-restricted-imports` `paths[].name` is an EXACT-string
// match — it bans `@hexagram/readout` but NOT `@hexagram/readout/serialize-ansi`,
// so a subpath import would silently evade the boundary. We therefore ban the
// cli packages TWO ways from one name list: `paths` (the bare package) AND a
// `patterns` glob group (`@hexagram/readout/**`, any subpath). Both derive from
// `cliPackageNames` so they cannot drift apart.
export const cliBoundaryBans = {
  paths: cliPackageNames.map((name) => ({ name, message: boundaryMessage })),
  patterns: [
    {
      group: cliPackageNames.map((name) => `${name}/**`),
      message: boundaryMessage,
    },
  ],
}

// Drift signal 3 (ADR-0042): the overhaul's boundary rules, B1 to B9. Each
// message starts with its B-number, which the prover keys on. They are local
// rules, not `no-restricted-imports` options, because a type-only import
// (only a top-level `import type` counts), a type-position `import()`, a
// dynamic `import()` and a relative path leaving its package each need the
// file's own path or node kind to judge.

// Layout C (ADR-0037): each overhaul package, its B-rule, and the packages it
// may import. A reach is `'any'`, `'types'` (top-level `import type` or a
// type-position `import()` only), or the list of subpaths allowed. Dev
// dependencies are reachable from `tests/` only. B9 holds each manifest to
// the same table. `pure` packages' `src/` are on the purity list (B1, B2).
const overhaulPackages = {
  oracle: { rule: 'B3', pure: true, dependencies: {} },
  'remainder-group-policy': {
    rule: 'B4',
    pure: true,
    dependencies: { oracle: 'types' },
  },
  'consultation-journal': {
    rule: 'B4',
    pure: true,
    dependencies: { oracle: 'any' },
  },
  'scripture-catalogue': {
    rule: 'B5',
    pure: true,
    dependencies: { oracle: 'any', 'consultation-journal': ['divined-at'] },
  },
  application: {
    rule: 'B6',
    pure: true,
    dependencies: {
      oracle: 'any',
      'consultation-journal': 'any',
      'scripture-catalogue': 'any',
      'remainder-group-policy': 'any',
    },
  },
  'cli-adapter': {
    rule: 'B7',
    testsRule: 'B8',
    pure: false,
    dependencies: { application: 'any' },
    devDependencies: { 'scripture-catalogue': 'any' },
  },
}

const scope = '@hexagram/'

// The overhaul package a file belongs to, and the file's path inside it.
function locate(context) {
  const relative = path.relative(context.cwd, context.filename)
  const [root, name, ...rest] = relative.split(path.sep)
  if (root !== 'overhaul' || !Object.hasOwn(overhaulPackages, name)) return
  return {
    name,
    entry: overhaulPackages[name],
    directory: path.join(context.cwd, root, name),
    inner: rest,
  }
}

// The folder of the package that owns `target`: the nearest folder holding a
// `package.json`, legacy packages included, short of the repository root,
// which is the workspace and no package (R-171).
function owningPackage(target, root) {
  for (
    let folder = target;
    folder !== root && !path.relative(root, folder).startsWith('..');
    folder = path.dirname(folder)
  ) {
    if (existsSync(path.join(folder, 'package.json'))) return folder
  }
}

function literalText(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string')
    return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0].value.cooked
}

// Calls `visit(specifier, typeOnly, node)` for every module a file names:
// static, re-exported, dynamic, or in a type position.
function moduleVisitors(visit) {
  const declaration = (kind) => (node) => {
    if (node.source) visit(node.source.value, node[kind] === 'type', node)
  }
  return {
    ImportDeclaration: declaration('importKind'),
    ExportNamedDeclaration: declaration('exportKind'),
    ExportAllDeclaration: declaration('exportKind'),
    ImportExpression(node) {
      const specifier = literalText(node.source)
      if (specifier !== undefined) visit(specifier, false, node)
    },
    TSImportType(node) {
      visit(node.source.value, true, node)
    },
  }
}

const effectfulGlobals = new Set([
  'crypto',
  'performance',
  'process',
  'fetch',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'globalThis',
  'global',
  'self',
  'window',
])

function isGlobal(reference) {
  const variable = reference.resolved
  return (
    variable === null ||
    (variable.scope.type === 'global' && variable.defs.length === 0)
  )
}

function propertyName(member) {
  if (!member.computed) return member.property.name
  return literalText(member.property)
}

// The clock and randomness reached through `Math` and `Date`; their other
// members, such as `Math.floor` and `Date.UTC`, stay usable.
function readsClockOrRandom(identifier) {
  const parent = identifier.parent
  const member =
    parent.type === 'MemberExpression' && parent.object === identifier
  if (identifier.name === 'Math')
    return member && propertyName(parent) === 'random'
  if (identifier.name !== 'Date') return false
  if (member) return propertyName(parent) === 'now'
  if (parent.type === 'CallExpression' && parent.callee === identifier)
    return true
  return (
    parent.type === 'NewExpression' &&
    parent.callee === identifier &&
    parent.arguments.length === 0
  )
}

const purity = {
  meta: {
    type: 'problem',
    docs: { description: 'B1 and B2: the purity list reaches no effect.' },
    schema: [],
  },
  create(context) {
    const file = locate(context)
    if (!file?.entry.pure || file.inner[0] !== 'src') return {}
    const where = `overhaul/${file.name}/src`
    return {
      ...moduleVisitors((specifier, _typeOnly, node) => {
        if (!specifier.startsWith('node:') && !isBuiltin(specifier)) return
        context.report({
          node,
          message: `B1: ${where} is pure, so it imports no Node built-in, not even its types; '${specifier}' must reach it through a driven port (R-020, R-150, R-159, R-170).`,
        })
      }),
      'Program:exit': () => {
        for (const each of context.sourceCode.scopeManager.scopes) {
          for (const reference of each.references) {
            const identifier = reference.identifier
            if (!isGlobal(reference)) continue
            if (
              !effectfulGlobals.has(identifier.name) &&
              !readsClockOrRandom(identifier)
            )
              continue
            context.report({
              node: identifier,
              message: `B2: ${where} is pure, so it uses no effectful global such as '${identifier.name}'; the clock, randomness, timers and I/O reach it through a driven port (R-020, R-150, R-160, R-174).`,
            })
          }
        }
      },
    }
  },
}

const arrows = {
  meta: {
    type: 'problem',
    docs: { description: 'B3 to B8: Layout C arrows between packages.' },
    schema: [],
  },
  create(context) {
    const file = locate(context)
    if (!file) return {}
    const inTests = file.inner[0] === 'tests'
    const rule = (inTests && file.entry.testsRule) || file.entry.rule
    const reaches = {
      ...file.entry.dependencies,
      ...(inTests ? file.entry.devDependencies : {}),
    }
    const allowed = Object.keys(reaches).join(', ') || 'no package'
    const report = (node, problem) =>
      context.report({
        node,
        message: `${rule}: overhaul/${file.name} ${problem}; it may import ${allowed} (Layout C, R-151, R-152, R-162, R-163, R-165, R-169).`,
      })
    return moduleVisitors((specifier, typeOnly, node) => {
      if (specifier.startsWith('.')) {
        const target = path.resolve(path.dirname(context.filename), specifier)
        // Only landing inside another package is an arrow; shared tooling
        // outside every package, such as `vitest.config.base.js`, is not.
        const owner = owningPackage(target, context.cwd)
        if (owner !== undefined && owner !== file.directory)
          report(node, `leaves its package by '${specifier}'`)
        return
      }
      if (!specifier.startsWith(scope)) return
      const [name, ...subpath] = specifier.slice(scope.length).split('/')
      const reach = reaches[name]
      if (reach === undefined) report(node, `may not import '${specifier}'`)
      else if (reach === 'types' && !typeOnly)
        report(
          node,
          `takes ${name} as types only, by a top-level \`import type\`, but '${specifier}' loads its code`,
        )
      else if (Array.isArray(reach) && !reach.includes(subpath.join('/')))
        report(
          node,
          `may import ${name} only by ${reach.map((each) => `'${scope}${name}/${each}'`).join(', ')}, not '${specifier}'`,
        )
    })
  },
}

const manifestFields = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

const manifest = {
  meta: {
    type: 'problem',
    docs: { description: 'B9: each manifest declares exactly its arrows.' },
    schema: [],
  },
  create(context) {
    const relative = path.relative(context.cwd, context.filename)
    const [root, name] = relative.split(path.sep)
    if (root !== 'overhaul') return {}
    const loc = { line: 1, column: 0 }
    return {
      Program() {
        if (!Object.hasOwn(overhaulPackages, name)) {
          context.report({
            loc,
            message: `B9: overhaul/${name} has no arrows in the boundary table; a new package brings its rules with it (R-148, R-151).`,
          })
          return
        }
        let declared
        try {
          declared = JSON.parse(context.sourceCode.text)
        } catch {
          return
        }
        const entry = overhaulPackages[name]
        for (const field of manifestFields) {
          const want = Object.keys(entry[field] ?? {})
            .map((each) => scope + each)
            .toSorted()
          const have = Object.keys(declared[field] ?? {})
            .filter((each) => each.startsWith(scope))
            .toSorted()
          if (want.join(',') === have.join(',')) continue
          context.report({
            loc,
            message: `B9: overhaul/${name}/package.json's ${field} must name exactly ${want.join(', ') || 'no @hexagram package'}, the arrows of ${entry.rule}, but names ${have.join(', ') || 'none'} (R-148, R-165).`,
          })
        }
      },
    }
  },
}

export const overhaulBoundaryPlugin = {
  meta: { name: 'overhaul-boundary' },
  rules: { purity, arrows, manifest },
}
