# Markdown Consultations + History CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch saved consultations from ANSI-`.txt` to Markdown-with-YAML-frontmatter, add an Ink-based `hexagram-history` CLI for browsing/loading past consultations, and split the existing `@hexagram/viewer-ui` into three packages (`@hexagram/consultation`, `@hexagram/casting-ui` (renamed), `@hexagram/history-ui`).

**Architecture:** Frontmatter is the canonical model; the Markdown body is a decorative re-render produced from the frontmatter on every load. A new `@hexagram/consultation` package owns the file format, two renderers (the existing ANSI plain renderer stays in `casting-ui`; a new Markdown renderer lives in `consultation`), and a legacy-`.txt`-to-`.md` converter. A new `@hexagram/history-ui` package owns the Ink history browser. Both casting bins save `.md` instead of `.txt`; a new `hexagram-history` bin browses them.

**Tech Stack:** TypeScript 6, Turborepo, pnpm workspaces, tsdown, Vitest, Ink 7 / React 19, `gray-matter` (new dep) for YAML frontmatter, `dayjs` (existing), `ink-testing-library` for snapshot tests.

---

## Important context for the implementer

Read these before starting:

- `AGENTS.md` at repo root — repo conventions (especially the `package.json#exports` shape with `source`/`types`/`import` conditions; no `main`/`module`/`types`).
- `packages/viewer-ui/tests/fixtures/cases.ts` — the four byte-locked cases that drive both old and new fixture generation.
- `packages/viewer-ui/src/output-sections.ts` — the section-builder structure the Markdown renderer mirrors.
- `packages/viewer-ui/src/viewer-flow.ts` — the existing flow state machine that gains a `'history'` flow kind.
- `packages/viewer-ui/scripts/generate-fixtures.ts` — the existing fixture regen script.
- `packages/core/tests/random.test.ts` — slow 1M-iteration distribution test; do NOT break it.
- `consultations/*.txt` — real saved files from earlier format epochs. **Many predate the CASTING section** (single `HEXAGRAM N:` block, no transformation, no standing/emerging split). The legacy converter handles both shapes; see Task 12.

### Decisions baked into this plan

- **Frontmatter dialect:** YAML via `gray-matter`. New dep of `@hexagram/consultation`.
- **`schemaVersion`:** `1` (integer). Strict-equal on load; mismatch → row appears `[unreadable]` in history.
- **`timestamp`:** ISO 8601 with offset, e.g. `2026-05-19T14:23:11+0800` (matches `getFilesystemSafeTimestamp()` if `:` is restored; we keep filename `T...-...-...+0800` format unchanged and parse the colonless form back at the boundary, see Task 9).
- **`query`:** YAML `|` block scalar so multi-line queries survive.
- **`hexagram`:** flat 6-element array, bottom-first (matches in-memory tuple). YAML `[6, 7, 8, 7, 8, 7]`.
- **`casting`:** mapping keyed `L6..L1` (visual order — top of hexagram first, bottom last); in-memory `CastingRecord` is bottom-first; converter inverts at the boundary.
- **Filename:** `consultation-<timestamp>.md`. Extension swap from `.txt`.
- **All derived fields** (hex name, emerging hex, scripture, exegesis, etc.) are NEVER persisted; re-derived on every load via `@hexagram/core/getters`.
- **Out of scope:** TOML/JSON frontmatter; hex-aware filenames; editing past consultations; filtering by hex name; `--rerender-bodies` maintenance script; plain-mode `hexagram-history`; auto-prompt for migration.

### Package boundary summary

| Package                                                        | Role                                                   | Depends on                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `@hexagram/types`                                              | (unchanged)                                            | —                                                                            |
| `@hexagram/core`                                               | (unchanged)                                            | `@hexagram/types`                                                            |
| `@hexagram/consultation` (**NEW**)                             | File format + renderers + legacy converter; no UI deps | `@hexagram/core`, `@hexagram/types`, `gray-matter`, `dayjs`                  |
| `@hexagram/casting-ui` (**RENAME** from `@hexagram/viewer-ui`) | Casting Ink viewer, plain ANSI renderer, inquirer flow | `@hexagram/consultation`, `@hexagram/core`, `@hexagram/types`, Ink, inquirer |
| `@hexagram/history-ui` (**NEW**)                               | History Ink list + load flow                           | `@hexagram/consultation`, `@hexagram/core`, `@hexagram/types`, Ink           |
| `@hexagram/cli`                                                | Three bins: random, interactive, history               | all of the above                                                             |

### TDD workflow

Each task follows red-green-refactor: write failing test → run to confirm failure → minimal implementation → run to confirm pass → commit. Commit messages match the existing style (`feat(scope):`, `refactor(scope):`, `test(scope):`, `docs(monorepo):`).

### Commands reference

```bash
pnpm install                                    # link workspace
pnpm --filter @hexagram/consultation test       # one package
pnpm --filter @hexagram/consultation type:check
pnpm --filter @hexagram/consultation build
pnpm test                                       # all
pnpm build                                      # all (topological)
pnpm generate-fixtures                          # regen byte-locked fixtures
pnpm lint:check                                 # oxlint + eslint
pnpm format:check                               # oxfmt
```

---

## Phase 0 — Scaffold `@hexagram/consultation` package

This phase creates the empty package with the standard exports shape, build config, and lint plumbing. No business logic yet.

### Task 1: Create `@hexagram/consultation` package scaffolding

**Files:**

- Create: `packages/consultation/package.json`
- Create: `packages/consultation/tsconfig.json`
- Create: `packages/consultation/tsdown.config.ts`
- Create: `packages/consultation/src/index.ts`
- Create: `packages/consultation/tests/.gitkeep`

- [ ] **Step 1: Create `packages/consultation/package.json`**

```json
{
  "name": "@hexagram/consultation",
  "type": "module",
  "version": "0.0.0",
  "description": "Yijing hexagram oracle: consultation file format (Markdown + YAML frontmatter), renderers, and legacy converter",
  "license": "MIT",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./markdown": {
      "source": "./src/markdown.ts",
      "types": "./dist/markdown.d.mts",
      "import": "./dist/markdown.mjs"
    },
    "./frontmatter": {
      "source": "./src/frontmatter.ts",
      "types": "./dist/frontmatter.d.mts",
      "import": "./dist/frontmatter.mjs"
    },
    "./file": {
      "source": "./src/file.ts",
      "types": "./dist/file.d.mts",
      "import": "./dist/file.mjs"
    },
    "./legacy-converter": {
      "source": "./src/legacy-converter.ts",
      "types": "./dist/legacy-converter.d.mts",
      "import": "./dist/legacy-converter.mjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsdown",
    "test": "vitest run --passWithNoTests",
    "type:check": "tsc --noEmit"
  },
  "dependencies": {
    "@hexagram/core": "workspace:*",
    "@hexagram/types": "workspace:*",
    "dayjs": "^1.11.20",
    "gray-matter": "^4.0.3"
  }
}
```

- [ ] **Step 2: Create `packages/consultation/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "tests", "scripts"]
}
```

- [ ] **Step 3: Create `packages/consultation/tsdown.config.ts`**

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/markdown.ts',
    './src/frontmatter.ts',
    './src/file.ts',
    './src/legacy-converter.ts',
  ],
  platform: 'node',
})
```

- [ ] **Step 4: Create `packages/consultation/src/index.ts`** (empty barrel — re-exports will be added per task)

```ts
// Re-exports added by later tasks.
export {}
```

- [ ] **Step 5: Create `packages/consultation/tests/.gitkeep`** (empty file so the dir is committed)

- [ ] **Step 6: Install the new package and verify topology**

Run:

```bash
pnpm install
pnpm --filter @hexagram/consultation build
pnpm --filter @hexagram/consultation type:check
```

Expected: both succeed with empty output / "no entries" tolerated by tsdown for an empty index.

- [ ] **Step 7: Commit**

```bash
git add packages/consultation
git commit -m "$(cat <<'EOF'
feat(consultation): scaffold @hexagram/consultation package

Empty package with exports for index/markdown/frontmatter/file/legacy-converter
subpaths. No business logic yet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Frontmatter envelope (model + serialize + parse)

### Task 2: Define `ConsultationEnvelope` type and `castingToYaml` / `castingFromYaml` converters

**Files:**

- Create: `packages/consultation/src/frontmatter.ts`
- Create: `packages/consultation/tests/frontmatter.test.ts`

The L6↔L1 inversion is the riskiest correctness boundary in this entire plan. Test it first.

- [ ] **Step 1: Write the failing tests**

`packages/consultation/tests/frontmatter.test.ts`:

```ts
import type { CastingRecord, LineCasting } from '@hexagram/types'
import { describe, expect, it } from 'vitest'

import {
  castingFromYaml,
  castingToYaml,
  type YamlCasting,
} from '../src/frontmatter'

const sampleLine = (a: number, b: number, c: number): LineCasting => [
  { pick: a, max: 48 },
  { pick: b, max: 43 },
  { pick: c, max: 39 },
]

const sampleCasting: CastingRecord = [
  sampleLine(1, 2, 3), // L1 (bottom)
  sampleLine(11, 12, 13), // L2
  sampleLine(21, 22, 23), // L3
  sampleLine(31, 32, 33), // L4
  sampleLine(41, 42, 43), // L5
  sampleLine(51, 52, 53), // L6 (top)
]

describe('castingToYaml', () => {
  it('writes L6 first, L1 last, preserving line content', () => {
    const yaml: YamlCasting = castingToYaml(sampleCasting)
    expect(Object.keys(yaml)).toEqual(['L6', 'L5', 'L4', 'L3', 'L2', 'L1'])
    expect(yaml.L6).toEqual(sampleLine(51, 52, 53))
    expect(yaml.L1).toEqual(sampleLine(1, 2, 3))
  })
})

describe('castingFromYaml', () => {
  it('inverts back to a bottom-first 6-tuple', () => {
    const yaml = castingToYaml(sampleCasting)
    const recovered = castingFromYaml(yaml)
    expect(recovered).toEqual(sampleCasting)
  })
})

describe('round-trip', () => {
  it('is identity for every line position', () => {
    expect(castingFromYaml(castingToYaml(sampleCasting))).toEqual(sampleCasting)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: FAIL — `Cannot find module '../src/frontmatter'`.

- [ ] **Step 3: Write the minimal implementation**

`packages/consultation/src/frontmatter.ts`:

```ts
import type { CastingRecord, LineCasting } from '@hexagram/types'

export const CURRENT_SCHEMA_VERSION = 1

export type YamlCasting = {
  L6: LineCasting
  L5: LineCasting
  L4: LineCasting
  L3: LineCasting
  L2: LineCasting
  L1: LineCasting
}

/** Convert bottom-first `CastingRecord` → top-first YAML mapping (`L6` first). */
export function castingToYaml(casting: CastingRecord): YamlCasting {
  const [L1, L2, L3, L4, L5, L6] = casting
  return { L6, L5, L4, L3, L2, L1 }
}

