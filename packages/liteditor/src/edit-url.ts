export const DEFAULT_EDITOR_URL = 'https://editor.liteapp.fr'

export interface EditUrlOptions {
  /** GitHub repository as `owner/name`. Overrides autodetection. */
  repo?: string
  /** Base URL of the LiteEditor instance. Defaults to `LITEDITOR_URL`, then https://editor.liteapp.fr. */
  editorUrl?: string
  /** Environment to read from. Defaults to `process.env`. */
  env?: Record<string, string | undefined>
}

/**
 * Direct link that opens the editor on this site's repository.
 *
 * The repository is `options.repo`, else `LITEDITOR_REPO`, else `GITHUB_REPOSITORY`
 * (set automatically in GitHub Actions, so GitHub Pages builds need no configuration).
 * Returns `undefined` when no repository can be determined (e.g. local dev).
 */
export function editUrl(options: EditUrlOptions = {}): string | undefined {
  const env = options.env ?? (typeof process !== 'undefined' ? process.env : {})
  const repo = (options.repo ?? env.LITEDITOR_REPO ?? env.GITHUB_REPOSITORY)?.trim()
  const m = repo?.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (!m) {
    if (options.repo) throw new Error(`editUrl: repo must look like "owner/name", got "${options.repo}"`)
    return undefined
  }
  const base = (options.editorUrl ?? env.LITEDITOR_URL ?? DEFAULT_EDITOR_URL).replace(/\/+$/, '')
  return `${base}/edit/${m[1]}/${m[2]}`
}
