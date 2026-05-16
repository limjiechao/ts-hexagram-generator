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
