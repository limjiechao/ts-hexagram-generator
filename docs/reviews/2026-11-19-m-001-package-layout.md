# M-001 package layout: three options for the owner

Date: 2026-11-19. Status: copilot draft for M-001 (ADR-0040, "Roles"); ephemeral.
It binds nothing until the owner rules on it (R-021, R-022, R-024).

**What is being decided.** Where M-001's incision code lives (ADR-0040): the core
value types, the four driven ports and the ten use cases of ADR-0037, and the
walking skeleton. R-021 asks for package axis, granularity and in-package structure
as one set. Every option below stays within R-018 (no barrels), R-019 (`imports`
aliases) and R-020 (a purity check that lint can see). M-002 encodes the boundary.

**Common to all three options** (so the options differ only where they really differ):

- **Folder and names.** Paths are written `overhaul/<pkg>/`, and names are
  `@hexagram/<pkg>`. Neither collides with today's `domain/*`, `cli/*` or `apps/*`,
  which the bug loop still maintains (R-003). The real folder is open question Q1.
- **R-018.** No `index` barrels. Each package's `exports` lists one subpath per
  real implementation file (e.g. `@hexagram/oracle/transformation` →
  `src/transformation.ts`). Each subpath carries ADR-0003's `source`/`types`/`import`
  conditions and a matching tsdown entry. A root `.` entry is used only where its
  file is real implementation. Nothing imports a directory.
- **R-019.** Every package declares `"imports": { "#src/*": "./src/*" }`, placed
  **before** `exports` (eslint `jsonc/sort-keys`). Specifiers carry the `.js` suffix
  (`#src/line-value.js`), because tsc does not probe extensions on `imports`
  patterns. Tests use the same aliases. No tsconfig `paths` (spike Q-M-001-1).
  M-002 can catch leftover `../` chains with `no-restricted-imports`
  `patterns: ['../*']` on `overhaul/**`; the spike found nothing enforces this today.
- **R-020 ban list.** A pure file may not import `node:*` or the bare built-ins
  (`fs`, `crypto`, …). It may not use the globals `fetch`, `crypto`, `indexedDB`,
  `process` or `performance`, nor call `Math.random`, `Date.now` or `new Date()`
  with no arguments. In eslint terms: `no-restricted-imports`,
  `no-restricted-globals`, `no-restricted-properties`, and `no-restricted-syntax`
  with `NewExpression[callee.name='Date'][arguments.length=0]`. Importing a
  port's type is allowed (R-020 note). Package bans reuse the `paths` + `/**`
  `patterns` pair already used in `eslint.boundary.js`, so a subpath cannot slip
  past.
- **Skeleton.** The package is **`@hexagram/cli-adapter`**, and it drives **use case
  3, Resolve a Transformation**. The test passes six Line Values to a CLI command
  handler, which calls the use case through its signature; the use case calls the
  Oracle, and then a **stub Scripture Catalogue** declared in the test. The test
  asserts on the handler's output. Use case 3 is the one case that all three
  channels serve (ADR-0037), and it touches the Oracle, the application and one
  driven port. Its depth is Q2.
  Acceptance (R-023): `pnpm type:check && pnpm --filter @hexagram/cli-adapter test`.

---

## Layout A: contexts own everything ("context packages")

**Axis:** bounded contexts (CONTEXT.md context map). Each context package holds
its value types, its own driven port, and that port's adapters. Use cases
cross contexts, so they sit in one `application` package.

**Packages in M-001 (5):** `oracle`, `scripture-catalogue`, `consultation-journal`,
`application`, `cli-adapter`. Later: `presentation`, `rest-engine`, `pwa`,
`legacy-import`.

```
oracle ◄── scripture-catalogue ◄──┐
   ▲  ◄── consultation-journal ◄──┤
   └─────────────────────────── application ◄── cli-adapter (composition root:
                                                 also imports context adapter entries)
```

**In-package structure:** a context package mixes pure files with effectful
adapter files, so purity has to be visible in paths:
`consultation-journal/src/consultation.ts` (pure) and
`consultation-journal/src/adapters/markdown-store.ts` (effectful). That needs an
`adapters/` role folder, the by-kind folder R-021 asks about. The alternative is
a filename suffix such as `*.adapter.ts`.

**Where M-001's artifacts land:**

| Artifact | Location |
| --- | --- |
| Oracle value types (Transformation, Hexagram, Figure, Trigram, Line Value, Line Position, Pick, Round, Casting, Resolution, passage references) | `oracle/src/<concept>.ts` |
| Journal value types (Consultation, Consultation Id, Query, Divined At, Division Method, Deletion Record) | `consultation-journal/src/<concept>.ts` |
| Catalogue value types (Work, Citation, Edition, Reading Preference) | `scripture-catalogue/src/<concept>.ts` |
| Consultation Store port | `consultation-journal/src/consultation-store.ts` |
| Scripture Catalogue port | `scripture-catalogue/src/scripture-catalogue.ts` |
| Random Source, Clock ports (no context owns them) | `application/src/random-source.ts`, `clock.ts` |
| 10 use-case signatures | `application/src/<use-case>.ts`, one file and one subpath each |
| Driving adapter, wiring | `cli-adapter/src/resolve-command.ts`, `cli-adapter/src/main.ts` |
| Stub driven adapter | `cli-adapter/tests/` (test-only) |

