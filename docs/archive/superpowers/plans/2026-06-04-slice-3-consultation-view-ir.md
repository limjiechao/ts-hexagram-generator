# Slice 3: Consultation View IR + Renderer Collapse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce one medium-neutral "consultation view" intermediate representation (IR) — owned by a new `@hexagram/consultation-view` package — that holds the presentation vocabulary, the section order, and the emerging gate exactly once, and reduce the *four* parallel renderers (ANSI readout, Markdown body, the two divergent consultation composers, AND the playground's third copy of the diagram/identity stack) to thin serializers over that IR. Every rendered byte stays identical **except one deliberate, reviewed change**: the `--plain` console output adopts the single canonical IR section order, moving the LINES block to last so all surfaces agree (see decision (B) below).

**Architecture:** Today the same presentation knowledge — the line-diagram glyph map, `POSITION_LABELS`, `LINE_LABELS`, the 12-column `LEDGER_COLUMNS` geometry, transformation geometry (`RIGHT_COLUMN`, `MOVING_ARROW`, `STATIC_GAP`), the hexagram identity stack (`#N 名（pinyin）` / Wilhelm-Baynes / `Upper:` / `Lower:` trigram rows), section order, and the no/one/multi-moving emerging gate — is reimplemented in **three** places: `@hexagram/readout` (ANSI), `@hexagram/consultation-file` (Markdown), and `@hexagram/playground-ui` (its own `playground-display-*` diagram + `identityRows`), with two divergent consultation composers (`buildConsultationSections` and `consultationConsoleOutput`). This slice creates `@hexagram/consultation-view` (depending only on `@hexagram/core` and `@hexagram/text-layout`) that owns the vocabulary, a typed **IR** — a discriminated union of *section descriptors* whose payloads are pure data (no ANSI, no Markdown) — and **one** assembly function `buildConsultationView(query, hexagram, casting)` that produces the ordered section list and applies the emerging gate via `@hexagram/core/line-semantics`. Each renderer becomes a *serializer* of that IR: `cli/readout` walks the IR producing ANSI strings (the Ink `ConsultationReadout` component, scroll, and auto-follow are untouched — only the string building moves), `domain/consultation-file` walks the same IR producing Markdown, the two consultation composers collapse into one IR-driven path, and `cli/playground-ui`'s display becomes a serializer of an IR **subset** (the hexagram-identity + diagram-row data — no casting ledger, no text sections) rather than its own third copy of the glyph map / position labels / identity geometry. The IR deliberately keeps *structural* knowledge (which sections, in what order, with what semantic rows/cells) central while leaving *medium formatting* (ANSI palette + `padToColumn` vs `text`-fenced Markdown vs the playground's chevron/pulse Ink rows) inside each serializer — that division is what makes byte-identity provable.

**On "byte-identity" precision (decision B — harmonize, not preserve):** the section *order* across surfaces is NOT uniform today. The markdown body already emits LINES last (the canonical order). The Ink viewer groups sections into independent tab strings (LINES rides inside the `standing` tab; `emerging` is its own tab), so it has no LINES-vs-emerging linear ordering to break. Only the `--plain` console composer (`consultationConsoleOutput`) is the outlier: it emits LINES *before* the emerging diagram/text. This slice **harmonizes** that — the plain projector adopts the canonical IR order (LINES last) rather than reordering back to legacy. Consequently the plain fixtures change (an intended, reviewed behaviour change isolated in its own commit, Task 3d.3); the Ink and Markdown fixtures stay byte-for-byte identical. "Byte-identical" therefore applies fully to Ink + Markdown, and to the plain output's *content* — only the plain output's section *order* changes (the emerging/LINES swap). The existing fixtures are the regression gate; the one fixture set that legitimately changes is called out explicitly where it happens.

**Tech Stack:** TypeScript, vitest, Ink, tsdown, pnpm workspaces

---

## Preconditions (Slices 0–2 merged — verify before starting)

This plan uses **post-reorg paths**. Slices 0, 1, 2 are assumed merged:

- **Slice 0/2** moved the workspace to `domain/*` and `cli/*` directory groups
  and extracted the CJK width / padding helpers (`visualWidth`, `padToColumn`,
  `padStartVisual`, `centerVisual`) into **`@hexagram/text-layout`** (today they
  live duplicated in `packages/readout/src/layout-utils.ts` and inline in
  `packages/consultation-file/src/markdown-sections.ts`).
- **Slice 1** created **`@hexagram/core/line-semantics`** exporting
  `isMovingLine`, `isLineIndex`, `movingLineIndices`, `assertLine1ToLine6`
  (today `isMovingLine`/`isLineIndex`/`assertLine1ToLine6` live in
  `packages/viewer-core/src/utils-validators.ts` and `movingLineIndices` lives in
  `packages/playground-ui/src/playground-lines.ts`).

Verification step at the top of Phase 3a confirms these exist; if any is
missing, STOP and resolve the dependency before continuing.

Post-reorg path map used throughout this plan:

| Concept | Pre-reorg (read current code here) | Post-reorg (write here) |
| --- | --- | --- |
| Readout package | `packages/readout` | `cli/readout` |
| Casting-UI package | `packages/casting-ui` | `cli/casting-ui` |
| Consultation-file package | `packages/consultation-file` | `domain/consultation-file` |
| Playground package | `packages/playground-ui` | `cli/playground-ui` |
| Core line semantics | `packages/viewer-core/src/utils-validators.ts` | `@hexagram/core/line-semantics` |
| CJK layout helpers | `packages/readout/src/layout-utils.ts` | `@hexagram/text-layout` |
| **New IR package** | — | `domain/consultation-view` |

---

## Phase overview & commit cadence

| Phase | What | Ends green & committable |
| --- | --- | --- |
| **3a** | Scaffold `@hexagram/consultation-view`: vocabulary, IR types, `buildConsultationView` assembly, unit tests. Nothing else consumes it yet. | yes — new package builds + tests pass; no renderer touched |
| **3b** | Cut `cli/readout` over to an IR→ANSI serializer. Byte-identity gate via `plain-output-*.txt` + `ink-sections-*.json`. | yes — readout serializes from IR; fixtures unchanged |
| **3c** | Cut `domain/consultation-file` Markdown body over to an IR→Markdown serializer. Byte-identity gate via `md-body-*.md` + `md-file-*.md`. | yes — markdown serializes from IR; fixtures unchanged |
| **3d** | Collapse `buildConsultationSections` (readout) and `consultationConsoleOutput` (casting-ui) into one IR-driven path; delete the shims; then **harmonize the plain section order** (LINES last) in its own isolated commit. | yes — one composer path; Ink + Markdown fixtures unchanged; plain fixtures change ONCE (intended) in the dedicated harmonize commit |
| **3e** | Cut `cli/playground-ui`'s display over to a consumer of the consultation-view IR: the hexagram-identity + diagram-row data come from a `@hexagram/consultation-view` sub-builder, and `playground-display-*` becomes a thin Ink serializer over that subset. The third copy of the glyph map / position labels / identity geometry is eliminated. | yes — playground's existing render tests are the regression gate; no fixture file involved |

Each phase is a separate commit (often several). The **whole point** is that
`pnpm generate-fixtures` produces a **no-op `git diff`** at every phase boundary
from 3b onward — **with one deliberate exception:** the dedicated
"harmonize --plain section order" commit (Task 3d.3) intentionally regenerates
`plain-output-*.txt` with the LINES-block move. That single diff is the only
sanctioned byte change in the whole slice; every other byte change is a
regression, not a new ground truth. The Ink (`ink-sections-*.json`) and Markdown
(`md-body-*.md` / `md-file-*.md`) fixtures never change.

---

# Phase 3a — Scaffold the package, IR types, and assembly

**Intent:** Stand up `@hexagram/consultation-view` with the presentation
vocabulary, the IR type vocabulary, and the single `buildConsultationView`
assembly — fully unit-tested in isolation. No existing renderer changes in this
phase, so it is trivially reversible and reviewable on its own.

**Deliberately NOT doing:** No serializer cutover yet (3b–3d). No playground
refactor yet (3d, scoped). The IR does not try to model medium-specific padding
or ANSI — it models *semantic structure* only.

## Task 3a.1 — Verify preconditions & scaffold the package

**Files:**
- Create: `domain/consultation-view/package.json`
- Create: `domain/consultation-view/tsdown.config.ts`
- Create: `domain/consultation-view/tsconfig.json`
- Create: `domain/consultation-view/src/index.ts` (temporary placeholder)

- [ ] Verify Slice 1 + Slice 2 landed:
  ```bash
  node -e "import('@hexagram/core/line-semantics').then(m=>console.log('line-semantics:', Object.keys(m).sort().join(',')))"
  node -e "import('@hexagram/text-layout').then(m=>console.log('text-layout:', Object.keys(m).sort().join(',')))"
  ```
  Expected: `line-semantics` lists at least `assertLine1ToLine6,isLineIndex,isMovingLine,movingLineIndices`; `text-layout` lists at least `centerVisual,padStartVisual,padToColumn,visualWidth`. If either fails, STOP.
- [ ] Create `domain/consultation-view/package.json` (model on `packages/readout/package.json`, drop the Ink/React/string-width deps — this package is pure data):
  ```json
  {
    "name": "@hexagram/consultation-view",
    "type": "module",
    "version": "0.0.0",
    "description": "Medium-neutral consultation view IR: the presentation vocabulary, the section IR, and the single assembly that builds it from (query, hexagram, casting)",
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
      "test": "cross-env FORCE_COLOR=1 vitest run --passWithNoTests",
      "type:check": "tsc --noEmit"
    },
    "dependencies": {
      "@hexagram/core": "workspace:*",
      "@hexagram/text-layout": "workspace:*"
    },
    "devDependencies": {}
  }
  ```
  > **WHY only two deps:** the slice's shared decision is that consultation-view
  > depends only on `@hexagram/core` (data + getters + line-semantics + casting
  > derivation) and `@hexagram/text-layout` (CJK width). It must NOT depend on
  > `@hexagram/viewer-core` (that would drag ANSI/Ink into a medium-neutral
  > layer). `@hexagram/text-layout` is needed only because two width constants
  > in the casting ledger (`leftSpan`/`rightSpan`) are *layout* arithmetic the
  > IR exposes so both serializers agree — see Task 3a.4.
- [ ] Create `domain/consultation-view/tsdown.config.ts` (copy `packages/readout/tsdown.config.ts` verbatim — single `./src/index.ts` entry, `platform: 'node'`).
- [ ] Create `domain/consultation-view/tsconfig.json` mirroring a sibling pure-TS package's tsconfig (`domain/consultation-file/tsconfig.json` is the closest model — no JSX).
- [ ] Create `domain/consultation-view/src/index.ts` with a placeholder `export {}` so the package builds before content lands.
- [ ] Wire the workspace: `pnpm install` to link the new package.
  ```bash
  pnpm install
  pnpm --filter @hexagram/consultation-view build
  ```
  Expected: install links `@hexagram/consultation-view`; build emits `dist/index.mjs` + `dist/index.d.mts` with no errors.
- [ ] Commit: `scaffold @hexagram/consultation-view package shell`.

## Task 3a.2 — The presentation vocabulary module

**Files:**
- Create: `domain/consultation-view/src/vocabulary.ts`
- Create: `domain/consultation-view/tests/vocabulary.test.ts`

These constants are copied **character-for-character** from the current
renderers (the glyphs and labels are load-bearing for byte-identity). The
canonical sources are `packages/readout/src/output-sections.ts` and
`packages/readout/src/casting-ledger.ts`.

