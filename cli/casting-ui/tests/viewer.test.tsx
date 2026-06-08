import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { buildConsultationSections } from '@hexagram/readout/output-composers'
import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import stringWidth from 'string-width'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MANUAL_GUIDE_TITLE } from '../src/manual-guide.js'
import { ConsultationViewer } from '../src/viewer.js'
import {
  ARROW_DOWN,
  ARROW_RIGHT,
  CTRL_C,
  CTRL_R,
  ENTER,
  ESCAPE,
  SPACE,
  TAB,
} from './helpers/keystrokes.js'
import { pickFromFrame } from './helpers/slider.js'
import {
  STUB_CASTING,
  STUB_SAVED_PATH,
  STUB_STATIC_HEXAGRAM,
} from './helpers/stubs.js'

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
    { pick: 3, recordedMax: 48 },
    { pick: 3, recordedMax: 43 },
    { pick: 3, recordedMax: 35 },
  ]) as CastingRecord
  return vi.fn(() => ({ hexagram: stubHexagram, casting: stubCasting }))
})
vi.mock('@hexagram/core/random-casting', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@hexagram/core/random-casting')>()
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
    await yieldMacrotask()
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
    await yieldMacrotask()
    const afterScroll = lastFrame() ?? ''

    expect(afterScroll).not.toBe(beforeScroll)

    unmount()
  })

  it('does not switch tabs on the arrow keys (arrows are unbound; `<` / `>` pan)', async () => {
    // Use a wide-enough viewport for the 107-col casting table so the
    // keypress is a no-op (no overflow → nothing to scroll). The test
    // verifies the arrow key does not advance the tab — arrows are not
    // bound anywhere in done-mode now that pan moved to `<` / `>`.
    windowSize.current = { columns: 120, rows: 30 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    stdin.write(ARROW_RIGHT)
    await yieldMacrotask()
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
    await yieldMacrotask(120)
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
      await yieldMacrotask()
      expect(lastFrame() ?? '').toContain('(2/4)')

      unmount()
    })

    it('pans wide content horizontally with `<` / `>`', async () => {
      windowSize.current = { columns: 40, rows: 20 }
      const { lastFrame, stdin, unmount } = render(
        <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
      )
      const before = lastFrame() ?? ''

      stdin.write('>')
      await yieldMacrotask()
      const afterRight = lastFrame() ?? ''
      expect(afterRight).not.toBe(before)

      stdin.write('<')
      await yieldMacrotask()
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
    await yieldMacrotask()
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
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    // The pick ceiling is 47, not 48: the recorded max is 48 (= stalks - 1) but
    // a pick of 48 would empty the right heap after the suspended stalk, giving
    // a remainder of 0. The right heap reserves a second, countable stalk.
    expect(frame).toContain('Divide the stalks. Pick a number from 1 to 47')
    // Saved-path line still absent — casting hasn't completed.
    expect(frame).not.toContain('saved to')
    unmount()
  })

  it('auto-scrolls the Casting table to keep the active line visible while casting', async () => {
    // rows 18 with the number prompt box leaves a ~5-row table viewport; the
    // 28-row casting table overflows. Without auto-follow the table sits at the
    // top (line 6) and the line-1 row being cast is off-screen. With it, line 1
    // is pinned into view.
    windowSize.current = { columns: 100, rows: 18 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Hi') // non-empty query
    await yieldMacrotask()
    stdin.write(ENTER) // submit -> casting, line 1 / cast 1
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3') // sanity: in casting mode
    expect(frame).toContain('初1') // line 1 row pinned into view
    expect(frame).not.toContain('上6') // line 6 scrolled off the top
    unmount()
  })

  it('keeps the just-cast line visible after its third cast commits', async () => {
    // Regression: on the third cast the line pointer advances to the next line
    // in the same update that fills the third-cast cell. If the table re-pinned
    // to the NEW active line immediately, line 1's block — including the cell
    // that just filled — would scroll off the bottom before the user could see
    // it. Anchoring the just-completed line keeps line 1 pinned at the bottom
    // while line 2 begins, so the third cast's result stays on screen.
    windowSize.current = { columns: 100, rows: 18 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Hi')
    await yieldMacrotask()
    stdin.write(ENTER) // submit -> casting, line 1 / cast 1
    await yieldMacrotask()
    // Picks (24, 20, 16) are in range for rounds 1/2/3 of an unmodified casting.
    for (const pick of ['24', '20', '16']) {
      stdin.write(pick)
      await yieldMacrotask()
      stdin.write(ENTER)
      await yieldMacrotask()
    }
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 2/6 · Cast 1/3') // advanced to line 2
    expect(frame).toContain('初1') // line 1 still visible — not scrolled off
    unmount()
  })

  it('shows a validation error for out-of-range picks', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Query')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    // 99 is above the round-1 pick ceiling of 47 — pressing Enter should
    // surface the canonical error line and stay on the same cast.
    stdin.write('99')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Pick a number from 1 to 47.')
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    unmount()
  })

  it('advances the prompt to the next line with the correct max after the 3rd cast', async () => {
    // Regression: an earlier design reset the running max from a line-boundary
    // `useEffect` that fired after render, so the first frame after the 3rd cast
    // showed the stale 3rd-cast max (e.g. 1..30) under the new "Line 2 · 1st
    // Cast" title. Now `splitCommitted` advances the reducer's `lineState`
    // synchronously, so the very next render derives the new line's max via
    // `currentRecordedMax`. Validate the prompt is back to 1..47 on the new line
    // (the pick ceiling, one below the recorded round-1 max of 48).
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Query')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    // Picks (24, 20, 16) are within range for rounds 1/2/3 of an unmodified
    // 49-stalk casting and produce a valid Line (6) — concrete enough to
    // exercise the real generator end-to-end rather than mocking it.
    stdin.write('24')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write('20')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write('16')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 2/6 · Cast 1/3')
    expect(frame).toContain('Divide the stalks. Pick a number from 1 to 47')
    // And the previous line's intermediate max must not linger in the frame.
    expect(frame).not.toContain('Pick a number from 1 to 31')
    unmount()
  })

  it('locks Tab while the casting phase is in progress', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Query')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write(TAB)
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    // The casting prompt appears — the random flow enters `casting` mode.
    await yieldMacrotask()
    expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 1/3')
    // Poll until the eighteen-cast playback + compute effect settle.
    for (let beat = 0; beat < 80; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await yieldMacrotask(60)
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask(150)
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    // The random flow is mid-`casting` — the slider is still parting stalks.
    expect(lastFrame() ?? '').toContain('parting the stalks')
    // SPACE skips the rest of the animation.
    stdin.write(SPACE)
    // Let the skip → computing → compute effect → save → done settle.
    for (let beat = 0; beat < 40; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await yieldMacrotask(50)
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
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
      await yieldMacrotask(60)
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
    await yieldMacrotask()
    stdin.write(ENTER)
    for (let beat = 0; beat < 80; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await yieldMacrotask(60)
    }
    stdin.write(TAB)
    await yieldMacrotask()
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
    await yieldMacrotask()
    expect(lastFrame() ?? '').not.toContain('Discard this consultation?')
    unmount()
  })

  it('exits cleanly when Ctrl+C is pressed on an empty query', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    expect(() => stdin.write(CTRL_C)).not.toThrow()
    await yieldMacrotask()
    expect(lastFrame() ?? '').not.toContain('Discard this consultation?')
    unmount()
  })

  it('accepts q as a regular character during the query phase', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('quit?')
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    // The text status widget appears — not the typed-number prompt.
    const castingFrame = lastFrame() ?? ''
    expect(castingFrame).toContain('Line 1/6')
    expect(castingFrame).not.toContain('Divide the stalks. Pick a number')
    // Poll until the eighteen-cast playback + compute effect settle.
    for (let beat = 0; beat < 80; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await yieldMacrotask(60)
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const seen = new Set<string>()
    for (let beat = 0; beat < 100; beat += 1) {
      const frame = lastFrame() ?? ''
      const match = /(\d{1,2})\/18/.exec(frame)
      if (match) seen.add(match[1]!)
      if (frame.includes('saved to')) break
      await yieldMacrotask(40)
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    // Mid-`casting` — the status widget is shown, the reveal is in progress.
    expect(lastFrame() ?? '').toContain('Line 1/6')
    stdin.write(SPACE)
    for (let beat = 0; beat < 40; beat += 1) {
      if ((lastFrame() ?? '').includes('saved to')) break
      await yieldMacrotask(50)
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER) // → casting
    await yieldMacrotask()
    stdin.write(ESCAPE)
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write(CTRL_C)
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write(ESCAPE)
    await yieldMacrotask()
    stdin.write('n') // cancel
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write(ESCAPE)
    await yieldMacrotask()
    stdin.write('y') // confirm discard
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ESCAPE) // still in awaitingQuery, but the query buffer is dirty
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
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
    // The casting ledger header row is intact (no mid-row truncation that
    // would leave a dangling `│` with no cell content after it). After R5
    // the header cells are SGR-wrapped (HEADING_GREY), so strip ANSI
    // before checking the literal substring.
    const stripped = frame.replaceAll(/\[[0-9;]*m/g, '')
    expect(stripped).toContain('爻Line │ 變Cast │')
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
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
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
    await yieldMacrotask()
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
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('□□□□□□□□□□□□□□□□□□  0/18')
    unmount()
  })

  it('Progress bar advances after each split', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    // Three valid picks that drive Line 1 to completion.
    stdin.write('24')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write('20')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write('16')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
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
    await yieldMacrotask()
    const beforeFrame = lastFrame() ?? ''
    const beforeLines = beforeFrame.split('\n')
    const beforeIndex = beforeLines.findIndex((line) =>
      line.includes(' Casting '),
    )
    expect(beforeIndex).toBeGreaterThanOrEqual(0)
    stdin.write(ENTER)
    await yieldMacrotask()
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
    // New compact wording: "Tab switch · ↑↓ scroll · </> pan · g/G ends · Esc quit"
    expect(frame.includes('Tab switch')).toBe(true)
    expect(frame.includes('scroll')).toBe(true)
    unmount()
  })

  it('progress bar uses filled/empty squares (R6)', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="number" />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const initialFrame = lastFrame() ?? ''
    expect(initialFrame).toContain('□□□')
    expect(initialFrame).not.toContain('▱')
    // Drive Line 1 through 3 valid splits.
    stdin.write('24')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write('20')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    stdin.write('16')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain(
      'Line 1/6 · Cast 1/3: — Press SPACE to part the stalks',
    )
    // No typed-number prompt anywhere on the frame.
    expect(frame).not.toContain('Pick a number from 1 to 47')
    unmount()
  })

  it('prefixes the casting progress hint verbatim', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" inputMode="slider" />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Casting in progress ·  ')
    expect(frame).toContain('0/18')
    unmount()
  })

  it('commits one split per SPACE press and advances the progress bar', async () => {
    // The `onSliderReady` spy is forwarded to the slider-mode
    // `<CastingPromptBox onReady>` and fired exactly once per mount, AFTER
    // `useSliderBounce`'s `useInput` has registered with Ink's stdin
    // dispatcher. Each cast remounts a fresh slider, so the spy accumulates
    // one call per ready cast — we gate the Nth SPACE on
    // `toHaveBeenCalledTimes(N)` to dodge the bind-race window on Windows
    // GHA. This replaces the prior Braille-spinner-glyph poll (anti-fix 4
    // from the ink-useinput-bind skill: an incidental render artefact as
    // the witness signal).
    const onSliderReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="slider"
        sliderCommitRevealMs={0}
        onSliderReady={onSliderReady}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitForReady(onSliderReady)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('0/18')
    })
    stdin.write(SPACE)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('1/18')
    })
    await waitFor(() => {
      expect(onSliderReady).toHaveBeenCalledTimes(2)
    })
    stdin.write(SPACE)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('2/18')
    })
    await waitFor(() => {
      expect(onSliderReady).toHaveBeenCalledTimes(3)
    })
    stdin.write(SPACE)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('3/18')
    })
    // Three splits committed → progress bar shows three ■ followed by □s.
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('■■■□')
    })
    unmount()
  })

  it('drives the full 18-split flow to done with SPACE', async () => {
    // `onSliderReady` accumulates one call per cast mount; each iteration
    // gates its SPACE on `toHaveBeenCalledTimes(index + 1)` so the press
    // only lands AFTER the Nth cast's `useInput` has registered. This
    // eliminates the dropped-SPACE race during the cross-cast unmount/remount
    // window on Windows GHA, where a bare `tick()` is too short on a
    // saturated runner and a single dropped SPACE stalled the whole flow.
    const onSliderReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="slider"
        sliderCommitRevealMs={0}
        onSliderReady={onSliderReady}
      />,
    )
    stdin.write('A question')
    await yieldMacrotask()
    stdin.write(ENTER)
    // The final iteration (index=17) commits cast 18 and transitions the
    // viewer to `computing → done` in the same cycle — the progress bar is
    // no longer rendered, so `18/18` never appears in the frame. The outer
    // `waitFor(consultationFileOutputMock)` is the gate for that step.
    for (let index = 0; index < 18; index += 1) {
      const readyCalls = index + 1
      await waitFor(() => {
        expect(onSliderReady).toHaveBeenCalledTimes(readyCalls)
      })
      stdin.write(SPACE)
      if (index < 17) {
        const expected = `${index + 1}/18`
        await waitFor(() => {
          expect(lastFrame() ?? '').toContain(expected)
        })
      }
    }
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
    const onSliderReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="interactive"
        inputMode="slider"
        sliderSweepMs={60_000}
        sliderCommitRevealMs={0}
        onSliderReady={onSliderReady}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    // Wait for cast 1's slider to bind input before the first SPACE — bare
    // `tick()` races the mount on Windows GHA and the SPACE was dropped.
    await waitForReady(onSliderReady)
    stdin.write(SPACE)
    // Wait for cast 2's chrome to render. The `pickFromFrame(frame)`
    // assertion below requires the cursor to still be at position 1, so we
    // intentionally do NOT poll on cast 2's `onSliderReady` (which would
    // tolerate microtasks while the slider's setInterval — with the
    // 60_000 ms sweep → ~1.3 s tickMs — has not yet fired). The chrome
    // assertion is sufficient: `Cast 2/3` only appears after the new mount
    // has committed.
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Cast 2/3')
    })
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
    await yieldMacrotask()
    stdin.write(ENTER)
    await yieldMacrotask()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    expect(pickFromFrame(frame)).toBe(1)
    unmount()
  })

  it('pans the casting prompt box horizontally with `<` / `>` on narrow terminals', async () => {
    // 50-col terminal → innerCols 47 → box content 45 cols, but the title
    // is 53 chars. The end of the title ("part the stalks") is initially
    // clipped; `>` should pan it into view.
    windowSize.current = { columns: 50, rows: 30 }
    try {
      const { lastFrame, stdin, unmount } = render(
        <ConsultationViewer flowKind="interactive" inputMode="slider" />,
      )
      stdin.write('Q')
      await yieldMacrotask()
      stdin.write(ENTER)
      await yieldMacrotask()
      // `>` several times — sliceAnsi shifts the visible window.
      const initialFrame = lastFrame() ?? ''
      expect(initialFrame).toContain('Line 1/6')
      // Pan right by a generous chunk so we see the right edge of the title.
      for (let index = 0; index < 20; index += 1) {
        stdin.write('>')
        await yieldMacrotask()
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

// Decompose a pick into the (pilesL, remL, pilesR, remR) tuple the manual
// prompt expects. Yarrow convention: divisible-by-4 → remainder 4 (never 0).
// Right side: rightCount = (unparted - pick) - 1 (the 1-from-right is
// suspended on every round under the corrected fourOperations pipeline).
function decomposeManualPick(
  pick: number,
  unparted: number,
): { pilesL: string; remL: string; pilesR: string; remR: string } {
  const remL = ((pick - 1) % 4) + 1
  const pilesL = (pick - remL) / 4
  const rightCount = unparted - pick - 1
  const remR = ((rightCount - 1) % 4) + 1
  const pilesR = (rightCount - remR) / 4
  return {
    pilesL: String(pilesL),
    remL: String(remL),
    pilesR: String(pilesR),
    remR: String(remR),
  }
}

describe('ConsultationViewer (manual flow)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
  })

  // Helper: drive one manual cast through the prompt's four fields. Uses
  // `onManualPromptReady` as the mount witness and `onFocusedFieldChange` as
  // the per-field focus witness so cross-cast Tab/digit pairs never land
  // during Ink's `useInput` bind race.
  async function commitManualCast(
    stdin: { write: (data: string) => unknown },
    fields: { pilesL: string; remL: string; pilesR: string; remR: string },
    onReady: ReturnType<typeof vi.fn>,
    expectedReadyCount: number,
    onFocusedFieldChange: ReturnType<typeof vi.fn>,
  ): Promise<void> {
    await waitFor(() =>
      expect(onReady).toHaveBeenCalledTimes(expectedReadyCount),
    )
    const baseFocusCalls = onFocusedFieldChange.mock.calls.length
    stdin.write(fields.pilesL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() => {
      const calls = onFocusedFieldChange.mock.calls
      const recent = calls.slice(baseFocusCalls).map((args) => args[0])
      expect(recent).toContain('remL')
    })
    stdin.write(fields.remL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() => {
      const calls = onFocusedFieldChange.mock.calls
      const recent = calls.slice(baseFocusCalls).map((args) => args[0])
      expect(recent).toContain('pilesR')
    })
    stdin.write(fields.pilesR)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() => {
      const calls = onFocusedFieldChange.mock.calls
      const recent = calls.slice(baseFocusCalls).map((args) => args[0])
      expect(recent).toContain('remR')
    })
    stdin.write(fields.remR)
    await yieldMacrotask()
    stdin.write(ENTER)
  }

  it('reveals the manual prompt once the query is submitted', async () => {
    // The 24-row manual prompt needs a tall terminal so the COUNTED/MISSING
    // gauge at its foot isn't clipped (default test height is 24).
    windowSize.current = { columns: 100, rows: 40 }
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
      />,
    )
    stdin.write('A question')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3 · Step 1/4')
    expect(frame).toContain('LEFT HEAP')
    expect(frame).toContain('RIGHT HEAP')
    expect(frame).toContain('How many piles of 4 stalks in the LEFT heap?')
    // Nothing typed → COUNTED 1 (suspended stalk), MISSING 48 (49 − 1).
    expect(frame).toContain('MISSING STALKS')
    expect(frame).toContain('48')
    unmount()
  })

  it('advances cast-by-cast as the user transcribes piles + remainder', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
        onManualFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    // First cast: pick = 24, unparted = 49 → pL=5, rL=4, pR=5, rR=4
    await commitManualCast(
      stdin,
      decomposeManualPick(24, 49),
      onReady,
      1,
      onFocusedFieldChange,
    )
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 2/3')
    })
    unmount()
  })

  it('Ctrl+R mid-line clears the current line back to cast 1', async () => {
    // The 24-row manual prompt needs a tall terminal so the COUNTED/MISSING
    // gauge at its foot isn't clipped (default test height is 24).
    windowSize.current = { columns: 100, rows: 40 }
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
        onManualFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    // Commit cast 1, arrive at cast 2.
    await commitManualCast(
      stdin,
      decomposeManualPick(24, 49),
      onReady,
      1,
      onFocusedFieldChange,
    )
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 2/3')
    })
    // Ctrl+R should rewind to cast 1 of the same line.
    stdin.write(CTRL_R)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 1/3')
    })
    // The MISSING gauge reverts to the round-1 reading: COUNTED 1 (just the
    // always-suspended stalk), MISSING 48, since no piles/remainders are
    // filled yet.
    // oxlint-disable-next-line no-control-regex
    const reverted = (lastFrame() ?? '').replaceAll(/\u001B\[[0-9;]*m/g, '')
    expect(reverted).toMatch(/COUNTED STALKS:\s+- 1/)
    expect(reverted).toMatch(/MISSING STALKS\s+48/)
    unmount()
  })

  it('Ctrl+R after a line completes rewinds to the previous line', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
        onManualFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    // Complete line 1 with three valid casts: (24, 49), (20, 40), (16, 32).
    // Each produces line value 6 → moving yin.
    await commitManualCast(
      stdin,
      decomposeManualPick(24, 49),
      onReady,
      1,
      onFocusedFieldChange,
    )
    await commitManualCast(
      stdin,
      decomposeManualPick(20, 40),
      onReady,
      2,
      onFocusedFieldChange,
    )
    await commitManualCast(
      stdin,
      decomposeManualPick(16, 32),
      onReady,
      3,
      onFocusedFieldChange,
    )
    // Line 2 cast 1 should now be on screen.
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Line 2/6 · Cast 1/3')
    })
    // Ctrl+R: per spec, with castIndex=0 and lineIndex=1, rewind drops back
    // to line 1 cast 1 (the most recently completed line).
    stdin.write(CTRL_R)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 1/3')
    })
    unmount()
  })

  it('Ctrl+R at line 1 cast 1 is a no-op', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitForReady(onReady)
    const before = lastFrame() ?? ''
    stdin.write(CTRL_R)
    await yieldMacrotask()
    // Frame unchanged — still Line 1/6 · Cast 1/3, no rewind occurred.
    expect(lastFrame() ?? '').toBe(before)
    expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 1/3')
    unmount()
  })

  it('after a Ctrl+R rewind, the first digit lands in the pilesL field', async () => {
    // The 24-row manual prompt needs a tall terminal so the COUNTED/MISSING
    // gauge at its foot isn't clipped (default test height is 24).
    windowSize.current = { columns: 100, rows: 40 }
    // Focus regression — Ctrl+R must remount the prompt with focusedField =
    // 'pilesL' so the next keystroke writes into pilesL. Verifiable via the
    // resolved-state numbers: after rewind, type pL=5, rL=4, pR=5, rR=4 →
    // a valid commit with `total 48 of 49` (LEFT=24, RIGHT=24, split=24).
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
        onManualFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    await commitManualCast(
      stdin,
      decomposeManualPick(24, 49),
      onReady,
      1,
      onFocusedFieldChange,
    )
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 2/3')
    })
    stdin.write(CTRL_R)
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Line 1/6 · Cast 1/3')
    })
    // After rewind, the prompt remounts → pilesL is focused. Type a valid
    // four-field round-1 input (24/49) and verify SPLIT lands on 24.
    const baseFocusCalls = onFocusedFieldChange.mock.calls.length
    const fields = decomposeManualPick(24, 49)
    stdin.write(fields.pilesL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() => {
      const recent = onFocusedFieldChange.mock.calls
        .slice(baseFocusCalls)
        .map((args) => args[0])
      expect(recent).toContain('remL')
    })
    stdin.write(fields.remL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() => {
      const recent = onFocusedFieldChange.mock.calls
        .slice(baseFocusCalls)
        .map((args) => args[0])
      expect(recent).toContain('pilesR')
    })
    stdin.write(fields.pilesR)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() => {
      const recent = onFocusedFieldChange.mock.calls
        .slice(baseFocusCalls)
        .map((args) => args[0])
      expect(recent).toContain('remR')
    })
    stdin.write(fields.remR)
    await waitFor(() => {
      // After all four fields are typed (cast 1, M=49, pL=5, rL=4, pR=5, rR=4),
      // the validator passes: COUNTED 24 + 24 + 1 = 49, MISSING 0 — proving
      // the digits landed in the right fields starting from pilesL.
      // oxlint-disable-next-line no-control-regex
      const stripped = (lastFrame() ?? '').replaceAll(/\u001B\[[0-9;]*m/g, '')
      expect(stripped).toMatch(/COUNTED STALKS:\s+- 49/)
      expect(stripped).toMatch(/MISSING STALKS\s+0/)
    })
    unmount()
  })

  // ── Phase 7 — Byte-identity invariant ──────────────────────────────────
  //
  // Spec Q6: the saved consultation file's schema is unchanged across all
  // three flows. No provenance field, no flow-conditional save path. The
  // invariant: given the same casting input, manual and interactive must
  // hand `saveConsultationFile` byte-identical `{ query, hexagram, casting }`.
  // If this assertion ever fails, audit Phases 1–4 — a provenance leak has
  // slipped in. Do NOT relax the comparison.
  it('manual flow saves byte-identical to interactive for the same casting record', async () => {
    // Picks (24, 20, 16) are valid for rounds 1/2/3 across all six lines
    // and produce Line 6 (moving yin) every time → hexagram [6,6,6,6,6,6].
    // 18 picks in a single flat array, line-major: cast 0 of line 0, cast 1
    // of line 0, …, cast 2 of line 5. Unparted counts cycle 49 → 40 → 32.
    const picks: number[] = []
    const unpartedByCast: number[] = []
    for (let line = 0; line < 6; line += 1) {
      picks.push(24, 20, 16)
      unpartedByCast.push(49, 40, 32)
    }

    // Drive interactive (number-input) flow to capture saveConsultationFile's
    // call arguments. Reset the file-output mock first so we observe only
    // this run's call. Wait for the next cast's prompt to appear in the
    // frame before sending the next pick — yieldMacrotask alone is too
    // short to span every commit + re-render on a saturated CI runner.
    consultationFileOutputMock.mockClear()
    {
      const { stdin, lastFrame, unmount } = render(
        <ConsultationViewer flowKind="interactive" inputMode="number" />,
      )
      stdin.write('A grounded query')
      await yieldMacrotask()
      stdin.write(ENTER)
      for (const [i, pick] of picks.entries()) {
        const lineNumber = Math.floor(i / 3) + 1
        const castIndex = (i % 3) + 1
        await waitFor(() => {
          expect(lastFrame() ?? '').toContain(
            `Line ${lineNumber}/6 · Cast ${castIndex}/3`,
          )
        })
        stdin.write(String(pick))
        await yieldMacrotask()
        stdin.write(ENTER)
      }
      await waitFor(() => {
        expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
      })
      unmount()
    }
    const interactiveArgs = (
      consultationFileOutputMock.mock.calls as unknown as Array<
        [{ query: string; hexagram: Hexagram; casting: CastingRecord }]
      >
    )[0]?.[0]

    // Drive manual flow with the same 18 picks decomposed into the 4-field
    // tuple `(pilesL, remL, pilesR, remR)` per cast. manualRevealMs=0 skips
    // the reveal dwell; `onManualPromptReady` is the per-cast mount witness
    // and `onManualFocusedFieldChange` is the per-field focus witness — the
    // two together let us write digits and Tabs without ever racing the
    // bind-race window. Decomposition pinned by `performCast`:
    //   (24, 49) → (5, 4, 5, 4)
    //   (20, 40) → (4, 4, 4, 3)
    //   (16, 32) → (3, 4, 3, 3)
    consultationFileOutputMock.mockClear()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    {
      const { stdin, unmount } = render(
        <ConsultationViewer
          flowKind="manual"
          inputMode="number"
          manualRevealMs={0}
          onManualPromptReady={onReady}
          onManualFocusedFieldChange={onFocusedFieldChange}
        />,
      )
      stdin.write('A grounded query')
      await yieldMacrotask()
      stdin.write(ENTER)
      for (const [i, pick] of picks.entries()) {
        const unparted = unpartedByCast[i]!
        const fields = decomposeManualPick(pick!, unparted)
        await commitManualCast(
          stdin,
          fields,
          onReady,
          i + 1,
          onFocusedFieldChange,
        )
      }
      await waitFor(() => {
        expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
      })
      unmount()
    }
    const manualArgs = (
      consultationFileOutputMock.mock.calls as unknown as Array<
        [{ query: string; hexagram: Hexagram; casting: CastingRecord }]
      >
    )[0]?.[0]

    // The same call args → the same saved file. saveConsultationFile is a
    // pure function of its input plus a per-call timestamp it generates
    // internally; identical input means an identical body block and the
    // only divergence is the timestamp.
    expect(manualArgs).toBeDefined()
    expect(interactiveArgs).toBeDefined()
    expect(manualArgs?.query).toBe(interactiveArgs?.query)
    expect(manualArgs?.hexagram).toEqual(interactiveArgs?.hexagram)
    expect(manualArgs?.casting).toEqual(interactiveArgs?.casting)
  }, 30_000)

  it('the casting footer carries the Tab/Shift+Tab field + Ctrl+R rewind line hints', async () => {
    // Wide terminal so the manual-flow hint string ("Enter: commit ·
    // Tab/Shift+Tab: field · Esc: home · Ctrl+C: quit · Ctrl+R rewind line")
    // fits without truncation. The default 100-col viewport elides the
    // rewind suffix mid-token.
    windowSize.current = { columns: 160, rows: 30 }
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
        onManualFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    stdin.write('Q')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitForReady(onReady)
    // At line 1 cast 1 the rewind hint is suppressed (nothing to rewind).
    const initialFrame = lastFrame() ?? ''
    // The canonical field-cycling hint comes from `keyHintsForCasting`.
    expect(initialFrame).toContain('Tab/Shift+Tab: field')
    // The dropped duplicate (viewer-side `· Tab field` append) must not
    // resurface. The leading `· ` separator distinguishes it from the
    // canonical hint above (which also contains the substring "Tab field"
    // but only as part of "Tab/Shift+Tab: field").
    expect(initialFrame).not.toContain('· Tab field')
    expect(initialFrame).not.toContain('Ctrl+R rewind line')
    // After committing one cast, Ctrl+R is meaningful → hint appears.
    await commitManualCast(
      stdin,
      decomposeManualPick(24, 49),
      onReady,
      1,
      onFocusedFieldChange,
    )
    await waitFor(() => {
      expect(lastFrame() ?? '').toContain('Ctrl+R rewind line')
    })
    unmount()
  })
})

