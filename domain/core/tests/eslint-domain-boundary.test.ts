import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'

import { cliBoundaryBans, cliPackageNames } from '../../../eslint.boundary.js'

// Pins the ADR-0019 domain→cli boundary at the layer it protects: @hexagram/core
// is the foundational domain package, and the dependency arrow points cli →
// domain, never the reverse. This is a regression test for S14 — the boundary
// used to ban cli/* packages by bare name only (`no-restricted-imports`
// `paths[].name` is an exact-string match), so a subpath import like
// `@hexagram/readout/serialize-ansi` slipped past it undetected. The drift was
// invisible because no test exercised the rule; this is that test.

const linter = new Linter()

const boundaryConfig: Linter.Config = {
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-restricted-imports': [
      'error',
      { paths: cliBoundaryBans.paths, patterns: cliBoundaryBans.patterns },
    ],
  },
}

const restrictedImportMessages = (code: string) =>
  linter
    .verify(code, boundaryConfig)
    .filter((message) => message.ruleId === 'no-restricted-imports')

describe('ADR-0019 domain→cli boundary lint', () => {
  it('bans a bare cli/* package import', () => {
    const messages = restrictedImportMessages(
      `import { x } from '@hexagram/readout'`,
    )
    expect(messages).toHaveLength(1)
  })

  it('bans a cli/* SUBPATH import (S14 — used to evade the exact-name ban)', () => {
    const messages = restrictedImportMessages(
      `import { x } from '@hexagram/readout/serialize-ansi'`,
    )
    expect(messages).toHaveLength(1)
  })

  it('bans every cli/* package by both bare name and subpath', () => {
    for (const name of cliPackageNames) {
      expect(
        restrictedImportMessages(`import { x } from '${name}'`),
      ).toHaveLength(1)
      expect(
        restrictedImportMessages(`import { x } from '${name}/anything/deep'`),
      ).toHaveLength(1)
    }
  })

  it('allows a sibling domain import and a node builtin', () => {
    expect(
      restrictedImportMessages(
        `import { Hexagram } from '@hexagram/core/types'`,
      ),
    ).toHaveLength(0)
    expect(
      restrictedImportMessages(`import { randomInt } from 'node:crypto'`),
    ).toHaveLength(0)
  })
})
