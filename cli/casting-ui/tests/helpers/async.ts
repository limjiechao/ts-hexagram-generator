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
