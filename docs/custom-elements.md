# Custom elements

Custom elements are reusable blocks that editors insert into a Markdown page body, such as a slider, a promo box or a callout. Each element type is declared once in `.liteditor` under `elements`, and each instance is stored in the page as a fenced block with YAML data.

Your site must render these blocks at build time. LiteEditor only writes the Markdown; it does not render anything on the site.

## 1. Declare the element

Add an `elements` key to `.liteditor`:

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets",
  "elements": {
    "slider": {
      "label": "Slider",
      "description": "Image slider with a heading and text",
      "fields": {
        "heading": { "type": "short-text", "label": "Titre" },
        "text": { "type": "long-text", "label": "Description" },
        "pics": { "type": "list", "label": "Images", "itemSchema": { "type": "image" } }
      },
      "display": { "title": "heading", "description": "text", "images": "pics" }
    }
  }
}
```

### Element properties

| Property | Required | Meaning |
|---|---|---|
| `label` | yes | Name shown in the element picker |
| `description` | no | Help text for editors |
| `fields` | yes | Field definitions, same types as `schema` and `frontmatter` (see [field types](field-types.md)) |
| `display` | no | Which fields the editor card shows |

### The `display` block

All keys are optional. The schema checks them against `fields` when the config loads:

- `display.title` and `display.description` must name a text field: `short-text`, `long-text` or `link`. A field without `type` counts as `short-text`.
- `display.images` must name an `image` field, or a `list` whose `itemSchema` has `"type": "image"`. The `itemSchema.type` must be written explicitly.

If the config breaks these rules, validation fails with the message `display.title/description must name a text field and display.images an image (or list of image) field of the element`.

Without `display`, the editor card shows the element `label`. The label is also shown when the instance has no title, description or images to display.

## 2. Use the element in a page

In the Markdown body, write a fenced block whose info string is `liteditor-element:<key>` and whose content is YAML:

````markdown
```liteditor-element:slider
heading: Soldes
text: Jusqu'à -50 %
pics:
  - ../assets/a.jpg
  - ../assets/b.jpg
```
````

Rules:

- The YAML body keys match the element `fields` keys.
- Image paths are written as relative paths from the Markdown file, as in the example above.
- LiteEditor writes the body with a YAML serializer. If the body contains backticks, the fence is made longer than the longest backtick run, so you do not need to handle this yourself.

## 3. Render it on the site

The build must turn the block into HTML. Without a plugin, the site shows the raw YAML as a code block.

### Option A: remark (unified, Astro, Next.js with MDX-style pipelines)

Install the helpers:

```sh
npm install js-yaml unist-util-visit
```

`remark-liteditor-elements.js`:

```js
import yaml from 'js-yaml'
import { visit } from 'unist-util-visit'

const PREFIX = 'liteditor-element:'

// One renderer per element key. Return Markdown (mdast) nodes so that
// images go through the same path handling as normal Markdown images.
const renderers = {
  slider(d) {
    return [
      { type: 'heading', depth: 2, children: [{ type: 'text', value: d.heading ?? '' }] },
      { type: 'paragraph', children: [{ type: 'text', value: d.text ?? '' }] },
      ...(d.pics ?? []).map((url) => ({
        type: 'paragraph',
        children: [{ type: 'image', url, alt: '' }],
      })),
    ]
  },
}

export default function remarkLiteditorElements() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!node.lang?.startsWith(PREFIX) || index === undefined) return
      const render = renderers[node.lang.slice(PREFIX.length).trim()]
      if (!render) return
      const data = yaml.load(node.value) ?? {}
      parent.children.splice(index, 1, ...render(data))
    })
  }
}
```

Use it in your processor:

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkLiteditorElements from './remark-liteditor-elements.js'

const html = await unified()
  .use(remarkParse)
  .use(remarkLiteditorElements)
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(markdown)
```

### Option B: markdown-it

