# Manual casting prompt — flow-diagram revamp

**Date:** 2026-05-29
**Worktree:** `manual-prompt-revamp` (branch `worktree-manual-prompt-revamp`, based on `2f7bcb9`)
**Component:** `<ManualCastingPrompt>` in `packages/casting-ui/src/casting-prompt-box.tsx`
**Status:** Plan — written against `2f7bcb9` while bug-fixing is still in flight (see § Code-dependent assumptions).

---

## 1. Motivation

The manual prompt's current **side-by-side** layout (shipped days ago in `30386ae`) is being
revamped into a **vertical flow diagram**. Per the grilling session, the goal is
**comprehension + aesthetic**, in that order:

- **Comprehension** — teach the yarrow _conservation law_ visually. The 49 unparted stalks
  split into two heaps, each heap's arithmetic is shown explicitly (`piles × 4 + remainder
[+ suspended] = total`), the two totals recombine, and the diagram surfaces how many
  stalks are still **MISSING** — a live gauge that should reach `0` for a valid cast.
- **Aesthetic** — the flow diagram reads as a circuit/ledger, not a cramped two-column form.

Because the goal is teaching, the explicit per-step arithmetic and the COUNTED/MISSING
readout are **load-bearing**, not decoration — they justify the (large) vertical cost below.

---

## 2. Target visual (annotated)

```
╭───────────────────────────────────────────────────────────────────────────────────────╮
│ Line 1/6 · Cast 1/3 · Step 3/4                                                           │  ① title (slim, no inline dots)
│                                                                                         │  ② blank spacer
│ UNPARTED STALKS:    49                                                                   │  ③ source readout
│                      │                                                                   │  ④ drop connector
│          ┌───────────┴──────────┐                                                        │  ⑤ branch connector
│ ┌─ LEFT HEAP ─────┐    ┌─ RIGHT HEAP ────┐                                               │  ⑥ card headers      | rightpane: blank
│ │  Piles       3  │    │  Piles       4  │   How many piles of 4 stalks in the RIGHT…?   │  ⑦ Piles             | question
│ │  Fours     × 4  │    │  Fours     × 4  │   (valid 0 to 12)                             │  ⑧ Fours × 4 (static)| range hint (dim)
│ │  ─────────────  │    │  ─────────────  │                                               │  ⑨ separator         | blank
│ │  Subtotal   12  │    │  Subtotal   16  │   ┌─────────────┐                             │  ⑩ Subtotal          | input box top
│ │  Remainder + 3  │    │  Remainder + 4  │   │ 4           │                             │  ⑪ Remainder         | input box mid
│ │                 │    │  Suspended + 1  │   └─────────────┘                             │  ⑫ Suspended/blank   | input box bottom
│ │  ─────────────  │    │  ─────────────  │                                               │  ⑬ separator         | blank
│ │  Total      15  │    │  Total      21  │   ● ● ● ○                                      │  ⑭ Total             | step dots (relocated)
│ └────────┬────────┘    └────────┬────────┘                                               │  ⑮ card footers (┬ tees)
│          └───────────┬──────────┘                                                        │  ⑯ join connector
│                      │                                                                   │  ⑰ drop connector
│ COUNTED STALKS:   - 36                                                                   │  ⑱ accumulator readout
│ ──────────────────────                                                                   │  ⑲ ledger rule
│ MISSING STALKS      13                                                                   │  ⑳ conservation gauge (colored)
│                                                                                         │  ㉑ blank spacer
│ <confirmation / error message>                                          Shift+Tab: go back│  ㉒ feedback row
╰───────────────────────────────────────────────────────────────────────────────────────╯
```

**22 content rows + 2 border = 24 rows total** (today: 11). The card "band" is rows ⑥–⑮
(10 rows); the right pane (question / hint / input box / dots) is positioned _within_ that
band as annotated.

> The mockup's numbers are an **illustrative end-state** and do **not** sum to a valid cast:
> `LEFT Total 15 + RIGHT Total 21 = 36 ≠ 49`, so it depicts a cast that is **13 short** —
> i.e. `MISSING 13`, a _conservation violation_. That is intentional: it shows what the
> gauge does when the count is wrong.

---

## 3. Locked design decisions

### 3.1 Vertical budget — _prompt dominates_

The viewer computes the scrollable Casting-table viewport as
`viewportHeight = max(1, termRows − chrome − aboveFooterHeight − …)`
(`packages/viewer-core/src/consultation-readout.tsx:294`). The manual prompt's height feeds
`aboveFooterHeight` directly, so **every prompt row is stolen from the table above it**.

Decision: **accept it.** During manual casting the user is transcribing yarrow piles, not
watching the table fill; the table re-expands at `done`. On short terminals the table
effectively disappears for the duration of the 18-cast flow.

Consequence to handle: at 24 rows the prompt + chrome can exceed `termRows` entirely, which
overflows the alternate screen and can push the pinned footer off-bottom. → **§ 3.8
min-height guard.**

### 3.2 Live-preview semantics — _progressive, truthful_

Only the **raw input cells** (`Piles`, `Remainder`) render `?` until typed. Every **derived**
number (`Subtotal`, `Total`, `COUNTED`, `MISSING`) is always numeric, computed with
untyped = `0`. No fabricated "as-if" values beyond treating an untyped field as 0.

### 3.3 Card totals — _tick live_

`Subtotal = 4 · (piles ?? 0)`. `Total(LEFT) = subtotal + (rem ?? 0)`.
`Total(RIGHT) = subtotal + (rem ?? 0) + 1` — the **+1 suspended stalk is folded into RIGHT
Total from the start**, so before anything is typed: `RIGHT Total = 1`, `COUNTED = 1`,
`MISSING = unparted − 1` (e.g. `48`). These reuse the existing `liveLeftTotal` /
`liveRightTotal` (`casting-prompt-box.tsx:1561-1562`), which already coalesce null → 0.

### 3.4 COUNTED / MISSING — _live countdown, MISSING owns conservation_

- `COUNTED = liveLeftTotal + liveRightTotal + 1` (== `LEFT Total + RIGHT Total`, stays
  consistent because RIGHT Total already includes the +1). Ticks per keystroke.
- `MISSING = unparted − COUNTED`. Ticks `48 → … → 0`.
- **MISSING is the _only_ visual for the conservation invariant** — no worded "Total
  counted … expected …" sentence anywhere.

### 3.5 Coloring / commit-readiness — _green = fully commit-ready_

Derive from the **unchanged** `validateManualInput` (`casting-prompt-box.tsx:1361`), whose
priority is `incomplete > zero-remainder > conservation > suspended-sum > ok`:

| `validation.kind`                             | `MISSING` color        | feedback-row left (㉒)              |
| --------------------------------------------- | ---------------------- | ----------------------------------- |
| `incomplete` (any `?`)                        | white (live countdown) | blank / neutral hint                |
| `conservation` (all typed, ≠0)                | **red**                | blank — _MISSING owns it; no dup_   |
| `suspended-sum` (all typed, count 0, bad sum) | white (shows `0`)      | **red** suspended-sum msg           |
| `zero-remainder`                              | white                  | **red** zero-remainder msg          |
| `ok` (fully valid)                            | **green**              | "Press Enter to commit"             |
| committed (reveal dwell)                      | green                  | **green** `→ next cast: N unparted` |

`MISSING` green ⇔ `validation.kind === 'ok'` ⇔ Enter will commit. A satisfied count with a
suspended-sum violation keeps `MISSING` **white** (not green), with the red message in ㉒.

> Note: `validateManualInput` checks `zero-remainder` _before_ `conservation`. So a `0`
> remainder routes to the red ㉒ message (not red MISSING) even if the count is also off.
> This matches the table above; verify the ordering still holds before coding (§ 5).

### 3.6 Navigation — _free Tab-cycling unchanged_

The four fields stay **freely Tab-cyclable** (`useInput` handler, `casting-prompt-box.tsx:1579`):
Tab/Shift+Tab cycle in any order, digits edit the focused field, **Enter commits the whole
cast** when `kind === 'ok'`, second Enter skips the reveal dwell, `Ctrl+R` rewinds a line.
`Step N/4` and the dots are **cosmetic** — the ordinal of the focused field
(`MANUAL_FIELD_ORDER.indexOf(focusedField) + 1`), exactly today's semantics. Only their
**placement** changes (see 3.7).

### 3.7 Title + dots placement

- Title slims to `Line N/6 · Cast C/3 · Step P/4` (drop the inline `● ● ○ ○`).
- The dots `● ● ● ○` **relocate** to the right pane, row ⑭ (beside `Total`). Same
  cumulative-fill-to-focused-index rule as today's `manualTitleRow` (`casting-prompt-box.tsx:945`).

### 3.8 Min-height guard

`hexagram-manual` is already Ink-only and refuses non-TTY contexts (shares the
`hexagram-history` guard). Extend that guard: if `stdout.rows < REQUIRED_MIN_ROWS`, print a
friendly stderr message (`hexagram-manual needs a terminal at least N rows tall; yours is
M`) and exit 1. `REQUIRED_MIN_ROWS` = chrome minimum + 24 (prompt) + 1 (table floor) +
footer — **measure during implementation** from the `consultation-readout` height
constants; placeholder ~34. (Rationale: a hard guard matches the existing non-TTY refusal
style and avoids a half-rendered alternate screen. Soft in-viewer clamping was rejected —
the prompt is the point and must not be clipped.)

---

## 4. Files to touch

| File                                                    | Change                                                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/casting-ui/src/casting-prompt-box.tsx`        | Bulk: row-builders, `buildCardRows`, connectors, COUNTED/MISSING, feedback row, height constant, right-pane mapping.                                                                  |
| `packages/casting-ui/src/viewer.tsx`                    | None beyond the height flowing through `getCastingPromptHeight(…, 'manual')` (already routed, line 459). Verify `castingPromptContentWidth` / pan sizing covers the wider/taller box. |
| `packages/viewer-core/src/consultation-readout.tsx`     | Confirm `viewportHeight` clamp behaves at the new `aboveFooterHeight`; no structural change expected.                                                                                 |
| `apps/cli/src/manual.ts`                                | Add the min-height guard (§ 3.8).                                                                                                                                                     |
| `packages/casting-ui/tests/casting-prompt-box.test.tsx` | Rewrite the ~37 manual row-builder assertions + snapshots.                                                                                                                            |
| `packages/casting-ui/tests/viewer.test.tsx`             | Update manual-flow frame snapshots; **keep the byte-identity test** (only the 18-pick sequence matters — it survives unchanged).                                                      |

