# Page types and block mode

A **page type** is a kind of page that editors pick when they create one: a blog post, a landing page, a legal page. Each type fixes where its pages may live, how many there can be, which edit modes are available and which custom elements may be used.

Sites without `page_types` behave as before: every page is rich text, can live anywhere and may use every element.

## Declaring page types

```ts
// liteditor.config.ts
import { defineConfig, definePageType } from 'liteditor'

export default defineConfig({
  content_path: 'src/content',
  assets_path: 'src/assets',
  elements: { hero, features, cta },
  page_types: {
    post: definePageType({ label: 'Blog post', folders: ['blog'], allow_new_folders: true }),
    landing: definePageType({
      label: 'Landing page',
      folders: ['landing'],
      max_pages_per_folder: 5,
      modes: ['block'],
      elements: ['hero', 'features', 'cta'],
    }),
  },
})
```

| Property | Default | Meaning |
|---|---|---|
| `label` | required | Name shown in the new-page dialog |
| `description` | none | Help text shown under the picker |
| `folders` | anywhere | Folders (relative to `content_path`) where pages of this type may live. The first is the default; Use `""` for the content root; omit the key for "anywhere". Editors cannot create or move pages of this type elsewhere. |
| `allow_new_folders` | `false` | With `folders` set, whether editors may use subfolders of those folders |
| `max_pages_per_folder` | unlimited | Maximum number of pages of this type in one folder. Creating or moving a page past the limit is refused |
| `modes` | `['rich']` | Allowed edit modes: `rich` (text editor) and/or `block`. The first is the default; with several, editors get a switch |
| `elements` | all | Names of the `elements` usable in pages of this type |
| `markdown_block` | `false` | Block mode only: allow Markdown text blocks between elements |
| `frontmatter` | none | Extra frontmatter fields, merged over the global `frontmatter` |

## How a page knows its type

The editor writes `page_type: <key>` in the page's frontmatter on creation (and `page_mode: block|rich` when the type allows several modes). A page without `page_type` takes the first type whose `folders` contain it, otherwise it has no type and no restriction.

## Block mode

In block mode the page body is not a text document. Editors add, reorder and edit blocks, each one a custom element. The file stays plain Markdown: a sequence of `liteditor-element` fences. With `markdown_block: true`, free Markdown segments may sit between the fences; they are edited as text blocks.

When a type does not allow Markdown, you can rely on the body containing only element fences. If such a page already contains text (for example after switching modes or from older content), the editor keeps it as a locked block that can only be deleted, and `npx liteditor check` reports it.

Render block pages from `page.blocks` (see [custom elements](custom-elements.md)).