- [ ] Write `domain/consultation-view/tests/vocabulary.test.ts` FIRST (TDD) pinning every constant to its exact current value:
  ```ts
  import { describe, expect, it } from 'vitest'
  import {
    LINE_GLYPH,
    POSITION_LABELS,
    LINE_LABELS,
    LEDGER_COLUMNS,
    RIGHT_COLUMN,
    MOVING_ARROW,
    STATIC_GAP,
    TRIGRAM_DIVIDER_WIDTH,
  } from '../src/vocabulary.js'

  describe('LINE_GLYPH', () => {
    it('maps each Line value to its diagram glyph (U+2715 for moving yin)', () => {
      expect(LINE_GLYPH).toEqual({
        6: '━━━ ✕ ━━━',
        7: '━━━━━━━━━',
        8: '━━━   ━━━',
        9: '━━━━○━━━━',
      })
    })
  })

  describe('POSITION_LABELS', () => {
    it('is bottom-first fullwidth ordinal labels', () => {
      expect(POSITION_LABELS).toEqual({
        1: '（初, 1st）',
        2: '（二, 2nd）',
        3: '（三, 3rd）',
        4: '（四, 4th）',
        5: '（五, 5th）',
        6: '（上, 6th）',
      })
    })
  })

  describe('LINE_LABELS', () => {
    it('fuses the classical ordinal glyph with the Arabic line number', () => {
      expect(LINE_LABELS).toEqual({
        1: '初1', 2: '二2', 3: '三3', 4: '四4', 5: '五5', 6: '上6',
      })
    })
  })

  describe('LEDGER_COLUMNS', () => {
    it('is the twelve-column ledger geometry, in order', () => {
      expect(LEDGER_COLUMNS.map((c) => [c.key, c.header, c.width])).toEqual([
        ['line', '爻Line', 6],
        ['cast', '變Cast', 6],
        ['stalks', '蓍Stalks', 8],
        ['leftHeap', '左Heap', 6],
        ['leftPiles', '揲Fours', 7],
        ['leftRemainder', '扐Odd', 5],
        ['rightHeap', '右Heap', 6],
        ['rightPiles', '揲Fours', 7],
        ['held', '掛Held', 6],
        ['rightRemainder', '扐Odd', 5],
        ['setAside', '歸奇Aside', 9],
        ['sigma', '營Tally', 7],
      ])
    })
  })

  describe('transformation geometry', () => {
    it('pins the column + connector + divider constants', () => {
      expect(RIGHT_COLUMN).toBe(46)
      expect(MOVING_ARROW).toBe('─────────────────▶ ')
      expect(STATIC_GAP).toBe('                   ')
      expect(MOVING_ARROW).toHaveLength(STATIC_GAP.length)
      expect(TRIGRAM_DIVIDER_WIDTH).toBe(25)
    })
  })
  ```
