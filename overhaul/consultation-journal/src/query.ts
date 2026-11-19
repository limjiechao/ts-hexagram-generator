declare const query: unique symbol

/**
 * What a Consultation asks: required, non-blank, kept exactly as written, and
 * possibly several lines long. Only `isQuery` admits one.
 */
export type Query = string & { readonly [query]: true }

/** Admits any text with a non-whitespace character; it is never trimmed. */
export function isQuery(value: string): value is Query {
  return /\S/u.test(value)
}
