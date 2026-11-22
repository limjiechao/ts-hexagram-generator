// R-151's analysis: which `application` subpaths load Oracle code. Each
// subpath's `source` target is parsed with the TypeScript compiler API and its
// loading imports are followed until a file under `oracle/` is reached
// (R-181, R-182). Type-only imports load nothing and are not followed.

import { existsSync, statSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import ts from 'typescript'

export type SubpathVerdict =
  | { readonly verdict: 'loads'; readonly chain: readonly string[] }
  | { readonly verdict: 'free' }

export type SubpathAnalysis =
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

interface Manifest {
  readonly name?: string
  readonly imports?: Readonly<Record<string, unknown>>
  readonly exports?: unknown
}

class AnalysisError extends Error {
  override name = 'AnalysisError'
  constructor(
    readonly file: string,
    readonly specifier: string,
    message: string,
  ) {
    super(message)
  }
}

async function readManifests(
  packagesRoot: string,
): Promise<Map<string, Manifest>> {
  const manifests = new Map<string, Manifest>()
  for (const entry of await readdir(packagesRoot, { withFileTypes: true })) {
    const file = path.join(packagesRoot, entry.name, 'package.json')
    if (entry.isDirectory() && existsSync(file))
      manifests.set(entry.name, JSON.parse(await readFile(file, 'utf8')))
  }
  return manifests
}

// The `source` target of each code export (R-182). A wildcard or nested key
// cannot be analysed. A `null` export (Node's "no export", R-193) and a string
// export of a non-code file, such as `./package.json`, are skipped; any other
// export with no `source` string cannot be analysed.
function sourceTargets(manifest: Manifest, file: string): Map<string, string> {
  const { exports = {} } = manifest
  if (typeof exports !== 'object' || exports === null || Array.isArray(exports))
    throw new AnalysisError(file, 'exports', 'exports is not a subpath map')
  const targets = new Map<string, string>()
  for (const [key, value] of Object.entries(exports)) {
    if (key.includes('*') || (key !== '.' && !key.startsWith('./')))
      throw new AnalysisError(file, key, 'wildcard or nested export')
    if (value === null) continue
    if (typeof value === 'string' && !/\.[cm]?[jt]sx?$/.test(value)) continue
    const source = (value as { source?: unknown }).source
    if (typeof source !== 'string')
      throw new AnalysisError(file, key, 'code export with no source target')
    targets.set(key, source)
  }
  return targets
}

// Every specifier a file loads at run time, in source order (R-161, R-169).
function loadedSpecifiers(source: ts.SourceFile, file: string): string[] {
  const specifiers: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const typeOnly = ts.isImportDeclaration(node)
        ? node.importClause?.isTypeOnly === true
        : node.isTypeOnly
      if (!typeOnly) specifiers.push(node.moduleSpecifier.text)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      specifiers.push(node.moduleReference.expression.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [argument] = node.arguments
      if (argument === undefined || !ts.isStringLiteralLike(argument))
        throw new AnalysisError(
          file,
          argument?.getText(source) ?? '',
          'non-literal import()',
        )
      specifiers.push(argument.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return specifiers
}

export async function analyseOracleSubpaths(
  packagesRoot: string,
): Promise<SubpathAnalysis> {
  const manifests = await readManifests(packagesRoot)
  const relative = (file: string): string =>
    path.relative(packagesRoot, file).split(path.sep).join('/')
  const folderOf = (file: string): string => relative(file).split('/')[0] ?? ''
  const isOracle = (file: string): boolean => folderOf(file) === 'oracle'
  const folders = new Map(
    [...manifests].map(([folder, { name }]) => [name, folder]),
  )
  // Each file's loading imports: the file reached and the specifier naming it.
  const edges = new Map<string, (readonly [string, string])[]>()

  const unresolvable = (from: string, specifier: string): AnalysisError =>
    new AnalysisError(relative(from), specifier, 'unresolvable')
  const toFile = (target: string, from: string, specifier: string): string => {
    // Stated limit (R-192): plain `.js`, `.mjs` and `.cjs` files are not followed.
    const file = target.replace(/\.js$/, '.ts')
    if (!existsSync(file) || !statSync(file).isFile())
      throw unresolvable(from, specifier)
    return file
  }

  // The file a specifier loads, or undefined for `node:*` and third-party
  // packages, where the analysis stops (R-181).
  const resolve = (specifier: string, from: string): string | undefined => {
    if (specifier.startsWith('.'))
      return toFile(
        path.resolve(path.dirname(from), specifier),
        from,
        specifier,
      )
    if (specifier.startsWith('#')) {
      const folder = folderOf(from)
      // Only prefix patterns such as `#src/*` are matched; as in Node, the
      // longest matching prefix wins.
      const [key, target] =
        Object.entries(manifests.get(folder)?.imports ?? {})
          .filter(
            ([k]) => k.endsWith('*') && specifier.startsWith(k.slice(0, -1)),
          )
          .toSorted(([a], [b]) => b.length - a.length)[0] ?? []
      if (key === undefined) throw unresolvable(from, specifier)
      if (typeof target !== 'string')
        throw new AnalysisError(
          relative(from),
          specifier,
          'non-string imports target',
        )
      const mapped = target.replace('*', specifier.slice(key.length - 1))
      return toFile(path.join(packagesRoot, folder, mapped), from, specifier)
    }
    // An absolute path or `file:` URL could reach oracle unseen, so it fails.
    if (/^(?:\/|file:|[a-z]:[/\\])/i.test(specifier))
      throw unresolvable(from, specifier)
    const [scope, name, ...rest] = specifier.split('/')
    if (scope !== '@hexagram') return undefined
    const folder = folders.get(`${scope}/${name}`)
    const key = rest.length > 0 ? `./${rest.join('/')}` : '.'
    const manifest = folder === undefined ? undefined : manifests.get(folder)
    const target =
      manifest && sourceTargets(manifest, `${folder}/package.json`).get(key)
    if (folder === undefined || !target) throw unresolvable(from, specifier)
    return toFile(path.join(packagesRoot, folder, target), from, specifier)
  }

  const loadsOf = (
    file: string,
    reachedBy: string,
  ): (readonly [string, string])[] => {
    const known = edges.get(file)
    if (known !== undefined) return known
    const program = ts.createProgram({
      rootNames: [file],
      options: { noLib: true, noResolve: true, types: [] },
    })
    const source = program.getSourceFile(file)
    const [diagnostic] = program.getSyntacticDiagnostics(source)
    if (source === undefined || diagnostic !== undefined)
      throw new AnalysisError(
        relative(file),
        reachedBy,
        `parse error: ${ts.flattenDiagnosticMessageText(diagnostic?.messageText, '\n')}`,
      )
    const loaded = loadedSpecifiers(source, relative(file)).flatMap(
      (specifier) => {
        const next = resolve(specifier, file)
        return next === undefined ? [] : [[next, specifier] as const]
      },
    )
    edges.set(file, loaded)
    return loaded
  }

  // Breadth first over every file the subpath loads, so each reachable file
  // is checked for errors and the chain reported is a shortest one.
  const verdictOf = (root: string, subpath: string): SubpathVerdict => {
    const reached = new Map([[root, { parent: '', specifier: subpath }]])
    const queue = [root]
    let oracle: string | undefined
    for (const file of queue) {
      if (isOracle(file)) {
        oracle ??= file
        continue
      }
      for (const [next, specifier] of loadsOf(
        file,
        reached.get(file)?.specifier ?? '',
      )) {
        if (reached.has(next)) continue
        reached.set(next, { parent: file, specifier })
        queue.push(next)
      }
    }
    if (oracle === undefined) return { verdict: 'free' }
    const chain: string[] = []
    for (let at = oracle; at; at = reached.get(at)?.parent ?? '')
      chain.unshift(relative(at))
    return { verdict: 'loads', chain }
  }

  try {
    const application = manifests.get('application') ?? {}
    const targets = sourceTargets(application, 'application/package.json')
    const subpaths: Record<string, SubpathVerdict> = {}
    for (const [subpath, target] of [...targets].toSorted(([a], [b]) =>
      a.localeCompare(b, 'en'),
    )) {
      const root = toFile(
        path.join(packagesRoot, 'application', target),
        path.join(packagesRoot, 'application', 'package.json'),
        subpath,
      )
      subpaths[subpath] = verdictOf(root, subpath)
    }
    return { ok: true, subpaths }
  } catch (error) {
    if (!(error instanceof AnalysisError)) throw error
    const { file, specifier, message } = error
    return { ok: false, file, specifier, message }
  }
}
