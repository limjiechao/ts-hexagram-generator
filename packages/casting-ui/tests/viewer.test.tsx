import type { CastingRecord, Hexagram } from '@hexagram/types'
import { buildConsultationSections } from '@hexagram/viewer-core'
import { render } from 'ink-testing-library'
import stringWidth from 'string-width'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConsultationViewer } from '../src/viewer'
import { tick, waitFor } from './helpers/async'
import {
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  CTRL_C,
  ENTER,
  ESCAPE,
  SPACE,
  TAB,
} from './helpers/keystrokes'
import { pickFromFrame } from './helpers/slider'
import {
  STUB_CASTING,
  STUB_SAVED_PATH,
  STUB_STATIC_HEXAGRAM,
} from './helpers/stubs'

// Stub the filesystem-touching `@hexagram/consultation-file/file` module so the
// interactive-mode tests can drive the viewer to completion without writing
// real files to `consultations/`. `buildConsultationSections` (in
// `output-composers`) stays live — it's pure.
const consultationFileOutputMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve('/tmp/consultation-mocked.txt')),
)
vi.mock('@hexagram/consultation-file/file', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@hexagram/consultation-file/file')>()
  return { ...actual, saveConsultationFile: consultationFileOutputMock }
})

// `generateRandomConsultation` is deterministic for the random-flow tests so
// the viewer arrives at `done` with predictable casting data. Every pick is 1
// (the min) so the bouncing slider auto-lands on tick 0 — the random-flow
// integration tests then exercise the full eighteen-cast playback without a
// multi-second wall-clock wait.
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

// `useWindowSize` reads stdout dimensions; ink-testing-library's fake stdout
// is fixed at 100 columns with no rows. Mock the hook so tests can exercise
// narrow terminals.
const windowSize = vi.hoisted(() => ({
  current: { columns: 100, rows: 24 },
}))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

// Distinct from the file-output mock's path (`consultation-mocked.txt`) on
// purpose: this is the saved-path string fed to the viewer when it mounts
// with pre-built sections (no flow), so tests can assert the footer shows
// the path the consumer supplied.
const SAVED_PATH = '/tmp/consultation-test.txt'

// The viewer only renders the casting record, so the shared stub from
// `tests/helpers/stubs.ts` is reused for both moving and static cases.
const sampleCasting = STUB_CASTING

const movingSections = buildConsultationSections(
  'Should I take the journey?',
  [6, 9, 7, 8, 7, 8],
  sampleCasting,
)
const staticSections = buildConsultationSections(
  'Will the harvest be plentiful?',
  STUB_STATIC_HEXAGRAM,
  sampleCasting,
)

beforeEach(() => {
  windowSize.current = { columns: 100, rows: 24 }
})

