# Survey 08: Dependency graph and boundary fitness for hexagonal architecture

Scope: the real package graph, side effects in `domain/*`, package classification, granularity, build and publishing machinery, and a boundary-integrity rating. Read-only. Nothing under `consultations/` was opened.

## 1. Real import graph compared with the documented DAG

### 1.1 Edges in src (from `package.json` deps, checked against actual `import` statements)

| Package (src LOC) | Workspace deps actually imported in src | Third-party deps imported in src |
|---|---|---|
| domain/core (14,586; ~13,411 of it is `src/models` data) | none | `node:crypto` |
| domain/text-layout (41) | none | `string-width` |
| domain/consultation-view (595) | core (`types`, `getters`, `line-semantics`, `casting-derivation`) | none |
| domain/consultation-file (651) | core (root + `types`) | `node:fs/promises`, `node:path`, `node:process`, gray-matter, js-yaml, dayjs (+ utc, timezone) |
| cli/viewer-core (1,478) | core/types, text-layout | ink, react, wrap-ansi, slice-ansi, `node:process` |
| cli/text-grid (531) | core, consultation-view, text-layout | none |
| cli/readout (1,067) | core/types, consultation-view, text-grid, text-layout, viewer-core | ink, react |
| cli/casting-ui (4,625) | core, consultation-file/file, consultation-view, readout, text-grid, viewer-core | ink, react, @inquirer/prompts, `node:process` |
| cli/history-ui (1,568) | core, consultation-file, readout, text-grid, viewer-core | ink, react, `node:fs/promises`, `node:path`, `node:process` |
| cli/playground-ui (1,951) | core, consultation-file, consultation-view, readout, text-grid, text-layout, viewer-core | ink, react, `node:path`, `node:process` |
| cli/shell (1,096) | casting-ui, history-ui, playground-ui, core (incl. `crypto-random`), consultation-view, consultation-file, viewer-core | ink, react |
| cli/test-utils (149) | none (dev-only leaf) | |
| apps/cli (400) | casting-ui, history-ui, playground-ui, shell, core/random-casting, consultation-file, text-grid, viewer-core | `node:fs`, `node:path`, `node:url`, `node:process` |
| cli/cli (0) | **stale directory**: only `dist/`, `.turbo/` and `node_modules/`, with no package.json | |

Findings:
- **No cycles.** Every edge points down. Turbo's `^build` order holds.
- **No undeclared workspace deps in src.** pnpm's strict `node_modules` would make an undeclared one fail at resolution time anyway. That isolation, not lint, is the real enforcer between sibling packages.
- **Declared but unused:** `domain/consultation-view/package.json` declares `@hexagram/text-layout`, but no file in `domain/consultation-view/src` imports it. Both CLAUDE.md and ADR-0022's DAG show this edge, so the docs repeat a phantom edge.
- **Consequence:** no `domain/*` package imports `text-layout`. Its only consumers are cli packages (`cli/viewer-core/src/viewer-layout.ts:1`, `cli/text-grid/src/serialize-markdown.ts:24`, `cli/text-grid/src/ledger-template.ts:4`, readout, playground-ui). It sits in `domain/` with no domain client.
- **No deep imports past `exports`.** I found no `@hexagram/*/src|dist` or cross-package `../../` imports. Every import uses a declared subpath.
- **Test-only edges:** `cli/text-grid` devDepends on `consultation-file`, and UI packages devDepend on `test-utils`. `domain/core/tests/eslint-domain-boundary.test.ts:34,41` mentions `@hexagram/readout` only as string fixtures, so it does not violate the boundary.

### 1.2 Drift between the documents and the code

- CLAUDE.md says consultation-file builds "five entries: index, markdown, frontmatter, file, legacy-converter". The real config has three (`domain/consultation-file/tsdown.config.ts:4`); `markdown` moved to text-grid under ADR-0022.
- CLAUDE.md and ADR-0003 say core has "ten entries". It has eleven, because `sample-casting` was added (`domain/core/tsdown.config.ts:4-16`, `domain/core/package.json` exports).
- CLAUDE.md says `hexagrams.json`/`trigrams.json` are "used at runtime via resolveJsonModule". No src file imports them. Only `domain/core/scripts/generate-json-files.ts:8,12` writes them. The 758 KB JSON is dead at runtime.
- ADR-0002's "Where it's enforced" section still points at `packages/*` and `packages/core/package.json`.
- The ADR-0019 body still says the markdown renderer lives in `domain/consultation-file`. ADR-0022 amends this, but the stale sentence remains.

