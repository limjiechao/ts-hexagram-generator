# Encapsulate Section→Medium Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the public per-section `media` flag from the consultation-view IR and replace it with a single encapsulated, exhaustive visibility decision (`sectionVisibility`) projected through one sanctioned function (`sectionsForMedium`), so no future consumer can invent its own section-visibility rule and so adding a render medium forces an owner-side decision at compile time.

**Architecture:** Today each IR section carries `media: ('ansi'|'markdown')[]`, and three serializer sites hand-roll `for (const s of view.sections) if (!s.media.includes(M)) continue`. We delete that public flag. `buildConsultationView`'s module becomes the sole owner of visibility via a private `sectionVisibility(section): Record<SectionMedium, boolean>` and a public projector `sectionsForMedium(view, medium)`. Serializers route through the projector. **(1)** consumers can no longer read a flag (there is none) nor call the decision (it is not exported) — they must use `sectionsForMedium`. **(2)** the visibility constants are `Record`s over the closed `SectionMedium` union, so adding a medium turns every constant into a compile error until the owner decides its per-section visibility. Output is byte-identical, so the existing fixture suites are the regression net.

**Tech Stack:** TypeScript (strict), pnpm + Turborepo monorepo, Vitest. Affected packages: `@hexagram/consultation-view` (owner), `@hexagram/readout` (ANSI serializer), `@hexagram/consultation-file` (Markdown serializer).

---

## Background: every site that touches `media` (the full surface)

Production:
- `domain/consultation-view/src/ir.ts` — `SectionMedium` type (line 10, **keep**); `readonly media` field on 5 interfaces: `CastingSection` (33), `TransformationSection` (93), `HexagramSection` (108), `TextSection` (127), `QuerySection` (137) — **all removed**. `ConsultationView` doc comment (148–159) mentions the flag — **reword**.
- `domain/consultation-view/src/build-view.ts` — `media:[...]` literals in `querySection` (181), `castingSection` (195), `linesSection` (152/160/167), and 5 inline sections inside `buildConsultationView` (transformation 274, hexagram standing 292, text hexagram 300, hexagram emerging 310, text hexagram emerging 318); the ASCII visibility-matrix comment (229–256). **All removed / replaced by `sectionVisibility` + `sectionsForMedium`.**
- `cli/readout/src/serialize-ansi.ts` — `serializeConsoleOutput` loop (line 304 `if (!s.media.includes('ansi'))`) and `serializeConsultationTabs` (line 276 `lines.media.includes('ansi')`). **Both routed through `sectionsForMedium`.**
- `domain/consultation-file/src/serialize-markdown.ts` — `serializeConsultationMarkdownBody` loop (line 190 `if (!s.media.includes('markdown'))`). **Routed through `sectionsForMedium`.**

Tests:
- `domain/consultation-view/tests/build-view.test.ts` — `.media` assertions (125, 126, 136, 139). **Rewritten to assert `sectionsForMedium` membership** + a new executable-matrix test.
- `domain/consultation-file/tests/markdown-sections.test.ts` — hand-constructs `{ kind:'query', media:[...], query }` (line 35). **Switched to the `querySection` sub-builder.**

Not affected (verified): `cli/casting-ui/src/viewer-flow.ts:329` and `cli/casting-ui/src/viewer.tsx:440` reference `state.sections` / `action.sections`, which are `ConsultationSections` (the four rendered tab strings), **not** the IR `ConsultationView.sections`. `cli/readout/src/output-composers.ts` and `cli/casting-ui/src/output-composers.ts` reference `media` only in comments (no field access).

**Output must not change.** The byte fixtures (`cli/casting-ui/tests/fixtures/`, `domain/consultation-file/tests/fixtures/`) are the safety net. Do **not** run `pnpm generate-fixtures` — the fixtures must pass unchanged.

---

## Task 1: Replace the `media` flag with `sectionVisibility` + `sectionsForMedium`

This is one atomic refactor: removing a shared field forces all its readers to change together (that field *is* the coupling). The steps keep the change ordered; the package test suites verify green at the end.

