import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { serializeFrontmatter } from '../src/frontmatter'
import { convertLegacyTxt } from '../src/legacy-converter'
import { markdownConsultationBody } from '../src/markdown'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const read = (name: string): string =>
  readFileSync(path.join(dir, name), 'utf8')

describe('convertLegacyTxt (Shape A — current fixtures with CASTING table)', () => {
  it('recovers query, hexagram, and casting from one-moving fixture', () => {
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-one-moving.txt'),
      filenameTimestamp: '2026-01-15T18-16-38+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('Should I take the new position?')
    expect(result.envelope.hexagram).toEqual([6, 7, 8, 7, 8, 7])
    expect(result.envelope.casting[0][0]).toEqual({ pick: 5, max: 48 })
    expect(result.envelope.castingRecovered).toBe(true)
  })

  it('handles empty-query', () => {
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-empty-query.txt'),
      filenameTimestamp: '2025-08-12T07-05-56+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('')
    expect(result.envelope.hexagram).toEqual([7, 7, 7, 7, 7, 7])
  })
})

describe('convertLegacyTxt (Shape B — older format without CASTING)', () => {
  it('recovers query + hexagram, marks casting as unrecovered, fills with zeros', () => {
    const result = convertLegacyTxt({
      text: read('legacy-shape-b.txt'),
      filenameTimestamp: '2026-03-16T13-28-33+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.query).toBe('What will it be like?')
    expect(result.envelope.hexagram).toEqual([8, 7, 8, 9, 9, 9])
    expect(result.envelope.castingRecovered).toBe(false)
    expect(result.envelope.casting[0][0]).toEqual({ pick: 0, max: 0 })
  })
})

describe('convertLegacyTxt (filename → ISO timestamp)', () => {
  it('rewrites the time-portion dashes to colons', () => {
    const result = convertLegacyTxt({
      text: read('legacy-shape-b.txt'),
      filenameTimestamp: '2026-03-16T13-28-33+0800',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.envelope.timestamp).toBe('2026-03-16T13:28:33+0800')
  })
})

describe('Shape A converted → md round-trips through serialize', () => {
  it('produces a parseable .md when fed back through serializeFrontmatter', () => {
    const result = convertLegacyTxt({
      text: read('legacy-txt-fixture-one-moving.txt'),
      filenameTimestamp: '2026-01-15T18-16-38+0800',
    })
    if (!result.ok) throw new Error(result.reason)
    const { castingRecovered, ...envelope } = result.envelope
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      envelope.casting,
    )
    const md = serializeFrontmatter(envelope, body)
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toContain('## CASTING')
    expect(castingRecovered).toBe(true)
  })
})
