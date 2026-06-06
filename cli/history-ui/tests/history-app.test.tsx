import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  markdownConsultationBody,
  serializeFrontmatter,
  type ConsultationEnvelope,
} from '@hexagram/consultation-file'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HistoryApp } from '../src/history-app.js'

// Matches ANSI SGR escape sequences (ESC[...m). Stripped before assertions
// so text matching is robust to Ink's colour codes.
const ANSI_PATTERN = new RegExp(
  String.raw`${String.fromCodePoint(0x1b)}\[[0-9;]*m`,
  'g',
)
function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

/**
 * Poll `predicate()` until it returns truthy (or `undefined`, treated as
 * truthy when the predicate is purely an assertion) or `timeoutMs` elapses.
 * Catches and retries on thrown errors, so an `expect(...)` assertion can be
 * dropped in directly — the assertion *is* the condition. On the final retry
 * the cached error is re-thrown, giving a useful failure message instead of
 * a bare timeout. See the `cross-platform-tests` skill for the canonical
 * pattern.
 */
async function waitFor<T>(
  predicate: () => T | Promise<T>,
  {
    timeoutMs = 15_000,
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

/**
 * Block until the `<HistoryApp>` has finished its initial `scanConsultations`
 * pass — i.e. the post-scan list heading (`Past Consultations · …`) or the
 * empty-state header (`No consultations yet.`) is rendered, *not* the
 * transient `Loading consultations from …` placeholder. Use this in place of
 * a blind macrotask yield right after `render(<HistoryApp …/>)` so subsequent
 * `stdin.write(...)` calls land on a list whose `useInput` handler has a
 * focused row to act on.
 */
async function awaitListReady(
  lastFrame: () => string | undefined,
): Promise<void> {
  await waitFor(() => {
    const frame = stripAnsi(lastFrame() ?? '')
    if (frame.includes('Loading consultations')) return false
    return (
      frame.includes('Past Consultations') ||
      frame.includes('No consultations yet.')
    )
  })
}

/**
 * Press `key` and wait until `predicate(frame)` becomes truthy. On each retry
 * tick the key is re-written — fixes the `useInput` listener-bind race on
 * Windows GHA. Ink dispatches stdin to whatever `useInput` callbacks are
 * currently registered; between `<HistoryApp>`'s first render (scan loading
 * screen) and `<HistoryList>`'s `useEffect` firing to register its own
 * `useInput`, the parent's Ctrl+C-only handler is the sole subscriber and
 * silently swallows the bytes. Capped at 10 retries (~200 ms of writes) so a
 * genuinely missing precondition still surfaces as a timeout, not a hang.
 * Retries are safe because every state-transitioning keystroke this helper
 * fires is idempotent past the transition: ENTER on a row is debounced by
 * `onPick`'s `if (state.loading) return`; Ctrl+D is early-returned by the
 * modal-open branch; 'y' / 'n' / '/' on the list are unbound keys in their
 * post-transition view; the unmounted `<HistoryList>` simply receives no
 * dispatches at all.
 */
async function pressUntil(
  stdin: { write: (text: string) => void },
  lastFrame: () => string | undefined,
  key: string,
  predicate: (frame: string) => boolean | Promise<boolean>,
): Promise<void> {
  const MAX_RETRIES = 10
  let attempts = 0
  await waitFor(async () => {
    if (await predicate(stripAnsi(lastFrame() ?? ''))) return true
    if (attempts < MAX_RETRIES) {
      stdin.write(key)
      attempts += 1
    }
    return false
  })
}

const ESC = String.fromCodePoint(0x1b)
const ENTER = '\r'
const CTRL_D = String.fromCodePoint(0x04)

const CASTING: CastingRecord = Array.from({ length: 6 }, () => [
  { pick: 1, max: 48 },
  { pick: 2, max: 43 },
  { pick: 3, max: 39 },
]) as CastingRecord

/** A consultation with moving lines (6 and 9 present → all four tabs). */
const MOVING_ENVELOPE: ConsultationEnvelope = {
  schemaVersion: 1,
  timestamp: '2025-08-13T09:02:14+0800',
  query: 'Why did this happen?',
  hexagram: [6, 7, 8, 9, 7, 8] as Hexagram,
  casting: CASTING,
}

/** A consultation with a null casting — e.g. migrated from a legacy `.txt`. */
const NULL_CASTING_ENVELOPE: ConsultationEnvelope = {
  schemaVersion: 1,
  timestamp: '2024-02-01T11:30:00+0800',
  query: 'A consultation with no recorded casting.',
  hexagram: [7, 7, 7, 7, 7, 7] as Hexagram,
  casting: null,
}

/** A second, older consultation — used for multi-row delete tests. */
const SECOND_ENVELOPE: ConsultationEnvelope = {
  schemaVersion: 1,
  timestamp: '2024-06-09T18:45:00+0800',
  query: 'Should I take the contract in Berlin?',
  hexagram: [7, 8, 7, 8, 7, 8] as Hexagram,
  casting: CASTING,
}

let tmpDir: string

/** Write a consultation `.md` file with a freshly-rendered (in-sync) body. */
async function writeFresh(envelope: ConsultationEnvelope): Promise<string> {
  const body = markdownConsultationBody(
    envelope.query,
    envelope.hexagram,
    envelope.casting,
  )
  const filePath = path.join(
    tmpDir,
    `consultation-${envelope.timestamp.replaceAll(':', '-')}.md`,
  )
  await fs.writeFile(filePath, serializeFrontmatter(envelope, body), 'utf8')
  return filePath
}

/** Write a consultation `.md` file whose body has drifted from the renderer. */
async function writeStale(envelope: ConsultationEnvelope): Promise<string> {
  const filePath = path.join(
    tmpDir,
    `consultation-${envelope.timestamp.replaceAll(':', '-')}.md`,
  )
  await fs.writeFile(
    filePath,
    serializeFrontmatter(envelope, 'STALE BODY'),
    'utf8',
  )
  return filePath
}

beforeEach(async () => {
  // Created *under* `process.cwd()` (not `os.tmpdir()`) so that the
  // `path.relative(process.cwd(), …)` shown in the `✓ Deleted …` /
  // `Failed to delete …` status line stays short — the status line is
  // rendered with `truncateStart` (tail-keeping), so a deep `/var/folders/…`
  // tmp path would truncate the human-readable prefix off the visible width.
  tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'history-app-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('<HistoryApp> — loaded readout title', () => {
  it('shows "Consultation · loaded <timestamp>" as the readout title (no Past adjective)', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Consultation · loaded 2025-08-13 09:02'),
    )
    const frame = stripAnsi(lastFrame() ?? '')
    // "Past Consultation" must NOT appear as a readout title adjective.
    // The list heading "Past Consultations" is still correct; it is only
    // present on the list screen, not on the readout screen.
    expect(frame).not.toContain('Past Consultation')
  })

  it('history list heading remains "Past Consultations" (not affected)', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    expect(stripAnsi(lastFrame() ?? '')).toContain('Past Consultations')
  })

  it('tab labels are numbered in the readout', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('<1> Casting'),
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('<2> Transformation')
    expect(frame).toContain('<3> Standing Hexagram')
    expect(frame).toContain('<4> Emerging Hexagram')
  })

  it('loaded readout footer says "Esc back to history"', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Esc back to history'),
    )
    expect(stripAnsi(lastFrame() ?? '')).not.toContain('Esc quit')
  })
})

