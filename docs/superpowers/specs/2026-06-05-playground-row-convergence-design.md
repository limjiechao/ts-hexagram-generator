# Playground Row Convergence — Design

**Date:** 2026-06-05
**Status:** Approved (pending plan)
**Origin:** Task 10 of `docs/superpowers/plans/2026-06-05-seam-remediation.md`, deferred
out of that run as "optional / may split out" and spun into its own design pass
per the plan's own recommendation.

## Problem

Seam **S1** (the conceptual-integrity review,
`docs/reviews/2026-06-05-conceptual-integrity-review.md`) identified the
diagram-row assembly grammar as hand-built in **three** surfaces. Tasks 8–9 of the
seam-remediation plan closed two of them — the ANSI and Markdown transformation
rows now serialize the medium-neutral `transformationRow` /
`hexagramDiagramRowStrings` templates in `@hexagram/consultation-view`. The
**third** assembler survives: `buildLineRow` in
`cli/playground-ui/src/playground-display-rows.ts` independently re-assembles the
`standing | gap | emerging` row for the playground's top-half display.

This is the last copy of the row grammar. Closing it puts the spatial skeleton of
a transformation row in exactly one place.

## What `buildLineRow` does today

It builds one playground line row as two halves joined by a connector, then pads
to a fixed width:

- **Standing (left) half:** `chevron + color(value) + "  " + color(glyph) + "  " + positionLabel`
  - `value`/`glyph` come from `deriveBannerLine(polarityOf(standingLine), isMovingLine(standingLine), pulse)`.
  - `color` = `BOLD_RED` when the standing line moves, else `BOLD_WHITE`.
  - The position label is **uncoloured**.
- **Connector:** `MOVING_ARROW` when the standing line moves, else `STATIC_GAP`.
- **Emerging (right) half:** `color(value) + "  " + color(glyph) + "  " + positionColor(positionLabel)`
  - `value`/`glyph` come from `deriveBannerLine(polarityOf(emergingLine), false, pulse)`.
  - `color` = `BOLD_WHITE` normally, `NORMAL_GREY` when the standing hexagram has no
    moving lines (the "ghost mirror").
  - The position label **is coloured** (`positionColor` = `NORMAL`, or `NORMAL_GREY`
    in the ghost mirror).
- **Wrap:** `padRightToWidth(`${left}${gap}${right}`, TOP_HALF_WIDTH)`.

The chevron (`'› '` when focused, else `'  '`), the gap, and the width-pad are
playground-specific framing. The two cell skeletons are the row grammar.

### The divergence that shaped the design

The standing half maps **byte-identically** onto the existing
`transformationHalfRow` template: indent + decorated value + `"  "` + decorated
glyph + `"  "` + **uncoloured** position. The emerging half does **one** thing the
shared template deliberately never does — it **colours the position label** (the
consultation transformation row never colours position). That single difference is
the whole reason this needs a design pass rather than a mechanical edit.

## Decision

**Converge both halves**, extending the shared template with an optional
position-decorate callback (default identity) so the playground's ghost-mirror
position colour rides through the same skeleton. Chosen over composing the
standing half only, to fully retire the third assembler rather than leave the seam
half-closed. The cost — one optional parameter on a freshly-minted template — is
accepted deliberately and recorded here.

## Design

### 1. Extend `transformationHalfRow` (`domain/consultation-view/src/diagram-template.ts`)

Add an optional fourth parameter, `decoratePosition`, defaulting to identity:

```ts
export function transformationHalfRow(
  cell: { line: Line; position: PositionKey },
  indent: string,
  decorate: DecorateCell,
  decoratePosition: DecorateCell = (text) => text,
): string {
  return (
    `${indent}${decorate(String(cell.line))}` +
    `  ${decorate(LINE_GLYPH[cell.line])}` +
    `  ${decoratePosition(POSITION_LABELS[cell.position])}`
  )
}
```

The position cell now passes through `decoratePosition`. Every existing caller
(`transformationRow`, which both IR→ANSI and IR→Markdown serializers use) calls
`transformationHalfRow` with three arguments, so it gets the identity default and
emits **byte-identical** output. The Task 8 template tests and the
byte-identity parity fixtures (`@hexagram/readout`, `@hexagram/consultation-file`,
`@hexagram/casting-ui`) remain green **without regeneration** — that green is the
proof the consultation surfaces are untouched.

`transformationRow` itself is **unchanged** — the consultation never colours
position, so it keeps calling the half-row with three arguments.

### 2. Rewrite `buildLineRow` (`cli/playground-ui/src/playground-display-rows.ts`)

