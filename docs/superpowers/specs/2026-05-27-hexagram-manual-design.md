# `hexagram-manual` — design spec

**Status:** design approved 2026-05-27, awaiting implementation plan
**Owner:** Lim Jiechao

## Goal

Add a third casting flow — `hexagram-manual` — for users who cast with
physical yarrow stalks. The user does the four-operations sort on their
desk, then transcribes the result into the CLI by reporting the split
index (left heap size) for each of the 18 casts. The CLI derives the
six lines and saves a consultation file in the same format as the
existing `interactive` and `random` flows.

Ships as a 5th item in the composed `hexagram` home menu and as a
standalone `hexagram-manual` bin.

## Non-goals

- A coin-toss casting mode. Yarrow stalk only.
- Bulk-transcription form (a 6×3 matrix of fields submitted in one go). Live
  scratchpad only.
- Cross-line undo beyond the two-line window described below.
- A plain (Inquirer) fallback. Manual is Ink-only.
- Recording casting provenance in the saved file. Storage is identical to
  interactive and random.

## Locked design decisions

The brainstorming session walked seven decision branches. The chosen
options are listed here so the implementation plan inherits the
constraints without re-litigating.

1. **Input model — split-index entry.** Per cast, the user types a
   number in `1..N-1` where `N` is the round's unparted stalk count.
   Full `CastingRecord` is persisted; lines are derived by the existing
   `makeLineGenerator`. Identical data shape to `interactive`.

2. **UX shape — live scratchpad.** Reuses the existing viewer chrome
   (casting table, progress bar, footer, tabs, save). Per-cast prompt
   replaces the slider with a typed `<NumberInput>`. New `flowKind:
   'manual'` slots into the existing `awaitingQuery → casting →
   computing → done` state machine.

3. **Undo — line-bounded with two-line window.** A new `lineRewound`
   flow action clears the most recent line that has committed casts.
   Bound to Ctrl+R. Strict "current line only" was rejected during
   design because the user only notices a miscount on the *next*
   prompt, which is line+1 cast 0 when the bad line was just
   completed — see "Ctrl+R semantics" below for the exact rule.

4. **Query timing — query first.** Same `awaitingQuery` step as
   interactive and random. No state-machine divergence.

5. **No plain mode.** Bin refuses non-TTY with stderr `"hexagram-manual
   requires an interactive terminal"` and exit 1, mirroring
   `hexagram-history`. In plain mode, manual would be indistinguishable
   from `interactive --plain`; shipping it would be a confusing
   duplicate.

6. **No provenance field.** The saved consultation file's schema is
   unchanged. Manual writes the same frontmatter (`schemaVersion`,
   `timestamp`, `query`, `hexagram`, `casting`) as interactive and
   random. Provenance can be added later as an additive optional field
   if a future feature needs it; nothing today does.

7. **Wiring.**
   - Menu position: `interactive, random, manual, history, playground`
   - Menu label: `"New manual consultation"`
   - Bin name: `hexagram-manual`
   - Bin flags: `--wrap-width <n>` only
   - Undo key: `Ctrl+R`

## Architecture

No new package. Every change lands in an existing package's existing
file at the spot its structure already implies.

### Files changed