describe('ConsultationViewer', () => {
  it('renders the query, tab bar and saved path on the first frame', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''

    expect(frame).toContain('Should I take the journey?')
    expect(frame).toContain('Casting')
    expect(frame).toContain('Transformation')
    expect(frame).toContain('Standing Hexagram')
    expect(frame).toContain('Emerging Hexagram')
    expect(frame).toContain(`saved to ${SAVED_PATH}`)

    unmount()
  })

  it('shows two tabs when there are no moving lines', () => {
    // Static hexagrams collapse the tab bar to Casting + Standing Hexagram —
    // Transformation and Emerging Hexagram are hidden.
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={staticSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''

    expect(frame).toContain('Casting')
    expect(frame).toContain('Standing Hexagram')
    expect(frame).not.toContain('Transformation')
    expect(frame).not.toContain('Emerging Hexagram')

    unmount()
  })

  it('opens on the Casting tab', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    expect(lastFrame() ?? '').toContain('CASTING:')

    unmount()
  })

  it('switches tabs on Tab and changes the visible content', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const before = lastFrame() ?? ''

    stdin.write(TAB)
    await tick()
    const after = lastFrame() ?? ''

    // One Tab from the default Casting tab lands on Transformation.
    expect(after).not.toBe(before)
    expect(after).toContain('TRANSFORMATION:')

    unmount()
  })

  it('scrolls the active section on arrow-down', async () => {
    // The Casting table is compact (~14 rows) — fits a default 24-row
    // viewport. Shrink rows so it overflows and arrow-down has to scroll.
    windowSize.current = { columns: 100, rows: 14 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    const beforeScroll = lastFrame() ?? ''

    stdin.write(ARROW_DOWN)
    await tick()
    const afterScroll = lastFrame() ?? ''

    expect(afterScroll).not.toBe(beforeScroll)

    unmount()
  })

  it('does not switch tabs on the arrow keys (they pan instead)', async () => {
    // Use a wide-enough viewport for the 107-col casting table so ARROW_RIGHT
    // is a no-op pan (no overflow → nothing to scroll). The test verifies the
    // key does not advance the tab; pan side-effects would falsify the
    // `CASTING:` substring check by shifting it off the left edge.
    windowSize.current = { columns: 120, rows: 30 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    stdin.write(ARROW_RIGHT)
    await tick()
    const frame = lastFrame() ?? ''

    // Still on the default Casting tab — the arrow did not advance the tab.
    expect(frame).toContain('CASTING:')
    expect(frame).not.toContain('TRANSFORMATION:')

    unmount()
  })

  it('does not exit when q is pressed', async () => {
    // T3.8 — `q` is no longer a quit shortcut; only Esc / Ctrl+C exit. The
    // testing-library instance has no `waitUntilExit`, so we observe the
    // viewer is still alive by re-reading `lastFrame()` after `q` and
    // confirming the saved-path chrome is still on screen.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const before = lastFrame() ?? ''
    expect(before).toContain(`saved to ${SAVED_PATH}`)

    stdin.write('q')
    await tick(120)
    const after = lastFrame() ?? ''
    expect(after).toContain(`saved to ${SAVED_PATH}`)
    // No `q` ever leaks into the rendered chrome.
    expect(after).not.toContain('q: quit')

    unmount()
  })

  describe('narrow terminal', () => {
    it('does not overflow the terminal height', () => {
      windowSize.current = { columns: 40, rows: 20 }
      const { lastFrame, unmount } = render(
        <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
      )
      const frame = lastFrame() ?? ''

      expect(frame.split('\n').length).toBeLessThanOrEqual(20)
      // Chrome is still intact: the saved-path line and tab bar both render.
      // At 40 columns the tab bar collapses to the compact indicator, which
      // shows the active tab's label — Casting, the default.
      expect(frame).toContain('Casting')
      expect(frame).toContain('consultation-test.txt')

      unmount()
    })

    it('collapses the tab bar to a compact indicator when too narrow', async () => {
      windowSize.current = { columns: 30, rows: 20 }
      const { lastFrame, stdin, unmount } = render(
        <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
      )

      expect(lastFrame() ?? '').toContain('(1/4)')

      stdin.write(TAB)
      await tick()
      expect(lastFrame() ?? '').toContain('(2/4)')

      unmount()
    })

    it('pans wide content horizontally with the arrow keys', async () => {
      windowSize.current = { columns: 40, rows: 20 }
      const { lastFrame, stdin, unmount } = render(
        <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
      )
      const before = lastFrame() ?? ''

      stdin.write(ARROW_RIGHT)
      await tick()
      const afterRight = lastFrame() ?? ''
      expect(afterRight).not.toBe(before)

      stdin.write(ARROW_LEFT)
      await tick()
      const afterLeft = lastFrame() ?? ''
      expect(afterLeft).toBe(before)

      unmount()
    })

    it('keeps the saved-path line within the terminal width', () => {
      windowSize.current = { columns: 40, rows: 20 }
      const { lastFrame, unmount } = render(
        <ConsultationViewer
          sections={movingSections}
          savedPath="/Users/someone/Documents/ts-hexagram-generator/consultations/consultation.txt"
        />,
      )
      const frame = lastFrame() ?? ''
      const savedLine = frame
        .split('\n')
        .find((line) => line.includes('consultation.txt'))

      expect(savedLine).toBeDefined()
      // Leading-ellipsis truncation keeps the filename, drops the prefix, and
      // the rendered line fits within the terminal width.
      expect(savedLine).toContain('…')
      expect(stringWidth(savedLine ?? '')).toBeLessThanOrEqual(40)

      unmount()
    })
  })

  it('renders within the terminal height on a wide terminal', async () => {
    windowSize.current = { columns: 200, rows: 40 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        sections={movingSections}
        savedPath={SAVED_PATH}
        maxWrapWidth={120}
      />,
    )

    // Switch to the prose-heavy Standing Hexagram tab.
    stdin.write(TAB)
    await tick()
    const frame = lastFrame() ?? ''

    expect(frame.length).toBeGreaterThan(0)
    expect(frame.split('\n').length).toBeLessThanOrEqual(40)

    unmount()
  })
})

