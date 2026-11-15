import type { FieldSchema } from './schema.ts'
import { normalizeAssetPath } from './assets.ts'

export interface ApplyContext {
  /** Repo-relative path of the file the data comes from, to resolve `./` image paths. */
  file?: string
  /** Maps a normalised repo-relative image path (e.g. to a URL with the site base). */
  mapImage?: (repoPath: string) => string
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Value the editor gives to a new field (see docs/content.md, "How values are stored"). */
export function defaultValue(field: FieldSchema): unknown {
  switch (field.type) {
    case 'boolean':
      return false
    case 'color':
      return '#000000'
    case 'selection':
      return field.options[0]?.value ?? ''
    case 'list':
      return []
    case 'object':
      return applyDefaults(field.fields, {})
    default:
      return ''
  }
}

/** Fills missing values with defaults and normalises image paths. Undeclared keys are kept. */
export function applyField(field: FieldSchema, value: unknown, ctx: ApplyContext = {}): unknown {
  if (value === undefined || value === null) return defaultValue(field)
  switch (field.type) {
    case 'image': {
      if (typeof value !== 'string') return value
      const p = normalizeAssetPath(value, ctx.file)
      return ctx.mapImage && p ? ctx.mapImage(p) : p
    }
    case 'list':
      return Array.isArray(value) ? value.map((item) => applyField(field.itemSchema, item, ctx)) : []
    case 'object':
      return applyDefaults(field.fields, isObject(value) ? value : {}, ctx)
    default:
      return value
  }
}

export function applyDefaults(
  fields: Record<string, FieldSchema> | undefined,
  data: Record<string, unknown> | undefined,
  ctx: ApplyContext = {},
): Record<string, any> {
  const out: Record<string, unknown> = { ...(data ?? {}) }
  for (const [key, field] of Object.entries(fields ?? {})) {
    out[key] = applyField(field, out[key], ctx)
  }
  return out
}