**Files:**
- Modify: `domain/consultation-view/src/ir.ts` (remove 5 `media` fields; reword `ConsultationView` doc)
- Modify: `domain/consultation-view/src/build-view.ts` (remove all `media:[...]` literals + matrix comment; add `sectionVisibility` + `sectionsForMedium`)
- Modify: `cli/readout/src/serialize-ansi.ts` (2 sites)
- Modify: `domain/consultation-file/src/serialize-markdown.ts` (1 site)
- Test: `domain/consultation-view/tests/build-view.test.ts` (rewrite `.media` assertions + add executable-matrix test)
- Test: `domain/consultation-file/tests/markdown-sections.test.ts` (use `querySection` sub-builder)

- [ ] **Step 1: Write the failing tests in `build-view.test.ts`**

Replace the entire `describe('buildConsultationView medium divergence (S5)', ...)` block (lines 104–144) with the block below, and add the import of `sectionsForMedium` + the `ConsultationView` type. Update the import block at the top (lines 4–14) to:

```ts
import {
  buildConsultationView,
  castingSection,
  querySection,
  sectionsForMedium,
} from '../src/build-view.js'
import type {
  CastingSection,
  ConsultationSection,
  ConsultationView,
  QuerySection,
  TextSection,
  TransformationSection,
} from '../src/ir.js'
```

Replace lines 104–144 with:

```ts
describe('buildConsultationView medium divergence (S5)', () => {
  // The IR's ONE deliberate medium-aware divergence (ADR-0018): for a STATIC
  // hexagram the same hexagram-level scripture is emitted as `text:hexagram`
  // (ANSI-only) AND `text:lines:none` (Markdown-only). Pin it as an executable
  // invariant via the sectionsForMedium projection (there is no per-section
  // media flag to assert on — visibility is owned by sectionVisibility).
  const textSection = (
    view: ConsultationView,
    role: string,
    variant: string,
  ) =>
    view.sections.find(
      (s): s is TextSection =>
        s.kind === 'text' &&
        (s as TextSection).role === role &&
        (s as TextSection).variant === variant,
    )!

  it('static hexagram: scripture is ANSI via text:hexagram, Markdown via text:lines:none — same words', () => {
    const staticHex: Hexagram = [7, 8, 7, 8, 7, 8]
    const view = buildConsultationView('Q', staticHex, casting)
    const hexagramText = textSection(view, 'hexagram', 'hexagram')
    const linesNone = textSection(view, 'lines', 'none')

    expect(sectionsForMedium(view, 'ansi')).toContain(hexagramText)
    expect(sectionsForMedium(view, 'markdown')).not.toContain(hexagramText)
    expect(sectionsForMedium(view, 'markdown')).toContain(linesNone)
    expect(sectionsForMedium(view, 'ansi')).not.toContain(linesNone)
    // Same words, two section identities — the divergence is medium, not content.
    expect(linesNone.variants).toEqual(hexagramText.variants)
  })

  it('one moving line: LINES carries the line reading and renders in both media', () => {
    const movingHex: Hexagram = [6, 7, 8, 7, 8, 7]
    const view = buildConsultationView('Q', movingHex, casting)
    const ansi = sectionsForMedium(view, 'ansi')
    const markdown = sectionsForMedium(view, 'markdown')
    // Standing + emerging hexagram scripture stay ANSI-only.
    for (const s of view.sections)
      if (s.kind === 'text' && s.role === 'hexagram') {
        expect(ansi).toContain(s)
        expect(markdown).not.toContain(s)
      }
    // The LINES block carries the moving-line reading and is shared by both.
    const linesOne = textSection(view, 'lines', 'one')
    expect(ansi).toContain(linesOne)
    expect(markdown).toContain(linesOne)
  })
})

describe('sectionsForMedium visibility matrix (executable)', () => {
  // The former ASCII matrix, now an executable regression guard. Each label is
  // `kind` (or `kind:role` / `text:role:variant`) in canonical section order.
  const label = (s: ConsultationSection): string => {
    if (s.kind === 'text') return `text:${s.role}:${s.variant}`
    if (s.kind === 'hexagram') return `hexagram:${s.role}`
    return s.kind
  }

  it('static hexagram', () => {
    const v = buildConsultationView('Q', [7, 8, 7, 8, 7, 8], casting)
    expect(sectionsForMedium(v, 'ansi').map(label)).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'text:hexagram:hexagram',
    ])
    expect(sectionsForMedium(v, 'markdown').map(label)).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'text:lines:none',
    ])
  })

  it('one moving line', () => {
    const v = buildConsultationView('Q', [6, 7, 8, 7, 8, 7], casting)
    expect(sectionsForMedium(v, 'ansi').map(label)).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'text:hexagram:hexagram',
      'hexagram:emerging',
      'text:hexagram:hexagram',
      'text:lines:one',
    ])
    expect(sectionsForMedium(v, 'markdown').map(label)).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'hexagram:emerging',
      'text:lines:one',
    ])
  })

  it('multi moving lines', () => {
    const v = buildConsultationView('Q', [6, 9, 7, 8, 7, 8], casting)
    expect(sectionsForMedium(v, 'ansi').map(label)).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'text:hexagram:hexagram',
      'hexagram:emerging',
      'text:hexagram:hexagram',
      'text:lines:multi',
    ])
    expect(sectionsForMedium(v, 'markdown').map(label)).toEqual([
      'query',
      'casting',
      'transformation',
      'hexagram:standing',
      'hexagram:emerging',
      'text:lines:multi',
    ])
  })
})
```

