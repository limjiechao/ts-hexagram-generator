// Linted as overhaul/scripture-catalogue/src/b2-crypto.ts

export function freshLabel(): string {
  return crypto.randomUUID()
}
