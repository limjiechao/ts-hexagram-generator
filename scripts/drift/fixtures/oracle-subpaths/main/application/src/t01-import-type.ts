// R-189 twin T1 (free): a top-level import type
import type { Pick } from '@hexagram/oracle/pick'

export const isPick = (value: Pick): boolean => value === 'yang'
