/**
 * Parse `--name <n>` / `--name=<n>` from `argv`, returning the first value that
 * parses to a positive integer; otherwise `fallback`. The single home for
 * positive-integer CLI flag parsing — every per-flag helper delegates here so
 * the matching rule (space form, `=` form, `/^\d+$/`, `> 0`) lives once.
 */
export function parseIntFlag(
  argv: readonly string[],
  name: string,
  fallback: number,
): number {
  const eq = `${name}=`
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    let value: string | undefined
    if (argument === name) {
      value = argv[index + 1]
    } else if (argument?.startsWith(eq) === true) {
      value = argument.slice(eq.length)
    }
    if (value !== undefined && /^\d+$/.test(value)) {
      const parsed = Number.parseInt(value, 10)
      if (parsed > 0) return parsed
    }
  }
  return fallback
}