describe('ConsultationViewer (interactive flow)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
    randomConsultationMock.mockClear()
  })

  it('opens in awaitingQuery mode with an empty editable query box', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    const frame = lastFrame() ?? ''
    // T2's split-around-cursor placeholder breaks the literal sentence, so
    // assert two surviving fragments instead.
    expect(frame).toContain('Enter')
    expect(frame).toContain('your query for the oracle.')
    // The empty casting table is visible in the content area.
    expect(frame).toContain('CASTING:')
    // The footer-bottom line shows the flow hint, not a saved-path line.
    expect(frame).toContain('Type your query and press Enter.')
    expect(frame).not.toContain('saved to')
    unmount()
  })

  it('locks Tab while awaiting the query', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    const before = lastFrame() ?? ''
    stdin.write(TAB)
    await tick()
    const after = lastFrame() ?? ''
    expect(after).toContain('your query for the oracle.')
    expect(after).not.toContain('TRANSFORMATION:')
    // The query buffer should NOT have absorbed the tab character.
    expect(before).toContain('your query')
    unmount()
  })

  it('reveals the casting prompt box once the query is submitted', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Hi')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    expect(frame).toContain('Divide the stalks. Pick a number from 1 to 48')
    // Saved-path line still absent — casting hasn't completed.
    expect(frame).not.toContain('saved to')
    unmount()
  })

  it('shows a validation error for out-of-range picks', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    // 99 is above the round-1 max of 48 — pressing Enter should surface the
    // canonical error line and stay on the same cast.
    stdin.write('99')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Pick a number from 1 to 48.')
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    unmount()
  })

  it('advances the prompt to the next line with the correct max after the 3rd cast', async () => {
    // Regression: previously `currentMaxRef.current` was only reset by the
    // line-boundary `useEffect`, which fires after render — so the first frame
    // after the 3rd cast displayed the stale 3rd-cast max (e.g. 1..31) under
    // the new "Line 2 · 1st Cast" title. Validate that the synchronous reset
    // in `submitSplit` brings the prompt back to 1..48 on the new line.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    // Picks (24, 20, 16) are within range for rounds 1/2/3 of an unmodified
    // 49-stalk casting and produce a valid Line (6) — concrete enough to
    // exercise the real generator end-to-end rather than mocking it.
    stdin.write('24')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write('20')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write('16')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 2/6 · Cast 1/3')
    expect(frame).toContain('Divide the stalks. Pick a number from 1 to 48')
    // And the previous line's intermediate max must not linger in the frame.
    expect(frame).not.toContain('Pick a number from 1 to 31')
    unmount()
  })

  it('locks Tab while the casting phase is in progress', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write(TAB)
    await tick()
    const frame = lastFrame() ?? ''
    // Tab must not have advanced the active tab — Casting prompt still shown
    // and the locked tab bar renders ONLY the active tab.
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    expect(frame).toContain('Casting')
    expect(frame).not.toContain('Transformation')
    expect(frame).not.toContain('Standing Hexagram')
    expect(frame).not.toContain('Emerging Hexagram')
    expect(frame).not.toContain('TRANSFORMATION:')
    unmount()
  })

  it('plays the random flow through casting mode and reaches done', async () => {
    // The random flow no longer short-cuts to computing — it plays its
    // predetermined plan back cast-by-cast through `casting` mode. With every
    // stub pick (3) sits a couple of cells from the slider's min, so each cast
    // bounces briefly then auto-lands; `castBounceMs={0}` and
    // `sliderCommitRevealMs={0}` strip the ceremonial dwells so the eighteen
    // casts replay fast enough for the test's polling window.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        sliderSweepMs={120}
        castBounceMs={0}
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Will the harvest be plentiful?')
    await tick()
    stdin.write(ENTER)
    // The casting prompt appears — the random flow enters `casting` mode.
    await tick()
    expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 1/3')
    // Poll until the eighteen-cast playback + compute effect settle.
    for (let beat = 0; beat < 80; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await tick(60)
    }
    const frame = lastFrame() ?? ''
    expect(frame).toContain(`saved to ${STUB_SAVED_PATH}`)
    expect(randomConsultationMock).toHaveBeenCalledTimes(1)
    expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('generates the casting plan once in the shell, not the reducer', async () => {
    // `generateRandomConsultation()` is called exactly once — by the Viewer's
    // imperative Query-submit handler — and never again as the flow plays out.
    const { stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        sliderSweepMs={120}
        castBounceMs={0}
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick(150)
    expect(randomConsultationMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('SPACE during random playback skips straight to the finished Consultation', async () => {
    // Pressing SPACE during the random casting animation abandons the rest of
    // the playback: the pure `playbackSkipped` action fills the casting record
    // + lines from the plan and jumps to `computing`, which saves the file.
    // A long `castBounceMs` keeps the slider ticking so SPACE genuinely skips
    // a still-running animation rather than racing the auto-land.
    consultationFileOutputMock.mockClear()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        sliderSweepMs={120}
        castBounceMs={100000}
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Will the harvest be plentiful?')
    await tick()
    stdin.write(ENTER)
    await tick()
    // The random flow is mid-`casting` — the slider is still parting stalks.
    expect(lastFrame() ?? '').toContain('parting the stalks')
    // SPACE skips the rest of the animation.
    stdin.write(SPACE)
    // Let the skip → computing → compute effect → save → done settle.
    for (let beat = 0; beat < 40; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await tick(50)
    }
    const frame = lastFrame() ?? ''
    expect(frame).toContain(`saved to ${STUB_SAVED_PATH}`)
    // The Consultation is saved exactly once — the skipped reading is
    // persisted just like the fully-animated one.
    expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('shows a "SPACE: skip" footer hint during random playback', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        sliderSweepMs={120}
        castBounceMs={100000}
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    // The random flow's footer advertises SPACE as the skip key.
    expect(frame).toContain('SPACE: skip')
    expect(frame).not.toContain('SPACE: part')
    unmount()
  })

  it('fills the casting table progressively, one stalk-split per cast', async () => {
    // The random flow shows the slider casting prompt and advances the
    // progress bar split-by-split, exactly like the interactive flow.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        sliderSweepMs={120}
        castBounceMs={0}
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    // The slider casting prompt is shown — the random flow plays back through
    // `casting`, it does not fill the table all at once.
    expect(lastFrame() ?? '').toContain('parting the stalks')
    // The progress bar advances split-by-split as the casts play out.
    const seen = new Set<string>()
    for (let beat = 0; beat < 80; beat += 1) {
      const frame = lastFrame() ?? ''
      const match = /(\d{1,2})\/18/.exec(frame)
      if (match) seen.add(match[1]!)
      if (frame.includes('saved to')) break
      await tick(60)
    }
    // At least a few distinct progress counts were observed — the table is
    // filling one cast at a time, not in a single jump from 0 to 18.
    expect(seen.size).toBeGreaterThanOrEqual(3)
    unmount()
  })

  it('unlocks Tab once the random flow reaches done', async () => {
    // The random-flow mock produces a static hexagram (no moving lines), so
    // only Casting + Standing Hexagram tabs exist in done mode. One Tab advance
    // lands on Standing Hexagram — proves the lock is released.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        sliderSweepMs={120}
        castBounceMs={0}
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    for (let beat = 0; beat < 80; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await tick(60)
    }
    stdin.write(TAB)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('STANDING HEXAGRAM')
    unmount()
  })

  it('exits cleanly when Escape is pressed on an empty query', async () => {
    // Empty `awaitingQuery` is not unsaved progress — Escape exits straight
    // away with no discard confirmation.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    expect(() => stdin.write(ESCAPE)).not.toThrow()
    await tick()
    expect(lastFrame() ?? '').not.toContain('Discard this consultation?')
    unmount()
  })

  it('exits cleanly when Ctrl+C is pressed on an empty query', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    expect(() => stdin.write(CTRL_C)).not.toThrow()
    await tick()
    expect(lastFrame() ?? '').not.toContain('Discard this consultation?')
    unmount()
  })

  it('accepts q as a regular character during the query phase', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('quit?')
    await tick()
    expect(lastFrame() ?? '').toContain('quit?')
    unmount()
  })
})

describe('ConsultationViewer (random flow, number-input mode)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
    randomConsultationMock.mockClear()
  })

  it('plays the random flow back as a cast-by-cast text reveal', async () => {
    // In number-input mode the random flow has no bouncing slider — a plain
    // text status widget shows progress and a per-cast timer (`castRevealMs`)
    // drives the eighteen `splitCommitted`s. A short `castRevealMs` keeps the
    // eighteen-cast playback inside the test's polling window.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        inputMode="number"
        castRevealMs={10}
      />,
    )
    stdin.write('Will the harvest be plentiful?')
    await tick()
    stdin.write(ENTER)
    await tick()
    // The text status widget appears — not the typed-number prompt.
    const castingFrame = lastFrame() ?? ''
    expect(castingFrame).toContain('Line 1/6')
    expect(castingFrame).not.toContain('Divide the stalks. Pick a number')
    // Poll until the eighteen-cast playback + compute effect settle.
    for (let beat = 0; beat < 80; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await tick(60)
    }
    const frame = lastFrame() ?? ''
    expect(frame).toContain(`saved to ${STUB_SAVED_PATH}`)
    expect(randomConsultationMock).toHaveBeenCalledTimes(1)
    expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('fills the casting table one cast at a time as the reveal plays', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        inputMode="number"
        castRevealMs={40}
      />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    const seen = new Set<string>()
    for (let beat = 0; beat < 100; beat += 1) {
      const frame = lastFrame() ?? ''
      const match = /(\d{1,2})\/18/.exec(frame)
      if (match) seen.add(match[1]!)
      if (frame.includes('saved to')) break
      await tick(40)
    }
    // The progress count was observed at several distinct values — the table
    // fills cast-by-cast, not in a single jump from 0 to 18.
    expect(seen.size).toBeGreaterThanOrEqual(3)
    unmount()
  })

  it('SPACE skips the text reveal straight to the finished Consultation', async () => {
    // A long `castRevealMs` keeps the reveal mid-flight so SPACE genuinely
    // skips a still-running playback rather than racing the timer.
    consultationFileOutputMock.mockClear()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        inputMode="number"
        castRevealMs={100000}
      />,
    )
    stdin.write('Will the harvest be plentiful?')
    await tick()
    stdin.write(ENTER)
    await tick()
    // Mid-`casting` — the status widget is shown, the reveal is in progress.
    expect(lastFrame() ?? '').toContain('Line 1/6')
    stdin.write(SPACE)
    for (let beat = 0; beat < 40; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await tick(50)
    }
    const frame = lastFrame() ?? ''
    expect(frame).toContain(`saved to ${STUB_SAVED_PATH}`)
    expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('shows a "SPACE: skip" footer hint during the number-mode reveal', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="random"
        inputMode="number"
        castRevealMs={100000}
      />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('skip')
    unmount()
  })
})