/** Convert top-first YAML mapping → bottom-first `CastingRecord`. */
export function castingFromYaml(yaml: YamlCasting): CastingRecord {
  return [yaml.L1, yaml.L2, yaml.L3, yaml.L4, yaml.L5, yaml.L6]
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/consultation
git commit -m "feat(consultation): add casting L6↔L1 inversion converters

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 3: Define `ConsultationEnvelope` and `serializeFrontmatter` / `parseFrontmatter`

**Files:**

- Modify: `packages/consultation/src/frontmatter.ts`
- Modify: `packages/consultation/tests/frontmatter.test.ts`

- [ ] **Step 1: Add failing tests for serialize/parse**

Append to `packages/consultation/tests/frontmatter.test.ts`:

```ts
import {
  parseFrontmatter,
  serializeFrontmatter,
  type ConsultationEnvelope,
} from '../src/frontmatter'

const envelope: ConsultationEnvelope = {
  schemaVersion: 1,
  timestamp: '2026-05-19T14:23:11+0800',
  query: 'Will the harvest be plentiful?',
  hexagram: [7, 8, 7, 8, 7, 8],
  casting: sampleCasting,
}

describe('serializeFrontmatter', () => {
  it('emits a fenced YAML block with schemaVersion, timestamp, query, hexagram, casting', () => {
    const text = serializeFrontmatter(envelope, 'BODY')
    expect(text.startsWith('---\n')).toBe(true)
    expect(text).toMatch(/schemaVersion: 1/)
    expect(text).toMatch(/timestamp: '2026-05-19T14:23:11\+0800'/)
    expect(text).toMatch(/hexagram:\s*\n\s*- 7/)
    expect(text).toMatch(/casting:/)
    // L6 comes before L1 in casting:
    const castingBlock = text.split('casting:')[1]!
    expect(castingBlock.indexOf('L6:')).toBeLessThan(
      castingBlock.indexOf('L1:'),
    )
    expect(text).toContain('\nBODY')
  })

  it('uses block scalar for multi-line queries', () => {
    const multiline: ConsultationEnvelope = {
      ...envelope,
      query: 'Line one\nLine two',
    }
    const text = serializeFrontmatter(multiline, 'BODY')
    expect(text).toMatch(/query: \|/)
    expect(text).toMatch(/  Line one/)
    expect(text).toMatch(/  Line two/)
  })
})

describe('parseFrontmatter', () => {
  it('round-trips a serialized envelope', () => {
    const text = serializeFrontmatter(envelope, 'BODY')
    const result = parseFrontmatter(text)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.data.envelope).toEqual(envelope)
    expect(result.data.body.trim()).toBe('BODY')
  })

  it('reports `unreadable` when schemaVersion mismatches', () => {
    const text = serializeFrontmatter(
      { ...envelope, schemaVersion: 99 },
      'BODY',
    )
    const result = parseFrontmatter(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('schema-version-mismatch')
  })

  it('reports `unreadable` when frontmatter is absent', () => {
    const result = parseFrontmatter('# Just a markdown body')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing-frontmatter')
  })

  it('reports `unreadable` when hexagram is malformed', () => {
    const bad = serializeFrontmatter(envelope, 'BODY').replace(
      '- 7\n  - 8\n  - 7\n  - 8\n  - 7\n  - 8',
      '- 7\n  - 99',
    )
    const result = parseFrontmatter(bad)
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify failure**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: FAIL — `parseFrontmatter` and `serializeFrontmatter` not exported.

- [ ] **Step 3: Implement serialize/parse**

Append to `packages/consultation/src/frontmatter.ts`:

```ts
import matter from 'gray-matter'

import {
  type CastingRecord,
  type Hexagram,
  isCastingRecord,
  isHexagram,
} from '@hexagram/types'

export interface ConsultationEnvelope {
  schemaVersion: number
  timestamp: string
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}

export type ParseResult =
  | { ok: true; data: { envelope: ConsultationEnvelope; body: string } }
  | { ok: false; reason: ParseFailureReason }

export type ParseFailureReason =
  | 'missing-frontmatter'
  | 'schema-version-mismatch'
  | 'invalid-yaml'
  | 'invalid-shape'

/**
 * Serialize an envelope + body into the full Markdown text. The frontmatter
 * is YAML; `casting` is emitted L6→L1 (visual top-first); `hexagram` is a
 * flat bottom-first array; multi-line `query` becomes a `|` block scalar.
 */
export function serializeFrontmatter(
  envelope: ConsultationEnvelope,
  body: string,
): string {
  const data = {
    schemaVersion: envelope.schemaVersion,
    timestamp: envelope.timestamp,
    query: envelope.query,
    hexagram: envelope.hexagram,
    casting: castingToYaml(envelope.casting),
  }
  // gray-matter's stringify uses `js-yaml`. Configure it to:
  //   - emit `|` block scalars for strings containing newlines (default).
  //   - keep object insertion order (default for js-yaml's `dump`).
  return matter.stringify(body, data, {
    language: 'yaml',
  })
}

/**
 * Parse a Markdown file's text into an envelope + body. Returns a tagged
 * result; callers handle the `unreadable` cases by surfacing them in the
 * history list.
 */
export function parseFrontmatter(text: string): ParseResult {
  const { data, content } = (() => {
    try {
      return matter(text)
    } catch {
      return { data: undefined, content: '' } as {
        data: unknown
        content: string
      }
    }
  })()

  if (data === undefined) return { ok: false, reason: 'invalid-yaml' }
  if (!isPlainObject(data) || Object.keys(data).length === 0) {
    return { ok: false, reason: 'missing-frontmatter' }
  }

  const { schemaVersion, timestamp, query, hexagram, casting } = data as Record<
    string,
    unknown
  >

  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'schema-version-mismatch' }
  }
  if (typeof timestamp !== 'string' || typeof query !== 'string') {
    return { ok: false, reason: 'invalid-shape' }
  }
  if (!isHexagram(hexagram)) return { ok: false, reason: 'invalid-shape' }

  // Convert YAML L6..L1 mapping back to a bottom-first CastingRecord.
  if (!isYamlCasting(casting)) return { ok: false, reason: 'invalid-shape' }
  const castingRecord = castingFromYaml(casting)
  if (!isCastingRecord(castingRecord)) {
    return { ok: false, reason: 'invalid-shape' }
  }

  return {
    ok: true,
    data: {
      envelope: {
        schemaVersion,
        timestamp,
        query,
        hexagram,
        casting: castingRecord,
      },
      body: content,
    },
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isYamlCasting(value: unknown): value is YamlCasting {
  if (!isPlainObject(value)) return false
  return ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].every((key) => key in value)
}
```

- [ ] **Step 4: Run the test to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 5: Re-export from index**

Replace `packages/consultation/src/index.ts`:

```ts
export {
  castingFromYaml,
  castingToYaml,
  CURRENT_SCHEMA_VERSION,
  parseFrontmatter,
  serializeFrontmatter,
  type ConsultationEnvelope,
  type ParseFailureReason,
  type ParseResult,
  type YamlCasting,
} from './frontmatter.js'
```

- [ ] **Step 6: Run type:check and lint**

```bash
pnpm --filter @hexagram/consultation type:check
pnpm lint:check
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add packages/consultation
git commit -m "feat(consultation): add ConsultationEnvelope + frontmatter serialize/parse

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Markdown body renderer

The Markdown renderer mirrors `output-sections.ts` but emits plain Markdown (no ANSI), wraps load-bearing diagrams in ```text fences, and uses native MD idioms (`##`, `_italic_`, `### Heading`) for prose.

### Task 4: Implement `castingMarkdownSection` (ANSI-stripped box-drawing inside ```text)

**Files:**

- Create: `packages/consultation/src/markdown-sections.ts`
- Create: `packages/consultation/tests/markdown-sections.test.ts`

- [ ] **Step 1: Add failing test**

`packages/consultation/tests/markdown-sections.test.ts`:

````ts
import { describe, expect, it } from 'vitest'

import { castingMarkdownSection } from '../src/markdown-sections'

const casting = [
  [
    { pick: 27, max: 48 },
    { pick: 28, max: 43 },
    { pick: 30, max: 39 },
  ],
  [
    { pick: 22, max: 48 },
    { pick: 23, max: 43 },
    { pick: 29, max: 35 },
  ],
  [
    { pick: 17, max: 48 },
    { pick: 24, max: 43 },
    { pick: 14, max: 35 },
  ],
  [
    { pick: 22, max: 48 },
    { pick: 34, max: 43 },
    { pick: 25, max: 39 },
  ],
  [
    { pick: 10, max: 48 },
    { pick: 26, max: 43 },
    { pick: 33, max: 39 },
  ],
  [
    { pick: 12, max: 48 },
    { pick: 20, max: 39 },
    { pick: 18, max: 31 },
  ],
] as const