### 1.3 How `eslint.boundary.js` enforces the domain→cli ban

- `eslint.boundary.js:14-23` lists eight cli package names, including `test-utils` and `text-grid`. `cliBoundaryBans` (`:35-43`) bans each name both as a bare path and as a `name/**` subpath glob. The subpath glob closes the S14 hole where `paths[].name` matches the exact string only.
- `eslint.config.js:110-121` applies the ban to `domain/**/*.{ts,tsx}`, which covers src and tests.
- **Gaps that matter for hexagonal work:**
  1. It is a **denylist of package names, not a purity rule.** `domain/**` may import `node:*`, `ink`, `react`, `wrap-ansi` or `gray-matter` without complaint. The rule's own test asserts that `node:crypto` is allowed (`domain/core/tests/eslint-domain-boundary.test.ts:57-66`).
  2. There is **no layering inside `domain/`.** Nothing stops `core` from importing `consultation-file`; only pnpm deps plus a Turbo cycle error would catch it.
  3. There are **no rules between cli siblings.** For example, readout could import casting-ui, and only package.json/pnpm isolation would stop it.
  4. The domain block replaces the whole `no-restricted-imports` key, so `barrelRootBans` (`eslint.config.js:24-45`) does not apply in `domain/**`. This is harmless today because those packages have no `.` export.
  5. The list of cli names is maintained by hand (`eslint.boundary.js:14`). A new cli package is unbanned until someone adds it.
  6. `tsconfig.base.json` sets `"types": ["node"]` for every package, domain included. The domain therefore compiles against `process`, `Buffer` and the rest of Node's globals with no error.

## 2. Side effects in `domain/*` (browser and purity blockers)

`domain/*/src` contains no `console`, `process.env`, `Date.now`, `new Date` or `Math.random`. What remains:

| # | Location | Effect | Verdict |
|---|---|---|---|
| S1 | `domain/core/src/random-casting.ts:1,28-31` | `node:crypto.randomInt` draws each split; the fused entry points are `generateRandomConsultation` (`:112`), `generateRandomHexagram` (`:93`) and the others | **Driven port `RandomSource`** (`nextPick(min,max)`). The pure algorithm (`performCast`, `makeLineGenerator`) is already entropy-free. One adapter over `globalThis.crypto.getRandomValues` runs in Node 19+ and in browsers. |
| S2 | `domain/core/src/crypto-random.ts:1,11-12` | `node:crypto` float helper; its only consumer is the home-banner animation (`cli/shell/src/animated-banner.tsx:9,49`) | **Accidental.** A UI animation RNG is not oracle knowledge. Move it to the shell, or make it a second method on the same `RandomSource` adapter. |
| S3 | `domain/consultation-file/src/file.ts:1-3,44-46` | `process.cwd()` in `defaultConsultationsDir()` | **Accidental.** ADR-0020 already threads `dir` explicitly; the cwd default is legacy. |
| S4 | `domain/consultation-file/src/file.ts:76-104,110-124` | `fs.mkdir`, `fs.writeFile`, `fs.readFile`; filename policy `consultation-<ts>.md` | **Driven port `ConsultationRepository`** (save/get/list/delete), with an fs adapter now and an IndexedDB adapter later. The id/filename policy belongs to the adapter. |
| S5 | `domain/consultation-file/src/utils-timestamp.ts:10,19` | `dayjs()` reads the wall clock and local timezone | **Driven port `Clock`** (`now(): {instant, offset}`). The formatting stays pure. |
| S6 | `domain/consultation-file/src/utils-timestamp.ts:5-6` | Module-level `dayjs.extend(utc/timezone)`, a global singleton mutation at import time | **Accidental.** It also blocks a `sideEffects:false` declaration. |
| S7 | `domain/consultation-file/src/frontmatter.ts:11` | `gray-matter` runs `require('fs')` (`node_modules/gray-matter/index.js:3`) and `Buffer.from` (`lib/utils.js:36`) | **Accidental, and a browser blocker.** Frontmatter splitting is about 10 lines over js-yaml. |
| S8 | `domain/core/src/sample-casting.ts` (exported as `./sample-casting`) | No I/O, but a test fixture ships as public API | **Accidental.** Move it to a test-support module. |
| S9 | `tsconfig.base.json` `types:["node"]` | Every domain package gets ambient Node types | **Accidental.** Domain packages should use `types: []` with `lib: es2023`. |