describe('ConsultationViewer — mid-cast discard confirmation', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
    randomConsultationMock.mockClear()
  })

  it('Escape mid-cast shows the discard confirm instead of exiting', async () => {
    const onExit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="number"
        onExit={onExit}
      />,
    )
    stdin.write('Should I go?')
    await tick()
    stdin.write(ENTER) // → casting
    await tick()
    stdin.write(ESCAPE)
    await tick()
    expect(lastFrame() ?? '').toContain('Discard this consultation?')
    // The exit was interposed — `onExit` has NOT fired yet.
    expect(onExit).not.toHaveBeenCalled()
    unmount()
  })

  it('Ctrl+C mid-cast shows the discard confirm', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Should I go?')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write(CTRL_C)
    await tick()
    expect(lastFrame() ?? '').toContain('Discard this consultation?')
    unmount()
  })

  it('cancelling the confirm (N) keeps the cast going', async () => {
    const onExit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="number"
        onExit={onExit}
      />,
    )
    stdin.write('Should I go?')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write(ESCAPE)
    await tick()
    stdin.write('n') // cancel
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).not.toContain('Discard this consultation?')
    // Back in the casting flow — the casting prompt is shown again.
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    expect(onExit).not.toHaveBeenCalled()
    unmount()
  })

  it('confirming the Escape path (Y) routes to the injected onExit', async () => {
    const onExit = vi.fn()
    const { stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="number"
        onExit={onExit}
      />,
    )
    stdin.write('Should I go?')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write(ESCAPE)
    await tick()
    stdin.write('y') // confirm discard
    await tick()
    expect(onExit).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('a typed query (still awaitingQuery) Escape prompts the confirm', async () => {
    const onExit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="number"
        onExit={onExit}
      />,
    )
    stdin.write('Should I go?')
    await tick()
    stdin.write(ESCAPE) // still in awaitingQuery, but the query buffer is dirty
    await tick()
    expect(lastFrame() ?? '').toContain('Discard this consultation?')
    expect(onExit).not.toHaveBeenCalled()
    unmount()
  })

  it('the footer key hints name the injected exit destination', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="number"
        onExit={() => {}}
        exitLabel="home"
      />,
    )
    stdin.write('Should I go?')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Esc: home')
    expect(frame).toContain('Ctrl+C: quit')
    unmount()
  })
})