- [ ] Run the test, confirm it fails (module not found). Expected: `Cannot find module '../src/vocabulary.js'`.
- [ ] Create `domain/consultation-view/src/vocabulary.ts`. Copy the glyph map, labels, and geometry from the current ANSI source, stripping NO characters:
  ```ts
  import type { Line } from '@hexagram/core/types'

  // `✕` U+2715 — every render surface (banner, casting readout, history
  // readout, playground, saved .md) speaks one glyph vocabulary. Saved files
  // with the older `×` U+00D7 self-heal on next load via the history-app
  // byte-compare rerender. Copied verbatim from the pre-IR readout/markdown
  // renderers; the bytes are load-bearing for fixture parity.
  export const LINE_GLYPH = {
    6: '━━━ ✕ ━━━',
    7: '━━━━━━━━━',
    8: '━━━   ━━━',
    9: '━━━━○━━━━',
  } as const satisfies Record<Line, string>

  /** Bottom-first (`1`..`6`) fullwidth position labels for hexagram diagrams. */
  export const POSITION_LABELS = {
    1: '（初, 1st）',
    2: '（二, 2nd）',
    3: '（三, 3rd）',
    4: '（四, 4th）',
    5: '（五, 5th）',
    6: '（上, 6th）',
  } as const

  // I-Ching line labels: classical ordinal glyph (初/二/三/四/五/上) fused with
  // the Arabic line number, mirroring the diagram position labels.
  export const LINE_LABELS = {
    1: '初1',
    2: '二2',
    3: '三3',
    4: '四4',
    5: '五5',
    6: '上6',
  } as const

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
- [ ] Run `pnpm --filter @hexagram/consultation-view test`. Expected: vocabulary tests pass.
- [ ] Commit: `consultation-view: own the presentation vocabulary (glyphs, labels, ledger + transformation geometry)`.

## Task 3a.3 — The IR type vocabulary

**Files:**
- Create: `domain/consultation-view/src/ir.ts`
- Create: `domain/consultation-view/tests/ir-types.test-d.ts` (type-level only)

> **Design note — IR granularity.** The IR is a discriminated union of *section
> descriptors*. Each variant carries the *semantic data* a section needs, NOT
> medium formatting. Three section shapes recur across the renderers:
> 1. **Casting ledger** — a fixed 18-row table whose every cell is derived from
>    a `SplitRecord` via `deriveSplit`, plus null-cell placeholders for the
>    partial (in-flight) table.
> 2. **Line-diagram blocks** — the transformation (two-column) and the
>    standing/emerging hexagram diagrams (single column with trigram braces).
> 3. **Text blocks** — scripture/exegesis stacks (HEXAGRAM, LINES) in four
>    language variants.
> The IR models each as data so a serializer never re-derives *which* rows
> exist, *what order* sections appear, or *whether* an emerging section is
> present — only *how to paint a row in its medium*. Medium-specific padding
> (`padToColumn`, ANSI palette, `text` fences) stays in the serializers; that is
> the deliberate seam that keeps both outputs byte-identical without forcing the
> IR to encode whitespace.

- [ ] Create `domain/consultation-view/src/ir.ts` with the explicit IR types:
  ```ts
  import type { DerivedSplit } from '@hexagram/core/casting-derivation'
  import type { Hexagram, Line, PartialCastingRecord } from '@hexagram/core/types'

  // ── Casting ledger ─────────────────────────────────────────────────────────
  // One ledger cell is either a derived split (full data) or null (placeholder,
  // rendered as `·` in ANSI; the markdown path only ever sees full records).
  export type LedgerCell = DerivedSplit | null

  /** One of the 18 ledger rows (6 lines × 3 casts), top-first (line 6 → line 1). */
  export interface LedgerRow {
    /** Hexagram line number 1..6 (bottom-first numbering). */
    readonly lineNumber: 1 | 2 | 3 | 4 | 5 | 6
    /** Cast number within the line: 3 (resolving, top) → 1 (bottom). */
    readonly castNumber: 1 | 2 | 3
    /** True only on the block-top (cast-3) row, which prints the line label. */
    readonly showLine: boolean
    /** True after the last row of every block except the final one. */
    readonly trailingRule: boolean
    /** Derived quantities for this cast, or null when not yet cast. */
    readonly cell: LedgerCell
  }

  export interface CastingSection {
    readonly kind: 'casting'
    /** null → "Casting not recorded" caption; otherwise the 18 ledger rows. */
    readonly rows: readonly LedgerRow[] | null
  }

  // ── Line-diagram sections ───────────────────────────────────────────────────
  /** One diagram row: a line value, its glyph (from LINE_GLYPH), its position. */
  export interface DiagramLineRow {
    readonly line: Line
    /** Bottom-first position 1..6 (selects POSITION_LABELS + brace text). */
    readonly position: 1 | 2 | 3 | 4 | 5 | 6
    /** True when this standing line moves (drives the colour + arrow gap). */
    readonly moving: boolean
  }

  /** Hexagram identity strings (already stringified — no record traversal in serializers). */
  export interface HexagramIdentity {
    readonly wenWang: string
    readonly chineseTraditional: string
    readonly chineseSimplified: string
    readonly zhuyin: string
    readonly pinyin: string
    readonly englishWilhelmBaynes: string
    readonly englishLegge: string
    readonly upperTrigramChinese: string
    readonly upperTrigramEnglish: string
    readonly lowerTrigramChinese: string
    readonly lowerTrigramEnglish: string
    /** Identity-stack rows (#N 名（pinyin）/ English / Upper: / Lower:). */
    readonly upperTrigramPinyin: string
    readonly lowerTrigramPinyin: string
  }

  /** TRANSFORMATION: two diagrams side by side + the paired identity footer. */
  export interface TransformationSection {
    readonly kind: 'transformation'
    /** null when there are no moving lines → "(No transformation)". */
    readonly body: {
      readonly rows: readonly {
        readonly standing: DiagramLineRow
        readonly emerging: DiagramLineRow
      }[]
      readonly standing: HexagramIdentity
      readonly emerging: HexagramIdentity
    } | null
  }

  /** STANDING / EMERGING hexagram: one diagram + name block. */
  export interface HexagramSection {
    readonly kind: 'hexagram'
    readonly role: 'standing' | 'emerging'
    readonly wenWang: string
    readonly rows: readonly DiagramLineRow[]
    readonly identity: HexagramIdentity
  }

  // ── Text sections ───────────────────────────────────────────────────────────
  /** One (Scripture / Exegesis) pair in one language variant. */
  export interface TextVariant {
    /** Bracketed language label, e.g. "Traditional Chinese". */
    readonly language: string
    readonly scripture: string
    readonly exegesis: string
  }

  /** HEXAGRAM text (always) or the per-line LINES text. */
  export interface TextSection {
    readonly kind: 'text'
    readonly role: 'hexagram' | 'lines'
    /** For LINES: 'none' | 'one' | 'multi'; for HEXAGRAM always 'hexagram'. */
    readonly variant: 'hexagram' | 'one' | 'multi' | 'none'
    /** Empty for the 'multi' notice case (no scripture available). */
    readonly variants: readonly TextVariant[]
  }

  export interface QuerySection {
    readonly kind: 'query'
    readonly query: string
  }

  export type ConsultationSection =
    | QuerySection
    | CastingSection
    | TransformationSection
    | HexagramSection
    | TextSection

  /**
   * The whole consultation as an ordered list of section descriptors. The order
   * is the single authoritative section order; the emerging gate is already
   * applied (no emerging hexagram / no LINES-moving sections when static).
   */
  export interface ConsultationView {
    readonly sections: readonly ConsultationSection[]
    /** Convenience flag the serializers can branch on (already encoded in `sections`). */
    readonly hasMovingLines: boolean
  }

  export type { Hexagram, PartialCastingRecord }
  ```
- [ ] Create `domain/consultation-view/tests/ir-types.test-d.ts` exercising exhaustiveness (compile-time check that the union is covered):
  ```ts
  import { expectTypeOf } from 'vitest'
  import type { ConsultationSection } from '../src/ir.js'

  // A serializer must handle every variant; this proves the discriminant set.
  function kindOf(s: ConsultationSection): string {
    switch (s.kind) {
      case 'query': return 'query'
      case 'casting': return 'casting'
      case 'transformation': return 'transformation'
      case 'hexagram': return 'hexagram'
      case 'text': return 'text'
      // no default — a new variant must surface as a compile error here
    }
  }
  expectTypeOf(kindOf).toBeFunction()
  ```
- [ ] `pnpm --filter @hexagram/consultation-view type:check`. Expected: passes (the `switch` is exhaustive).
- [ ] Commit: `consultation-view: define the medium-neutral section IR types`.

## Task 3a.4 — The single assembly `buildConsultationView`

**Files:**
- Create: `domain/consultation-view/src/build-view.ts`
- Create: `domain/consultation-view/src/ledger-geometry.ts`
- Create: `domain/consultation-view/tests/build-view.test.ts`

The assembly is the **one** place that knows section order + the emerging gate.
It mirrors the order baked into both current composers:
`QUERY → CASTING → TRANSFORMATION → STANDING(diagram) → STANDING(text) → [EMERGING(diagram) → EMERGING(text)] → LINES`.

> **Section-order reconciliation (READ THIS).** The two current composers and
> the markdown body differ subtly in how STANDING text + LINES are placed:
> - `consultationConsoleOutput` (casting-ui, plain) emits, in this exact order:
>   query, casting, transformation, **standingHexagramSection,
>   hexagramTextSection(standing), [linesBlock]**, then (if moving)
>   **emergingHexagramSection, hexagramTextSection(emerging)**.
> - `buildConsultationSections` (readout, Ink) groups the SAME pieces into four
>   *tab strings* (`standing` = standingHexagramSection + hexagramText +
>   linesBlock joined; `emerging` = emergingHexagramSection + hexagramText(em)).
> - `markdownConsultationBody` emits query, casting, transformation,
>   standingHexagram, [emergingHexagram], **LINES last** — and LINES in markdown
>   includes the *hexagram-level* scripture in the no-moving case
>   (`linesNoMovingBlock`), which the ANSI side renders via a SEPARATE
>   `hexagramTextSection`.
>
> These are NOT identical section streams today. The IR carries the *full,
> superset* ordered section list in the **single canonical order** (LINES last —
> the order markdown already uses), and **each serializer projects the
> subset/order it needs**:
> - **Markdown (3c)** already emits LINES last and folds the no-moving hexagram
>   text into the LINES section → it consumes the canonical order directly.
> - **Ink tabs (3b)** group sections into independent tab *strings* (LINES rides
>   inside the `standing` tab; `emerging` is its own tab). Because the tabs are
>   separate strings, there is no LINES-vs-emerging linear ordering to preserve —
>   the tab grouping is order-neutral and stays byte-identical.
> - **Plain console (3d)** is the ONE outlier: today it emits LINES *before* the
>   emerging diagram/text. Per decision (B) we **harmonize** this — the plain
>   projector adopts the canonical IR order (LINES last) rather than reordering
>   back to legacy. This is the slice's single intended byte change, isolated in
>   Task 3d.3.
>
> The assembly's job is to produce every section once with correct data, in the
> canonical order, with the emerging gate applied. Do NOT bake the old plain
> ordering quirk into the IR or the plain serializer — the harmonized order is
> the target, and the regenerated plain fixture is the proof it landed cleanly.

- [ ] Create `domain/consultation-view/src/ledger-geometry.ts` exposing the cast/line → row mapping + the auto-follow row math (moved out of `casting-ledger.ts` so the geometry is owned centrally; the ANSI serializer re-exports it for the viewer):
  ```ts
  import { deriveSplit } from '@hexagram/core/casting-derivation'
  import type { PartialCastingRecord } from '@hexagram/core/types'
  import type { LedgerRow } from './ir.js'

  // Casting-table row geometry — single source for the auto-follow scroll math.
  export const CASTING_HEADER_ROWS = 5 // "CASTING:", blank, banner, header, rule
  export const CASTING_ROWS_PER_BLOCK = 4 // cast3, cast2, cast1, blockRule
  export const CAST1_OFFSET_IN_BLOCK = 2 // cast-1 row, from the block top

  export function castingTableActiveRow(lineIndex: number): number {
    const blockTop = CASTING_HEADER_ROWS + (5 - lineIndex) * CASTING_ROWS_PER_BLOCK
    return blockTop + CAST1_OFFSET_IN_BLOCK
  }

  export function castingTableFollowRow(lineIndex: number): number {
    return castingTableActiveRow(Math.max(0, lineIndex - 1))
  }

  // Build the 18 ledger rows from a (partial) casting record. Lines top→bottom
  // are 6→1; within a block casts are reversed (cast 3 top, cast 1 bottom); the
  // line label shows on the block-top (cast-3) row only; every block but the
  // last carries a trailing rule.
  export function buildLedgerRows(
    casting: PartialCastingRecord,
  ): readonly LedgerRow[] {
    const lineOrder = [
      [6, casting[5]], [5, casting[4]], [4, casting[3]],
      [3, casting[2]], [2, casting[1]], [1, casting[0]],
    ] as const
    const rows: LedgerRow[] = []
    lineOrder.forEach(([lineNumber, lineCasting], blockIndex) => {
      const [cast1, cast2, cast3] = lineCasting
      const last = blockIndex === lineOrder.length - 1
      const cell = (s: (typeof lineCasting)[number]) =>
        s === null ? null : deriveSplit(s)
      rows.push(
        { lineNumber, castNumber: 3, showLine: true, trailingRule: false, cell: cell(cast3) },
        { lineNumber, castNumber: 2, showLine: false, trailingRule: false, cell: cell(cast2) },
        { lineNumber, castNumber: 1, showLine: false, trailingRule: !last, cell: cell(cast1) },
      )
    })
    return rows
  }
  ```
  > **WHY move the row geometry here:** `castingTableFollowRow` /
  > `castingTableActiveRow` are consumed by the *viewer* (auto-follow scroll) and
  > must stay in lockstep with the ledger row layout. Owning the row builder and
  > the row-index math in one module keeps them honest; the ANSI serializer
  > re-exports the two functions so `@hexagram/readout`'s public surface is
  > unchanged (Task 3b.4).
- [ ] Create `domain/consultation-view/src/build-view.ts`. It reads records via `@hexagram/core/getters`, applies the gate via `@hexagram/core/line-semantics`, and emits the superset section list. Identity extraction mirrors the current `transformationSection` + `hexagramSection` + `identityRows` exactly:
  ```ts
  import {
    getEmergingHexagram,
    getHexagramRecord,
    getTrigramRecord,
  } from '@hexagram/core/getters'
  import { isLineIndex, isMovingLine } from '@hexagram/core/line-semantics'
  import type { Hexagram, PartialCastingRecord } from '@hexagram/core/types'

  import { buildLedgerRows } from './ledger-geometry.js'
  import type {
    ConsultationSection,
    ConsultationView,
    DiagramLineRow,
    HexagramIdentity,
    TextSection,
    TextVariant,
  } from './ir.js'

  function capitalizeFirst(text: string): string {
    return text.length === 0 ? text : `${text[0]!.toUpperCase()}${text.slice(1)}`
  }

  function identityOf(hexagram: Hexagram): HexagramIdentity {
    const { Name, Metadata } = getHexagramRecord(hexagram)
    const upper = getTrigramRecord(Metadata.Trigram.Upper)
    const lower = getTrigramRecord(Metadata.Trigram.Lower)
    return {
      wenWang: String(Metadata.Order.WenWang),
      chineseTraditional: String(Name.Chinese.Traditional),
      chineseSimplified: String(Name.Chinese.Simplified),
      zhuyin: String(Metadata.Pronunciation.Zhuyin),
      pinyin: String(Metadata.Pronunciation.Pinyin),
      englishWilhelmBaynes: String(Name.English.WilhelmBaynes),
      englishLegge: String(Name.English.Legge),
      upperTrigramChinese: String(upper.Imagery.Chinese.Traditional),
      upperTrigramEnglish: String(upper.Imagery.English.WilhelmBaynes),
      lowerTrigramChinese: String(lower.Imagery.Chinese.Traditional),
      lowerTrigramEnglish: String(lower.Imagery.English.WilhelmBaynes),
      upperTrigramPinyin: capitalizeFirst(String(upper.Metadata.Pronunciation.Pinyin)),
      lowerTrigramPinyin: capitalizeFirst(String(lower.Metadata.Pronunciation.Pinyin)),
    }
  }

  function diagramRows(
    hexagram: Hexagram,
    movingFrom: Hexagram = hexagram,
  ): readonly DiagramLineRow[] {
    // Top-first (line 6 → line 1) to match every diagram section.
    return ([6, 5, 4, 3, 2, 1] as const).map((position) => {
      const index = position - 1
      return {
        line: hexagram[index]!,
        position,
        moving: isMovingLine(movingFrom[index]!),
      }
    })
  }

  // Hexagram-level four-variant text, copied field-for-field from
  // `hexagramTextSection`. Imagery comes from `Exegesis.Imagery.Hexagram`.
  function hexagramTextVariants(hexagram: Hexagram): readonly TextVariant[] {
    const { Text } = getHexagramRecord(hexagram)
    return [
      { language: 'Traditional Chinese',
        scripture: Text.Chinese.Traditional.Scripture.Hexagram,
        exegesis: Text.Chinese.Traditional.Exegesis.Imagery.Hexagram },
      { language: 'Simplified Chinese',
        scripture: Text.Chinese.Simplified.Scripture.Hexagram,
        exegesis: Text.Chinese.Simplified.Exegesis.Imagery.Hexagram },
      { language: 'English, Wilhelm-Baynes',
        scripture: Text.English.WilhelmBaynes.Scripture.Hexagram,
        exegesis: Text.English.WilhelmBaynes.Exegesis.Imagery.Hexagram },
      { language: 'English, James Legge',
        scripture: Text.English.Legge.Scripture.Hexagram,
        exegesis: Text.English.Legge.Exegesis.Imagery.Hexagram },
    ]
  }

  function oneMovingLineVariants(hexagram: Hexagram): readonly TextVariant[] {
    const movingIndex = hexagram.findIndex(isMovingLine)
    if (!isLineIndex(movingIndex)) return []
    const key = `L${movingIndex + 1}` as 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
    const { Text } = getHexagramRecord(hexagram)
    return [
      { language: 'Traditional Chinese',
        scripture: Text.Chinese.Traditional.Scripture.Lines[key],
        exegesis: Text.Chinese.Traditional.Exegesis.Imagery.Lines[key] },
      { language: 'Simplified Chinese',
        scripture: Text.Chinese.Simplified.Scripture.Lines[key],
        exegesis: Text.Chinese.Simplified.Exegesis.Imagery.Lines[key] },
      { language: 'English, Wilhelm-Baynes',
        scripture: Text.English.WilhelmBaynes.Scripture.Lines[key],
        exegesis: Text.English.WilhelmBaynes.Exegesis.Imagery.Lines[key] },
      { language: 'English, James Legge',
        scripture: Text.English.Legge.Scripture.Lines[key],
        exegesis: Text.English.Legge.Exegesis.Imagery.Lines[key] },
    ]
  }

  function linesSection(hexagram: Hexagram): TextSection {
    const movingCount = hexagram.filter(isMovingLine).length
    if (movingCount === 0)
      // No moving lines: the LINES block carries the *hexagram-level* text in
      // markdown; the ANSI side renders this text separately as the standing
      // HEXAGRAM block. Both project from this one section.
      return { kind: 'text', role: 'lines', variant: 'none',
               variants: hexagramTextVariants(hexagram) }
    if (movingCount === 1)
      return { kind: 'text', role: 'lines', variant: 'one',
               variants: oneMovingLineVariants(hexagram) }
    return { kind: 'text', role: 'lines', variant: 'multi', variants: [] }
  }

  export function buildConsultationView(
    query: string,
    hexagram: Hexagram,
    casting: PartialCastingRecord | null,
  ): ConsultationView {
    const hasMovingLines = hexagram.some(isMovingLine)
    const emerging = getEmergingHexagram(hexagram)
    const sections: ConsultationSection[] = [
      { kind: 'query', query },
      { kind: 'casting', rows: casting === null ? null : buildLedgerRows(casting) },
      {
        kind: 'transformation',
        body: hasMovingLines
          ? {
              rows: diagramRows(hexagram).map((standing, i) => ({
                standing,
                emerging: { line: emerging[5 - i]!, position: standing.position, moving: false },
              })),
              standing: identityOf(hexagram),
              emerging: identityOf(emerging),
            }
          : null,
      },
      { kind: 'hexagram', role: 'standing', wenWang: identityOf(hexagram).wenWang,
        rows: diagramRows(hexagram), identity: identityOf(hexagram) },
      { kind: 'text', role: 'hexagram', variant: 'hexagram',
        variants: hexagramTextVariants(hexagram) },
    ]
    if (hasMovingLines) {
      sections.push(
        { kind: 'hexagram', role: 'emerging', wenWang: identityOf(emerging).wenWang,
          rows: diagramRows(emerging), identity: identityOf(emerging) },
        { kind: 'text', role: 'hexagram', variant: 'hexagram',
          variants: hexagramTextVariants(emerging) },
      )
    }
    sections.push(linesSection(hexagram))
    return { sections, hasMovingLines }
  }
  ```
  > **NOTE on the emerging diagram `moving` flag:** in the current
  > `transformationSection` the emerging column is always painted `BOLD_WHITE`
  > (never red) — so `emerging.moving` is hard-coded `false`. The standing
  > column's `moving` drives both its colour and the arrow/gap choice. Preserve
  > that asymmetry exactly.
- [ ] Write `domain/consultation-view/tests/build-view.test.ts` asserting structure + the gate (use the shared `cases` shapes; copy the four hexagrams):
  ```ts
  import { describe, expect, it } from 'vitest'
  import { buildConsultationView } from '../src/build-view.js'
  import type { CastingRecord, Hexagram } from '@hexagram/core/types'

  const casting: CastingRecord = Array.from({ length: 6 }, () => [
    { pick: 1, max: 48 }, { pick: 2, max: 43 }, { pick: 3, max: 39 },
  ]) as CastingRecord

  const kinds = (h: Hexagram) =>
    buildConsultationView('Q', h, casting).sections.map((s) =>
      s.kind === 'text' || s.kind === 'hexagram' ? `${s.kind}:${(s as any).role}` : s.kind,
    )

  describe('buildConsultationView section order + gate', () => {
    it('no moving lines: no emerging hexagram/text sections', () => {
      expect(kinds([7, 8, 7, 8, 7, 8])).toEqual([
        'query', 'casting', 'transformation',
        'hexagram:standing', 'text:hexagram', 'text:lines',
      ])
      const v = buildConsultationView('Q', [7, 8, 7, 8, 7, 8], casting)
      expect(v.hasMovingLines).toBe(false)
      const transformation = v.sections.find((s) => s.kind === 'transformation')!
      expect((transformation as any).body).toBeNull()
    })

    it('one moving line: emerging present, LINES variant=one', () => {
      const ks = kinds([6, 7, 8, 7, 8, 7])
      expect(ks).toEqual([
        'query', 'casting', 'transformation',
        'hexagram:standing', 'text:hexagram',
        'hexagram:emerging', 'text:hexagram', 'text:lines',
      ])
      const lines = buildConsultationView('Q', [6, 7, 8, 7, 8, 7], casting)
        .sections.at(-1)!
      expect((lines as any).variant).toBe('one')
      expect((lines as any).variants).toHaveLength(4)
    })

    it('multi moving lines: LINES variant=multi, no variants', () => {
      const lines = buildConsultationView('Q', [6, 9, 7, 8, 7, 8], casting)
        .sections.at(-1)!
      expect((lines as any).variant).toBe('multi')
      expect((lines as any).variants).toHaveLength(0)
    })

    it('null casting: casting rows is null', () => {
      const v = buildConsultationView('Q', [6, 7, 8, 7, 8, 7], null)
      const cast = v.sections.find((s) => s.kind === 'casting')!
      expect((cast as any).rows).toBeNull()
    })

    it('full casting: 18 ledger rows, line label only on cast-3 rows', () => {
      const cast = buildConsultationView('Q', [7,7,7,7,7,7], casting)
        .sections.find((s) => s.kind === 'casting')! as any
      expect(cast.rows).toHaveLength(18)
      expect(cast.rows.filter((r: any) => r.showLine)).toHaveLength(6)
      // first block is line 6, cast 3 on top
      expect(cast.rows[0]).toMatchObject({ lineNumber: 6, castNumber: 3, showLine: true })
      // trailing rule on every block-bottom except the last
      expect(cast.rows.filter((r: any) => r.trailingRule)).toHaveLength(5)
    })
  })
  ```
- [ ] `pnpm --filter @hexagram/consultation-view test`. Expected: all build-view + vocabulary + type tests pass.
- [ ] Update `domain/consultation-view/src/index.ts` to export the public surface:
  ```ts
  export * from './vocabulary.js'
  export * from './ir.js'
  export {
    buildConsultationView,
  } from './build-view.js'
  export {
    buildLedgerRows,
    castingTableActiveRow,
    castingTableFollowRow,
    CASTING_HEADER_ROWS,
    CASTING_ROWS_PER_BLOCK,
    CAST1_OFFSET_IN_BLOCK,
  } from './ledger-geometry.js'
  ```
  > **Barrel note:** this repo's convention (jiechao-toolkit:no-barrel-files) is
  > one `index.ts` that maps the package's `exports` entry to concrete files.
  > `readout`'s own `index.ts` is exactly this pattern, so it is the local
  > convention — keep `index.ts` as the single public-API file, re-exporting
  > from concrete modules, and never deep-import across the package boundary.
- [ ] `pnpm --filter @hexagram/consultation-view build && pnpm --filter @hexagram/consultation-view type:check`. Expected: clean.
- [ ] Commit: `consultation-view: add the single buildConsultationView assembly + ledger geometry`.

**Phase 3a complete.** New package is self-contained, fully tested, consumed by
nothing yet. `git diff` against the fixtures is empty (no renderer touched).

---

# Phase 3b — Cut `cli/readout` over to an IR→ANSI serializer

**Intent:** Replace the ANSI string-building in `output-sections.ts` +
`casting-ledger.ts` with serializers that walk a `ConsultationView`. The Ink
`ConsultationReadout` component, the scroll math, and auto-follow are NOT
touched — only the strings that feed `sections` change. The byte-identity gate
is `plain-output-*.txt` and `ink-sections-*.json` (both regenerated by
`pnpm generate-fixtures` from casting-ui, which calls `buildConsultationSections`
+ `consultationConsoleOutput`).

**Approach (strangler):** Build the new ANSI serializer alongside the old
builders, prove byte-equivalence with a temporary parity test, then swap
`buildConsultationSections` to call the serializer and delete the old builders.

**Deliberately NOT doing:** Not collapsing the two composers yet (3d). Not
changing the public export names the viewer/history/playground import.

## Task 3b.1 — ANSI serializer skeleton + the casting ledger

**Files:**
- Create: `cli/readout/src/serialize-ansi.ts`
- Create: `cli/readout/tests/serialize-ansi-parity.test.ts` (temporary gate)

The serializer owns ONLY medium formatting: the palette (`BOLD_GREY`,
`BOLD_WHITE`, `BOLD_RED`, `NORMAL_GREY`, `HEADING_GREY`, `PLACEHOLDER_GREY`,
`BOLD_CYAN`, `YELLOW`, `NORMAL` from `@hexagram/viewer-core`), the
`padToColumn`/`padStartVisual`/`centerVisual` from `@hexagram/text-layout`, and
the `LEDGER_GUTTER`/`LEDGER_INDENT` strings (ANSI-coloured gutter). It reads
geometry + glyphs from `@hexagram/consultation-view`.

- [ ] Create `cli/readout/src/serialize-ansi.ts` with the ledger serializer first. Port `castingSection`'s body verbatim, but iterate `CastingSection.rows` instead of re-deriving:
  ```ts
  import {
    LEDGER_COLUMNS,
    LINE_LABELS,
    type CastingSection,
    type LedgerRow,
  } from '@hexagram/consultation-view'
  import { centerVisual, padStartVisual } from '@hexagram/text-layout'
  import {
    BOLD_CYAN, BOLD_GREY, BOLD_WHITE, HEADING_GREY, NORMAL, NORMAL_GREY,
    PLACEHOLDER_GREY, YELLOW,
  } from '@hexagram/viewer-core'

  const LEDGER_INDENT = '   '
  const LEDGER_GUTTER = ` ${NORMAL_GREY}│${NORMAL} `

  const colWidth = (key: string): number =>
    LEDGER_COLUMNS.find((c) => c.key === key)!.width

  export function serializeCastingAnsi(section: CastingSection): string {
    if (section.rows === null)
      return `\n${BOLD_GREY}CASTING:${NORMAL}\n\n${NORMAL}Casting not recorded\n`.trim()
    const blank = (key: string) => ' '.repeat(colWidth(key))
    const leftSpan =
      colWidth('leftHeap') + 3 + colWidth('leftPiles') + 3 + colWidth('leftRemainder')
    const rightSpan =
      colWidth('rightHeap') + 3 + colWidth('rightPiles') + 3 + colWidth('held') + 3 +
      colWidth('rightRemainder')
    const bannerRow = `${
      LEDGER_INDENT + [blank('line'), blank('cast'), blank('stalks')].join(LEDGER_GUTTER) + LEDGER_GUTTER
    }${HEADING_GREY}${centerVisual('左Left', leftSpan)}${NORMAL}${LEDGER_GUTTER
    }${HEADING_GREY}${centerVisual('右Right', rightSpan)}${NORMAL}${LEDGER_GUTTER
    }${[blank('setAside'), blank('sigma')].join(LEDGER_GUTTER)}`
    const headerRow = LEDGER_INDENT + LEDGER_COLUMNS.map(
      (c) => `${HEADING_GREY}${padStartVisual(c.header, c.width)}${NORMAL}`).join(LEDGER_GUTTER)
    const headerRule = `${LEDGER_INDENT}${NORMAL_GREY}${
      LEDGER_COLUMNS.map((c) => '═'.repeat(c.width)).join('═╪═')}${NORMAL}`
    const blockRule = `${LEDGER_INDENT}${NORMAL_GREY}${
      LEDGER_COLUMNS.map((c) => '─'.repeat(c.width)).join('─┼─')}${NORMAL}`

    const dataRow = (row: LedgerRow): string => {
      const lineCell = row.showLine ? LINE_LABELS[row.lineNumber] : ''
      const cells: string[] = [
        `${BOLD_WHITE}${padStartVisual(lineCell, colWidth('line'))}${NORMAL}`,
        `${NORMAL_GREY}${padStartVisual(String(row.castNumber), colWidth('cast'))}${NORMAL}`,
      ]
      if (row.cell === null) {
        for (const key of ['stalks','leftHeap','leftPiles','leftRemainder','rightHeap',
          'rightPiles','held','rightRemainder','setAside','sigma'])
          cells.push(`${PLACEHOLDER_GREY}${padStartVisual('·', colWidth(key))}${NORMAL}`)
      } else {
        const d = row.cell
        const plain = (v: number, k: string) => padStartVisual(String(v), colWidth(k))
        cells.push(
          `${NORMAL_GREY}${plain(d.stalks, 'stalks')}${NORMAL}`,
          plain(d.leftHeap, 'leftHeap'),
          plain(d.leftPiles, 'leftPiles'),
          `${YELLOW}${plain(d.leftRemainder, 'leftRemainder')}${NORMAL}`,
          plain(d.rightHeap, 'rightHeap'),
          plain(d.rightPiles, 'rightPiles'),
          `${NORMAL_GREY}${plain(d.held, 'held')}${NORMAL}`,
          `${YELLOW}${plain(d.rightRemainder, 'rightRemainder')}${NORMAL}`,
          `${NORMAL_GREY}${plain(d.setAside, 'setAside')}${NORMAL}`,
          row.castNumber === 3
            ? `${BOLD_CYAN}${padStartVisual(`⇒ ${d.combinedPiles}`, colWidth('sigma'))}${NORMAL}`
            : padStartVisual(String(d.combinedPiles), colWidth('sigma')),
        )
      }
      return LEDGER_INDENT + cells.join(LEDGER_GUTTER)
    }

    const body = section.rows
      .map((row) => (row.trailingRule ? `${dataRow(row)}\n${blockRule}` : dataRow(row)))
      .join('\n')
    return `\n${BOLD_GREY}CASTING:${NORMAL}\n\n${bannerRow}\n${headerRow}\n${headerRule}\n${body}\n`.trim()
  }
  ```
  > **Critical byte detail:** the old `castingSection` joins rows then appends
  > the block rule INSIDE each block's map step. Building per-row with
  > `trailingRule` produces the identical newline structure because every
  > block's three rows are contiguous and the rule follows the cast-1 row — the
  > join across blocks supplies the `\n` between a rule and the next block's
  > cast-3 row exactly as before. Confirm with the parity test below.
- [ ] Write `cli/readout/tests/serialize-ansi-parity.test.ts` proving the new ledger serializer is byte-identical to the legacy `castingSection` for the shared cases + the partial/null cases:
  ```ts
  import { describe, expect, it } from 'vitest'
  import { buildConsultationView } from '@hexagram/consultation-view'
  import { emptyPartialCastingRecord } from '@hexagram/core/types'
  import { castingSection } from '../src/casting-ledger.js' // legacy, still present
  import { serializeCastingAnsi } from '../src/serialize-ansi.js'
  import { cases } from '../../casting-ui/tests/fixtures/cases.js' // shared cases

  describe('serializeCastingAnsi parity with legacy castingSection', () => {
    for (const { name, query, hexagram, casting } of cases) {
      it(`full casting (${name})`, () => {
        const section = buildConsultationView(query, hexagram, casting)
          .sections.find((s) => s.kind === 'casting')!
        expect(serializeCastingAnsi(section as any)).toBe(castingSection(casting))
      })
    }
    it('partial casting (one cell filled)', () => {
      const partial = emptyPartialCastingRecord()
      partial[0][0] = { pick: 20, max: 48 }
      const section = buildConsultationView('q', [7,7,7,7,7,7], partial)
        .sections.find((s) => s.kind === 'casting')!
      expect(serializeCastingAnsi(section as any)).toBe(castingSection(partial))
    })
    it('null casting', () => {
      const section = buildConsultationView('q', [7,7,7,7,7,7], null)
        .sections.find((s) => s.kind === 'casting')!
      expect(serializeCastingAnsi(section as any)).toBe(castingSection(null))
    })
  })
  ```
  > **Cross-package fixture import:** the parity test reaches into casting-ui's
  > `cases.ts`. If the test runner's project boundaries forbid that, copy the
  > four case shapes into a local `cli/readout/tests/fixtures/cases.ts` instead
  > (they are illustrative picks, not real data — safe to duplicate per the
  > DRY-is-knowledge rule; flag the duplication in the commit).
- [ ] Add `@hexagram/consultation-view` + `@hexagram/text-layout` to `cli/readout/package.json` `dependencies`; `pnpm install`.
- [ ] `pnpm --filter @hexagram/readout test -- serialize-ansi-parity`. Expected: all parity assertions pass (byte-identical ledger).
- [ ] Commit: `readout: IR→ANSI casting-ledger serializer (parity-gated, legacy still in place)`.

## Task 3b.2 — ANSI serializers for query, transformation, hexagram, text

**Files:**
- Modify: `cli/readout/src/serialize-ansi.ts`
- Modify: `cli/readout/tests/serialize-ansi-parity.test.ts`

Port the remaining sections, each parity-checked against its legacy builder
(`querySection`, `transformationSection`, `standingHexagramSection`,
`emergingHexagramSection`, `hexagramTextSection`, `linesBlock`). Use
`@hexagram/text-layout`'s `padToColumn`, the vocabulary's `LINE_GLYPH`,
`POSITION_LABELS`, `RIGHT_COLUMN`, `MOVING_ARROW`, `STATIC_GAP`,
`TRIGRAM_DIVIDER_WIDTH`.

- [ ] `serializeQueryAnsi(section: QuerySection)` — port `querySection`:
  ```ts
  export function serializeQueryAnsi(s: QuerySection): string {
    return `${BOLD_GREY}QUERY:\n\n  ${BOLD_WHITE}${s.query || '(Query not provided)'}`
  }
  ```
- [ ] `serializeTransformationAnsi(section: TransformationSection)` — port `transformationSection` exactly, reading `section.body.rows` (each `{standing, emerging}` with `standing.moving` driving colour + gap) and `section.body.standing/emerging` identities. Reproduce: header (`  Standing Hexagram` padded to `RIGHT_COLUMN` + `Emerging Hexagram`), the line rows (`  {color}{line}{NORMAL}  {color}{LINE_GLYPH[line]}{NORMAL}  {POSITION_LABELS[pos]}{gap}{BOLD_WHITE}{eLine}…`), footer1 (`#N 名（pinyin）` per side), footer2 (English name, `minGap=6`), the 25-dash divider, and `Upper:`/`Lower:` trigram rows. The `(No transformation)` branch when `section.body === null`.
  > Reuse the *cell* format for trigram rows from `identity.upperTrigram*` /
  > `lowerTrigram*` + `upperTrigramPinyin`/`lowerTrigramPinyin`. The legacy code
  > calls `getTrigramRecord` inline; the IR pre-extracted those strings, so the
  > serializer just composes `Upper: {chinese} {pinyin} ({english})`.
