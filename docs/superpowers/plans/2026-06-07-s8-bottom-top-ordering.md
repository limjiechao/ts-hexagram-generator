# S8 — Bottom-first ↔ top-first ordering: one named home for the view-layer flip

**Branch:** `claude/round5-seams-s5-s6-s8` (already checked out, based on merged
`origin/main`). Stay on it. Do NOT open a PR. Planning is done; this doc is for a
FRESH execution agent.

**Type of change:** Pure refactor (legibility / DRY-of-knowledge seam, NOT a
correctness bug). The renders and saved bytes MUST NOT change. ADR-0008 documents
the bottom-first-memory / top-first-disk asymmetry as deliberate — this plan does
not change that contract; it only gives the *view-layer* copies of the flip one
named owner.

---

## ⚠️ HUMAN-DECISION FORK — confirm BEFORE executing

The plan turns on one DRY-of-knowledge call (engineering rule §5: do not duplicate
a *decision*, but do NOT abstract two things that *merely look alike*):

> **Which of the seven sites that encode the bottom-first ↔ top-first flip are the
> SAME decision worth ONE home, vs legitimately separate?**

The flip — "lines are stored bottom-first (`index N` = line `N+1`); presentation is
top-first (`position 6..1`)" — is encoded **seven** times. The planner's call,
baked into this plan:

- **CONSOLIDATE (sites 6, 7, 8 — the anonymous view-layer literals):**
  `buildLedgerRows`' hand-written `lineOrder`, `diagramRows`' `[6,5,4,3,2,1]`, and
  the transformation row's `emerging[5 - i]`. These re-derive the *identical* flip
  three times with no cross-reference and no name. `5 - i` especially is an
  unguarded literal one keystroke from a silent render flip. → route through ONE
  named primitive in `@hexagram/core`.
- **LEAVE ALONE (sites 2–5 — the YAML converters):** `castingToYaml`/`FromYaml`,
  `hexagramToYaml`/`FromYaml`. These ALREADY name the flip at the ADR-0008 disk
  boundary, and they are a *different operation* — they build a **keyed mapping**
  (`{L6, L5, …}`), not a tuple reversal. ADR-0008 deliberately keeps four explicit,
  round-trip-testable converter functions; folding them into a tuple-reverse helper
  would conflate object-keying with array-reversal (premature abstraction, §6).
- **LEAVE ALONE (distinct knowledge):** `castingTableActiveRow`'s `5 - lineIndex`
  (scroll-row geometry, not a tuple↔key flip), the legacy parser's `rows[1..6]`
  (keyed lookup off a parsed table), the `['L1'..'L6']` validation/lookup key-lists,
  and the playground reverse-`for` (a string-render loop in a different package).

**Planner's flagged sub-fork (my explicit call: LEAVE OUT):** the playground
reverse-`for` (`cli/playground-ui/src/playground-display.ts:79`) iterates the
bottom-first tuple top-first — arguably the same knowledge as `diagramRows`. I
recommend **excluding** it: it is a string-render loop in a *medium-bound* `cli/`
package, not an IR builder; routing it through a domain primitive would add a
cross-package coupling for one `for`-loop and mix rendering into the consolidation.
If the human rules it IN, it is a trivial one-loop addition (replace the
`for (lineIndex=5; …)` with iteration over `toTopFirst([0,1,2,3,4,5])` or
`POSITIONS_TOP_FIRST.map(p => p-1)`) — but this plan scopes to sites 6, 7, 8 only.

**If the human confirms this split, proceed. If the human folds the YAML
converters in (Approach A) or excludes a view site, adjust scope before Task 2.**

---

## Phase-1 study — the seam, fully grounded (file:line)

A hexagram/casting is stored **bottom-first** in memory (`Hexagram` /
`CastingRecord` tuples; `index 0` = line 1 bottom) but presented **top-first**
(`L6..L1`). The "which end is line 1 / how to flip" knowledge is re-encoded by
hand at independent sites with no single named owner.

