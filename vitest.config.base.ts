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
export const vitestBaseConfig = defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})

export const extendVitestBaseConfig = (overrides: UserConfig): UserConfig =>
  mergeConfig(vitestBaseConfig, overrides)