| File | Change |
|---|---|
| `packages/casting-ui/src/viewer-flow.ts` | Extend `FlowKind` to `'interactive' \| 'random' \| 'manual'`. Add `'lineRewound'` action + reducer case. |
| `packages/casting-ui/src/use-line-generator.ts` | Add `rewindCurrentLine()` op alongside `submitSplit()`. Drops `lineGeneratorRef.current`, resets `currentMaxRef` to `stalksBeforeParting.length - 1`. |
| `packages/casting-ui/src/casting-prompt-box.tsx` | Gate manual-specific extras (Unparted-stalks row, manual prompt copy, post-commit reveal row) on a new `flowKind`-derived prop. `inputMode` stays `'slider' \| 'number'` — manual forces `'number'`. |
| `packages/casting-ui/src/viewer.tsx` | Accept `flowKind: 'manual'`. Mount casting prompt as interactive-number does. Add Ctrl+R handler scoped to `mode === 'casting' && flowKind === 'manual'` that calls `rewindCurrentLine()` then dispatches `lineRewound`. |
| `packages/casting-ui/src/index.ts` | Export `runManualConsultationViewer(opts)`. |
| `apps/cli/src/manual.ts` *(new)* | TTY guard + flag parse + `runManualConsultationViewer()` + exit code, mirroring `apps/cli/src/history.ts`. |
| `apps/cli/tsdown.config.ts` | Add `manual` entry. |
| `apps/cli/package.json` | Add `"hexagram-manual": "./dist/manual.mjs"` to `bin`. Update description. |
| `packages/shell/src/home-menu.tsx` | Extend `HomeMenuSelection` with `'manual'`. Insert at index 2 of `MENU_ITEMS`. |
| `packages/shell/src/nav-machine.ts` | Add `{ type: 'newManualConsultation' }` event. Extend `NavFlowKind` to include `'manual'`. Add reducer case. |
| `packages/shell/src/hexagram-app.tsx` | Translate `'manual'` menu selection to `newManualConsultation` event. |
| `packages/shell/package.json` | Update description if it mentions the flow set. |
| `AGENTS.md` | Extend the "Commands" and "Architecture" sections to document `hexagram-manual` alongside the existing bins. The CLAUDE.md / AGENTS.md is enumerative — adding the bin without updating these is a known regression source. |

### Files deliberately NOT touched

- `@hexagram/consultation-file` — schema unchanged.
- `@hexagram/types` — `CastingRecord` shape reused.
- `@hexagram/core` — `makeLineGenerator` reused unchanged.
- `@hexagram/history-ui` — manual consultations render as ordinary entries.
- `packages/casting-ui/src/interactive-flow.ts`, `log-and-save.ts` —
  no plain-mode path for manual.
- `packages/casting-ui/src/utils-mode.ts` — manual's TTY guard lives
  at the bin, not in shared mode-resolution.

## Flow & state machine

### Lifecycle

Unchanged: `awaitingQuery → casting → computing → done`. Manual reuses
every transition; only the casting-phase prompt differs.

### New action

```ts
| { type: 'lineRewound' }
```

### Reducer case

```ts
case 'lineRewound': {
  if (state.mode !== 'casting') return state
  if (state.flowKind !== 'manual') return state

  const targetLineIndex =
    state.castIndex === 0 && state.lineIndex > 0
      ? ((state.lineIndex - 1) as FlowState['lineIndex'])
      : state.lineIndex

  // No-op at line 1 cast 1 — nothing to rewind.
  if (targetLineIndex === state.lineIndex && state.castIndex === 0) {
    return state
  }

  const partialCasting = state.partialCasting.map(
    (line, lineIndex) =>
      (lineIndex === targetLineIndex
        ? [null, null, null]
        : line) as PartialCastingRecord[number],
  ) as PartialCastingRecord

  const completedLines =
    targetLineIndex < state.lineIndex
      ? state.completedLines.slice(0, -1)
      : state.completedLines

  return {
    ...state,
    partialCasting,
    completedLines,
    lineIndex: targetLineIndex,
    castIndex: 0,
    castingBuffer: '',
    error: null,
  }
}
```

### Ctrl+R semantics

The rule is "rewind the most recent line with committed casts." Three
cases:

- `castIndex > 0` → rewind the current line (mid-line case).
- `castIndex === 0 && lineIndex > 0` → rewind the *previous* line. This
  is the post-line-completion case — the user has just committed cast 3
  of line N, the next prompt has rendered at line N+1 cast 1, and the
  user wants to revisit line N because the new prompt's
  `Unparted stalks: M` (or a moment of physical re-counting) flagged the
  miscount.
- `castIndex === 0 && lineIndex === 0` → no-op (nothing to rewind).

This is a maximum two-line lookback. Arbitrary cross-line walking back
through history is out of scope — Esc to home and start the
consultation over is the escape hatch for older mistakes.

### Generator state on rewind

`use-line-generator.ts` keeps the active line's generator in
`lineGeneratorRef.current`. `rewindCurrentLine()` drops the ref and
resets `currentMaxRef.current` to `stalksBeforeParting.length - 1`.
The next `submitSplit(pick)` with `castIndex === 0` (guaranteed by the
reducer rewinding `castIndex` to 0) follows the existing first-cast
branch at `use-line-generator.ts:57-72` and builds a fresh generator.