- [ ] `serializeHexagramAnsi(section: HexagramSection)` — port `hexagramSection`. `role === 'standing'` uses the moving-line colour (`BOLD_RED` for moving, else `BOLD_WHITE`); `role === 'emerging'` always `BOLD_WHITE`. Reproduce the `──┐/──┼──/──┘` braces with the trigram imagery from `identity`, the "(First is line at bottom)" comma row, and the four name variants.
- [ ] `serializeTextAnsi(section: TextSection)` — port `hexagramTextSection` (for `role: 'hexagram'`) and `linesBlock`/`oneMovingLineSection` (for `role: 'lines'`). The `variant: 'multi'` case emits the "No available reference scripture…" notice; `variant: 'none'` for a LINES section emits empty string on the ANSI side (the no-moving hexagram text is rendered by the `role:'hexagram'` text section instead — see the order reconciliation note). The `replaceAll('\n', '\n  ')` indenting on the Wilhelm-Baynes variants must be preserved verbatim.
  > **The `\n  ` indent quirk:** only the Wilhelm-Baynes scripture/exegesis get
  > `.replaceAll('\n', '\n  ')` in the ANSI builder (`hexagramTextSection` and
  > `oneMovingLineSection`). Legge and Chinese do not. Preserve per-variant.
- [ ] Extend the parity test with one `it` per legacy builder × per shared case (and the no/one/multi-moving hexagrams), each `expect(serializeX(section)).toBe(legacyX(...))`.
- [ ] `pnpm --filter @hexagram/readout test -- serialize-ansi-parity`. Expected: every section byte-identical.
- [ ] Commit: `readout: IR→ANSI serializers for query/transformation/hexagram/text (parity-gated)`.

