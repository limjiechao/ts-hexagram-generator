import { defineConfig } from 'vitest/config'

// Shell hosts integration tests that drive Home → casting → done end-to-end
// through 18 cast iterations + a real file write, plus a 64-iteration
// synchronous banner-layout render loop. On Windows GHA both can run 4-6 s,
// brushing against vitest's default 5 s testTimeout with zero headroom.
// Bumping the budget here keeps the same tests well within their natural
// duration while still bounding a real hang.
export default defineConfig({
  test: {
    testTimeout: 15_000,
  },
})
