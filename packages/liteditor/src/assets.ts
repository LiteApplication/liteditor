import path from 'node:path'

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/)/i

/**
 * Normalises an image reference to a repo-relative path without a leading slash.
 * `./` and `../` paths are resolved against the folder of `fromFile` (a repo-relative
 * path), which is how the editor writes images in Markdown bodies.
 */
export function normalizeAssetPath(value: string, fromFile?: string): string {
  if (!value || EXTERNAL.test(value)) return value
  if (fromFile && (value.startsWith('./') || value.startsWith('../'))) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), value))
  }
  return path.posix.normalize(value.replace(/^\/+/, ''))
}