### Inventory (every site that encodes the flip or a top-first iteration)

| # | Site (file:line) | What it does | Verdict |
|---|---|---|---|
| 1 | `domain/core/src/types.ts:13` (`Hexagram`), `:84` (`CastingRecord`), `:81` (`LineCasting`) | tuple types declared **bottom-first** | ANCHOR. Untouched. |
| 2 | `domain/consultation-file/src/frontmatter.ts:40-43` `castingToYaml` | `const [L1..L6]=casting; return {L6,L5,L4,L3,L2,L1}` | SAME flip, but a KEYED-MAPPING op, already named at the ADR-0008 boundary. LEAVE. |
| 3 | `frontmatter.ts:46-48` `castingFromYaml` | `[yaml.L1..yaml.L6]` (inverse) | as #2. LEAVE. |
| 4 | `frontmatter.ts:60-63` `hexagramToYaml` | `[L1..L6]→{L6..L1}` | as #2. LEAVE. |
| 5 | `frontmatter.ts:66-68` `hexagramFromYaml` | `[yaml.L1..yaml.L6]` (inverse) | as #2. LEAVE. |
| **6** | `domain/consultation-view/src/ledger-geometry.ts:28-35` `buildLedgerRows` `lineOrder` | hand-written `[[6,casting[5]] … [1,casting[0]]]` | **SAME flip, anonymous. CONSOLIDATE.** |
| **7** | `domain/consultation-view/src/build-view.ts:71-72` `diagramRows` | `([6,5,4,3,2,1] as const).map(p => { const index = p-1; … })` | **SAME flip, anonymous. CONSOLIDATE.** |
| **8** | `domain/consultation-view/src/build-view.ts:204-210` transformation emerging row | `emerging[5 - i]` | **SAME flip, anonymous, riskiest off-by-one. CONSOLIDATE.** |
| 9 | `ledger-geometry.ts:11-15` `castingTableActiveRow` | `(5 - lineIndex) * CASTING_ROWS_PER_BLOCK` | DISTINCT — scroll-row geometry, not a tuple↔key flip. LEAVE. |
| 10 | `cli/playground-ui/src/playground-display.ts:79-89` | `for (lineIndex=5; lineIndex>=0; lineIndex--)` render loop | SAME knowledge, different shape; string-render loop in a cli/ package. LEAVE (see sub-fork). |
| 11 | `frontmatter.ts:208,213`; `cli/playground-ui/src/readings-panel.tsx:48` | `['L1'..'L6']` key-presence / index→`L${n+1}` lookups | DISTINCT — key lists, not reversals. LEAVE. |
| 12 | `domain/consultation-file/src/legacy-converter.ts:107-113` | `rows[1]..rows[6]` keyed by parsed line-number | DISTINCT — builds the tuple from a `Record<lineNumber,…>`; ordering lives in the parser's keying. LEAVE. |

**Verified non-re-derivation downstream:** the ANSI/markdown serializers consume
the already-top-first IR rows as emitted — `cli/readout/src/serialize-ansi.ts:123`
(`.map(({standing,emerging}) => …)`) and
`domain/consultation-view/src/diagram-template.ts:96` (`rows.map((row, topIndex)
=> …)`) iterate `rows` without re-deriving the flip. So consolidating sites 6-8 is
the complete view-layer surface; nothing downstream re-flips.

### Structural availability of a canonical home

Both packages that hold the consolidation sites already depend on `@hexagram/core`
(`domain/consultation-view` deps: `@hexagram/core`, `@hexagram/text-layout`;
`domain/consultation-file` deps include `@hexagram/core`). The natural home is
`@hexagram/core/types` — it is already the anchor for the bottom-first tuple types
and for the `LineIndex` range guard (the S7 dedup landed there). A
`POSITIONS_TOP_FIRST` constant + a `toTopFirst` tuple-reverse helper sit beside the
types they reverse.

### Honest verdict

