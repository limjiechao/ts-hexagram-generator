import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config'

// Shared vitest base config for every package in the workspace.
//
// Why 30 s, not vitest's 5 s default: round 6 of the May 2026 CI
// stabilisation (commit 8ba4867) proved the 5 s default kills history-ui
// tests at exactly 5001–5039 ms on Ubuntu under 2-CPU GHA load. Ink-heavy
// tests pay a real render-cycle cost, and the polling `waitFor` helpers
// in `@hexagram/test-utils` set their own deadlines (4–20 s); the outer
// `testTimeout` only needs to comfortably contain those. 30 s is 3–6×
// the local p99 across every package — a real hang still surfaces as a
// useful diagnostic.
// Two settings work together to give vitest true no-build dev across the
// workspace:
//   1. `ssr.resolve.conditions: ['source']` makes Vite's SSR resolver (which
//      vitest uses for the test process) honour the `source` entry in each
//      `@hexagram/*` package's `exports` map, picking `./src/*.ts` over the
//      built `./dist/*.mjs`. (Vite 6 splits SSR conditions out of
//      `resolve.conditions`; vitest 4 reads only the SSR set when forking.)
//   2. `test.server.deps.inline: [/@hexagram\//]` opts those same packages
//      out of Vite's default SSR externalisation, so their `.ts` source
//      actually flows through Vite's transform pipeline instead of being
//      handed to Node's ESM loader (which can't read TypeScript).
// Together these eliminate the cross-package `dist/` dependency that
// `pnpm test:stress` (4× concurrent `turbo run test --force`) used to race
// on, and they match the design intent recorded in AGENTS.md: "source for
// tsx/vitest no-build dev".
export const vitestBaseConfig = defineConfig({
  ssr: {
    resolve: {
      conditions: ['source'],
    },
  },
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    server: {
      deps: {
        inline: [/@hexagram\//],
      },
    },
  },
})

export const extendVitestBaseConfig = (overrides: UserConfig): UserConfig =>
  mergeConfig(vitestBaseConfig, overrides)