No `--plain` / fixture impact: the manual flow is viewer-only and does not feed the
`packages/casting-ui/tests/fixtures/` plain-output or the `consultation-file` save fixtures
(the saved `.md` is identical to the interactive flow — that's what the byte-identity test
asserts). Confirm with `pnpm generate-fixtures` producing **no diff** after the change.

---

## 5. Code-dependent assumptions (bug-fixing in flight)

Written against `2f7bcb9`; re-verify each before coding, since manual-prompt bug-fixing
continues:

1. `validateManualInput` shape + **priority order** (`incomplete → zero-remainder →
conservation → suspended-sum → ok`) drives the entire § 3.5 coloring table. If the
   ordering or a `kind` changes, re-derive the table.
2. `liveLeftTotal` / `liveRightTotal` definitions (`:1561-1562`) — the COUNTED/MISSING math
   reuses them. If their null-coalescing changes, § 3.3/3.4 shift.
3. `computeManualRoundResult` / `MANUAL_FIELD_ORDER` / the `useInput` commit + Ctrl+R
   semantics — the revamp must **not** alter behavior (§ 3.6). Re-read after bug-fixing.
4. `getCastingPromptHeight(…, 'manual')` is the single source of reserved height; bumping it
   11 → 24 must stay in lockstep with what the component actually renders (the existing
   comment at `:530` warns about drift).
