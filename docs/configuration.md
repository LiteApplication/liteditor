# Configuration

Everything LiteEditor needs to know about a site is declared in a single file: `.liteditor`, at the root of the repository.

You normally do not write that file by hand. Define the site in `liteditor.config.ts` with the [`liteditor` package](kit.md) and generate it:

```ts
import { defineConfig, f } from 'liteditor'

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets',
  frontmatter: {
    title: f.text('Title'),
  },
})
```

```sh
npx liteditor generate           # write .liteditor
npx liteditor generate --check   # CI: fail if the committed file is stale
npx liteditor check              # validate the config and all content
```

The keys are exactly those of `.liteditor`, so everything below applies to both. The JSON and YAML examples show what the generated file contains, or what to write if you choose not to use the package (delete `liteditor.config.ts` and the package reads your hand-written file as is, but data is then not typed).

## Location and format

- The file is named exactly `.liteditor` and sits at the repo root.
- It can be written as **JSON** or **YAML**. LiteEditor tries JSON first and falls back to YAML, so both work. Use one format per file.
- LiteEditor reads the file from the default branch and validates it against the schema. If validation fails, the editor shows the path of the problem and the reason.
- LiteEditor never rewrites `.liteditor`. With the package, change `liteditor.config.ts` and run `npx liteditor generate`; the generated file is JSON and must be committed.

## Minimal example

TypeScript (`liteditor.config.ts`):

```ts
export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets',
  frontmatter: { title: f.text('Title') },
})
```

Generated JSON:

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets",
  "frontmatter": {
    "title": {
      "label": "Title",
      "type": "short-text"
    }
  }
}
```

YAML:

```yaml
content_path: src/content/blog
assets_path: src/assets
frontmatter:
  title:
    label: Title
    type: short-text
```

## Full example

This configuration uses every top-level key. The TypeScript, JSON and YAML versions describe the same site.

TypeScript:

```ts
import { defineConfig, defineElement, f } from 'liteditor'

const callout = defineElement({
  label: 'Callout',
  fields: { heading: f.text('Heading'), body: f.longText('Text') },
  display: { title: 'heading', description: 'body' },
})

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets',
  settings_file: 'src/data/site.json',
  schema: {
    featuredLinks: f.list('Featured links', f.object('Link', {
      text: f.text('Text'),
      url: f.link('URL'),
    }), { max: 5 }),
  },
  frontmatter: {
    title: f.text('Title'),
    description: f.longText('Summary'),
    published: f.bool('Published'),
    cover: f.image('Cover image'),
    accent: f.color('Accent color', { alpha: true }),
  },
  carousels: {
    homeHero: {
      label: 'Home hero',
      description: 'Slides on the home page',
      path: 'src/assets/carousels/home-hero',
      schema: { alt: f.text('Alt text'), link: f.link('Link') },
      frontmatter: { autoplay: f.bool('Autoplay') },
    },
  },
  elements: { callout },
})
```

Generated JSON:

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets",
  "settings_file": "src/data/site.json",
  "schema": {
    "featuredLinks": {
      "label": "Featured links",
      "type": "list",
      "max": 5,
      "itemSchema": {
        "label": "Link",
        "type": "object",
        "fields": {
          "text": { "label": "Text", "type": "short-text" },
          "url": { "label": "URL", "type": "link" }
        }
      }
    }
  },
  "frontmatter": {
    "title": { "label": "Title", "type": "short-text" },
    "description": { "label": "Summary", "type": "long-text" },
    "published": { "label": "Published", "type": "boolean" },
    "cover": { "label": "Cover image", "type": "image" },
    "accent": { "label": "Accent color", "type": "color", "alpha": true }
  },
  "carousels": {
    "homeHero": {
      "label": "Home hero",
      "description": "Slides on the home page",
      "path": "src/assets/carousels/home-hero",
      "schema": {
        "alt": { "label": "Alt text", "type": "short-text" },
        "link": { "label": "Link", "type": "link" }
      },
      "frontmatter": {
        "autoplay": { "label": "Autoplay", "type": "boolean" }
      }
    }
  },
  "elements": {
    "callout": {
      "label": "Callout",
      "fields": {
        "heading": { "label": "Heading", "type": "short-text" },
        "body": { "label": "Text", "type": "long-text" }
      },
      "display": { "title": "heading", "description": "body" }
    }
  }
}
```

The same file in YAML (only if you write it by hand):

