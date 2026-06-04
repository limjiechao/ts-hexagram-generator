/**
 * Recover the slider cursor's 1-based position from a rendered ink frame by
 * locating the `█` cell inside the bar borders `▕…▏`. Returns null if the
 * frame contains no bar or no cursor (e.g. when the slider is unmounted).
 *
 * All slider tests render with `min={1}`, so position = cursorIndex + 1. If a
 * future test needs a different min, accept it as a second parameter.
 */
export function pickFromFrame(frame: string): number | null {
  for (const line of frame.split('\n')) {
    const start = line.indexOf('▕')
    const end = line.indexOf('▏')
    if (start === -1 || end === -1) continue
    const idx = line.slice(start + 1, end).indexOf('█')
    return idx === -1 ? null : idx + 1
  }
  return null
}
