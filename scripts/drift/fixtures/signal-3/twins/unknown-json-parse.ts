// Linted as overhaul/scripture-catalogue/src/unknown-json-parse.ts

// Twin for B12: untyped data may be held as `unknown`.
export function readRaw(text: string): unknown {
  const raw: unknown = JSON.parse(text)
  return raw
}
