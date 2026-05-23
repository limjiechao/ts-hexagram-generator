// Integration test for `<HexagramApp>` — the composition layer. It mounts the
// real root component and drives the full PRD navigation model through
// `ink-testing-library`, asserting the rendered screen at each step:
//
//   Home → New random consultation → casting → (query) → done Readout
//        → Esc → Home → Browse history → the just-cast consultation appears
//
// plus the mid-cast discard-confirm: Esc with a typed query opens the confirm
// modal instead of leaving the cast.
//
// The casting flow is the REAL `<ConsultationViewer>` (mounted as the
// component, not via `runConsultationViewer`) and the REAL
// `saveConsultationFile`. The random flow plays its predetermined plan back
// cast-by-cast through `casting` mode; `generateRandomConsultation` is stubbed
// with a deterministic min-pick plan so the eighteen casts auto-land fast
// enough for the test (the real RNG would land at unpredictable, sometimes
// slow, ticks). To keep the on-disk write isolated, the test
// `process.chdir()`s into a fresh `mkdtemp` directory: both
// `<ConsultationViewer>`'s save and `<HexagramApp>`'s history scan resolve
// `consultations/` relative to `process.cwd()`. `useWindowSize` is mocked
// because ink-testing-library's fake stdout reports no rows.
//
// The `done`-state signal asserted on is the UNLOCKED multi-tab bar: while the
// casting flow runs, only the active tab renders; once `done`, the full tab
// bar appears (the `<3> Standing Hexagram` cell is the stable marker — every
// consultation, moving or static, has a Standing Hexagram tab). The
// saved-path footer line is not asserted on — the deep `mkdtemp` path is
// leading-ellipsis-truncated at 100 cols.
//
// Prior art: `packages/history-ui/tests/history-app.test.tsx` and
// `packages/casting-ui/tests/viewer.test.tsx`.

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { getHexagramRecord } from '@hexagram/core/getters'
import type { CastingRecord, Hexagram } from '@hexagram/types'
import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BannerTestOverride } from '../src/banner-state'
import { HexagramApp, type CastingFlags } from '../src/hexagram-app'
import { HomeMenu } from '../src/home-menu'

// Deterministic stub for the random casting plan. Every pick is 3 — a couple
// of cells from the slider's min — so each cast bounces briefly then
// auto-lands; the eighteen-cast playback then completes within the test's
// polling window. A static hexagram keeps the done-state tab bar predictable.
const randomConsultationMock = vi.hoisted(() => {
  const stubHexagram: Hexagram = [7, 8, 7, 8, 7, 8]
  const stubCasting = Array.from({ length: 6 }, () => [
    { pick: 3, max: 48 },
    { pick: 3, max: 43 },
    { pick: 3, max: 35 },
  ]) as CastingRecord
  return vi.fn(() => ({ hexagram: stubHexagram, casting: stubCasting }))
})
vi.mock('@hexagram/core/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hexagram/core/random')>()
  return { ...actual, generateRandomConsultation: randomConsultationMock }
})

// ANSI SGR matcher — stripped before text assertions so matching is robust to
// Ink's colour codes.
const ANSI_PATTERN = new RegExp(
  String.raw`${String.fromCodePoint(0x1b)}\[[0-9;]*m`,
  'g',
)
function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

/** Yield to the event loop so Ink can process queued stdin + re-render. */
const tick = (ms = 60): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Poll `predicate()` until it returns truthy (or `undefined`, treated as
 * truthy when the predicate is purely an assertion) or `timeoutMs` elapses.
 * Catches and retries on thrown errors, so an `expect(...)` assertion can be
 * dropped in directly — the assertion *is* the condition. On the final retry
 * the cached error is re-thrown, giving a useful failure message instead of
 * a bare timeout. Default deadline is 8000 ms because the shell integration
 * tests cascade multiple async stages per `it(...)` (cast playback → file
 * write → render); the package's `vitest.config.ts` sets a 15000 ms
 * `testTimeout` above that. See the `cross-platform-tests` skill for the
 * canonical pattern.
 */