**R-020 lint shape:** the ban list applies to `overhaul/{oracle,scripture-catalogue,consultation-journal,application}/src/**`
*minus* `**/adapters/**`, and pure files may not import `#src/adapters/*`. The
purity boundary is a glob inside packages, so it rests on a folder convention.

---

## Layout B: hexagonal layers ("layer packages")

**Axis:** hexagonal layers (ADR-0037). There is one pure `domain` package for every
context, one `application` package, and one driven-adapter package per platform.

**Packages in M-001 (3):** `domain`, `application`, `cli-adapter`. Later:
`node-adapters` (Markdown store, `node:crypto`, clock, bundled catalogue),
`browser-adapters` (IndexedDB, WebCrypto, REST-client catalogue), `presentation`,
`rest-engine`, `pwa`, `legacy-import`.

```
domain ◄── application ◄── node-adapters
   ▲            ▲               ▲
   └──────── cli-adapter ───────┘ (composition root)
```

**In-package structure:** `domain/src/` has one folder per context (`oracle/`,
`consultation-journal/`, `scripture-catalogue/`): the folders follow the context,
not the kind of file. `application/src/` is flat, one file per port and per use
case, with no `ports/` or `use-cases/` folder; the file name says which is which.
Subpaths look like `@hexagram/domain/oracle/transformation`.

**Where M-001's artifacts land:** the value types go in `domain/src/<context>/<concept>.ts`.
All four ports go in `application/src/<port>.ts`. The ten use cases go in
`application/src/<use-case>.ts`. The driving adapter, wiring and stub are placed as
in Layout A.

**R-020 lint shape:** the ban list applies to `overhaul/{domain,application}/src/**`,
two package globs and no exceptions. ADR-0040's drift signal 3 ("imports across
contexts") is a separate rule inside `domain` that works on folders:
`domain/src/oracle/**` may not import `#src/scripture-catalogue/*` or
`#src/consultation-journal/*`. The PWA's ban on bundling the Oracle (ADR-0037)
has to be a subpath ban (`@hexagram/domain/oracle/**`), not a package ban.

---

## Layout C: hybrid, with one role per package ("fine packages")

**Axis:** contexts for the domain, and layers for everything else. Each pure context is its
own package, the application is one package and owns all four ports, and every
driven adapter is its own package. Each package has exactly one hexagonal role,
so the role is carried by the package boundary and no role folders are needed.

**Packages in M-001 (5):** `oracle`, `scripture-catalogue`, `consultation-journal`,
`application`, `cli-adapter`. Later Matters add one package per adapter or
channel: `store-markdown`, `catalogue-bundled`, `node-effects` (Random Source, Clock),
`presentation`, `rest-engine`, `pwa`, `store-indexeddb`, `legacy-import`.

```
oracle ◄── scripture-catalogue ◄──┐
   ▲  ◄── consultation-journal ◄──┤
   └─────────────────────────── application ◄── cli-adapter (composition root)
                                     ▲
             (later) store-markdown, catalogue-bundled, node-effects
```

**In-package structure:** flat `src/`, one concept per file, named with glossary
terms (`src/transformation.ts`, `src/casting.ts`, `src/consultation-store.ts`,
`src/resolve-a-transformation.ts`). There are no `ports/`, `adapters/`, `use-cases/` or
`types/` folders. Value types sit beside the rules that use them.

**Where M-001's artifacts land:** value types are placed as in Layout A, one file per
concept in the three context packages. All four ports, including the
Consultation Store and the Scripture Catalogue, go in `application/src/<port>.ts`,
because the application owns what it needs from outside (ADR-0037). The use cases,
driving adapter, wiring and stub are placed as in Layout A.

**R-020 lint shape:** the ban list applies to a list of pure packages,
`overhaul/{oracle,scripture-catalogue,consultation-journal,application}/src/**`.
Package bans: `oracle` imports no `@hexagram/*` package. The two context packages
import only `oracle`. `application` imports no adapter package. No pure package
imports an adapter or channel package. When a package is added, it joins one list
(pure or effectful), so one line of config records the decision.

---

## Comparison

