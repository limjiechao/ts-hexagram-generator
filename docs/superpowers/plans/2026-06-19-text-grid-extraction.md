# `@hexagram/text-grid` Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the monospace text-grid (column geometry, ledger/diagram rendering skeletons, auto-scroll math) and the Markdown body serializer out of `domain/consultation-view` + `domain/consultation-file` into a new Ink-free cli package `@hexagram/text-grid`, making `domain/consultation-view` a genuinely medium-neutral IR and `domain/consultation-file` a purely-canonical envelope owner.

**Architecture:** The decision is recorded in `docs/adr/0022-monospace-text-grid-is-medium-bound.md` and designed in `docs/superpowers/specs/2026-06-19-text-grid-extraction-design.md`. Three commits, each independently green: (1) relocate the Markdown body serializer + flip `saveConsultationFile` to an injected body; (2) move the monospace geometry + skeletons + scroll math; (3) update living docs. The split is dictated by the domain→cli boundary lint (ADR-0019): the ledger/diagram skeletons are consumed by **both** `cli/readout` (legal cli→domain) and the Markdown serializer; once the serializer leaves the domain, the skeletons can follow.

**Tech Stack:** TypeScript (ESM, `.js`-written-`.ts` specifiers), pnpm workspaces, Turborepo, tsdown (build), vitest (test), oxlint + eslint (`@sxzz/eslint-config`), oxfmt (format).

## Global Constraints

- **This is a pure relocation — zero rendered bytes change.** The regression proof is that `pnpm generate-fixtures` produces **no git diff** after each task. If a fixture changes, a move went wrong; stop and fix.
- **Relative imports MUST carry an explicit `.js` extension** (ADR-0004; enforced by eslint `no-restricted-imports`).
- **No barrel files** (ADR/S9): packages expose concrete subpath `exports`, never a root `.`; importing a bare `@hexagram/*` package name is banned.
- **The domain→cli boundary holds** (ADR-0019): no file under `domain/**` (including `tests/` and `scripts/`) may import any `cli/*` package, and `@hexagram/text-grid` joins the ban list.
- **Node `>=24.6.0`; pnpm@10.33.4.** New workspace packages are linked with `pnpm install`.
- Package library code is dependency-free of `ink`/`react` in `text-grid` (it is Ink-free, colour-free).
- Run all commands from the repo root: `/home/user/ts-hexagram-generator`.
- Commit messages follow `capturing-commit-intent` (why, not just what) and end with the two trailer lines used in this repo's commits.

---

## Task 1: Relocate the Markdown body serializer to `cli/text-grid`; inject the saved body

**Why this is one task:** moving the body serializer (`markdown.ts` + `serialize-markdown.ts`) out of the domain forces `saveConsultationFile` to accept an injected body (it can no longer render it), which forces all three save callers + the two manual-render sites to rewire — these cannot compile apart, so they ship together. The ledger/diagram **skeletons** stay in `consultation-view` for now; `text-grid`'s serializer imports them cross-package (legal cli→domain) until Task 2.

**Files:**
- Create: `cli/text-grid/package.json`
- Create: `cli/text-grid/tsconfig.json`
- Create: `cli/text-grid/vitest.config.ts`
- Create: `cli/text-grid/tsdown.config.ts`
- Move (git mv, content unchanged): `domain/consultation-file/src/serialize-markdown.ts` → `cli/text-grid/src/serialize-markdown.ts`
- Move: `domain/consultation-file/src/markdown.ts` → `cli/text-grid/src/markdown.ts`
- Move: `domain/consultation-file/tests/markdown.test.ts` → `cli/text-grid/tests/markdown.test.ts`
- Move: `domain/consultation-file/tests/markdown-sections.test.ts` → `cli/text-grid/tests/markdown-sections.test.ts`
- Move: `domain/consultation-file/tests/fixtures.test.ts` → `cli/text-grid/tests/fixtures.test.ts`
- Move: `domain/consultation-file/tests/fixtures/cases.ts` → `cli/text-grid/tests/fixtures/cases.ts`
- Move: `domain/consultation-file/tests/fixtures/md-body-*.md` (4 files) → `cli/text-grid/tests/fixtures/`
- Move: `domain/consultation-file/tests/fixtures/md-file-*.md` (4 files) → `cli/text-grid/tests/fixtures/`
- Move: `domain/consultation-file/scripts/generate-fixtures.ts` → `cli/text-grid/scripts/generate-fixtures.ts`
- Modify: `domain/consultation-file/src/file.ts` (inject body; drop renderer)
- Modify: `domain/consultation-file/package.json` (drop `./markdown` export, `consultation-view` dep, `generate-fixtures` script)
- Modify: `domain/consultation-file/tsdown.config.ts` (drop `./src/markdown.ts` entry)
- Modify: `domain/consultation-file/tests/file.test.ts` (pass `body`; swap renderer assertion for an injected-body assertion)
- Modify: `domain/consultation-file/tests/recorded-max-rename.test.ts` (pass `body`)
- Modify: `domain/consultation-file/tests/envelope-types.test-d.ts` (add `body` to the two save-param shapes)
- Modify: `domain/consultation-file/tests/legacy-converter.test.ts` (drop the body renderer; frontmatter-only assertions)
- Modify: `cli/casting-ui/src/log-and-save.ts` (inject body)
- Modify: `cli/casting-ui/src/viewer.tsx` (inject body at the save call)
- Modify: `cli/casting-ui/tests/viewer.test.tsx` (strengthen byte-identity with a `body` assertion)
- Modify: `cli/playground-ui/src/playground-app.tsx` (inject body)
- Modify: `cli/history-ui/src/history-app.tsx` (import `markdownConsultationBody` from `text-grid`)
- Modify: `cli/history-ui/tests/history-app.test.tsx` (import from `text-grid`; inject body at its save call)
- Modify: `cli/history-ui/tests/run-history-viewer.test.ts` (import from `text-grid`)
- Modify: `apps/cli/src/migrate-legacy.ts` (import from `text-grid`)
- Modify: `cli/casting-ui/package.json`, `cli/playground-ui/package.json`, `cli/history-ui/package.json`, `apps/cli/package.json` (add `@hexagram/text-grid` dep)
- Modify: `eslint.boundary.js` (add `@hexagram/text-grid` to `cliPackageNames`)
- Modify: `eslint.config.js` (`barrelRootBans`: add a `@hexagram/text-grid` entry)
- Modify: `package.json` (root `generate-fixtures` script → filter `text-grid`, drop `consultation-file`)

