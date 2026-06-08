# Test execution & CI posture

Status: Accepted
Date: 2026-05-25

How tests run — locally, in the shared base config, and in CI — encodes several
decisions learned the hard way during the May 2026 stabilisation. (For the
_component-level_ race fixes, see [ADR-0012](0012-terminal-test-reliability.md).)

**No-build test resolution.** `vitest.config.base.ts` makes Vite resolve the
`source` export condition (`ssr.resolve.conditions: ['source']`) and inline the
`@hexagram/*` packages (`test.server.deps.inline: [/@hexagram\//]`), so tests run
against raw `.ts` with no prior `dist/`. This realises the publishing strategy's
`source` condition ([ADR-0003](0003-package-publishing-and-module-strategy.md)) and removes the
cross-package build dependency that `pnpm test:stress` used to race on.

**30-second test timeout** (not vitest's 5 s default). Round 6 proved the 5 s
default killed history-ui tests at exactly 5001–5039 ms on Ubuntu under 2-CPU GHA
load. Ink tests pay a real render-cycle cost; the polling `waitFor` helpers set
their own 4–20 s deadlines, so the outer `testTimeout` only needs to contain those.
30 s is 3–6× local p99 — a real hang still surfaces usefully.

**The 1M-iteration distribution test stays in the default suite.** The RNG
statistical test runs 1,000,000 casts (≈40 s, its own 90 s per-test override) on
every `pnpm test`. It is slow by design: only that volume catches subtle
distribution bugs. AGENTS.md documents how to skip it locally; CI eats the cost.

**Byte-identity fixtures.** The `--plain` stdout and the saved `.md` output are
locked byte-for-byte by fixtures, regenerated together via `pnpm generate-fixtures`
from shared cases. Output changes are therefore explicit, reviewed diffs — not
silent drift. (This is what keeps the shared section builders honest — see
[ADR-0009](0009-terminal-ui-architecture-and-flow-state-machine.md).)

**CI contention simulation.** A quiet macOS box hides the load-induced flake tier.
`test:flake` (5× chained `turbo run test --force`), `test:stress` (4× concurrent
`test:flake`), and `test:stress:once` (cheaper) reproduce 2-CPU runner contention
with the pure-JS `concurrently` runner — no Docker. Reach for them before pushing a
race fix or merging an Ink change.

**Cross-platform CI.** The GitHub Actions test job runs an **ubuntu + windows**
matrix with `fail-fast: false`, so a Windows-only failure doesn't cancel the Ubuntu
job (and vice-versa). `FORCE_COLOR` is wrapped with **`cross-env`** at the script
boundary — POSIX `FORCE_COLOR=1 vitest` is rejected by Windows `cmd.exe`, and
setting it before the process starts (not via `test.env` after worker fork) is the
load-bearing rule for ANSI output. `FORCE_COLOR` is also declared in `turbo.json`'s
`test.env` so Turbo keys its cache on it.

## Considered options

- **Build before test.** Rejected: it reintroduces the `dist/` race the `source`
  condition exists to avoid.
- **Keep the 5 s timeout / move the 1M test out of the default suite.** Rejected:
  the first flakes CI; the second is the one test that needs the volume, and hiding
  it invites it to rot.
- **Snapshot tests instead of byte-identity fixtures.** Rejected: explicit
  regenerate-and-review is stricter against accidental output drift.
- **Run `test:stress` in CI.** Rejected: 10+ min per run; it's a local pre-push
  tool, CI runs the suite once per matrix leg.

## Consequences

- A real hang now takes up to 30 s to fail — acceptable for a useful diagnostic.
- Changing any section builder requires `pnpm generate-fixtures` or the fixture
  tests fail (by design).
- The Windows matrix leg is load-bearing; don't drop it to save CI minutes without
  re-checking the cross-platform assumptions.

## Where it's enforced

- `vitest.config.base.ts` — timeout, `source` condition, `deps.inline` (carries a
  pointer to this ADR).
- `domain/core/vitest.config.ts` — the 90 s override for the 1M test.
- `package.json` — `test:flake` / `test:stress` / `generate-fixtures`, `cross-env`.
- `turbo.json` — `test.env: ["FORCE_COLOR"]`.
- `.github/workflows/unit-test.yml` — the OS matrix + `fail-fast: false`.
- the fixture dirs under `cli/casting-ui/tests/` and
  `domain/consultation-file/tests/`.