## Task 3b.3 — Compose tab strings from the IR; swap `buildConsultationSections`

**Files:**
- Modify: `cli/readout/src/output-composers.ts`
- Modify: `cli/readout/src/serialize-ansi.ts` (add the tab composer)

`buildConsultationSections` returns `ConsultationSections` (`query`, `casting`,
`transformation`, `standing`, `emerging|null`). Build each tab string by
projecting the IR sections, matching the current grouping exactly:

- `standing` = `serializeHexagramAnsi(standing)` + `\n\n` +
  `serializeTextAnsi(hexagram-text)` + (`\n\n` + LINES block if non-empty),
  then `.trim()`.
- `emerging` = `serializeHexagramAnsi(emerging)` + `\n\n` +
  `serializeTextAnsi(emerging-hexagram-text)`, then `.trim()`; `null` when static.

- [ ] Add `serializeConsultationTabs(view: ConsultationView): ConsultationSections` to `serialize-ansi.ts` that walks `view.sections` and assembles the four tab strings exactly as `buildConsultationSections` does today (including the `linesBlock` join — the LINES text section feeds the `standing` tab string, NOT a separate tab).
  > **Find-the-pieces:** index the sections by kind/role. `casting` → the casting
  > section; `transformation` → transformation; the FIRST `hexagram` (standing) +
  > the FIRST `text:hexagram` + the trailing `text:lines` → the `standing` tab;
  > the SECOND `hexagram` (emerging) + SECOND `text:hexagram` → `emerging`.
- [ ] Rewrite `buildConsultationSections` to delegate:
  ```ts
  import { buildConsultationView } from '@hexagram/consultation-view'
  import { serializeConsultationTabs } from './serialize-ansi.js'

  export function buildConsultationSections(
    query: string, hexagram: Hexagram, casting: CastingRecord | null,
  ): ConsultationSections {
    return serializeConsultationTabs(buildConsultationView(query, hexagram, casting))
  }
  ```
- [ ] Rewrite `buildPartialCastingSections` to build a partial view and serialize only query + casting:
  ```ts
  export function buildPartialCastingSections(
    query: string, casting: PartialCastingRecord,
  ): Pick<ConsultationSections, 'query' | 'casting'> {
    const view = buildConsultationView(query, /* placeholder static hex */ [7,7,7,7,7,7], casting)
    return {
      query: serializeQueryAnsi({ kind: 'query', query }),
      casting: serializeCastingAnsi(view.sections.find((s) => s.kind === 'casting')! as CastingSection),
    }
  }
  ```
  > **WHY a placeholder hexagram:** the partial flow has no hexagram yet, but
  > `buildConsultationView` needs one for the (unused) downstream sections. Build
  > the partial casting section directly instead — simpler and avoids computing
  > sections the caller discards. (Equivalently: add a `buildPartialView` helper
  > to consultation-view that only emits query+casting; choose whichever keeps the
  > parity test green.)
- [ ] **BYTE-IDENTITY GATE 1:** regenerate the casting-ui fixtures and confirm a clean diff:
  ```bash
  pnpm --filter @hexagram/casting-ui generate-fixtures
  git status --porcelain packages/casting-ui/tests/fixtures  # post-reorg: cli/casting-ui/tests/fixtures
  git diff --stat -- cli/casting-ui/tests/fixtures
  ```
  Expected: **NO** changes to `plain-output-*.txt` or `ink-sections-*.json`. If any byte changed, the serializer diverged — debug against the parity test, do NOT accept the new bytes.
- [ ] Run the full casting-ui output test (the fixture gate that ships):
  ```bash
  pnpm --filter @hexagram/casting-ui test -- output
  ```
  Expected: `consultationConsoleOutput` + `buildConsultationSections` fixture-parity tests pass.
- [ ] Run readout's own suite: `pnpm --filter @hexagram/readout test`. Expected: pass (`casting-ledger.test.ts`, `consultation-readout.test.tsx` unchanged behaviour).
- [ ] Commit: `readout: buildConsultationSections delegates to the IR serializer`.

## Task 3b.4 — Delete the legacy ANSI builders; re-point public exports

**Files:**
- Delete: `cli/readout/src/output-sections.ts`
- Delete: `cli/readout/src/casting-ledger.ts`
- Delete: `cli/readout/tests/serialize-ansi-parity.test.ts` (its job is done; fixtures are the standing gate)
- Modify: `cli/readout/src/index.ts`
- Modify: `cli/readout/tests/casting-ledger.test.ts` (re-point imports)

- [ ] Move `cli/readout/tests/casting-ledger.test.ts`'s subject from the deleted module to `serialize-ansi.ts` (it tested `castingSection`; now test `serializeCastingAnsi` via `buildConsultationView` — or keep a thin `castingSection` wrapper, see next step).
- [ ] Decide the public surface. The viewer/history/playground import these names from `@hexagram/readout`: `castingSection`, `castingTableActiveRow`, `castingTableFollowRow`, `ConsultationReadout`, `buildConsultationSections`, `buildPartialCastingSections`, `ConsultationSections`, `emergingHexagramSection`, `hexagramTextSection`, `linesBlock`, `MOVING_ARROW`, `POSITION_LABELS`, `querySection`, `standingHexagramSection`, `STATIC_GAP`, `transformationSection`. To keep the blast radius small in THIS slice:
  - Re-export `MOVING_ARROW`, `POSITION_LABELS`, `STATIC_GAP` **from** `@hexagram/consultation-view` (playground reads these — 3d re-points playground directly, but readout keeps re-exporting them so nothing else breaks now).
  - Re-export `castingTableActiveRow`, `castingTableFollowRow` from `@hexagram/consultation-view`.
  - The free section builders (`querySection`, `transformationSection`, `standingHexagramSection`, `emergingHexagramSection`, `hexagramTextSection`, `linesBlock`, `castingSection`) are imported by **casting-ui's `consultationConsoleOutput`** only (Task 3d collapses that). Until 3d, provide them as thin shims over the new serializers so casting-ui keeps compiling:
    ```ts
    // cli/readout/src/section-shims.ts — temporary, deleted in 3d.
    import { buildConsultationView } from '@hexagram/consultation-view'
    import { serializeCastingAnsi, serializeTransformationAnsi, /* … */ } from './serialize-ansi.js'
    export const castingSection = (casting) =>
      serializeCastingAnsi(buildConsultationView('', [7,7,7,7,7,7], casting)
        .sections.find((s) => s.kind === 'casting'))
    // …one shim per legacy builder, each routed through buildConsultationView.
    ```
  > **WHY shims, not a hard cut:** keeping each phase green & committable. The
  > shims are byte-identical (they call the parity-proven serializers) and vanish
  > in 3d when the composer collapse removes their last caller.
- [ ] Update `cli/readout/src/index.ts` to export the same NAMES from the new locations (shims + consultation-view re-exports + `ConsultationReadout` + `buildConsultationSections`/`buildPartialCastingSections`/`ConsultationSections`).
- [ ] `pnpm --filter @hexagram/readout type:check && pnpm --filter @hexagram/readout test`. Expected: clean.
- [ ] `pnpm --filter @hexagram/casting-ui type:check && pnpm --filter @hexagram/casting-ui test` and `pnpm --filter @hexagram/history-ui test` and `pnpm --filter @hexagram/playground-ui test`. Expected: all green (imports resolve via the shims/re-exports).
- [ ] **BYTE-IDENTITY GATE 2:** re-run `pnpm --filter @hexagram/casting-ui generate-fixtures`; `git diff` must stay empty.
- [ ] Commit: `readout: delete legacy ANSI section builders; export names via IR serializer + shims`.

**Phase 3b complete.** ANSI rendering now flows IR → serializer. `plain-output`
+ `ink-sections` fixtures are byte-unchanged.

---

# Phase 3c — Cut `domain/consultation-file` Markdown body over to an IR→Markdown serializer

**Intent:** Replace `markdown-sections.ts`'s string building with an IR→Markdown
serializer; `markdownConsultationBody` walks the same `ConsultationView`. The
byte-identity gate is `md-body-*.md` + `md-file-*.md`.

