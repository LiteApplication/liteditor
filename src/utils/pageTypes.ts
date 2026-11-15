import type { LiteEditorConfig, PageMode, PageTypeConfig } from '../types/schema'

export const PAGE_TYPE_KEY = 'page_type'
export const PAGE_MODE_KEY = 'page_mode'

export interface PageRef {
  /** Path relative to content_path, e.g. "landing/home.md" */
  relPath: string
}

export function folderOf(relPath: string): string {
  const i = relPath.lastIndexOf('/')
  return i < 0 ? '' : relPath.slice(0, i)
}

function norm(f: string): string {
  return f.replace(/^\/+|\/+$/g, '')
}

export function typeFolders(t: PageTypeConfig): string[] | null {
  return t.folders ? t.folders.map(norm) : null
}

/** Whether a folder (relative to content_path, '' = root) is permitted for the type. */
export function folderAllowed(t: PageTypeConfig, folder: string): boolean {
  const folders = typeFolders(t)
  if (!folders) return true
  const f = norm(folder)
  return folders.some((a) => f === a || (t.allow_new_folders === true && f.startsWith(`${a}/`)))
}

export function defaultFolder(t: PageTypeConfig): string {
  return typeFolders(t)?.[0] ?? ''
}

/** Resolves the type of a page: frontmatter key first, then the first type whose folders match. */
export function resolvePageType(
  config: LiteEditorConfig | null,
  relPath: string,
  frontmatter: Record<string, unknown>,
): { key: string; type: PageTypeConfig } | null {
  const types = config?.page_types
  if (!types) return null
  const declared = frontmatter[PAGE_TYPE_KEY]
  if (typeof declared === 'string' && types[declared]) return { key: declared, type: types[declared] }
  const folder = folderOf(relPath)
  for (const [key, type] of Object.entries(types)) {
    if (type.folders && folderAllowed(type, folder)) return { key, type }
  }
  return null
}

export function allowedModes(t: PageTypeConfig | null | undefined): PageMode[] {
  return t?.modes?.length ? t.modes : ['rich']
}

/** Mode of a page: its frontmatter choice if the type allows it, else the type's default. */
export function resolveMode(t: PageTypeConfig | null | undefined, frontmatter: Record<string, unknown>): PageMode {
  const modes = allowedModes(t)
  const m = frontmatter[PAGE_MODE_KEY]
  return modes.find((x) => x === m) ?? modes[0]!
}

/** Element names usable on a page of this type. */
export function allowedElements(config: LiteEditorConfig | null, t: PageTypeConfig | null | undefined): string[] {
  const all = Object.keys(config?.elements ?? {})
  if (!t?.elements) return all
  return all.filter((n) => t.elements!.includes(n))
}

/** Number of pages of this type in a folder. `pages` are paths relative to content_path with their frontmatter. */
export function countInFolder(
  config: LiteEditorConfig,
  key: string,
  folder: string,
  pages: { relPath: string; frontmatter?: Record<string, unknown> }[],
): number {
  const f = norm(folder)
  return pages.filter(
    (p) =>
      norm(folderOf(p.relPath)) === f &&
      resolvePageType(config, p.relPath, p.frontmatter ?? {})?.key === key,
  ).length
}

export type CreateCheck = { ok: true } | { ok: false; reason: 'folder' | 'limit' }

export function canCreateIn(
  config: LiteEditorConfig,
  key: string,
  folder: string,
  pages: { relPath: string; frontmatter?: Record<string, unknown> }[],
): CreateCheck {
  const t = config.page_types?.[key]
  if (!t) return { ok: true }
  if (!folderAllowed(t, folder)) return { ok: false, reason: 'folder' }
  if (t.max_pages_per_folder !== undefined && countInFolder(config, key, folder, pages) >= t.max_pages_per_folder)
    return { ok: false, reason: 'limit' }
  return { ok: true }
}

/** Names in `page_types[*].elements` that are not declared in `elements`. */
export function unknownElementRefs(config: LiteEditorConfig): { type: string; element: string }[] {
  const known = new Set(Object.keys(config.elements ?? {}))
  const out: { type: string; element: string }[] = []
  for (const [type, t] of Object.entries(config.page_types ?? {}))
    for (const element of t.elements ?? []) if (!known.has(element)) out.push({ type, element })
  return out
}
