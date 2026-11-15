# liteditor

Build-time companion for websites edited with [LiteEditor](https://github.com/LiteApplication/liteditor), the GitHub-backed CMS.

It does two things:

1. **Loads what editors changed**, at build time: settings, Markdown pages (frontmatter and body), carousels and the custom elements inside page bodies. Every declared field is filled with the editor's default, so templates never see `undefined`, and data is typed.
2. **Generates `.liteditor`** from a typed config, so the schema is defined once, in code.

No runtime, no server: it only reads files in your repository.

```sh
npm install liteditor
npx liteditor init      # scaffolds liteditor.config.ts, folders and a deploy workflow
```

Requires Node `^20.19` or `>=22.12`.

## 1. Define the site once

`liteditor.config.ts`:

```ts
import { defineConfig, f } from 'liteditor'
import { callout } from './src/elements/callout'

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets/images',
  settings_file: 'src/data/site.json',
  schema: {                                   // global settings
    announcement: f.text('Banner text'),
    showBanner: f.bool('Show banner'),
  },
  frontmatter: {                              // every page
    title: f.text('Title'),
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
  elements: { callout },
})
```

The keys are exactly those of the `.liteditor` file ([docs](../../docs/configuration.md)), so nothing needs translating.

Declare an element next to the component that renders it:

```ts
// src/elements/callout.ts
import { defineElement, f } from 'liteditor'

export const callout = defineElement({
  label: 'Callout',
  fields: { heading: f.text('Heading'), text: f.longText('Text'), photo: f.image('Photo') },
  display: { title: 'heading', description: 'text', images: 'photo' },
})
```

Field builders: `f.text`, `f.longText`, `f.bool`, `f.image`, `f.link`, `f.color(label, { alpha })`, `f.select(label, ['a', 'b'])` (or `{ value, label }` objects), `f.list(label, item, { max })`, `f.object(label, fields)`. All accept `{ description }`.

Then write `.liteditor` (LiteEditor reads it from GitHub, so it stays committed):

```sh
npx liteditor generate           # write .liteditor
npx liteditor generate --check   # CI: fail if the committed file is stale
npx liteditor check              # validate config and all content (types, selections, image files, unknown elements)
```

Prefer a hand-written `.liteditor` (JSON or YAML)? Delete `liteditor.config.ts`: the loaders below read it as is, data is just not typed.

## 2. Read the content at build time

```ts
import { loadConfig, createSite } from 'liteditor'

const { config } = await loadConfig()           // liteditor.config.* or .liteditor
const site = createSite(config, {
  assetUrl: (path) => `${import.meta.env.BASE_URL}${path}`,   // optional
})

const settings = await site.settings()          // { announcement, showBanner, ...undeclared keys }
const pages = await site.pages()                // all pages, sorted by path
const page = await site.page('guides/start')    // by slug, or undefined
const hero = await site.carousel('homeHero')    // { images: [{ src, alt, link }], autoplay }
```

A page is `{ slug, file, data, body, blocks }`. `blocks` is the body split in order into:

- `{ type: 'markdown', value }`: text between elements,
- `{ type: 'element', key, data, rank }`: a declared element, `data` typed from its fields and `rank` its position among same-key elements on the page,
- `{ type: 'unknown-element', key, raw, error? }`: an element that is not declared or has broken YAML. It is never dropped, so you can show or log it.

Behaviour that matches the editor ([content](../../docs/content.md)):

- Missing values get the editor's default: `""`, `false`, `[]`, the first option of a selection, `#000000`. Keys you did not declare are kept.
- A missing settings file, `carousel.json` or content folder gives defaults instead of an error.
- Invalid frontmatter means the whole file is body text.
- **Image paths are normalised to repo-relative** (`src/assets/images/a.png`), including `../` paths written in element bodies, resolved against the page. With `assetUrl` they are mapped to whatever your templates need.

## 3. Render elements

Pick whichever fits your pipeline.

**Using `blocks`** (Astro, Svelte, any templating):

```astro
{page.blocks.map((b) =>
  b.type === 'markdown' ? <Fragment set:html={render(b.value)} />
  : b.type === 'element' && b.key === 'callout' ? <Callout {...b.data} />
  : null)}
```

**Using remark** (the body stays one Markdown document):

```ts
import { remarkLiteditorElements } from 'liteditor/remark'

unified().use(remarkParse).use(remarkLiteditorElements, {
  renderers: {
    callout: (d, { rank }) => `<aside class="callout"><h2>${escape(d.heading)}</h2></aside>`, // string = raw HTML
    // or return mdast node(s) so images go through your normal image pipeline
  },
  onUnknown: (key, reason) => console.warn(`liteditor-element:${key} ${reason}`),
})
```

Unknown keys and invalid YAML stay visible as code blocks. Always escape values you put in HTML.

## 4. Vite, Astro, SvelteKit

```ts
// vite.config.ts (Astro: vite.plugins in astro.config)
import { liteditor } from 'liteditor/vite'
export default { plugins: [liteditor()] }
```

```ts
import { settings, pages, carousels } from 'virtual:liteditor'
```

The plugin regenerates `.liteditor` on start, and reloads the dev server when a content file, the settings file or a carousel changes. The virtual module is untyped; add a `declare module 'virtual:liteditor'` in your project, or use `createSite` in Node-side code, which is fully typed.

## CI

Add to the build job of your deploy workflow (`init` does this for you):

```yaml
- run: npx liteditor generate --check
- run: npx liteditor check
```

A bad content edit then fails the build with the file and field, instead of breaking the published site.

## Compatibility

The package bundles the editor's own config schema (`src/types/schema.ts`), so it accepts exactly what LiteEditor accepts. See [schema compatibility](../../docs/schema-compatibility.md).

## Releasing (maintainers)

1. Bump `version` in `packages/liteditor/package.json` and commit.
2. `git tag liteditor-v<version> && git push origin liteditor-v<version>`.
3. `.github/workflows/liteditor-package.yml` tests, checks that the tag matches the version, and publishes to npm with provenance. It needs an `NPM_TOKEN` repository secret (an automation token for the `liteditor` package).