| | A: context packages | B: layer packages | C: hybrid, one role per package |
| --- | --- | --- | --- |
| Axis | contexts | layers | contexts for the domain, layers outside it |
| Packages (M-001 / at Phase 6) | 5 / ~9 | 3 / ~8 | 5 / ~13 |
| Purity-lint simplicity | weakest: an in-package glob with an exception | simplest: 2 package globs, no exceptions | simple: a list of 4 package globs, no exceptions |
| Context boundary (drift signal 3) | package arrows | an in-package folder rule | package arrows |
| Fit with ADR-0037/0038 channels | poor: Markdown (`node:fs`) and IndexedDB adapters share one package, which clashes with ADR-0003's one `platform` per package | fair: platform adapter packages fit, but "PWA bundles no Oracle" becomes a subpath ban | good: the REST engine, PWA and each store depend only on the packages they use; every channel rule is a package arrow |
| Change locality | a context change stays in one package, adapters included | a context change touches `domain` and an adapter package | a domain change touches one package; an adapter change touches one package |
| Cost of later moves | moving an adapter out changes import specifiers in composition roots | splitting `domain` later rewrites every `@hexagram/domain/<ctx>/…` specifier | merging packages later rewrites their specifiers; inside a package, `#src` keeps churn small |
| Fit with R-021's by-kind question | needs an `adapters/` role folder (by kind) | no role folders; the packages themselves are named by kind | no role folders; the one role per package is the boundary |

## Recommendation (for the owner to accept, edit or reject)

**Layout C.** Its purity check is a list of package names, with no in-package
exceptions (R-020, drift signal 3). Each package has one role, so no by-kind
folders appear and the vertical-code-structure skill could be admitted (R-021).
ADR-0037/0038's channel rules (no Oracle in the PWA, no Journal in the REST
engine) become package arrows. Separate adapter packages keep each package on
one platform (ADR-0003). It costs more packages, but M-001 creates only five.

## Draft Free to choose for M-001 (R-024), under Layout C

Owner-ratified, so **not** free: package names and arrows; each package's
`exports` subpaths; the shapes of public types; the port and use-case
signatures; new runtime dependencies.

- Names, number and split of files that are **not** exported (private helpers inside a package).
- Private helper and local variable names, using glossary terms and never _Avoid_ terms.
- Order and grouping of declarations inside a file.
- The internal shape of the skeleton's command handler, and how the test captures its output.
- The form of the stub Scripture Catalogue (inline object or a helper file under `cli-adapter/tests/`).
- How the composition root is written (plain function wiring; no DI library, since that is a new dependency).
- Test file names and grouping under each package's `tests/`.
- Per-package tsdown and vitest config details, within ADR-0003 and ADR-0013.
- The algorithm behind whatever Resolution the skeleton exercises, within the scope that Q2 sets.

**Under Layout A:** the folder or suffix that separates adapter files from pure
files becomes Tier A, because the purity lint depends on it. File placement
inside `adapters/` stays free.
**Under Layout B:** the per-context folders inside `domain/src/` become Tier A,
because the context lint depends on them. Files inside each folder stay free,
as above.

## Open Tier-A questions this draft could not settle

**Q1. Where overhaul packages live beside the legacy ones.** The legacy packages
stay maintained (R-003), and `@hexagram/core` and `@hexagram/cli` are taken.
Candidates: (a) a new workspace glob `overhaul/*` with non-colliding `@hexagram/` names;
(b) a new npm scope; (c) the existing `domain/*` and `cli/*` folders, with distinct names.

**Q2. How much Oracle the skeleton implements.** Use case 3 needs Resolution, but
the Oracle core is Phase 3. Candidates: (a) only Standing and Emerging Hexagrams,
Moving Lines and Applicable Passages, with no 64-row table; (b) a fixed answer for
one Transformation; (c) drive use case 8 instead, which needs no Oracle.

**Q3. Who assigns the Consultation Id.** A ULID needs time and randomness, but no
Id port exists among the four (ADR-0030, ADR-0037), and this shapes the Store's
signature. Candidates: (a) the Store assigns it on `keep`; (b) the use case builds
it from Clock and Random Source; (c) a fifth driven port.

**Q4. May a driving adapter call the Oracle directly?** ADR-0038's pure Casting
resource is not one of the ten use cases. Candidates: (a) yes, for that resource
only; (b) `application` also exports a pure Casting step outside the ten;
(c) use case 1's signature is split into steps the REST engine can call.

**Q5. Where the Remainder-Group policy lives.** It is pure and outside the Oracle,
shared by the CLI's and the PWA's random Pick source (ADR-0023, ADR-0037).
Candidates: (a) a subpath of `application`, beside the Random Source port;
(b) its own small pure package; (c) `oracle` after all, which would amend ADR-0023.

**Q6. Build platform of the pure packages.** ADR-0003 fixes `platform: 'node'`, but
the PWA will consume pure packages in a browser. Candidates: (a) `neutral` for pure
packages, which would amend ADR-0003; (b) keep `node` until Phase 6.
