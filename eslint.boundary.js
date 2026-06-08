// ADR-0019 domain→cli boundary, factored out of eslint.config.js so the rule
// data has ONE home and can be unit-tested in process (domain/core/tests/
// eslint-domain-boundary.test.ts) without evaluating the full flat config.
//
// The dependency arrow points cli → domain, never the reverse: a `domain/*`
// file may not import any `cli/*` package.

// The seven cli/* package names (ADR-0019).
export const cliPackageNames = [
  '@hexagram/viewer-core',
  '@hexagram/readout',
  '@hexagram/casting-ui',
  '@hexagram/history-ui',
  '@hexagram/playground-ui',
  '@hexagram/shell',
  '@hexagram/test-utils',
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