```yaml
content_path: src/content/blog
assets_path: src/assets
settings_file: src/data/site.json
schema:
  featuredLinks:
    label: Featured links
    type: list
    max: 5
    itemSchema:
      label: Link
      type: object
      fields:
        text:
          label: Text
          type: short-text
        url:
          label: URL
          type: link
frontmatter:
  title:
    label: Title
    type: short-text
  description:
    label: Summary
    type: long-text
  published:
    label: Published
    type: boolean
  cover:
    label: Cover image
    type: image
  accent:
    label: Accent color
    type: color
    alpha: true
carousels:
  homeHero:
    label: Home hero
    description: Slides on the home page
    path: src/assets/carousels/home-hero
    schema:
      alt:
        label: Alt text
        type: short-text
      link:
        label: Link
        type: link
    frontmatter:
      autoplay:
        label: Autoplay
        type: boolean
elements:
  callout:
    label: Callout
    fields:
      heading:
        label: Heading
        type: short-text
      body:
        label: Text
        type: long-text
    display:
      title: heading
      description: body
```

## Top-level keys

| Key | Required | What it does |
|---|---|---|
| `content_path` | yes | Folder containing the Markdown pages. LiteEditor lists every `.md` file below it. |
| `assets_path` | yes | Folder containing images. Uploads are stored here and the image picker only shows files from here. |
| `settings_file` | no | JSON file holding global site settings. Fields are defined by `schema`. See [Settings](settings.md). |
| `schema` | no | Fields for the global settings panel. See [Field types](field-types.md). |
| `frontmatter` | no | Fields for the frontmatter of each Markdown page. See [Content](content.md). |
| `carousels` | no | Named slideshow modules, each with its own `carousel.json`. See [Carousels](carousels.md). |
| `elements` | no | Reusable blocks that editors insert into pages. See [Custom elements](custom-elements.md). |
| `folders` | no | Restricts whether editors can create folders and how deep they can nest. See [Folder restrictions](#folder-restrictions). |

Unknown top-level keys are not reported as errors. They are dropped when LiteEditor parses the file, so they have no effect. Check spelling against this table. In TypeScript the compiler already rejects unknown keys.

## Folder restrictions

By default editors can create any number of folders, nested as deep as they like, in both the content tree and the assets tree. `folders` limits this:

```ts
export default defineConfig({
  // ...
  folders: { allow_create: true, max_depth: 2 },
})
```

| Key | Default | What it does |
|---|---|---|
| `allow_create` | `true` | When `false`, the "new folder" buttons are hidden and editors cannot move items into a folder that does not exist yet. Existing folders keep working. |
| `max_depth` | unlimited | Maximum nesting below `content_path` / `assets_path`. `1` allows top-level folders only, `2` allows `a/b`, and so on. Applies to new folders and to moving folders by drag and drop. Existing deeper folders are left alone. |

These are editor-side restrictions: they guide editors but do not stop someone committing to the repository directly.

## Path rules

- All paths are relative to the repository root: `src/content/blog`, not `/src/content/blog`.
- Do not end paths with a slash.
- Use forward slashes, even on Windows.
- Links and images written inside a Markdown body are relative to that Markdown file. Image fields in frontmatter, settings and carousels store repo-relative paths. See [Content](content.md).

## Field definitions

`schema`, `frontmatter`, carousel `schema` and carousel `frontmatter` all map a key to a field definition:

```json
{
  "label": "Summary",
  "description": "Shown in listings. Keep it under 160 characters.",
  "type": "long-text"
}
```

- `label`: text shown in the editor. Optional for fields (it defaults to an empty string), but always set it. It is required for carousels and custom elements.
- `description`: optional help text.
- `type`: one of nine types. Omitted means `short-text`.

Each type has its own extra options. See [Field types](field-types.md), which also lists the `f.*` builder for each type.

## Common validation errors

`npx liteditor check` reports these locally, before you push. When validation fails in the editor, it shows `<path>: <message>` for each problem. The path points at the offending key, so `frontmatter.title.type` means the `type` of the `title` field in `frontmatter`.

| Typical cause | Fix |
|---|---|
| `content_path` or `assets_path` missing. | Add the key. |
| An unknown `type`, such as `text`. | Use one of the nine types in [Field types](field-types.md). |
| `selection` without `options`, `list` without `itemSchema`, `object` without `fields`. | Add the missing key. |
| `display.title`/`display.description` in an element points to a missing or non-text field, or `display.images` to a non-image field. | Name an existing `short-text`, `long-text` or `link` field for the text, and an `image` or list-of-`image` field for the images. |
| Invalid JSON, such as a trailing comma (hand-written files only). | LiteEditor then falls back to YAML, which often produces a confusing error. Check commas and quotes first, or generate the file from `liteditor.config.ts`. |

Next: [Field types](field-types.md)