### Ctrl+R handler location

Added to `viewer.tsx`'s existing `useInput` block, gated by
`mode === 'casting' && flowKind === 'manual'`. Calls
`rewindCurrentLine()` first (sync ref mutation), then dispatches
`{ type: 'lineRewound' }` (state update). This order means the next
render's `currentMax` already reflects the reset.

### Other flow behaviour

- **Casting phase entry:** `flowKind === 'manual'` carries no
  `CastingPlan`. The existing `querySubmit` reducer at line 130 handles
  `plan: undefined` correctly.
- **Computing / Done:** unchanged from interactive.
- **Escape:** unchanged. Returns to home (or quits the standalone bin).

## UI specifics

### Casting prompt — manual variant

Reuses the `inputMode === 'number'` branch in
`casting-prompt-box.tsx:646-670`, with three additions gated on
`isManualFlow`:

```
During input (cast 2 of line 3 shown):
╭───────────────────────────────────────────────╮
│ Line 3/6 · Cast 2/3                           │
│ Unparted stalks: 40                           │
│ Enter the split (1 to 39): _                  │
╰───────────────────────────────────────────────╯
   Casting in progress ·  ■■■■□□□□□□□□□□□□□□  4/18  · Ctrl+R rewind line

After Enter — input row swaps in place for ~1s, then advance:
╭───────────────────────────────────────────────╮
│ Line 3/6 · Cast 2/3                           │
│ Unparted stalks: 40                           │
│ Round resolved: suspended 8 · next: 32 unparted │
╰───────────────────────────────────────────────╯
```

#### Row content

1. **Title** — `Line N/6 · Cast C/3`. Identical to interactive-number.
2. **Unparted stalks row** — `Unparted stalks: M` where `M = currentMax + 1`.
   Informational (not a validation aid). Anchors the round: "you have M
   stalks; report where you parted (must therefore be 1..M-1)."
3. **Input row** — `Enter the split (1 to M-1): _`. After Enter, swaps
   in place to `Round resolved: suspended X · next: Y unparted` for
   ~1s, then the prompt re-mounts for the next cast.

#### Reveal row math

Use the line generator's own next-round `unpartedStalks.length` as the
source of truth for `next` rather than recomputing in the prompt
component. `suspended` is derived as `max - next` (the difference
between this round's unparted count and the next round's). This avoids
duplicating the round-1-vs-round-2/3 arithmetic that already lives in
`makeLineGenerator` (which prepends a leading "1 from right" only on
round 1).

#### Prompt height

- Manual mode = interactive-number's height + 1 row (the Unparted
  stalks row). `getCastingPromptHeight()` at
  `casting-prompt-box.tsx:503-509` currently returns 5 (no error) or 6
  (with error) for number mode; manual mode adds 1 to each, returning 6
  or 7.
- Error state adds 1 row in manual mode exactly as in number mode.
- The viewer's vertical-space reservation reads through
  `getCastingPromptHeight()` for layout maths, so the function's new
  manual arm is the single source of truth.

#### Footer

Existing casting footer: `"Casting in progress ·  ■■■□□□□□□□□□□□□□□□  N/18"`.
Manual appends `· Ctrl+R rewind line` when
`flowKind === 'manual' && (castIndex > 0 || lineIndex > 0)`. The
conditional hides the hint on line 1 cast 1, where Ctrl+R is a no-op
anyway.

#### Reveal dwell

1000ms (`MANUAL_REVEAL_MS`). Longer than slider's 500ms because there's
text to read. Tests opt out via a `manualRevealMs={0}` prop on the
viewer (same opt-out pattern as `sliderCommitRevealMs`).

#### Validation & error handling

Reuse `<NumberInput>`'s existing min/max validation + error row. No new
error states. Out-of-range entry prints the existing red error string
below the input, doesn't advance.

#### Wrap & pan

The number-mode prompt box doesn't pan. Manual adds a 1-row
informational line that's shorter than the prompt row → still no
overflow at the minimum wrap-width. `<` / `>` keys remain no-ops during
the casting flow.

### Visual diff vs existing modes

