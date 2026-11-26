# With NO_COLOR on a TTY, the Ink-only commands run

Status: Proposed
Date: 2026-11-26
Amends: [ADR-0010](0010-interactive-environment-policy-and-input-modes.md) ("Environment guard"), for the overhaul only

This amends ADR-0010 on one point only: what `NO_COLOR` does to the Ink-only
commands. It folds R-332. Everything else in ADR-0010 stands as "What remains
of ADR-0010" sets out.

In the overhaul's CLI, the Ink-only commands are `hexagram`,
`hexagram-manual`, `hexagram-playground` and `hexagram-history`. Each one:

- **runs on a TTY with `NO_COLOR` set**, full-screen, without colour, and
  with typed input in place of any slider;
- **refuses** when stdout is not a TTY, or when `CI` is set, even on a TTY.

A refusal is as ADR-0010 has it: a message on stderr and exit 1. The CLI
manual's section 2 holds the full table, `hexagram-random` and
`hexagram-interactive` included.

## Why

ADR-0010 treats `NO_COLOR` as a sign of a screen reader. Under its guard, a
screen-reader user on a real terminal could not cast with Physical Division
or browse the Journal at all, since only the Ink-only commands do those
things. The guard's aim is to spare that user an animation. Typed input in
place of the slider already does that, as ADR-0010's input modes show.
Refusing the whole command goes further than the aim needs.

`CI` is different. It signals that no person is watching, and an Ink-only
command has no headless meaning (ADR-0010, "Two CLI tiers"). It still refuses.

## What remains of ADR-0010

- **For the legacy app**, ADR-0010 stands whole, its 2026-06-06 amendment
  included, until the cutover. This ADR does not change the legacy app.
- **For the overhaul**, these parts still hold:
  - the two tiers: commands with a plain mode, and Ink-only commands that
    refuse rather than degrade;
  - the input modes: the slider by default, `--numeric-input` for typed
    input, and typed input forced by `NO_COLOR`, and by `CI` where a command
    still runs;
  - from the 2026-06-06 amendment: the plain-versus-Ink choice reads only
    whether stdout is a TTY, and `hexagram-manual` refuses to start in a
    terminal under 32 rows. A terminal that shrinks below 32 rows during a
    Casting shows a notice instead (R-339).
- ADR-0010's environment guard, true only when stdout is a TTY and neither
  `NO_COLOR` nor `CI` is set, no longer decides whether an Ink-only command
  starts. `NO_COLOR` now only removes colour and forces typed input.

## Considered options

- **Run with `NO_COLOR`, refuse with `CI` (chosen).** The screen-reader user
  keeps every command; automation still gets a clear refusal.
- **Keep ADR-0010's guard.** Rejected. It locks a screen-reader user out of
  Physical Division and the Journal.
- **Run with `NO_COLOR` or `CI`.** Rejected (R-332, clerk's note). Under `CI`
  no one can drive a full-screen command.

## Consequences

- `NO_COLOR` and `CI` are no longer one signal family for the Ink-only
  commands. Code that checks them must treat each on its own.
- Every Ink-only command must stay usable without colour, so nothing it
  shows may rely on colour alone.

## Where it's enforced

- Nowhere yet. The overhaul's CLI is built in Phase 4, against the CLI
  manual's section 2.
