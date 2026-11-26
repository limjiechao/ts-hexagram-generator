import { beginCasting } from '@hexagram/application/begin-casting'
import { divide } from '@hexagram/application/divide'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { transcribe } from '@hexagram/application/transcribe'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { composeCli } from '#src/composition-root.js'

type Transcription = Parameters<typeof transcribe>[1]

/** Casting needs no scripture, so every lookup fails the test if called. */
const unused = () => Promise.reject(new Error('casting looked up scripture'))

const stubCatalogue = () => {
  const scriptureCatalogue = {
    passageTexts: vi.fn(unused),
    hexagramNames: vi.fn(unused),
    editions: vi.fn(unused),
  } satisfies ScriptureCatalogue
  return scriptureCatalogue
}

/** The steps of use case 1 that a Physical Division needs. */
interface PhysicalDivisionSteps {
  readonly beginCasting: typeof beginCasting
  readonly transcribe: typeof transcribe
}

const compose = (scriptureCatalogue = stubCatalogue()): PhysicalDivisionSteps =>
  composeCli({ scriptureCatalogue })

const heaps = (
  pilesLeft: number | undefined,
  remainderLeft: number | undefined,
  pilesRight: number | undefined,
  remainderRight: number | undefined,
): Transcription => ({ pilesLeft, remainderLeft, pilesRight, remainderRight })

describe('composeCli for Physical Division', () => {
  it('gives transcribe the signature @hexagram/application gives it', () => {
    type Composed = ReturnType<typeof composeCli>
    expectTypeOf<Composed['transcribe']>().toEqualTypeOf<typeof transcribe>()
    expect(typeof compose().transcribe).toBe('function')
  })

  it('passes on the refusal of an incomplete Transcription, with no Pick', () => {
    const steps = compose()
    expect(
      steps.transcribe(steps.beginCasting(), heaps(5, 1, undefined, 3)),
    ).toStrictEqual({
      outcome: 'refused',
      refusal: {
        line: 1,
        round: 1,
        stalks: 49,
        pick: undefined,
        rule: 'complete',
      },
    })
  })

  it('passes on the refusal of a wrong Set-aside, with the derived Pick', () => {
    const steps = compose()
    expect(
      steps.transcribe(steps.beginCasting(), heaps(5, 1, 5, 1)),
    ).toStrictEqual({
      outcome: 'refused',
      refusal: { line: 1, round: 1, stalks: 49, pick: 21, rule: 'set-aside' },
    })
  })

  it('gives what divide gives for the Pick the left heap derives', () => {
    const steps = compose()
    expect(
      steps.transcribe(steps.beginCasting(), heaps(5, 1, 6, 3)),
    ).toStrictEqual(divide(beginCasting(), 21))
  })

  it('drives eighteen Transcriptions from beginCasting to a complete Casting and its Transformation', () => {
    // Line by line, bottom-up: Old Yang 9, Young Yin 8, Young Yang 7, Old
    // Yin 6, Young Yin 8, Young Yang 7, by ADR-0023's Set-aside tables. Each
    // Round's heaps are read off as piles of four and a Remainder of 1 to 4.
    const transcriptions = [
      // 49 → 21 | 27, 44 → 18 | 25, 40 → 17 | 22
      [heaps(5, 1, 6, 3), heaps(4, 2, 6, 1), heaps(4, 1, 5, 2)],
      // 49 → 21 | 27, 44 → 18 | 25, 40 → 3 | 36
      [heaps(5, 1, 6, 3), heaps(4, 2, 6, 1), heaps(0, 3, 8, 4)],
      // 49 → 4 | 44, 40 → 3 | 36, 32 → 1 | 30
      [heaps(0, 4, 10, 4), heaps(0, 3, 8, 4), heaps(0, 1, 7, 2)],
      // 49 → 4 | 44, 40 → 3 | 36, 32 → 3 | 28
      [heaps(0, 4, 10, 4), heaps(0, 3, 8, 4), heaps(0, 3, 6, 4)],
      // 49 → 4 | 44, 40 → 1 | 38, 36 → 1 | 34
      [heaps(0, 4, 10, 4), heaps(0, 1, 9, 2), heaps(0, 1, 8, 2)],
      // 49 → 1 | 47, 44 → 3 | 40, 36 → 3 | 32
      [heaps(0, 1, 11, 3), heaps(0, 3, 9, 4), heaps(0, 3, 7, 4)],
    ].flat()
    const scriptureCatalogue = stubCatalogue()
    const steps = compose(scriptureCatalogue)

    let casting = steps.beginCasting()
    let result: ReturnType<typeof transcribe> | undefined
    for (const transcription of transcriptions) {
      result = steps.transcribe(casting, transcription)
      if (result.outcome !== 'divided') {
        throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
      }
      if (result.casting.state === 'partial') casting = result.casting
    }

    expect(transcriptions).toHaveLength(18)
    expect(result?.outcome).toBe('divided')
    const complete = result?.outcome === 'divided' ? result.casting : undefined
    expect(complete?.state).toBe('complete')
    expect(complete?.rounds).toHaveLength(6)
    expect(
      complete?.state === 'complete' ? complete.transformation : undefined,
    ).toStrictEqual([9, 8, 7, 6, 8, 7])
    expect(scriptureCatalogue.passageTexts).not.toHaveBeenCalled()
    expect(scriptureCatalogue.hexagramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.editions).not.toHaveBeenCalled()
  })
})
