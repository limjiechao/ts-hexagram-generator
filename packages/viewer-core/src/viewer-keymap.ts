import type { Key } from 'ink'

// Data-driven keymap for the consultation viewer. Pure module — no React or
// Ink imports beyond the `Key` type — so each binding is unit-testable
// without mounting ink-testing-library. `dispatchKey()` walks `BINDINGS` in
// declaration order and returns true the moment a binding's `when` predicate
// and `match` predicate both hold; first match wins.
//
// The 16 bindings here replace the previous 81-line `if/else` chain inside
// `viewer.tsx`'s `useInput` callback. Global Escape calls `ctx.exit` (the
// soft back key) and Ctrl+C calls `ctx.hardQuit` (the hard quit) — kept
// separate so the casting viewer can route the two keys to different
// destinations. `<` / `>` during a slider-mode cast pan the casting prompt;
// once `done`, the full Tab / digit / arrow / page / Home / End binding set
// applies. Pan is single-cell only (no Shift-modified page pan) — `<` / `>`
// are already shift-modified characters, so there is no second tier to bind.

export type InputMode = 'slider' | 'number'

// The viewer's flow modes. The keymap only ever inspects `state.mode`, so it
// depends on this string union rather than the full `FlowState` interface
// (which lives in `casting-ui`'s `viewer-flow.ts` and would otherwise create
// a circular package dependency). Any state object with a `mode` field of
// this type is structurally accepted.
export type FlowMode = 'awaitingQuery' | 'casting' | 'computing' | 'done'

// Minimal structural slice of the viewer flow state the keymap reads.
export interface FlowStateSlice {
  readonly mode: FlowMode
}

export interface KeyContext {
  readonly state: FlowStateSlice
  readonly inputMode: InputMode
  readonly viewportHeight: number
  // Soft back / exit — bound to Escape. The casting viewer routes this to its
  // injected `onExit` (Home in the composed CLI, quit standalone).
  readonly exit: () => void
  // Hard quit — bound to Ctrl+C. Distinct from `exit` so the casting viewer
  // can route the two keys differently after a discard confirmation: Escape
  // returns to the host, Ctrl+C quits the program outright.
  readonly hardQuit: () => void
  // `delta` is signed cells (1 = one column). The closure passed in by the
  // viewer is responsible for clamping against the prompt's pan ceiling.
  readonly panCastingPromptBy: (delta: number) => void
  readonly stepToTab: (delta: number) => void
  readonly jumpToTab: (index: number) => void
  // `delta` is signed cells. The closure passed in by the viewer clamps
  // against the active tab's content width.
  readonly panActiveBy: (delta: number) => void
  readonly scrollActiveBy: (delta: number) => void
  readonly scrollActiveTo: (offset: number) => void
}

export interface KeyBinding {
  readonly id: string
  readonly when: (state: FlowStateSlice, inputMode: InputMode) => boolean
  readonly match: (input: string, key: Key) => boolean
  readonly run: (ctx: KeyContext, input: string, key: Key) => void
}

export const ALWAYS = (): boolean => true
export const IN_CASTING_SLIDER = (s: FlowStateSlice, im: InputMode): boolean =>
  s.mode === 'casting' && im === 'slider'
export const IN_DONE = (s: FlowStateSlice): boolean => s.mode === 'done'

export const BINDINGS: readonly KeyBinding[] = [
  // ── Global ───────────────────────────────────────────────────────────────
  {
    id: 'exit/escape',
    when: ALWAYS,
    match: (_input, key) => key.escape === true,
    run: (ctx) => {
      ctx.exit()
    },
  },
  {
    id: 'exit/ctrl-c',
    when: ALWAYS,
    match: (input, key) => key.ctrl === true && input === 'c',
    run: (ctx) => {
      ctx.hardQuit()
    },
  },
  // ── Casting (slider mode only) ───────────────────────────────────────────
  {
    id: 'casting/pan-left',
    when: IN_CASTING_SLIDER,
    match: (input) => input === '<',
    run: (ctx) => {
      ctx.panCastingPromptBy(-1)
    },
  },
  {
    id: 'casting/pan-right',
    when: IN_CASTING_SLIDER,
    match: (input) => input === '>',
    run: (ctx) => {
      ctx.panCastingPromptBy(1)
    },
  },
  // ── Done mode ────────────────────────────────────────────────────────────
  {
    id: 'done/tab-prev-shift',
    when: IN_DONE,
    match: (_input, key) => key.tab === true && key.shift === true,
    run: (ctx) => {
      ctx.stepToTab(-1)
    },
  },
  {
    id: 'done/tab-next',
    when: IN_DONE,
    match: (input, key) =>
      (key.tab === true && key.shift !== true) || input === ']',
    run: (ctx) => {
      ctx.stepToTab(1)
    },
  },
  {
    id: 'done/tab-prev-bracket',
    when: IN_DONE,
    match: (input) => input === '[',
    run: (ctx) => {
      ctx.stepToTab(-1)
    },
  },
  {
    id: 'done/jump-digit',
    when: IN_DONE,
    match: (input) => input.length === 1 && input >= '1' && input <= '9',
    run: (ctx, input) => {
      ctx.jumpToTab(Number.parseInt(input, 10) - 1)
    },
  },
  {
    id: 'done/pan-left',
    when: IN_DONE,
    match: (input) => input === '<',
    run: (ctx) => {
      ctx.panActiveBy(-1)
    },
  },
  {
    id: 'done/pan-right',
    when: IN_DONE,
    match: (input) => input === '>',
    run: (ctx) => {
      ctx.panActiveBy(1)
    },
  },
  {
    id: 'done/scroll-up',
    when: IN_DONE,
    match: (_input, key) => key.upArrow === true,
    run: (ctx) => {
      ctx.scrollActiveBy(-1)
    },
  },
  {
    id: 'done/scroll-down',
    when: IN_DONE,
    match: (_input, key) => key.downArrow === true,
    run: (ctx) => {
      ctx.scrollActiveBy(1)
    },
  },
  {
    id: 'done/page-up',
    when: IN_DONE,
    match: (_input, key) => key.pageUp === true,
    run: (ctx) => {
      ctx.scrollActiveBy(-(ctx.viewportHeight - 1))
    },
  },
  {
    id: 'done/page-down',
    when: IN_DONE,
    match: (_input, key) => key.pageDown === true,
    run: (ctx) => {
      ctx.scrollActiveBy(ctx.viewportHeight - 1)
    },
  },
  {
    id: 'done/home',
    when: IN_DONE,
    match: (input, key) => key.home === true || input === 'g',
    run: (ctx) => {
      ctx.scrollActiveTo(0)
    },
  },
  {
    id: 'done/end',
    when: IN_DONE,
    match: (input, key) => key.end === true || input === 'G',
    run: (ctx) => {
      // `scrollActiveTo` clamps against the active tab's `maxOffset` (see
      // its closure in `viewer.tsx`), so +Infinity safely lands on the
      // last row.
      ctx.scrollActiveTo(Number.POSITIVE_INFINITY)
    },
  },
]

export function dispatchKey(input: string, key: Key, ctx: KeyContext): boolean {
  for (const binding of BINDINGS) {
    if (!binding.when(ctx.state, ctx.inputMode)) continue
    if (!binding.match(input, key)) continue
    binding.run(ctx, input, key)
    return true
  }
  return false
}
