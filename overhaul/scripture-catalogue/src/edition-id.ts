declare const editionId: unique symbol

/**
 * Names one Edition, as a URL path segment writes it (e.g. `legge-1882` in
 * `/works/zhouyi/editions/legge-1882`, ADR-0038). Only `isEditionId` admits
 * one.
 */
export type EditionId = string & { readonly [editionId]: true }

/** Lower-case letters and digits, in words joined by single hyphens. */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Admits a slug: safe in a URL path segment without escaping. */
export function isEditionId(value: string): value is EditionId {
  return slugPattern.test(value)
}