describe('castingMarkdownSection', () => {
  it('emits a ## CASTING header followed by a fenced text block with the hierarchical table', () => {
    const text = castingMarkdownSection(casting as never)
    expect(text).toMatch(/^## CASTING\n/)
    expect(text).toContain('```text\n')
    expect(text).toContain('\n```\n')
    expect(text).toContain('Cast') // banner row
    expect(text).toContain('1st')
    expect(text).toContain('Heap')
    expect(text).toContain('Stalks')
    expect(text).toContain('Left')
    expect(text).toContain('Right')
    expect(text).toContain('│ Line │') // header column label
    // Numeric values must appear in the table:
    expect(text).toContain('27')
    expect(text).toContain('33')
  })

  it('contains no ANSI escape codes', () => {
    const text = castingMarkdownSection(casting as never)
    expect(/\[/.test(text)).toBe(false)
  })
})
````

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement**

`packages/consultation/src/markdown-sections.ts`:

````ts
import type { CastingRecord, PartialSplitRecord } from '@hexagram/types'

// Pure column-padding helpers (no ANSI). Mirrors the geometry used in the
// casting-ui `castingSection`, but emits plain text inside a ```text fence.
function castCenter(text: string, width: number): string {
  const leftPad = Math.floor((width - text.length) / 2)
  const rightPad = width - text.length - leftPad
  return `${' '.repeat(leftPad)}${text}${' '.repeat(rightPad)}`
}
function castRight(text: string, width: number): string {
  const leading = Math.max(0, width - text.length - 1)
  return `${' '.repeat(leading)}${text} `
}

const TOP =
  '┌──────┬──────────────────────────────────────────────────────────────────────────┐'
const CAST_OUTER_DIVIDER =
  '│      ├────────────────────────┬────────────────────────┬────────────────────────┤'
const CAST_INNER_DIVIDER =
  '│      ├────────┬───────────────┼────────┬───────────────┼────────┬───────────────┤'
const HEAP_INNER_DIVIDER =
  '│      │        ├───────┬───────┤        ├───────┬───────┤        ├───────┬───────┤'
const MID =
  '├──────┼────────┼───────┼───────┼────────┼───────┼───────┼────────┼───────┼───────┤'
const BOTTOM =
  '└──────┴────────┴───────┴───────┴────────┴───────┴───────┴────────┴───────┴───────┘'

/**
 * Markdown version of the casting table. Same box-drawing geometry as the
 * casting-ui renderer, but no ANSI styling — content is wrapped in a
 * ```text fence so monospace is preserved when rendered.
 */
export function castingMarkdownSection(casting: CastingRecord): string {
  const castLabel = `│      │${castCenter('Cast', 74)}│`
  const nth = (text: string): string => castCenter(text, 24)
  const nthLabel = `│      │${nth('1st')}│${nth('2nd')}│${nth('3rd')}│`
  const heapBanner = `        │${castCenter('Heap', 15)}`
  const heapLabel = `│      │${heapBanner}│${heapBanner}│${heapBanner}│`
  const colCell = `${castRight('Stalks', 8)}│${castRight('Left', 7)}│${castRight('Right', 7)}`
  const colLabels = `│${castRight('Line', 6)}│${colCell}│${colCell}│${colCell}│`

  const cell = (split: PartialSplitRecord): string => {
    if (split === null)
      return `${castRight('·', 8)}│${castRight('·', 7)}│${castRight('·', 7)}`
    return `${castRight(String(split.max), 8)}│${castRight(String(split.pick), 7)}│${castRight(String(split.max - split.pick), 7)}`
  }

  const indexedLines = [
    [6, casting[5]],
    [5, casting[4]],
    [4, casting[3]],
    [3, casting[2]],
    [2, casting[1]],
    [1, casting[0]],
  ] as const
  const dataRows = indexedLines
    .map(([lineNumber, lineCasting]) => {
      const [first, second, third] = lineCasting
      return `│${castRight(String(lineNumber), 6)}│${cell(first)}│${cell(second)}│${cell(third)}│`
    })
    .join('\n')

  return `## CASTING

\`\`\`text
${TOP}
${castLabel}
${CAST_OUTER_DIVIDER}
${nthLabel}
${CAST_INNER_DIVIDER}
${heapLabel}
${HEAP_INNER_DIVIDER}
${colLabels}
${MID}
${dataRows}
${BOTTOM}
\`\`\`
`
}
````

- [ ] **Step 4: Run the test to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/consultation
git commit -m "feat(consultation): add castingMarkdownSection (fenced ASCII box-drawing)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 5: Implement `queryMarkdownSection`, `transformationMarkdownSection`, hexagram sections, and lines block

**Files:**

- Modify: `packages/consultation/src/markdown-sections.ts`
- Modify: `packages/consultation/tests/markdown-sections.test.ts`

- [ ] **Step 1: Add failing tests for each section**

Append to `packages/consultation/tests/markdown-sections.test.ts`:

````ts
import {
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from '../src/markdown-sections'

describe('queryMarkdownSection', () => {
  it('emits ## QUERY and the query paragraph', () => {
    expect(queryMarkdownSection('Will it rain?')).toBe(
      '## QUERY\n\nWill it rain?\n',
    )
  })
  it('shows a placeholder for empty query', () => {
    expect(queryMarkdownSection('')).toBe(
      '## QUERY\n\n_(Query not provided)_\n',
    )
  })
})

describe('transformationMarkdownSection', () => {
  it('emits an italic caption for no moving lines', () => {
    const text = transformationMarkdownSection([7, 8, 7, 8, 7, 8])
    expect(text).toMatch(/^## TRANSFORMATION\n\n_\(No transformation\)_\n$/)
  })

  it('emits a fenced text block for moving lines', () => {
    const text = transformationMarkdownSection([6, 7, 8, 7, 8, 7])
    expect(text).toMatch(/^## TRANSFORMATION\n/)
    expect(text).toContain('```text\n')
    expect(text).toContain('Standing')
    expect(text).toContain('Emerging')
    expect(text).toContain('▶')
  })
})

describe('standingHexagramMarkdownSection', () => {
  it('emits ## STANDING HEXAGRAM <N> with translations', () => {
    const text = standingHexagramMarkdownSection([7, 8, 7, 8, 7, 8])
    expect(text).toMatch(/^## STANDING HEXAGRAM 63\n/)
    expect(text).toContain('_Line at bottom is first._')
    expect(text).toContain('```text\n')
    expect(text).toContain('_First is line at bottom._')
    expect(text).toContain('### Traditional Chinese')
    expect(text).toContain('### Simplified Chinese')
    expect(text).toContain('### English, Wilhelm-Baynes')
    expect(text).toContain('### English, James Legge')
    // Name + pronunciation appear directly under each translation heading:
    expect(text).toContain('既濟（ㄐㄧˋ ㄐㄧˋ）')
    expect(text).toContain('Chi Chi / After Completion')
  })
})

describe('emergingHexagramMarkdownSection', () => {
  it('emits ## EMERGING HEXAGRAM <N>', () => {
    const text = emergingHexagramMarkdownSection([6, 7, 8, 7, 8, 7])
    expect(text).toMatch(/^## EMERGING HEXAGRAM 38\n/)
  })
})

describe('linesMarkdownBlock', () => {
  it('emits one-moving-line mode', () => {
    const text = linesMarkdownBlock([6, 7, 8, 7, 8, 7])
    expect(text).toMatch(/^## LINES\n/)
    expect(text).toContain('_One moving line._')
    expect(text).toContain('### Traditional Chinese')
    expect(text).toContain('#### Scripture')
    expect(text).toContain('#### Exegesis')
  })
  it('emits no-moving-lines mode', () => {
    const text = linesMarkdownBlock([7, 8, 7, 8, 7, 8])
    expect(text).toContain('_No moving lines._')
    expect(text).toContain('#### Scripture')
    expect(text).toContain('#### Exegesis')
  })
  it('emits multiple-moving-lines mode', () => {
    const text = linesMarkdownBlock([6, 9, 7, 8, 7, 8])
    expect(text).toContain('_Multiple moving lines._')
    expect(text).toContain(
      'No available reference scripture or exegesis for multiple moving lines.',
    )
  })
})
````

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: FAIL — symbols not exported.

- [ ] **Step 3: Implement each section**

Append to `packages/consultation/src/markdown-sections.ts`:

```ts
import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/types'

const LINE_DIAGRAM = {
  6: '━━━ × ━━━',
  7: '━━━━━━━━━',
  8: '━━━   ━━━',
  9: '━━━━○━━━━',
} as const satisfies Record<Line, string>

const POSITION_LABELS = {
  1: '（初, 1st）',
  2: '（二, 2nd）',
  3: '（三, 3rd）',
  4: '（四, 4th）',
  5: '（五, 5th）',
  6: '（六, 6th）',
} as const

function isMovingLine(line: Line): boolean {
  return line === 6 || line === 9
}

function visualWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    const isFullwidth =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0x303e) ||
      (cp >= 0x3041 && cp <= 0x33ff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xa000 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7af) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe10 && cp <= 0xfe6f) ||
      (cp >= 0xff01 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
}
function padToColumn(text: string, targetColumn: number, minGap = 1): string {
  return text + ' '.repeat(Math.max(minGap, targetColumn - visualWidth(text)))
}

export function queryMarkdownSection(query: string): string {
  const body = query.length > 0 ? query : '_(Query not provided)_'
  return `## QUERY\n\n${body}\n`
}

const RIGHT_COLUMN = 46
const MOVING_ARROW = '─────────────────▶ '
const STATIC_GAP = '                   '

export function transformationMarkdownSection(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)
  if (movingLines.length === 0)
    return `## TRANSFORMATION\n\n_(No transformation)_\n`

  const emerging = getEmergingHexagram(hexagram)
  const { Name: standingName, Metadata: standingMetadata } =
    getHexagramRecord(hexagram)
  const { Name: emergingName, Metadata: emergingMetadata } =
    getHexagramRecord(emerging)

  const pairs = [
    [hexagram[5], emerging[5], POSITION_LABELS[6]],
    [hexagram[4], emerging[4], POSITION_LABELS[5]],
    [hexagram[3], emerging[3], POSITION_LABELS[4]],
    [hexagram[2], emerging[2], POSITION_LABELS[3]],
    [hexagram[1], emerging[1], POSITION_LABELS[2]],
    [hexagram[0], emerging[0], POSITION_LABELS[1]],
  ] as const

  const header = `${padToColumn('  Standing', RIGHT_COLUMN)}Emerging`
  const rows = pairs
    .map(([s, e, pos]) => {
      const gap = isMovingLine(s as Line) ? MOVING_ARROW : STATIC_GAP
      const left = `  ${s}  ${LINE_DIAGRAM[s as Line]}  ${pos}`
      const right = `${e}  ${LINE_DIAGRAM[e as Line]}  ${pos}`
      return `${left}${gap}${right}`
    })
    .join('\n')
  const footer1 =
    padToColumn(
      `  #${standingMetadata.Order.WenWang} ${standingName.Chinese.Traditional}（${standingMetadata.Pronunciation.Pinyin}）`,
      RIGHT_COLUMN,
    ) +
    `#${emergingMetadata.Order.WenWang} ${emergingName.Chinese.Traditional}（${emergingMetadata.Pronunciation.Pinyin}）`
  const footer2 =
    padToColumn(`  ${standingName.English.WilhelmBaynes}`, RIGHT_COLUMN, 6) +
    emergingName.English.WilhelmBaynes

  return `## TRANSFORMATION

\`\`\`text
${header}

${rows}

${footer1}
${footer2}
\`\`\`
`
}

function hexagramDiagramBlock(hexagram: Hexagram): string {
  const { Metadata } = getHexagramRecord(hexagram)
  const upper = getTrigramRecord(Metadata.Trigram.Upper)
  const lower = getTrigramRecord(Metadata.Trigram.Lower)
  const [l1, l2, l3, l4, l5, l6] = hexagram
  return [
    `  ${l6}  ${LINE_DIAGRAM[l6]}  ${POSITION_LABELS[6]}──┐`,
    `  ${l5}  ${LINE_DIAGRAM[l5]}  ${POSITION_LABELS[5]}──┼── ${upper.Imagery.Chinese.Traditional}（上卦）`,
    `  ${l4}  ${LINE_DIAGRAM[l4]}  ${POSITION_LABELS[4]}──┘   ${upper.Imagery.English.WilhelmBaynes} (upper trigram)`,
    `  ${l3}  ${LINE_DIAGRAM[l3]}  ${POSITION_LABELS[3]}──┐`,
    `  ${l2}  ${LINE_DIAGRAM[l2]}  ${POSITION_LABELS[2]}──┼── ${lower.Imagery.Chinese.Traditional}（下卦）`,
    `  ${l1}  ${LINE_DIAGRAM[l1]}  ${POSITION_LABELS[1]}──┘   ${lower.Imagery.English.WilhelmBaynes} (lower trigram)`,
  ].join('\n')
}

function hexagramSection(
  hexagram: Hexagram,
  label: 'STANDING' | 'EMERGING',
): string {
  const { Name, Metadata } = getHexagramRecord(hexagram)
  return `## ${label} HEXAGRAM ${Metadata.Order.WenWang}

_Line at bottom is first._

\`\`\`text
${hexagramDiagramBlock(hexagram)}
\`\`\`

_First is line at bottom._

${hexagram[0]}, ${hexagram[1]}, ${hexagram[2]}, ${hexagram[3]}, ${hexagram[4]}, ${hexagram[5]}

### Traditional Chinese

${Name.Chinese.Traditional}（${Metadata.Pronunciation.Zhuyin}）

### Simplified Chinese

${Name.Chinese.Simplified}（${Metadata.Pronunciation.Pinyin}）

### English, Wilhelm-Baynes

${Name.English.WilhelmBaynes}

### English, James Legge

${Name.English.Legge}
`
}

export function standingHexagramMarkdownSection(hexagram: Hexagram): string {
  return hexagramSection(hexagram, 'STANDING')
}

export function emergingHexagramMarkdownSection(hexagram: Hexagram): string {
  return hexagramSection(getEmergingHexagram(hexagram), 'EMERGING')
}

function isLineIndex(i: number): i is 0 | 1 | 2 | 3 | 4 | 5 {
  return i >= 0 && i <= 5
}

function linesNoMovingBlock(hexagram: Hexagram): string {
  const { Text } = getHexagramRecord(hexagram)
  return `## LINES

_No moving lines._

### Traditional Chinese

#### Scripture

${Text.Chinese.Traditional.Scripture.Hexagram}

#### Exegesis

${Text.Chinese.Traditional.Exegesis.Imagery.Hexagram}

### Simplified Chinese

#### Scripture

${Text.Chinese.Simplified.Scripture.Hexagram}

#### Exegesis

${Text.Chinese.Simplified.Exegesis.Imagery.Hexagram}

### English, Wilhelm-Baynes

#### Scripture

${Text.English.WilhelmBaynes.Scripture.Hexagram}

#### Exegesis

${Text.English.WilhelmBaynes.Exegesis.Imagery.Hexagram}

### English, James Legge

#### Scripture

${Text.English.Legge.Scripture.Hexagram}

#### Exegesis

${Text.English.Legge.Exegesis.Imagery.Hexagram}
`
}

function linesOneMovingBlock(hexagram: Hexagram): string {
  const movingIndex = hexagram.findIndex(isMovingLine)
  if (!isLineIndex(movingIndex)) return ''
  const key = `L${movingIndex + 1}` as 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
  const { Text } = getHexagramRecord(hexagram)
  return `## LINES

_One moving line._

### Traditional Chinese

#### Scripture

${Text.Chinese.Traditional.Scripture.Lines[key]}

#### Exegesis

${Text.Chinese.Traditional.Exegesis.Imagery.Lines[key]}

### Simplified Chinese

#### Scripture

${Text.Chinese.Simplified.Scripture.Lines[key]}

#### Exegesis

${Text.Chinese.Simplified.Exegesis.Imagery.Lines[key]}

### English, Wilhelm-Baynes

#### Scripture

${Text.English.WilhelmBaynes.Scripture.Lines[key]}

#### Exegesis

${Text.English.WilhelmBaynes.Exegesis.Imagery.Lines[key]}

### English, James Legge

#### Scripture

${Text.English.Legge.Scripture.Lines[key]}

#### Exegesis

${Text.English.Legge.Exegesis.Imagery.Lines[key]}
`
}

function linesMultiMovingBlock(): string {
  return `## LINES

_Multiple moving lines._

No available reference scripture or exegesis for multiple moving lines.
`
}

export function linesMarkdownBlock(hexagram: Hexagram): string {
  const movingCount = hexagram.filter(isMovingLine).length
  if (movingCount === 0) return linesNoMovingBlock(hexagram)
  if (movingCount === 1) return linesOneMovingBlock(hexagram)
  return linesMultiMovingBlock()
}
```

- [ ] **Step 4: Run the test to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/consultation
git commit -m "feat(consultation): add markdown section builders (query/transformation/hexagrams/lines)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 6: Implement top-level `markdownConsultationBody` composer

**Files:**

- Create: `packages/consultation/src/markdown.ts`
- Create: `packages/consultation/tests/markdown.test.ts`

- [ ] **Step 1: Add failing test**

`packages/consultation/tests/markdown.test.ts`:

```ts
import type { CastingRecord, Hexagram } from '@hexagram/types'
import { describe, expect, it } from 'vitest'

import { markdownConsultationBody } from '../src/markdown'

const casting: CastingRecord = [
  [
    { pick: 1, max: 48 },
    { pick: 2, max: 43 },
    { pick: 3, max: 39 },
  ],
  [
    { pick: 1, max: 48 },
    { pick: 2, max: 43 },
    { pick: 3, max: 39 },
  ],
  [
    { pick: 1, max: 48 },
    { pick: 2, max: 43 },
    { pick: 3, max: 39 },
  ],
  [
    { pick: 1, max: 48 },
    { pick: 2, max: 43 },
    { pick: 3, max: 39 },
  ],
  [
    { pick: 1, max: 48 },
    { pick: 2, max: 43 },
    { pick: 3, max: 39 },
  ],
  [
    { pick: 1, max: 48 },
    { pick: 2, max: 43 },
    { pick: 3, max: 39 },
  ],
]

describe('markdownConsultationBody', () => {
  it('composes the body in QUERY → CASTING → TRANSFORMATION → STANDING → [EMERGING] → LINES order', () => {
    const hex: Hexagram = [6, 7, 8, 7, 8, 7]
    const body = markdownConsultationBody('Q', hex, casting)
    const idxQuery = body.indexOf('## QUERY')
    const idxCasting = body.indexOf('## CASTING')
    const idxTransformation = body.indexOf('## TRANSFORMATION')
    const idxStanding = body.indexOf('## STANDING HEXAGRAM')
    const idxEmerging = body.indexOf('## EMERGING HEXAGRAM')
    const idxLines = body.indexOf('## LINES')
    expect(idxQuery).toBeLessThan(idxCasting)
    expect(idxCasting).toBeLessThan(idxTransformation)
    expect(idxTransformation).toBeLessThan(idxStanding)
    expect(idxStanding).toBeLessThan(idxEmerging)
    expect(idxEmerging).toBeLessThan(idxLines)
  })

  it('omits the EMERGING section when there are no moving lines', () => {
    const hex: Hexagram = [7, 8, 7, 8, 7, 8]
    const body = markdownConsultationBody('Q', hex, casting)
    expect(body).not.toContain('## EMERGING HEXAGRAM')
    expect(body).toContain('_(No transformation)_')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`packages/consultation/src/markdown.ts`:

```ts
import type { CastingRecord, Hexagram, Line } from '@hexagram/types'

import {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from './markdown-sections.js'

function hasMovingLines(hexagram: Hexagram): boolean {
  return hexagram.some((line: Line) => line === 6 || line === 9)
}

/**
 * Compose the Markdown body for a consultation. The frontmatter envelope is
 * applied separately by `serializeFrontmatter`.
 */
export function markdownConsultationBody(
  query: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): string {
  const parts = [
    queryMarkdownSection(query),
    castingMarkdownSection(casting),
    transformationMarkdownSection(hexagram),
    standingHexagramMarkdownSection(hexagram),
  ]
  if (hasMovingLines(hexagram)) {
    parts.push(emergingHexagramMarkdownSection(hexagram))
  }
  parts.push(linesMarkdownBlock(hexagram))
  return parts.join('\n')
}
```

- [ ] **Step 4: Run the test to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 5: Update index re-exports**

Append to `packages/consultation/src/index.ts`:

```ts
export { markdownConsultationBody } from './markdown.js'
export {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from './markdown-sections.js'
```

- [ ] **Step 6: Commit**

```bash
git add packages/consultation
git commit -m "feat(consultation): add markdownConsultationBody top-level composer

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — New byte-locked Markdown fixtures

The four cases in `packages/viewer-ui/tests/fixtures/cases.ts` get matching `.md` body fixtures (just the body — frontmatter has a moving timestamp so a full-file fixture must use a stub timestamp; see below) and full-envelope `.md` fixtures using a fixed timestamp.

### Task 7: Build `.md` body fixtures and the regen script

**Files:**

- Create: `packages/consultation/tests/fixtures/md-body-no-moving.md`
- Create: `packages/consultation/tests/fixtures/md-body-one-moving.md`
- Create: `packages/consultation/tests/fixtures/md-body-multi-moving.md`
- Create: `packages/consultation/tests/fixtures/md-body-empty-query.md`
- Create: `packages/consultation/tests/fixtures/md-file-no-moving.md`
- Create: `packages/consultation/tests/fixtures/md-file-one-moving.md`
- Create: `packages/consultation/tests/fixtures/md-file-multi-moving.md`
- Create: `packages/consultation/tests/fixtures/md-file-empty-query.md`
- Create: `packages/consultation/tests/fixtures/cases.ts`
- Create: `packages/consultation/scripts/generate-fixtures.ts`
- Create: `packages/consultation/tests/fixtures.test.ts`
- Modify: `packages/consultation/package.json` (add `generate-fixtures` script)

- [ ] **Step 1: Add fixture cases (mirrors `viewer-ui` ones)**

`packages/consultation/tests/fixtures/cases.ts`:

```ts
import type { CastingRecord, Hexagram, LineCasting } from '@hexagram/types'

const lc = (
  p1: number,
  p2: number,
  p3: number,
  m1 = 48,
  m2 = 43,
  m3 = 39,
): LineCasting => [
  { pick: p1, max: m1 },
  { pick: p2, max: m2 },
  { pick: p3, max: m3 },
]

// Fixed timestamp string used in the full-file fixtures so the bytes stay locked.
export const FIXTURE_TIMESTAMP = '2026-05-19T14:23:11+0800'

export interface ConsultationCase {
  name: string
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}

export const cases: ConsultationCase[] = [
  {
    name: 'no-moving',
    query: 'Will the harvest be plentiful?',
    hexagram: [7, 8, 7, 8, 7, 8],
    casting: [
      lc(27, 28, 30),
      lc(22, 23, 29, 48, 43, 35),
      lc(17, 24, 14, 48, 43, 35),
      lc(22, 34, 25),
      lc(10, 26, 33),
      lc(12, 20, 18, 48, 39, 31),
    ],
  },
  {
    name: 'one-moving',
    query: 'Should I take the new position?',
    hexagram: [6, 7, 8, 7, 8, 7],
    casting: [
      lc(5, 11, 7),
      lc(31, 19, 22),
      lc(8, 40, 13, 48, 43, 35),
      lc(44, 2, 28),
      lc(16, 33, 9, 48, 39, 35),
      lc(21, 6, 30, 48, 39, 31),
    ],
  },
  {
    name: 'multi-moving',
    query: 'How will the journey unfold?',
    hexagram: [6, 9, 7, 8, 7, 8],
    casting: [
      lc(13, 25, 4),
      lc(41, 7, 36),
      lc(9, 18, 27, 48, 43, 35),
      lc(30, 12, 1),
      lc(22, 38, 15, 48, 39, 35),
      lc(3, 29, 20, 48, 39, 31),
    ],
  },
  {
    name: 'empty-query',
    query: '',
    hexagram: [7, 7, 7, 7, 7, 7],
    casting: [
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
    ],
  },
]
```

- [ ] **Step 2: Write the regen script**

`packages/consultation/scripts/generate-fixtures.ts`:

```ts
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { cases, FIXTURE_TIMESTAMP } from '../tests/fixtures/cases'
import { serializeFrontmatter } from '../src/frontmatter'
import { markdownConsultationBody } from '../src/markdown'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'tests',
  'fixtures',
)

for (const { name, query, hexagram, casting } of cases) {
  const body = markdownConsultationBody(query, hexagram, casting)
  writeFileSync(path.join(fixturesDir, `md-body-${name}.md`), body, 'utf8')
  process.stdout.write(`Wrote md-body-${name}.md\n`)

  const fullFile = serializeFrontmatter(
    {
      schemaVersion: 1,
      timestamp: FIXTURE_TIMESTAMP,
      query,
      hexagram,
      casting,
    },
    body,
  )
  writeFileSync(path.join(fixturesDir, `md-file-${name}.md`), fullFile, 'utf8')
  process.stdout.write(`Wrote md-file-${name}.md\n`)
}
```

- [ ] **Step 3: Add `generate-fixtures` script to package.json**

Edit `packages/consultation/package.json` — add to `scripts`:

```json
    "generate-fixtures": "tsx scripts/generate-fixtures.ts"
```

- [ ] **Step 4: Run the script to emit the eight fixture files**

```bash
pnpm --filter @hexagram/consultation exec tsx scripts/generate-fixtures.ts
```

Expected: 8 fixture files written. Inspect each by eye for sanity (each `md-body-*.md` contains `## QUERY`, `## CASTING`, etc.; each `md-file-*.md` starts with `---\nschemaVersion: 1`).

- [ ] **Step 5: Add the byte-identity test**

`packages/consultation/tests/fixtures.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { cases, FIXTURE_TIMESTAMP } from './fixtures/cases'
import { serializeFrontmatter } from '../src/frontmatter'
import { markdownConsultationBody } from '../src/markdown'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

describe('markdown body fixtures', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`is byte-identical for case "${name}"`, () => {
      const body = markdownConsultationBody(query, hexagram, casting)
      const golden = readFileSync(path.join(dir, `md-body-${name}.md`), 'utf8')
      expect(body).toBe(golden)
    })
  }
})

describe('full markdown file fixtures', () => {
  for (const { name, query, hexagram, casting } of cases) {
    it(`is byte-identical for case "${name}"`, () => {
      const text = serializeFrontmatter(
        {
          schemaVersion: 1,
          timestamp: FIXTURE_TIMESTAMP,
          query,
          hexagram,
          casting,
        },
        markdownConsultationBody(query, hexagram, casting),
      )
      const golden = readFileSync(path.join(dir, `md-file-${name}.md`), 'utf8')
      expect(text).toBe(golden)
    })
  }
})
```

- [ ] **Step 6: Run the test to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS for all eight byte-identity assertions.

- [ ] **Step 7: Add `generate-fixtures` to turbo root scripts**

Edit `package.json` (root) — replace the `generate-fixtures` line:

```json
    "generate-fixtures": "turbo run generate-fixtures --filter=@hexagram/viewer-ui --filter=@hexagram/consultation"
```

(After the rename in Phase 5 it becomes `--filter=@hexagram/casting-ui --filter=@hexagram/consultation`.)

- [ ] **Step 8: Commit**

```bash
git add packages/consultation package.json
git commit -m "feat(consultation): add markdown body + full-file byte-locked fixtures

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — File I/O layer

### Task 8: Implement `saveConsultationFile` and `loadConsultationFile`

**Files:**

- Create: `packages/consultation/src/file.ts`
- Create: `packages/consultation/src/utils-timestamp.ts`
- Create: `packages/consultation/tests/file.test.ts`

- [ ] **Step 1: Move `getFilesystemSafeTimestamp` here**

`packages/consultation/src/utils-timestamp.ts`:

```ts
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
dayjs.extend(timezone)

/** Filename-safe local timestamp, e.g. `2026-05-19T14-23-11+0800`. */
export function getFilesystemSafeTimestamp(): string {
  return dayjs().format('YYYY-MM-DDTHH-mm-ssZZ')
}

/**
 * ISO-8601 local timestamp suitable for the frontmatter `timestamp` field,
 * e.g. `2026-05-19T14:23:11+0800`. Note: colons in the time portion (the
 * filename version replaces them with `-` for filesystem safety).
 */
export function getIsoTimestamp(): string {
  return dayjs().format('YYYY-MM-DDTHH:mm:ssZZ')
}
```

- [ ] **Step 2: Add file I/O failing test**

`packages/consultation/tests/file.test.ts`:

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadConsultationFile, saveConsultationFile } from '../src/file'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'consultation-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('saveConsultationFile + loadConsultationFile', () => {
  it('saves a .md file with frontmatter and round-trips through the parser', async () => {
    const savedPath = await saveConsultationFile({
      query: 'Will it rain?',
      hexagram: [7, 8, 7, 8, 7, 8],
      casting: [
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
      ],
      dir: tmpDir,
    })

    expect(savedPath).toMatch(/consultation-.*\.md$/)
    const loaded = await loadConsultationFile(savedPath)
    if (!loaded.ok) throw new Error(`expected ok, got ${loaded.reason}`)
    expect(loaded.envelope.query).toBe('Will it rain?')
    expect(loaded.envelope.hexagram).toEqual([7, 8, 7, 8, 7, 8])
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: FAIL — `../src/file` doesn't exist.

- [ ] **Step 4: Implement**

`packages/consultation/src/file.ts`:

```ts
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import type { CastingRecord, Hexagram } from '@hexagram/types'

import {
  CURRENT_SCHEMA_VERSION,
  parseFrontmatter,
  serializeFrontmatter,
  type ConsultationEnvelope,
  type ParseFailureReason,
} from './frontmatter.js'
import { markdownConsultationBody } from './markdown.js'
import {
  getFilesystemSafeTimestamp,
  getIsoTimestamp,
} from './utils-timestamp.js'

export type LoadResult =
  | {
      ok: true
      envelope: ConsultationEnvelope
      body: string
      path: string
    }
  | { ok: false; reason: ParseFailureReason | 'io-error'; path: string }

/**
 * Persist a consultation as `consultation-<timestamp>.md` under `dir`.
 *
 * @param params.dir Defaults to `<cwd>/consultations` (matches the legacy
 *   path; the caller's cwd is the convention every CLI inherited from
 *   the original implementation).
 */
export async function saveConsultationFile(params: {
  query: string
  hexagram: Hexagram
  casting: CastingRecord
  dir?: string
}): Promise<string> {
  const dir = params.dir ?? path.join(process.cwd(), 'consultations')
  await fs.mkdir(dir, { recursive: true })
  const fileSafe = getFilesystemSafeTimestamp()
  const filePath = path.join(dir, `consultation-${fileSafe}.md`)
  const body = markdownConsultationBody(
    params.query,
    params.hexagram,
    params.casting,
  )
  const text = serializeFrontmatter(
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: getIsoTimestamp(),
      query: params.query,
      hexagram: params.hexagram,
      casting: params.casting,
    },
    body,
  )
  await fs.writeFile(filePath, text, 'utf8')
  return filePath
}

/**
 * Read and parse a single `.md` consultation file. Surfaces every parse-time
 * failure as a tagged `ok: false` result so the history list can show
 * `[unreadable — <reason>]` instead of throwing.
 */
export async function loadConsultationFile(
  filePath: string,
): Promise<LoadResult> {
  let text: string
  try {
    text = await fs.readFile(filePath, 'utf8')
  } catch {
    return { ok: false, reason: 'io-error', path: filePath }
  }
  const parsed = parseFrontmatter(text)
  if (!parsed.ok) return { ok: false, reason: parsed.reason, path: filePath }
  return {
    ok: true,
    envelope: parsed.data.envelope,
    body: parsed.data.body,
    path: filePath,
  }
}
```

- [ ] **Step 5: Run to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 6: Re-export from index**

Append to `packages/consultation/src/index.ts`:

```ts
export {
  loadConsultationFile,
  saveConsultationFile,
  type LoadResult,
} from './file.js'
export {
  getFilesystemSafeTimestamp,
  getIsoTimestamp,
} from './utils-timestamp.js'
```

- [ ] **Step 7: Commit**

```bash
git add packages/consultation
git commit -m "feat(consultation): add saveConsultationFile + loadConsultationFile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Rename `@hexagram/viewer-ui` → `@hexagram/casting-ui`, switch save path

Pure plumbing — names and imports only. The package's behaviour stays identical; only its name and the dependency that owns "save the file" changes.

### Task 9: Move files out of `viewer-ui` into `consultation` + delete what's gone

**Files:**

- Delete (later, end of Task 11): `packages/viewer-ui/src/output-file.ts`
- Delete (later, end of Task 11): `packages/viewer-ui/src/utils-dayjs.ts`
- Delete (later, end of Task 11): `packages/viewer-ui/tests/output-file.test.ts`

No action in this task — these deletions are sequenced into Task 11 once their replacements are wired up.

(Skip-check: just a placeholder so the task numbering doesn't gap; no code, no test, no commit.)

### Task 10: Rename `@hexagram/viewer-ui` package directory and `name` field

**Files:**

- Rename: `packages/viewer-ui/` → `packages/casting-ui/` (whole directory)
- Modify: `packages/casting-ui/package.json` (`name`: `@hexagram/casting-ui`; `description` rephrased; add `@hexagram/consultation` dep; drop `dayjs`)
- Modify: `apps/cli/package.json` (`@hexagram/viewer-ui` → `@hexagram/casting-ui`)
- Modify: `package.json` (root): `generate-fixtures` filter
- Modify: `apps/cli/src/random.ts`, `apps/cli/src/interactive.ts`: import path
- Modify: `AGENTS.md`: references to package name and file paths

- [ ] **Step 1: Move the directory**

```bash
git mv packages/viewer-ui packages/casting-ui
```

- [ ] **Step 2: Update `packages/casting-ui/package.json`**

Use the Edit tool. Replace `"name": "@hexagram/viewer-ui"` → `"name": "@hexagram/casting-ui"`. Replace the `"description"` field with `"Terminal UI for the Yijing hexagram oracle (casting flow): Ink-based tabbed viewer, Inquirer fallback flow, and ANSI section renderers"`. Add `"@hexagram/consultation": "workspace:*"` to `dependencies`. Remove `"dayjs": "^1.11.20"` from `dependencies`.

- [ ] **Step 3: Update `apps/cli/package.json`**

Replace `"@hexagram/viewer-ui": "workspace:*"` → `"@hexagram/casting-ui": "workspace:*"`.

- [ ] **Step 4: Update CLI source imports**

In both `apps/cli/src/random.ts` and `apps/cli/src/interactive.ts`, change every `from '@hexagram/viewer-ui'` to `from '@hexagram/casting-ui'`.

- [ ] **Step 5: Update root `package.json` `generate-fixtures`**

Replace:

```json
    "generate-fixtures": "turbo run generate-fixtures --filter=@hexagram/viewer-ui --filter=@hexagram/consultation"
```

with:

```json
    "generate-fixtures": "turbo run generate-fixtures --filter=@hexagram/casting-ui --filter=@hexagram/consultation"
```

- [ ] **Step 6: Re-link the workspace**

```bash
pnpm install
```

Expected: pnpm relinks; no version errors.

- [ ] **Step 7: Run full type-check and tests as smoke**

```bash
pnpm type:check
pnpm test
```

Expected: passes (the package internals haven't changed, only the name).

- [ ] **Step 8: Update `AGENTS.md`**

Edit `AGENTS.md`:

- Replace every `viewer-ui` (path) with `casting-ui`.
- Replace every `@hexagram/viewer-ui` with `@hexagram/casting-ui`.
- Don't change the architectural description of "Ink viewer (default)" — that's still accurate.

- [ ] **Step 9: Commit**

```bash
git add packages/casting-ui apps/cli AGENTS.md package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
refactor(monorepo): rename @hexagram/viewer-ui → @hexagram/casting-ui

Pure rename: package name, directory, and import paths. No behavior change.
EOF
)"
```

### Task 11: Swap `casting-ui` to save via `@hexagram/consultation/file`

**Files:**

- Modify: `packages/casting-ui/src/viewer.tsx` (imports: `consultationFileOutput` → `saveConsultationFile`; call shape)
- Modify: `packages/casting-ui/src/index.ts` (drop `consultationFileOutput` re-export and `logAndSaveConsultationOutput`; add a new combined helper, or refactor callers)
- Modify: `apps/cli/src/random.ts` and `apps/cli/src/interactive.ts` (replace `logAndSaveConsultationOutput` call with a new helper that prints the ANSI output then calls `saveConsultationFile`)
- Delete: `packages/casting-ui/src/output-file.ts`
- Delete: `packages/casting-ui/src/utils-dayjs.ts`
- Delete: `packages/casting-ui/tests/output-file.test.ts`

- [ ] **Step 1: Add a new shim that keeps the plain-mode "print + save" behavior**

Create `packages/casting-ui/src/log-and-save.ts`:

```ts
import type { CastingRecord, Hexagram } from '@hexagram/types'
import { saveConsultationFile } from '@hexagram/consultation/file'

import { consultationConsoleOutput } from './output-composers.js'
import { BOLD_GREY, NORMAL } from './output-palette.js'

/**
 * Plain-mode terminal flow: print the ANSI-styled console output, then save
 * the `.md` consultation file. Drop-in replacement for the previous
 * `logAndSaveConsultationOutput`, which wrote a stripped-ANSI `.txt`.
 */
export async function logAndSaveConsultationOutput(
  question: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): Promise<void> {
  const consoleOutput = consultationConsoleOutput(question, hexagram, casting)
  console.clear()
  console.info(consoleOutput)
  const filePath = await saveConsultationFile({
    query: question,
    hexagram,
    casting,
  })
  console.info('')
  console.info(`${BOLD_GREY}Consultation output saved to ${filePath}.${NORMAL}`)
  console.info('')
}
```

- [ ] **Step 2: Update `packages/casting-ui/src/index.ts`**

Edit the export block:

- Remove the entire block exporting `consultationFileOutput, logAndSaveConsultationOutput` from `./output-file.js`.
- Replace with `export { logAndSaveConsultationOutput } from './log-and-save.js'`.

- [ ] **Step 3: Update `packages/casting-ui/src/viewer.tsx`**

Change the import from `./output-file.js` to:

```ts
import { saveConsultationFile } from '@hexagram/consultation/file'
```

Inside the compute effect, replace:

```ts
const savedPath = await consultationFileOutput(plainOutput)
```

with:

```ts
const savedPath = await saveConsultationFile({
  query: state.query,
  hexagram,
  casting,
})
```

Also remove the now-unused `consultationConsoleOutput`-for-the-saved-file plumbing if the compute effect still computes it for screen-display purposes — keep it ONLY if `plainOutput` is still consumed elsewhere in the effect. (It isn't — the `sections` value drives the in-viewer rendering. Drop the `plainOutput` local.)

- [ ] **Step 4: Delete the obsolete files**

```bash
rm packages/casting-ui/src/output-file.ts
rm packages/casting-ui/src/utils-dayjs.ts
rm packages/casting-ui/tests/output-file.test.ts
```

- [ ] **Step 5: Run the casting-ui tests**

```bash
pnpm --filter @hexagram/casting-ui test
```

Expected: PASS. (The viewer tests likely stub the file save; if any test now fails because it relied on a `.txt` path or expected `consultationFileOutput`, update the test to stub `saveConsultationFile` from `@hexagram/consultation/file` and assert a `.md` path.)

- [ ] **Step 6: Run all tests + type-check**

```bash
pnpm type:check
pnpm test
```

Expected: PASS across the workspace.

- [ ] **Step 7: Commit**

```bash
git add packages/casting-ui apps/cli
git commit -m "$(cat <<'EOF'
refactor(casting-ui): save consultations as .md via @hexagram/consultation

Replaces output-file.ts (.txt with stripped ANSI) with saveConsultationFile from
@hexagram/consultation/file. utils-dayjs.ts moved there too. Plain-mode print
behaviour preserved via the new log-and-save shim.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — Legacy `.txt` → `.md` converter

### Task 12: Implement reverse-parser

The legacy converter parses an existing `consultations/*.txt` file and produces `{ query, hexagram, casting, timestamp }`. Two on-disk shapes exist:

**Shape A (newer — what current byte-locked fixtures use):**

- `QUERY:` block, `CASTING:` table (the hierarchical box-drawing block), `TRANSFORMATION:`, `STANDING HEXAGRAM <N>:`, `(First is line at bottom)` followed by `<L1>, <L2>, …, <L6>`.

**Shape B (older — present in the existing `consultations/` directory):**

- `QUERY:` block, then directly `HEXAGRAM <N>:` (no CASTING table, no TRANSFORMATION, no STANDING/EMERGING split), `(First is line at bottom)` followed by `<L1>, ..., <L6>`.

The converter must handle both. When CASTING is absent, the casting is **unrecoverable**; we synthesize a placeholder casting (all `{ pick: 0, max: 0 }`) and set the body re-render to flag this clearly.

**Files:**

- Create: `packages/consultation/src/legacy-converter.ts`
- Create: `packages/consultation/tests/legacy-converter.test.ts`
- Create: `packages/consultation/tests/fixtures/legacy-txt-fixture-one-moving.txt` (copied from `packages/casting-ui/tests/fixtures/plain-output-one-moving.txt`)

- [ ] **Step 1: Copy the Shape A fixture for round-trip locking**

```bash
cp packages/casting-ui/tests/fixtures/plain-output-one-moving.txt \
   packages/consultation/tests/fixtures/legacy-txt-fixture-one-moving.txt
cp packages/casting-ui/tests/fixtures/plain-output-no-moving.txt \
   packages/consultation/tests/fixtures/legacy-txt-fixture-no-moving.txt
cp packages/casting-ui/tests/fixtures/plain-output-multi-moving.txt \
   packages/consultation/tests/fixtures/legacy-txt-fixture-multi-moving.txt
cp packages/casting-ui/tests/fixtures/plain-output-empty-query.txt \
   packages/consultation/tests/fixtures/legacy-txt-fixture-empty-query.txt
```

- [ ] **Step 2: Add a tiny Shape B fixture by hand**

`packages/consultation/tests/fixtures/legacy-shape-b.txt` (exact bytes — no ANSI):

```
QUERY:

  What will it be like?

HEXAGRAM 6:

(Line at bottom is first)

  9  ━━━━○━━━━  （六, 6th）──┐
  9  ━━━━○━━━━  （五, 5th）──┼── 天（上卦）
  9  ━━━━○━━━━  （四, 4th）──┘   heaven (upper trigram)
  8  ━━━   ━━━  （三, 3rd）──┐
  7  ━━━━━━━━━  （二, 2nd）──┼── 水（下卦）
  8  ━━━   ━━━  （初, 1st）──┘   water (lower trigram)

(First is line at bottom)

  8, 7, 8, 9, 9, 9

HEXAGRAM NAME AND PRONUNCIATION:

[Traditional Chinese]

  訟（ㄙㄨㄥˋ）
```

- [ ] **Step 3: Write failing tests**

`packages/consultation/tests/legacy-converter.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { convertLegacyTxt } from '../src/legacy-converter'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const read = (name: string) => readFileSync(path.join(dir, name), 'utf8')

describe('convertLegacyTxt (Shape A — current fixtures with CASTING table)', () => {
  it('recovers query, hexagram, and casting from one-moving fixture', () => {
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-one-moving.txt'),
      filenameTimestamp: '2026-01-15T18-16-38+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('Should I take the new position?')
    expect(result.envelope.hexagram).toEqual([6, 7, 8, 7, 8, 7])
    expect(result.envelope.casting[0][0]).toEqual({ pick: 5, max: 48 })
    expect(result.envelope.castingRecovered).toBe(true)
  })

  it('handles empty-query', () => {
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-empty-query.txt'),
      filenameTimestamp: '2025-08-12T07-05-56+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('')
    expect(result.envelope.hexagram).toEqual([7, 7, 7, 7, 7, 7])
  })
})

describe('convertLegacyTxt (Shape B — older format without CASTING)', () => {
  it('recovers query + hexagram, marks casting as unrecovered, fills with zeros', () => {
    const result = convertLegacyTxt({
      text: read('legacy-shape-b.txt'),
      filenameTimestamp: '2026-03-16T13-28-33+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('What will it be like?')
    expect(result.envelope.hexagram).toEqual([8, 7, 8, 9, 9, 9])
    expect(result.envelope.castingRecovered).toBe(false)
    // sentinel placeholder casting:
    expect(result.envelope.casting[0][0]).toEqual({ pick: 0, max: 0 })
  })
})

describe('convertLegacyTxt (filename → ISO timestamp)', () => {
  it('rewrites the time-portion dashes to colons', () => {
    const result = convertLegacyTxt({
      text: read('legacy-shape-b.txt'),
      filenameTimestamp: '2026-03-16T13-28-33+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.timestamp).toBe('2026-03-16T13:28:33+0800')
  })
})
```

- [ ] **Step 4: Run to verify failure**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: FAIL.

- [ ] **Step 5: Implement the converter**

`packages/consultation/src/legacy-converter.ts`:

```ts
import {
  type CastingRecord,
  type Hexagram,
  type Line,
  type LineCasting,
  isHexagram,
} from '@hexagram/types'

import type { ConsultationEnvelope } from './frontmatter.js'

// Strip ANSI SGR sequences. The new-format fixtures contain them; older
// real-world files don't.
// oxlint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g

export type LegacyEnvelope = ConsultationEnvelope & {
  castingRecovered: boolean
}

export type LegacyConvertResult =
  | { ok: true; envelope: LegacyEnvelope }
  | { ok: false; reason: 'no-hexagram-line' | 'invalid-hexagram' }

interface ConvertInput {
  text: string
  /** Filename portion like `2026-03-16T13-28-33+0800`. */
  filenameTimestamp: string
}

export function convertLegacyTxt(input: ConvertInput): LegacyConvertResult {
  const text = input.text.replaceAll(ANSI, '')
  const query = extractQuery(text)
  const hexagram = extractHexagram(text)
  if (hexagram === null) return { ok: false, reason: 'no-hexagram-line' }
  if (!isHexagram(hexagram)) return { ok: false, reason: 'invalid-hexagram' }

  const casting = extractCasting(text)
  return {
    ok: true,
    envelope: {
      schemaVersion: 1,
      timestamp: filenameTimestampToIso(input.filenameTimestamp),
      query,
      hexagram,
      casting: casting ?? sentinelCasting(),
      castingRecovered: casting !== null,
    },
  }
}

function filenameTimestampToIso(filenameTimestamp: string): string {
  // 2026-03-16T13-28-33+0800 → 2026-03-16T13:28:33+0800
  // Match the dashes only inside the time portion (after T, before the tz sign).
  return filenameTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3')
}

function extractQuery(text: string): string {
  // QUERY:\n\n  <body>\n\n
  const match = /QUERY:\s*\n\s*\n\s{2}([\s\S]*?)\n\s*\n/.exec(text)
  return (match?.[1] ?? '').trim()
}

function extractHexagram(text: string): Hexagram | null {
  // "(First is line at bottom)\n\n  <L1>, <L2>, <L3>, <L4>, <L5>, <L6>"
  const match =
    /\(First is line at bottom\)\s*\n\s*\n\s{2}(\d),\s*(\d),\s*(\d),\s*(\d),\s*(\d),\s*(\d)/.exec(
      text,
    )
  if (match === null) return null
  return match.slice(1, 7).map((n) => Number.parseInt(n, 10)) as Hexagram
}

function extractCasting(text: string): CastingRecord | null {
  // The new-format CASTING table uses lines like:
  //   │    6 │     48 │    21 │    27 │     39 │     6 │    33 │     31 │    30 │     1 │
  // 6 rows total, line numbers 6..1 (top-down). Each row has Stalks/Left/Right × 3.
  const rowRegex =
    /^│\s+(\d)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│\s+(\d+)\s+│/gm
  const rows: Record<
    number,
    [number, number, number, number, number, number, number, number, number]
  > = {}
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(text)) !== null) {
    const [, lineStr, m1, p1l, p1r, m2, p2l, p2r, m3, p3l, p3r] = match
    const line = Number.parseInt(lineStr!, 10)
    rows[line] = [
      Number.parseInt(m1!, 10),
      Number.parseInt(p1l!, 10),
      Number.parseInt(p1r!, 10),
      Number.parseInt(m2!, 10),
      Number.parseInt(p2l!, 10),
      Number.parseInt(p2r!, 10),
      Number.parseInt(m3!, 10),
      Number.parseInt(p3l!, 10),
      Number.parseInt(p3r!, 10),
    ]
  }
  if ([1, 2, 3, 4, 5, 6].some((line) => rows[line] === undefined)) return null
  const lineCasting = (line: number): LineCasting => {
    const r = rows[line]!
    return [
      { pick: r[1], max: r[0] },
      { pick: r[4], max: r[3] },
      { pick: r[7], max: r[6] },
    ]
  }
  return [
    lineCasting(1),
    lineCasting(2),
    lineCasting(3),
    lineCasting(4),
    lineCasting(5),
    lineCasting(6),
  ]
}

function sentinelCasting(): CastingRecord {
  const empty: LineCasting = [
    { pick: 0, max: 0 },
    { pick: 0, max: 0 },
    { pick: 0, max: 0 },
  ]
  return [empty, empty, empty, empty, empty, empty]
}
```

- [ ] **Step 6: Run to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 7: Add a round-trip test for Shape A → frontmatter+body → `.md` fixture**

Append to `packages/consultation/tests/legacy-converter.test.ts`:

```ts
import { serializeFrontmatter } from '../src/frontmatter'
import { markdownConsultationBody } from '../src/markdown'

describe('Shape A converted → md round-trips through serialize', () => {
  it('produces a parseable .md when fed back through serializeFrontmatter', () => {
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-one-moving.txt'),
      filenameTimestamp: '2026-01-15T18-16-38+0800',
    })
    if (!result.ok) throw new Error(result.reason)
    const { castingRecovered, ...envelope } = result.envelope
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      envelope.casting,
    )
    const md = serializeFrontmatter(envelope, body)
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toContain('## CASTING')
    expect(castingRecovered).toBe(true)
  })
})
```

- [ ] **Step 8: Run to verify pass**

```bash
pnpm --filter @hexagram/consultation test
```

Expected: PASS.

- [ ] **Step 9: Re-export and commit**

Append to `packages/consultation/src/index.ts`:

```ts
export {
  convertLegacyTxt,
  type LegacyConvertResult,
  type LegacyEnvelope,
} from './legacy-converter.js'
```

```bash
git add packages/consultation
git commit -m "feat(consultation): add legacy .txt → .md converter (Shape A + Shape B)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — `@hexagram/history-ui` package

### Task 13: Scaffold the package

**Files:**

- Create: `packages/history-ui/package.json`
- Create: `packages/history-ui/tsconfig.json`
- Create: `packages/history-ui/tsdown.config.ts`
- Create: `packages/history-ui/src/index.ts`
- Create: `packages/history-ui/tests/.gitkeep`

- [ ] **Step 1: Create `packages/history-ui/package.json`**

```json
{
  "name": "@hexagram/history-ui",
  "type": "module",
  "version": "0.0.0",
  "description": "Terminal UI for the Yijing hexagram oracle (history flow): Ink-based browser for saved consultations",
  "license": "MIT",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsdown",
    "test": "vitest run --passWithNoTests",
    "type:check": "tsc --noEmit"
  },
  "dependencies": {
    "@hexagram/consultation": "workspace:*",
    "@hexagram/core": "workspace:*",
    "@hexagram/types": "workspace:*",
    "ink": "^7.0.3",
    "react": "^19.2.6"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "ink-testing-library": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/history-ui/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `packages/history-ui/tsdown.config.ts`**

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'node',
})
```

- [ ] **Step 4: Create empty `packages/history-ui/src/index.ts`**

```ts
export {}
```

- [ ] **Step 5: Install + smoke**

```bash
pnpm install
pnpm --filter @hexagram/history-ui type:check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/history-ui pnpm-lock.yaml
git commit -m "feat(history-ui): scaffold @hexagram/history-ui package

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 14: Implement `scanConsultations(dir)`

**Files:**

- Create: `packages/history-ui/src/history-scan.ts`
- Create: `packages/history-ui/tests/history-scan.test.ts`

- [ ] **Step 1: Add failing tests**

`packages/history-ui/tests/history-scan.test.ts`:

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  saveConsultationFile,
  serializeFrontmatter,
} from '@hexagram/consultation'
import { scanConsultations } from '../src/history-scan'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-scan-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('scanConsultations', () => {
  it('returns [] for an empty dir', async () => {
    const result = await scanConsultations(tmpDir)
    expect(result.entries).toEqual([])
    expect(result.unreadable).toEqual([])
  })

  it('returns entries sorted by timestamp descending', async () => {
    // Write three files with controllable timestamps via serializeFrontmatter directly.
    const mkFile = async (ts: string, query: string) => {
      const text = serializeFrontmatter(
        {
          schemaVersion: 1,
          timestamp: ts,
          query,
          hexagram: [7, 8, 7, 8, 7, 8],
          casting: [
            [
              { pick: 1, max: 48 },
              { pick: 2, max: 43 },
              { pick: 3, max: 39 },
            ],
            [
              { pick: 1, max: 48 },
              { pick: 2, max: 43 },
              { pick: 3, max: 39 },
            ],
            [
              { pick: 1, max: 48 },
              { pick: 2, max: 43 },
              { pick: 3, max: 39 },
            ],
            [
              { pick: 1, max: 48 },
              { pick: 2, max: 43 },
              { pick: 3, max: 39 },
            ],
            [
              { pick: 1, max: 48 },
              { pick: 2, max: 43 },
              { pick: 3, max: 39 },
            ],
            [
              { pick: 1, max: 48 },
              { pick: 2, max: 43 },
              { pick: 3, max: 39 },
            ],
          ],
        },
        'BODY',
      )
      await fs.writeFile(
        path.join(tmpDir, `consultation-${ts.replaceAll(':', '-')}.md`),
        text,
        'utf8',
      )
    }
    await mkFile('2026-01-01T10:00:00+0800', 'first')
    await mkFile('2026-03-01T10:00:00+0800', 'third')
    await mkFile('2026-02-01T10:00:00+0800', 'second')
    const result = await scanConsultations(tmpDir)
    expect(result.entries.map((e) => e.envelope.query)).toEqual([
      'third',
      'second',
      'first',
    ])
  })

  it('ignores the legacy/ subdir', async () => {
    await fs.mkdir(path.join(tmpDir, 'legacy'))
    await fs.writeFile(
      path.join(tmpDir, 'legacy', 'foo.md'),
      'whatever',
      'utf8',
    )
    const result = await scanConsultations(tmpDir)
    expect(result.entries).toEqual([])
  })

  it('reports unreadable rows when frontmatter is bad', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'consultation-2026-01-01T10-00-00+0800.md'),
      '# no frontmatter here',
      'utf8',
    )
    const result = await scanConsultations(tmpDir)
    expect(result.entries).toEqual([])
    expect(result.unreadable.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @hexagram/history-ui test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`packages/history-ui/src/history-scan.ts`:

```ts
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  loadConsultationFile,
  type ConsultationEnvelope,
  type ParseFailureReason,
} from '@hexagram/consultation'

export interface HistoryEntry {
  path: string
  envelope: ConsultationEnvelope
  body: string
}

export interface UnreadableEntry {
  path: string
  reason: ParseFailureReason | 'io-error'
}

export interface ScanResult {
  entries: HistoryEntry[]
  unreadable: UnreadableEntry[]
}

/**
 * Walk `<dir>/*.md` (NOT `<dir>/legacy/`), parse each frontmatter envelope,
 * sort readable entries newest-first by `envelope.timestamp`.
 */
export async function scanConsultations(dir: string): Promise<ScanResult> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return { entries: [], unreadable: [] }
  }
  const mdFiles = names
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name))

  const entries: HistoryEntry[] = []
  const unreadable: UnreadableEntry[] = []

  await Promise.all(
    mdFiles.map(async (filePath) => {
      const result = await loadConsultationFile(filePath)
      if (result.ok) {
        entries.push({
          path: result.path,
          envelope: result.envelope,
          body: result.body,
        })
      } else {
        unreadable.push({ path: result.path, reason: result.reason })
      }
    }),
  )

  // Newest first.
  entries.sort((a, b) => (a.envelope.timestamp < b.envelope.timestamp ? 1 : -1))
  return { entries, unreadable }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @hexagram/history-ui test
```

Expected: PASS.

- [ ] **Step 5: Re-export and commit**

`packages/history-ui/src/index.ts`:

```ts
export {
  scanConsultations,
  type HistoryEntry,
  type ScanResult,
  type UnreadableEntry,
} from './history-scan.js'
```

```bash
git add packages/history-ui
git commit -m "feat(history-ui): add scanConsultations directory walker

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 15: Implement `<HistoryList>` component (rendering + key handling)

**Files:**

- Create: `packages/history-ui/src/history-list.tsx`
- Create: `packages/history-ui/tests/history-list.test.tsx`

- [ ] **Step 1: Add failing tests using `ink-testing-library`**

`packages/history-ui/tests/history-list.test.tsx`:

```ts
import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'
import React from 'react'

import { HistoryList } from '../src/history-list'

const fakeEntries = [
  {
    path: '/x/a.md',
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-03-16T13:28:33+0800',
      query: 'What will working with Raven be like?',
      hexagram: [8, 7, 8, 9, 9, 9] as const,
      casting: [] as never,
    },
    body: '',
  },
  {
    path: '/x/b.md',
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-01-15T18:16:38+0800',
      query: 'Should I study full-time or part-time?',
      hexagram: [8, 8, 6, 8, 8, 8] as const,
      casting: [] as never,
    },
    body: '',
  },
]

describe('<HistoryList>', () => {
  it('renders an empty-state line when entries are empty', () => {
    const { lastFrame } = render(
      <HistoryList entries={[]} unreadable={[]} cols={80} onPick={() => {}} />,
    )
    expect(lastFrame()).toContain('No consultations yet')
  })

  it('renders one two-line row per entry, newest first', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame.indexOf('2026-03-16 13:28')).toBeLessThan(
      frame.indexOf('2026-01-15 18:16'),
    )
    // Hex order: standing then "──▶" emerging suffix (for moving lines).
    expect(frame).toMatch(/#\d+/)
  })

  it('truncates long queries to cols - 22', () => {
    const longQuery = 'x'.repeat(200)
    const { lastFrame } = render(
      <HistoryList
        entries={[{ ...fakeEntries[0]!, envelope: { ...fakeEntries[0]!.envelope, query: longQuery } }]}
        unreadable={[]}
        cols={50}
        onPick={() => {}}
      />,
    )
    expect((lastFrame() ?? '').split('\n')[0]!.length).toBeLessThanOrEqual(50)
  })
})
```

(The two-line rendering, focus highlighting, filter mode, unreadable rendering, and live-filter-input handling are scope-bounded into one component — keep it cohesive but each behavior gets at least one assertion.)

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @hexagram/history-ui test
```

Expected: FAIL.

- [ ] **Step 3: Implement `<HistoryList>`**

`packages/history-ui/src/history-list.tsx`:

```tsx
import { getHexagramRecord, getEmergingHexagram } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import { Box, Text, useInput } from 'ink'
import { useMemo, useReducer, type ReactElement } from 'react'

import type { HistoryEntry, UnreadableEntry } from './history-scan.js'

interface HistoryListProps {
  entries: HistoryEntry[]
  unreadable: UnreadableEntry[]
  cols: number
  onPick: (entry: HistoryEntry) => void
}

interface State {
  focus: number
  filterMode: boolean
  filter: string
}
type Action =
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'pageUp'; size: number }
  | { type: 'pageDown'; size: number }
  | { type: 'first' }
  | { type: 'last'; size: number }
  | { type: 'filterEnter' }
  | { type: 'filterExit' }
  | { type: 'filterChange'; value: string }
  | { type: 'clamp'; size: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'up':
      return { ...state, focus: Math.max(0, state.focus - 1) }
    case 'down':
      return { ...state, focus: state.focus + 1 }
    case 'pageUp':
      return { ...state, focus: Math.max(0, state.focus - action.size) }
    case 'pageDown':
      return { ...state, focus: state.focus + action.size }
    case 'first':
      return { ...state, focus: 0 }
    case 'last':
      return { ...state, focus: Math.max(0, action.size - 1) }
    case 'filterEnter':
      return { ...state, filterMode: true }
    case 'filterExit':
      return { ...state, filterMode: false, filter: '' }
    case 'filterChange':
      return { ...state, filter: action.value, focus: 0 }
    case 'clamp':
      return {
        ...state,
        focus: Math.min(state.focus, Math.max(0, action.size - 1)),
      }
  }
}