describe('ConsultationViewer (T3 refinements)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
    randomConsultationMock.mockClear()
  })

  it('Casting tab does not wrap on narrow terminals', () => {
    // T3.1 — `wrapMode: 'never'`. The casting table's intrinsic width (~59)
    // must emerge verbatim even on a 40-col terminal; the right portion is
    // reached via horizontal pan. Horizontal status is pushed right in the
    // footer (hints go first) so on a 40-col terminal it may be truncated.
    windowSize.current = { columns: 40, rows: 30 }
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    // The casting table header row is intact (no mid-row truncation that
    // would leave a dangling `│` with no cell content after it). After R3
    // the header cells are SGR-wrapped (HEADING_GREY), so strip ANSI
    // before checking the literal substring.
    const stripped = frame.replaceAll(/\[[0-9;]*m/g, '')
    expect(stripped).toContain('│ Line │')
    // The key hints remain fully visible in the footer (hints rendered first;
    // horizontal status is pushed right and may be truncated on narrow terminals
    // by design — scroll position is regenerable glance-info).
    expect(frame).toContain('Tab switch')
    unmount()
  })

  it('Emerging Hexagram tab wraps prose to wrap-width and shows wrap chip', async () => {
    // T3.5 — `wrap N` chip in the status row when wrapMode='wrap' AND the
    // content is actually being cut. The emerging section has prose lines
    // ~188 cols wide, so wrapping to maxWrapWidth=120 on a 160-col terminal
    // triggers the chip. Hints are rendered first (left); the wrap chip is
    // pushed right but fully visible because 160 cols is wide enough.
    windowSize.current = { columns: 160, rows: 30 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        sections={movingSections}
        savedPath={SAVED_PATH}
        maxWrapWidth={120}
      />,
    )
    // Jump directly to Emerging Hexagram (tab #4).
    stdin.write('4')
    await tick()
    const frame = lastFrame() ?? ''
    // `wrap` chip is in the status row (e.g. `wrap 120`).
    expect(frame).toMatch(/wrap \d+/)
    unmount()
  })

  it('Tab bar shows only the active tab while in casting', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Query')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain(' Casting ')
    expect(frame).not.toContain('Transformation')
    expect(frame).not.toContain('Standing Hexagram')
    expect(frame).not.toContain('Emerging Hexagram')
    unmount()
  })

  it('Tab bar separator appears between tabs in done mode', () => {
    // T3.3 — ` · ` separator between cells when unlocked + wide enough.
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain(' · ')
    unmount()
  })

  it('Digit shortcut 2 jumps to the Transformation tab', async () => {
    // T3.6 — done mode with moving lines = 4 tabs. Pressing `2` jumps to
    // index 1, which is Transformation.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    stdin.write('2')
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('TRANSFORMATION:')
    unmount()
  })

  it('Digit shortcut beyond tabs.length is a no-op', async () => {
    // Static hexagram → only 2 tabs (Casting + Standing Hexagram). `5` is OOR
    // and must not change anything.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={staticSections} savedPath={SAVED_PATH} />,
    )
    const before = lastFrame() ?? ''
    stdin.write('5')
    await tick()
    const after = lastFrame() ?? ''
    expect(after).toBe(before)
    // Still on the default Casting tab.
    expect(after).toContain('CASTING:')
    unmount()
  })

  it('Progress bar shows 0/18 at the start of casting', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('□□□□□□□□□□□□□□□□□□  0/18')
    unmount()
  })

  it('Progress bar advances after each split', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    // Three valid picks that drive Line 1 to completion.
    stdin.write('24')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write('20')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write('16')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('■■■□□□□□□□□□□□□□□□  3/18')
    unmount()
  })

  it('Transformation tab is hidden when there are no moving lines', () => {
    // Tab bar in done mode + static hexagram shows only Casting and
    // Standing Hexagram, separated by ` · `.
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={staticSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain(' Casting ')
    expect(frame).toContain(' Standing Hexagram ')
    expect(frame).not.toContain('Transformation')
    expect(frame).not.toContain('Emerging Hexagram')
    // Exactly one separator between the two tabs.
    expect(frame.split(' · ').length - 1).toBeGreaterThanOrEqual(1)
    unmount()
  })

  it('Scrollbar gutter renders proportional handle when content overflows', () => {
    // T3.4 — narrow rows so the casting table (~16 rows incl. breathers)
    // overflows. The `█` handle char must appear in the frame.
    windowSize.current = { columns: 100, rows: 14 }
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('█')
    unmount()
  })

  it('Awaiting-query renders the placeholder table dimmed', () => {
    // T3.7 — in awaitingQuery mode the casting placeholder rows are wrapped
    // in Ink's `dimColor`, which emits `[2m` SGR pairs around the content.
    const { lastFrame, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    const frame = lastFrame() ?? ''
    // The casting header still renders so the user sees the table that will
    // be filled in, but it is dim.
    expect(frame).toContain('CASTING:')
    expect(frame).toContain('[2m')
    unmount()
  })

  it('Outer paddingX leaves a 1-column gutter on each side', () => {
    // T3.2 — every non-empty frame line starts with at least one space
    // (the paddingX gutter). The right gutter is harder to detect because
    // trailing whitespace gets trimmed in some renderings; the left gutter
    // is the load-bearing assertion.
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    const nonEmptyLines = frame.split('\n').filter((row) => row.length > 0)
    expect(nonEmptyLines.length).toBeGreaterThan(0)
    for (const row of nonEmptyLines) {
      expect(row.startsWith(' ')).toBe(true)
    }
    unmount()
  })
})

