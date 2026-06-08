# Terminal UI architecture & flow state machine

Status: Accepted
Date: 2026-05-29

The interactive surfaces are built with **Ink + React**, not a lower-level
terminal library. React's component model, hooks, and reconciliation are what make
the tabbed viewer, the history list, and the playground tractable to build and
test (the test story rides on `ink-testing-library` — see
[ADR-0012](0012-terminal-test-reliability.md)).

The casting **Viewer** owns a flow state machine (`viewer-flow.ts`):

```
awaitingQuery → casting → computing → done
```

- `awaitingQuery` — the query box is editable; the Casting table shows `·`
  placeholders.
- `casting` — per-split input is collected (the input widget depends on flow kind
  and input mode — see [ADR-0010](0010-interactive-environment-policy-and-input-modes.md)).
  Non-Casting tabs are locked and dimmed; only Escape/Ctrl+C exit.
- `computing` — the hexagram + casting are finalised and the file is saved.
- `done` — tabs unlock; normal chrome (Tab cycling, scroll, pan, saved-path footer)
  re-enables.

Transitions are driven by a reducer with explicit actions (`queryChange`,
`querySubmit`, `splitCommitted`, `computeSucceeded`/`computeFailed`, and the
manual flow's `lineRewound`). There are no implicit side-effect transitions.

Two role distinctions are kept sharp (and named in `CONTEXT.md`):

- A **Viewer** drives a flow and _produces_ a consultation. A **Readout** only
  _displays_ one and owns no flow — `history-ui` renders a Readout with no Viewer
  behind it.
- The generic screen frame (title bar, scroll gutter, footer) is the **ScreenShell**
  in `viewer-core`, shared by the Readout and the history list — see
  [ADR-0001](0001-shared-screen-shell.md).

Content generation is split from rendering: `buildConsultationSections()` produces
per-tab strings, the section builders accept a `PartialCastingRecord` so the same
renderer fills the table incrementally (`·` for null cells), and the plain-mode
console output composes from the same builders — so the Ink and `--plain` outputs
can't drift.

## Considered options

- **A lower-level terminal library** (blessed / raw ANSI). Rejected: the
  declarative component model and React's testing ecosystem are worth more than the
  control, for screens this stateful.
- **Ad-hoc booleans instead of a state machine.** Rejected: the four-phase flow
  with tab-locking and an undo action is exactly what an explicit reducer keeps
  correct; implicit flag soup would rot.
- **Separate renderers for Ink vs plain.** Rejected: shared section builders are
  the only way to keep the two byte-aligned (locked by fixtures —
  [ADR-0013](0013-test-execution-and-ci-posture.md)).

## Consequences

- Changes to the `ScreenShell` API touch both `casting-ui` and `history-ui`.
- New flow behaviour belongs in the reducer as an action, not as a side effect in a
  component.
- The section builders are the shared contract behind both output modes; change them
  via `pnpm generate-fixtures`.

## Where it's enforced

- `cli/casting-ui/src/viewer-flow.ts` — the state machine + reducer.
- `cli/casting-ui/src/viewer.tsx` — the Viewer/Readout rendering.
- `cli/viewer-core/src/` — `ScreenShell`, palette, section builders.
- `cli/casting-ui/src/output-composers.ts` / `output-sections.ts` — shared
  content generation.