function shortenTimestamp(iso: string): string {
  // "2026-03-16T13:28:33+0800" → "2026-03-16 13:28"
  return iso.slice(0, 10) + ' ' + iso.slice(11, 16)
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, Math.max(0, max - 1)) + '…'
}

function summarizeHex(hexagram: Hexagram): string {
  const standing = getHexagramRecord(hexagram)
  const hasMoving = hexagram.some((line) => line === 6 || line === 9)
  const left = `#${standing.Metadata.Order.WenWang} ${standing.Name.Chinese.Traditional} ${standing.Name.English.WilhelmBaynes.split(' / ')[0] ?? standing.Name.English.WilhelmBaynes}`
  if (!hasMoving) return left
  const emerging = getHexagramRecord(getEmergingHexagram(hexagram))
  const right = `#${emerging.Metadata.Order.WenWang} ${emerging.Name.Chinese.Traditional} ${emerging.Name.English.WilhelmBaynes.split(' / ')[0] ?? emerging.Name.English.WilhelmBaynes}`
  return `${left} ──▶ ${right}`
}

export function HistoryList({
  entries,
  unreadable,
  cols,
  onPick,
}: HistoryListProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, {
    focus: 0,
    filterMode: false,
    filter: '',
  })

  const filtered = useMemo(() => {
    if (state.filter.length === 0) return entries
    const needle = state.filter.toLowerCase()
    return entries.filter((e) =>
      e.envelope.query.toLowerCase().includes(needle),
    )
  }, [entries, state.filter])

  useInput((input, key) => {
    if (state.filterMode) {
      if (key.escape) {
        dispatch({ type: 'filterExit' })
        return
      }
      if (key.return) {
        const entry = filtered[state.focus]
        if (entry !== undefined) onPick(entry)
        return
      }
      if (key.backspace || key.delete) {
        dispatch({
          type: 'filterChange',
          value: state.filter.slice(0, -1),
        })
        return
      }
      if (input.length > 0 && !key.ctrl && !key.meta) {
        dispatch({ type: 'filterChange', value: state.filter + input })
        return
      }
      return
    }
    if (input === '/') {
      dispatch({ type: 'filterEnter' })
      return
    }
    if (key.upArrow) dispatch({ type: 'up' })
    else if (key.downArrow) dispatch({ type: 'down' })
    else if (key.pageUp) dispatch({ type: 'pageUp', size: 10 })
    else if (key.pageDown) dispatch({ type: 'pageDown', size: 10 })
    else if (input === 'g') dispatch({ type: 'first' })
    else if (input === 'G') dispatch({ type: 'last', size: filtered.length })
    else if (key.return) {
      const entry = filtered[state.focus]
      if (entry !== undefined) onPick(entry)
    }
  })

  // Empty state.
  if (entries.length === 0 && unreadable.length === 0) {
    return (
      <Box>
        <Text>
          No consultations yet. Run hexagram-random or hexagram-interactive
          first.
        </Text>
      </Box>
    )
  }

  const focus = Math.min(state.focus, Math.max(0, filtered.length - 1))

  const rows = filtered.map((entry, index) => {
    const isFocused = index === focus
    const head = `[${shortenTimestamp(entry.envelope.timestamp)}] ${truncate(
      entry.envelope.query.length > 0 ? entry.envelope.query : '(no query)',
      Math.max(10, cols - 22),
    )}`
    const summary = `  ${summarizeHex(entry.envelope.hexagram)}`
    return (
      <Box key={entry.path} flexDirection="column">
        <Text inverse={isFocused}>{head}</Text>
        <Text inverse={isFocused}>{summary}</Text>
      </Box>
    )
  })

  return (
    <Box flexDirection="column">
      {state.filterMode ? (
        <Text>
          Filter: <Text bold>{state.filter}</Text>_ (ESC to clear)
        </Text>
      ) : null}
      {rows}
      {unreadable.map((u) => (
        <Box key={u.path}>
          <Text dimColor>
            [unreadable — {u.reason}] {u.path}
          </Text>
        </Box>
      ))}
    </Box>
  )
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @hexagram/history-ui test
```

Expected: PASS.

- [ ] **Step 5: Re-export from index**

Append to `packages/history-ui/src/index.ts`:

```ts
export { HistoryList } from './history-list.js'
```

- [ ] **Step 6: Commit**

```bash
git add packages/history-ui
git commit -m "feat(history-ui): add <HistoryList> Ink component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 16: Implement the history flow runner