**Interfaces:**
- Produces — `cli/text-grid/src/markdown.ts`:
  `export function markdownConsultationBody(query: string, hexagram: Hexagram, casting: CastingRecord | null, absenceReason?: CastingAbsenceReason | null): string` (unchanged signature, new home), reachable at `@hexagram/text-grid/markdown`.
- Produces — `domain/consultation-file/src/file.ts`:
  `SaveConsultationParams` gains a required `body: string`; `saveConsultationFile(params): Promise<string>` writes `params.body` verbatim into the frontmatter envelope (no longer renders it).
- Consumes — `@hexagram/consultation-file/frontmatter` (`serializeFrontmatter`, `CURRENT_SCHEMA_VERSION`), `@hexagram/consultation-view/build-view` (`buildConsultationView`), `@hexagram/core/types`, `@hexagram/core/sample-casting`.

---

- [ ] **Step 1: Scaffold the `cli/text-grid` package config**

Create `cli/text-grid/package.json`:

```json
{
  "name": "@hexagram/text-grid",
  "type": "module",
  "version": "0.0.0",
  "description": "Medium-bound monospace text-grid renderer: column geometry, the ledger/diagram rendering skeletons, the auto-scroll row math, and the Markdown body serializer of the consultation-view IR",
  "license": "MIT",
  "exports": {
    "./markdown": {
      "source": "./src/markdown.ts",
      "types": "./dist/markdown.d.mts",
      "import": "./dist/markdown.mjs"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsdown",
    "generate-fixtures": "tsx scripts/generate-fixtures.ts",
    "test": "cross-env FORCE_COLOR=1 vitest run --passWithNoTests",
    "type:check": "tsc --noEmit"
  },
  "dependencies": {
    "@hexagram/consultation-view": "workspace:*",
    "@hexagram/core": "workspace:*",
    "@hexagram/text-layout": "workspace:*"
  },
  "devDependencies": {
    "@hexagram/consultation-file": "workspace:*"
  }
}
```

Create `cli/text-grid/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "tests"]
}
```

Create `cli/text-grid/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

import { extendVitestBaseConfig } from '../../vitest.config.base.js'

export default extendVitestBaseConfig(defineConfig({}))
```

Create `cli/text-grid/tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/markdown.ts'],
  platform: 'node',
})
```

- [ ] **Step 2: Move the Markdown serializer source into the package (content unchanged)**

Run (preserves history; imports inside still resolve cross-package cli→domain):

```bash
mkdir -p cli/text-grid/src
git mv domain/consultation-file/src/serialize-markdown.ts cli/text-grid/src/serialize-markdown.ts
git mv domain/consultation-file/src/markdown.ts cli/text-grid/src/markdown.ts
```

Do NOT edit their contents in this task. `serialize-markdown.ts` keeps importing the skeletons from `@hexagram/consultation-view/*` (legal from cli); `markdown.ts` keeps `import { serializeConsultationMarkdownBody } from './serialize-markdown.js'`.

- [ ] **Step 3: Move the body fixtures, their cases, the fixture tests, and the generate script**

```bash
mkdir -p cli/text-grid/tests/fixtures cli/text-grid/scripts
git mv domain/consultation-file/tests/fixtures/cases.ts cli/text-grid/tests/fixtures/cases.ts
git mv domain/consultation-file/tests/fixtures/md-body-no-moving.md cli/text-grid/tests/fixtures/md-body-no-moving.md
git mv domain/consultation-file/tests/fixtures/md-body-one-moving.md cli/text-grid/tests/fixtures/md-body-one-moving.md
git mv domain/consultation-file/tests/fixtures/md-body-multi-moving.md cli/text-grid/tests/fixtures/md-body-multi-moving.md
git mv domain/consultation-file/tests/fixtures/md-body-empty-query.md cli/text-grid/tests/fixtures/md-body-empty-query.md
git mv domain/consultation-file/tests/fixtures/md-file-no-moving.md cli/text-grid/tests/fixtures/md-file-no-moving.md
git mv domain/consultation-file/tests/fixtures/md-file-one-moving.md cli/text-grid/tests/fixtures/md-file-one-moving.md
git mv domain/consultation-file/tests/fixtures/md-file-multi-moving.md cli/text-grid/tests/fixtures/md-file-multi-moving.md
git mv domain/consultation-file/tests/fixtures/md-file-empty-query.md cli/text-grid/tests/fixtures/md-file-empty-query.md
git mv domain/consultation-file/tests/markdown.test.ts cli/text-grid/tests/markdown.test.ts
git mv domain/consultation-file/tests/markdown-sections.test.ts cli/text-grid/tests/markdown-sections.test.ts
git mv domain/consultation-file/tests/fixtures.test.ts cli/text-grid/tests/fixtures.test.ts
git mv domain/consultation-file/scripts/generate-fixtures.ts cli/text-grid/scripts/generate-fixtures.ts
```

`cases.ts`, `markdown.test.ts`, and `markdown-sections.test.ts` need **no** content edits — their relative imports (`../src/markdown.js`, `../src/serialize-markdown.js`, `@hexagram/core/*`, `@hexagram/consultation-view/*`) all resolve correctly from the new location.

- [ ] **Step 4: Fix the cross-package imports in the moved generate script and full-file fixture test**

These two referenced `../src/frontmatter.js` (a `consultation-file` internal). From `text-grid` that is now an external package subpath.

In `cli/text-grid/scripts/generate-fixtures.ts`, replace:

```ts
import { serializeFrontmatter } from '../src/frontmatter.js'
```

with:

```ts
import { serializeFrontmatter } from '@hexagram/consultation-file/frontmatter'
```

(The other imports — `../src/markdown.js`, `../tests/fixtures/cases.js` — stay; they are now in-package.)

