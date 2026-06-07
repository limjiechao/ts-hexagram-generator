import { armDelayTicks, firstLandingTick } from './bounce-trajectory.js'

/**
 * Auto-land configuration for the bouncing slider — supplied only by the
 * random-casting playback. `target` is the RNG-predetermined pick; the slider
 * bounces freely until `armDelayMs` has elapsed, then commits on the first
 * tick its cursor naturally sits on `target` (a real pass-through, never a
 * teleport — see `bounce-trajectory.ts`). Interactive callers pass no
 * `autoLand` and the slider commits on SPACE as before.
 */
export interface SliderAutoLand {
  target: number
  armDelayMs: number
}

export interface SliderSnapshot {
  position: number
  tickCount: number
  // The position captured by an auto-land commit, or `null` while the slider
  // is still bouncing (or was committed by SPACE — that path notifies the
  // parent directly). `useSliderBounce` fires `onSubmit` once when this turns
  // non-null so the parent flow advances exactly as a SPACE commit would.
  autoLanded: number | null
}

/**
 * File-local store backing `useSliderBounce`. Owns the bouncing-cursor
 * position/direction/committed state and the `setInterval` that drives the
 * tick loop. Consumers attach via `subscribe`/`getSnapshot` so React's
 * `useSyncExternalStore` can read the live position without the legacy
 * `useReducer((c) => c + 1, 0)` forced-rerender hack. The interval starts
 * lazily on first subscribe and clears when the last subscriber detaches —
 * no leaked timers.
 *
 * `setRange` is invoked from the hook's render phase so a cast-boundary
 * range change rewinds the cursor synchronously, matching the prior
 * zero-frame-lag behaviour.
 */
export class BouncingSliderStore {
  private position: number
  private direction: 1 | -1 = 1
  private committed = false
  private min: number
  private max: number
  private tickMs: number
  private tickCount = 0
  // Random-playback auto-land. `landingTick` is the precomputed tick on which
  // the cursor naturally passes through the RNG target at or after the arm
  // delay (`bounce-trajectory.ts`); `null` disables auto-land (interactive
  // flow). `autoLanded` records the position captured by the auto-land
  // commit so `getSnapshot` can surface it to the hook.
  private autoLand: SliderAutoLand | null
  private landingTick: number | null = null
  private autoLanded: number | null = null
  // Cached so `getSnapshot` returns a referentially-stable reference between
  // ticks — `useSyncExternalStore`'s `Object.is` check relies on this.
  private snapshot: SliderSnapshot
  private readonly listeners = new Set<() => void>()
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(
    min: number,
    max: number,
    tickMs: number,
    autoLand: SliderAutoLand | null,
  ) {
    this.min = min
    this.max = max
    this.tickMs = tickMs
    this.position = min
    this.autoLand = autoLand
    this.snapshot = { position: min, tickCount: 0, autoLanded: null }
    this.recomputeLandingTick()
  }

  // Recompute the landing tick from the current range, tickMs and auto-land
  // config. The slider commits itself on this tick — the visible bounce and
  // the landing are the same triangle wave, so the cursor genuinely passes
  // through the target (no teleport). A landing tick of 0 (degenerate
  // single-cell range with no arm delay) is committed immediately, since the
  // interval's first fire is tick 1 and would otherwise never match.
  private recomputeLandingTick(): void {
    this.landingTick =
      this.autoLand === null
        ? null
        : firstLandingTick(
            this.autoLand.target,
            this.min,
            this.max,
            armDelayTicks(this.autoLand.armDelayMs, this.tickMs),
          )
    if (this.landingTick === 0 && !this.committed) {
      this.committed = true
      this.autoLanded = this.position
      this.snapshot = {
        position: this.position,
        tickCount: this.tickCount,
        autoLanded: this.autoLanded,
      }
    }
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (this.listeners.size === 1) this.startTicking()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.stopTicking()
    }
  }

  readonly getSnapshot = (): SliderSnapshot => this.snapshot

  // Called from the hook's render phase. Mutates synchronously so the same
  // render's `getSnapshot()` reflects any rewind (range change) or interval
  // re-arm (tickMs change) — no `notify()`, which would fire the
  // `useSyncExternalStore` subscriber mid-render and trigger React's
  // "setState while rendering" warning. The triggering render commits with
  // the updated state.
  setRange(
    min: number,
    max: number,
    tickMs: number,
    autoLand: SliderAutoLand | null,
  ): void {
    if (
      this.min === min &&
      this.max === max &&
      this.tickMs === tickMs &&
      this.autoLand === autoLand
    )
      return
    const rangeChanged = this.min !== min || this.max !== max
    this.min = min
    this.max = max
    this.tickMs = tickMs
    this.autoLand = autoLand
    this.recomputeLandingTick()
    // Only rewind on a true range change — a bare tickMs change (per-cast
    // sweep duration recalc) re-arms the interval at the new rate but keeps
    // the cursor where it is so the user doesn't see a visual jump. The
    // spinner's tick counter also resets so each new cast restarts at the
    // first glyph (`⠋`).
    if (rangeChanged) {
      this.position = min
      this.direction = 1
      this.committed = false
      this.tickCount = 0
      this.autoLanded = null
      this.snapshot = { position: min, tickCount: 0, autoLanded: null }
    }
    // Restart the tick timer so the next tick is a full `tickMs` away and
    // picks up the new interval — matches the pre-refactor
    // `useEffect([min, max, …])` behaviour for range changes, and also re-arms
    // the interval at the new rate when only `tickMs` changes.
    if (this.intervalId !== null) {
      this.stopTicking()
      this.startTicking()
    }
  }

  commit(): number {
    this.committed = true
    return this.position
  }

  private startTicking(): void {
    if (this.intervalId !== null) return
    this.intervalId = setInterval(() => {
      if (this.committed) return
      // Geometric reflection at the slider walls — the cursor steps one cell,
      // and if it would pass a wall it reverses and steps one cell back inward.
      // `upperBound` here is the slider's UPPER BOUND (the reachable pick
      // ceiling, already === selectablePickMax(currentMax) — see viewer.tsx),
      // NOT a pick clamp: `upperBound - 1` is "one cell inward from the
      // ceiling", reflection geometry, not the never-zero-remainder − 1.
      const upperBound = this.max
      let next = this.position + this.direction
      if (next > upperBound) {
        this.direction = -1
        next = upperBound - 1
      } else if (next < this.min) {
        this.direction = 1
        next = this.min + 1
      }
      this.position = next
      this.tickCount += 1
      // Auto-land — the random flow commits itself on the precomputed landing
      // tick. The cursor reached `next` by the same bounce maths the
      // trajectory module models, so `next` IS the target here: a genuine
      // pass-through, not a teleport. The interval keeps running but the
      // `this.committed` guard above freezes the cursor.
      if (this.landingTick !== null && this.tickCount === this.landingTick) {
        this.committed = true
        this.autoLanded = next
      }
      this.snapshot = {
        position: next,
        tickCount: this.tickCount,
        autoLanded: this.autoLanded,
      }
      this.notify()
    }, this.tickMs)
  }

  private stopTicking(): void {
    if (this.intervalId === null) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