Also update the now-stale comment at lines 167–171 (inside `describe('buildConsultationView absence reason')`). Replace:

```ts
  // ADR-0018: buildConsultationView is the SOLE owner of each section's `media`
  // projection. These pin that it mints query/casting via the shared public
  // sub-builders, so a second authority (e.g. the mid-flow render in
  // buildPartialCastingSections) can reuse them instead of hand-writing a
  // divergent `media` literal — see seam B2 in the 2026-06-08 review.
```

with:

```ts
  // ADR-0018: buildConsultationView is the SOLE owner of section visibility
  // (now `sectionVisibility`). These pin that it mints query/casting via the
  // shared public sub-builders, so a second authority (e.g. the mid-flow render
  // in buildPartialCastingSections) reuses them rather than re-deriving sections.
```

- [ ] **Step 2: Run the consultation-view tests to verify they fail**

Run: `pnpm --filter @hexagram/consultation-view test`
Expected: FAIL — `sectionsForMedium` is not exported from `build-view.js` (compile / import error).

- [ ] **Step 3: Add `sectionVisibility` + `sectionsForMedium` in `build-view.ts`**

In `domain/consultation-view/src/build-view.ts`, add `SectionMedium` to the type import from `./ir.js` (the existing block at lines 16–25):

```ts
import type {
  CastingSection,
  ConsultationSection,
  ConsultationView,
  DiagramLineRow,
  HexagramIdentity,
  QuerySection,
  SectionMedium,
  TextSection,
  TextVariant,
} from './ir.js'
```

Replace the entire ASCII matrix comment block (lines 229–256, from `// ── Section → medium visibility matrix` down to the line ending `not a new rule.`) with:

```ts
// ── Section → medium visibility (the single, executable decision) ────────────
// buildConsultationView (this module) is the SOLE owner of which media emit each
// section (ADR-0018). `sectionVisibility` is that decision in code — the former
// ASCII matrix made executable, so it can never drift from per-section literals.
// Serializers MUST route through `sectionsForMedium`: there is no per-section
// flag to read, and `sectionVisibility` is not exported, so no consumer can
// introduce a divergent visibility rule.
//
// Exhaustiveness teeth: each constant is a Record over the CLOSED SectionMedium
// union. Adding a new medium turns every constant below into a compile error
// until the owner decides that medium's visibility for each section group.
//
// The ONE deliberate divergence: for a STATIC (no-moving) hexagram the
// hexagram-level scripture is rendered ANSI-side by `text:hexagram` and
// Markdown-side by `text:lines:none` (Markdown folds that scripture into the
// trailing `## LINES` block). Same words, different sections, by design.
type SectionVisibility = Record<SectionMedium, boolean>
const BOTH_MEDIA: SectionVisibility = { ansi: true, markdown: true }
const ANSI_ONLY: SectionVisibility = { ansi: true, markdown: false }
const MARKDOWN_ONLY: SectionVisibility = { ansi: false, markdown: true }

