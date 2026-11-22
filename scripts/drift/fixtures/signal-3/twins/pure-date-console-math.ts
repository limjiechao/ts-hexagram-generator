// Linted as overhaul/oracle/src/pure-date-console-math.ts

// Twin for B2: these read no clock and draw no randomness.
export function newYear(): number {
  return Date.UTC(2024, 0, 1)
}

export function momentAt(milliseconds: number): Date {
  return new Date(milliseconds)
}

export function report(total: number): void {
  console.log(Math.floor(total / 4))
}