describe('ConsultationViewer (manual help overlay)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
  })

  // Drive a fresh manual viewer up to the first cast prompt. Returns the
  // ink-testing-library handles plus the prompt-ready spy so callers can gate
  // cross-state keystrokes on remounts.
  async function openManualToCasting(): Promise<{
    lastFrame: () => string | undefined
    stdin: { write: (data: string) => unknown }
    unmount: () => void
    onReady: ReturnType<typeof vi.fn>
  }> {
    // The 24-row manual prompt needs a tall terminal so the gauge isn't clipped.
    windowSize.current = { columns: 100, rows: 40 }
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        flowKind="manual"
        inputMode="number"
        manualRevealMs={0}
        onManualPromptReady={onReady}
      />,
    )
    stdin.write('A question')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitForReady(onReady)
    return { lastFrame, stdin, unmount, onReady }
  }

  it('advertises the ? help affordance in the casting footer', async () => {
    const { lastFrame, unmount } = await openManualToCasting()
    expect(lastFrame() ?? '').toContain('?: help')
    unmount()
  })

  it('opens the full-screen guide on ? and returns to casting on Escape', async () => {
    const { lastFrame, stdin, unmount, onReady } = await openManualToCasting()
    // The casting screen is showing the prompt, not the guide.
    expect(lastFrame() ?? '').toContain('LEFT HEAP')
    expect(lastFrame() ?? '').not.toContain(MANUAL_GUIDE_TITLE)

    stdin.write('?')
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain(MANUAL_GUIDE_TITLE)
      expect(frame).toContain('The four operations')
    })
    // The casting prompt is gone while the guide is up.
    expect(lastFrame() ?? '').not.toContain('LEFT HEAP')

    // Escape closes the guide; the prompt remounts (ready fires a 2nd time).
    stdin.write(ESCAPE)
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
    const back = lastFrame() ?? ''
    expect(back).toContain('LEFT HEAP')
    expect(back).not.toContain(MANUAL_GUIDE_TITLE)
    unmount()
  })

  it('closes the guide on a second ?', async () => {
    const { lastFrame, stdin, unmount, onReady } = await openManualToCasting()
    stdin.write('?')
    await waitFor(() => expect(lastFrame() ?? '').toContain(MANUAL_GUIDE_TITLE))
    stdin.write('?')
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))
    expect(lastFrame() ?? '').not.toContain(MANUAL_GUIDE_TITLE)
    unmount()
  })

  it('preserves in-progress typing across opening and closing the guide', async () => {
    const { lastFrame, stdin, unmount, onReady } = await openManualToCasting()
    // Nothing typed yet → MISSING shows 48 (49 unparted − 1 suspended).
    expect(lastFrame() ?? '').toContain('48')

    // Type 5 piles into the (focused) LEFT pile field → counted 21, missing 28.
    stdin.write('5')
    await waitFor(() => expect(lastFrame() ?? '').toContain('28'))
    expect(lastFrame() ?? '').not.toContain('48')

    // Open the guide (prompt unmounts) and close it (prompt remounts).
    stdin.write('?')
    await waitFor(() => expect(lastFrame() ?? '').toContain(MANUAL_GUIDE_TITLE))
    stdin.write(ESCAPE)
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2))

    // The typed 5 survived the remount: still MISSING 28, not the fresh 48.
    const back = lastFrame() ?? ''
    expect(back).toContain('28')
    expect(back).not.toContain('48')
    unmount()
  })
})
