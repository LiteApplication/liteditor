// Frontmatter parse/serialize helpers
import * as yaml from 'js-yaml'

/**
 * Split a raw markdown string into its YAML frontmatter and body.
 */
export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (match) {
    try {
      const fm = yaml.load(match[1] ?? '') as Record<string, unknown>
      return { frontmatter: fm ?? {}, body: match[2] ?? '' }
    } catch {
      return { frontmatter: {}, body: raw }
    }
  }
  return { frontmatter: {}, body: raw }
}

/**
 * Combine frontmatter object and body into a raw markdown string.
 * Returns just the body when frontmatter is empty.
 */
export function serializeFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  if (Object.keys(frontmatter).length === 0) return body
  return `---\n${yaml.dump(frontmatter, { lineWidth: -1 })}---\n${body}`
}
