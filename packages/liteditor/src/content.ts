import yaml from 'js-yaml'

const FRONTMATTER = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/

/**
 * Splits a page into frontmatter and body. Like the editor, invalid or non-mapping
 * frontmatter means the whole file is body text.
 */
export function parseMarkdown(source: string): { data: Record<string, unknown>; body: string } {
  const match = FRONTMATTER.exec(source)
  if (!match) return { data: {}, body: source }
  try {
    const data = yaml.load(match[1] ?? '')
    if (data === null || data === undefined) return { data: {}, body: source.slice(match[0].length) }
    if (typeof data !== 'object' || Array.isArray(data)) return { data: {}, body: source }
    return { data: data as Record<string, unknown>, body: source.slice(match[0].length) }
  } catch {
    return { data: {}, body: source }
  }
}
