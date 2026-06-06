import { defineConfig } from 'vitest/config'

import { extendVitestBaseConfig } from '../../vitest.config.base.js'

// Shell hosts integration tests that drive Home → casting → done end-to-end
// through 18 cast iterations + a real file write, plus a 64-iteration
// synchronous banner-layout render loop. The 18-cast slider auto-play takes
// ~12 s natural on Windows GHA (~670 ms per cast × 18), bottlenecked by
// Ink's render cycle. The local `waitFor` helper gives those tests a 20 s
// deadline; the base config's 30 s `testTimeout` sits comfortably above
// that so a real hang still surfaces as a useful diagnostic.
export default extendVitestBaseConfig(defineConfig({}))
