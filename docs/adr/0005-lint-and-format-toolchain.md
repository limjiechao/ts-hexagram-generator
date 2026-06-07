# Lint & format toolchain

Status: Accepted
Date: 2026-05-29

Linting is two layers run in sequence: **oxlint first, then eslint**
(`oxlint && eslint --cache .`). oxlint (Rust) is fast and covers the bulk of
correctness/style rules; eslint (via `@sxzz/eslint-config`) adds the rules oxlint
doesn't yet implement plus a few project-specific ones. The two compose rather than
compete — eslint loads oxlint's ruleset through `eslint-plugin-oxlint` so a rule is
owned by exactly one layer.

Formatting is **oxfmt, not Prettier** (`semi: false`, single quotes, trailing
commas, 80-col, sorted imports). The eslint config explicitly disables
`prettier/prettier` and `perfectionist/sort-imports` so formatting has a single
owner.

Notable rule choices:

- oxlint runs `correctness: error` / `suspicious: warn`, with the full `unicorn`
  set on **except four** that fight this codebase: `no-null` (the data model uses
  `null` for absent fields), `no-process-exit` (CLIs exit with codes),
  `number-literal-case` and `numeric-separators-style` (left to author taste).
- `react/react-in-jsx-scope` is off (modern JSX transform — see
  [ADR-0004](0004-typescript-compiler-posture.md)).
- `baseline-js/use-baseline` is off — Baseline targets cross-browser features,
  irrelevant for a Node CLI.
- `docs/**/*.md` is lint-ignored: planning docs carry illustrative, often partial
  TypeScript snippets that shouldn't face source-grade rules.
- A project rule **bans `await tick(...)` in test files**; its rationale lives in
  [ADR-0012](0012-terminal-test-reliability.md) (the comment in `eslint.config.js` is the
  long-form version).
- The explicit-`.js` relative-import convention ([ADR-0004](0004-typescript-compiler-posture.md))
  is pinned by a core ESLint `no-restricted-imports` rule (a `patterns.regex` that
  flags any `./`/`../` specifier lacking a real extension), NOT by `import/extensions`:
  oxlint's `import/extensions` resolves specifiers against disk and rejects
  `.js`-for-`.ts` (it demands the on-disk `.ts`), and the eslint layer's
  `eslint-plugin-importer` ships no `extensions` rule. The `no-restricted-imports`
  regex matches the literal specifier string instead, so it accepts the
  `.js`-written-`.ts` convention while still failing the build on a missing extension.

## Considered options

- **Single linter** (oxlint only, or eslint only). Rejected: oxlint alone misses
  rules the project wants; eslint alone is slow on every file. The two-layer split
  buys speed on the common path and coverage on the long tail.
- **Prettier.** Rejected: oxfmt is faster and keeps the formatter in the same
  Rust toolchain as oxlint; running both would mean two formatters disagreeing.

## Consequences

- A new lint rule must land in exactly one layer; duplicating it across oxlint and
  eslint produces double diagnostics.
- The four disabled `unicorn` rules are intentional — re-enabling one will light up
  large swaths of existing code (especially `no-null`). Treat with care.
- Formatting disagreements are settled by oxfmt; don't reintroduce Prettier config.

## Where it's enforced

- `.oxlintrc.json` — plugins, categories, the unicorn on/off set (see reverse map
  in `docs/adr/README.md`; pure JSON, no inline comment).
- `.oxfmtrc.json` — formatting choices (pure JSON; reverse map).
- `eslint.config.js` — the eslint layer, disabled formatter rules, docs ignore,
  the `await tick` ban, and the two architectural-boundary `no-restricted-imports`
  overrides: the `domain/**` cli-import boundary and the `cli/**/src/**`
  `string-width` ban (both per [ADR-0019](0019-domain-cli-boundary.md)).
- `package.json` scripts — `lint:check` / `format:check` wire the two together.
