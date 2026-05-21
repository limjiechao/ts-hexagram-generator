import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  markdownConsultationBody,
  serializeFrontmatter,
  type ConsultationEnvelope,
} from '@hexagram/consultation-file'
import type { CastingRecord, Hexagram } from '@hexagram/types'
import { render } from 'ink-testing-library'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { HistoryApp } from '../src/history-app'

// Matches ANSI SGR escape sequences (ESC[...m). Stripped before assertions
// so text matching is robust to Ink's colour codes.
const ANSI_PATTERN = new RegExp(
  String.raw`${String.fromCodePoint(0x1b)}\[[0-9;]*m`,
  'g',
)
function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

/** Yield to the event loop so Ink can process queued stdin + re-render. */
const tick = (ms = 60): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

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
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Consultation · loaded 2025-08-13 09:02')
    // "Past Consultation" must NOT appear as a readout title adjective.
    // The list heading "Past Consultations" is still correct; it is only
    // present on the list screen, not on the readout screen.
    expect(frame).not.toContain('Past Consultation')
  })

  it('history list heading remains "Past Consultations" (not affected)', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Past Consultations')
  })

  it('tab labels are numbered in the readout', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('<1> Casting')
    expect(frame).toContain('<2> Transformation')
    expect(frame).toContain('<3> Standing Hexagram')
    expect(frame).toContain('<4> Emerging Hexagram')
  })

  it('loaded readout footer says "Esc back to history"', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Esc back to history')
    expect(frame).not.toContain('Esc quit')
  })
})

describe('<HistoryApp> — loaded readout', () => {
  it('opens the four-tab readout with the loaded-timestamp title on Enter', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Consultation · loaded 2025-08-13 09:02')
    // All four tabs available in the unlocked `done` state.
    expect(frame).toContain('Casting')
    expect(frame).toContain('Transformation')
    expect(frame).toContain('Standing Hexagram')
    expect(frame).toContain('Emerging Hexagram')
  })

  it('shows "Casting not recorded" for a null-casting consultation', async () => {
    await writeFresh(NULL_CASTING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Consultation · loaded 2024-02-01 11:30')
    expect(frame).toContain('Casting not recorded')
  })

  it('shows the body-refreshed notice when the on-disk body had drifted', async () => {
    const filePath = await writeStale(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Body refreshed; data unchanged.')
    // The drifted file was rewritten in place.
    const after = await fs.readFile(filePath, 'utf8')
    expect(after).not.toContain('STALE BODY')
    expect(after).toContain('## QUERY')
  })

  it('does not show the notice — and leaves the file untouched — when the body matched', async () => {
    const filePath = await writeFresh(MOVING_ENVELOPE)
    const before = await fs.stat(filePath)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(ENTER)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).not.toContain('Body refreshed')
    // Byte-identical body → no write, no mtime bump.
    const after = await fs.stat(filePath)
    expect(after.mtimeMs).toBe(before.mtimeMs)
  })

  it('ESC from the readout returns to the list (does not exit)', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(ENTER)
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).toContain('Consultation · loaded')
    stdin.write(ESC)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    // Back on the list — the shell-hosted list is shown again.
    expect(frame).toContain('Past Consultations')
    expect(frame).not.toContain('Consultation · loaded')
  })
})

describe('<HistoryApp> — Ctrl+D delete', () => {
  it('Ctrl+D then y unlinks the focused file and drops the row from the list', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    await writeFresh(SECOND_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    // Newest-first → MOVING_ENVELOPE (2025) is focused at the top.
    expect(stripAnsi(lastFrame() ?? '')).toContain('happen')
    stdin.write(CTRL_D)
    await tick()
    stdin.write('y')
    await tick()
    // The file is permanently gone from disk.
    await expect(fs.access(movingPath)).rejects.toThrow()
    const frame = stripAnsi(lastFrame() ?? '')
    // The deleted row disappears; the surviving row stays.
    expect(frame).not.toContain('happen')
    expect(frame).toContain('Berlin')
  })

  it('shows a "✓ Deleted …" status line in the footer after a successful delete', async () => {
    await writeFresh(MOVING_ENVELOPE)
    await writeFresh(SECOND_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(CTRL_D)
    await tick()
    stdin.write('y')
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('✓ Deleted')
  })

  it('Ctrl+D then n cancels — the file is left on disk and the row stays', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(CTRL_D)
    await tick()
    stdin.write('n')
    await tick()
    // The file is still on disk.
    await expect(fs.access(movingPath)).resolves.toBeUndefined()
    expect(stripAnsi(lastFrame() ?? '')).toContain('happen')
  })

  it('Ctrl+D then Esc cancels — the file is left on disk', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(CTRL_D)
    await tick()
    stdin.write(ESC)
    await tick()
    await expect(fs.access(movingPath)).resolves.toBeUndefined()
    expect(stripAnsi(lastFrame() ?? '')).toContain('happen')
  })

  it('surfaces a "Failed to delete …" error status when fs.unlink rejects', async () => {
    const movingPath = await writeFresh(MOVING_ENVELOPE)
    await writeFresh(SECOND_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    // Delete the focused file out-of-band so the in-app fs.unlink rejects.
    await fs.rm(movingPath)
    stdin.write(CTRL_D)
    await tick()
    stdin.write('y')
    await tick()
    await tick()
    const rawFrame = lastFrame() ?? ''
    // The failure surfaces as a bright-red (error-tone) status line in the
    // footer. The full `Failed to delete <path>: <ENOENT message>` text is
    // long and the footer renders it with `truncateStart` (tail-keeping),
    // so assert on the error-tone ANSI code plus the deleted file's name,
    // both of which survive truncation.
    const statusLine = rawFrame
      .split('\n')
      .find((l) => stripAnsi(l).includes(path.basename(movingPath)))
    expect(statusLine).toBeDefined()
    expect(statusLine).toContain('[91m') // bright-red → tone: 'error'
    // The list is unchanged — both rows still rendered.
    const frame = stripAnsi(rawFrame)
    expect(frame).toContain('happen')
    expect(frame).toContain('Berlin')
  })

  it('deleting the only consultation renders the empty state', async () => {
    await writeFresh(MOVING_ENVELOPE)
    const { lastFrame, stdin } = render(<HistoryApp dir={tmpDir} />)
    await tick()
    stdin.write(CTRL_D)
    await tick()
    stdin.write('y')
    await tick()
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('No consultations yet.')
  })
})
