/**
 * Workspace-wide test helpers — drop-in replacements for the per-package
 * `helpers/async.ts` files that had grown copy-pasted across casting-ui,
 * history-ui, and shell during the May 2026 9-round CI stabilisation.
 *
 * Use these instead of `await tick()` after `stdin.write(...)` or any other
 * unbounded async work. See the cross-platform-tests skill (Lesson A,
 * "Attack the class, not the instance") and the ink-useinput-bind skill for
 * background.
 */

/**
 * Yield to the event loop so the test runner can flush queued microtasks
 * and one macrotask. Use ONLY for legitimate one-macrotask yields between
 * two `stdin.write(...)` calls with no assertion between them. If the next
 * step is an assertion on `lastFrame()` / mock state, use `waitFor()`
 * instead — `yieldMacrotask` after `stdin.write` and before `expect` is the
 * signal-#1 anti-pattern from the cross-platform-tests skill.
 *
 * Default: 50 ms. Matches the previous `tick()` helper's default so
 * mechanical migrations preserve behaviour during a stepwise rewrite.
 */
export const yieldMacrotask = (ms = 50): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

interface WaitForOptions {
  /** Default 4 s — adjust per package to match its observed worst case. */
  timeoutMs?: number
  /** Polling interval. Default 20 ms. */
  intervalMs?: number
}

/**
 * Poll `predicate` until it returns (or stops throwing). Retries every
 * `intervalMs` ms up to `timeoutMs` ms; rethrows the last error if the
 * deadline expires. The recommended replacement for the
 * `stdin.write(...) → tick() → expect(lastFrame())` race-prone pattern: pass
 * the assertion itself as the predicate.
 *
 *   await waitFor(() => expect(lastFrame()).toContain('READY'))
 *
 * `waitFor` is correct under arbitrary CI load — the test passes the moment
 * the assertion succeeds, regardless of how long that takes within the
 * budget.
 */
export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  { timeoutMs = 4000, intervalMs = 20 }: WaitForOptions = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  for (;;) {
    try {
      return await predicate()
    } catch (error) {
      lastError = error
    }
    if (Date.now() >= deadline) {
      throw lastError ?? new Error(`waitFor timed out after ${timeoutMs}ms`)
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

interface MockLike {
  mock: { calls: ReadonlyArray<unknown> }
}

/**
 * Wait for an `onReady` spy to have been called at least once. Thin wrapper
 * around `waitFor` keyed to the witness-signal pattern used across the Ink
 * components (`SliderInput`, `CastingPromptBox`, `HistoryList`,
 * `CastingStatus`).
 *
 *   const onReady = vi.fn()
 *   render(<HistoryList onReady={onReady} … />)
 *   await waitForReady(onReady)
 *   stdin.write(ENTER)        // guaranteed to land
 */
export async function waitForReady(
  spy: MockLike,
  options?: WaitForOptions,
): Promise<void> {
  await waitFor(() => {
    if (spy.mock.calls.length === 0) {
      throw new Error('onReady has not been called yet')
    }
  }, options)
}

interface PressUntilOptions {
  /** Max retries before giving up. Default 10. */
  maxAttempts?: number
  /** Delay between retries. Default 20 ms. */
  intervalMs?: number
}

interface StdinLike {
  write: (data: string) => boolean
}

/**
 * Fallback for components that cannot expose an `onReady` callback (third-
 * party renders, opaque hosts). Writes `key` to stdin and re-writes on each
 * tick until `predicate(frame)` returns truthy, capped at `maxAttempts`
 * retries.
 *
 * SAFETY: only use for keys that are idempotent past their target
 * transition — e.g. ENTER on a row that becomes loading-locked, Ctrl+D on a
 * row when a confirm modal is open, or `/` to open a filter that ignores
 * its own opening key. Repeating a non-idempotent key (a typed character,
 * an unguarded toggle) can over-fire and break the test.
 *
 * Prefer `waitForReady(onReadySpy)` whenever the component exposes one.
 */
export async function pressUntil(
  stdin: StdinLike,
  lastFrame: () => string | undefined,
  key: string,
  predicate: (frame: string) => boolean,
  { maxAttempts = 10, intervalMs = 20 }: PressUntilOptions = {},
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    stdin.write(key)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    if (predicate(lastFrame() ?? '')) return
  }
  throw new Error(
    `pressUntil: predicate stayed false after ${maxAttempts} retries`,
  )
}

/**
 * Pump the slider's render cycle by `count` ticks. Equivalent to
 * `for (let i = 0; i < count; i++) await yieldMacrotask(tickMs)`. Use for
 * tests that deliberately drive the bouncing-slider animation through
 * known states — NOT as a wait between `stdin.write` and an assertion.
 *
 * The slider's actual tick interval is derived from `sliderSweepMs` per
 * cast; tests typically pass `tickMs: 50` to keep the loop fast.
 */
export async function pumpSliderTick(
  count: number,
  tickMs = 50,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, tickMs))
  }
}
