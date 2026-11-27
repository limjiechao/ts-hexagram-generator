import {
  lookUpHexagramNames,
  lookUpPassageTexts,
  lookUpReceivedSequenceNumber,
  lookUpTrigramNames,
} from '@hexagram/application/look-up-catalogue'
import { resolveTransformation } from '@hexagram/application/resolve-transformation'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { Transformation } from '@hexagram/oracle/transformation'
import {
  hexagramsNamed,
  transformationReadout,
  trigramsNamed,
} from '@hexagram/presentation/build-readout'
import type { TransformationReadout } from '@hexagram/presentation/readout'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import { describe, expect, it } from 'vitest'

// presentation's Readout over the real bundled Catalogue, through use case 3
// and use case 8 with one Reading Preference, the default. presentation's
// own tests may not reach the Catalogue, so this is where the real texts
// meet the Readout; every expected text is looked up at run time.

const ports = { scriptureCatalogue: bundledScriptureCatalogue }
const preference = defaultReadingPreference

async function readoutOf(
  transformation: Transformation,
): Promise<TransformationReadout> {
  const resolved = await resolveTransformation(
    ports,
    transformation,
    preference,
  )
  const hexagrams = await Promise.all(
    hexagramsNamed(resolved.resolution).map(async (hexagram) => ({
      hexagram,
      receivedSequenceNumber: await lookUpReceivedSequenceNumber(
        ports,
        hexagram,
      ),
      names: await lookUpHexagramNames(ports, hexagram, preference),
    })),
  )
  const trigramNames = await Promise.all(
    trigramsNamed(resolved.resolution).map((trigram) =>
      lookUpTrigramNames(ports, trigram, preference),
    ),
  )
  const trigrams = trigramNames.flat()
  return transformationReadout(transformation, resolved, {
    hexagrams,
    trigrams,
  })
}

describe('the Readout over the bundled Catalogue', () => {
  it('all six Lines of 乾 moving: 用九 shows its text and its 小象, and no 用六 is shown', async () => {
    const readout = await readoutOf([9, 9, 9, 9, 9, 9])
    const qian = readout.transformation.standing.hexagram.hexagram
    const yongJiu = readout.standing.passages.at(-1)
    expect(yongJiu?.label).toBe('用九')
    const expectedText = await lookUpPassageTexts(
      ports,
      { work: 'zhouyi', hexagram: qian, line: 'all-moving' },
      preference,
    )
    expect(expectedText).not.toEqual([])
    expect(yongJiu?.texts).toEqual(expectedText)
    const expectedXiaoxiang = await lookUpPassageTexts(
      ports,
      { work: 'xiaoxiang', hexagram: qian, line: 'all-moving' },
      preference,
    )
    expect(expectedXiaoxiang).not.toEqual([])
    expect(yongJiu?.commentaries).toEqual([
      { work: 'xiaoxiang', label: '小象', texts: expectedXiaoxiang },
    ])
    expect(readout.emerging.passages.map((each) => each.label)).toEqual([
      '卦辭',
    ])
    expect(
      [...readout.standing.passages, ...readout.emerging.passages].map(
        (each) => each.label,
      ),
    ).not.toContain('用六')
  })

  it('X之X: the Emerging tab shows no passage', async () => {
    const readout = await readoutOf([7, 8, 7, 8, 7, 8])
    expect(readout.standing.passages.map((each) => each.label)).toEqual([
      '卦辭',
    ])
    expect(readout.emerging.passages).toEqual([])
  })

  it('names the Traditional Edition then Legge in the closing list, each once', async () => {
    const readout = await readoutOf([9, 8, 6, 7, 9, 8])
    expect(readout.editions.map((edition) => edition.id)).toEqual([
      'wuyingdian-1739',
      'legge-1882',
    ])
  })
})
