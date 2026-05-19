import { emptyPartialCastingRecord } from '@hexagram/types'
import type { Key } from 'ink'
import { describe, expect, it, vi } from 'vitest'

import type { FlowState } from '../src/viewer-flow'
import {
  ALWAYS,
  BINDINGS,
  dispatchKey,
  IN_CASTING_SLIDER,
  IN_DONE,
  type InputMode,
  type KeyContext,
} from '../src/viewer-keymap'

// Pure unit tests for the data-driven viewer keymap. No ink-testing-library
// here — every binding is exercised against a stub `KeyContext` whose
// callbacks are `vi.fn()` spies. Behavioural parity with the previous
// inline `useInput` chain is asserted in `viewer.test.tsx`; this file
// pins the table itself (binding count, ids, dispatch order, predicates).

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeState(
  overrides: Partial<FlowState> & { mode: FlowState['mode'] },
): FlowState {
  return {
    flowKind: 'interactive',
    query: '',
    queryBuffer: '',
    castingBuffer: '',
    error: null,
    lineIndex: 0,
    castIndex: 0,
    partialCasting: emptyPartialCastingRecord(),
    completedLines: [],
    sections: null,
    savedPath: null,
    saveError: null,
    ...overrides,
  }
}

function makeContext(
  state: FlowState,
  inputMode: InputMode = 'slider',
  viewportHeight = 20,
): KeyContext & {
  spies: {
    exit: ReturnType<typeof vi.fn>
    panCastingPromptBy: ReturnType<typeof vi.fn>
    panCastingPromptByPage: ReturnType<typeof vi.fn>
    stepToTab: ReturnType<typeof vi.fn>
    jumpToTab: ReturnType<typeof vi.fn>
    panActiveBy: ReturnType<typeof vi.fn>
    panActiveByPage: ReturnType<typeof vi.fn>
    scrollActiveBy: ReturnType<typeof vi.fn>
    scrollActiveTo: ReturnType<typeof vi.fn>
  }
} {
  const spies = {
    exit: vi.fn(),
    panCastingPromptBy: vi.fn(),
    panCastingPromptByPage: vi.fn(),
    stepToTab: vi.fn(),
    jumpToTab: vi.fn(),
    panActiveBy: vi.fn(),
    panActiveByPage: vi.fn(),
    scrollActiveBy: vi.fn(),
    scrollActiveTo: vi.fn(),
  }
  return {
    state,
    inputMode,
    viewportHeight,
    exit: spies.exit,
    panCastingPromptBy: spies.panCastingPromptBy,
    panCastingPromptByPage: spies.panCastingPromptByPage,
    stepToTab: spies.stepToTab,
    jumpToTab: spies.jumpToTab,
    panActiveBy: spies.panActiveBy,
    panActiveByPage: spies.panActiveByPage,
    scrollActiveBy: spies.scrollActiveBy,
    scrollActiveTo: spies.scrollActiveTo,
    spies,
  }
}

// Synthesise an Ink `Key` object from a small set of true flags. Every
// other field defaults to false so individual bindings can be targeted
// surgically.
function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    home: false,
    end: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    super: false,
    hyper: false,
    capsLock: false,
    numLock: false,
    ...overrides,
  }
}

// Each spy in `spies` is `vi.fn()`. Returns the names of those that fired,
// for "no other callback was called" assertions.
function calledNames(
  spies: Record<string, ReturnType<typeof vi.fn>>,
): string[] {
  return Object.entries(spies)
    .filter(([, fn]) => fn.mock.calls.length > 0)
    .map(([name]) => name)
}

// ── Predicate sanity ─────────────────────────────────────────────────────────

