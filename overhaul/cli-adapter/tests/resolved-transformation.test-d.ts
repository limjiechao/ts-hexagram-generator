import type { resolveTransformation } from '@hexagram/application/resolve-transformation'
import type { ResolvedTransformation } from '@hexagram/presentation/build-readout'

// presentation restates use case 3's result, since it may not import
// application; this pins the restatement to the real result. cli-adapter is
// the one package whose tests reach both.

export const takesUseCase3Result = (
  result: Awaited<ReturnType<typeof resolveTransformation>>,
): ResolvedTransformation => result
