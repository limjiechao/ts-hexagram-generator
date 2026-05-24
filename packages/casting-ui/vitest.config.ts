import { defineConfig } from 'vitest/config'

// Casting-ui hosts the heaviest Ink-render tests in the workspace:
// `viewer.test.tsx`'s random-flow playback drives 18 casts through Ink's
// per-cast re-mount cycle (~670 ms/cast on Windows GHA = ~12 s natural
// duration), and `casting-prompt-box.test.tsx` exercises slider tick timing
// across the bouncing bar. Vitest's default 5 s `testTimeout` is too tight
// for these inherently slow but correctly-polled tests — they already use
// bounded `tick(60)` loops or `waitFor` internally; they just need the
// outer per-test budget lifted. 30 s matches `@hexagram/shell` for the same
// structural reason (Ink render pipeline cost, not flaky tests).
export default defineConfig({
  test: {
    testTimeout: 30_000,
  },
})
