# Interactive-environment policy & input modes

Status: Accepted
Date: 2026-05-29

The CLIs make an explicit decision about _when_ a rich terminal UI is appropriate
and _what input widget_ to present, driven by the environment rather than assumed.

**Environment guard.** `isInteractiveEnv()` (in `viewer-core`) is true only when
stdout is a TTY **and** `NO_COLOR` is unset **and** `CI` is unset. The Ink-only
bins refuse to start otherwise, exiting with a clear stderr message and code 1.

**Two CLI tiers:**

- **Ink + `--plain` fallback** — `hexagram-random`, `hexagram-interactive`. These
  are algorithmic enough to be automated, so they keep a classic Inquirer + console
  path (also taken automatically on non-TTY stdout).
- **Ink-only** — `hexagram-history`, `hexagram-manual`, `hexagram-playground`.
  Browsing past readings, transcribing physical stalks, and exploring lines are
  inherently interactive; there is no meaningful headless rendering, so they refuse
  non-TTY outright rather than degrade.

**Input modes (interactive casting).** The default casting widget is a
bouncing-**slider** the user locks with SPACE; `--numeric-input` selects the legacy
typed-number prompt. Crucially, the slider is **force-overridden to typed input
when `NO_COLOR=1` or `CI=true`** — a moving cursor carries no semantic value at any
single frame, so a screen-reader or automation environment must not be left
watching an animation. This accessibility fallback is the same signal family as the
environment guard, applied to widget choice instead of startup.

## Considered options

- **Always render Ink** (no guard). Rejected: pipes, CI logs, and screen readers
  get a broken or meaningless animation.
- **`--plain` for every bin.** Rejected: a plain history browser or manual
  scratchpad is not a coherent experience; the honest answer for those is "needs a
  terminal."
- **Slider always, or numeric always.** Rejected: the slider is the better default
  for sighted interactive use; numeric is the correct fallback for
  accessibility/automation. The environment picks.

## Consequences

- `NO_COLOR` and `CI` are first-class inputs to UX, not just colour toggles — code
  that reads them is making a deliberate accessibility decision.
- Adding a new interactive bin means choosing a tier; if it has no headless meaning,
  guard it Ink-only.

## Where it's enforced

- `packages/viewer-core/src/run-utils.ts` — `isInteractiveEnv`.
- `packages/casting-ui/src/utils-mode.ts` — `resolveOutputMode` / `resolveInputMode`
  and the NO_COLOR/CI overrides.
- `apps/cli/src/{history,manual,playground}.ts` — the Ink-only non-TTY guards.
- `apps/cli/src/{random,interactive}.ts` — the `--plain` branch.