describe('keymap predicates', () => {
  it('ALWAYS is true for any state / inputMode', () => {
    expect(ALWAYS()).toBe(true)
  })

  it('IN_CASTING_SLIDER requires both casting mode and slider inputMode', () => {
    const casting = makeState({ mode: 'casting' })
    const done = makeState({ mode: 'done' })
    expect(IN_CASTING_SLIDER(casting, 'slider')).toBe(true)
    expect(IN_CASTING_SLIDER(casting, 'number')).toBe(false)
    expect(IN_CASTING_SLIDER(done, 'slider')).toBe(false)
  })

  it('IN_DONE only matches done mode', () => {
    expect(IN_DONE(makeState({ mode: 'done' }))).toBe(true)
    expect(IN_DONE(makeState({ mode: 'casting' }))).toBe(false)
    expect(IN_DONE(makeState({ mode: 'awaitingQuery' }))).toBe(false)
    expect(IN_DONE(makeState({ mode: 'computing' }))).toBe(false)
  })
})

// ── Table shape ──────────────────────────────────────────────────────────────

describe('BINDINGS table', () => {
  it('has 16 entries in the documented order', () => {
    expect(BINDINGS).toHaveLength(16)
    expect(BINDINGS.map((b) => b.id)).toEqual([
      'exit/escape',
      'exit/ctrl-c',
      'casting/pan-left',
      'casting/pan-right',
      'done/tab-prev-shift',
      'done/tab-next',
      'done/tab-prev-bracket',
      'done/jump-digit',
      'done/pan-left',
      'done/pan-right',
      'done/scroll-up',
      'done/scroll-down',
      'done/page-up',
      'done/page-down',
      'done/home',
      'done/end',
    ])
  })

  it('every id is unique', () => {
    const ids = BINDINGS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ── Global bindings (when=ALWAYS) ────────────────────────────────────────────

describe('global bindings', () => {
  it('exit/escape — Escape exits regardless of mode', () => {
    const ctx = makeContext(makeState({ mode: 'awaitingQuery' }))
    expect(dispatchKey('', makeKey({ escape: true }), ctx)).toBe(true)
    expect(ctx.spies.exit).toHaveBeenCalledTimes(1)
    expect(calledNames(ctx.spies)).toEqual(['exit'])
  })

  it('exit/ctrl-c — Ctrl+C exits regardless of mode', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }))
    expect(dispatchKey('c', makeKey({ ctrl: true }), ctx)).toBe(true)
    expect(ctx.spies.exit).toHaveBeenCalledTimes(1)
    expect(calledNames(ctx.spies)).toEqual(['exit'])
  })

  it('Ctrl+x (not c) does NOT trigger exit', () => {
    const ctx = makeContext(makeState({ mode: 'done' }))
    expect(dispatchKey('x', makeKey({ ctrl: true }), ctx)).toBe(false)
    expect(ctx.spies.exit).not.toHaveBeenCalled()
  })
})

// ── Casting bindings (slider mode only) ──────────────────────────────────────

describe('casting bindings', () => {
  it('casting/pan-left — ←  pans the casting prompt by -1', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    expect(dispatchKey('', makeKey({ leftArrow: true }), ctx)).toBe(true)
    expect(ctx.spies.panCastingPromptBy).toHaveBeenCalledWith(-1)
    expect(ctx.spies.panCastingPromptByPage).not.toHaveBeenCalled()
  })

  it('casting/pan-right — →  pans the casting prompt by +1', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    expect(dispatchKey('', makeKey({ rightArrow: true }), ctx)).toBe(true)
    expect(ctx.spies.panCastingPromptBy).toHaveBeenCalledWith(1)
    expect(ctx.spies.panCastingPromptByPage).not.toHaveBeenCalled()
  })

  it('Shift+← pans the casting prompt by one page (-1)', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    expect(
      dispatchKey('', makeKey({ leftArrow: true, shift: true }), ctx),
    ).toBe(true)
    expect(ctx.spies.panCastingPromptByPage).toHaveBeenCalledWith(-1)
    expect(ctx.spies.panCastingPromptBy).not.toHaveBeenCalled()
  })

  it('Shift+→ pans the casting prompt by one page (+1)', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    expect(
      dispatchKey('', makeKey({ rightArrow: true, shift: true }), ctx),
    ).toBe(true)
    expect(ctx.spies.panCastingPromptByPage).toHaveBeenCalledWith(1)
  })

  it('does NOT pan in number-input mode (slider-only feature)', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'number')
    expect(dispatchKey('', makeKey({ leftArrow: true }), ctx)).toBe(false)
    expect(ctx.spies.panCastingPromptBy).not.toHaveBeenCalled()
  })
})

