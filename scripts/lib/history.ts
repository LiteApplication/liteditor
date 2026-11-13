import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { LiteEditorConfigSchema } from '../../src/types/schema.ts'
import { findBreakingChanges } from './schema-compat.ts'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const HISTORY_DIR = join(ROOT, '_history')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonSchema = { [key: string]: any }

const SNAPSHOT_RE = /^v(\d+\.\d+\.\d+)\.schema\.json$/

export function snapshotPath(version: string): string {
  return join(HISTORY_DIR, `v${version}.schema.json`)
}

/** JSON Schema of the `.liteditor` file as accepted by the current code. */
export function currentSchema(): JsonSchema {
  return z.toJSONSchema(LiteEditorConfigSchema, { io: 'input', unrepresentable: 'throw' })
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (pa[i]! !== pb[i]!) return pa[i]! - pb[i]!
  }
  return 0
}

/** All recorded snapshots, oldest first. */
export function listSnapshots(): { version: string; schema: JsonSchema }[] {
  if (!existsSync(HISTORY_DIR)) return []
  return readdirSync(HISTORY_DIR)
    .map((file) => SNAPSHOT_RE.exec(file))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m[1]!)
    .sort(compareVersions)
    .map((version) => ({
      version,
      schema: JSON.parse(readFileSync(snapshotPath(version), 'utf8')) as JsonSchema,
    }))
}

export function writeSnapshot(version: string, schema: JsonSchema): string {
  mkdirSync(HISTORY_DIR, { recursive: true })
  const file = snapshotPath(version)
  writeFileSync(file, JSON.stringify(schema, null, 2) + '\n')
  return file
}

/** Compare the current schema against every snapshot; returns problems per version. */
export function checkCompatibility(
  schema: JsonSchema = currentSchema(),
): { version: string; problems: string[] }[] {
  return listSnapshots()
    .map(({ version, schema: old }) => ({ version, problems: findBreakingChanges(old, schema) }))
    .filter((r) => r.problems.length > 0)
}

export function reportBreakage(failures: { version: string; problems: string[] }[]): void {
  console.error('\nThe current schema is NOT backward-compatible with released versions:\n')
  for (const { version, problems } of failures) {
    console.error(`  v${version}`)
    for (const p of problems) console.error(`    - ${p}`)
  }
  console.error(
    '\nA .liteditor file valid for a released version must stay valid. Make the change additive\n' +
      '(optional properties, new field types, wider enums) or keep accepting the old shape.',
  )
}