5. The `30386ae` predecessor plan (`docs/superpowers/plans/2026-05-28-manual-prompt-tweak.md`)
   describes the _current_ layout; treat it as the "before", not a constraint.

---

## 6. Implementation phases (TDD: red → green per phase)

Each phase is independently testable via the pure row-builders (no Ink needed for most).

**P1 — Title + dots relocation.**
`manualTitleRow` → `Line N/6 · Cast C/3 · Step P/4` (no inline dots). Add a `stepDotsRow`
helper (or inline in the right-pane builder) producing `● ● ● ○` from the focused-field
ordinal. Unit-test both.

**P2 — Expand the heap card.**
Extend `buildCardRows` from 6 → 10 rows: `header / Piles / Fours × 4 / ─── / Subtotal /
Remainder / [Suspended|blank] / ─── / Total / footer`. `Fours × 4` is a **static** label
row (always `× 4`). Pass in precomputed numeric labels (`subtotalLabel`, `totalLabel`) plus
the styled raw cells (`pilesCell`, `remCell` — these still show `?`/inverse). Footer carries
the `┬` tee. Title-case the labels per mockup (`Piles`, `Remainder`, `Suspended`, `Total`,
`Subtotal`, `Fours`). Lock with snapshot tests for both LEFT (blank suspended slot) and
RIGHT (concrete `Suspended + 1`).