// ── Done-mode bindings ───────────────────────────────────────────────────────

describe('done-mode tab navigation', () => {
  const done = (): FlowState => makeState({ mode: 'done' })

  it('done/tab-prev-shift — Shift+Tab steps to previous tab', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ tab: true, shift: true }), ctx)).toBe(true)
    expect(ctx.spies.stepToTab).toHaveBeenCalledWith(-1)
  })

  it('done/tab-next — Tab steps to next tab', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ tab: true }), ctx)).toBe(true)
    expect(ctx.spies.stepToTab).toHaveBeenCalledWith(1)
  })

  it("done/tab-next — ']' steps to next tab", () => {
    const ctx = makeContext(done())
    expect(dispatchKey(']', makeKey(), ctx)).toBe(true)
    expect(ctx.spies.stepToTab).toHaveBeenCalledWith(1)
  })

  it("done/tab-prev-bracket — '[' steps to previous tab", () => {
    const ctx = makeContext(done())
    expect(dispatchKey('[', makeKey(), ctx)).toBe(true)
    expect(ctx.spies.stepToTab).toHaveBeenCalledWith(-1)
  })

  it("done/jump-digit — '1' jumps to tab index 0", () => {
    const ctx = makeContext(done())
    expect(dispatchKey('1', makeKey(), ctx)).toBe(true)
    expect(ctx.spies.jumpToTab).toHaveBeenCalledWith(0)
  })

  it("done/jump-digit — '4' jumps to tab index 3", () => {
    const ctx = makeContext(done())
    expect(dispatchKey('4', makeKey(), ctx)).toBe(true)
    expect(ctx.spies.jumpToTab).toHaveBeenCalledWith(3)
  })

  it("done/jump-digit — '0' is NOT a jump (range starts at '1')", () => {
    const ctx = makeContext(done())
    expect(dispatchKey('0', makeKey(), ctx)).toBe(false)
    expect(ctx.spies.jumpToTab).not.toHaveBeenCalled()
  })
})

describe('done-mode pan / scroll', () => {
  const done = (): FlowState => makeState({ mode: 'done' })

  it('done/pan-left — ← pans active tab by -1', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ leftArrow: true }), ctx)).toBe(true)
    expect(ctx.spies.panActiveBy).toHaveBeenCalledWith(-1)
    expect(ctx.spies.panActiveByPage).not.toHaveBeenCalled()
  })

  it('done/pan-right — → pans active tab by +1', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ rightArrow: true }), ctx)).toBe(true)
    expect(ctx.spies.panActiveBy).toHaveBeenCalledWith(1)
  })

  it('Shift+← in done pans active tab by one page', () => {
    const ctx = makeContext(done())
    expect(
      dispatchKey('', makeKey({ leftArrow: true, shift: true }), ctx),
    ).toBe(true)
    expect(ctx.spies.panActiveByPage).toHaveBeenCalledWith(-1)
    expect(ctx.spies.panActiveBy).not.toHaveBeenCalled()
  })

  it('done/scroll-up — ↑ scrolls -1 row', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ upArrow: true }), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveBy).toHaveBeenCalledWith(-1)
  })

  it('done/scroll-down — ↓ scrolls +1 row', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ downArrow: true }), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveBy).toHaveBeenCalledWith(1)
  })

  it('done/page-up — PgUp scrolls -(viewportHeight - 1)', () => {
    const ctx = makeContext(done(), 'slider', 25)
    expect(dispatchKey('', makeKey({ pageUp: true }), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveBy).toHaveBeenCalledWith(-24)
  })

  it('done/page-down — PgDn scrolls +(viewportHeight - 1)', () => {
    const ctx = makeContext(done(), 'slider', 25)
    expect(dispatchKey('', makeKey({ pageDown: true }), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveBy).toHaveBeenCalledWith(24)
  })

  it('done/home — Home jumps to offset 0', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ home: true }), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveTo).toHaveBeenCalledWith(0)
  })

  it("done/home — 'g' jumps to offset 0", () => {
    const ctx = makeContext(done())
    expect(dispatchKey('g', makeKey(), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveTo).toHaveBeenCalledWith(0)
  })

  it('done/end — End scrolls to +Infinity (clamped to maxOffset by closure)', () => {
    const ctx = makeContext(done())
    expect(dispatchKey('', makeKey({ end: true }), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveTo).toHaveBeenCalledWith(
      Number.POSITIVE_INFINITY,
    )
  })

  it("done/end — 'G' scrolls to +Infinity", () => {
    const ctx = makeContext(done())
    expect(dispatchKey('G', makeKey(), ctx)).toBe(true)
    expect(ctx.spies.scrollActiveTo).toHaveBeenCalledWith(
      Number.POSITIVE_INFINITY,
    )
  })
})