async function waitFor<T>(
  predicate: () => T | Promise<T>,
  {
    timeoutMs = 8000,
    intervalMs = 20,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  for (;;) {
    try {
      const value = await predicate()
      if (value !== false) return value
    } catch (error) {
      lastError = error
    }
    if (Date.now() >= deadline) {
      throw lastError ?? new Error(`waitFor timed out after ${timeoutMs}ms`)
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

const ESC = String.fromCodePoint(0x1b)
const ENTER = '\r'
const ARROW_DOWN = `${ESC}[B`

// `useWindowSize` reads stdout dimensions; ink-testing-library's fake stdout
// is fixed at 100 columns with no rows. Mock the hook so every shell screen
// sizes to a usable terminal.
const windowSize = vi.hoisted(() => ({ current: { columns: 100, rows: 30 } }))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

// The flags `<HexagramApp>` would receive from `runHexagram()`. `sliderSweepMs`
// is small and `castBounceMs` / `castRevealMs` are 0 so the stubbed random
// playback's eighteen casts auto-land / reveal fast in the test; production
// resolves real ceremonial values.
const CASTING_FLAGS: CastingFlags = {
  inputMode: 'slider',
  maxWrapWidth: 120,
  sliderSweepMs: 120,
  castBounceMs: 0,
  castRevealMs: 0,
}

// A deterministic, interval-disabled banner override. With the interval off
// the banner freezes on its initial settled frame; the scripted RNG pins that
// frame to the fixed hexagram [7,8,7,8,7,8] (six values feed randomHex:
// 0→yang(7), 0.9→yin(8)). A fresh factory call per render gives each render
// its own RNG cursor.
function frozenBannerOverride(): BannerTestOverride {
  const sequence = [0, 0.9, 0, 0.9, 0, 0.9]
  let cursor = 0
  return {
    rng: () => sequence[cursor++ % sequence.length] ?? 0,
    disableInterval: true,
  }
}

let tmpDir: string
let originalCwd: string

beforeEach(async () => {
  windowSize.current = { columns: 100, rows: 30 }
  originalCwd = process.cwd()
  // A fresh isolated directory for this run. Both the casting viewer's save
  // and the history scan resolve `consultations/` from `process.cwd()`, so
  // chdir-ing here keeps the on-disk write out of the real repo.
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexagram-app-'))
  process.chdir(tmpDir)
})

afterEach(async () => {
  process.chdir(originalCwd)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

/**
 * Drive a fresh `<HexagramApp>` Home → random casting → `done`. Returns the
 * testing-library handle so the caller can continue navigating. The cast query
 * is a caller-supplied string so a later "Browse history" can find the row.
 */
async function castRandomConsultation(
  query: string,
): Promise<ReturnType<typeof render>> {
  const handle = render(
    <HexagramApp
      castingFlags={CASTING_FLAGS}
      sliderCommitRevealMs={0}
      bannerTestOverride={frozenBannerOverride()}
    />,
  )
  await tick()
  // Home: focus is on "New interactive" (row 1) — move down to "New random"
  // (row 2) and select it.
  handle.stdin.write(ARROW_DOWN)
  await tick()
  handle.stdin.write(ENTER)
  await tick()
  // Submit the query → the random flow plays its plan back cast-by-cast
  // through `casting`, then computing → done. Poll until the eighteen casts
  // and the real file write settle.
  handle.stdin.write(query)
  await tick()
  handle.stdin.write(ENTER)
  await waitFor(() => {
    expect(stripAnsi(handle.lastFrame() ?? '')).toContain('Standing Hexagram')
  })
  return handle
}

describe('<HexagramApp> — Home screen', () => {
  it('opens on Home with the new banner layout and the three menu items', async () => {
    const { lastFrame, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    // The old two-line banner is gone, replaced by the hexagram banner +
    // identity block.
    expect(frame).not.toContain('hexagram — the Yijing oracle')
    // The hexagram banner: a six-line figure with both bar styles.
    expect(frame).toContain('━━━━━━━━━')
    expect(frame).toContain('━━━   ━━━')
    // The static identity block.
    expect(frame).toContain('H · E · X · A · G · R · A · M')
    expect(frame).toContain('the Yijing Yarrow Oracle — in your terminal')
    // The three menu items + footer are unchanged.
    expect(frame).toContain('New interactive consultation')
    expect(frame).toContain('New random consultation')
    expect(frame).toContain('Browse history')
    expect(frame).toContain('Esc quit')
    unmount()
  })

  it('focuses "New interactive consultation" by default', async () => {
    const { lastFrame, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await tick()
    // The focused row rides a bold inverse bar — the `[7m` SGR code.
    const inverseLine = (lastFrame() ?? '')
      .split('\n')
      .find((line) => line.includes(`${ESC}[7m`))
    expect(inverseLine).toBeDefined()
    expect(stripAnsi(inverseLine ?? '')).toContain(
      'New interactive consultation',
    )
    unmount()
  })
})

describe('<HexagramApp> — Home → casting → done → Home', () => {
  it('selecting "New random consultation" enters the casting screen', async () => {
    const { lastFrame, stdin, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await tick()
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ENTER)
    await tick()
    // The casting viewer mounted — its provenance title names the random flow.
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Consultation · random')
    expect(frame).not.toContain('New interactive consultation')
    unmount()
  })

  it('drives a random consultation to done and Esc returns to Home', async () => {
    const { lastFrame, stdin, unmount } = await castRandomConsultation(
      'Will the harvest be plentiful?',
    )
    // The finished Readout — the unlocked multi-tab bar proves `done` (during
    // the flow only the active tab renders).
    const doneFrame = stripAnsi(lastFrame() ?? '')
    expect(doneFrame).toContain('Consultation · random')
    expect(doneFrame).toContain('Standing Hexagram')

    // Esc from the finished Readout → Home (no unsaved progress at `done`, so
    // the discard-confirm is not interposed).
    stdin.write(ESC)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain(
        'New interactive consultation',
      )
    })
    expect(stripAnsi(lastFrame() ?? '')).not.toContain('Consultation · random')

    unmount()
  })

  it('drives a number-input random consultation to done', async () => {
    // The composed `hexagram` CLI reaches number-input mode via
    // `--numeric-input`; the `--cast-reveal-ms` flag (0 here) drives the
    // text-based progressive reveal. This proves the flag threads through
    // `CastingFlags` → `<ConsultationViewer>` for the number-mode random flow.
    const numericFlags: CastingFlags = {
      ...CASTING_FLAGS,
      inputMode: 'number',
    }
    const { lastFrame, stdin, unmount } = render(
      <HexagramApp castingFlags={numericFlags} sliderCommitRevealMs={0} />,
    )
    await tick()
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write('Will the harvest be plentiful?')
    await tick()
    stdin.write(ENTER)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Standing Hexagram')
    })
    const doneFrame = stripAnsi(lastFrame() ?? '')
    expect(doneFrame).toContain('Consultation · random')
    expect(doneFrame).toContain('Standing Hexagram')
    unmount()
  })

  it('Browse history after a cast shows the just-cast consultation', async () => {
    const query = 'A question about the coming season'
    const { lastFrame, stdin, unmount } = await castRandomConsultation(query)
    expect(stripAnsi(lastFrame() ?? '')).toContain('Standing Hexagram')

    // Esc → Home.
    stdin.write(ESC)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Browse history')
    })

    // Home → Browse history (row 3). The history screen mounts fresh and
    // re-scans `consultations/`, so the consultation just cast appears.
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ENTER)
    // History scan is async — wait until the scan resolves and the row renders.
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Past Consultations')
    })

    const historyFrame = stripAnsi(lastFrame() ?? '')
    // The just-cast consultation appears — the fresh history mount re-scanned
    // `consultations/` and picked up the file the casting flow wrote.
    expect(historyFrame).toContain(query)
    expect(historyFrame).toContain('1 consultation')

    unmount()
  })

  it('Esc on the history list returns to Home', async () => {
    const { lastFrame, stdin, unmount } =
      await castRandomConsultation('Seasonal query')
    stdin.write(ESC) // done Readout → Home
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Browse history')
    })

    // Home → Browse history.
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ENTER)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Past Consultations')
    })

    // Esc on the list → Home.
    stdin.write(ESC)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain(
        'New interactive consultation',
      )
    })
    expect(stripAnsi(lastFrame() ?? '')).not.toContain('Past Consultations')

    unmount()
  })
})

