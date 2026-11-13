import { checkCompatibility, listSnapshots, reportBreakage } from './lib/history.ts'

const snapshots = listSnapshots()
const failures = checkCompatibility()

if (failures.length > 0) {
  reportBreakage(failures)
  process.exit(1)
}

console.log(
  snapshots.length === 0
    ? 'No snapshots in _history/ yet; nothing to check (the first release will create one).'
    : `Schema is compatible with ${snapshots.length} released version(s): ${snapshots
        .map((s) => `v${s.version}`)
        .join(', ')}`,
)