**Deliberately NOT doing:** Not touching the frontmatter envelope, the loader,
or the legacy converter — only the decorative body composition.

**Order reconciliation (carry-over from 3a):** the markdown body order is
`QUERY → CASTING → TRANSFORMATION → STANDING → [EMERGING] → LINES`, and the
markdown LINES section in the **no-moving** case renders the *hexagram-level*
scripture/exegesis (`linesNoMovingBlock`). In the IR that text lives on the
trailing `text:lines` section (`variant: 'none'`, `variants` = hexagram text) —
exactly what the markdown serializer needs. The markdown body does NOT emit a
separate hexagram-text section (unlike ANSI), so the markdown serializer simply
skips the `text:hexagram` IR sections and renders the standing/emerging diagrams
+ the trailing LINES block. Document this projection in the serializer.

## Task 3c.1 — Markdown serializer skeleton + casting ledger

**Files:**
- Create: `domain/consultation-file/src/serialize-markdown.ts`
- Create: `domain/consultation-file/tests/serialize-markdown-parity.test.ts` (temporary gate)

The markdown serializer reads `LEDGER_COLUMNS`, `LINE_LABELS`, `LINE_GLYPH`,
`POSITION_LABELS`, `RIGHT_COLUMN`, `MOVING_ARROW`, `STATIC_GAP` from
`@hexagram/consultation-view` and `padToColumn`/`padStartVisual`/`centerVisual`
from `@hexagram/text-layout`. No ANSI; `LEDGER_GUTTER = ' │ '`.

- [ ] Create `domain/consultation-file/src/serialize-markdown.ts` with `serializeCastingMarkdown(section: CastingSection): string`. Port `castingMarkdownSection` exactly, iterating `section.rows`:
  ```ts
  import { LEDGER_COLUMNS, LINE_LABELS, type CastingSection, type LedgerRow } from '@hexagram/consultation-view'
  import { centerVisual, padStartVisual } from '@hexagram/text-layout'

  const LEDGER_INDENT = '   '
  const LEDGER_GUTTER = ' │ '
  const colWidth = (key: string) => LEDGER_COLUMNS.find((c) => c.key === key)!.width

  export function serializeCastingMarkdown(section: CastingSection): string {
    if (section.rows === null) return `## CASTING\n\n_Casting not recorded._\n`
    // banner/header/rule identical to castingMarkdownSection (no ANSI)…
    const dataRow = (row: LedgerRow): string => {
      const d = row.cell // markdown never has null cells (full CastingRecord only)
      if (d === null) throw new Error('markdown casting expects a full record')
      const plain = (v: number, k: string) => padStartVisual(String(v), colWidth(k))
      return LEDGER_INDENT + [
        padStartVisual(row.showLine ? LINE_LABELS[row.lineNumber] : '', colWidth('line')),
        plain(row.castNumber, 'cast'),
        plain(d.stalks, 'stalks'), plain(d.leftHeap, 'leftHeap'),
        plain(d.leftPiles, 'leftPiles'), plain(d.leftRemainder, 'leftRemainder'),
        plain(d.rightHeap, 'rightHeap'), plain(d.rightPiles, 'rightPiles'),
        plain(d.held, 'held'), plain(d.rightRemainder, 'rightRemainder'),
        plain(d.setAside, 'setAside'),
        row.castNumber === 3
          ? padStartVisual(`⇒ ${d.combinedPiles}`, colWidth('sigma'))
          : padStartVisual(String(d.combinedPiles), colWidth('sigma')),
      ].join(LEDGER_GUTTER)
    }
    const body = section.rows
      .map((row) => (row.trailingRule ? `${dataRow(row)}\n${blockRule}` : dataRow(row)))
      .join('\n')
    return `## CASTING\n\n\`\`\`text\n${bannerRow}\n${headerRow}\n${headerRule}\n${body}\n\`\`\`\n`
  }
  ```
  > **Markdown casting never sees null cells:** `markdownConsultationBody` is only
  > called with a full `CastingRecord | null` — never a partial. The `null`
  > section → "Casting not recorded"; otherwise every `row.cell` is a
  > `DerivedSplit`. The throw is a guard, not a code path the fixtures exercise.
- [ ] Write `domain/consultation-file/tests/serialize-markdown-parity.test.ts` asserting byte-equivalence with legacy `castingMarkdownSection` for the four shared `cases` + the null case.
- [ ] Add `@hexagram/consultation-view` + `@hexagram/text-layout` to `domain/consultation-file/package.json`; `pnpm install`.
- [ ] `pnpm --filter @hexagram/consultation-file test -- serialize-markdown-parity`. Expected: ledger parity passes.
- [ ] Commit: `consultation-file: IR→Markdown casting-ledger serializer (parity-gated)`.

## Task 3c.2 — Markdown serializers for query, transformation, hexagram, lines

**Files:**
- Modify: `domain/consultation-file/src/serialize-markdown.ts`
- Modify: `domain/consultation-file/tests/serialize-markdown-parity.test.ts`

- [ ] `serializeQueryMarkdown(s: QuerySection)` — port `queryMarkdownSection` (`_(Query not provided)_` when empty).
- [ ] `serializeTransformationMarkdown(section: TransformationSection)` — port `transformationMarkdownSection`. Header `  Standing` padded to `RIGHT_COLUMN` + `Emerging`; rows `  {s}  {LINE_GLYPH[s]}  {pos}{gap}{e}  {LINE_GLYPH[e]}  {pos}` with `gap = standing.moving ? MOVING_ARROW : STATIC_GAP`; footer1/footer2 from identities (`footer2` uses `minGap=6`). Wrap in a `text` fence. `(No transformation)` when `body === null`.
  > Note the markdown transformation uses the bare line *digit* `{s}` and
  > `{LINE_GLYPH[s]}` — no colour, no name labels beyond the footer. The
  > markdown header text is `Standing`/`Emerging` (NOT `Standing Hexagram`); the
  > ANSI header is `Standing Hexagram`/`Emerging Hexagram`. Keep them distinct.
- [ ] `serializeHexagramMarkdown(section: HexagramSection)` — port `hexagramSection`+`hexagramDiagramBlock`: the `## {STANDING|EMERGING} HEXAGRAM {N}` heading, `_Line at bottom is first._`, the fenced diagram with `──┐/──┼──/──┘` braces (trigram imagery from `identity`), `_First is line at bottom._`, the comma row of digits, then the four `### {language}` name variants.
- [ ] `serializeLinesMarkdown(section: TextSection)` — port `linesMarkdownBlock` + its three sub-blocks. `variant: 'none'` → `linesNoMovingBlock` shape (`_No moving lines._` + the four `### lang / #### Scripture / #### Exegesis` from `section.variants` = hexagram text). `variant: 'one'` → `_One moving line._` + the line variants. `variant: 'multi'` → `linesMultiMovingBlock` notice.
  > Markdown LINES uses `#### Scripture` / `#### Exegesis` subheadings and does
  > NOT apply the `\n  ` indent (that was an ANSI-only quirk). Confirm via parity.
- [ ] Extend the parity test with one `it` per legacy markdown builder × shared cases (+ no/one/multi-moving). Each `expect(serializeX(section)).toBe(legacyX(...))`.
- [ ] `pnpm --filter @hexagram/consultation-file test -- serialize-markdown-parity`. Expected: every markdown section byte-identical.
- [ ] Commit: `consultation-file: IR→Markdown serializers for query/transformation/hexagram/lines (parity-gated)`.

## Task 3c.3 — Compose the body from the IR; swap `markdownConsultationBody`

**Files:**
- Modify: `domain/consultation-file/src/markdown.ts`
- Modify: `domain/consultation-file/src/serialize-markdown.ts` (add the body composer)

- [ ] Add `serializeConsultationMarkdownBody(view: ConsultationView): string` to `serialize-markdown.ts` that walks `view.sections` and joins with `'\n'` (matching the current `parts.join('\n')`) in this projection: query, casting, transformation, standing hexagram, [emerging hexagram if `hasMovingLines`], LINES. **Skip** the `text:hexagram` IR sections (markdown folds hexagram text into the trailing LINES block in the no-moving case; for moving cases the hexagram text is NOT in the markdown body at all — verify against `md-body-one-moving.md`).
  > **Verify the moving-case body:** check `md-body-one-moving.md` to confirm the
  > markdown body for a moving hexagram contains STANDING diagram, EMERGING
  > diagram, then LINES (one moving line) — and does NOT contain hexagram-level
  > scripture. The current `markdownConsultationBody` never calls a
  > hexagram-text builder, so the projection skips `text:hexagram` entirely.
- [ ] Rewrite `markdownConsultationBody`:
  ```ts
  import { buildConsultationView } from '@hexagram/consultation-view'
  import { serializeConsultationMarkdownBody } from './serialize-markdown.js'

  export function markdownConsultationBody(
    query: string, hexagram: Hexagram, casting: CastingRecord | null,
  ): string {
    return serializeConsultationMarkdownBody(buildConsultationView(query, hexagram, casting))
  }
  ```
- [ ] **BYTE-IDENTITY GATE 3:** regenerate the consultation-file fixtures and confirm a clean diff:
  ```bash
  pnpm --filter @hexagram/consultation-file generate-fixtures
  git diff --stat -- domain/consultation-file/tests/fixtures
  ```
  Expected: **NO** changes to `md-body-*.md` or `md-file-*.md`. Any byte change is a regression.
- [ ] Run the shipping fixture tests: `pnpm --filter @hexagram/consultation-file test`. Expected: `fixtures.test.ts`, `markdown.test.ts`, `markdown-sections.test.ts`, `file.test.ts`, `legacy-converter.test.ts` all pass.
- [ ] Commit: `consultation-file: markdownConsultationBody delegates to the IR serializer`.

## Task 3c.4 — Delete the legacy Markdown builders

**Files:**
- Delete: `domain/consultation-file/src/markdown-sections.ts`
- Delete: `domain/consultation-file/tests/serialize-markdown-parity.test.ts`
- Modify: `domain/consultation-file/tests/markdown-sections.test.ts` (re-point or fold into serializer tests)

- [ ] Check who imports `markdown-sections.ts`:
  ```bash
  grep -rn "markdown-sections" domain/consultation-file/src domain/consultation-file/tests
  ```
  Expected: only `markdown.ts` (now rewritten) and `markdown-sections.test.ts`.
- [ ] Re-point `markdown-sections.test.ts` to the new `serialize-markdown.ts` functions (or delete its now-redundant cases — the fixture gate is the standing regression net).
- [ ] Delete `markdown-sections.ts` + the temporary parity test.
- [ ] `pnpm --filter @hexagram/consultation-file type:check && pnpm --filter @hexagram/consultation-file test`. Expected: clean.
- [ ] **BYTE-IDENTITY GATE 4:** `pnpm --filter @hexagram/consultation-file generate-fixtures`; `git diff` empty.
- [ ] Commit: `consultation-file: delete legacy Markdown section builders`.

**Phase 3c complete.** Markdown rendering now flows IR → serializer; `md-body`
+ `md-file` fixtures byte-unchanged.

---

# Phase 3d — Collapse the two composers + harmonize the plain section order

**Intent:** Remove the divergence between `buildConsultationSections` (readout)
and `consultationConsoleOutput` (casting-ui) by giving the console output its own
IR projection and deleting the section-builder shims. Then, in a **separate,
clearly-labelled commit** (Task 3d.3), harmonize the `--plain` console section
order to the single canonical IR order (LINES last), so all surfaces speak one
order. That harmonize commit is the slice's only sanctioned byte change.

**Deliberately NOT doing:** The full playground-display cutover is handled in its
own Phase 3e (it is now IN scope for the slice — the third copy of the
glyph/identity stack is eliminated there). Phase 3d touches no playground code.

## Task 3d.1 — `consultationConsoleOutput` projects the IR directly

**Files:**
- Modify: `cli/casting-ui/src/output-composers.ts`
- Create: `cli/readout/src/serialize-ansi.ts` — add `serializeConsoleOutput(view): string`
- Modify: `cli/readout/src/index.ts` (export `serializeConsoleOutput`)

In THIS task the console output keeps its **legacy** order so the structural
cutover is a pure no-op against the fixtures (the order change is deferred to its
own commit, Task 3d.3). The legacy order is: `\n\n` + query, casting,
transformation, standing HEXAGRAM, standing hexagram TEXT, **[LINES if moving],
[emerging HEXAGRAM, emerging hexagram TEXT]** + `\n` — i.e. LINES *before*
emerging. Build it by walking `view.sections` but emitting them in that legacy
order, with the no-moving LINES section suppressed (the LINES `text` serializer
returns `''` for no-moving in the ANSI path).