```js
import MarkdownIt from 'markdown-it'
import yaml from 'js-yaml'

const PREFIX = 'liteditor-element:'
const md = new MarkdownIt()
const defaultFence = md.renderer.rules.fence
const esc = md.utils.escapeHtml

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const info = token.info.trim()
  if (!info.startsWith(PREFIX)) return defaultFence(tokens, idx, options, env, self)

  const name = info.slice(PREFIX.length).trim()
  const data = yaml.load(token.content) ?? {}
  if (name !== 'slider') return `<pre><code>${esc(token.content)}</code></pre>\n`

  const pics = (data.pics ?? []).map((src) => `<img src="${esc(src)}" alt="">`).join('')
  return `<section class="lite-slider"><h2>${esc(data.heading ?? '')}</h2><p>${esc(data.text ?? '')}</p>${pics}</section>\n`
}
```

Notes for both options:

- Always escape values written into HTML.
- Unknown element keys should fall back to something visible, as the markdown-it example does for unknown names. Do not drop them silently.
- Raw `<img src>` tags written by hand are not processed by bundlers such as Vite or Astro. If you use markdown-it, resolve the image paths yourself, or use the remark version, which lets the normal image pipeline handle them.

## Practical notes for renderers

Lessons from real sites; none of this is enforced by LiteEditor.

### Several instances per page, no page per instance

Each `liteditor-element:<key>` block is independent, so one page can hold any number of the same element (for example ten sliders, one per artwork). Do not create one page per slider. If the layout depends on the position (alternating left/right sections, "first two get priority"), count the instances of each key while you visit the tree and pass that rank to the renderer:

```js
const counts = {}
visit(tree, 'code', (node, i, parent) => {
  const key = node.lang.slice(PREFIX.length).trim()
  const rank = (counts[key] = (counts[key] ?? -1) + 1) // 0 for the first of its kind
  // render(data, rank)
})
```

### Returning raw HTML

The remark example above returns mdast nodes. When the markup needs wrappers, classes or attributes that mdast cannot express, replace the node with an `html` node instead:

```js
node.type = 'html'
node.value = '<div class="slider">…</div>'
delete node.lang
delete node.meta
```

Resolve image paths yourself in that case, because a raw `<img>` is not processed by Vite or Astro (see the notes above). Remember the site `base` path when generating URLs, and escape every value.

### Interactive elements with client-side navigation

Render the HTML at build time and keep the script limited to binding events. If the site uses client-side page transitions (Astro `ClientRouter`, Turbo, Swup…), a module script runs only once, on the first full load. Bind on the router's page event, not at the top level of the script:

```js
// Astro ClientRouter; use the equivalent event of your router
document.addEventListener('astro:page-load', () => {
  document.querySelectorAll('.slider').forEach(bind)
})
```

Otherwise the element works after a hard refresh and stops working after navigating to another page.

### Image loading in repeated elements

A page with many sliders loads slowly if every image is requested at once.

- Make the first image of each element `loading="eager"`, with `fetchpriority="high"` for the first one or two elements and `fetchpriority="low"` for the others.
- Leave the other images `loading="lazy"`, and switch them to `eager` on the first hover, touch or click on that element, so they are already loaded when the visitor moves to the next slide.
- Generate `srcset` / `sizes` from the displayed width, not the original size.

### Fixed heights hide what follows

A container with a fixed `height` (for example `100vh - 12em`) around elements of variable length makes the content overflow it, and anything placed after it, such as the footer, ends up underneath. Use `min-height`.

## Element or carousel?

Both are reusable blocks, but they fit different jobs.

| Use a **custom element** when... | Use a **carousel** when... |
|---|---|
| Editors place the block at chosen points in page text | The content lives in one fixed place on the site, such as the home hero |
| Each page can have different content of the same kind | One ordered collection is shown in one location |
| The block sits inside prose, between paragraphs | The block is a standalone module with its own data file |
| Data is stored inside the Markdown file | Data is stored in `carousel.json` in its own folder |

See [carousels](carousels.md) for the carousel format.

Next: [Deployment](deployment.md)