function sectionVisibility(section: ConsultationSection): SectionVisibility {
  switch (section.kind) {
    case 'query':
    case 'casting':
    case 'transformation':
    case 'hexagram':
      return BOTH_MEDIA
    case 'text':
      // Hexagram-level scripture is ANSI-only; Markdown folds it into the
      // trailing LINES block via the no-moving `lines:none` section.
      if (section.role === 'hexagram') return ANSI_ONLY
      return section.variant === 'none' ? MARKDOWN_ONLY : BOTH_MEDIA
  }
}

/**
 * The ONE sanctioned way to project the view for a render medium. Serializers
 * filter through this instead of reading a per-section flag, so visibility stays
 * owned here (ADR-0018). `view.sections` remains the canonical, ordered,
 * medium-neutral list for content/order inspection.
 */
export function sectionsForMedium(
  view: ConsultationView,
  medium: SectionMedium,
): readonly ConsultationSection[] {
  return view.sections.filter((s) => sectionVisibility(s)[medium])
}
```

- [ ] **Step 4: Remove every `media:[...]` literal in `build-view.ts`**

In `querySection` (line 181):

```ts
export function querySection(query: string): QuerySection {
  return { kind: 'query', query }
}
```

In `castingSection` (lines 193–201) remove the `media` line:

```ts
  return {
    kind: 'casting',
    rows: casting === null ? null : buildLedgerRows(casting),
    // Guardrail: the reason only applies when there are no rows. Never let a
    // reason leak into a present-casting render (would change those fixtures).
    absenceReason: casting === null ? absenceReason : null,
  }
```

In `linesSection` (lines 144–172) remove all three `media` lines and update the comment:

```ts
// The no-moving `lines:none` branch is the Markdown half of the one medium
// divergence — see `sectionVisibility` below.
function linesSection(hexagram: Hexagram): TextSection {
  const movingCount = hexagram.filter(isMovingLine).length
  if (movingCount === 0)
    // No moving lines: the LINES block carries the hexagram-level text in
    // Markdown, while ANSI renders that text via the separate text:hexagram
    // section instead (see sectionVisibility: MARKDOWN_ONLY here).
    return {
      kind: 'text',
      role: 'lines',
      variant: 'none',
      variants: hexagramTextVariants(hexagram),
    }
  if (movingCount === 1)
    return {
      kind: 'text',
      role: 'lines',
      variant: 'one',
      variants: oneMovingLineVariants(hexagram),
    }
  return {
    kind: 'text',
    role: 'lines',
    variant: 'multi',
    variants: [],
  }
}
```

In `buildConsultationView`, remove the `media` line from each of the four inline sections — the transformation section (delete `media: ['ansi', 'markdown'],` at line 274), the standing hexagram (delete at line 292), the standing `text:hexagram` (delete `media: ['ansi'],` at line 300), and inside the `if (moving)` block the emerging hexagram (delete at line 310) and emerging `text:hexagram` (delete `media: ['ansi'],` at line 318). Leave every other field on those sections unchanged.

- [ ] **Step 5: Remove the `media` field from the IR interfaces in `ir.ts`**

In `domain/consultation-view/src/ir.ts`, delete the `readonly media: readonly SectionMedium[]` line from each of: `CastingSection` (line 33), `TransformationSection` (line 93), `HexagramSection` (line 108), `TextSection` (line 127), `QuerySection` (line 137). Keep the `SectionMedium` export (line 10) and update its doc comment:

```ts
/** Render media the view can be projected onto. Closed union: adding a member
 *  forces an owner-side visibility decision in `sectionVisibility`. */
export type SectionMedium = 'ansi' | 'markdown'
```

Update the `ConsultationView` doc comment (lines 148–159) — replace the sentence about each section carrying a `media` projection:

```ts
/**
 * The whole consultation as an ordered list of section descriptors. The order
 * is the single authoritative section order; the emerging gate is already
 * applied (no emerging hexagram / no LINES-moving sections when static).
 * Sections are medium-neutral and carry NO visibility flag — project the view
 * for a medium with `sectionsForMedium(view, medium)` (owned by
 * buildConsultationView), the single sanctioned visibility entry point.
 */
