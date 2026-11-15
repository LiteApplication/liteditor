import yaml from 'js-yaml'
import { ELEMENT_PREFIX } from './elements.ts'

// Minimal mdast shape so the package does not depend on @types/mdast.
interface Node {
  type: string
  lang?: string | null
  value?: string
  children?: Node[]
  [key: string]: unknown
}

export interface RenderContext {
  key: string
  /** 0 for the first element of this key in the document, then 1, 2… */
  rank: number
}

/** Return mdast node(s), or a string which is inserted as raw HTML. */
export type ElementRenderer = (data: Record<string, any>, ctx: RenderContext) => Node | Node[] | string

export interface RemarkElementsOptions {
  renderers: Record<string, ElementRenderer>
  /** Called for blocks with no renderer or broken YAML. The block stays visible as a code block. */
  onUnknown?: (key: string, reason: 'no-renderer' | 'invalid-yaml') => void
}

/**
 * remark plugin that replaces ```liteditor-element:<key> fences with your renderers.
 * Unknown keys and invalid YAML are left in the page as code blocks, never dropped.
 */
export function remarkLiteditorElements(options: RemarkElementsOptions) {
  return (tree: Node) => {
    const ranks: Record<string, number> = {}
    const visit = (node: Node): void => {
      if (!node.children) return
      for (let i = 0; i < node.children.length; i++) {
        const child: Node = node.children[i]!
        if (child.type === 'code' && child.lang?.startsWith(ELEMENT_PREFIX)) {
          const key = child.lang.slice(ELEMENT_PREFIX.length).trim()
          const render = options.renderers[key]
          if (!render) {
            options.onUnknown?.(key, 'no-renderer')
            continue
          }
          let data: Record<string, any>
          try {
            const parsed = yaml.load(child.value ?? '') ?? {}
            if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not a mapping')
            data = parsed as Record<string, any>
          } catch {
            options.onUnknown?.(key, 'invalid-yaml')
            continue
          }
          const rank = (ranks[key] = (ranks[key] ?? -1) + 1)
          const out = render(data, { key, rank })
          const nodes = typeof out === 'string' ? [{ type: 'html', value: out }] : Array.isArray(out) ? out : [out]
          node.children.splice(i, 1, ...nodes)
          i += nodes.length - 1
        } else {
          visit(child)
        }
      }
    }
    visit(tree)
  }
}

export default remarkLiteditorElements
