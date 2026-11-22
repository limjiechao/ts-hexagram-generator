// Linted as overhaul/cli-adapter/tests/adapter-tests-import-catalogue.test.ts

// Twin for B8: cli-adapter's tests may import scripture-catalogue and
// application.
import type { Clock } from '@hexagram/application/clock'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'

export type TestClock = Clock

export { isEditionId }
