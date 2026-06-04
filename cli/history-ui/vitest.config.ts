import { defineConfig } from 'vitest/config'

import { extendVitestBaseConfig } from '../../vitest.config.base'

// History-ui tests poll the rendered frame after `stdin.write(ENTER)` to
// gate on the consultation readout appearing. Under the Ubuntu GHA matrix
// the 2-CPU runner is genuinely saturated — `@hexagram/core`'s 30 s 1M-iter
// rng-distribution test, `@hexagram/casting-ui`'s 31 s suite, and
// `@hexagram/shell`'s 25 s suite all run in parallel turbo lanes, and
// history-ui's own 9 s `history-list.test.tsx` queues first inside this
// package — so the `Enter → fs.readFile → re-render body → byte-compare →
// paint` chain occasionally takes 8+ seconds end-to-end. The local
// `waitFor` helper polls up to 15 s; the base config's 30 s `testTimeout`
// sits comfortably above that.
export default extendVitestBaseConfig(defineConfig({}))
