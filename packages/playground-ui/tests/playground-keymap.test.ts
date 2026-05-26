// Pure unit tests for the Playground's data-driven keymap. Each
// binding is exercised directly by walking `dispatchPlaygroundKey` with a
// synthetic `Key`-shaped object — no Ink, no React.

import type { Key } from 'ink'
import { describe, expect, it, vi } from 'vitest'

import {
  dispatchPlaygroundKey,
  type PlaygroundKeyContext,
  type PlaygroundStateSlice,
} from '../src/playground-keymap'
import type { PlaygroundAction } from '../src/playground-state'

function emptyKey(): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    home: false,
    end: false,
    super: false,
    hyper: false,
    capsLock: false,
    numLock: false,
  }
}

interface DispatchedAction {
  readonly action: PlaygroundAction
}

interface Probe {
  readonly dispatched: DispatchedAction[]
  readonly exitFired: () => boolean
  readonly panDeltas: number[]
  readonly scrollDeltas: number[]
  readonly scrollTargets: number[]
  readonly ctx: PlaygroundKeyContext
}

function buildContext(state: Partial<PlaygroundStateSlice> = {}): Probe {
  const dispatched: DispatchedAction[] = []
  const exit = vi.fn()
  const panDeltas: number[] = []
  const scrollDeltas: number[] = []
  const scrollTargets: number[] = []
  const ctx: PlaygroundKeyContext = {
    state: {
      mode: state.mode ?? 'idle',
      typingRun: state.typingRun ?? null,
    },
    dispatch: (action) => {
      dispatched.push({ action })
    },
    exit,
    panTopBy: (delta) => {
      panDeltas.push(delta)
    },
    scrollReadingsBy: (delta) => {
      scrollDeltas.push(delta)
    },
    scrollReadingsTo: (target) => {
      scrollTargets.push(target)
    },
  }
  return {
    dispatched,
    ctx,
    exitFired: () => exit.mock.calls.length > 0,
    panDeltas,
    scrollDeltas,
    scrollTargets,
  }
}

describe('Esc', () => {
  it('calls ctx.exit when no typing run is open', () => {
    const { ctx, exitFired, dispatched } = buildContext()
    const handled = dispatchPlaygroundKey(
      '',
      { ...emptyKey(), escape: true },
      ctx,
    )
    expect(handled).toBe(true)
    expect(exitFired()).toBe(true)
    expect(dispatched).toHaveLength(0)
  })

  it('dispatches escapePressed when a typing run is open', () => {
    const { ctx, exitFired, dispatched } = buildContext({
      typingRun: [7, 7, 7, 7, 7, 7],
    })
    dispatchPlaygroundKey('', { ...emptyKey(), escape: true }, ctx)
    expect(exitFired()).toBe(false)
    expect(dispatched).toEqual([{ action: { type: 'escapePressed' } }])
  })
})

describe('arrow keys — focus', () => {
  it('↑ dispatches focusMove +1', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), upArrow: true }, ctx)
    expect(dispatched).toEqual([{ action: { type: 'focusMove', delta: 1 } }])
  })

  it('↓ dispatches focusMove -1', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), downArrow: true }, ctx)
    expect(dispatched).toEqual([{ action: { type: 'focusMove', delta: -1 } }])
  })
})

describe('SPACE — flip polarity', () => {
  it('dispatches flipPolarity on a bare SPACE', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey(' ', emptyKey(), ctx)
    expect(dispatched).toEqual([{ action: { type: 'flipPolarity' } }])
  })

  it('ignores Ctrl+SPACE', () => {
    const { ctx, dispatched } = buildContext()
    const handled = dispatchPlaygroundKey(
      ' ',
      { ...emptyKey(), ctrl: true },
      ctx,
    )
    expect(handled).toBe(false)
    expect(dispatched).toHaveLength(0)
  })
})

describe('←/→ — cycle', () => {
  it('→ dispatches cycleForward', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), rightArrow: true }, ctx)
    expect(dispatched).toEqual([{ action: { type: 'cycleForward' } }])
  })

  it('← dispatches cycleBackward', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), leftArrow: true }, ctx)
    expect(dispatched).toEqual([{ action: { type: 'cycleBackward' } }])
  })
})