In `cli/text-grid/tests/fixtures.test.ts`, replace:

```ts
import { serializeFrontmatter } from '../src/frontmatter.js'
```

with:

```ts
import { serializeFrontmatter } from '@hexagram/consultation-file/frontmatter'
```

- [ ] **Step 5: Flip `saveConsultationFile` to an injected body**

In `domain/consultation-file/src/file.ts`:

1. Delete the import `import { markdownConsultationBody } from './markdown.js'` (line 19).
2. Add `body: string` to the base of `SaveConsultationParams` and document it. Replace the type block:

```ts
export type SaveConsultationParams = {
  query: string
  hexagram: Hexagram
  /**
   * The pre-rendered Markdown body. Opaque to the domain: it is produced by the
   * medium-bound `@hexagram/text-grid` renderer at the cli edge and written
   * verbatim, symmetric with `loadConsultationFile` (which returns the body as
   * opaque disk bytes). The domain owns only the canonical YAML envelope
   * (ADR-0022).
   */
  body: string
  dir?: string
} & (
  | { casting: CastingRecord; castingAbsence?: never }
  | { casting: null; castingAbsence: CastingAbsenceReason }
)
```

3. In `saveConsultationFile`, delete the `const body = markdownConsultationBody(...)` block (lines 85–90) and use `params.body`. The `presence` narrowing stays (the envelope still needs it). The `serializeFrontmatter` call becomes:

```ts
  const text = serializeFrontmatter(
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: getIsoTimestamp(),
      query: params.query,
      hexagram: params.hexagram,
      ...presence,
    },
    params.body,
  )
```

- [ ] **Step 6: Strip the body renderer from `consultation-file`'s package config**

In `domain/consultation-file/package.json`:
- Remove the `"./markdown": { ... }` block from `exports`.
- Remove `"@hexagram/consultation-view": "workspace:*"` from `dependencies`.
- Remove the `"generate-fixtures": "tsx scripts/generate-fixtures.ts"` script.

In `domain/consultation-file/tsdown.config.ts`, remove `'./src/markdown.ts'` from `entry` (leaving `frontmatter`, `file`, `legacy-converter`).

- [ ] **Step 7: Update the domain tests that called `saveConsultationFile` or the body renderer**

In `domain/consultation-file/tests/file.test.ts`, add `body` to all four `saveConsultationFile` calls and replace the one body-content assertion (it is now a renderer concern, covered in `text-grid`). For the round-trip cases pass a sentinel and assert it is written verbatim:

- First call (line ~44, "Will it rain?"): add `body: 'BODY-MARKER'` after `dir: tmpDir,`.
- Second call (line ~61, null casting): add `body: '## CASTING\n\n_Casting not recorded._\n'` after `castingAbsence: 'playground',`. Then replace the assertion `expect(text).toContain('_Casting not recorded')` with `expect(text).toContain('_Casting not recorded._')` (now asserting the injected body landed, not that the domain rendered it). Keep the `expect(text).not.toMatch(/^casting:/m)` frontmatter assertion.
- Third call (line ~81, reason): add `body: 'BODY-MARKER'` after `castingAbsence: 'playground',`.
- Fourth call (line ~102, present casting): add `body: 'BODY-MARKER'` after `dir: tmpDir,`.

In `domain/consultation-file/tests/recorded-max-rename.test.ts`, add `body: 'BODY-MARKER'` to both `saveConsultationFile` calls (after `dir: tmpDir,`). No assertion changes — both tests inspect frontmatter, which is unaffected by the body.

In `domain/consultation-file/tests/envelope-types.test-d.ts`, add `body: string` to the two save-param shapes so they isolate the casting/absence dimension. Replace the object at lines 54–58:

```ts
expectTypeOf<{
  query: string
  hexagram: Hexagram
  body: string
  casting: null
}>().not.toExtend<SaveConsultationParams>()
```

and the object at lines 61–66:

```ts
expectTypeOf<{
  query: string
  hexagram: Hexagram
  body: string
  casting: CastingRecord
  castingAbsence: CastingAbsenceReason
}>().not.toExtend<SaveConsultationParams>()
```

In `domain/consultation-file/tests/legacy-converter.test.ts`, drop the cli renderer. Remove the import `import { markdownConsultationBody } from '../src/markdown.js'` (line 14) and rewrite the `converted → md round-trips through serialize` block (lines 194–231) to assert only the converter + frontmatter concerns, passing an empty body:

```ts
describe('converted → md round-trips through serialize', () => {
  it('produces a parseable .md envelope with a casting key for a recovered casting', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-split-casting.txt'),
      filenameTimestamp: '2026-05-15T12-07-00+0800',
    })
    if (!result.ok) throw new Error(result.reason)
    const { envelope } = result
    expect(envelope.casting).not.toBeNull()
    const md = serializeFrontmatter(envelope, '')
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toMatch(/^casting:/m)
  })

  it('omits the casting key for a no-casting file', () => {
    const result = convertLegacyTxt({
      text: read('legacy-real-oldest-no-casting.txt'),
      filenameTimestamp: '2025-06-10T04-09-02+0800',
    })
    if (!result.ok) throw new Error(result.reason)
    const { envelope } = result
    expect(envelope.casting).toBeNull()
    const md = serializeFrontmatter(envelope, '')
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).not.toMatch(/^casting:/m)
  })
})
```

- [ ] **Step 8: Rewire the body consumers (cli/app) to render + inject**

In `cli/casting-ui/src/log-and-save.ts`, add the import after the existing `@hexagram/...` imports:

```ts
import { markdownConsultationBody } from '@hexagram/text-grid/markdown'
```

and add `body` to the save call:

```ts
  const filePath = await saveConsultationFile({
    query: question,
    hexagram,
    casting,
    dir: consultationsDir,
    body: markdownConsultationBody(question, hexagram, casting),
  })
```

In `cli/casting-ui/src/viewer.tsx`, add the import (near the existing `@hexagram/consultation-file/file` import):

```ts
import { markdownConsultationBody } from '@hexagram/text-grid/markdown'
```

and add `body` to the save call (~line 356):