describe('<HexagramApp> — mid-cast discard confirm', () => {
  it('Esc mid-cast with a typed query shows the discard confirm', async () => {
    const { lastFrame, stdin, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await tick()

    // Home → interactive casting (row 1, focused by default).
    stdin.write(ENTER)
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).toContain('Consultation · interactive')

    // Type a query — this is unsaved cast progress — then press Esc.
    stdin.write('A half-typed question')
    await tick()
    stdin.write(ESC)
    await tick()

    // The discard confirm is interposed; the app did NOT navigate to Home.
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Discard this consultation?')
    expect(frame).not.toContain('New interactive consultation')

    unmount()
  })

  it('cancelling the discard confirm (N) keeps the cast on screen', async () => {
    const { lastFrame, stdin, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await tick()
    stdin.write(ENTER) // → interactive casting
    await tick()
    stdin.write('Another half-typed question')
    await tick()
    stdin.write(ESC) // open the discard confirm
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).toContain('Discard this consultation?')

    stdin.write('n') // cancel — keep casting
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).not.toContain('Discard this consultation?')
    // Still on the casting screen, not Home.
    expect(frame).toContain('Consultation · interactive')
    expect(frame).not.toContain('New random consultation')

    unmount()
  })

  it('confirming the discard (Y) returns to Home', async () => {
    const { lastFrame, stdin, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await tick()
    stdin.write(ENTER) // → interactive casting
    await tick()
    stdin.write('Yet another question')
    await tick()
    stdin.write(ESC) // open the discard confirm
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).toContain('Discard this consultation?')

    stdin.write('y') // confirm discard → back to Home
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('New interactive consultation')
    expect(frame).not.toContain('Discard this consultation?')

    unmount()
  })
})

