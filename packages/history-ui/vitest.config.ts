import { defineConfig } from 'vitest/config'

// History-ui tests poll the rendered frame after `stdin.write(ENTER)` to
// gate on the consultation readout appearing. On Ubuntu GHA the runner is
// under load — the slow `@hexagram/core` rng-distribution test (~30 s
// synchronous) saturates a CPU thread, and the load operation
// (`fs.readFile` → re-render body → byte-compare → paint) can drift past
// the 5 s vitest default `testTimeout`. The local `waitFor` helper polls
// up to 8 s; this `testTimeout` sits comfortably above that so a real
// hang still surfaces as a useful diagnostic.
export default defineConfig({
  test: {
    testTimeout: 15_000,
  },
})
