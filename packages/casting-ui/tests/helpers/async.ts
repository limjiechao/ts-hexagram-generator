import { expect } from 'vitest'

/**
 * Let Ink's stdin → React → render pipeline settle after a simulated
 * keystroke or a forced rerender. The 50 ms default is empirically the
 * minimum that survives a slow CI runner; faster defaults occasionally
 * dropped assertions on shared GitHub runners.
 *
 * Use `await tick()` between `stdin.write(...)` and `lastFrame()` /
 * `expect(...)`. Bump the argument explicitly only when waiting on a known
 * async boundary (e.g. the consultation file-output mock at the end of the
 * flow).
 */
export const tick = (ms = 50): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Poll `predicate()` until it returns truthy (or `undefined`, treated as
 * truthy when the predicate is purely an assertion) or `timeoutMs` elapses.
 * Catches and retries on thrown errors, so an `expect(...)` assertion can be
 * dropped in directly — the assertion *is* the condition. On the final retry
 * the cached error is re-thrown, giving a useful failure message instead of
 * a bare timeout. Use in place of a blind `await tick()` when the next
 * frame / callback is gated by an async boundary that can outrun `tick`'s
 * fixed delay on slow CI runners (Windows GHA especially). See the
 * `cross-platform-tests` skill for the canonical pattern.
 */
export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  {
    timeoutMs = 4000,
    intervalMs = 20,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  for (;;) {
    try {
      const value = await predicate()
      if (value !== false) return value
    } catch (error) {
      lastError = error
    }
    if (Date.now() >= deadline) {
      throw lastError ?? new Error(`waitFor timed out after ${timeoutMs}ms`)
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

// Braille spinner glyphs cycled by the slider's `setInterval` (see
// `BRAILLE_SPINNER` in `casting-prompt-box.tsx`). The initial render shows
// `⠋` (tickCount=0) from React state alone — useEffect has NOT yet fired at
// that point, so useInput is not bound, and a SPACE press would be dropped.
// We poll for any of the *advanced* glyphs (⠙ onward), which can only appear
// after the `setInterval` from the same useEffect that binds useInput has
// fired at least once. That is direct proof of input-handler readiness.
const BRAILLE_GLYPHS_ADVANCED = '⠙⠹⠸⠼⠴⠦⠧⠇⠏'
const SLIDER_READY_RE = new RegExp(
  `Left Heap:${String.raw`\s+[${BRAILLE_GLYPHS_ADVANCED}]`}`,
  'u',
)

/**
 * Block until the slider's `setInterval` has visibly advanced the spinner
 * past its initial `⠋` glyph in the `Left Heap:` readout. The interval is
 * installed by the slider's mount-effect — the same effect that binds
 * `useInput` to stdin — so an advanced glyph is positive proof that the
 * input handler is wired up. Use this BEFORE every `stdin.write(SPACE)` that
 * crosses a cast boundary; without it, the SPACE can race the listener-less
 * unmount/remount window on Windows GHA and silently vanish.
 */
export async function waitForSliderReady(
  lastFrame: () => string | undefined,
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<void> {
  await waitFor(
    () => {
      expect(lastFrame() ?? '').toMatch(SLIDER_READY_RE)
    },
    { timeoutMs },
  )
}