// ── Negative coverage ────────────────────────────────────────────────────────

describe('dispatchKey negatives', () => {
  it("a bare 'c' (no ctrl) in done-mode does NOT exit / pan / tab / scroll", () => {
    const ctx = makeContext(makeState({ mode: 'done' }))
    // 'c' is a digit-jump candidate but fails the '1'..'9' range; no other
    // binding has a single-character 'c' match.
    expect(dispatchKey('c', makeKey(), ctx)).toBe(false)
    expect(calledNames(ctx.spies)).toEqual([])
  })

  it('← in awaitingQuery is unhandled (neither casting-slider nor done)', () => {
    const ctx = makeContext(makeState({ mode: 'awaitingQuery' }))
    expect(dispatchKey('', makeKey({ leftArrow: true }), ctx)).toBe(false)
    expect(calledNames(ctx.spies)).toEqual([])
  })

  it('SPACE in casting is not in the viewer keymap (owned by CastingPromptBox)', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    expect(dispatchKey(' ', makeKey(), ctx)).toBe(false)
    expect(calledNames(ctx.spies)).toEqual([])
  })

  it('Tab in casting-mode is ignored (tabs are locked until done)', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    expect(dispatchKey('', makeKey({ tab: true }), ctx)).toBe(false)
    expect(ctx.spies.stepToTab).not.toHaveBeenCalled()
  })

  it('digit jump is ignored outside done-mode', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    expect(dispatchKey('2', makeKey(), ctx)).toBe(false)
    expect(ctx.spies.jumpToTab).not.toHaveBeenCalled()
  })
})

// ── Dispatch order ───────────────────────────────────────────────────────────

describe('dispatch order', () => {
  it('Shift+Tab matches done/tab-prev-shift before done/tab-next', () => {
    const ctx = makeContext(makeState({ mode: 'done' }))
    dispatchKey('', makeKey({ tab: true, shift: true }), ctx)
    expect(ctx.spies.stepToTab).toHaveBeenCalledWith(-1)
    expect(ctx.spies.stepToTab).toHaveBeenCalledTimes(1)
  })

  it('Escape always wins over any modal binding (e.g. casting flow)', () => {
    const ctx = makeContext(makeState({ mode: 'casting' }), 'slider')
    // Escape + leftArrow both set — Escape's binding is first in the table.
    dispatchKey('', makeKey({ escape: true, leftArrow: true }), ctx)
    expect(ctx.spies.exit).toHaveBeenCalledTimes(1)
    expect(ctx.spies.panCastingPromptBy).not.toHaveBeenCalled()
  })
})