```ts
        const savedPath = await saveConsultationFile({
          query: state.query,
          hexagram,
          casting,
          dir: consultationsDir,
          body: markdownConsultationBody(state.query, hexagram, casting),
        })
```

In `cli/playground-ui/src/playground-app.tsx`, add the import (near the existing `@hexagram/consultation-file/file` import):

```ts
import { markdownConsultationBody } from '@hexagram/text-grid/markdown'
```

and add `body` to the params object (~line 283), threading the absence reason since this is a `casting: null` save:

```ts
      const params: Parameters<typeof saveConsultationFile>[0] = {
        query,
        hexagram: state.lines,
        casting: null,
        // The playground explores lines without a real yarrow cast.
        castingAbsence: 'playground',
        body: markdownConsultationBody(query, state.lines, null, 'playground'),
      }
```

- [ ] **Step 9: Point the two manual-render sites + their tests at `text-grid`**

In `cli/history-ui/src/history-app.tsx`, change line 9:

```ts
import { markdownConsultationBody } from '@hexagram/text-grid/markdown'
```

In `apps/cli/src/migrate-legacy.ts`, change line 7:

```ts
import { markdownConsultationBody } from '@hexagram/text-grid/markdown'
```

In `cli/history-ui/tests/run-history-viewer.test.ts`, change line 6:

```ts
import { markdownConsultationBody } from '@hexagram/text-grid/markdown'
```

In `cli/history-ui/tests/history-app.test.tsx`: change line 13 to import from `@hexagram/text-grid/markdown`, and add `body` to the `saveConsultationFile` call (~line 362). It is a `casting: null` / `castingAbsence: 'playground'` save (see the test's comment); render with the reason:

```ts
    const filePath = await saveConsultationFile({
      // ...existing query/hexagram/casting:null/castingAbsence:'playground'/dir...
      body: markdownConsultationBody(/* query */, /* hexagram */, null, 'playground'),
    })
```

Use the exact `query` and `hexagram` already present in that call site for the `markdownConsultationBody` arguments.

- [ ] **Step 10: Strengthen the byte-identity gate with the body**

In `cli/casting-ui/tests/viewer.test.tsx`, extend the captured-arg types and the final assertions so the injected body is part of the invariant. Change both capture casts (lines ~1900–1904 and ~1947–1951) from `[{ query: string; hexagram: Hexagram; casting: CastingRecord }]` to `[{ query: string; hexagram: Hexagram; casting: CastingRecord; body: string }]`, and add after line 1961:

```ts
    expect(manualArgs?.body).toBe(interactiveArgs?.body)
```

- [ ] **Step 11: Add `@hexagram/text-grid` deps + boundary entry + root script**

Add `"@hexagram/text-grid": "workspace:*"` to `dependencies` in: `cli/casting-ui/package.json`, `cli/playground-ui/package.json`, `cli/history-ui/package.json`, `apps/cli/package.json`.

In `eslint.boundary.js`, add `'@hexagram/text-grid'` to the `cliPackageNames` array and change the comment `// The seven cli/* package names (ADR-0019).` to `// The eight cli/* package names (ADR-0019).`

In `eslint.config.js`, add an entry to `barrelRootBans` (after the `@hexagram/readout` entry):

```js
  {
    name: '@hexagram/text-grid',
    message:
      'Import the concrete subpath — @hexagram/text-grid/{markdown,geometry,ledger-template,diagram-template,scroll-geometry} — not the bare package; it has no root barrel (S9, no-barrel-files).',
  },
```

In the root `package.json`, change the `generate-fixtures` script to:

```json
    "generate-fixtures": "turbo run generate-fixtures --filter=@hexagram/casting-ui --filter=@hexagram/text-grid"
```

- [ ] **Step 12: Install, then verify the whole task**

```bash
pnpm install
```
Expected: `@hexagram/text-grid` linked; lockfile updates.

```bash
pnpm generate-fixtures && git status --porcelain cli/text-grid/tests/fixtures
```
Expected: **no output** from `git status` (fixtures regenerate byte-identically in their new home).

```bash
pnpm type:check && pnpm lint:check && pnpm format:check && pnpm test
```
Expected: all pass. In particular `domain/core/tests/eslint-domain-boundary.test.ts` now also asserts `@hexagram/text-grid` is banned (it loops `cliPackageNames`), and the `cli/casting-ui` byte-identity test passes with the new `body` assertion.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(text-grid): relocate the Markdown body serializer; inject the saved body

Per ADR-0022, the saved .md body is a medium-bound monospace rendering, not
domain knowledge. Move markdownConsultationBody + its IR→Markdown serializer
out of domain/consultation-file into the new Ink-free cli package
@hexagram/text-grid, and change saveConsultationFile to take the body as
injected text (symmetric with load, which already treats the body as opaque
bytes). consultation-file now owns only the canonical YAML envelope and drops
its consultation-view dependency. Pure relocation — fixtures regenerate
byte-identically.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DpUzh5X7kri8pZbMYdWZta
EOF
)"
```

---

## Task 2: Move the monospace geometry + ledger/diagram skeletons + auto-scroll math to `cli/text-grid`

**Why:** with the Markdown serializer already in `text-grid` (Task 1), the only remaining consumers of the skeletons/geometry are cli packages (`readout`, `playground-ui`, `casting-ui`) plus `text-grid`'s own serializer — all able to import `text-grid`. So the skeletons can leave the domain. After this, `domain/consultation-view` holds only the semantic IR + the glyph vocabulary + the (internal) `buildLedgerRows`.

**Files:**
- Create: `cli/text-grid/src/geometry.ts` (the geometry consts split out of `consultation-view/vocabulary.ts`)
- Create: `cli/text-grid/src/scroll-geometry.ts` (the scroll math split out of `consultation-view/ledger-geometry.ts`)
- Move: `domain/consultation-view/src/ledger-template.ts` → `cli/text-grid/src/ledger-template.ts`
- Move: `domain/consultation-view/src/diagram-template.ts` → `cli/text-grid/src/diagram-template.ts`
- Move (rename): `domain/consultation-view/src/ledger-geometry.ts` → `domain/consultation-view/src/ledger-rows.ts` (keep only `buildLedgerRows`)
- Modify: `domain/consultation-view/src/vocabulary.ts` (remove the geometry consts; keep the glyph vocabulary)
- Modify: `domain/consultation-view/src/build-view.ts` (import `buildLedgerRows` from `./ledger-rows.js`)
- Modify: `domain/consultation-view/src/ir.ts` (update the stale auto-scroll comment)
- Modify: `domain/consultation-view/package.json` (drop `diagram-template`/`ledger-template`/`ledger-geometry` exports)
- Modify: `domain/consultation-view/tsdown.config.ts` (entries: `build-view`, `ir`, `vocabulary`)
- Modify: `cli/text-grid/src/serialize-markdown.ts` (skeleton/geometry imports → local `./`)
- Modify: `cli/text-grid/package.json` (add the four new subpath exports)
- Modify: `cli/text-grid/tsdown.config.ts` (add the four new entries)
- Modify: `cli/readout/src/serialize-ansi.ts` (skeleton/geometry imports → `text-grid`)
- Modify: `cli/readout/package.json` (add `@hexagram/text-grid` dep)
- Modify: `cli/readout/tests/casting-ledger.test.ts` (scroll imports → `text-grid`)
- Modify: `cli/playground-ui/src/playground-display-rows.ts` (imports → `text-grid`)
- Modify: `cli/playground-ui/src/playground-display-geometry.ts` (imports → `text-grid`)
- Modify: `cli/playground-ui/tests/playground-display.test.ts` (import → `text-grid`)
- Modify: `cli/playground-ui/tests/top-half-width-invariant.test.ts` (import → `text-grid`)
- Modify: `cli/casting-ui/src/viewer.tsx` (scroll import → `text-grid`)
- Modify: `eslint.config.js` (`barrelRootBans` `@hexagram/readout` message: geometry now at `@hexagram/text-grid/scroll-geometry`)

**Interfaces:**
- Produces — `@hexagram/text-grid/geometry`: `LEDGER_COLUMNS`, `LedgerColumnKey`, `RIGHT_COLUMN`, `MOVING_ARROW`, `STATIC_GAP`, `TRIGRAM_DIVIDER_WIDTH`.
- Produces — `@hexagram/text-grid/ledger-template`: `ledgerBlock(rows, style)`, `LedgerStyle`.
- Produces — `@hexagram/text-grid/diagram-template`: `transformationHalfRow`, `transformationRow`, `hexagramDiagramRowStrings`, `DecorateCell`, `DecorateRow`, `DiagramImagery`.
- Produces — `@hexagram/text-grid/scroll-geometry`: `castingTableActiveRow(lineIndex)`, `castingTableFollowRow(lineIndex)`, `CASTING_HEADER_ROWS`, `CASTING_ROWS_PER_BLOCK`, `CAST1_OFFSET_IN_BLOCK`.
- Stays — `@hexagram/consultation-view/vocabulary`: `LINE_GLYPH`, `POSITION_LABELS`, `LINE_LABELS` (glyphs only).
- Stays internal — `domain/consultation-view/src/ledger-rows.ts`: `buildLedgerRows` (consumed by `build-view.ts`; not a public subpath).

---

- [ ] **Step 1: Create `cli/text-grid/src/geometry.ts`**

```ts
// Monospace text-grid geometry (medium-bound). These are TERMINAL character-cell
// measurements: column widths tuned so the casting ledger fits the 120-col
// default wrap (111 visual columns), and the fixed-width inter-column connectors
// for the transformation/hexagram diagrams. They render correctly only in a
// monospace font where one glyph is one cell; an HTML host lays the table out
// with CSS instead (ADR-0022). Moved verbatim from the former consultation-view
// vocabulary; the bytes are load-bearing for fixture parity.

