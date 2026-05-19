import type { CastingRecord, LineCasting } from '@hexagram/types'

export const CURRENT_SCHEMA_VERSION = 1

export type YamlCasting = {
  L6: LineCasting
  L5: LineCasting
  L4: LineCasting
  L3: LineCasting
  L2: LineCasting
  L1: LineCasting
}

/** Convert bottom-first `CastingRecord` → top-first YAML mapping (`L6` first). */
export function castingToYaml(casting: CastingRecord): YamlCasting {
  const [L1, L2, L3, L4, L5, L6] = casting
  return { L6, L5, L4, L3, L2, L1 }
}

/** Convert top-first YAML mapping → bottom-first `CastingRecord`. */
export function castingFromYaml(yaml: YamlCasting): CastingRecord {
  return [yaml.L1, yaml.L2, yaml.L3, yaml.L4, yaml.L5, yaml.L6]
}