Legibility / DRY-of-knowledge seam, NOT a correctness bug — renders are correct
today. Worth consolidating exactly sites 6, 7, 8. Sites 2-5 are already named at a
blessed boundary AND are a different operation; sites 9-12 are distinct knowledge.

---

## The design (recommended approach — "Approach B")

Add to `domain/core/src/types.ts`:

```ts
/** Line positions in visual top-first order (line 6 top … line 1 bottom) — the
 *  order every hexagram diagram and the casting ledger render in. The single
 *  named owner of the bottom-first-tuple ↔ top-first-presentation flip for the
 *  view layer. (The YAML converters in `@hexagram/consultation-file` name the
 *  SAME flip separately at the disk boundary — they build a keyed `L6..L1`
 *  mapping, a different operation; ADR-0008.) */
export const POSITIONS_TOP_FIRST: readonly [6, 5, 4, 3, 2, 1] = [6, 5, 4, 3, 2, 1]

/** Reverse a bottom-first 6-tuple into a top-first 6-tuple (index 0 = line 6).
 *  Used by the view builder for the transformation emerging row; replaces the
 *  anonymous `x[5 - i]` literal. */
export function toTopFirst<T>(
  tuple: readonly [T, T, T, T, T, T],
): [T, T, T, T, T, T] {
  return [tuple[5], tuple[4], tuple[3], tuple[2], tuple[1], tuple[0]]
}
```

**`isolatedDeclarations` note:** the repo enables `isolatedDeclarations`
(`tsconfig.base.json`). Both new exports MUST carry explicit types. The constant is
annotated `readonly [6, 5, 4, 3, 2, 1]` (a syntactic literal-tuple type — do NOT
rely on `as const` alone for the export's inferred type; the explicit annotation is
required and also pins the element literals so `position - 1` stays a `LineIndex`).
`toTopFirst` has an explicit return type `[T, T, T, T, T, T]`. No `.d.mts` is
hand-written; tsdown emits it.

Then route the three view sites through them. **Net literal change: `[6,5,4,3,2,1]`
appears once (the constant); `5 - i` disappears; `lineOrder`'s hand-paired
`casting[5]..casting[0]` becomes a derivation from the constant.**

---

## Build-coupling note (READ BEFORE STARTING)

Downstream packages type-check against the **built** `.d.mts` of upstream domain
packages, not their `src`. After editing `@hexagram/core/types`, you MUST rebuild
`@hexagram/core` before `domain/consultation-view`'s `type:check` will see the new
exports:

```bash
pnpm --filter @hexagram/core build
```

`pnpm build` (topological) and `pnpm type:check` at the root handle this for the
full-workspace gate, but during iteration rebuild core first.

---

## Tasks (TDD, commit-per-task)

Each task: write/extend the test FIRST (red), make it green, run the per-package
gate, commit. Use inline TDD. Commit message records WHY. Every commit message ends
with the trailer:

```
https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh
```

(no model identifier line).

---

### Task 1 — Add the canonical primitive to `@hexagram/core` (red → green)

**Test first.** Extend `domain/core/tests/types.test.ts` with a small block:

```ts
import { POSITIONS_TOP_FIRST, toTopFirst } from '../src/types.js'
// (add to the existing imports from '../src/types.js')

describe('top-first ordering primitive', () => {
  it('POSITIONS_TOP_FIRST is line 6 → line 1', () => {
    expect(POSITIONS_TOP_FIRST).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('toTopFirst reverses a bottom-first 6-tuple', () => {
    expect(toTopFirst([1, 2, 3, 4, 5, 6])).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('toTopFirst is an involution (applied twice = identity)', () => {
    const t = [10, 20, 30, 40, 50, 60] as const
    expect(toTopFirst(toTopFirst(t))).toEqual([...t])
  })
})
```

(If `types.test.ts` has no `describe`/`it` import yet, add
`import { describe, expect, it } from 'vitest'`.)

**Implementation.** Add the two exports shown in "The design" above to
`domain/core/src/types.ts` (place them just after the `Hexagram` type and its
guards, before `LineIndex`, OR right after `LineIndex` — either is fine; keep them
adjacent to the tuple/index vocabulary they belong to).

