import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Generate a filesystem-safe, timezone-aware timestamp string
 * Format: YYYY-MM-DD_HH-mm-ss_ZZ (e.g., 2023-12-07_14-30-25_+0800)
 *
 * @returns A timestamp string safe for use in filenames
 */
export function getFilesystemSafeTimestamp(): string {
  return dayjs().format('YYYY-MM-DDTHH-mm-ssZZ')
}
