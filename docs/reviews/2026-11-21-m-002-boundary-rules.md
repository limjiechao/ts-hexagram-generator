# M-002 drift signals 1–4: boundary rules, Acceptance and Free to choose

Date: 2026-11-21. Status: copilot draft for M-002 (ADR-0042, "Roles"); ephemeral.
It binds nothing until the owner rules on it (R-140).

**What is being decided.** How drift signals 1–4 (ADR-0042, "Drift signals") are
built: each signal's design, the boundary rules signal 3 encodes, a knife-edge
Acceptance, a Free to choose, the slicing, and R-142's line-edits.

**Facts checked in the tree (2026-11-21).**

- `typescript-eslint` 8.59.3 is already installed through `@sxzz/eslint-config`, so
  `@typescript-eslint/*` rules cost no new dependency. Type-aware linting is not
  configured today (no `projectService`).
- In that version, `consistent-type-assertions` with `assertionStyle: 'never'`
  skips `as const` (the rule's `isConst` check), as R-057 requires.
- `overhaul/*` has today no type assertion besides `as const`, no non-null `!`,
  no effectful import, and no ephemeral ID in comments or test names. Only
  `overhaul/oracle` imports `isCompleteCasting`. Every `package.json` arrow
  already matches Layout C with R-076, R-109, R-127 and R-135.
- ESLint's flat config replaces, not merges, a rule's options per file
  (`eslint.config.js`, the S17 note). Core `no-restricted-imports` already carries
  the `.js`-extension and barrel guards for every file.

## 1. Each signal's design

**Signal 1, doc truth (script).** Reads `AGENTS.md`, every ADR whose status is
Accepted, and `docs/design/*.md`. Candidates are backticked tokens only:

- a **path** is a token whose first segment is an entry of the repo root
  (`overhaul/`, `docs/`, `eslint.config.js`…); it must exist, and a glob must
  match at least one file. Tokens with `<…>` placeholders are templates and skipped.
  The root test keeps URL routes (`/works/zhouyi`), lint rule names
  (`import/extensions`) and package-relative paths out.
- a **symbol** is a camelCase token, optionally with `()`; it must occur as a word
  in a tracked `*.ts`, `*.tsx`, `*.js` or `*.json` file.
- text under a **Considered options** heading is skipped: rejected names do not
  exist by design (e.g. ADR-0011's `castMethod`).

Today this finds 4 misses: `cli/cli` (ADR-0019), `docs/manual/cli.md` and
`docs/manual/rest.md` (ADR-0042, not yet written), and one template the
placeholder rule removes. See Q1. Of 90 camelCase symbols, only `castMethod` is
missing, and it sits under Considered options. **Legacy:** it reads ADRs that
describe legacy packages, so it checks legacy paths named there; it edits nothing.

**Signal 2, glossary conformance (script).** Reads `CONTEXT.md`'s `_Avoid_:`
lines at run time, so the glossary stays the one home of the list. An entry is
**checkable** if it has two or more words and no parenthesised qualifier
(e.g. `coin casting`, `changing line`, `mutual hexagram`, `Wen Wang order`).
Single words (`index`, `key`, `path`, `source`, `version`) and qualified entries
(`hexagram (for the 4,096-valued thing)`) collide with ordinary code and are
not checked; the script prints how many it skipped. It scans identifiers, split at
camelCase and `_` boundaries, and string literals, case-insensitively, in
`overhaul/*/src/**`. Today: no hit. See Q2. **Legacy:** not scanned; renaming
legacy code is hygiene that R-003 defers to the overhaul.

**Signal 3, boundaries (build-failing lint).** ESLint, in `eslint.config.js`,
with the rule data in one new module beside `eslint.boundary.js`, unit-proved
the same way. It covers `overhaul/*` only (section 2). **Legacy:**
`eslint.boundary.js` and its ADR-0019 guards stay untouched. "Build-failing"
is read as "fails `pnpm lint:check`", which `check:all` runs (Q7).

**Signal 4, ephemeral leakage (script).** Scans comments and the first argument
of `describe`, `it` and `test` in `overhaul/**/*.{ts,tsx}`, src and tests. It
flags: question IDs (`Q-M-001-4`, `Q-PH1-3`), Matter IDs (`M-002`), seam IDs
(`S14`), `slice|wave|round <n>` labels, paths under `docs/reviews/`,
`docs/plans/`, `docs/archive/`, and the names `MATTERS`, `MINUTES`, `RULINGS`.
Ruling IDs: see Q6. Today: no hit. **Legacy:** not scanned; 23 legacy
files carry seam or wave IDs, and their hygiene is deferred (R-003). New tooling that M-002 writes is held to it as well.

## 2. The boundary rules (signal 3)

`P` is the purity list: `overhaul/{oracle,remainder-group-policy,consultation-journal,
scripture-catalogue,application}/src/**` (R-020, R-026, Layout C under R-025).
Tests of pure packages are not on it: Layout C scoped the ban to `src/**`.

| ID  | Rule                                                                                                                           | Encodes                     | Enforced by                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------ |
| B1  | `P` imports no `node:*` module (Q4 for the exact set)                                                                          | R-020, R-026                | `@typescript-eslint/no-restricted-imports`                   |
| B2  | `P` uses no effectful global: `Math.random`, `Date.now`, a zero-argument `Date`, and Q4's others                               | R-020                       | core `no-restricted-properties`, `-globals`, `-syntax`       |
| B3  | `oracle` imports no `@hexagram/*` package                                                                                      | Layout C (R-025)            | `@typescript-eslint/no-restricted-imports` (allow-list)      |
| B4  | `consultation-journal` and `remainder-group-policy` import only `@hexagram/oracle/*`                                           | Layout C, R-026, R-109      | same                                                         |
| B5  | `scripture-catalogue` imports only `@hexagram/oracle/*` and `@hexagram/consultation-journal/*`                                 | Layout C, R-076             | same                                                         |
| B6  | `application` imports only `oracle`, `consultation-journal`, `scripture-catalogue`, `remainder-group-policy`; never an adapter | Layout C, R-109             | same                                                         |
| B7  | `cli-adapter/src/**` imports only `@hexagram/application/*`                                                                    | R-127                       | same                                                         |
| B8  | `cli-adapter/tests/**` may also import `@hexagram/scripture-catalogue/*`, as a dev dependency                                  | R-135                       | same                                                         |
| B9  | Each `overhaul/*/package.json` declares exactly the `@hexagram/*` arrows of B3–B8                                              | Layout C, R-127, R-135      | the B3–B8 table, checked against the manifests by the prover |
| B10 | `isCompleteCasting` is imported only in `overhaul/oracle/**`                                                                   | R-055 (PWA exception: Q5)   | `@typescript-eslint/no-restricted-imports` (`importNames`)   |
| B11 | No type assertion in `overhaul/**`, tests included; `as const` exempt                                                          | R-057, R-051 (scope: Q3)    | `@typescript-eslint/consistent-type-assertions`, `never`     |
| B12 | No unsafe assignment in `overhaul/**`, tests included                                                                          | R-101                       | `@typescript-eslint/no-unsafe-assignment` (typed lint)       |
| B13 | The PWA imports `application` only by subpaths that load no Oracle code                                                        | R-031                       | Q5                                                           |
| B14 | The REST engine's arrows                                                                                                       | ADR-0038, R-025             | added with that package (Q5)                                 |

Notes on enforcement:

- **Why the `@typescript-eslint/` variant.** B1, B3–B8 and B10 use
  `@typescript-eslint/no-restricted-imports`, a separate rule key, so they never
  clobber core `no-restricted-imports` and its `.js` and barrel guards. Because
  B1, B3–B8 and B10 overlap on the same files, the data module emits **one
  merged block per package and per `src`/`tests`**, each file matched by exactly
  one block. When a package arrives it joins one list, pure or not (Layout C).
- **Allow-lists, not deny-lists.** B3–B8 ban every `@hexagram/*` specifier but the
  listed ones, so legacy packages (`@hexagram/core`…) are barred too, with no
  extra rule. Deep imports are already impossible by construction (ADR-0003).
- **Type-only imports.** B3–B8 apply to `import type` too: the manifest arrow is
  the decision, whatever the import carries. Under R-020's note, importing a port's
  type is not an effect; B1 and B2 still ban `node:*` types in `P`, which hold none today.
- **Ordering.** The overhaul blocks go after the oxlint spread, which turns off ESLint
  rules oxlint already runs; the prover catches it if a rule goes silent.
- **New dependencies.** None needed. Alternatives that would add one (Tier A):
  `eslint-plugin-boundaries` or `dependency-cruiser` for B3–B9; `oxlint-tsgolint`
  for type-aware oxlint in place of B12's ESLint `projectService`. Recommended:
  neither; the installed rules suffice.
- **B12's cost.** Typed linting builds a TypeScript program per `overhaul/*`
  tsconfig. Lint time before and after is measured and reported in its slice.

## 3. Knife-edge Acceptance

```bash
pnpm lint:check && pnpm drift:check && pnpm drift:prove
```

- `drift:check` runs signals 1, 2 and 4 on the tree; exits 0 when clean.
- `drift:prove` exits 0 only if **every planted violation is caught by exactly
  its own rule, and the clean twins report nothing**. Its list of expected IDs
  is fixed in the prover (B1–B12, and one case per signal-1, -2 and -4 check), so
  a deleted fixture fails the command instead of silently passing.
- **Where the plants live:** `scripts/drift/fixtures/<signal>/`, one file per ID
  with a clean twin. Signal-3 plants are excluded from the repo's own lint run and
  linted through ESLint's Node API under a virtual path (e.g. a B1 plant as
  `overhaul/oracle/src/planted.ts`), so the real per-path config judges them.
  Signal 1, 2 and 4 plants are given to the script as an alternative root.
  `drift:prove` leaves the working tree unchanged.
- If M-002 is split (section 5), M-002's Acceptance is
  `pnpm lint:check && pnpm drift:prove`, with only B-IDs expected, and the second
  Matter's is the full command above.

## 4. Draft Free to choose (Tier B, for the implementer)

- File names and layout under `scripts/drift/`, and the boundary data module's name.
- The scripts' language and runtime: TypeScript run by `tsx`, both installed.
- The internal structure of the scripts, the prover and the data module.
- The exact regexes for the candidates, splitting and IDs of sections 1 and 2, within the vocabulary ratified there.
- The wording of lint messages and script output, each naming the Ruling or ADR it encodes.
- Whether B10 names `isCompleteCasting` by `importNames` or bans its subpath outright.
- Whether the allow-lists are written as `regex` or as negated `group` patterns.
- How a typed-lint plant (B12) is admitted, e.g. `projectService.allowDefaultProject`.
- The order of slices within one Matter, if a later one unblocks an earlier one.

Not free: each rule's ban and scope, `P`, the arrows, Acceptance, new dependencies.

## 5. Slicing

Phase 2's budget is 2 Matters, 1 week, and 60 owner touches per Matter (R-138).
**Recommendation: split.** M-002 keeps signal 3, which is the Tier-A surface
(dependency rules). A second Matter, "Build drift signals 1, 2 and 4", takes
the scripts, whose Tier-A surface is vocabulary (Q1, Q2, Q6). Each gets its own
knife-edge Acceptance, and its own touch cap. Splitting uses the whole
budget; keeping one Matter leaves one Matter of slack.

M-002, signal 3:

1. **Prover and arrows** (~300 lines): the data module, B1–B9, the prover
   restricted to B-IDs, the plants and their clean twins, `drift:prove`, and R-142's three
   line-edits (section 6).
2. **Brand and assertions** (~120): B10, B11, with plants.
3. **Typed lint** (~150): B12 with `projectService`, its plant, and the lint-time
   figures.
4. **The PWA rule** (~200), only if Q5 picks (c): B13's Oracle-free classifier and
   its plants.

The second Matter: (1) a shared scanner of overhaul source and signal 4
(~250); (2) signal 2 (~200); (3) signal 1 with Q1's baseline (~300); (4) `drift:check`
joins `check:all` (Tier C, on the owner's request).

## 6. R-142's line-edits (M-002, slice 1)

Comments cite only ADRs and glossary terms (ADR-0042), so none cites a Ruling.

**Keep** (`overhaul/application/src/keep-cast-consultation.ts`, lines 12–13), replacing
"Only the Oracle makes a complete Casting, so it is kept without replay.":

```ts
 * Use case 1's last step: keeps the Cast Consultation and returns it. A
 * complete Casting has two makers, the Oracle's last Division step and the
 * PWA's one trust function on the REST engine's JSON (ADR-0037); both admit
 * it through `isCompleteCasting`, so it is kept without replay.
```

**R-050** (`overhaul/consultation-journal/src/cast-consultation.ts`, above line 18):

```ts
  /** Repeated from its Casting, so every Consultation carries one here. */
```

**R-076** (`overhaul/scripture-catalogue/src/edition.ts`, above line 1):

```ts
// Reuses the Journal's Day and its guard, so there is no second day type.
```

## 7. Open Tier-A questions

**Q1. Doc truth: names that do not exist yet, or no longer.** ADR-0042 names
`docs/manual/cli.md` and `rest.md`, phase gates not yet written; ADR-0019 names
`cli/cli`. (a) A ratified allow-list file, one line per name with its reason,
seeded with these three; `cli/cli` is fixed in ADR-0019 if the owner prefers.
(b) A marker in the docs, e.g. "(planned)", which the script honours; an ADR
text change. (c) Check only documents dated after ADR-0040. Recommend (a):
it keeps ADRs unedited and every exception visible in one place.

**Q2. Which _Avoid_ entries are checkable.** `CONTEXT.md` writes them as prose,
many qualified (`key, code (for the identity)`) or common (`index`, `path`).
(a) Only multi-word unqualified entries, read from `CONTEXT.md` at run time
(section 1). (b) The owner marks checkable entries in `CONTEXT.md`; a glossary
edit. (c) A separate list file; duplicates the glossary. Recommend (a): no second
home for the list, and the skipped count shows the gap honestly.

**Q3. What R-051 counts as a type assertion.** (a) `as` and `<T>` only, as R-057
says. (b) Also the non-null `!` (`no-non-null-assertion`, off in sxzz today);
TypeScript calls it an assertion, and `overhaul/*` has none. (c) Also
`@ts-expect-error`, which three tests use to prove a type error; it asserts nothing.
Recommend (b), not (c): `!` bypasses a check the way `as` does; a guard replaces it.

**Q4. The effect vocabulary of B1 and B2.** R-020 names `node:fs`, `node:crypto`,
the system clock and `Math.random`. (a) Exactly those four. (b) All `node:*`
modules, plus the globals `crypto`, `performance`, `process`, `fetch` and the
timers. (c) (b) plus any non-workspace package in `P`. Recommend (b): ADR-0037's
four driven ports wrap every effect the pure packages may reach; (c) is already
covered, since a new runtime dependency is Tier A anyway.

**Q5. Rules for packages that do not exist yet** (the PWA, its trust file, the
REST engine). (a) B10 strict now (`oracle` only); the PWA's Matter adds its one
trust file, B13, and the REST engine's Matter adds B14, each as a Tier-A line in
the arrows table. (b) Patterns now for `overhaul/pwa/**`, with a guessed trust-file
path, which names a file nobody has ratified. (c) As (a), but B13's knowledge is
built now: a script lists which `application` subpaths load Oracle code (value
imports followed transitively, `import type` ignored), proved on plants; the PWA's
Matter only scopes it. Also open: may the PWA `import type` from `oracle` elsewhere?
Recommend (c), and yes to type-only imports, since they load no code.

**Q6. Are Ruling IDs ephemeral for signal 4?** Rulings are authoritative, but
ADR-0042 says source comments cite only ADRs and glossary terms. (a) Flag `R-nnn`
in `overhaul/**` comments and test names; allow it in lint config and drift
scripts, where naming a rule's origin is the point. (b) Allow `R-nnn` everywhere.
(c) Flag it everywhere, tooling included. Recommend (a): it follows ADR-0042's text.

**Q7. What "build-failing" means for signal 3.** (a) It fails `pnpm lint:check`,
which `check:all` runs. (b) Lint also becomes a turbo dependency of `build`.
Recommend (a): `build` stays fast and lint already gates every landing.