describe('digit keys 6/7/8/9 — type', () => {
  it.each([
    ['6', 6],
    ['7', 7],
    ['8', 8],
    ['9', 9],
  ] as const)('"%s" dispatches typeDigit %d', (input, digit) => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey(input, emptyKey(), ctx)
    expect(dispatched).toEqual([{ action: { type: 'typeDigit', digit } }])
  })

  it('ignores other digits and letters', () => {
    const { ctx, dispatched } = buildContext()
    expect(dispatchPlaygroundKey('5', emptyKey(), ctx)).toBe(false)
    expect(dispatchPlaygroundKey('a', emptyKey(), ctx)).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it('ignores digits with Ctrl modifier', () => {
    const { ctx, dispatched } = buildContext()
    const handled = dispatchPlaygroundKey(
      '8',
      { ...emptyKey(), ctrl: true },
      ctx,
    )
    expect(handled).toBe(false)
    expect(dispatched).toHaveLength(0)
  })
})

describe('Delete / Backspace — undo last typed', () => {
  it('Delete dispatches deleteTyped', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), delete: true }, ctx)
    expect(dispatched).toEqual([{ action: { type: 'deleteTyped' } }])
  })

  it('Backspace dispatches deleteTyped', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), backspace: true }, ctx)
    expect(dispatched).toEqual([{ action: { type: 'deleteTyped' } }])
  })
})

describe('r — reset', () => {
  it('dispatches reset on bare "r"', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('r', emptyKey(), ctx)
    expect(dispatched).toEqual([{ action: { type: 'reset' } }])
  })

  it('ignores Ctrl+R', () => {
    const { ctx, dispatched } = buildContext()
    const handled = dispatchPlaygroundKey(
      'r',
      { ...emptyKey(), ctrl: true },
      ctx,
    )
    expect(handled).toBe(false)
    expect(dispatched).toHaveLength(0)
  })
})

describe('</> — horizontal pan of the top half', () => {
  it('"<" calls panTopBy(-1)', () => {
    const { ctx, panDeltas } = buildContext()
    dispatchPlaygroundKey('<', emptyKey(), ctx)
    expect(panDeltas).toEqual([-1])
  })

  it('">" calls panTopBy(+1)', () => {
    const { ctx, panDeltas } = buildContext()
    dispatchPlaygroundKey('>', emptyKey(), ctx)
    expect(panDeltas).toEqual([1])
  })

  it('ignores Ctrl+<', () => {
    const { ctx, panDeltas } = buildContext()
    const handled = dispatchPlaygroundKey(
      '<',
      { ...emptyKey(), ctrl: true },
      ctx,
    )
    expect(handled).toBe(false)
    expect(panDeltas).toHaveLength(0)
  })
})

describe('PgUp/PgDn — scroll readings', () => {
  it('PgUp calls scrollReadingsBy(-Infinity) — host pages it', () => {
    const { ctx, scrollDeltas } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), pageUp: true }, ctx)
    expect(scrollDeltas).toEqual([Number.NEGATIVE_INFINITY])
  })

  it('PgDn calls scrollReadingsBy(+Infinity) — host pages it', () => {
    const { ctx, scrollDeltas } = buildContext()
    dispatchPlaygroundKey('', { ...emptyKey(), pageDown: true }, ctx)
    expect(scrollDeltas).toEqual([Number.POSITIVE_INFINITY])
  })
})

describe('g/G — jump readings to top/bottom', () => {
  it('"g" jumps to row 0', () => {
    const { ctx, scrollTargets } = buildContext()
    dispatchPlaygroundKey('g', emptyKey(), ctx)
    expect(scrollTargets).toEqual([0])
  })

  it('"G" jumps to +Infinity (host clamps to last row)', () => {
    const { ctx, scrollTargets } = buildContext()
    dispatchPlaygroundKey('G', emptyKey(), ctx)
    expect(scrollTargets).toEqual([Number.POSITIVE_INFINITY])
  })
})

describe('S — save', () => {
  it('dispatches beginSave on bare "S"', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('S', emptyKey(), ctx)
    expect(dispatched).toEqual([{ action: { type: 'beginSave' } }])
  })

  it('also accepts lowercase "s"', () => {
    const { ctx, dispatched } = buildContext()
    dispatchPlaygroundKey('s', emptyKey(), ctx)
    expect(dispatched).toEqual([{ action: { type: 'beginSave' } }])
  })
})

describe('saving mode', () => {
  it('suppresses every binding (none fire)', () => {
    const { ctx, dispatched, exitFired } = buildContext({ mode: 'saving' })
    const inputs: Array<[string, Partial<Key>]> = [
      ['', { escape: true }],
      ['', { upArrow: true }],
      ['', { downArrow: true }],
      [' ', {}],
      ['', { leftArrow: true }],
      ['', { rightArrow: true }],
      ['<', {}],
      ['>', {}],
      ['', { pageUp: true }],
      ['', { pageDown: true }],
      ['g', {}],
      ['G', {}],
      ['8', {}],
      ['', { delete: true }],
      ['r', {}],
      ['S', {}],
    ]
    for (const [input, key] of inputs) {
      const handled = dispatchPlaygroundKey(
        input,
        { ...emptyKey(), ...key },
        ctx,
      )
      expect(handled).toBe(false)
    }
    expect(dispatched).toHaveLength(0)
    expect(exitFired()).toBe(false)
  })
})
