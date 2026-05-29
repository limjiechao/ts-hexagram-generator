# Shared screen shell for the Readout and the history list

Status: Accepted
Date: 2026-05-20

`hexagram-history` is one experience the user moves through — list → Readout →
list — so the history list and the Consultation Readout share a thin
`ScreenShell` (borderless frame, title bar, scrollbar gutter, two-line footer),
extracted into `viewer-core`, along with the `output-palette` colors. This
makes the two screens cohere as halves of one app instead of looking like two
separate tools.

## Considered options

- **Piecemeal chrome-matching** — leave each screen owning its own frame and
  hand-match the markup. Rejected: the two screens drift apart again on the
  next change.
- **Thick shell** — have the shell also own scroll/window state and keymap
  dispatch. Rejected: too much surgery on the working Readout for the benefit;
  the thin frame is where the visible incoherence lived.

## Consequences

- `viewer-core` is now shared UI infrastructure, not Readout-only — changes to
  the `ScreenShell` API affect both `casting-ui` and `history-ui`.
- The shell is a generic frame and carries no divination meaning; it is named
  `ScreenShell`, not `ReadoutShell`, because the history list (not a Readout)
  is an equal consumer.
