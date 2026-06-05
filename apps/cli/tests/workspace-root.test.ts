import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  findWorkspaceRoot,
  workspaceConsultationsDir,
  workspaceRoot,
} from '../src/workspace-root.js'

// LOCK: the @hexagram/cli app moved from `cli/cli` to `apps/cli`. Because the
// medium-neutral `defaultConsultationsDir()` resolves `<cwd>/consultations`,
// invoking a bin from inside `apps/cli` (cwd = `.../apps/cli`) would otherwise
// save/read at `apps/cli/consultations` — wrong. The app-layer resolver must
// walk up from the bin's own module location to the workspace marker
// (`pnpm-workspace.yaml`) and anchor `consultations/` at the MONOREPO ROOT,
// independent of `process.cwd()`. These tests pin that invariant.

// This test file lives at `<repo-root>/apps/cli/tests/`; the repo root is two
// directories up from `src/` (where the resolver's own module lives at runtime)
// and three up from here.
const thisDir = path.dirname(new URL(import.meta.url).pathname)
const expectedRoot = path.resolve(thisDir, '..', '..', '..')

describe('workspace-root resolver', () => {
  it('finds the repo root from a path INSIDE apps/cli (not the cwd)', () => {
    const fromInsideAppDir = path.join(
      expectedRoot,
      'apps',
      'cli',
      'src',
      'nested',
      'deeper',
    )
    expect(findWorkspaceRoot(fromInsideAppDir)).toBe(expectedRoot)
  })

  it('resolves consultations/ at the repo root, never under apps/cli', () => {
    // Simulate the bin running from its own package directory: derive the dir
    // from a module URL pointing inside apps/cli, exactly as the bins do via
    // `import.meta.url`.
    const moduleUrlInsideApp = pathToFileURL(
      path.join(expectedRoot, 'apps', 'cli', 'src', 'history.ts'),
    ).href
    const dir = workspaceConsultationsDir(moduleUrlInsideApp)
    expect(dir).toBe(path.join(expectedRoot, 'consultations'))
    expect(dir).not.toContain(path.join('apps', 'cli', 'consultations'))
  })

  it('workspaceRoot() resolves from this module location to the repo root', () => {
    expect(workspaceRoot(import.meta.url)).toBe(expectedRoot)
  })

  it('throws if no workspace marker is found before the filesystem root', () => {
    expect(() => findWorkspaceRoot(path.parse(thisDir).root)).toThrow(
      /pnpm-workspace\.yaml/,
    )
  })
})