**Verify:**
```bash
pnpm --filter @hexagram/core test -- tests/types.test.ts
pnpm --filter @hexagram/core type:check
pnpm --filter @hexagram/core build      # emit the new exports into dist/*.d.mts
```

**Commit:** `feat(core): add POSITIONS_TOP_FIRST + toTopFirst ordering primitive`
— WHY: the bottom-first↔top-first flip was re-derived by hand at three anonymous
view-layer sites (S8); this gives that knowledge one named owner beside the
tuple types it reverses.

---

### Task 2 — Route `diagramRows` (site 7) through `POSITIONS_TOP_FIRST` (zero-diff)

`diagramRows` already has a regression net via `build-view.test.ts` (the section
tests assert diagram rows) and the plain/markdown fixtures. No new test needed —
the **zero-fixture-diff gate is the test**. Optionally assert positions explicitly
if you want a local guard, but it is redundant.

**Before** (`domain/consultation-view/src/build-view.ts:66-79`):

```ts
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
```

**After:**

```ts
function diagramRows(
  hexagram: Hexagram,
  movingFrom: Hexagram = hexagram,
): readonly DiagramLineRow[] {
  // Top-first (line 6 → line 1) to match every diagram section.
  return POSITIONS_TOP_FIRST.map((position) => {
    const index = position - 1
    return {
      line: hexagram[index]!,
      position,
      moving: isMovingLine(movingFrom[index]!),
    }
  })
}
```

Add `POSITIONS_TOP_FIRST` to the existing `@hexagram/core/types` import block at
the top of `build-view.ts` (lines 8-12). Note `position - 1` is a `LineIndex`
because the constant's element type is the literal union `6|5|4|3|2|1`.

**Verify:**
```bash
pnpm --filter @hexagram/core build              # ensure dist is current
pnpm --filter @hexagram/consultation-view type:check
pnpm --filter @hexagram/consultation-view test
```

**Commit:** `refactor(consultation-view): diagramRows iterates POSITIONS_TOP_FIRST`
— WHY: replaces the anonymous `[6,5,4,3,2,1]` literal (S8 site 7) with the named
primitive; render bytes unchanged.

---

### Task 3 — Route the transformation emerging row (site 8) through `toTopFirst` (zero-diff)

This is the riskiest site (the bare `5 - i`). Replace it with a named reversal so
the off-by-one cannot drift silently.

