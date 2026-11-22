import { defineConfig } from 'vitest/config'

// R-101 sets the test timeout.
export default defineConfig({ test: { testTimeout: 1000 } })