`runHistoryViewer({ dir })` mounts an Ink app that:

1. Mounts `<HistoryList>` over the scan result.
2. On Enter, loads the picked file, re-renders the body from the envelope via `markdownConsultationBody`, byte-compares with disk, and rewrites if different.
3. Shows the re-rendered body and the loaded envelope; ESC returns to the list.
4. ESC from the list exits the app.

The render of "the loaded entry" is intentionally simple: a paged text view of the freshly-rendered Markdown body, with the four envelope fields shown above it. (We deliberately do NOT reuse `<ConsultationViewer>`'s tabbed layout — that's casting-side; history can stay simpler.)

**Files:**

- Create: `packages/history-ui/src/history-app.tsx`
- Create: `packages/history-ui/src/run-history-viewer.ts`
- Create: `packages/history-ui/tests/run-history-viewer.test.ts`

- [ ] **Step 1: Add failing test for the rewrite-on-load behavior**

`packages/history-ui/tests/run-history-viewer.test.ts`:

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  markdownConsultationBody,
  serializeFrontmatter,
} from '@hexagram/consultation'
import { rerenderOnDisk } from '../src/history-app'

let tmpDir: string
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-rerender-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('rerenderOnDisk', () => {
  it('rewrites a file whose body diverges from the renderer', async () => {
    const envelope = {
      schemaVersion: 1,
      timestamp: '2026-05-19T14:23:11+0800',
      query: 'Q',
      hexagram: [7, 8, 7, 8, 7, 8] as const,
      casting: [
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
      ],
    }
    const filePath = path.join(tmpDir, 'consultation.md')
    // Write with a STALE body.
    await fs.writeFile(
      filePath,
      serializeFrontmatter(envelope, 'STALE BODY'),
      'utf8',
    )
    const r = await rerenderOnDisk(filePath, envelope as never)
    expect(r.rewrote).toBe(true)
    const after = await fs.readFile(filePath, 'utf8')
    expect(after).toContain('## QUERY')
  })

  it('leaves a file untouched if the body already matches', async () => {
    const envelope = {
      schemaVersion: 1,
      timestamp: '2026-05-19T14:23:11+0800',
      query: 'Q',
      hexagram: [7, 8, 7, 8, 7, 8] as const,
      casting: [
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
      ],
    }
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      envelope.casting,
    )
    const filePath = path.join(tmpDir, 'consultation.md')
    await fs.writeFile(filePath, serializeFrontmatter(envelope, body), 'utf8')
    const before = await fs.readFile(filePath, 'utf8')
    const r = await rerenderOnDisk(filePath, envelope as never)
    expect(r.rewrote).toBe(false)
    const after = await fs.readFile(filePath, 'utf8')
    expect(after).toBe(before)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @hexagram/history-ui test
```

Expected: FAIL.

- [ ] **Step 3: Implement `rerenderOnDisk` and the app harness**

`packages/history-ui/src/history-app.tsx`:

```tsx
import fs from 'node:fs/promises'

import {
  markdownConsultationBody,
  serializeFrontmatter,
  type ConsultationEnvelope,
} from '@hexagram/consultation'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import { useEffect, useState, type ReactElement } from 'react'

import { HistoryList } from './history-list.js'
import { scanConsultations, type HistoryEntry } from './history-scan.js'

export async function rerenderOnDisk(
  filePath: string,
  envelope: ConsultationEnvelope,
): Promise<{ rewrote: boolean; body: string }> {
  const body = markdownConsultationBody(
    envelope.query,
    envelope.hexagram,
    envelope.casting,
  )
  const desired = serializeFrontmatter(envelope, body)
  const current = await fs.readFile(filePath, 'utf8')
  if (current === desired) return { rewrote: false, body }
  await fs.writeFile(filePath, desired, 'utf8')
  return { rewrote: true, body }
}

type AppState =
  | { mode: 'list' }
  | {
      mode: 'view'
      entry: HistoryEntry
      body: string
      rewroteOnLoad: boolean
    }

export function HistoryApp({ dir }: { dir: string }): ReactElement {
  const { exit } = useApp()
  const { columns } = useWindowSize()
  const cols = columns || 80
  const [scan, setScan] = useState<{
    entries: HistoryEntry[]
    unreadable: { path: string; reason: string }[]
  } | null>(null)
  const [state, setState] = useState<AppState>({ mode: 'list' })

  useEffect(() => {
    scanConsultations(dir)
      .then(setScan)
      .catch(() => setScan({ entries: [], unreadable: [] }))
  }, [dir])

  useInput((_input, key) => {
    if (key.escape || (key.ctrl && _input === 'c')) {
      if (state.mode === 'view') {
        setState({ mode: 'list' })
        return
      }
      exit()
    }
  })

  if (scan === null) {
    return (
      <Box>
        <Text>Loading consultations from {dir}…</Text>
      </Box>
    )
  }

  if (state.mode === 'list') {
    return (
      <HistoryList
        entries={scan.entries}
        unreadable={scan.unreadable as never}
        cols={cols}
        onPick={(entry) => {
          rerenderOnDisk(entry.path, entry.envelope)
            .then((r) => {
              setState({
                mode: 'view',
                entry,
                body: r.body,
                rewroteOnLoad: r.rewrote,
              })
            })
            .catch(() => {})
        }}
      />
    )
  }

  return (
    <Box flexDirection="column">
      <Text>
        {state.entry.envelope.timestamp} · {state.entry.envelope.query}
      </Text>
      {state.rewroteOnLoad ? (
        <Text dimColor>(Re-rendered body to match current renderer.)</Text>
      ) : null}
      <Text>{state.body}</Text>
      <Text dimColor>ESC to return to list</Text>
    </Box>
  )
}
```

- [ ] **Step 4: Add the runner**

`packages/history-ui/src/run-history-viewer.ts`:

```ts
import path from 'node:path'
import process from 'node:process'

import { render } from 'ink'

import { HistoryApp } from './history-app.js'

export async function runHistoryViewer(args: { dir?: string }): Promise<void> {
  const dir = args.dir ?? path.join(process.cwd(), 'consultations')
  const instance = render(<HistoryApp dir={dir} />, { alternateScreen: true })
  await instance.waitUntilExit()
}
```

- [ ] **Step 5: Run to verify pass**

```bash
pnpm --filter @hexagram/history-ui test
```

Expected: PASS.

- [ ] **Step 6: Re-export from index and commit**

Append to `packages/history-ui/src/index.ts`:

```ts
export { HistoryApp, rerenderOnDisk } from './history-app.js'
export { runHistoryViewer } from './run-history-viewer.js'
```

```bash
git add packages/history-ui
git commit -m "feat(history-ui): add history app + byte-compare-on-load rewrite

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 8 — Wire up `hexagram-history` bin and migration flag

### Task 17: Add the `hexagram-history` bin

**Files:**

- Modify: `apps/cli/package.json` — add bin entry, add deps
- Modify: `apps/cli/tsdown.config.ts` — add `./src/history.ts` entry
- Modify: `package.json` (root) — add `hexagram-history` script
- Create: `apps/cli/src/history.ts`
- Create: `apps/cli/src/migrate-legacy.ts`

- [ ] **Step 1: Update `apps/cli/package.json`**

Add to `"bin"`:

```json
    "hexagram-history": "./dist/history.mjs",
```

Add to `"dependencies"`:

```json
    "@hexagram/consultation": "workspace:*",
    "@hexagram/history-ui": "workspace:*",
```

- [ ] **Step 2: Update `apps/cli/tsdown.config.ts`**

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/interactive.ts', './src/random.ts', './src/history.ts'],
  platform: 'node',
})
```

- [ ] **Step 3: Update root `package.json` scripts**

Add:

```json
    "hexagram-history": "tsx apps/cli/src/history.ts",
```

- [ ] **Step 4: Implement `migrate-legacy.ts`**

`apps/cli/src/migrate-legacy.ts`:

```ts
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  convertLegacyTxt,
  markdownConsultationBody,
  serializeFrontmatter,
} from '@hexagram/consultation'

