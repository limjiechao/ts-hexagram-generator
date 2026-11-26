import { beginCasting } from '@hexagram/application/begin-casting'
import type { divide } from '@hexagram/application/divide'
import { nextRound } from '@hexagram/application/next-round'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { composeCli } from '#src/composition-root.js'

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

/** Casting by hand draws no random integer, so drawing one fails the test. */
const randomSource = {
  integerBelow: () => {
    throw new Error('casting drew a random integer')
  },
} satisfies RandomSource

/** The steps of use case 1 that a Division by Pick needs. */
interface PickDivisionSteps {
  readonly beginCasting: typeof beginCasting
  readonly nextRound: typeof nextRound
  readonly divide: typeof divide
}

const compose = (scriptureCatalogue = stubCatalogue()): PickDivisionSteps =>
  composeCli({ scriptureCatalogue, randomSource })

describe('composeCli for Division by Pick', () => {
  it('gives beginCasting, nextRound and divide the signatures @hexagram/application gives them', () => {
    type Composed = ReturnType<typeof composeCli>
    expectTypeOf<Composed['beginCasting']>().toEqualTypeOf<
      typeof beginCasting
    >()
    expectTypeOf<Composed['nextRound']>().toEqualTypeOf<typeof nextRound>()
    expectTypeOf<Composed['divide']>().toEqualTypeOf<typeof divide>()
    const steps = compose()
    expect(typeof steps.beginCasting).toBe('function')
    expect(typeof steps.nextRound).toBe('function')
    expect(typeof steps.divide).toBe('function')
  })

  it('begins with the Empty Casting', () => {
    expect(compose().beginCasting()).toStrictEqual({
      state: 'partial',
      rounds: [],
    })
  })

  it('gives the Round the Empty Casting awaits, as @hexagram/application does', () => {
    const steps = compose()
    expect(steps.nextRound(steps.beginCasting())).toStrictEqual(
      nextRound(beginCasting()),
    )
  })

  it('passes on the refusal of an invalid Pick', () => {
    const steps = compose()
    expect(steps.divide(steps.beginCasting(), 0)).toStrictEqual({
      outcome: 'refused',
      refusal: { line: 1, round: 1, stalks: 49, pick: 0, rule: 'valid-pick' },
    })
  })

  it('drives eighteen Divisions by Pick from beginCasting to a complete Casting and its Transformation', () => {
    // Line by line, bottom-up: Old Yang 9, Young Yin 8, Young Yang 7, Old
    // Yin 6, Young Yin 8, Young Yang 7, by ADR-0023's Set-aside tables.
    const picks = [
      [21, 18, 17],
      [21, 18, 3],
      [4, 3, 1],
      [4, 3, 3],
      [4, 1, 1],
      [1, 3, 3],
    ].flat()
    const scriptureCatalogue = stubCatalogue()
    const steps = compose(scriptureCatalogue)

    let casting = steps.beginCasting()
    let result: ReturnType<typeof divide> | undefined
    for (const pick of picks) {
      const next = steps.nextRound(casting)
      if (next.outcome !== 'next') throw new Error('the Casting did not replay')
      expect(pick).toBeGreaterThanOrEqual(next.round.validPicks.min)
      expect(pick).toBeLessThanOrEqual(next.round.validPicks.max)

      result = steps.divide(casting, pick)
      if (result.outcome !== 'divided') {
        throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
      }
      if (result.casting.state === 'partial') casting = result.casting
    }

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