describe('<HexagramApp> — animated home banner', () => {
  it('forwards the test override so the frozen banner is deterministic', async () => {
    // rng `() => 0` ⇒ randomHex is all-yang ⇒ hexagram 乾 (H111111). If the
    // override did not thread HexagramApp → HomeMenu → AnimatedBanner, the
    // banner would mount with Math.random and show a random hexagram.
    const override: BannerTestOverride = {
      rng: () => 0,
      disableInterval: true,
    }
    const { lastFrame, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={override}
      />,
    )
    await tick()
    const first = stripAnsi(lastFrame() ?? '')
    // The RNG threaded through: the all-yang figure is 乾.
    expect(first).toContain('乾')

    // The interval-disable flag threaded through: after ~3 banner ticks'
    // worth of real time the frame is byte-identical — the banner is frozen.
    await tick(350)
    expect(stripAnsi(lastFrame() ?? '')).toBe(first)
    unmount()
  })

  it('continuously animates the banner when the interval is enabled', async () => {
    // Interval enabled; rng `() => 0.5` ⇒ all-yin figure, plan forces one
    // moving line. Within a few 108 ms ticks the banner enters its pulse
    // frames and a moving ✕ marker appears — proof the animation loop runs.
    const override: BannerTestOverride = {
      rng: () => 0.5,
      disableInterval: false,
    }
    const { lastFrame, unmount } = render(
      <HexagramApp
        castingFlags={CASTING_FLAGS}
        bannerTestOverride={override}
      />,
    )
    await tick()
    const settled = stripAnsi(lastFrame() ?? '')
    expect(settled).not.toContain('✕')

    // Poll across several cycles' worth of ticks for a moving marker.
    let animated = false
    for (let beat = 0; beat < 40; beat += 1) {
      await tick(50)
      if (stripAnsi(lastFrame() ?? '').includes('✕')) {
        animated = true
        break
      }
    }
    expect(animated).toBe(true)
    unmount()
  })
})

