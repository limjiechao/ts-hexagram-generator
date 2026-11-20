import type { CompleteCasting } from '#src/casting.js'

/**
 * Admits a complete Casting by its shape alone: six Lines of three Rounds,
 * each value in its range, and the Transformation present. It never replays
 * the Picks, so the PWA, which has no Oracle, can use it too (ADR-0037).
 */
export function isCompleteCasting(value: unknown): value is CompleteCasting {
  if (typeof value !== 'object' || value === null) return false
  if (
    !('state' in value) ||
    !('rounds' in value) ||
    !('transformation' in value)
  )
    return false
  const { state, rounds, transformation } = value
  return (
    state === 'complete' &&
    isSequence(rounds, 6, isLine) &&
    isSequence(transformation, 6, isLineValue)
  )
}

function isSequence(
  value: unknown,
  length: number,
  isItem: (item: unknown, index: number) => boolean,
): boolean {
  return (
    Array.isArray(value) &&
    value.length === length &&
    // `Array.from` turns empty slots into `undefined`, which `every` would skip.
    Array.from(value).every((item: unknown, index) => isItem(item, index))
  )
}

function isLine(value: unknown): boolean {
  return isSequence(value, 3, isRound)
}

/**
 * A Round holds at least one valid Pick, and a valid Pick leaves a stalk in
 * the left heap and a countable stalk in the right once the Hung Stalk is
 * taken: 1 to stalks − 2 (ADR-0023). Its stalks and Set-aside are checked by
 * its place in the Line, as the glossary's Set-aside says, `index` 0 being
 * the first Round.
 */
function isRound(value: unknown, index: number): boolean {
  if (typeof value !== 'object' || value === null) return false
  if (
    !('stalks' in value) ||
    !('pick' in value) ||
    !('remainderLeft' in value) ||
    !('remainderRight' in value) ||
    !('setAside' in value)
  )
    return false
  const { stalks, pick, remainderLeft, remainderRight, setAside } = value
  return (
    isStalks(stalks, index) &&
    isIntegerFrom(pick, 1, stalks - 2) &&
    isIntegerFrom(remainderLeft, 1, 4) &&
    isIntegerFrom(remainderRight, 1, 4) &&
    isSetAside(setAside, index)
  )
}

/** Every Line starts from all 49 stalks. */
function isStalks(value: unknown, index: number): value is number {
  return index === 0 ? value === 49 : isIntegerFrom(value, 3, 49)
}

function isSetAside(value: unknown, index: number): boolean {
  return index === 0 ? value === 5 || value === 9 : value === 4 || value === 8
}

function isLineValue(value: unknown): boolean {
  return isIntegerFrom(value, 6, 9)
}

function isIntegerFrom(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}
