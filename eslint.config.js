import { sxzz } from '@sxzz/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

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
    // S17 drift-guard (ADR-0004/0005): every relative import must carry an
    // explicit `.js` extension. oxlint's `import/extensions` can't host this —
    // it resolves the specifier to disk and rejects `.js`-for-`.ts`. This core
    // ESLint rule matches the literal specifier STRING instead, so it accepts
    // the `.js`-written-`.ts` convention. The regex flags any `./` or `../`
    // import that does not end in a real extension. Placed after the oxlint
    // spread so it is the final word for these files.
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`^\.{1,2}/.*(?<!\.(?:js|mjs|cjs|json|css))$`,
              message:
                'Relative imports must use an explicit `.js` extension (ADR-0004); bundler resolution maps it back to the `.ts`/`.tsx` source.',
            },
          ],
        },
      ],
    },
  },
)