**Before** (`domain/consultation-view/src/build-view.ts:202-211`, inside
`buildConsultationView`'s transformation section):

```ts
      body: moving
        ? {
            rows: diagramRows(hexagram).map((standing, i) => ({
              standing,
              emerging: {
                line: emerging[5 - i]!,
                position: standing.position,
                moving: false,
              },
            })),
```

**After** — hoist the top-first emerging tuple once, index it positionally:

```ts
      body: moving
        ? {
            // `diagramRows` is top-first (line 6 → 1); `emerging` is bottom-first.
            // Walk emerging in the SAME top-first order via the named reversal so
            // standing[i] and emergingTopFirst[i] are the same position.
            rows: (() => {
              const emergingTopFirst = toTopFirst(emerging)
              return diagramRows(hexagram).map((standing, i) => ({
                standing,
                emerging: {
                  line: emergingTopFirst[i]!,
                  position: standing.position,
                  moving: false,
                },
              }))
            })(),
```

Add `toTopFirst` to the `@hexagram/core/types` import block.

> NOTE: `emerging` is a `Hexagram` (`[Line,Line,Line,Line,Line,Line]`), which
> satisfies `toTopFirst`'s `readonly [T,T,T,T,T,T]` param with `T = Line`. The
> result is `[Line,…]`, so `emergingTopFirst[i]!` is a `Line` — identical type to
> the old `emerging[5 - i]!`.

If the IIFE reads awkwardly to the executing agent, an equally acceptable shape is
to compute `const emergingTopFirst = toTopFirst(emerging)` as a `const` just above
the `sections` array (next to `const emerging = getEmergingHexagram(hexagram)` at
build-view.ts:188) and reference it inside the map. Either is zero-diff; pick the
one that keeps the diff smallest and the locality clearest. **Do not** leave both
the old `5 - i` and the new helper in place.

**Verify:**
```bash
pnpm --filter @hexagram/consultation-view type:check
pnpm --filter @hexagram/consultation-view test
```

**Commit:** `refactor(consultation-view): transformation emerging row via toTopFirst`
— WHY: replaces the bare `emerging[5 - i]` reversal (S8 site 8, the riskiest
off-by-one) with the named primitive; the standing/emerging position pairing is
now legible and the literal cannot drift. Render bytes unchanged.

---

### Task 4 — Route `buildLedgerRows` `lineOrder` (site 6) through `POSITIONS_TOP_FIRST` (zero-diff)

`buildLedgerRows` lives in `ledger-geometry.ts`. Its `lineOrder` hand-pairs each
top-first line number with the matching bottom-first casting cell. Derive that
pairing from the constant.

**Before** (`domain/consultation-view/src/ledger-geometry.ts:25-37`):

```ts
export function buildLedgerRows(
  casting: PartialCastingRecord,
): readonly LedgerRow[] {
  const lineOrder = [
    [6, casting[5]],
    [5, casting[4]],
    [4, casting[3]],
    [3, casting[2]],
    [2, casting[1]],
    [1, casting[0]],
  ] as const
  const rows: LedgerRow[] = []
  for (const [blockIndex, [lineNumber, lineCasting]] of lineOrder.entries()) {
```

**After:**

```ts
export function buildLedgerRows(
  casting: PartialCastingRecord,
): readonly LedgerRow[] {
  // Top-first line numbers (6 → 1) paired with their bottom-first casting cell
  // (`casting[lineNumber - 1]`) — the same flip the diagram rows use.
  const lineOrder = POSITIONS_TOP_FIRST.map(
    (lineNumber) => [lineNumber, casting[lineNumber - 1]] as const,
  )
  const rows: LedgerRow[] = []
  for (const [blockIndex, [lineNumber, lineCasting]] of lineOrder.entries()) {
```

Add the import at the top of `ledger-geometry.ts`:

```ts
import { POSITIONS_TOP_FIRST, type PartialCastingRecord } from '@hexagram/core/types'
```

(merge with the existing `import type { PartialCastingRecord } from '@hexagram/core/types'` on line 2 — it becomes a value+type import).

> TYPE NOTE: `casting[lineNumber - 1]` — `lineNumber` is `6|5|4|3|2|1`, so
> `lineNumber - 1` is `number` to TS (arithmetic widens literals). `casting` is a
> `PartialCastingRecord` (a 6-tuple); indexing a tuple with a widened `number`
> yields `PartialLineCasting | undefined`. The original `casting[5]` etc. were
> exact. To keep the exact element type and avoid an `undefined` widening, index
> via the constant's known length using a `LineIndex` cast is overkill; simplest
> is: `casting[(lineNumber - 1) as LineIndex]` (import `LineIndex` too) OR keep the
> non-null/array-access semantics identical by leaving the downstream `cell(...)`
> logic untouched (it already handles `null`). **Recommended:** index with
> `as LineIndex` to preserve the original `PartialLineCasting` element type:
> ```ts
> import { POSITIONS_TOP_FIRST, type LineIndex, type PartialCastingRecord } from '@hexagram/core/types'
> // ...
> const lineOrder = POSITIONS_TOP_FIRST.map(
>   (lineNumber) => [lineNumber, casting[(lineNumber - 1) as LineIndex]] as const,
> )
> ```
> `LineIndex` is already exported from `@hexagram/core/types` (S7). Verify the
> `type:check` is clean; if TS still complains about `lineOrder`'s element type vs
> the destructuring below, the `as LineIndex` index fixes it. If for any reason the
> `.map` derivation fights the tuple types, FALL BACK to keeping the explicit
> 6-row `lineOrder` literal but annotate WHY site 6 was left as-is in the commit —
> do not force a fragile cast. (The diagram + ledger fixtures are the safety net
> either way.)

**Verify:**
```bash
pnpm --filter @hexagram/consultation-view type:check
pnpm --filter @hexagram/consultation-view test
```

**Commit:** `refactor(consultation-view): buildLedgerRows lineOrder from POSITIONS_TOP_FIRST`
— WHY: replaces the hand-written `[[6,casting[5]] … [1,casting[0]]]` pairing (S8
site 6) with a derivation from the named primitive; ledger render bytes unchanged.

---

### Task 5 — Full-workspace verification + zero-fixture-diff gate (LOAD-BEARING)

This is the gate that proves the refactor is pure. Run, in order:

```bash
pnpm build
pnpm generate-fixtures        # MUST produce NO diff
git status --porcelain        # expect: clean (no fixture changes)
pnpm type:check
pnpm lint:check
pnpm test
pnpm format:check
```

**STOP CONDITION:** if `pnpm generate-fixtures` produces ANY change to a fixture
file (`git status --porcelain` shows a modified fixture under
`cli/casting-ui/tests/fixtures/` or `domain/consultation-file/tests/fixtures/`), a
reversal drifted — a render changed. Do NOT commit the fixture change. Revert the
offending task and re-derive the flip correctly. The whole point of S8 is that the
bytes do not move.

If everything is clean, no commit is needed for this task (it is verification
only). If `pnpm format:fix` reports formatting on the edited source files, apply it
and fold it into the relevant task's commit (or a trailing
`style: format` commit).