// Column layout for the enumerated casting ledger. 18 rows × 12 right-aligned
// cells under a two-level header (左Left / 右Right banners span their
// sub-columns). Header names fuse plain English with classical glosses,
// compact so the content fits the 120-col default wrap (111 visual columns).
export const LEDGER_COLUMNS = [
  { key: 'line', header: '爻Line', width: 6 },
  { key: 'cast', header: '變Cast', width: 6 },
  { key: 'stalks', header: '蓍Stalks', width: 8 },
  { key: 'leftHeap', header: '左Heap', width: 6 },
  { key: 'leftPiles', header: '揲Fours', width: 7 },
  { key: 'leftRemainder', header: '扐Odd', width: 5 },
  { key: 'rightHeap', header: '右Heap', width: 6 },
  { key: 'rightPiles', header: '揲Fours', width: 7 },
  { key: 'held', header: '掛Held', width: 6 },
  { key: 'rightRemainder', header: '扐Odd', width: 5 },
  { key: 'setAside', header: '歸奇Aside', width: 9 },
  { key: 'sigma', header: '營Tally', width: 7 },
] as const

export type LedgerColumnKey = (typeof LEDGER_COLUMNS)[number]['key']

// Transformation / hexagram-diagram geometry (terminal columns; ANSI is
// zero-width). RIGHT_COLUMN is where the emerging column starts; MOVING_ARROW
// / STATIC_GAP are the 19-col inter-column connectors.
export const RIGHT_COLUMN = 46
/** 19-col inter-column connector for moving lines: 17×─ + ▶ + 1 space. */
export const MOVING_ARROW = '─────────────────▶ '
/** 19-col blank gap for static lines (matches `MOVING_ARROW` width). */
export const STATIC_GAP = '                   '
/** Width of the per-side bar block, reused as the trigram divider width. */
export const TRIGRAM_DIVIDER_WIDTH = 25
```

- [ ] **Step 2: Create `cli/text-grid/src/scroll-geometry.ts`**

```ts
// Casting-table auto-follow scroll math (medium-bound). Terminal-viewport ROW
// counts for the live Ink casting table's auto-scroll — consumed by the viewer
// (the in-flight table) and the ANSI readout (the bottom-align offset). Row
// counts, not bytes; moved from the former consultation-view ledger-geometry as
// part of the monospace render layer (ADR-0022).
export const CASTING_HEADER_ROWS = 5 // "CASTING:", blank, banner, header, rule
export const CASTING_ROWS_PER_BLOCK = 4 // cast3, cast2, cast1, blockRule
export const CAST1_OFFSET_IN_BLOCK = 2 // cast-1 row, from the block top