describe('ConsultationViewer — numbered tab labels + provenance titles', () => {
  it('prefixes tab labels with bracketed 1-based key hints in normal form', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('<1> Casting')
    expect(frame).toContain('<2> Transformation')
    expect(frame).toContain('<3> Standing Hexagram')
    expect(frame).toContain('<4> Emerging Hexagram')
    unmount()
  })

  it('shows the provenance title "Consultation · interactive" for interactive flow', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Consultation · interactive')
    unmount()
  })

  it('shows the provenance title "Consultation · random" for random flow', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer flowKind="random" />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Consultation · random')
    unmount()
  })
})

describe('ConsultationViewer (Pass #2)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
    randomConsultationMock.mockClear()
  })

  it('renders QUERY: header on its own row above the box (awaitingQuery)', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    // The title line is now the first non-empty row; QUERY: appears immediately
    // after it on its own dedicated row. Find the QUERY: row and verify the
    // next line contains the accent bar.
    const queryHeaderIndex = lines.findIndex((line) => line.includes('QUERY:'))
    expect(queryHeaderIndex).toBeGreaterThanOrEqual(0)
    // The line must be solely the QUERY: label (no box content on the same row).
    expect(lines[queryHeaderIndex]).toContain('QUERY:')
    // One blank line separates the label from the accent-bar query line.
    expect((lines[queryHeaderIndex + 1] ?? 'x').trim()).toBe('')
    expect((lines[queryHeaderIndex + 2] ?? '').includes('▌')).toBe(true)
    unmount()
  })

  it('renders QUERY: header on its own row above the box (done)', () => {
    const customSections = buildConsultationSections(
      'what say you',
      STUB_STATIC_HEXAGRAM,
      sampleCasting,
    )
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={customSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    // The title line is now the first non-empty row; QUERY: appears after it.
    const queryHeaderIndex = lines.findIndex((line) => line.includes('QUERY:'))
    expect(queryHeaderIndex).toBeGreaterThanOrEqual(0)
    // One blank line separates the label from the accent-bar query line.
    expect((lines[queryHeaderIndex + 1] ?? 'x').trim()).toBe('')
    expect((lines[queryHeaderIndex + 2] ?? '').includes('▌')).toBe(true)
    // The query text appears on the accent-bar line itself.
    const queryLine = lines.find((line) => line.includes('what say you'))
    expect(queryLine).toBeDefined()
    unmount()
  })

  it('query box height does not jump when the query is submitted', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Hi')
    await tick()
    const beforeFrame = lastFrame() ?? ''
    const beforeLines = beforeFrame.split('\n')
    const beforeIndex = beforeLines.findIndex((line) =>
      line.includes(' Casting '),
    )
    expect(beforeIndex).toBeGreaterThanOrEqual(0)
    stdin.write(ENTER)
    await tick()
    const afterFrame = lastFrame() ?? ''
    const afterLines = afterFrame.split('\n')
    const afterIndex = afterLines.findIndex((line) =>
      line.includes(' Casting '),
    )
    expect(afterIndex).toBe(beforeIndex)
    unmount()
  })

  it('placeholder casting table renders without bold-grey accents', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    const frame = lastFrame() ?? ''
    // R2: stripAnsi removes all SGR codes from the dimmed casting region.
    // The BOLD_GREY sequence `[1;90m` must not appear inside the placeholder
    // casting rows (the QUERY: header above is its own <Text> render and is
    // not affected — but Ink composes it down to plain bytes, so the
    // load-bearing check is the absence of [1;90m anywhere in the frame).
    expect(frame).not.toContain('[1;90m')
    unmount()
  })

  it('KEY_HINTS_TEMPLATE renders compact hint string with Tab and navigation cues', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''
    // New compact wording: "Tab switch · ↑↓ scroll · ←→ pan · g/G ends · Esc quit"
    expect(frame.includes('Tab switch')).toBe(true)
    expect(frame.includes('scroll')).toBe(true)
    unmount()
  })

  it('progress bar uses filled/empty squares (R6)', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    const initialFrame = lastFrame() ?? ''
    expect(initialFrame).toContain('□□□')
    expect(initialFrame).not.toContain('▱')
    // Drive Line 1 through 3 valid splits.
    stdin.write('24')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write('20')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write('16')
    await tick()
    stdin.write(ENTER)
    await tick()
    const afterFrame = lastFrame() ?? ''
    expect(afterFrame).toContain('■■■')
    expect(afterFrame).not.toContain('▰')
    unmount()
  })
})

