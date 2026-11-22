// Linted as overhaul/application/tests/b12-assignment-in-tests.test.ts

export function readFixture(text: string): number {
  const count: number = JSON.parse(text)
  return count
}
