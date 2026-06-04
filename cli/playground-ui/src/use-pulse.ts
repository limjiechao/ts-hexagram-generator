// `usePulse(intervalMs)` — a tiny isolated timer hook that returns a boolean
// flipping each `intervalMs`. The Playground passes the result to
// `<LineCard>` so the moving lines render bright on `true` and dim on
// `false`, matching the home banner's cadence. Keeping the timer out of the
// reducer means the cards re-render on the pulse beat but the state machine
// stays still — every typed digit / arrow / SPACE remains a pure state
// transition with no spurious timer-driven re-runs.

import { useEffect, useState } from 'react'

/**
 * Toggle a boolean every `intervalMs` milliseconds. Returns the current
 * value; the caller flows it down as a prop to whichever cells should
 * pulse. The timer is cleared on unmount, so leaving the screen leaks
 * nothing.
 *
 * `intervalMs <= 0` disables the timer entirely (returns a frozen `false`),
 * which the playground integration tests rely on to keep frames deterministic.
 */
export function usePulse(intervalMs: number): boolean {
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    if (intervalMs <= 0) return
    const id = setInterval(() => {
      setPulse((value) => !value)
    }, intervalMs)
    return () => {
      clearInterval(id)
    }
  }, [intervalMs])
  return pulse
}
