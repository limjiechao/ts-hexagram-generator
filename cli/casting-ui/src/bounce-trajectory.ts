// Pure bounce-trajectory maths for the casting slider — no React, no Ink, no
// timers. The interactive slider's triangle wave used to live imperatively
// inside `BouncingSliderStore.startTicking()`; this module extracts it as a
// deterministic function of the tick count so the random-casting playback can
// auto-land on the RNG-predetermined pick without teleporting. The store
// consults `firstLandingTick` once and stops on exactly that tick, so the
// visible motion and the landing are the SAME wave.
//
// The reference imperative loop (kept bit-for-bit faithful here). The `max - 1`
// / `min + 1` are geometric reflection at the slider walls — "one cell inward
// after bouncing off the wall" — NOT a pick clamp; `max` is the reachable
// cursor ceiling (already === selectablePickMax(currentMax)), not a heap size:
//   start `position = min`, `direction = +1`
//   each tick: `next = position + direction`
//     if `next > max` → `direction = -1`, `next = max - 1`
//     if `next < min` → `direction = +1`, `next = min + 1`
//
// Tick 0 is the pre-tick state (`position === min`); tick N is the position
// after N applications of the loop body.

/**
 * The cursor position after `tick` advances of the bouncing slider over the
 * inclusive range `[min, max]`. Pure and deterministic — tick 0 is `min`.
 *
 * Implemented as a closed-form triangle wave rather than an N-step loop so a
 * landing search over a long horizon stays cheap. For a range of `span =
 * max - min` cells the cursor has a period of `2 * span` ticks; within a
 * period it sweeps up for `span` ticks then back down. The degenerate
 * `max === min` range (`span === 0`) pins the cursor at `min` forever.
 */
export function positionAtTick(tick: number, min: number, max: number): number {
  const span = max - min
  if (span <= 0) return min
  const period = span * 2
  const phase = ((tick % period) + period) % period
  // Up-sweep for the first `span` ticks, then mirror back down.
  const offset = phase <= span ? phase : period - phase
  return min + offset
}

/**
 * Convert an arm delay expressed in milliseconds into a whole number of
 * slider ticks, given the per-cast `tickMs`. Rounded to the nearest tick and
 * never negative — the arm delay is the ceremonial "let it bounce" window
 * before the slider is allowed to land.
 */
export function armDelayTicks(armDelayMs: number, tickMs: number): number {
  return Math.max(0, Math.round(armDelayMs / tickMs))
}

/**
 * The first tick `>= armDelayTicks` at which the bouncing cursor naturally
 * sits on `target`. The slider auto-lands on exactly this tick — because the
 * cursor genuinely passes through `target` there, the landing is the wave
 * itself, never a teleport.
 *
 * `target` is assumed reachable within `[min, max]` (the RNG pick always is).
 * For the degenerate `max === min` range the only reachable value is `min`,
 * so the landing is the arm-delay tick itself. The search is bounded by one
 * full period past the arm delay — a landing always exists within that
 * window because the cursor visits every cell each period.
 */
export function firstLandingTick(
  target: number,
  min: number,
  max: number,
  armDelayTicksCount: number,
): number {
  const span = max - min
  if (span <= 0) return armDelayTicksCount
  const period = span * 2
  for (
    let tick = armDelayTicksCount;
    tick <= armDelayTicksCount + period;
    tick += 1
  ) {
    if (positionAtTick(tick, min, max) === target) return tick
  }
  // Unreachable for an in-range target — every cell is visited each period.
  return armDelayTicksCount
}
