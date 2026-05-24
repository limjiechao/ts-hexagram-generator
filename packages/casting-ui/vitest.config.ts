import { defineConfig } from 'vitest/config'

import { extendVitestBaseConfig } from '../../vitest.config.base'

// Casting-ui hosts the heaviest Ink-render tests in the workspace:
// `viewer.test.tsx`'s random-flow playback drives 18 casts through Ink's
// per-cast re-mount cycle (~670 ms/cast on Windows GHA = ~12 s natural
// duration), and `casting-prompt-box.test.tsx` exercises slider tick timing
// across the bouncing bar. The base config's 30 s `testTimeout` matches
// `@hexagram/shell` for the same structural reason (Ink render pipeline
// cost, not flaky tests).
export default extendVitestBaseConfig(defineConfig({}))