**P3 — Flow connectors + COUNTED/MISSING.**
New pure builders:

- `flowHeaderRows(unparted)` → `UNPARTED STALKS: N` / drop `│` / branch `┌──┴──┐`.
- `flowFooterRows({counted, missing, missingColor})` → join `└──┬──┘` / drop `│` /
  `COUNTED STALKS: - N` / ledger rule `────` / `MISSING STALKS  N` with color from § 3.5.
  Center/align the connector glyphs over the card band (lock exact widths via snapshot).
  Compute `counted` / `missing` from live totals (§ 3.4).

**P4 — Feedback row (㉒).**
Repurpose `bottomStripRow`: **remove the `editing` ("N of M accounted") branch** — MISSING
owns that now. Branches become: `ok` → "Press Enter to commit" (left) ; `error`
(suspended-sum / zero-remainder) → red message (left) ; `conservation` → blank left ;
`resolved` → green `→ next cast: N unparted`. Right side is always `Shift+Tab: go back`.

**P5 — Right-pane mapping + body composition.**
Map the right pane onto the 10-row card band per the § 2 annotations (header→blank,
Piles→question, Fours→hint, sep→blank, Subtotal→box-top, Remainder→box-mid,
Suspended→box-bottom, sep→blank, Total→dots, footer→blank). Rebuild the full 22-row stack
in the component render and keep the `pad-to-renderWidth → sliceAnsi(horizontalOffset)` pan
(`casting-prompt-box.tsx:1844`). `focusedInputBoxRows` (3-row box) is unchanged.

**P6 — Height + guard.**
`getCastingPromptHeight(…, 'manual')` → 24. Add the min-height guard in `apps/cli/src/manual.ts`
(§ 3.8). Update the `<ManualCastingPrompt>` doc comment (`:1477`) to the new geometry.

**P7 — Snapshots, byte-identity, full gate.**
Regenerate manual snapshots; assert the byte-identity test (`viewer.test.tsx`) still passes
unchanged; `pnpm generate-fixtures` yields no diff. Run `pnpm type:check`, `pnpm lint:check`,
`pnpm format:check`, `pnpm --filter @hexagram/casting-ui test`. Reach for `pnpm test:stress`
before pushing (Ink component change → CI contention tier per AGENTS.md).

---

## 7. Risks / open items

- **Connector ASCII alignment** is fiddly (tees must line up over card centers across the
  4-col card gap). Lock every glyph with snapshots; expect iteration.
- **`REQUIRED_MIN_ROWS`** needs real measurement from the chrome constants — placeholder 34.
- **Right-pane width**: the question `How many piles of 4 stalks in the RIGHT heap?` (45
  cols) plus the 42-col diagram + gaps sets `naturalBodyWidth`; confirm the pan still floors
  correctly on `--wrap-width 40` (`casting-prompt-box.tsx:1711`).
- **Bug-fixing drift** (§ 5) — reconcile against final HEAD before/while implementing.

```

```
