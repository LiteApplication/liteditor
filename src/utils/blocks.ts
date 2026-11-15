// Block-mode pages: the body is a sequence of element fences and, optionally,
// plain Markdown segments between them.
import {
  ELEMENT_INFO_PREFIX,
  parseElementData,
  parseElementInfo,
  serializeElementBlock,
} from './elements.ts'

export type Block =
  | { kind: 'element'; name: string; data: Record<string, unknown> }
  | { kind: 'markdown'; text: string }

const FENCE_OPEN = /^(`{3,})(.*)$/

/** Splits a page body into ordered element and markdown blocks. */
export function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/)
  const blocks: Block[] = []
  let md: string[] = []
  const flushMd = () => {
    const text = md.join('\n').replace(/^\n+|\n+$/g, '')
    if (text.trim()) blocks.push({ kind: 'markdown', text })
    md = []
  }
  for (let i = 0; i < lines.length; i++) {
    const open = FENCE_OPEN.exec(lines[i]!)
    const name = open && open[2]!.trim().startsWith(ELEMENT_INFO_PREFIX) ? parseElementInfo(open[2]!) : null
    if (!open || name === null) {
      md.push(lines[i]!)
      continue
    }
    const fence = open[1]!
    const content: string[] = []
    let j = i + 1
    while (j < lines.length && !(lines[j]!.startsWith(fence) && lines[j]!.trim() === fence)) {
      content.push(lines[j]!)
      j++
    }
    flushMd()
    blocks.push({ kind: 'element', name, data: parseElementData(content.join('\n')) })
    i = j
  }
  flushMd()
  return blocks
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks
    .map((b) => (b.kind === 'element' ? serializeElementBlock(b.name, b.data) : b.text.trim()))
    .join('\n\n')
    .concat(blocks.length ? '\n' : '')
}