describe('<HistoryApp> — loaded readout', () => {
  it('opens the four-tab readout with the loaded-timestamp title on Enter', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Consultation · loaded 2025-08-13 09:02'),
    )
    const frame = stripAnsi(lastFrame() ?? '')
    // All four tabs available in the unlocked `done` state.
    expect(frame).toContain('Casting')
    expect(frame).toContain('Transformation')
    expect(frame).toContain('Standing Hexagram')
    expect(frame).toContain('Emerging Hexagram')
  })

  it('shows "Casting not recorded" for a null-casting consultation', async () => {
    await writeFresh(NULL_CASTING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Consultation · loaded 2024-02-01 11:30'),
    )
    expect(stripAnsi(lastFrame() ?? '')).toContain('Casting not recorded')
  })

  it('shows the body-refreshed notice when the on-disk body had drifted', async () => {
    const filePath = await writeStale(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Body refreshed; data unchanged.'),
    )
    // The drifted file was rewritten in place.
    const after = await fs.readFile(filePath, 'utf8')
    expect(after).not.toContain('STALE BODY')
    expect(after).toContain('## QUERY')
  })

  it('does not show the notice — and leaves the file untouched — when the body matched', async () => {
    const filePath = await writeFresh(MOVING_ENVELOPE)
    const before = await fs.stat(filePath)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    // Wait until the readout has loaded — only then can we assert that the
    // body-refreshed notice is absent (rather than racing a still-loading
    // list view that incidentally also lacks the notice).
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Consultation · loaded'),
    )
    expect(stripAnsi(lastFrame() ?? '')).not.toContain('Body refreshed')
    // Byte-identical body → no write, no mtime bump.
    const after = await fs.stat(filePath)
    expect(after.mtimeMs).toBe(before.mtimeMs)
  })

  it('ESC from the readout returns to the list (does not exit)', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Consultation · loaded'),
    )
    stdin.write(ESC)
    await waitFor(() => {
      const frame = stripAnsi(lastFrame() ?? '')
      expect(frame).toContain('Past Consultations')
      expect(frame).not.toContain('Consultation · loaded')
    })
  })

  it('returning from the readout restores focus to the loaded row', async () => {
    // Two consultations: MOVING (2025) is newest → row 0; SECOND (2024) → row 1.
    await writeFresh(MOVING_ENVELOPE)
    await writeFresh(SECOND_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    // Move focus down to the second row (Berlin), then load it. The down
    // arrow is the first cross-state keystroke and must beat the
    // `<HistoryList>` `useInput` bind race — `pressUntil` retries (clamped
    // by the reducer's `Math.min(..., size - 1)`) until the row 1 query is
    // riding the inverse-video focus bar.
    await pressUntil(stdin, lastFrame, `${ESC}[B`, () => {
      const inverseLines = (lastFrame() ?? '')
        .split('\n')
        .filter((l) => l.includes(`${ESC}[7m`))
      return inverseLines.some((l) => l.includes('Berlin'))
    })
    stdin.write(ENTER)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Consultation · loaded')
    })
    // Return to the list.
    stdin.write(ESC)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Past Consultations')
    })
    // The second row (SECOND_ENVELOPE) is focused again — its query rides the
    // inverse-video bar; the first row's query (MOVING) does not.
    const inverseLines = (lastFrame() ?? '')
      .split('\n')
      .filter((l) => l.includes(`${ESC}[7m`))
    expect(inverseLines.some((l) => l.includes('Berlin'))).toBe(true)
    expect(inverseLines.some((l) => l.includes('happen'))).toBe(false)
  })
})

