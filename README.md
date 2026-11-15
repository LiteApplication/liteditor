# LiteEditor

A lightweight CMS built into your GitHub repositories. LiteEditor lets you edit your Markdown content, manage your media and configure custom modules (such as carousels) from a clean, simple web interface.

## Documentation

The documentation for making a site compatible with LiteEditor (configuration, field types, settings, carousels, custom elements, examples and schema compatibility) is in [`docs/README.md`](docs/README.md).

## Making a site compatible: the `liteditor` package

You do not write the `.liteditor` file by hand. The [`liteditor`](packages/liteditor/README.md) npm package lets you describe the site once, in TypeScript, and then:

- **generate** the `.liteditor` file that LiteEditor reads at the root of the repository,
- **load** settings, pages, carousels and custom elements at build time, typed and filled with the editor's defaults,
- **validate** the config and all content in CI.

### 1. Install and initialise

```sh
npm install liteditor
npx liteditor init      # creates liteditor.config.ts, the folders and a deploy workflow
```

Requires Node `^20.19` or `>=22.12`.

### 2. Describe the site

`liteditor.config.ts`:

```ts
import { defineConfig, f } from 'liteditor'

export default defineConfig({
  content_path: 'src/content/blog',          // Markdown pages
  assets_path: 'src/assets/images',          // images
  settings_file: 'src/data/site.json',       // global settings
  schema: {                                  // global settings fields
    announcement: f.text('Banner text'),
    showBanner: f.bool('Show banner'),
  },
  frontmatter: {                             // fields of every page
    title: f.text('Title'),
    description: f.longText('Summary'),
    published: f.bool('Published'),
    cover: f.image('Cover image'),
  },
  carousels: {
    homeHero: {
      label: 'Home hero',
      path: 'src/assets/carousels/home-hero',
      schema: { alt: f.text('Alt text'), link: f.link('Link') },   // per slide
      frontmatter: { autoplay: f.bool('Autoplay') },               // whole carousel
    },
  },
})
```

Fields are declared with `f.text`, `f.longText`, `f.bool`, `f.image`, `f.link`, `f.color(label, { alpha })`, `f.select(label, options)`, `f.list(label, item, { max })` and `f.object(label, fields)`. All of them accept `{ description }`. See [field types](docs/field-types.md).

A nested structure, such as a FAQ:

```ts
faq: f.list('FAQ', f.object('Question', {
  question: f.text('Question'),
  answer: f.longText('Answer'),
}), { max: 10 }),
```

### 3. Generate and validate

```sh
npx liteditor generate           # write .liteditor (commit it: LiteEditor reads it from GitHub)
npx liteditor generate --check   # CI: fail if the committed file is stale
npx liteditor check              # validate the config and all content (types, selections, images, unknown elements)
```

Do not edit `.liteditor`: change `liteditor.config.ts` and run `generate` again. Add the two checks to the build step of your deploy workflow (`init` does it for you). A bad content edit then fails the build with the file and field, instead of breaking the published site.

The keys of `liteditor.config.ts` are exactly those of `.liteditor`, described in [configuration](docs/configuration.md). You can also keep a hand-written `.liteditor` (JSON or YAML): delete `liteditor.config.ts`, the loaders read it as is, but data is no longer typed.

### 4. Read the content in the site

```ts
import { loadConfig, createSite } from 'liteditor'

const { config } = await loadConfig()
const site = createSite(config, {
  assetUrl: (path) => `${import.meta.env.BASE_URL}${path}`,   // optional
})

const settings = await site.settings()          // { announcement, showBanner, … }
const pages = await site.pages()                // all pages, sorted by path
const page = await site.page('guides/start')    // by slug, or undefined
const hero = await site.carousel('homeHero')    // { images: [{ src, alt, link }], autoplay }
```

- Missing values get the editor's default (`""`, `false`, `[]`, the first option, `#000000`), so they are never `undefined`.
- A missing settings file, `carousel.json` or content folder gives defaults instead of an error.
- Image paths are normalised to repo-relative; `assetUrl` maps them to the URL you need.
- With Vite, Astro or SvelteKit, the `liteditor/vite` plugin regenerates `.liteditor` on start, exposes `virtual:liteditor` and reloads the dev server when content changes.

### 5. Custom elements

An element is a reusable block that editors insert into a page body (a slider, a callout…). Declare it next to the component that renders it:

```ts
// src/elements/slider.ts
import { defineElement, f } from 'liteditor'

export const slider = defineElement({
  label: 'Slider',
  fields: {
    heading: f.text('Heading'),
    text: f.longText('Description'),
    pics: f.list('Images', f.image('Image')),
  },
  display: { title: 'heading', description: 'text', images: 'pics' },
})
```

then add it to the config with `elements: { slider }`. In the Markdown, the editor writes an instance as a fenced `liteditor-element:<key>` block containing YAML: you never need to write or parse it yourself.

**Using `blocks`** (Astro, Svelte, any templating): each page body is split into text and elements, whose `data` is typed from `fields`.

```ts
const page = await site.page('guides/start')

for (const b of page!.blocks) {
  if (b.type === 'markdown') render(b.value)
  else if (b.type === 'element' && b.key === 'slider') Slider(b.data) // b.rank: position among the page's sliders
}
```

**Using remark** (the body stays one Markdown document):

```ts
import { remarkLiteditorElements } from 'liteditor/remark'

unified().use(remarkParse).use(remarkLiteditorElements, {
  renderers: {
    slider: (d, { rank }) => `<section class="slider">${escape(d.heading)}</section>`,
  },
  onUnknown: (key, reason) => console.warn(`liteditor-element:${key} ${reason}`),
})
```

A renderer returns mdast nodes or a string (raw HTML, which you must escape). Unknown keys and invalid YAML stay visible as code blocks, and `npx liteditor check` reports them in CI. See [custom elements](docs/custom-elements.md).

### What LiteEditor does to the repository

LiteEditor only changes the files referenced by the configuration, and never rewrites `.liteditor`. Each validation creates one commit on the default branch containing only the changed files; your deploy pipeline then publishes the site. Details: [content](docs/content.md), [assets](docs/assets.md), [settings](docs/settings.md), [carousels](docs/carousels.md), [deployment](docs/deployment.md).

---

## Installation and development

This project uses [Vue 3](https://vuejs.org/) and the fast tooling of [Vite](https://vite.dev/).

```sh
# Install dependencies
npm install

# Start the development server (hot reloading)
npm run dev

# Build minified assets for production
npm run build
```

## Schema compatibility and versions

A `.liteditor` file that is valid for a published version must stay valid for all later versions. Each release therefore records a snapshot of the schema in `_history/v<version>.schema.json` (a JSON Schema generated from `src/types/schema.ts`).

- `npm run schema:check` compares the current schema with every snapshot. Rejected: removing or narrowing a type, an `enum` value or a property, making a property required, rejecting unknown properties. Accepted: new optional properties, new field types, widened `enum`s. This check also runs in CI before the build.
- `npm run schema:test` runs the checker's tests.
- `npm run release -- <patch|minor|major|x.y.z> [--dry-run]` requires a clean git tree, refuses the release if the schema is incompatible, bumps the version, writes the snapshot, and also bumps the npm package `liteditor` (`packages/liteditor`) if `packages/` changed since the last release: it then takes the same version as the site (`liteditor-web`), otherwise it keeps lagging behind. It creates the `release vX.Y.Z` commit and the annotated tag `vX.Y.Z`. Nothing is pushed: run `git push && git push origin vX.Y.Z` afterwards.

Never edit an existing file in `_history/`.