Effects outside `domain/` that a hexagonal design must relocate (use-case logic now living in driving adapters):
- `cli/history-ui/src/history-scan.ts:33` (`readdir`), `cli/history-ui/src/history-app.tsx:18-37` (`rerenderOnDisk`: re-render, byte-compare, rewrite) and `:209-214` (`fs.unlink`). Together these are the List, Open+self-heal and Delete use cases plus the fs repository, all inside an Ink package.
- **The "render body, then save" composition is duplicated in 5 places:** `cli/casting-ui/src/viewer.tsx` (with `saveConsultationFile`, `markdownConsultationBody`), `cli/casting-ui/src/log-and-save.ts:1-6`, `cli/playground-ui/src/playground-app.tsx:284-293`, `apps/cli/src/migrate-legacy.ts:33-41`, and `cli/history-ui/src/history-app.tsx:23-35`. One piece of knowledge, "a saved consultation = envelope + Markdown body", has no single home. That is the missing application service.
- `cli/casting-ui/src/viewer-flow.ts:11-12,111-113`: the cast-session state machine is application logic. It stores ANSI `ConsultationSections` in state, and `extractQueryText` recovers the domain query by stripping ANSI from a rendered section. This couples application state to the terminal medium.
- `cli/viewer-core/src/env-policy.ts:65-91` (`process.env`, `isTTY`, `process.exit`) is legitimately driving-adapter code.

## 3. Package classification

| Package | Role | Mixed? |
|---|---|---|
| domain/core | **Domain core (oracle)**, **reference catalogue** (13.4k of 14.6k LOC is data), **driven adapter** (node:crypto RNG), a UI helper (`crypto-random`) and a test fixture (`sample-casting`) | **Yes: four roles** |
| domain/consultation-file | Domain (envelope schema, `castingAbsence`, `casting-replay.ts` validation, pure legacy parse) **plus** driven adapters (fs repository, YAML codec via gray-matter, wall clock) | **Yes: mostly an adapter, filed under domain** |
| domain/consultation-view | **Application read model / presentation model**, not domain. It is aware of its media: `SectionMedium = 'ansi' \| 'markdown'` (`ir.ts:11`), `sectionsForMedium` and a visibility table (`build-view.ts:242-272`), and box-drawing glyph strings (`vocabulary.ts:8-13`) | Leans toward the adapters. A new medium (Typst, HTML) forces an edit here: the "closed union" design means every adapter edits this module, so the dependency points the wrong way. |
| domain/text-layout | **Generic infra** (monospace/CJK width). No domain consumer. | Misfiled: belongs with text-grid |
| cli/text-grid | **Driven/output adapter**: Markdown renderer plus monospace geometry. No Ink and no terminal dependency. | Misfiled under `cli/`. A PWA or REST server that needs Markdown export would have to depend on a "cli" package. |
| cli/viewer-core | Generic infra (terminal UI kit) and env policy | Re-exports a domain type (`utils-validators.ts:4`) |
| cli/readout | Driving-adapter presentation (IR→ANSI, Ink component) | no |
| cli/casting-ui | Driving adapter **plus** application (cast-session reducer, save composition) **plus** a plain Inquirer adapter | **Yes** |
| cli/history-ui | Driving adapter **plus** application (list/open/self-heal/delete) **plus** driven fs adapter | **Yes** |
| cli/playground-ui | Driving adapter **plus** a save use case | Yes, a small part |
| cli/shell | Driving adapter (composition and navigation) | no |
| cli/test-utils | Test infra | no |
| apps/cli | Composition root **plus** the legacy-migration use case with raw fs | Yes |

The project has a medium-neutral layer, which is not the same as a domain core. No package plays the **Application** role, and no **port interface** exists anywhere. I/O is reached by direct import of concrete functions (`saveConsultationFile`, `generateRandomConsultation`).

## 4. Granularity

There are 14 package directories, 13 real ones plus stale `cli/cli`, covering about 28.7k LOC. Without the catalogue data that is about 15k lines of code, so a real package averages around 1.1k LOC. Each package carries its own package.json with a 3-condition exports map, a tsdown config, tsconfig, vitest config and Turbo node. The lint config adds barrel bans, a rendered-width wrapper ban and the boundary list on top.