export interface ConsultationView {
  readonly sections: readonly ConsultationSection[]
  /** Convenience flag the serializers can branch on (already encoded in `sections`). */
  readonly hasMovingLines: boolean
}
```

- [ ] **Step 6: Route the ANSI serializer through `sectionsForMedium`**

In `cli/readout/src/serialize-ansi.ts`, add an import of the projector (alongside the existing `@hexagram/consultation-view/*` imports near the top):

```ts
import { sectionsForMedium } from '@hexagram/consultation-view/build-view'
```

In `serializeConsultationTabs` (lines 256–291), compute the ANSI projection once and use object-identity membership for the `lines` guard. Replace the `const ss = view.sections` line and the `standing` array's spread:

```ts
  const ss = view.sections
  const ansiSections = new Set(sectionsForMedium(view, 'ansi'))
```

and change the `standing` spread (line 276) from `lines.media.includes('ansi')` to:

```ts
    ...(ansiSections.has(lines) ? [serializeTextAnsi(lines)] : []),
```

In `serializeConsoleOutput` (lines 301–324), replace the loop header + media check:

```ts
export function serializeConsoleOutput(view: ConsultationView): string {
  const parts: string[] = []
  for (const s of sectionsForMedium(view, 'ansi')) {
    switch (s.kind) {
      case 'query':
        parts.push(serializeQueryAnsi(s))
        break
      case 'casting':
        parts.push(serializeCastingAnsi(s))
        break
      case 'transformation':
        parts.push(serializeTransformationAnsi(s))
        break
      case 'hexagram':
        parts.push(serializeHexagramAnsi(s))
        break
      case 'text':
        parts.push(serializeTextAnsi(s))
        break
    }
  }
  return `\n\n${parts.join('\n\n')}\n`
}
```

- [ ] **Step 7: Route the Markdown serializer through `sectionsForMedium`**

In `domain/consultation-file/src/serialize-markdown.ts`, add the import (alongside the existing `@hexagram/consultation-view/*` imports near the top):

```ts
import { sectionsForMedium } from '@hexagram/consultation-view/build-view'
```

Replace the loop header + media check in `serializeConsultationMarkdownBody` (lines 188–190):

```ts
  const parts: string[] = []
  for (const s of sectionsForMedium(view, 'markdown')) {
    switch (s.kind) {
```

(Delete the `if (!s.media.includes('markdown')) continue` line; leave the rest of the switch unchanged.)

- [ ] **Step 8: Fix the hand-constructed query section in `markdown-sections.test.ts`**

In `domain/consultation-file/tests/markdown-sections.test.ts`, add `querySection` to the existing value import from `@hexagram/consultation-view/build-view` (line 1):

```ts
import {
  buildConsultationView,
  querySection,
} from '@hexagram/consultation-view/build-view'
```

Replace the `queryMarkdownSection` helper (line 34–35):

```ts
const queryMarkdownSection = (query: string): string =>
  serializeQueryMarkdown(querySection(query))
```

- [ ] **Step 9: Run the three package test suites to verify they pass**

Run: `pnpm --filter @hexagram/consultation-view test && pnpm --filter @hexagram/readout test && pnpm --filter @hexagram/consultation-file test`
Expected: PASS. The consultation-file fixture suite (`md-body-*.md` / `md-file-*.md`) and the readout/consultation-view unit tests are all green, proving the Markdown + ANSI bytes are unchanged.

- [ ] **Step 10: Type-check the three packages**

Run: `pnpm --filter @hexagram/consultation-view type:check && pnpm --filter @hexagram/readout type:check && pnpm --filter @hexagram/consultation-file type:check`
Expected: PASS — no `media` references remain; `sectionsForMedium` resolves across package boundaries.

- [ ] **Step 11: Commit**

```bash
git add domain/consultation-view/src/ir.ts domain/consultation-view/src/build-view.ts \
  domain/consultation-view/tests/build-view.test.ts \
  cli/readout/src/serialize-ansi.ts \
  domain/consultation-file/src/serialize-markdown.ts \
  domain/consultation-file/tests/markdown-sections.test.ts
git commit -m "refactor(consultation-view): encapsulate section→medium visibility

Replace the public per-section media flag with a single owner-side decision
(sectionVisibility) projected through sectionsForMedium. Serializers can no
longer read a flag or call the decision, so no consumer can invent a divergent
visibility rule; the visibility constants are Records over the closed
SectionMedium union, so adding a medium is a compile error until the owner
decides its per-section visibility. Output is byte-identical (fixtures green)."
```

---

## Task 2: Verify byte-identical output across the whole workspace (regression net)

No code change — this task proves the refactor preserved every rendered byte and broke no consumer.

**Files:** none (verification only)

- [ ] **Step 1: Run the casting-ui plain-output + Ink-section fixtures**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS. The `plain-output-*.txt` and `ink-sections-*.json` fixtures lock the ANSI/plain bytes; green here confirms `serializeConsoleOutput` / `serializeConsultationTabs` still emit identical output. Do **not** run `pnpm generate-fixtures`.

- [ ] **Step 2: Run the full workspace test + type + lint gates**

Run: `pnpm type:check && pnpm lint:check && pnpm test`
Expected: PASS across all packages. (Note: `pnpm test` includes the ~40 s slow RNG distribution block — this is expected, see CLAUDE.md.)

- [ ] **Step 3: Confirm no stray `media` field references remain**

Run: `git grep -n "\.media\b\|media:\s*\[" -- 'domain/**' 'cli/**'`
Expected: no matches in `src/` or `tests/` (only prose mentions in docs/comments, which Task 3 addresses). If any code match remains, fix it before proceeding.

---

## Task 3: Update the documentation and stale comments

The ASCII matrix is gone; ADR-0018 and a few comments still describe the old `media` flag. Bring the recorded theory in line with the code.

**Files:**
- Modify: `docs/adr/0018-consultation-view-ir.md` (the "Section→medium visibility" bullet)
- Modify: `cli/readout/src/output-composers.ts` (the `buildPartialCastingSections` comment)
- Modify: `cli/readout/src/serialize-ansi.ts` (header + tab/console comments referencing "the matrix")
- Modify: `domain/consultation-file/src/serialize-markdown.ts` (header comment referencing the `media` flag)

- [ ] **Step 1: Update ADR-0018**

In `docs/adr/0018-consultation-view-ir.md`, replace the bullet at lines 77–87 (`- **Section→medium visibility is explicit, not implicit.** ...`) with:

```md
- **Section→medium visibility is encapsulated and exhaustive.** Sections carry NO
  per-section media flag. `buildConsultationView` (its module) owns one decision
  function, `sectionVisibility`, and exposes a single projector,
  `sectionsForMedium(view, medium)`. Serializers route through `sectionsForMedium`;
  they cannot read a flag (there is none) and cannot call `sectionVisibility` (it is
  not exported), so no consumer can introduce a divergent visibility rule. The
  visibility constants are `Record`s over the closed `SectionMedium` union, so adding
  a medium turns them into compile errors until the owner decides that medium's
  per-section visibility. Hexagram-level text is emitted as `text:hexagram` (ANSI-only;
  Markdown folds it into the trailing LINES block via the no-moving `lines:none`
  section, Markdown-only). `serializeConsultationTabs` (`cli/readout/src/serialize-ansi.ts`)
  re-groups the same sections by `kind`/`role` into the four viewer tabs and consults
  the same `sectionsForMedium('ansi')` projection — not a second rule.
```

- [ ] **Step 2: Update the `buildPartialCastingSections` comment**

In `cli/readout/src/output-composers.ts`, replace the `WHY:` comment lines that read `The sub-builders are the SINGLE owner of the media literal (ADR-0018) — this composer no longer mints its own. media is inert here anyway: both serializers are called directly, not through the media-filtering loops.` with:

```ts
  // WHY: a partial (mid-flow) casting render needs only the query + ledger; the
  // hexagram isn't known yet, so we mint just those two sections via the shared
  // sub-builders instead of round-tripping a sentinel [7,7,7,7,7,7] through
  // buildConsultationView. These sub-builders are the single section-mint point
  // (ADR-0018); both serializers are called directly here, bypassing the
  // sectionsForMedium projection (visibility is moot for a 2-section mid-flow render).
```

- [ ] **Step 3: Update the serialize-ansi.ts comments that name "the matrix"**

In `cli/readout/src/serialize-ansi.ts`:
- The `serializeTextAnsi` comment (lines 233–235) `a lines:none section is markdown-only (media filtered out upstream)` → `a lines:none section is Markdown-only (filtered out by sectionsForMedium upstream)`.
- The `serializeConsultationTabs` comment (lines 251–256) `when its media includes 'ansi'` → `when sectionsForMedium('ansi') includes it`.
- The `serializeConsoleOutput` comment (lines 299–300) `Visibility (which sections reach this ANSI walk) is owned upstream — see the section→medium matrix above buildConsultationView` → `Visibility is owned upstream by sectionsForMedium / sectionVisibility in @hexagram/consultation-view`.

- [ ] **Step 4: Update the serialize-markdown.ts header comment**

In `domain/consultation-file/src/serialize-markdown.ts`, replace the `Body projection:` comment (lines 7–12) with:

```ts
// Body projection: markdown emits the sections sectionsForMedium(view,'markdown')
// returns. Hexagram-level text is ANSI-only (text:hexagram) because markdown folds
// that scripture into the trailing LINES block via the no-moving `lines:none`
// section. The result is query, casting, transformation, standing diagram,
// [emerging diagram], LINES — exactly the legacy markdownConsultationBody order.
```

Also remove the now-redundant `// Visibility is owned upstream — see the section→medium matrix above buildConsultationView ...` comment above `serializeConsultationMarkdownBody` (lines 183–184), since the header already states it.

- [ ] **Step 5: Re-run lint + type-check (comments only, but confirm nothing broke)**

Run: `pnpm lint:check && pnpm type:check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/adr/0018-consultation-view-ir.md \
  cli/readout/src/output-composers.ts \
  cli/readout/src/serialize-ansi.ts \
  domain/consultation-file/src/serialize-markdown.ts
git commit -m "docs(consultation-view): record encapsulated visibility in ADR-0018

The per-section media flag is gone; describe sectionVisibility +
sectionsForMedium (encapsulated owner-side decision + closed-union
exhaustiveness) and scrub stale references to the deleted matrix comment."
```

---

## Self-Review

**1. Spec coverage.**
- (1) Encapsulation — `media` field removed from all 5 IR interfaces (Task 1 Step 5); the only reader path is `sectionsForMedium`; `sectionVisibility` is not exported (Task 1 Step 3). ✓
- (2) Exhaustiveness — visibility expressed as `Record<SectionMedium, boolean>` constants (Task 1 Step 3); adding a medium breaks `BOTH_MEDIA`/`ANSI_ONLY`/`MARKDOWN_ONLY` at compile time. ✓
- All three serializer sites rerouted (Task 1 Steps 6–7). ✓
- Tests updated + executable-matrix guard added (Task 1 Steps 1, 8). ✓
- Byte-identity preserved + verified (Task 2). ✓
- Docs/comments reconciled (Task 3). ✓

**2. Placeholder scan.** No TBD/"handle edge cases"/"similar to". Every code step shows full code. ✓

**3. Type consistency.** `sectionsForMedium(view: ConsultationView, medium: SectionMedium): readonly ConsultationSection[]` — same signature in build-view.ts (Step 3), the test import (Step 1), serialize-ansi.ts (Step 6), serialize-markdown.ts (Step 7). `SectionVisibility = Record<SectionMedium, boolean>` and the three constants are named identically everywhere they appear. `sectionVisibility` is private throughout. ✓

## Known boundary (out of scope, by design)

These two mechanisms guarantee *"if you consume the view, you go through the owner's filter."* They do **not** force a future consumer to consume the view at all — someone could bypass `buildConsultationView` and read `@hexagram/core/getters` directly. Closing *that* gap is the lint-boundary option (the `domain/* → cli/*` ESLint precedent), deliberately not included here.

## Execution Handoff

> **Branch note:** this repo's session is designated to develop on `claude/serene-fermat-23laje`. The current checkout is on a different branch — create/switch to the designated branch before executing.

Plan complete and saved to `docs/superpowers/plans/2026-06-09-encapsulate-section-medium-visibility.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