---

## Out of scope (explicitly NOT touched)

- The four YAML converters (`castingToYaml/FromYaml`, `hexagramToYaml/FromYaml`,
  `frontmatter.ts:40-68`). They name the flip at the ADR-0008 disk boundary and are
  a keyed-mapping operation, not a tuple reversal — different knowledge (§5). No
  change, no fixture impact, no `schemaVersion` bump.
- `castingTableActiveRow`'s `5 - lineIndex` (scroll-row geometry).
- The legacy converter's `rows[1..6]` keyed lookup.
- The `['L1'..'L6']` validation / index→key lists.
- The playground reverse-`for` render loop (`playground-display.ts:79`) — see the
  flagged sub-fork. Left out unless the human rules it in.

## Risks

- **Primary risk: an off-by-one in a reversal flips a render.** Caught by the
  zero-fixture-diff gate (Task 5) and the `build-view` / ledger / diagram tests.
  This is why Task 3 (the `5 - i` site) replaces a literal with a NAMED reversal
  whose involution property is unit-tested in Task 1 — the failure mode is removed,
  not just re-spelled.
- **Build-coupling stale `.d.mts`:** if `@hexagram/core` is not rebuilt after Task
  1, downstream `type:check` will report the new exports as missing. Rebuild core
  first (see build-coupling note).
- **`isolatedDeclarations` rejecting the new exports:** mitigated by the explicit
  type annotations on both the constant and the helper (see the design section).
- **Tuple-index widening in Task 4:** the `lineNumber - 1` arithmetic widens the
  literal to `number`; the `as LineIndex` index restores the exact element type.
  Fallback (keep the literal `lineOrder`) is documented inline if the cast fights
  the types.

## Definition of done

- `POSITIONS_TOP_FIRST` + `toTopFirst` exist in `@hexagram/core/types`, unit-tested
  (Task 1), exported in `dist/*.d.mts`.
- Sites 6, 7, 8 route through them; the literals `[6,5,4,3,2,1]` (view-layer),
  `emerging[5 - i]`, and the hand-paired `lineOrder` no longer appear in
  `domain/consultation-view/src/`.
- `pnpm generate-fixtures` yields NO diff.
- `pnpm build && pnpm type:check && pnpm lint:check && pnpm test && pnpm
  format:check` all green.
- The YAML converters and all distinct sites are untouched.
