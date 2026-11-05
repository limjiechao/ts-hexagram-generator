import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { loadConsultationFile } from '@hexagram/consultation-file/file'
import { serializeFrontmatter } from '@hexagram/consultation-file/frontmatter'
import { markdownConsultationBody } from '@hexagram/text-grid/markdown'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { migrateLegacy } from '../src/migrate-legacy.js'

// LOCK (BUG-003): a migrated null-casting file must already be in the form
// history self-heal (`rerenderOnDisk`) would write — body rendered WITH the
// envelope's `castingAbsence` — so the first open does not rewrite it.

const thisDir = path.dirname(fileURLToPath(import.meta.url))
const shapeBFixture = path.resolve(
  thisDir,
  '../../../domain/consultation-file/tests/fixtures/legacy-shape-b.txt',
)

describe('migrateLegacy', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'migrate-legacy-'))
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('renders a null-casting body with its castingAbsence reason', async () => {
    const stem = 'consultation-2026-01-01T00-00-00+0000'
    await fs.copyFile(shapeBFixture, path.join(tmp, `${stem}.txt`))

    await migrateLegacy(tmp)

    const mdPath = path.join(tmp, `${stem}.md`)
    const loaded = await loadConsultationFile(mdPath)
    if (!loaded.ok) throw new Error(`load failed: ${loaded.reason}`)
    const { envelope } = loaded
    expect(envelope.casting).toBeNull()

    const healedBody = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      null,
      envelope.castingAbsence,
    )
    // Compare whole files, as `rerenderOnDisk` does: the loaded `body` keeps
    // the frontmatter separator newline, so it never equals a bare render.
    expect(await fs.readFile(mdPath, 'utf8')).toBe(
      serializeFrontmatter(envelope, healedBody),
    )
  })

  // LOCK (BUG-011): an existing `.md` of the same stem must not be
  // overwritten — the `.txt` would then move to `legacy/` and the original
  // consultation would be unrecoverable.
  it('skips a .txt whose target .md already exists, leaving both untouched', async () => {
    const clash = 'consultation-2026-01-01T00-00-00+0000'
    const other = 'consultation-2026-01-02T00-00-00+0000'
    const existing = 'pre-existing saved consultation\n'
    await fs.writeFile(path.join(tmp, `${clash}.md`), existing, 'utf8')
    await fs.copyFile(shapeBFixture, path.join(tmp, `${clash}.txt`))
    await fs.copyFile(shapeBFixture, path.join(tmp, `${other}.txt`))

    await migrateLegacy(tmp)

    expect(await fs.readFile(path.join(tmp, `${clash}.md`), 'utf8')).toBe(
      existing,
    )
    await expect(
      fs.access(path.join(tmp, `${clash}.txt`)),
    ).resolves.toBeUndefined()
    await expect(
      fs.access(path.join(tmp, 'legacy', `${clash}.txt`)),
    ).rejects.toThrow()
    expect(process.stderr.write).toHaveBeenCalledWith(
      `SKIP ${clash}.txt: target exists\n`,
    )
    // The rest of the run still migrates.
    await expect(
      fs.access(path.join(tmp, `${other}.md`)),
    ).resolves.toBeUndefined()
    await expect(
      fs.access(path.join(tmp, 'legacy', `${other}.txt`)),
    ).resolves.toBeUndefined()
  })
})
