# Custom elements

Custom elements are reusable blocks that editors insert into a Markdown page body, such as a slider, a promo box or a callout. Each element type is declared once under `elements` (in `liteditor.config.ts`, generated into `.liteditor`), and each instance is stored in the page as a fenced block with YAML data.

Your site must render these blocks at build time. LiteEditor only writes the Markdown; it does not render anything on the site. The [`liteditor` package](kit.md) does the parsing for you, so you only write the rendering.

## 1. Declare the element

Declare the element next to the component that renders it, and add it to `elements`:

```ts
// src/elements/slider.ts
import { defineElement, f } from 'liteditor'

export const slider = defineElement({
  label: 'Slider',
  description: 'Image slider with a heading and text',
  fields: {
    heading: f.text('Titre'),
    text: f.longText('Description'),
    pics: f.list('Images', f.image('Image')),
  },
  display: { title: 'heading', description: 'text', images: 'pics' },
})
```

```ts
// liteditor.config.ts
import { defineConfig } from 'liteditor'
import { slider } from './src/elements/slider'

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets',
  elements: { slider },
})
```

`npx liteditor generate` writes the matching `elements` entry in `.liteditor`. `data` in your renderers is then typed from `fields`.

### Element properties

These are the keys of `defineElement`, and of each entry of `elements` in `.liteditor`.

| Property | Required | Meaning |
|---|---|---|
| `label` | yes | Name shown in the element picker |
| `description` | no | Help text for editors |
| `color` | no | Accent color of the block in the editor, `#RRGGBB` |
| `icon` | no | Icon of the block in the editor: the name of a [Material icon](https://fonts.google.com/icons) in lowercase with underscores (`image`, `format_quote`, `smart_display`, `campaign`...), or any other short text such as an emoji |
| `fields` | yes | Field definitions, same types as `schema` and `frontmatter` (see [field types](field-types.md)) |
| `display` | no | Which fields the editor card shows |

### The `display` block

All keys are optional. The schema checks them against `fields` when the config loads:

- `display.title` and `display.description` must name a text field: `short-text`, `long-text` or `link`. A field without `type` counts as `short-text`.
- `display.images` must name an `image` field, or a `list` whose `itemSchema` has `"type": "image"`. The `itemSchema.type` must be written explicitly.

If the config breaks these rules, `npx liteditor check` and the editor fail with the message `display.title/description must name a text field and display.images an image (or list of image) field of the element`.

Without `display`, the editor card shows the element `label`. The label is also shown when the instance has no title, description or images to display.

## 2. Use the element in a page

Editors insert elements from the editor, which writes the block for you. If you add one by hand (for example in a test page), write a fenced block whose info string is `liteditor-element:<key>` and whose content is YAML:

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

Do not parse the fences yourself. The `liteditor` package gives you two ways to do it. Without a renderer, the site shows the raw YAML as a code block. Unknown keys and invalid YAML are never dropped: they stay visible, and `npx liteditor check` reports them in CI.

### Option A: `blocks` (Astro, Svelte, any templating)

`site.page()` splits each body in order into Markdown text and elements. `data` is typed from `fields`, with defaults applied and image paths normalised to repo-relative:

```ts
import { loadConfig, createSite } from 'liteditor'

const site = createSite((await loadConfig()).config)
const page = await site.page('summer-sale')
```

```astro
{page.blocks.map((b) =>
  b.type === 'markdown' ? <Fragment set:html={render(b.value)} />
  : b.type === 'element' && b.key === 'slider' ? <Slider {...b.data} rank={b.rank} />
  : b.type === 'unknown-element' ? <pre>{b.raw}</pre>
  : null)}
```

Block types: `markdown` (`value`), `element` (`key`, `data`, `rank`) and `unknown-element` (`key`, `raw`, `error`). For a body that is not a page, use `site.elements(body)`.

### Option B: remark (unified, Astro, MDX-style pipelines)

The body stays one Markdown document. `liteditor/remark` replaces each fence with the output of your renderer for its key:

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { remarkLiteditorElements } from 'liteditor/remark'

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const html = await unified()
  .use(remarkParse)
  .use(remarkLiteditorElements, {
    renderers: {
      // Return mdast nodes so images go through the normal image pipeline...
      slider: (d) => [
        { type: 'heading', depth: 2, children: [{ type: 'text', value: d.heading ?? '' }] },
        { type: 'paragraph', children: [{ type: 'text', value: d.text ?? '' }] },
        ...(d.pics ?? []).map((url) => ({
          type: 'paragraph',
          children: [{ type: 'image', url, alt: '' }],
        })),
      ],
      // ...or a string, which is inserted as raw HTML.
      callout: (d) => `<aside class="callout"><h2>${esc(d.heading)}</h2></aside>`,
    },
    onUnknown: (key, reason) => console.warn(`liteditor-element:${key} ${reason}`),
  })
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true })
  .process(markdown)
```

A renderer receives `(data, { key, rank })`. `rank` is the position among elements of the same key in the document, starting at 0. The plugin also visits elements nested in blockquotes and lists.

Notes for both options:

- Always escape values written into HTML.
- Raw `<img src>` tags are not processed by bundlers such as Vite or Astro. Return mdast image nodes (remark), or use `blocks` with `assetUrl`.
- Writing your own plugin with `js-yaml` still works, but then you also have to handle defaults, ranks, unknown keys and broken YAML.

## Practical notes for renderers

Lessons from real sites; none of this is enforced by LiteEditor.

### Several instances per page, no page per instance

Each `liteditor-element:<key>` block is independent, so one page can hold any number of the same element (for example ten sliders, one per artwork). Do not create one page per slider. If the layout depends on the position (alternating left/right sections, "first two get priority"), use the `rank` the package gives you: it is `b.rank` on a block, and the second argument of a remark renderer.

```js
renderers: {
  slider: (d, { rank }) => `<section class="slider ${rank % 2 ? 'right' : 'left'}">…</section>`,
}
```

### Returning raw HTML

A remark renderer can return mdast nodes or a string. When the markup needs wrappers, classes or attributes that mdast cannot express, return a string: it is inserted as raw HTML.

```js
slider: (d) => `<div class="slider">…</div>`
```

A raw `<img>` is not processed by Vite or Astro (see the notes above). With `blocks`, image paths are already repo-relative and `assetUrl` in `createSite` maps them, including the site `base` path. In a remark renderer they are as written in the page (relative to the file), so resolve them yourself. Escape every value.

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

### Block color and icon

`color` and `icon` only change how the block looks in the editor (card border, label and icon). Icons come from the [Material Icons](https://fonts.google.com/icons) set (outlined style), bundled with LiteEditor. Use the icon's name exactly as listed on that page, in lowercase with underscores. A name that does not exist is shown as plain text, so check it in the editor. Any value that is not a plain lowercase name, such as an emoji, is displayed as text.