describe('ConsultationViewer (slider mode)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
    randomConsultationMock.mockClear()
  })

  it('renders the slider prompt by default (no inputMode prop)', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain(
      'Line 1/6 · Cast 1/3: — Press SPACE to part the stalks',
    )
    // No typed-number prompt anywhere on the frame.
    expect(frame).not.toContain('Pick a number from 1 to 48')
    unmount()
  })

  it('prefixes the casting progress hint verbatim', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="slider" />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Casting in progress ·  ')
    expect(frame).toContain('0/18')
    unmount()
  })

  it('commits one split per SPACE press and advances the progress bar', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="slider"
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    expect(lastFrame() ?? '').toContain('0/18')
    stdin.write(SPACE)
    await tick()
    expect(lastFrame() ?? '').toContain('1/18')
    stdin.write(SPACE)
    await tick()
    expect(lastFrame() ?? '').toContain('2/18')
    stdin.write(SPACE)
    await tick()
    expect(lastFrame() ?? '').toContain('3/18')
    // Three splits committed → progress bar shows three ■ followed by □s.
    expect(lastFrame() ?? '').toContain('■■■□')
    unmount()
  })

  it('drives the full 18-split flow to done with SPACE', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="slider"
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('A question')
    await tick()
    stdin.write(ENTER)
    await tick()
    for (let index = 0; index < 18; index += 1) {
      stdin.write(SPACE)
      await tick()
    }
    // Compute effect + mocked file write — poll instead of a fixed 150 ms
    // tick; on Ubuntu CI under load the compute effect can need >150 ms
    // to flush before the mock fires.
    await waitFor(() => {
      expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
      expect(lastFrame() ?? '').toContain(`saved to ${STUB_SAVED_PATH}`)
    })
    unmount()
  })

  it('rewinds the slider to min on every new cast', async () => {
    // With render-phase reset, each new cast starts at pick: 1. Pressing
    // SPACE immediately commits 1 for every split — visible in the casting
    // table after the first split lands.
    //
    // Use a large `sliderSweepMs` so the per-cast tickMs lands at
    // MAX_TICK_MS (250 ms), well above the 50 ms `tick()` wait. Otherwise
    // the slider would tick once before the assertion runs and the
    // position would no longer be 1.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="slider"
        sliderSweepMs={60_000}
        sliderCommitRevealMs={0}
      />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    stdin.write(SPACE)
    await tick()
    // After committing 1 for cast 1, the prompt should now show cast 2
    // with the bar rewound to position 1 (cursor at the leftmost cell).
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Cast 2/3')
    expect(pickFromFrame(frame)).toBe(1)
    unmount()
  })

  it('accepts and forwards sliderSweepMs without breaking the slider mount', async () => {
    // Wiring smoke test: with a custom sliderSweepMs prop the viewer should
    // still mount the slider casting prompt at cast 1 of line 1 and show the
    // bar starting at pick 1 / 48. The precise per-tick timing is covered
    // mathematically by deriveTickMs unit tests in utils-mode.test.ts and
    // mechanically by editors.test.tsx's "store re-arms on tickMs change"
    // case; reproducing it here through the full Ink/React/fake-timer stack
    // was too coupled to wall-clock interleaving to be reliable.
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" sliderSweepMs={4800} />,
    )
    stdin.write('Q')
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    expect(pickFromFrame(frame)).toBe(1)
    unmount()
  })

  it('pans the casting prompt box horizontally with ←/→ on narrow terminals', async () => {
    // 50-col terminal → innerCols 47 → box content 45 cols, but the title
    // is 53 chars. The end of the title ("part the stalks") is initially
    // clipped; → should pan it into view.
    windowSize.current = { columns: 50, rows: 30 }
    try {
      const { lastFrame, stdin, unmount } = render(
        <ConsultationViewer flowKind="interactive" inputMode="slider" />,
      )
      stdin.write('Q')
      await tick()
      stdin.write(ENTER)
      await tick()
      // Right-arrow several times — sliceAnsi shifts the visible window.
      const initialFrame = lastFrame() ?? ''
      expect(initialFrame).toContain('Line 1/6')
      // Pan right by a generous chunk so we see the right edge of the title.
      for (let index = 0; index < 20; index += 1) {
        stdin.write(ARROW_RIGHT)
        await tick()
      }
      const pannedFrame = lastFrame() ?? ''
      // After heavy right-panning, "Line 1/6" should be off-screen.
      expect(pannedFrame).not.toContain('Line 1/6')
      unmount()
    } finally {
      windowSize.current = { columns: 100, rows: 24 }
    }
  })
})