export function castingTableActiveRow(lineIndex: number): number {
  const blockTop =
    CASTING_HEADER_ROWS + (5 - lineIndex) * CASTING_ROWS_PER_BLOCK
  return blockTop + CAST1_OFFSET_IN_BLOCK
}

export function castingTableFollowRow(lineIndex: number): number {
  return castingTableActiveRow(Math.max(0, lineIndex - 1))
}
```

- [ ] **Step 3: Move the two skeletons into the package**

```bash
git mv domain/consultation-view/src/ledger-template.ts cli/text-grid/src/ledger-template.ts
git mv domain/consultation-view/src/diagram-template.ts cli/text-grid/src/diagram-template.ts
```

In `cli/text-grid/src/ledger-template.ts`, change the two import statements at the top:

```ts
import type { LedgerRow } from '@hexagram/consultation-view/ir'
import { LEDGER_COLUMNS } from './geometry.js'
import { LINE_LABELS } from '@hexagram/consultation-view/vocabulary'
```

(Replacing `import type { LedgerRow } from './ir.js'` and `import { LEDGER_COLUMNS, LINE_LABELS } from './vocabulary.js'`. Keep the `@hexagram/text-layout` and `@hexagram/core/casting-derivation` imports as-is.)

In `cli/text-grid/src/diagram-template.ts`, change the top imports:

```ts
import type { Line } from '@hexagram/core/types'

import type { DiagramLineRow } from '@hexagram/consultation-view/ir'
import { LINE_GLYPH, POSITION_LABELS } from '@hexagram/consultation-view/vocabulary'
import { MOVING_ARROW, STATIC_GAP } from './geometry.js'
```

(Replacing the former `./ir.js` and the four-symbol `./vocabulary.js` import; `LINE_GLYPH`/`POSITION_LABELS` stay in `consultation-view/vocabulary`, `MOVING_ARROW`/`STATIC_GAP` are now local.)

- [ ] **Step 4: Split `ledger-geometry.ts` → `ledger-rows.ts` (domain keeps only `buildLedgerRows`)**

```bash
git mv domain/consultation-view/src/ledger-geometry.ts domain/consultation-view/src/ledger-rows.ts
```

Edit `domain/consultation-view/src/ledger-rows.ts` to remove the scroll-math block (the `CASTING_HEADER_ROWS`/`CASTING_ROWS_PER_BLOCK`/`CAST1_OFFSET_IN_BLOCK` consts and the `castingTableActiveRow`/`castingTableFollowRow` functions — old lines 10–23), leaving the imports and `buildLedgerRows`. Final content:

```ts
import { deriveSplit } from '@hexagram/core/casting-derivation'
import {
  POSITIONS_TOP_FIRST,
  type LineIndex,
  type PartialCastingRecord,
} from '@hexagram/core/types'

import type { LedgerRow } from './ir.js'

// Build the 18 ledger rows from a (partial) casting record. Lines top→bottom
// are 6→1; within a block casts are reversed (cast 3 top, cast 1 bottom); the
// line label shows on the block-top (cast-3) row only; every block but the
// last carries a trailing rule.
export function buildLedgerRows(
  casting: PartialCastingRecord,
): readonly LedgerRow[] {
  // Top-first line numbers (6 → 1) paired with their bottom-first casting cell
  // (`casting[lineNumber - 1]`) — the same flip the diagram rows use.
  const lineOrder = POSITIONS_TOP_FIRST.map(
    (lineNumber) =>
      [lineNumber, casting[(lineNumber - 1) as LineIndex]] as const,
  )
  const rows: LedgerRow[] = []
  for (const [blockIndex, [lineNumber, lineCasting]] of lineOrder.entries()) {
    const [cast1, cast2, cast3] = lineCasting
    const last = blockIndex === lineOrder.length - 1
    const cell = (s: (typeof lineCasting)[number]) =>
      s === null ? null : deriveSplit(s)
    rows.push(
      {
        lineNumber,
        castNumber: 3,
        showLine: true,
        trailingRule: false,
        cell: cell(cast3),
      },
      {
        lineNumber,
        castNumber: 2,
        showLine: false,
        trailingRule: false,
        cell: cell(cast2),
      },
      {
        lineNumber,
        castNumber: 1,
        showLine: false,
        trailingRule: !last,
        cell: cell(cast1),
      },
    )
  }
  return rows
}
```

In `domain/consultation-view/src/build-view.ts`, change line 27:

```ts
import { buildLedgerRows } from './ledger-rows.js'
```

- [ ] **Step 5: Remove the geometry consts from `consultation-view/vocabulary.ts`**

Edit `domain/consultation-view/src/vocabulary.ts`: delete everything from the comment `// Column layout for the enumerated casting ledger.` through the end of the file (the `LEDGER_COLUMNS` const, the `LedgerColumnKey` type, and the `RIGHT_COLUMN`/`MOVING_ARROW`/`STATIC_GAP`/`TRIGRAM_DIVIDER_WIDTH` block). The file must end with the `LINE_LABELS` const (its closing `} as const`). The remaining exports are `LINE_GLYPH`, `POSITION_LABELS`, `LINE_LABELS`.

- [ ] **Step 6: Update the stale auto-scroll comment in `ir.ts`**

In `domain/consultation-view/src/ir.ts`, the `ConsultationView` doc comment (lines ~150–158) claims the auto-scroll geometry "lives in `ledger-geometry.ts`". Replace that trailing sentence so it reads:

```ts
 * "Medium-neutral" means the IR emits NO ANSI/Markdown bytes: section and row
 * STRUCTURE (order, `showLine`/`trailingRule`, cell presence) is shared; glyphs,
 * colour and padding are each serializer's job. The monospace character-cell
 * geometry and the casting table's auto-scroll row-math are NOT here — they are
 * medium-bound and live in `@hexagram/text-grid` (ADR-0022).
```