- **Earning its cost:** the split into core (no deps), consultation-file (no UI) and the UI packages. That split is what lets a REST server or PWA reuse the domain today.
- **Ceremonial:**
  - `text-layout` (41 LOC, four functions) as its own package.
  - `text-grid`, `consultation-view` and `readout` as three packages for one pipeline (IR → monospace → ANSI/MD), about 2.2k LOC.
  - Seven cli packages that ship as one binary and are never consumed apart. Their isolation (ADR-0002's "sibling leaves") could be enforced with folder-level import rules (eslint-plugin-boundaries or dependency-cruiser) at far lower cost.
- **Under-split where it matters:** core fuses oracle with catalogue, and consultation-file fuses domain with adapter. These are exactly the seams hexagonal needs, and both are hidden inside single packages.

### Target module map (hexagonal)

```
domain/
  oracle/        Line, LineState, performCast, makeLineGenerator, casting-derivation,
                 manual-validation, line-semantics, CastingRecord. Port: RandomSource.
                 Zero deps, types: [] (no Node).
  catalogue/     64+8 records, getters. Per-translation entry points or lazy chunks.
                 JSON generator moves to scripts/.
  consultation/  Consultation aggregate {query, hexagram, casting | absenceReason, timestamp},
                 schemaVersion, casting-replay validation, pure legacy-txt parser.
                 Ports: Clock, ConsultationRepository (save/get/list/delete).
application/     use cases: StartCastSession (state machine lifted from viewer-flow.ts,
                 holding domain values, not ANSI), CastRandom, SaveConsultation,
                 ListConsultations, OpenConsultation, DeleteConsultation, MigrateLegacy;
                 ConsultationView read model (IR, no medium union); port
                 ConsultationDocumentRenderer (body for a given format).
adapters/
  driven/
    random-webcrypto      (globalThis.crypto: Node + browser, one adapter)
    clock-system
    repo-fs               (node:fs; filename policy; self-heal rewrite)
    repo-indexeddb        (PWA)
    doc-markdown          (YAML envelope via js-yaml, plus text-grid + text-layout folded in)
    doc-typst
  driving/
    cli                   (one package: viewer-core, readout, casting/history/playground UIs,
                           shell; internal folders guarded by import rules)
    rest                  (Hono or another fetch-API server)
    pwa                   (Vite)
apps/ composition roots: cli bins, rest server, pwa shell (each wires ports to adapters)
```

That gives about 8–10 packages for the core plus adapters. The rule becomes "domain imports nothing but domain; application imports domain; adapters import application and ports". Lint it with an allowlist per layer, plus a `node:*` ban and `types: []` in domain and application.

## 5. Build and publishing machinery for a browser bundle

**Helps:**
- An exports-only map with `import` conditions, no CJS, and `module: preserve` with `moduleResolution: bundler` all suit Vite and esbuild.
- Per-subpath entries allow fine-grained imports.
- The `source` condition lets a Vite PWA consume raw TS with no build step (`resolve.conditions: ['source']`), mirroring `vitest.config.base.ts:32`.

**Hinders:**
1. Every `tsdown.config.ts` sets `platform: 'node'`. Domain packages need `'neutral'` or `'browser'`.
2. `tsconfig.base.json` sets `types:["node"]` and has no DOM lib split, so Node leakage in domain is invisible to `tsc`.
3. `gray-matter` (fs, Buffer), `node:crypto`, `node:fs` and `process` are statically imported in domain entry points.
4. No package.json declares `sideEffects: false`, and `utils-timestamp.ts:5-6` really does have import-time side effects.
5. `getters` pulls all four translations eagerly (`models/hexagrams.ts` imports every text module, about 13k LOC), so any PWA route that names a hexagram ships the whole corpus. A per-language entry point or a dynamic import is needed.
6. `source` is an un-namespaced condition name. Third-party packages in a browser bundle may publish a `source` condition too, and turning it on globally in Vite would resolve their raw sources as well. A namespaced name such as `@hexagram/source` is safer.
7. Exports have no `default` or `browser` fallback. That is fine for modern bundlers, but there is no way to swap a Node adapter for a browser one by condition. Hexagonal ports make that swap unnecessary.

**Turbo:** `test`/`type:check` depend on `^build` (`turbo.json`), even though everything resolves via `source`. This is extra latency rather than a browser concern.

## 6. Boundary integrity rating: 3 / 5

- **For:** acyclic graph, declared deps match imports, zero domain→cli violations, a subpath-proof boundary lint, and no deep imports.
- **Against:**
  - The enforced boundary is a name denylist, not a purity or layering rule.
  - Domain packages contain Node I/O (fs, crypto, cwd, clock) and a Node-only library.
  - No application layer or ports exist. Use-case logic is spread across 5 call sites in Ink packages and the app.
  - consultation-view is aware of the media its adapters render to.
  - text-layout and text-grid are in the wrong buckets.
  - The docs have drifted from the code (entry counts, JSON runtime claim, phantom edge, the stale `cli/cli` directory).