Compose two `transformationHalfRow` calls for the skeleton; keep the
chevron / gap / width-pad framing:

```ts
const left = transformationHalfRow(
  { line: standingLine, position },
  chevron,
  (text) => `${standingColor}${text}${NORMAL}`,
  // position uncoloured on the left -> identity default (omitted)
)
const right = transformationHalfRow(
  { line: emergingLine, position },
  '',
  (text) => `${emergingColor}${text}${NORMAL}`,
  (text) => `${positionColor}${text}${NORMAL}`,
)
return padRightToWidth(`${left}${gap}${right}`, TOP_HALF_WIDTH)
```

`standingColor` / `emergingColor` / `positionColor` / `gap` / `chevron` keep their
current derivations.

### 3. Two byte-preserving substitutions this forces

- **The input carries the position index, not the rendered label.**
  `LineRowInputs.positionLabel: string` becomes `position: 1 | 2 | 3 | 4 | 5 | 6`
  (the `PositionKey` the template indexes). The call site in
  `playground-display.ts` already computes
  `POSITION_LABELS[(lineIndex + 1) as 1..6]`; it now passes `(lineIndex + 1)` and
  the template performs the same lookup, producing the same label bytes. The
  caller no longer imports `POSITION_LABELS` (unless used elsewhere — verify).
- **`deriveBannerLine` is dropped from `buildLineRow`.** The half-row sources
  value and glyph from `String(line)` and `LINE_GLYPH[line]`. These are
  byte-identical to `deriveBannerLine(...).value` / `.bar` for both halves: the
  function round-trips the canonical `Line` value, and (since the merge of Task 4)
  its `bar` is `LINE_GLYPH[value]`. The emerging side is always static (lines 6/9
  flip to 7/8), so its hardcoded `moving = false` already matched. The
  `deriveBannerLine` and `polarityOf` imports are removed from this file.

### 4. Consequence — `pulse` becomes inert and is removed

`buildLineRow` passes `pulse` **only** into `deriveBannerLine`, and reads only
`.value` / `.bar` from the result — never `.role`, the sole pulse-dependent field.
So `pulse` has **zero** effect on this function's output today (the existing code
comment notes the pulse-dim flicker is deliberately not applied here). Once
`deriveBannerLine` is dropped, `pulse` is unused, so it is removed from
`LineRowInputs` and from the call site.

This inertness is **proven before the refactor lands** by the characterization
test below (pulse-on and pulse-off rows are identical). If that assumption is ever
false, the characterization test is red and the work stops rather than silently
changing output. If the call site computes `pulse` for any other consumer, that
computation stays and only the unused `buildLineRow` argument is dropped.

## Components and boundaries

- `transformationHalfRow` stays the single, medium-neutral home of the half-row
  skeleton. It gains one optional, backward-compatible knob; its return contract
  (a string with cells decorated by callbacks, position via its own callback) is
  unchanged for existing callers.
- `buildLineRow` becomes a thin composer: framing (chevron/gap/pad) + two
  half-rows + the playground's colour policy. It no longer knows the cell
  skeleton.
- No domain → cli edge is introduced; `playground-ui` already depends on
  `@hexagram/consultation-view`. `boundaries:check` stays green.

## Testing

- **New characterization test** locking `buildLineRow` output bytes across the
  matrix: standing moving vs static, focused vs not, `hasMoving` true vs false,
  and `pulse` true vs false (the last pair must be identical — that is the
  inertness proof). Written and shown red/green per TDD before and after the
  refactor.
- **Existing gates that must stay green without modification:** the 130
  `@hexagram/playground-ui` display tests and `top-half-width-invariant.test.ts`.
- **Existing consultation parity fixtures** (`readout`, `consultation-file`,
  `casting-ui`) stay green **without regeneration**, proving the optional template
  parameter did not perturb the ANSI/Markdown surfaces.
- `transformationHalfRow`'s own template tests gain a case for the
  `decoratePosition` callback (position decorated) alongside the existing
  default-identity behaviour.

## Deliberately out of scope

- The identity stack (`buildIdentityStack`), the header row (`buildHeaderRow`),
  the identity divider, and all geometry constants — untouched.
- `deriveBannerLine` itself (still used by the home banner and elsewhere) — only
  its use inside `buildLineRow` is removed.
- The two emerging-gate / refusal-fork seams (S-B/E, S3) the seam-remediation plan
  also deferred — not part of this work.

## Reversibility

Two files change (`diagram-template.ts`, `playground-display-rows.ts`) plus the
one call site and the new test. The template change is additive and
default-compatible. Reverting is a localized diff, and every claim of
byte-preservation is backed by a runnable test or an unchanged byte-identity
fixture.
