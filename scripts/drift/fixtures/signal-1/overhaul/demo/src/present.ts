// Code comments are not doc sources: `docs/code-missing.md` is not read.
export const present = true

// The names the stand-in's documents find in its code. commentedName
// appears only in this comment, and still counts as present.
export function presentHelper(): number {
  return 1
}

export interface PresentRecord {
  readonly presentField: string
}