- [ ] Add `serializeConsoleOutput(view: ConsultationView): string` to `serialize-ansi.ts`. Project the IR into the **legacy plain order** (LINES before emerging) so this commit is byte-clean; index the sections by kind/role rather than relying on the IR's canonical list order:
  ```ts
  export function serializeConsoleOutput(view: ConsultationView): string {
    const byKind = view.sections
    const query = byKind.find((s) => s.kind === 'query')!
    const casting = byKind.find((s) => s.kind === 'casting')!
    const transformation = byKind.find((s) => s.kind === 'transformation')!
    const hexes = byKind.filter((s) => s.kind === 'hexagram') // [standing, (emerging?)]
    const hexTexts = byKind.filter((s) => s.kind === 'text' && s.role === 'hexagram')
    const linesSection = byKind.find((s) => s.kind === 'text' && s.role === 'lines')!

    const parts: string[] = [
      serializeQueryAnsi(query as QuerySection),
      serializeCastingAnsi(casting as CastingSection),
      serializeTransformationAnsi(transformation as TransformationSection),
      serializeHexagramAnsi(hexes[0] as HexagramSection),   // standing diagram
      serializeTextAnsi(hexTexts[0] as TextSection),        // standing hexagram text
    ]
    // LEGACY plain order: LINES (if any) BEFORE the emerging block.
    const linesOut = serializeTextAnsi(linesSection as TextSection)
    if (linesOut !== '') parts.push(linesOut) // no-moving → '' (suppressed)
    if (view.hasMovingLines) {
      parts.push(
        serializeHexagramAnsi(hexes[1] as HexagramSection),  // emerging diagram
        serializeTextAnsi(hexTexts[1] as TextSection),       // emerging hexagram text
      )
    }
    return `\n\n${parts.join('\n\n')}\n`
  }
  ```
  > **Why legacy order HERE:** decision (B) is to harmonize the plain order, but
  > the harmonize is a reviewed *behaviour change* that must land in its own
  > commit (3d.3) so a reviewer sees the order swap in isolation from the
  > structural IR cutover. So Task 3d.1 reproduces the existing plain order
  > exactly (clean fixture diff); Task 3d.3 then flips this projector to the
  > canonical order. The `plain-output-*.txt` fixture gate is the arbiter at both
  > steps — clean here, one intended swap there.
- [ ] Rewrite `cli/casting-ui/src/output-composers.ts`:
  ```ts
  import { buildConsultationView } from '@hexagram/consultation-view'
  import { serializeConsoleOutput } from '@hexagram/readout'
  import type { CastingRecord, Hexagram } from '@hexagram/core/types'

  export function consultationConsoleOutput(
    query: string, hexagram: Hexagram, casting: CastingRecord,
  ): string {
    return serializeConsoleOutput(buildConsultationView(query, hexagram, casting))
  }
  ```
- [ ] **BYTE-IDENTITY GATE 5:** `pnpm --filter @hexagram/casting-ui generate-fixtures`; `git diff -- cli/casting-ui/tests/fixtures` empty. Run `pnpm --filter @hexagram/casting-ui test -- output`.
- [ ] Commit: `casting-ui: consultationConsoleOutput projects the IR (one composer path)`.

## Task 3d.2 — Delete the section-builder shims

**Files:**
- Delete: `cli/readout/src/section-shims.ts`
- Modify: `cli/readout/src/index.ts`

- [ ] Confirm nothing imports the shimmed names anymore:
  ```bash
  grep -rn "querySection\|transformationSection\|standingHexagramSection\|emergingHexagramSection\|hexagramTextSection\|linesBlock\|castingSection" cli apps --include=*.ts --include=*.tsx | grep -v serialize-ansi | grep -v tests
  ```
  Expected: no remaining importers (casting-ui's `consultationConsoleOutput` now uses `serializeConsoleOutput`). If any remain, route them through the IR first.
- [ ] Delete `section-shims.ts`; drop those names from `index.ts`. Keep exporting `buildConsultationSections`, `buildPartialCastingSections`, `ConsultationSections`, `ConsultationReadout`, the casting-table row helpers, and the geometry re-exports.
- [ ] `pnpm --filter @hexagram/readout type:check && pnpm --filter @hexagram/readout test && pnpm --filter @hexagram/casting-ui test`. Expected: clean.
- [ ] Commit: `readout: remove section-builder shims (IR is the only path)`.

## Task 3d.3 — Harmonize the `--plain` section order (LINES last) — ISOLATED behaviour change

**Files:**
- Modify: `cli/readout/src/serialize-ansi.ts` (`serializeConsoleOutput` only)
- Regenerate: `cli/casting-ui/tests/fixtures/plain-output-*.txt`

> **This is the slice's ONE sanctioned byte change.** Per decision (B) we
> harmonize the plain console order to the single canonical IR order rather than
> preserving the legacy quirk. Keeping it in its own commit lets a reviewer see
> the section-order swap in isolation from the (byte-clean) structural cutover in
> Task 3d.1. The intended diff: the LINES block moves from *before* the emerging
> diagram/text to **after** it (matching the Ink viewer's tab grouping and the
> saved `.md` body). Nothing else in the plain output changes.

- [ ] Change `serializeConsoleOutput` to emit in the **canonical IR order** — walk `view.sections` in their natural order, with the no-moving LINES section suppressed (`''`):
  ```ts
  export function serializeConsoleOutput(view: ConsultationView): string {
    const parts: string[] = []
    for (const s of view.sections) {
      switch (s.kind) {
        case 'query': parts.push(serializeQueryAnsi(s)); break
        case 'casting': parts.push(serializeCastingAnsi(s)); break
        case 'transformation': parts.push(serializeTransformationAnsi(s)); break
        case 'hexagram': parts.push(serializeHexagramAnsi(s)); break
        case 'text': {
          const out = serializeTextAnsi(s)
          if (out !== '') parts.push(out) // no-moving LINES → '' (suppressed)
          break
        }
      }
    }
    return `\n\n${parts.join('\n\n')}\n`
  }
  ```
  > Now the projector is a straight walk of the IR's canonical order: query,
  > casting, transformation, hexagram:standing, text:hexagram(standing),
  > [hexagram:emerging, text:hexagram(emerging)], text:lines. The LINES block is
  > last, exactly as markdown and the Ink `standing` tab already place it. The
  > index-by-kind reordering from Task 3d.1 is deleted — this is simpler AND
  > correct under the harmonized order.
- [ ] **REGENERATE THE PLAIN FIXTURES (intended diff):**
  ```bash
  pnpm --filter @hexagram/casting-ui generate-fixtures
  git diff -- cli/casting-ui/tests/fixtures/plain-output-one-moving.txt
  git diff -- cli/casting-ui/tests/fixtures/plain-output-multi-moving.txt
  ```
  Expected: the ONLY change is the EMERGING block and the LINES block swapping
  position in the moving cases (`plain-output-one-moving.txt`,
  `plain-output-multi-moving.txt`). The no-moving and empty-query fixtures
  (`plain-output-no-moving.txt`, `plain-output-empty-query.txt`) are UNCHANGED
  (no emerging block → no swap). Inspect the diff and confirm it is *purely* the
  section-order move — no content, whitespace, or glyph change inside any
  section. If anything else moved, STOP: the serializer regressed.
- [ ] **VERIFY Ink + Markdown stayed identical:**
  ```bash
  git status --porcelain -- cli/casting-ui/tests/fixtures/ink-sections-*.json
  pnpm --filter @hexagram/consultation-file generate-fixtures
  git status --porcelain -- domain/consultation-file/tests/fixtures
  ```
  Expected: BOTH empty. The Ink tab strings are order-neutral (LINES lives inside
  the `standing` tab string regardless), and markdown already emitted LINES last,
  so neither changes under harmonization.
- [ ] Run the shipping fixture tests: `pnpm --filter @hexagram/casting-ui test -- output`. Expected: pass against the regenerated plain fixtures.
- [ ] Commit (clearly labelled as the behaviour change): `casting-ui: harmonize --plain section order — LINES block now last (matches Ink + .md)`.

**Phase 3d complete.** One consultation composer path; the section-builder shims
are gone; the plain console now speaks the single canonical order. Ink + Markdown
fixtures byte-unchanged; the plain fixtures carry exactly one reviewed diff (the
LINES-block move).

---

# Phase 3e — Cut the playground display over to a consumer of the IR

**Intent:** Eliminate the THIRD copy of the presentation knowledge. The
playground's top-half display (`playground-display.ts` +
`playground-display-rows.ts` + `playground-display-identity.ts`) independently
rebuilds the hexagram-identity stack (`#N 名（pinyin）` / Wilhelm-Baynes /
`Upper:` / `Lower:` trigram rows — `identityRows`), the side-by-side
standing/emerging diagram rows, the `Standing Hexagram`/`Emerging Hexagram`
header, and the `MOVING_ARROW`/`STATIC_GAP` gap geometry — duplicating exactly
what `transformationSection` + the IR's `HexagramIdentity` + `DiagramLineRow`
already encode. Make the playground a **consumer of a consultation-view IR
subset**: the identity strings and diagram-row data come from
`@hexagram/consultation-view`; `playground-display-*` keeps ONLY its
playground-specific Ink presentation (focus chevron, pulse-driven colour, the
4-state-explorer dim-ghost mirror, its own `padCellToWidth`/`TOP_HALF_WIDTH`
geometry).

**Why a SUBSET, not the whole `ConsultationView`:** the playground renders a
live 4-state line explorer, not a saved consultation — it has no query, no
casting ledger, no scripture/exegesis text sections, and it paints a *pulse* and
a *dim-ghost emerging mirror* that the consultation document never shows. Forcing
the whole document through it would be wrong. So consultation-view exposes a small
named sub-builder for the two pieces the playground actually shares — the
hexagram identity and the diagram rows — and the playground composes its Ink rows
from those. The playground's existing render tests
(`playground-display*.test.ts`, `top-half-width-invariant.test.ts`) are the
regression gate; there is no fixture file for the playground.

**Deliberately NOT doing:** Not changing the playground's geometry constants
(`BAR_BLOCK_WIDTH`, `GAP_WIDTH`, `TOP_HALF_WIDTH`, `IDENTITY_DIVIDER_WIDTH`),
its chevron/pulse/dim-ghost behaviour, or its Ink component tree. Only the
*data* (identity strings, diagram line values + positions + moving flags) and
the shared vocabulary (`POSITION_LABELS`, `MOVING_ARROW`, `STATIC_GAP`,
`LINE_GLYPH` if duplicated) move to consultation-view.

## Task 3e.1 — Expose the identity/diagram subset from consultation-view

**Files:**
- Modify: `domain/consultation-view/src/build-view.ts` (export `hexagramIdentity` + `hexagramDiagramRows`)
- Modify: `domain/consultation-view/src/index.ts`
- Create: `domain/consultation-view/tests/identity-subset.test.ts`

The IR already computes both pieces internally (`identityOf`, `diagramRows`).
Promote them to a clean public sub-builder so the playground can reuse them
without going through `buildConsultationView` (which would force a query +
casting it does not have).

- [ ] In `build-view.ts`, export the two helpers under stable public names (keep the internal callers using them):
  ```ts
  /** Public sub-builder: the hexagram identity strings (no record traversal in consumers). */
  export function hexagramIdentity(hexagram: Hexagram): HexagramIdentity {
    return identityOf(hexagram)
  }

  /** Public sub-builder: the top-first diagram rows (line value, position, moving flag). */
  export function hexagramDiagramRows(
    hexagram: Hexagram,
    movingFrom: Hexagram = hexagram,
  ): readonly DiagramLineRow[] {
    return diagramRows(hexagram, movingFrom)
  }
  ```
  > **WHY a thin wrapper over the existing private functions:** `identityOf` /
  > `diagramRows` already encode the EXACT field extraction the playground's
  > `identityRows` duplicates (note the matching `capitalizeFirst` on the trigram
  > pinyin). Exposing them — rather than copying — is the whole point of the
  > slice. Keep the wrappers paper-thin so there is one authoritative extraction.