describe('<HistoryApp> — Ctrl+D delete', () => {
  it('Ctrl+D then y unlinks the focused file and drops the row from the list', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    await writeFresh(SECOND_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    // Newest-first → MOVING_ENVELOPE (2025) is focused at the top.
    expect(stripAnsi(lastFrame() ?? '')).toContain('happen')
    // Ctrl+D opens the confirm modal — the first cross-state keystroke, so
    // retry through `pressUntil` to beat the `<HistoryList>` useInput bind.
    await pressUntil(stdin, lastFrame, CTRL_D, (frame) =>
      frame.includes('Delete consultation'),
    )
    // 'y' confirms — the modal's own `useInput` may also race the bind on
    // Windows GHA, so retry until the file is gone. Once unlinked, 'y' is
    // an unbound key in the list and is silently consumed.
    await pressUntil(stdin, lastFrame, 'y', async () => {
      try {
        await fs.access(movingPath)
        return false
      } catch {
        return true
      }
    })
    // On a slow runner the list re-render can lag the in-app `fs.unlink`
    // resolution by one or two paints — poll the frame as well.
    await waitFor(() => {
      const frame = stripAnsi(lastFrame() ?? '')
      // The deleted row disappears; the surviving row stays.
      expect(frame).not.toContain('happen')
      expect(frame).toContain('Berlin')
    })
  })

  it('shows a "✓ Deleted …" status line in the footer after a successful delete', async () => {
    await writeFresh(MOVING_ENVELOPE)
    await writeFresh(SECOND_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, CTRL_D, (frame) =>
      frame.includes('Delete consultation'),
    )
    await pressUntil(stdin, lastFrame, 'y', (frame) =>
      frame.includes('✓ Deleted'),
    )
  })

  it('Ctrl+D then n cancels — the file is left on disk and the row stays', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    stdin.write(CTRL_D)
    await yieldMacrotask()
    stdin.write('n')
    // The file is still on disk (cancel is synchronous — no async wait needed).
    await expect(fs.access(movingPath)).resolves.toBeUndefined()
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('happen')
    })
  })

  it('Ctrl+D then Esc cancels — the file is left on disk', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    stdin.write(CTRL_D)
    await yieldMacrotask()
    stdin.write(ESC)
    // After modal-cancel the list must re-render with the row content visible.
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('happen')
    })
    await expect(fs.access(movingPath)).resolves.toBeUndefined()
  })

  it('surfaces a "Failed to delete …" error status when fs.unlink rejects', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    await writeFresh(SECOND_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    // Delete the focused file out-of-band so the in-app fs.unlink rejects.
    await fs.rm(movingPath)
    stdin.write(CTRL_D)
    await yieldMacrotask()
    stdin.write('y')
    // Wait until the error-tone status line shows up in the footer.
    await waitFor(() => {
      const statusLine = (lastFrame() ?? '')
        .split('\n')
        .find((l) => stripAnsi(l).includes(path.basename(movingPath)))
      expect(statusLine).toBeDefined()
      expect(statusLine).toContain('[91m') // bright-red → tone: 'error'
    })
    // The full `Failed to delete <path>: <ENOENT message>` text is long and
    // the footer renders it with `truncateStart` (tail-keeping), so we
    // anchored the wait on the deleted file's basename + the error-tone
    // ANSI code, both of which survive truncation. The list is unchanged —
    // both rows still rendered.
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('happen')
    expect(frame).toContain('Berlin')
  })

  it('deleting the only consultation renders the empty state', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, CTRL_D, (frame) =>
      frame.includes('Delete consultation'),
    )
    await pressUntil(stdin, lastFrame, 'y', (frame) =>
      frame.includes('No consultations yet.'),
    )
  })
})