export async function migrateLegacy(dir: string): Promise<void> {
  const entries = await fs.readdir(dir).catch(() => [])
  const legacyTxt = entries.filter(
    (n) => n.startsWith('consultation-') && n.endsWith('.txt'),
  )
  if (legacyTxt.length === 0) {
    process.stdout.write('No legacy .txt consultations to migrate.\n')
    return
  }
  const legacyDir = path.join(dir, 'legacy')
  await fs.mkdir(legacyDir, { recursive: true })
  let migrated = 0
  for (const name of legacyTxt) {
    const filePath = path.join(dir, name)
    const text = await fs.readFile(filePath, 'utf8')
    // name == consultation-YYYY-MM-DDTHH-mm-ss+ZZZZ.txt
    const filenameTimestamp = name
      .replace(/^consultation-/, '')
      .replace(/\.txt$/, '')
    const r = convertLegacyTxt({ text, filenameTimestamp })
    if (!r.ok) {
      process.stderr.write(`SKIP ${name}: ${r.reason}\n`)
      continue
    }
    const { castingRecovered, ...envelope } = r.envelope
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      envelope.casting,
    )
    const md = serializeFrontmatter(envelope, body)
    const mdPath = filePath.replace(/\.txt$/, '.md')
    await fs.writeFile(mdPath, md, 'utf8')
    await fs.rename(filePath, path.join(legacyDir, name))
    process.stdout.write(
      `OK ${name} → ${path.basename(mdPath)}${castingRecovered ? '' : ' (casting unrecovered)'}\n`,
    )
    migrated += 1
  }
  process.stdout.write(
    `\nMigrated ${migrated} files. Originals preserved in ${legacyDir}.\n`,
  )
}
```

- [ ] **Step 5: Implement `history.ts` bin entry**

`apps/cli/src/history.ts`:

```ts
#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import { runHistoryViewer } from '@hexagram/history-ui'

