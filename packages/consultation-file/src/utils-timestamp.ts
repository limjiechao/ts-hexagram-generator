import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
dayjs.extend(timezone)

/** Filename-safe local timestamp, e.g. `2026-05-19T14-23-11+0800`. */
export function getFilesystemSafeTimestamp(): string {
  return dayjs().format('YYYY-MM-DDTHH-mm-ssZZ')
}

/**
 * ISO-8601 local timestamp suitable for the frontmatter `timestamp` field,
 * e.g. `2026-05-19T14:23:11+0800`. Note: colons in the time portion (the
 * filename version replaces them with `-` for filesystem safety).
 */
export function getIsoTimestamp(): string {
  return dayjs().format('YYYY-MM-DDTHH:mm:ssZZ')
}
