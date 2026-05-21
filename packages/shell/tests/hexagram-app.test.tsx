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
// `saveConsultationFile`. The random flow is used because it skips the 18
// splits — submitting a query takes it straight computing → done. To keep the
// on-disk write isolated, the test `process.chdir()`s into a fresh `mkdtemp`
// directory: both `<ConsultationViewer>`'s save and `<HexagramApp>`'s history
// scan resolve `consultations/` relative to `process.cwd()`. `useWindowSize`
// is mocked because ink-testing-library's fake stdout reports no rows.
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

import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HexagramApp, type CastingFlags } from '../src/hexagram-app'

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

// The flags `<HexagramApp>` would receive from `runHexagram()`.
const CASTING_FLAGS: CastingFlags = {
  inputMode: 'slider',
  maxWrapWidth: 120,
  sliderSweepMs: 1800,
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
  const handle = render(<HexagramApp castingFlags={CASTING_FLAGS} />)
  await tick()
  // Home: focus is on "New interactive" (row 1) — move down to "New random"
  // (row 2) and select it.
  handle.stdin.write(ARROW_DOWN)
  await tick()
  handle.stdin.write(ENTER)
  await tick()
  // Submit the query → computing → done. The random flow skips the 18 splits.
  handle.stdin.write(query)
  await tick()
  handle.stdin.write(ENTER)
  await tick(220) // compute effect + real file write
  return handle
}

describe('<HexagramApp> — Home screen', () => {
  it('opens on Home with the three menu items and the app banner', () => {
    const { lastFrame, unmount } = render(
      <HexagramApp castingFlags={CASTING_FLAGS} />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('hexagram — the Yijing oracle')
    expect(frame).toContain('New interactive consultation')
    expect(frame).toContain('New random consultation')
    expect(frame).toContain('Browse history')
    // Home footer names Esc as the quit key (not a back key).
    expect(frame).toContain('Esc quit')
    unmount()
  })

  it('focuses "New interactive consultation" by default', () => {
    const { lastFrame, unmount } = render(
      <HexagramApp castingFlags={CASTING_FLAGS} />,
    )
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
      <HexagramApp castingFlags={CASTING_FLAGS} />,
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
    await tick()
    const homeFrame = stripAnsi(lastFrame() ?? '')
    expect(homeFrame).toContain('New interactive consultation')
    expect(homeFrame).not.toContain('Consultation · random')

    unmount()
  })

  it('Browse history after a cast shows the just-cast consultation', async () => {
    const query = 'A question about the coming season'
    const { lastFrame, stdin, unmount } = await castRandomConsultation(query)
    expect(stripAnsi(lastFrame() ?? '')).toContain('Standing Hexagram')

    // Esc → Home.
    stdin.write(ESC)
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).toContain('Browse history')

    // Home → Browse history (row 3). The history screen mounts fresh and
    // re-scans `consultations/`, so the consultation just cast appears.
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ENTER)
    await tick(150) // history scan is async

    const historyFrame = stripAnsi(lastFrame() ?? '')
    expect(historyFrame).toContain('Past Consultations')
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
    await tick()

    // Home → Browse history.
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ARROW_DOWN)
    await tick()
    stdin.write(ENTER)
    await tick(150)
    expect(stripAnsi(lastFrame() ?? '')).toContain('Past Consultations')

    // Esc on the list → Home.
    stdin.write(ESC)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('New interactive consultation')
    expect(frame).not.toContain('Past Consultations')

    unmount()
  })
})

describe('<HexagramApp> — mid-cast discard confirm', () => {
  it('Esc mid-cast with a typed query shows the discard confirm', async () => {
    const { lastFrame, stdin, unmount } = render(
      <HexagramApp castingFlags={CASTING_FLAGS} />,
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
      <HexagramApp castingFlags={CASTING_FLAGS} />,
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
      <HexagramApp castingFlags={CASTING_FLAGS} />,
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
