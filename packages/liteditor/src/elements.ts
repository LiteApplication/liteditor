import yaml from 'js-yaml'

export const ELEMENT_PREFIX = 'liteditor-element:'

export interface MarkdownBlock {
  type: 'markdown'
  value: string
}

export interface ElementBlock {
  type: 'element'
  key: string
  data: Record<string, any>
  /** Position among blocks with the same key on the page, starting at 0. */
  rank: number
  /** Original YAML text. */
  raw: string
  /** Set when the YAML could not be parsed (data is then `{}`). */
  error?: string
}

export type Block = MarkdownBlock | ElementBlock

/**
 * Splits a Markdown body into text and `liteditor-element:<key>` blocks. Fences of
 * any length are understood, and elements shown inside another code fence are left alone.
 */
export function splitBody(body: string): Block[] {
  const lines = body.split('\n')
  const blocks: Block[] = []
  const ranks: Record<string, number> = {}
  let text: string[] = []

  const flush = () => {
    if (text.length) blocks.push({ type: 'markdown', value: text.join('\n') })
    text = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const open = /^ {0,3}(`{3,}|~{3,})\s*(.*?)\s*$/.exec(line.replace(/\r$/, ''))
    if (!open) {
      text.push(line)
      continue
    }
    const fence = open[1]!
    const info = open[2]!
    const closer = new RegExp(`^ {0,3}\\${fence[0]}{${fence.length},}\\s*$`)
    let end = i + 1
    while (end < lines.length && !closer.test(lines[end]!.replace(/\r$/, ''))) end++
    const inner = lines.slice(i + 1, end)

    if (info.startsWith(ELEMENT_PREFIX) && end < lines.length) {
      const key = info.slice(ELEMENT_PREFIX.length).split(/\s/)[0]!.trim()
      const raw = inner.join('\n')
      flush()
      const block: ElementBlock = { type: 'element', key, data: {}, rank: (ranks[key] = (ranks[key] ?? -1) + 1), raw }
      try {
        const data = yaml.load(raw)
        if (data !== null && data !== undefined) {
          if (typeof data !== 'object' || Array.isArray(data)) throw new Error('element body must be a YAML mapping')
          block.data = data as Record<string, any>
        }
      } catch (e) {
        block.error = e instanceof Error ? e.message : String(e)
      }
      blocks.push(block)
    } else {
      // Ordinary code fence (or unterminated one): keep verbatim.
      const last = Math.min(end, lines.length - 1)
      text.push(...lines.slice(i, last + 1))
    }
    i = end
  }
  flush()
  return blocks
}
