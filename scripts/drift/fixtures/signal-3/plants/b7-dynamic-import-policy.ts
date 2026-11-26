// Linted as overhaul/cli-adapter/src/b7-dynamic-import-policy.ts

export async function loadChoosePick(): Promise<void> {
  await import('@hexagram/remainder-group-policy/choose-pick')
}
