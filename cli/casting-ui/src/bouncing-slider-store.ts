// pattern: Imperative Shell
// The triangle-wave decision (where the cursor sits each tick) is the
// Functional Core and lives in `bounce-trajectory.ts` (`positionAtTick`). This
// file owns only the genuinely-effectful shell a `useSyncExternalStore` backing
// store needs — the `setInterval`, the subscriber set, the cached snapshot and
// the commit/landing flags — and DERIVES the cursor by consulting the core. It
// keeps no copy of the reflection maths (S8: one wave, one home).
import {
  armDelayTicks,
  firstLandingTick,
  positionAtTick,
} from './bounce-trajectory.js'

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
 * File-local store backing `useSliderBounce`. Owns the tick counter, the
 * committed/auto-land flags and the `setInterval` that drives the tick loop;
 * the cursor position itself is DERIVED each tick from `positionAtTick`, not
 * stored. Consumers attach via `subscribe`/`getSnapshot` so React's
 * `useSyncExternalStore` can read the live position without the legacy
 * `useReducer((c) => c + 1, 0)` forced-rerender hack. The interval starts
 * lazily on first subscribe and clears when the last subscriber detaches —
 * no leaked timers.
 *
 * Bounds are CALLER-OWNED. The store bounces over whatever `[min, max]` it is
 * given and holds no divination knowledge: `max` arrives already clamped to the
 * selectable pick ceiling (`selectablePickMax`, threaded by `viewer.tsx`), and
 * the authoritative backstop against an illegal pick is `performCast`'s
 * `assertSelectablePick` (ADR-0006; the S4 layered-defence model). A store-level
 * clamp would be redundant and would invert the layering — this is a generic UI
 * primitive, not a casting-rule enforcer (finding S9).
 *
 * `setRange` is invoked from the hook's render phase so a cast-boundary
 * range change rewinds the cursor synchronously, matching the prior
 * zero-frame-lag behaviour.
 */
export class BouncingSliderStore {
  // No mutable `position`/`direction`: the cursor is a pure function of the
  // tick count and range (`currentPosition()` → `positionAtTick`). Only the
  // tick counter advances; the wave is derived, never stepped imperatively.
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
    this.autoLand = autoLand
    this.snapshot = {
      position: this.currentPosition(),
      tickCount: 0,
      autoLanded: null,
    }
    this.recomputeLandingTick()
  }

  // The cursor position for the current tick — the Functional Core. `tickCount`
  // is the only state that advances; the wave (and its wall reflections) is
  // computed in closed form by `positionAtTick`, so this store never holds a
  // second, mutable copy of that maths.
  private currentPosition(): number {
    return positionAtTick(this.tickCount, this.min, this.max)
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
      this.autoLanded = this.currentPosition()
      this.snapshot = {
        position: this.currentPosition(),
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
      this.committed = false
      this.tickCount = 0
      this.autoLanded = null
      this.snapshot = {
        position: this.currentPosition(),
        tickCount: 0,
        autoLanded: null,
      }
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
    return this.currentPosition()
  }

  private startTicking(): void {
    if (this.intervalId !== null) return
    this.intervalId = setInterval(() => {
      if (this.committed) return
      // Advance the tick counter and let the Functional Core place the cursor.
      // The triangle wave (including the wall reflections to `max - 1` / `min +
      // 1`) is computed in closed form by `positionAtTick`; this shell no
      // longer steps the cursor by hand, so the visible motion and the
      // auto-land search read the SAME wave from one source.
      this.tickCount += 1
      const next = this.currentPosition()
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