- [ ] **Step 7: Switch `text-grid/serialize-markdown.ts` to the local skeletons**

In `cli/text-grid/src/serialize-markdown.ts`, change the three skeleton/geometry imports from `@hexagram/consultation-view/*` to local:

```ts
import {
  hexagramDiagramRowStrings,
  transformationRow,
} from './diagram-template.js'
```
```ts
import { ledgerBlock, type LedgerStyle } from './ledger-template.js'
import { RIGHT_COLUMN } from './geometry.js'
```

(The `sectionsForMedium` import from `@hexagram/consultation-view/build-view` and the IR-type import from `@hexagram/consultation-view/ir` stay; `@hexagram/text-layout`'s `padToColumn` stays.)

- [ ] **Step 8: Publish the new `text-grid` subpaths**

In `cli/text-grid/package.json`, add these four blocks to `exports` (alongside `./markdown`), keeping keys sorted:

```json
    "./diagram-template": {
      "source": "./src/diagram-template.ts",
      "types": "./dist/diagram-template.d.mts",
      "import": "./dist/diagram-template.mjs"
    },
    "./geometry": {
      "source": "./src/geometry.ts",
      "types": "./dist/geometry.d.mts",
      "import": "./dist/geometry.mjs"
    },
    "./ledger-template": {
      "source": "./src/ledger-template.ts",
      "types": "./dist/ledger-template.d.mts",
      "import": "./dist/ledger-template.mjs"
    },
    "./scroll-geometry": {
      "source": "./src/scroll-geometry.ts",
      "types": "./dist/scroll-geometry.d.mts",
      "import": "./dist/scroll-geometry.mjs"
    },
```

In `cli/text-grid/tsdown.config.ts`, list all five entries:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/diagram-template.ts',
    './src/geometry.ts',
    './src/ledger-template.ts',
    './src/markdown.ts',
    './src/scroll-geometry.ts',
  ],
  platform: 'node',
})
```

- [ ] **Step 9: Shrink `consultation-view`'s public surface**

In `domain/consultation-view/package.json`, remove the `./diagram-template`, `./ledger-geometry`, and `./ledger-template` blocks from `exports` (leaving `./build-view`, `./ir`, `./vocabulary`, `./package.json`).

In `domain/consultation-view/tsdown.config.ts`, set `entry` to:

```ts
  entry: ['./src/build-view.ts', './src/ir.ts', './src/vocabulary.ts'],
