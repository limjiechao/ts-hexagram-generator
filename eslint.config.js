import { sxzz } from '@sxzz/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

// S17 drift-guard (ADR-0004/0005): every relative import must carry an explicit
// `.js` extension. Hoisted to a module-level const because ESLint flat config
// does NOT merge two configs' `no-restricted-imports` — the last matching config
// wins outright for that rule key. Each scoped override below that adds `paths`
// MUST re-list this pattern, or the extension guard silently dies for that file
// set. One authoritative copy here, referenced everywhere.
const explicitJsExtensionPattern = {
  regex: String.raw`^\.{1,2}/.*(?<!\.(?:js|mjs|cjs|json|css))$`,
  message:
    'Relative imports must use an explicit `.js` extension (ADR-0004); bundler resolution maps it back to the `.ts`/`.tsx` source.',
}

// S9 drift-guard (no-barrel-files standard): these packages expose their public
// API as concrete subpath `exports`, NOT a root `.` barrel. Importing the bare
// package name is banned so the per-subpath discipline can't silently regress
// into a re-export barrel (which is what let two import conventions coexist for
// the same symbols). Re-listed in each scoped `paths` block below for the same
// flat-config replace-semantics reason as the extension guard.
const barrelRootBans = [
  {
    name: '@hexagram/consultation-file',
    message:
      'Import the concrete subpath — @hexagram/consultation-file/{file,frontmatter,markdown,legacy-converter} — not the bare package; it has no root barrel (S9, no-barrel-files).',
  },
  {
    name: '@hexagram/readout',
    message:
      'Import the concrete subpath — @hexagram/readout/{consultation-readout,output-composers,serialize-ansi,standing-line-color} — not the bare package; it has no root barrel. Casting-table row geometry lives at @hexagram/consultation-view/ledger-geometry (S9, no-barrel-files).',
  },
]

// The seven cli/* package names (ADR-0019 boundary). domain/* may not import any
// of them: the dependency arrow points cli → domain, never the reverse.
const cliPackageNames = [
  '@hexagram/viewer-core',
  '@hexagram/readout',
  '@hexagram/casting-ui',
  '@hexagram/history-ui',
  '@hexagram/playground-ui',
  '@hexagram/shell',
  '@hexagram/test-utils',
]

export default sxzz().append(
  {
    // Planning docs under docs/ contain illustrative TypeScript snippets
    // (often partial/incomplete) that should not be held to source-grade
    // lint rules.
    ignores: ['docs/**/*.md'],
  },
  {
    rules: {
      'prettier/prettier': 'off',
      'perfectionist/sort-imports': 'off',
      // baseline-js targets cross-browser Baseline features; irrelevant in
      // this Node 24+ CLI project (top-level await is supported natively).
      'baseline-js/use-baseline': 'off',
    },
  },
  {
    // See docs/adr/0012-terminal-test-reliability.md for the full rationale.
    // Forbid `await tick(...)` in test files. The May 2026 9-round CI
    // stabilisation (commits 4eae942 → 800d3fc) showed that the
    // `stdin.write(...) → await tick() → expect(lastFrame())` pattern races
    // unbounded async work on slow CI runners; the worst case landed at
    // 4.5 s on Ubuntu under load. Use `waitFor(predicate)`,
    // `waitForReady(spy)`, `pumpSliderTick(n)`, or `yieldMacrotask()` from
    // `@hexagram/test-utils` instead — the assertion itself becomes the
    // condition, no constant to tune. See the cross-platform-tests skill
    // (signal #1) for the discriminating signal.
    //
    // Files that still call bare `await tick(...)` carry a top-of-file
    // `/* eslint-disable no-restricted-syntax */` directive; Wave 3 lifts
    // the disable as each file migrates.
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "AwaitExpression > CallExpression[callee.name='tick']",
          message:
            'Use `waitFor(predicate)`, `waitForReady(spy)`, `pumpSliderTick(n)`, or `yieldMacrotask()` from `@hexagram/test-utils` instead of `await tick()`. See the cross-platform-tests skill, signal #1.',
        },
      ],
    },
  },
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
  {
    // Global `.js`-extension drift-guard (ADR-0004/0005). oxlint's
    // `import/extensions` can't host this — it resolves the specifier to disk
    // and rejects `.js`-for-`.ts`. This core ESLint rule matches the literal
    // specifier STRING instead, so it accepts the `.js`-written-`.ts`
    // convention. Placed after the oxlint spread, and BEFORE the two scoped
    // overrides below, so each scoped block (which re-lists this pattern) wins
    // for its file set without losing the extension guard.
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [explicitJsExtensionPattern], paths: barrelRootBans },
      ],
    },
  },
  {
    // ADR-0019 boundary: domain/* must not import cli/*. The dependency arrow
    // points cli → domain. Re-lists the extension pattern because flat config
    // replaces (does not merge) this rule key for the matched files.
    files: ['domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [explicitJsExtensionPattern],
          paths: cliPackageNames.map((name) => ({
            name,
            message:
              'domain/* must not import cli/* (ADR-0019): the dependency arrow points cli → domain. Express the intent medium-neutrally (consultation-view IR or text-layout) and let a cli/* serializer render it.',
          })),
        },
      ],
    },
  },
  {
    // ADR-0019 boundary: only cli/viewer-core may import `string-width` directly;
    // every other cli/* measures rendered width through viewer-core's ANSI-aware
    // `terminalWidth` wrapper. Re-lists the extension pattern for the same
    // flat-config replace-semantics reason as above.
    files: ['cli/**/src/**/*.{ts,tsx}'],
    ignores: ['cli/viewer-core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [explicitJsExtensionPattern],
          paths: [
            ...barrelRootBans,
            {
              name: 'string-width',
              message:
                'Import rendered-string width via @hexagram/viewer-core (terminalWidth and the truncate/pad helpers), not string-width directly (ADR-0019). viewer-core is the sole exempt wrapper.',
            },
          ],
        },
      ],
    },
  },
)
