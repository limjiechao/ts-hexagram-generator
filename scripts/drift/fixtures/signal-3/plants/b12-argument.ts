// Linted as overhaul/consultation-journal/src/b12-argument.ts

function double(count: number): number {
  return count * 2
}

export function readDoubled(text: string): number {
  return double(JSON.parse(text))
}
