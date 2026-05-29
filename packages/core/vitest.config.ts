import { defineConfig } from 'vitest/config'

import { extendVitestBaseConfig } from '../../vitest.config.base'

// The `rng distribution (slow)` test in `tests/random-casting.test.ts` carries its
// own per-test `{ timeout: 90_000 }` for the 1M-iteration yarrow-stalk
// loop; that override sits above the base 30 s `testTimeout` and is the
// authoritative budget for that one test.
export default extendVitestBaseConfig(defineConfig({}))
