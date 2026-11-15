# Worked examples

Three complete setups, from the smallest possible to a full site. Each one shows the repository tree, the `liteditor.config.ts` you write, and sample content. `npx liteditor generate` turns the config into the `.liteditor` file LiteEditor reads, so you never write that file by hand. All configs below are valid against the current schema.

Paths are repo-relative and never start with `/`.

## 1. Blog only (minimal)

The editor lists every `.md` file under `content_path` and lets you edit its body. No frontmatter, no settings, no carousels.

### Repository tree

```text
my-blog/
├── .github/workflows/deploy.yml   # build + publish (see deployment notes)
├── .liteditor                     # generated
├── liteditor.config.ts
└── src/
    ├── assets/images/
    │   └── .gitkeep               # keeps the empty assets folder in git
    └── content/blog/
        ├── hello-world.md
        └── second-post.md
```

### `liteditor.config.ts`

```ts
import { defineConfig } from 'liteditor'

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets/images',
})
```

`npx liteditor generate` writes `.liteditor` from it.

### Sample content

`src/content/blog/hello-world.md`:

```markdown
Welcome to my blog. This first post has no frontmatter: only the body is editable.
```

`src/content/blog/second-post.md`:

```markdown
## Notes on the second post

Plain Markdown, with a [link to the first post](hello-world.md).
```

The relative link is rewritten by LiteEditor if you rename or move `hello-world.md`.

## 2. Blog with settings and frontmatter

Adds per-post metadata (title, summary, published flag, cover image, accent color) and a global settings file for the site banner.

### Repository tree

```text
my-blog/
├── .github/workflows/deploy.yml
├── .liteditor                     # generated
├── liteditor.config.ts
└── src/
    ├── assets/images/
    │   ├── cover-hello.jpg
    │   └── cover-second.jpg
    ├── content/blog/
    │   ├── hello-world.md
    │   └── second-post.md
    └── data/
        └── site.json              # settings_file
```

### `liteditor.config.ts`

```ts
import { defineConfig, f } from 'liteditor'

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets/images',
  settings_file: 'src/data/site.json',
  schema: {
    announcement: f.text('Banner text', {
      description: 'Shown at the top of every page. Leave empty to hide it.',
    }),
    showBanner: f.bool('Show banner'),
  },
  frontmatter: {
    title: f.text('Title'),
    description: f.longText('Summary', { description: 'Shown in post lists.' }),
    published: f.bool('Published'),
    cover: f.image('Cover image'),
    accentColor: f.color('Accent color'),
  },
})
```

Run `npx liteditor generate` to write `.liteditor`.

> `accentColor` uses `f.color` without `alpha`, so the stored value is a 6-digit hex string such as `#3366ff`.

### Sample content

`src/data/site.json`:

```json
{
  "announcement": "Summer sale ends Sunday",
  "showBanner": true
}
```

`src/content/blog/hello-world.md`:

```markdown
---
title: Hello world
description: My first post, and how this blog works.
published: true
cover: src/assets/images/cover-hello.jpg
accentColor: "#3366ff"
---

Welcome to my blog.
```

`src/content/blog/second-post.md`:

```markdown
---
title: Second post
description: Notes on the second post.
published: false
accentColor: "#e0572f"
---

Draft content, not published yet.
```

Frontmatter values are stored as YAML. Quote colors so YAML does not read `#` as a comment.

## 3. Full site: settings, carousel and custom element

Adds a home-page carousel and a reusable `callout` block that editors can insert into any post.

### Repository tree

```text
my-site/
├── .github/workflows/deploy.yml
├── .liteditor                     # generated
├── liteditor.config.ts
└── src/
    ├── assets/
    │   ├── images/
    │   │   ├── cover-hello.jpg
    │   │   └── sale.jpg
    │   └── carousels/
    │       └── home-hero/
    │           ├── carousel.json  # carousel data
    │           ├── slide1.jpg
    │           └── slide2.jpg
    ├── content/blog/
    │   ├── hello-world.md
    │   └── summer-sale.md
    └── data/
        └── site.json
```

### `liteditor.config.ts`

```ts
import { defineConfig, defineElement, f } from 'liteditor'

const callout = defineElement({
  label: 'Callout',
  description: 'Highlighted box with a heading, text and an optional photo.',
  fields: {
    heading: f.text('Heading'),
    text: f.longText('Text'),
    photo: f.image('Photo'),
  },
  display: { title: 'heading', description: 'text', images: 'photo' },
})

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets/images',
  settings_file: 'src/data/site.json',
  schema: {
    announcement: f.text('Banner text'),
    showBanner: f.bool('Show banner'),
  },
  frontmatter: {
    title: f.text('Title'),
    description: f.longText('Summary'),
    published: f.bool('Published'),
    cover: f.image('Cover image'),
    accentColor: f.color('Accent color'),
  },
  carousels: {
    homeHero: {
      label: 'Home hero',
      description: 'Slides shown at the top of the home page.',
      path: 'src/assets/carousels/home-hero',
      schema: { alt: f.text('Alt text'), link: f.link('Link') },
      frontmatter: { autoplay: f.bool('Autoplay'), interval: f.text('Interval (ms)') },
    },
  },
  elements: { callout },
})
```

The `display` block must point at real fields (`npx liteditor check` tells you if it does not): `title` and `description` need a text field (`short-text`, `long-text` or `link`), and `images` needs an `image` field or a `list` of `image`. Otherwise validation fails.

### Sample content

`src/assets/carousels/home-hero/carousel.json`:

```json
{
  "images": [
    {
      "src": "src/assets/carousels/home-hero/slide1.jpg",
      "alt": "Mountain lake at dawn",
      "link": "/products"
    },
    {
      "src": "src/assets/carousels/home-hero/slide2.jpg",
      "alt": "Autumn forest path"
    }
  ],
  "autoplay": true,
  "interval": "4000"
}
```

`src/data/site.json`:

```json
{
  "announcement": "Summer sale ends Sunday",
  "showBanner": true
}
```

`src/content/blog/summer-sale.md`:

````markdown
---
title: Summer sale
description: Everything you need to know about this week's offers.
published: true
cover: src/assets/images/sale.jpg
---

Our biggest discounts of the year start today.

```liteditor-element:callout
heading: Up to 50% off
text: Selected items only, while stocks last.
photo: src/assets/images/sale.jpg
```

Come and see us in store.
````

The site build must turn `liteditor-element:` fences into HTML. With the package, that is a few lines:

```ts
import { loadConfig, createSite } from 'liteditor'

const site = createSite((await loadConfig()).config)
const settings = await site.settings()           // { announcement, showBanner }
const hero = await site.carousel('homeHero')     // { images, autoplay, interval }
const page = await site.page('summer-sale')

for (const b of page!.blocks) {
  if (b.type === 'markdown') renderMarkdown(b.value)
  else if (b.type === 'element' && b.key === 'callout') Callout(b.data) // data.heading, data.text, data.photo
}
```

See [Custom elements](custom-elements.md) for the remark alternative. Without a renderer, the block shows as a code block.

Next: [Design guidelines](design-guidelines.md)