| Element | Slider | Number (interactive) | Manual |
|---|---|---|---|
| Title | `Line N/6 · Cast C/3: — Press SPACE…` | `Line N/6 · Cast C/3` | `Line N/6 · Cast C/3` |
| Pre-input row | `Stalks: M \| Left Heap: ⠋ \| Right Heap: ⠏` | (none) | `Unparted stalks: M` |
| Input row | bouncing bar | `Divide the stalks. Pick…: _` | `Enter the split (1 to M-1): _` |
| Post-commit reveal | 500ms heap-count dwell | (none) | 1000ms `Round resolved` dwell |
| Footer addendum | (none) | (none) | `· Ctrl+R rewind line` |

## Bin & shell wiring

### `apps/cli/src/manual.ts` (new)

```ts
#!/usr/bin/env node

import process from 'node:process'

import { resolveWrapWidth, runManualConsultationViewer } from '@hexagram/casting-ui'

async function main(): Promise<void> {
  if (!process.stdout.isTTY || process.env.NO_COLOR === '1' || process.env.CI === 'true') {
    process.stderr.write('hexagram-manual requires an interactive terminal\n')
    process.exit(1)
    return
  }
  try {
    const maxWrapWidth = resolveWrapWidth(process.argv)
    const cleanQuit = await runManualConsultationViewer({ maxWrapWidth })
    process.exit(cleanQuit ? 0 : 1)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
```

Verify against the actual exports of `@hexagram/casting-ui` during
implementation; `resolveWrapWidth` and the existing viewer runner
location may need a small re-export tweak.

### `apps/cli/tsdown.config.ts`

Add `manual: './src/manual.ts'` to the entry map alongside the existing
four.

### `apps/cli/package.json`

```jsonc
"bin": {
  "hexagram": "./dist/hexagram.mjs",
  "hexagram-history": "./dist/history.mjs",
  "hexagram-interactive": "./dist/interactive.mjs",
  "hexagram-manual": "./dist/manual.mjs",
  "hexagram-playground": "./dist/playground.mjs",
  "hexagram-random": "./dist/random.mjs"
}
```

### `packages/shell/src/home-menu.tsx`

```ts
export type HomeMenuSelection =
  | 'interactive'
  | 'random'
  | 'manual'
  | 'history'
  | 'playground'

const MENU_ITEMS: readonly MenuItem[] = [
  { value: 'interactive', label: 'New interactive consultation' },
  { value: 'random', label: 'New random consultation' },
  { value: 'manual', label: 'New manual consultation' },
  { value: 'history', label: 'Browse history' },
  { value: 'playground', label: 'Playground' },
]
```

Default focus stays at index 0 (interactive). The five-item menu fits
inside the existing `ScreenShell` content slot.

### `packages/shell/src/nav-machine.ts`

```ts
export type NavFlowKind = 'interactive' | 'random' | 'manual'

export type NavEvent =
  | { type: 'newInteractiveConsultation' }
  | { type: 'newRandomConsultation' }
  | { type: 'newManualConsultation' }
  | { type: 'browseHistory' }
  | { type: 'openPlayground' }
  | { type: 'backToHome' }

// In navReducer:
case 'newManualConsultation':
  return state.screen === 'home'
    ? { screen: 'casting', flowKind: 'manual' }
    : state
```

The existing `backToHome` case handles manual generically — no changes
there.

### `packages/shell/src/hexagram-app.tsx`

Translate `'manual'` menu selection to `newManualConsultation` event in
the existing `HomeMenuSelection` → `NavEvent` mapping. Mount the viewer
with `flowKind={state.flowKind}` — already generic, no edits beyond
the case arm.

## Testing

### Pure unit tests

- **`packages/casting-ui/tests/viewer-flow.test.ts`** — `lineRewound` cases:
  - mid-line rewind (`castIndex > 0`): `partialCasting[lineIndex]` clears to `[null,null,null]`, `castIndex → 0`, `completedLines` unchanged
  - end-of-line rewind (`castIndex === 0 && lineIndex > 0`): `lineIndex → lineIndex - 1`, target line clears, `completedLines.length` decreases by 1
  - boundary no-op (`castIndex === 0 && lineIndex === 0`): same state reference
  - defensive no-op (`flowKind !== 'manual'` or `mode !== 'casting'`): same state reference
  - clean buffer/error fields after rewind