import { migrateLegacy } from './migrate-legacy.js'

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2)
    if (argv.includes('--convert-legacy')) {
      await migrateLegacy(path.join(process.cwd(), 'consultations'))
      process.exit(0)
    }
    const isTty = Boolean(process.stdout.isTTY)
    const noColor =
      process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== ''
    const ci = process.env.CI !== undefined && process.env.CI !== ''
    if (!isTty || noColor || ci) {
      process.stderr.write(
        'hexagram-history requires an interactive terminal\n',
      )
      process.exit(1)
    }
    await runHistoryViewer({})
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
```

- [ ] **Step 6: Re-link and type-check**

```bash
pnpm install
pnpm type:check
```

Expected: PASS.

- [ ] **Step 7: Smoke test the bin**

```bash
pnpm hexagram-history --convert-legacy
```

Expected: each `.txt` in `consultations/` is rewritten as `.md`, the original moved to `consultations/legacy/`. Print summary.

(Manually inspect the converted `.md` files — verify Shape B files have the placeholder casting + correct hexagram, and Shape A files have full casting.)

- [ ] **Step 8: Commit**

```bash
git add apps/cli package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(cli): add hexagram-history bin with --convert-legacy migration

Browser is Ink-only (non-TTY/NO_COLOR/CI exit with error). --convert-legacy
flag rewrites consultations/*.txt as .md and moves the originals into
consultations/legacy/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 9 — End-to-end smoke + lint + docs

### Task 18: Run full `pnpm check:all` and fix any drift

- [ ] **Step 1: Run the workspace check**

```bash
pnpm check:all
```

Expected: PASS across `format:check`, `lint:check`, `type:check`, `test`, `build`.

- [ ] **Step 2: If any test fails, fix root cause**

Likely culprits: missed `@hexagram/viewer-ui` → `@hexagram/casting-ui` reference in a test file; missed `dayjs` dep drop; stale `.txt` extension assertion in a casting-ui test.

- [ ] **Step 3: Commit any drift fixes**

```bash
git add .
git commit -m "$(cat <<'EOF'
fix(monorepo): clean up drift from package rename + format change

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 19: Update `AGENTS.md` with the new layout, new bin, new package boundaries

**Files:**

- Modify: `AGENTS.md`

- [ ] **Step 1: Update the "Repository layout" section**

Replace the existing `packages/` tree block with:

```
ts-hexagram-generator/         # workspace root (private)
├── packages/
│   ├── types/                 # @hexagram/types — public type defs + assertions
│   ├── core/                  # @hexagram/core — algorithm, random, getters, hexagram/trigram records
│   ├── consultation/          # @hexagram/consultation — file format (Markdown + YAML frontmatter), renderers, legacy converter
│   ├── casting-ui/            # @hexagram/casting-ui — Ink casting viewer, Inquirer flow, ANSI section renderers
│   └── history-ui/            # @hexagram/history-ui — Ink history browser
└── apps/
    └── cli/                   # @hexagram/cli (private) — hexagram-random + hexagram-interactive + hexagram-history bins
```

- [ ] **Step 2: Add a "Commands" entry for `hexagram-history`**

Add to the command block:

```bash
pnpm hexagram-history               # tsx apps/cli/src/history.ts
pnpm hexagram-history --convert-legacy  # one-shot migration of legacy .txt → .md
```

- [ ] **Step 3: Add an "Architecture" subsection for the consultation package**

Insert a section explaining:

- The frontmatter envelope (`schemaVersion`, `timestamp`, `query`, `hexagram`, `casting`) is the canonical model.
- Body is a re-render via `markdownConsultationBody`; byte-compared on load and rewritten if drifted.
- `casting` is YAML-keyed `L6..L1` (visual top-first); in-memory `CastingRecord` is bottom-first; converter inverts at the boundary.
- Legacy `.txt` → `.md` conversion is one-shot via `pnpm hexagram-history --convert-legacy`. Originals preserved in `consultations/legacy/`.

- [ ] **Step 4: Mention the new byte-locked fixtures**

In the "the `--plain` output (and the saved file) is locked byte-for-byte by fixtures…" paragraph, append a sentence:

> The `.md` save output (frontmatter + body) is locked byte-for-byte by fixtures in `packages/consultation/tests/fixtures/` — regenerate both sets together with `pnpm generate-fixtures` after intentionally changing a section builder.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "$(cat <<'EOF'
docs(monorepo): document Markdown consultations + history CLI + 3-package split

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Checklist (run before declaring complete)

**Spec coverage:**

- [x] Markdown body shape (## QUERY / ## CASTING / ## TRANSFORMATION / ## STANDING / ## EMERGING / ## LINES) → Tasks 4–6.
- [x] Frontmatter envelope with strict `schemaVersion`, `timestamp`, `query` (block scalar for multi-line), flat `hexagram`, `casting` keyed L6..L1 → Tasks 2–3.
- [x] L6↔L1 inversion converter at the boundary → Task 2.
- [x] Strict-equal schema version check → Task 3 (`parseFrontmatter`).
- [x] File save / load → Task 8.
- [x] Filename `consultation-<timestamp>.md` → Task 8.
- [x] Plain stdout renderer untouched → not touched in Phase 5; only the file-save call changes.
- [x] Markdown byte-locked fixtures + generator extension → Task 7.
- [x] `hexagram-random` and `hexagram-interactive` save `.md` → Task 11.
- [x] `hexagram-history` new bin, Ink-only, non-TTY rejected → Task 17.
- [x] `--convert-legacy` flag → Task 17.
- [x] Legacy converter Shape A + Shape B → Task 12.
- [x] Migration moves originals to `consultations/legacy/` → Task 17.
- [x] `consultations/legacy/` never scanned by `hexagram-history` → Task 14.
- [x] History list two-line rows, newest-first sort, focus, `/` filter, unreadable rows, empty state → Task 15.
- [x] Body byte-compare-rewrite on load → Task 16.
- [x] 3-package split — `@hexagram/consultation` (Task 1), `@hexagram/casting-ui` rename (Task 10), `@hexagram/history-ui` (Task 13).
- [x] Existing slow distribution test left untouched.
- [x] Out-of-scope items deferred (TOML/JSON, hex-aware filenames, editing, plain-mode history, etc.) — none of them appear in the plan.

**Placeholders:** None — every step shows the actual code or command.

**Type / name consistency:**

- `ConsultationEnvelope` used consistently across `frontmatter.ts`, `file.ts`, `history-scan.ts`, `history-app.ts`, `legacy-converter.ts`.
- `CURRENT_SCHEMA_VERSION` used in both `frontmatter.ts` and `file.ts`.
- `castingToYaml` / `castingFromYaml` symmetric, used in `serializeFrontmatter` and `parseFrontmatter` respectively.
- `markdownConsultationBody(query, hexagram, casting)` signature stable across `file.ts`, `history-app.ts`, `migrate-legacy.ts`.
- `saveConsultationFile({ query, hexagram, casting, dir? })` and `loadConsultationFile(path)` used consistently.
- `convertLegacyTxt({ text, filenameTimestamp })` consistent between Task 12 and Task 17.
- `LegacyEnvelope = ConsultationEnvelope & { castingRecovered: boolean }` — `castingRecovered` is destructured off before serializing, since the frontmatter doesn't carry it.

**Outstanding concerns surfaced for the implementer:**

- The `gray-matter` API has subtleties — confirm `matter.stringify` orders keys as inserted under `js-yaml` defaults; if Node's installed `js-yaml` reorders keys alphabetically (it doesn't by default in `4.x`, but worth confirming via the byte-locked fixture in Task 7), pass `engines: { yaml: { dump: (obj) => yaml.dump(obj, { sortKeys: false }) } }` to force it.
- Real `consultations/*.txt` files predate the CASTING section and have an old `HEXAGRAM N:` header (no STANDING/EMERGING split). The Shape B path in Task 12 handles this with a sentinel casting + `castingRecovered: false`. Document this in the migration summary if needed.
- The `inputMode` Ink slider tests in `casting-ui` may depend on the `dayjs` reference that's been moved; if so, re-import via `@hexagram/consultation/file`'s `getFilesystemSafeTimestamp` export.
