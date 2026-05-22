import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Ink emits ANSI styling (bold/inverse/dimColor) only when colour support
    // is detected. Under `turbo run test` vitest's stdout is piped, so vitest
    // does not enable colour in its workers and Ink renders plain text — which
    // breaks the consultation-readout tests that assert on `inverse`/`dimColor`
    // output. Force colour on so rendered frames are deterministic regardless
    // of how the suite is invoked (direct TTY run vs. piped under Turbo).
    env: { FORCE_COLOR: '1' },
  },
})
