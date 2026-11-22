// Linted as overhaul/consultation-journal/src/as-const-satisfies-expect-error.ts

// Twin for B11: `as const`, `satisfies` and `@ts-expect-error` assert no type.
interface Limits {
  readonly max: number
}

export const groups: readonly [1, 2, 3] = [1, 2, 3] as const

export const limits: Limits = { max: 3 } satisfies Limits

// @ts-expect-error -- a deliberate type error, to show the directive passes
export const mislabelled: number = 'seven'