- **`packages/shell/tests/nav-machine.test.ts`** — `newManualConsultation` event:
  - from `home` → `{ screen: 'casting', flowKind: 'manual' }`
  - from non-home → no-op (same reference)
  - `backToHome` from `casting` (manual) → `home`

### Hook test

`packages/casting-ui/tests/use-line-generator.test.tsx`:
  - `rewindCurrentLine()` mid-line: clears `lineGeneratorRef`, resets `currentMax`
  - subsequent `submitSplit(pick)` with `castIndex === 0` builds a fresh generator

### Component tests

`packages/casting-ui/tests/casting-prompt-box.test.tsx` (extend):
  - manual mode renders 3 expected rows: title / `Unparted stalks: N` / `Enter the split (1 to N-1):`
  - typing digits + Enter calls `onSubmit(parsed)`
  - after `onSubmit`, the row swaps to `Round resolved: suspended X · next: Y unparted` for `manualRevealMs` ms before unmounting (use `manualRevealMs={0}` for snappy assertions; one separate test with a non-zero value)
  - reveal-row math is correct across known cases (round 1, round 2, round 3 fixtures)
  - Ctrl+R is NOT intercepted by the prompt (the viewer owns it)

`packages/shell/tests/home-menu.test.tsx` (extend):
  - 5 items render in order
  - default focus at index 0
  - ↓ ↓ ↓ Enter selects manual (regression guard)
  - ↑ from top wraps to playground

### Viewer integration test

`packages/casting-ui/tests/viewer.test.tsx` (extend or add a manual-specific file):
  - manual flow end-to-end: query → 18 casts → save (snapshot the saved file)
  - Ctrl+R mid-line: types 2 splits, Ctrl+R, asserts cells revert and prompt returns to cast 1
  - Ctrl+R cross-boundary: completes line 1, arrives at line 2 cast 1, Ctrl+R, asserts line 1 reverts and prompt re-mounts at line 1 cast 1
  - Ctrl+R no-op at line 1 cast 1: state unchanged

### Fixture parity

`packages/casting-ui/tests/fixtures/cases.ts` and `packages/consultation-file/tests/fixtures/cases.ts`:
  - Add a `manual` variant to one or two existing cases. Reuse the same query + splits.
  - Assert the saved `.md` is **byte-identical** to the same case's interactive output. This enforces the Q6 invariant: storage doesn't record mode, so identical splits must produce identical files.
  - Regenerate via `pnpm generate-fixtures`.

### Bin smoke test

`apps/cli/tests/manual.test.ts` (new, mirroring history's smoke test pattern):
  - `NO_COLOR=1` → stderr refusal, exit 1
  - `CI=true` → same
  - non-TTY `process.stdout` → same
  - TTY + `--wrap-width 60` → calls `runManualConsultationViewer({ maxWrapWidth: 60 })`

### Deliberately NOT tested

- Line-derivation math (`makeLineGenerator`) — exhaustively covered in
  `@hexagram/core`'s existing tests, including the 1M-iteration
  distribution test.
- History-browser rendering of manual consultations — same code path
  as any other consultation.
- Plain-mode behaviour — there isn't one.

### CI considerations

`pnpm test:flake` / `pnpm test:stress` are recommended before pushing
changes to `casting-prompt-box.tsx`, the viewer-flow reducer, or
`use-line-generator.ts` — these are in the historically flake-prone Ink
component path per the May 2026 9-round stabilisation.

## Open verifications during implementation

These are sanity checks to run during build-out, not design questions:

1. Confirm `@hexagram/casting-ui`'s public exports — `resolveWrapWidth`
   and the viewer runner — match what `apps/cli/src/manual.ts` imports.
   Re-export tweaks may be needed.
2. Use the line generator's `FourOperationsResult.unpartedStalks.length`
   directly for the reveal row's `next` value (and derive `suspended`
   as `max - next`) instead of duplicating the round-1-vs-round-2/3
   arithmetic in the prompt.
3. Confirm `hexagram-app.tsx`'s `screen === 'casting'` branch already
   passes `flowKind` through generically; if it has flow-specific
   branching, add the manual arm.
