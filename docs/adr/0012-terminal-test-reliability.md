# Terminal-test reliability

Status: Accepted
Date: 2026-05-25

Testing Ink components against `ink-testing-library` exposed a class of races that
caused intermittent CI failures (constant on Windows GHA, flaky on Ubuntu under
load). This ADR records the patterns adopted to make terminal tests deterministic.
It is the hard-won output of the May 2026 9-round CI stabilisation.

**The `useInput` bind race (root cause).** A rendered frame proves a component has
_committed_, but its `useInput` handler is registered with Ink's stdin dispatcher
only when the post-commit `useEffect` fires on the _next macrotask_. Bytes written
into that gap are dispatched to whatever handlers are currently registered (often
just the root's Ctrl+C handler) and silently swallowed.

**The fixes:**

- **`onReady` witness contract.** Components expose an optional `onReady?: () => void`
  that fires exactly once per mount, from the _same_ `useEffect` that binds
  `useInput` (guarded against double-fire). Tests
  `await waitFor(() => expect(onReady).toHaveBeenCalled())` before writing the first
  keystroke — an explicit signal, not a guess. This replaced an earlier hack that
  polled an incidental Braille-spinner glyph.
- **`@hexagram/test-utils`** — a workspace-private package holding the polling
  helpers that had been copy-pasted across UI packages: `waitFor(predicate)`,
  `waitForReady(spy)`, `pressUntil(stdin, frame, key, predicate)` (idempotent-key
  retry, the fallback for components without `onReady`), `pumpSliderTick(n)`, and
  `yieldMacrotask()`. Each carries JSDoc on when **not** to reach for it.
- **The `await tick(...)` ban.** An eslint rule errors on
  `stdin.write → await tick() → expect(...)` in test files — the anti-pattern that
  five packages re-discovered serially during stabilisation. New tests make the
  _assertion_ the wait condition (`waitFor`) so there is no fixed delay to tune. See
  [ADR-0005](0005-lint-and-format-toolchain.md). (Pre-existing callers carry a scoped
  `eslint-disable` lifted file-by-file as they migrate.)

## Considered options

- **Longer fixed `tick()` delays.** Rejected: any constant is simultaneously too
  long (slow suite) and too short (still races under contention). The bug is "wait
  for an event," not "wait for N ms."
- **Poll an incidental render artifact** (spinner glyph, heading) as a readiness
  proxy. Rejected: brittle and coincidental; the `onReady` witness is an explicit
  contract fired from the bind site.
- **Retry every keystroke unconditionally.** Rejected: `pressUntil` is the fallback
  only for components lacking `onReady`, and only for idempotent keys; the witness is
  preferred.

## Consequences

- New interactive components should expose `onReady` from their `useInput`-binding
  effect; tests depend on it.
- `pressUntil` retries are only safe for keys idempotent past their transition —
  check before using it.
- The `tick` ban is enforced; reach for the `@hexagram/test-utils` helpers.

## Where it's enforced

- `cli/test-utils/src/` — the helper package.
- `eslint.config.js` — the `await tick(...)` ban (carries a pointer to this ADR).
- component `onReady` props across `casting-ui` / `history-ui` / `viewer-core` /
  `shell`.
