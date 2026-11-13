import { Node, VueNodeViewRenderer } from '@tiptap/vue-3'
import {
  parseElementData,
  parseElementInfo,
  serializeElementBlock,
} from '@/utils/elements'
import ElementNodeView from './ElementNodeView.vue'

// Minimal shapes of the tiptap-markdown / markdown-it pieces we touch.
interface MdToken {
  info: string
  content: string
}
interface MdIt {
  renderer: {
    rules: {
      fence?: (tokens: MdToken[], idx: number, ...rest: unknown[]) => string
    }
  }
  utils: { escapeHtml: (s: string) => string }
}

/**
 * Block atom for custom elements, stored in markdown as
 * ```liteditor-element:<name> + YAML data.
 */
export const ElementNode = Node.create({
  name: 'liteElement',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      name: { default: '' },
      data: { default: {} },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-liteditor-element]',
        getAttrs: (el) => {
          const dom = el as HTMLElement
          let data: unknown = {}
          try {
            data = JSON.parse(dom.getAttribute('data-data') ?? '{}')
          } catch {
            /* keep empty */
          }
          return { name: dom.getAttribute('data-liteditor-element') ?? '', data }
        },
      },
    ]
  },

  renderHTML({ node }) {
    return [
      'div',
      {
        'data-liteditor-element': node.attrs.name,
        'data-data': JSON.stringify(node.attrs.data ?? {}),
      },
    ]
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return VueNodeViewRenderer(ElementNodeView as any)
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { name: string; data: Record<string, unknown> } },
        ) {
          state.write(serializeElementBlock(node.attrs.name, node.attrs.data ?? {}))
          state.closeBlock(node)
        },
        parse: {
          setup(md: MdIt) {
            const original = md.renderer.rules.fence
            md.renderer.rules.fence = (tokens, idx, ...rest) => {
              const token = tokens[idx]!
              const name = parseElementInfo(token.info)
              if (name === null) {
                return original
                  ? original(tokens, idx, ...rest)
                  : `<pre><code>${md.utils.escapeHtml(token.content)}</code></pre>`
              }
              const data = JSON.stringify(parseElementData(token.content))
              return (
                `<div data-liteditor-element="${md.utils.escapeHtml(name)}" ` +
                `data-data="${md.utils.escapeHtml(data)}"></div>\n`
              )
            }
          },
        },
      },
    }
  },
})
