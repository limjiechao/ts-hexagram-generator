// Fake policy for twin T5: imports oracle as types only (R-109)
import type { Pick } from '@hexagram/oracle/pick'

export const isYang = (value: Pick): boolean => value === 'yang'
