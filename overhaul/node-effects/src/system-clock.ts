import type { Clock } from '@hexagram/application/clock'
import { isUtcOffset } from '@hexagram/consultation-journal/divined-at'

/** The Clock read from the system clock, in the system's UTC offset (ADR-0037). */
export const systemClock: Clock = {
  now: () => {
    const epochMilliseconds = Date.now()
    const offset = offsetText(-new Date(epochMilliseconds).getTimezoneOffset())
    if (!isUtcOffset(offset)) {
      throw new Error(
        `The system UTC offset ${offset} is outside -12:00 to +14:00 in whole minutes, so no Moment can carry it.`,
      )
    }
    return { precision: 'moment', epochMilliseconds, offset }
  },
}

// `+HH:MM`, with `:SS` only when the zone's offset has seconds, as a
// historical local mean time can; isUtcOffset then refuses it. Zero is
// `+00:00`, never `-00:00`, which RFC 3339 reserves for an unknown offset.
function offsetText(minutesEast: number): string {
  const sign = minutesEast < 0 ? '-' : '+'
  const totalSeconds = Math.round(Math.abs(minutesEast) * 60)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  const text = `${sign}${pad(hours)}:${pad(minutes)}`
  return seconds === 0 ? text : `${text}:${pad(seconds)}`
}
