import type { ConfigInput } from './config.ts'

export type PageMode = 'rich' | 'block'

export interface PageTypeInfo {
  key: string
  mode: PageMode
}

const norm = (f: string) => f.replace(/^\/+|\/+$/g, '')

const folderAllowed = (folders: string[] | undefined, allowNew: boolean | undefined, folder: string) =>
  !folders || folders.map(norm).some((a) => folder === a || (allowNew === true && folder.startsWith(`${a}/`)))

/**
 * Type of a page: the `page_type` frontmatter key if it names a declared type, else the first
 * type whose `folders` contain the page. `slug` is relative to `content_path`.
 */
export function resolvePageType(
  config: ConfigInput<any, any, any, any>,
  slug: string,
  data: Record<string, unknown>,
): string | undefined {
  const types = config.page_types ?? {}
  const declared = data.page_type
  if (typeof declared === 'string' && types[declared]) return declared
  const folder = slug.includes('/') ? slug.slice(0, slug.lastIndexOf('/')) : ''
  return Object.entries(types).find(([, t]) => t.folders && folderAllowed(t.folders, t.allow_new_folders, folder))?.[0]
}

/** Edit mode of a page: its `page_mode` if the type allows it, else the type's first mode, else `rich`. */
export function pageModeOf(
  config: ConfigInput<any, any, any, any>,
  type: string | undefined,
  data: Record<string, unknown>,
): PageMode {
  const modes = (type && config.page_types?.[type]?.modes) || ['rich']
  return modes.find((m) => m === data.page_mode) ?? modes[0]!
}

export { folderAllowed }
