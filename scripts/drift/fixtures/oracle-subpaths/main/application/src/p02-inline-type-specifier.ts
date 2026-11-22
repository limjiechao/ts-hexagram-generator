// R-189 plant P2 (loads): import { type X }, an empty import that still loads (R-161)
import { type Pick } from '@hexagram/oracle/pick'

export const isPick = (value: Pick): boolean => value === 'yang'
