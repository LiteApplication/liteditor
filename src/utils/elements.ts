// Pure helpers for custom elements stored as fenced blocks in markdown:
//
//   ```liteditor-element:<name>
//   <YAML data>
//   ```
import * as yaml from 'js-yaml'

export const ELEMENT_INFO_PREFIX = 'liteditor-element:'

export interface ElementDisplayConfig {
  label: string
  fields: Record<string, { type?: string }>
  display?: { title?: string; description?: string; images?: string }
}

/** Returns the element name for a fence info string, or null if it is not an element fence. */
export function parseElementInfo(info: string): string | null {
  const trimmed = info.trim()
  if (!trimmed.startsWith(ELEMENT_INFO_PREFIX)) return null
  const name = trimmed.slice(ELEMENT_INFO_PREFIX.length).trim()
  return name || null
}

export function parseElementData(body: string): Record<string, unknown> {
  try {
    const data = yaml.load(body)
    return data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export function serializeElementBlock(name: string, data: Record<string, unknown>): string {
  const body = Object.keys(data).length ? yaml.dump(data, { lineWidth: -1 }) : ''
  // Use a fence longer than any backtick run in the body.
  const longest = Math.max(0, ...(body.match(/`+/g) ?? []).map((m) => m.length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}${ELEMENT_INFO_PREFIX}${name}\n${body}${fence}`
}

function asText(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** What the editor card shows: title, description and image paths. */
export function resolveElementDisplay(
  config: ElementDisplayConfig,
  data: Record<string, unknown>,
): { title: string; description: string; images: string[] } {
  const d = config.display ?? {}
  const title = d.title ? asText(data[d.title]).trim() : ''
  const description = d.description ? asText(data[d.description]).trim() : ''
  let images: string[] = []
  if (d.images) {
    const v = data[d.images]
    images = (Array.isArray(v) ? v : [v]).filter(
      (x): x is string => typeof x === 'string' && x !== '',
    )
  }
  // With nothing to show as title, fall back to the element's label.
  return { title: title || (description || images.length ? '' : config.label), description, images }
}