describe('<HistoryApp> — injectable top-level exit', () => {
  it('default footer hint reads "ESC quit" with no onExit/exitLabel', async () => {
    // Empty dir → the empty-state footer, which renders the `ESC <label>`
    // hint untruncated (the populated hint line is width-truncated and the
    // test terminal is too narrow to keep the trailing label visible).
    const { lastFrame } = render(<HistoryApp dir={tmpDir} />)
    await awaitListReady(lastFrame)
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('No consultations yet.')
    expect(frame).toContain('ESC quit')
  })

  it('ESC in the list invokes the injected onExit instead of quitting', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const onExit = vi.fn()
    const { lastFrame, stdin } = render(
      <HistoryApp dir={tmpDir} onExit={onExit} exitLabel="Home" />,
    )
    await awaitListReady(lastFrame)
    stdin.write(ESC)
    await waitFor(() => {
      expect(onExit).toHaveBeenCalledOnce()
    })
    // The list is still mounted — the soft exit did not unmount the app.
    expect(stripAnsi(lastFrame() ?? '')).toContain('Past Consultations')
  })

  it('the injected exitLabel shows verbatim in the list footer hint', async () => {
    // Empty dir → the empty-state footer renders `ESC <label>` untruncated.
    const { lastFrame } = render(
      <HistoryApp dir={tmpDir} onExit={vi.fn()} exitLabel="Home" />,
    )
    await awaitListReady(lastFrame)
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('No consultations yet.')
    expect(frame).toContain('ESC Home')
    expect(frame).not.toContain('ESC quit')
  })

  it('ESC from the loaded readout still returns to the list — not onExit', async () => {
    // The readout's internal Esc is unaffected by the injected top-level exit.
    await writeFresh(MOVING_ENVELOPE)
    const onExit = vi.fn()
    const { lastFrame, stdin } = render(
      <HistoryApp dir={tmpDir} onExit={onExit} exitLabel="Home" />,
    )
    await awaitListReady(lastFrame)
    await pressUntil(stdin, lastFrame, ENTER, (frame) =>
      frame.includes('Consultation · loaded'),
    )
    stdin.write(ESC)
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).toContain('Past Consultations')
    })
    // Back on the list — the readout's Esc did not fire the host onExit.
    expect(onExit).not.toHaveBeenCalled()
  })

  it('ESC while the filter row is open does not invoke onExit', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const onExit = vi.fn()
    const { lastFrame, stdin } = render(
      <HistoryApp dir={tmpDir} onExit={onExit} exitLabel="Home" />,
    )
    await awaitListReady(lastFrame)
    // '/' opens the filter row — first cross-state keystroke. `pressUntil`
    // retries through the `<HistoryList>` `useInput` bind race; if extra
    // '/' presses land after the row opens, they get appended as filter
    // text — harmless here because either an empty- or '/'-text filter,
    // ESC is consumed by the filter-mode branch (filterClear/filterExit)
    // and never reaches the top-level exit.
    await pressUntil(stdin, lastFrame, '/', (frame) =>
      frame.includes('Filter '),
    )
    stdin.write(ESC) // closes / clears the filter row, must not exit
    // Re-render after ESC: the filter row closes (or its text clears) — pick a
    // visible signal that the keystroke has been processed so the subsequent
    // negative assertion on `onExit` isn't racing the dispatch.
    await waitFor(() => {
      expect(stripAnsi(lastFrame() ?? '')).not.toContain('Filter ')
    })
    expect(onExit).not.toHaveBeenCalled()
  })
})