- [ ] Export both from `domain/consultation-view/src/index.ts` alongside `buildConsultationView`.
- [ ] Write `domain/consultation-view/tests/identity-subset.test.ts` asserting `hexagramIdentity` returns the four playground rows' source strings and `hexagramDiagramRows` returns 6 top-first rows with correct `moving` flags (pin against a known hexagram, e.g. `#9 小畜`, the playground width worst-case).
- [ ] `pnpm --filter @hexagram/consultation-view test && pnpm --filter @hexagram/consultation-view build`. Expected: clean.
- [ ] Commit: `consultation-view: expose hexagramIdentity + hexagramDiagramRows sub-builders`.

## Task 3e.2 — Playground identity stack consumes `hexagramIdentity`

**Files:**
- Modify: `cli/playground-ui/src/playground-display-identity.ts`
- Modify: `cli/playground-ui/package.json` (add `@hexagram/consultation-view` dep)

The playground's `identityRows` builds four strings from
`getHexagramRecord`/`getTrigramRecord` — character-for-character the same
extraction as the IR's `HexagramIdentity` (same `capitalizeFirst`, same
`#${wenwang} ${chinese}（${pinyin}）` / `Upper: …` / `Lower: …` shapes). Rebuild
`identityRows` to compose those four strings from `hexagramIdentity(hexagram)`
instead of re-querying the records.

- [ ] Add `@hexagram/consultation-view` to `cli/playground-ui/package.json` deps; `pnpm install`.
- [ ] Rewrite `identityRows` to read from `hexagramIdentity`:
  ```ts
  import { hexagramIdentity } from '@hexagram/consultation-view'
  import type { Hexagram } from '@hexagram/core/types'

  export function identityRows(
    hexagram: Hexagram,
  ): readonly [string, string, string, string] {
    const id = hexagramIdentity(hexagram)
    return [
      `#${id.wenWang} ${id.chineseTraditional}（${id.pinyin}）`,
      id.englishWilhelmBaynes,
      `Upper: ${id.upperTrigramChinese} ${id.upperTrigramPinyin} (${id.upperTrigramEnglish})`,
      `Lower: ${id.lowerTrigramChinese} ${id.lowerTrigramPinyin} (${id.lowerTrigramEnglish})`,
    ] as const
  }
  ```
  > **Byte check on the trigram English:** the playground's `identityRows`
  > applies `capitalizeFirst` to `upperEnglish`/`lowerEnglish`, but the IR's
  > `HexagramIdentity.upperTrigramEnglish` is the RAW `Imagery.English.WilhelmBaynes`
  > (no capitalization — the ANSI/markdown transformation footer does not
  > capitalize it). VERIFY this against the playground tests: if the playground
  > needs the capitalized form, either (a) wrap with `capitalizeFirst` here, or
  > (b) confirm the trigram imagery already starts capitalized. Read the actual
  > strings and the existing `playground-display-identity` test before deleting
  > the local `capitalizeFirst` import; keep whichever makes the playground tests
  > pass. This is the one spot where the two extractions might legitimately
  > differ — resolve it explicitly, do not assume parity.
- [ ] Delete the now-unused `getHexagramRecord`/`getTrigramRecord` imports (and `capitalizeFirst` if the IR's strings already match).
- [ ] `pnpm --filter @hexagram/playground-ui type:check && pnpm --filter @hexagram/playground-ui test`. Expected: the playground identity-stack render tests pass unchanged.
- [ ] Commit: `playground-ui: identity stack consumes consultation-view hexagramIdentity`.

## Task 3e.3 — Playground diagram rows + vocabulary consume the IR

**Files:**
- Modify: `cli/playground-ui/src/playground-display.ts`
- Modify: `cli/playground-ui/src/playground-display-rows.ts`

The playground's `buildPlaygroundDisplay` iterates `5..0` building
`buildLineRow` inputs from `standing[lineIndex]` / `emerging[lineIndex]` +
`POSITION_LABELS`, and `buildLineRow` chooses `gap = MOVING_ARROW : STATIC_GAP`
off `isMovingLine(standingLine)`. All of that is exactly the IR's
`DiagramLineRow` data. Re-point the vocabulary imports and drive the row loop
off `hexagramDiagramRows`.

- [ ] Re-point `POSITION_LABELS` (in `playground-display.ts`) and `MOVING_ARROW` / `STATIC_GAP` (in `playground-display-rows.ts`) from `@hexagram/readout` to `@hexagram/consultation-view` (their canonical home). If `playground-display-rows.ts` carries a local `LINE_GLYPH`-equivalent glyph map, swap it for the IR's `LINE_GLYPH`.
- [ ] In `buildPlaygroundDisplay`, derive the per-line inputs from `hexagramDiagramRows(standing)` and `hexagramDiagramRows(emerging)` (the `line`, `position`, and `moving` fields) rather than indexing the raw `Hexagram` tuples and re-deriving `POSITION_LABELS[lineIndex+1]` / `isMovingLine` inline. Keep the playground's `focusIndex`, `pulse`, `hasMoving`, chevron, and dim-ghost logic exactly as-is — those are the playground-specific presentation the IR does NOT own.
  > **Keep the moving flag source honest:** `buildLineRow` currently recomputes
  > `isMovingLine(standingLine)`. The IR's `DiagramLineRow.moving` already carries
  > this. Pass the IR row's `moving` through instead of recomputing, so the
  > playground and the consultation transformation can never disagree about which
  > line is moving. The pulse/colour choice stays in the playground.
- [ ] `pnpm --filter @hexagram/playground-ui type:check && pnpm --filter @hexagram/playground-ui test`. Expected: `playground-display.test.ts`, `playground-display-rows.test.ts`, `top-half-width-invariant.test.ts` all pass unchanged — the rendered bytes are identical because the data source is the same extraction, just centralized.
- [ ] Commit: `playground-ui: drive diagram rows + gap geometry from consultation-view IR`.

## Task 3e.4 — Confirm the third copy is gone

**Files:**
- (verification only)

- [ ] Confirm the playground no longer queries hexagram/trigram records for display geometry, nor re-declares the vocabulary:
  ```bash
  grep -rn "getHexagramRecord\|getTrigramRecord\|POSITION_LABELS\s*=\|MOVING_ARROW\s*=\|STATIC_GAP\s*=\|LINE_GLYPH\s*=" cli/playground-ui/src
  ```
  Expected: no display-side record lookups and no local re-declarations of the shared vocabulary (any remaining record lookups belong to non-display modules like `playground-lines.ts` / `playground-state.ts` — confirm none are in `playground-display-*`).
- [ ] `grep -rn "@hexagram/readout" cli/playground-ui/src` — expected: empty (the playground's only consultation-presentation dependency is now `@hexagram/consultation-view`; it no longer reaches into readout for vocabulary).
- [ ] `pnpm --filter @hexagram/playground-ui test`. Expected: green.
- [ ] Commit (if the grep surfaced any straggler import to clean up): `playground-ui: drop the last @hexagram/readout vocabulary import`.

**Phase 3e complete.** The third copy of the glyph map / position labels /
identity geometry is eliminated; the playground display is a thin Ink serializer
over the consultation-view identity + diagram-row subset. Its existing render
tests are green and unchanged.

---

# Phase 3f — Full-suite verification + ADR

## Task 3f.1 — Full-suite verification + ADR

**Files:**
- Create: `docs/adr/0018-consultation-view-ir.md`
- Modify: `docs/adr/README.md` (index row)
- Modify: `AGENTS.md` / `CLAUDE.md` repository-layout section (add the package)

- [ ] Run the full workspace gate:
  ```bash
  pnpm type:check
  pnpm lint:check
  pnpm format:check
  pnpm test
  ```
  Expected: all green. (The slow `rng distribution` block in core runs ~40s; that is expected.)
- [ ] **FINAL FIXTURE GATE (one intended diff, already committed):** regenerate BOTH fixture sets and confirm the tree is clean — i.e. the only byte change in the whole slice (the harmonized plain order) is already committed, so a fresh regen now yields nothing:
  ```bash
  pnpm generate-fixtures
  pnpm --filter @hexagram/consultation-file generate-fixtures
  git status --porcelain -- '*/tests/fixtures'
  ```
  Expected: **EMPTY** output. `ink-sections-*.json`, `md-body-*.md`, `md-file-*.md` are byte-for-byte the pre-slice ground truth; `plain-output-*.txt` matches the post-harmonize ground truth committed in Task 3d.3. (If `plain-output-*.txt` shows further drift here, a serializer regressed AFTER the harmonize commit — STOP and bisect.)
- [ ] Run the CI-contention stress check before opening the PR (Ink components moved indirectly via the readout serializer + the playground display; cheap pass):
  ```bash
  pnpm test:stress:once
  ```
  Expected: green across all four concurrent passes.
- [ ] Write `docs/adr/0018-consultation-view-ir.md` (Accepted): the decision to centralize the consultation presentation vocabulary + section IR + single assembly in `@hexagram/consultation-view`, with the FOUR renderers (ANSI readout, Markdown body, the collapsed console composer, AND the playground display) as thin serializers; record the considered options (leave duplicated / subpath in readout / full IR package — chosen) and the consequence that the IR carries semantic structure while serializers own medium formatting (the seam that preserves byte-identity). Record the harmonize-plain-order decision and its consequence (plain `--plain` section order changed once, intentionally, to match Ink + `.md`). Note that the playground consumes only the identity/diagram **subset** of the IR. Cross-link ADR-0016 — this ADR DEEPENS it: 0016 claimed "all consultation rendering has one home"; 0018 records that the *vocabulary + structure + assembly* home is now `consultation-view`, with readout owning ANSI serialization + the Ink component. State the deepening relative to ADR-0016 explicitly.
- [ ] Add the ADR-0018 row to `docs/adr/README.md` and note the deepening of 0016 (do not edit 0016 in place beyond a pointer to 0018).
- [ ] Update the repository-layout list in `AGENTS.md` (and the mirrored note in `CLAUDE.md` if present) to include `domain/consultation-view` with its one-line description and its place in the DAG (`core` + `text-layout` → `consultation-view` → `readout` + `consultation-file` + `playground-ui`).
- [ ] Commit: `docs: record consultation-view IR decision (ADR-0018) + layout`.

**Phase 3f complete.** One IR, one assembly, one vocabulary; FOUR thin
serializers (ANSI readout, Markdown body, console composer, playground display);
Ink + Markdown fixtures byte-identical; plain fixtures carry exactly one
reviewed, committed section-order change.

---

## Regression-gate summary (the contract of this slice)

The slice has ONE sanctioned byte change: the harmonized `--plain` section order
(LINES last), landed in Task 3d.3 with its own committed fixture regen. With that
exception, regenerating the fixtures at every phase boundary from 3b on yields
**no `git diff`**:

```bash
pnpm generate-fixtures                                   # plain-output-*.txt + ink-sections-*.json
pnpm --filter @hexagram/consultation-file generate-fixtures  # md-body-*.md + md-file-*.md
git status --porcelain -- '*/tests/fixtures'             # MUST be empty (post-3d.3 ground truth)
```

- **Plain (`--plain` console) output** is locked by `plain-output-*.txt` via
  `output.test.ts`'s `consultationConsoleOutput` fixture-parity block. These
  fixtures change EXACTLY ONCE, in Task 3d.3 (the LINES block moves to last in
  the moving cases — `plain-output-one-moving.txt`,
  `plain-output-multi-moving.txt`; the no-moving / empty-query fixtures are
  unaffected). After that commit they are stable ground truth.
- **Ink viewer** tab strings are locked by `ink-sections-*.json` via
  `output.test.ts`'s `buildConsultationSections` fixture-parity block —
  byte-identical throughout (tab grouping is order-neutral).
- **Markdown saved file** (body + full file) is locked by `md-body-*.md` /
  `md-file-*.md` via `consultation-file`'s `fixtures.test.ts` —
  byte-identical throughout (markdown already emits LINES last).
- **Playground display** has no fixture file; its standing regression gate is
  `cli/playground-ui`'s render tests (`playground-display*.test.ts`,
  `top-half-width-invariant.test.ts`), which stay green and unchanged through
  Phase 3e (the data source moves to the IR but the rendered bytes do not).

These are the proof that Ink + Markdown output are unchanged, that plain content
is unchanged (only its section order is harmonized), and that the playground
render is unchanged. The per-phase temporary *parity tests* (serializer vs legacy
builder) are a finer-grained scaffold that is deleted once the fixture gate
stands alone.