```

- [ ] **Step 10: Rewire the cli consumers of the skeletons/geometry**

In `cli/readout/src/serialize-ansi.ts`:
- `import { hexagramDiagramRowStrings, transformationRow } from '@hexagram/consultation-view/diagram-template'` → `from '@hexagram/text-grid/diagram-template'`
- `import { ledgerBlock, type LedgerStyle } from '@hexagram/consultation-view/ledger-template'` → `from '@hexagram/text-grid/ledger-template'`
- `import { RIGHT_COLUMN, TRIGRAM_DIVIDER_WIDTH } from '@hexagram/consultation-view/vocabulary'` → `from '@hexagram/text-grid/geometry'`

In `cli/readout/package.json`, add `"@hexagram/text-grid": "workspace:*"` to `dependencies`.

In `cli/readout/tests/casting-ledger.test.ts`, change the import (lines 5–7) of `castingTableActiveRow, castingTableFollowRow` from `@hexagram/consultation-view/ledger-geometry` → `@hexagram/text-grid/scroll-geometry`.

In `cli/playground-ui/src/playground-display-rows.ts`:
- line 1: `from '@hexagram/consultation-view/diagram-template'` → `from '@hexagram/text-grid/diagram-template'`
- lines 2–5: `import { MOVING_ARROW, STATIC_GAP } from '@hexagram/consultation-view/vocabulary'` → `from '@hexagram/text-grid/geometry'`

In `cli/playground-ui/src/playground-display-geometry.ts` (lines 5–8): `import { MOVING_ARROW, TRIGRAM_DIVIDER_WIDTH } from '@hexagram/consultation-view/vocabulary'` → `from '@hexagram/text-grid/geometry'`

In `cli/playground-ui/tests/playground-display.test.ts`: `import { TRIGRAM_DIVIDER_WIDTH } from '@hexagram/consultation-view/vocabulary'` → `from '@hexagram/text-grid/geometry'`

In `cli/playground-ui/tests/top-half-width-invariant.test.ts`: `import { MOVING_ARROW } from '@hexagram/consultation-view/vocabulary'` → `from '@hexagram/text-grid/geometry'`

In `cli/casting-ui/src/viewer.tsx` (line 2): `import { castingTableFollowRow } from '@hexagram/consultation-view/ledger-geometry'` → `from '@hexagram/text-grid/scroll-geometry'`

(`cli/playground-ui` and `cli/casting-ui` already gained the `@hexagram/text-grid` dep in Task 1.)

- [ ] **Step 11: Fix the stale lint message**

In `eslint.config.js`, in the `barrelRootBans` `@hexagram/readout` entry, update the trailing sentence of `message` from `Casting-table row geometry lives at @hexagram/consultation-view/ledger-geometry (S9, no-barrel-files).` to `Casting-table row geometry lives at @hexagram/text-grid/scroll-geometry (S9, no-barrel-files).`

- [ ] **Step 12: Install, then verify the whole task**

```bash
pnpm install
```

```bash
pnpm generate-fixtures && git status --porcelain cli/text-grid/tests/fixtures
```
Expected: **no output** (still byte-identical).

```bash
pnpm type:check && pnpm lint:check && pnpm format:check && pnpm test
```
Expected: all pass. No `domain/**` file imports any `cli/*` package (the boundary lint + `eslint-domain-boundary.test.ts` are green), and the `readout`/`playground` skeleton tests pass against the new homes.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(text-grid): move the monospace geometry, skeletons & scroll math

Per ADR-0022, the column-cell geometry, the ledger/diagram rendering
skeletons, and the casting-table auto-scroll row-math are medium-bound (they
render only in a monospace grid). Move them from domain/consultation-view into
@hexagram/text-grid; consultation-view now holds only the semantic IR, the
glyph vocabulary, and the internal buildLedgerRows. Rewire the cli consumers
(readout, playground-ui, viewer) to the new homes. Pure relocation — fixtures
regenerate byte-identically.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DpUzh5X7kri8pZbMYdWZta
EOF
)"
```

---

## Task 3: Update the living docs

**Why:** the repo's docs are the standing theory. `CLAUDE.md`/`AGENTS.md`/`CONTEXT.md` describe the package layout, the DAG, and where the IR/geometry live; they must name `@hexagram/text-grid` and correct the `consultation-view`/`consultation-file` descriptions. (ADR-0022, its README index row, and the 0018/0019 amendments were written in the prior planning step.)

**Files:**
- Modify: `CLAUDE.md` (repo layout tree; `## Architecture` consultation-view/consultation-file descriptions; the DAG sentence)
- Modify: `AGENTS.md` (repo layout bucket description; the `cases.ts` fixture-style pointer at line ~124)
- Modify: `CONTEXT.md` (the cli/* package list, line 8)

**Interfaces:** none (documentation only).

---

- [ ] **Step 1: Update `CONTEXT.md`**

In `CONTEXT.md` line 8, add `text-grid` to the cli list:

```
`cli/*` packages (`viewer-core`, `readout`, `text-grid`, `casting-ui`,
`history-ui`, `playground-ui`, `shell`, `test-utils`)
```

- [ ] **Step 2: Update `AGENTS.md`**

In the repo-layout section, add a `cli/text-grid` bullet to the `cli/` bucket list mirroring the existing entries, e.g.:

```
│   ├── text-grid/                 # @hexagram/text-grid — medium-bound monospace renderer: column geometry, the ledger/diagram rendering skeletons, the auto-scroll row math, and the Markdown body serializer of the consultation-view IR
```

In the data-hygiene fixture-style pointer (line ~124), change `domain/consultation-file/tests/fixtures/cases.ts` to `cli/text-grid/tests/fixtures/cases.ts`.

- [ ] **Step 3: Update `CLAUDE.md`**

In the repo-layout tree, under `cli/`, add the `text-grid` line (between `readout/` and `casting-ui/`):

```
│   ├── text-grid/                 # @hexagram/text-grid — medium-bound monospace renderer: column geometry + ledger/diagram skeletons + auto-scroll row math + the IR→Markdown body serializer
```

In the same data-hygiene paragraph that references `domain/consultation-file/tests/fixtures/cases.ts` for the generic fixture style, change it to `cli/text-grid/tests/fixtures/cases.ts`.

In the `### Consultation file format — @hexagram/consultation-file` section, correct the lead so it states the package owns the **canonical envelope** and that the Markdown body is rendered by `@hexagram/text-grid` and injected into `saveConsultationFile` (the domain treats the body as opaque on both save and load). In the IR paragraph (the `## Architecture` preamble that describes the `@hexagram/core` + `@hexagram/text-layout` → `@hexagram/consultation-view` → `@hexagram/readout` + `@hexagram/consultation-file` + `@hexagram/playground-ui` chain), insert `@hexagram/text-grid` as the medium-bound monospace serializer between `consultation-view` (the medium-neutral IR) and `readout`/`playground-ui`, and note that `consultation-file` no longer depends on `consultation-view`. Reference `docs/adr/0022-monospace-text-grid-is-medium-bound.md`.

- [ ] **Step 4: Verify the doc references resolve**

```bash
grep -rn "consultation-file/tests/fixtures/cases.ts" CLAUDE.md AGENTS.md
```
Expected: **no output** (both pointers now say `text-grid`).

```bash
pnpm format:check
```
Expected: pass (oxfmt leaves Markdown untouched / already formatted).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs: name @hexagram/text-grid in the layout, DAG, and fixture pointers

Update CLAUDE.md, AGENTS.md, and CONTEXT.md for the ADR-0022 extraction:
consultation-view is the medium-neutral IR; text-grid is the medium-bound
monospace renderer; consultation-file owns the canonical envelope with an
injected body. Repoint the generic fixture-style examples to the new
cases.ts home.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DpUzh5X7kri8pZbMYdWZta
EOF
)"
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-19-text-grid-extraction-design.md`):
- §3 new `cli/text-grid` package → Task 1 Steps 1–4, Task 2 Steps 1–8. ✔
- §3 `consultation-view` shrinks to semantic IR + glyphs + `buildLedgerRows` → Task 2 Steps 4–6, 9. ✔
- §3 `consultation-file` becomes canonical-only, drops `consultation-view` dep → Task 1 Steps 5–6. ✔
- §3 inventory (geometry split, scroll split, template moves, serializer move, glyph stay) → Task 1 Step 2, Task 2 Steps 1–5. ✔
- §4 `saveConsultationFile` body injection + 3 callers + migration/self-heal → Task 1 Steps 5, 8–9. ✔
- §5 ADR-0022 + README + 0018/0019 amendments → done in the prior planning step (committed `b48cdb5`). ✔
- §6 doc updates (CLAUDE/AGENTS/CONTEXT) + eslint ban-list entry → Task 3; ban-list → Task 1 Step 11. ✔
- §7 zero-diff fixture regen + byte-identity gate + type/lint/test → Task 1 Step 12, Task 2 Step 12; byte-identity strengthened Task 1 Step 10. ✔

**2. Placeholder scan:** the one intentional fill-in is Task 1 Step 9's `markdownConsultationBody(/* query */, /* hexagram */, null, 'playground')` — the implementer copies the literal `query`/`hexagram` already at that exact call site (instructed in the step). No `TBD`/`handle edge cases`/"similar to" placeholders.

**3. Type consistency:** `markdownConsultationBody` signature is identical across old/new homes; `SaveConsultationParams.body: string` is referenced consistently (file.ts, the 3 callers, the type-level test, the byte-identity capture cast); `buildLedgerRows`, `castingTableActiveRow`/`castingTableFollowRow`, `ledgerBlock`/`LedgerStyle`, and the geometry const names match their definitions and every rewired import.

---

## Execution Handoff

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.