// ── Banner layout regression tests. The home banner is centred independently
// of the variable-width hexagram name; these guard the two layout fixes:
// (1) two blank rows after the banner and after the identity block, and
// (2) the six-line figure anchored at a constant column for every hexagram.

/** All 64 settled hexagrams, bottom-first, as 7 (yang) / 8 (yin) tuples. */
function allSettledHexagrams(): Hexagram[] {
  return Array.from(
    { length: 64 },
    (_, mask) =>
      Array.from({ length: 6 }, (_unused, line) =>
        ((mask >> line) & 1) === 1 ? 8 : 7,
      ) as Hexagram,
  )
}

/**
 * A frozen banner override pinned to a specific settled hexagram. `randomHex`
 * consumes six rng values — `< 0.5 → 7` (yang), `≥ 0.5 → 8` (yin) — so the
 * sequence reproduces `hex`; the interval is disabled so the banner holds it.
 */
function settledBannerOverride(hex: Hexagram): BannerTestOverride {
  const sequence = hex.map((line) => (line === 7 ? 0 : 0.9))
  let cursor = 0
  return {
    rng: () => sequence[cursor++ % sequence.length] ?? 0,
    disableInterval: true,
  }
}

/** Render `<HomeMenu>` for one frozen hexagram; return its stripped frame rows. */
function homeRows(hex: Hexagram): string[] {
  const { lastFrame, unmount } = render(
    <HomeMenu
      onSelect={() => {}}
      onQuit={() => {}}
      bannerTestOverride={settledBannerOverride(hex)}
    />,
  )
  const rows = stripAnsi(lastFrame() ?? '').split('\n')
  unmount()
  return rows
}

describe('<HomeMenu> — banner layout', () => {
  it('anchors the hexagram figure at the same column for every hexagram', () => {
    // The pre-fix banner nested two centring passes — the figure within a
    // name-width box, then that box within the screen — and the two integer
    // roundings beat against the name width's parity, jittering the figure
    // ±1 column. Every banner line begins `<value>  ━━━…`, so the first `━`
    // column is the figure's left edge for both yang and yin lines.
    const columns = allSettledHexagrams().map((hex) => {
      const barRow = homeRows(hex).find((row) => row.includes('━'))
      expect(barRow).toBeDefined()
      return barRow?.indexOf('━')
    })
    expect(new Set(columns).size).toBe(1)
  })

  it('separates the identity block from the banner by two blank rows', () => {
    const rows = homeRows([7, 8, 7, 8, 7, 8])
    const taglineRow = rows.findIndex((row) =>
      row.includes('the Yijing Yarrow Oracle'),
    )
    const firstBarRow = rows.findIndex((row) => row.includes('━'))
    expect(taglineRow).toBeGreaterThanOrEqual(0)
    expect(firstBarRow).toBeGreaterThan(taglineRow)
    // Tagline, blank, blank, first banner row → the banner is three rows down.
    expect(firstBarRow - taglineRow).toBe(3)
  })

  it('separates the banner from the menu by two blank rows', () => {
    const frozenHex: Hexagram = [7, 8, 7, 8, 7, 8]
    const rows = homeRows(frozenHex)
    const name = getHexagramRecord(frozenHex).Name.English.WilhelmBaynes
    const nameRow = rows.findIndex((row) => row.includes(name))
    const menuRow = rows.findIndex((row) =>
      row.includes('New interactive consultation'),
    )
    expect(nameRow).toBeGreaterThanOrEqual(0)
    expect(menuRow).toBeGreaterThan(nameRow)
    // English name, blank, blank, menu → the menu is three rows down.
    expect(menuRow - nameRow).toBe(3)
  })
})
