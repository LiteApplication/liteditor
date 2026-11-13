# Content (Markdown pages)

LiteEditor edits every `.md` file found under `content_path`, recursively. Each file is one page: optional YAML frontmatter followed by a Markdown body.

The examples below use the blog scenario used across these docs:

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets",
  "frontmatter": {
    "title": { "label": "Title", "type": "short-text" },
    "description": { "label": "Summary", "type": "long-text" },
    "published": { "label": "Published", "type": "boolean" },
    "cover": { "label": "Cover image", "type": "image" }
  }
}
```

Keys and types of `frontmatter` are described in [configuration.md](configuration.md) and [field-types.md](field-types.md).

## File layout

```
src/content/blog/
├── hello-world.md
└── guides/
    └── getting-started.md
```

- Only `*.md` files are listed. Other files in the folder are ignored.
- The page name shown in the editor is the file name without `.md`.
- Git does not store empty folders, so a folder only exists in the repository once a file is saved inside it.

## File format

A page is stored as:

```markdown
---
title: Hello world
description: My first post.
published: true
cover: src/assets/blog/cover.jpg
---

Body text in Markdown.
```

- The frontmatter block must start on the first line with `---` and end with a line `---`.
- Frontmatter is YAML. Keys match the `frontmatter` schema in `.liteditor`.
- A page without frontmatter is just Markdown. If the frontmatter object is empty (no `frontmatter` schema and no existing keys), no `---` block is written.
- If the YAML is invalid, the whole file is treated as body text.
- Keys that are not declared in `frontmatter` are kept unchanged when the page is saved.

## How values are stored

| Field type | Stored as | Default for a new page |
|---|---|---|
| `short-text`, `long-text`, `link` | string | `""` |
| `boolean` | `true` / `false` | `false` |
| `image` | repo-relative path string | `""` |
| `color` | string, e.g. `"#1a2b3c"` | `"#000000"` |
| `selection` | the `value` of the chosen option | value of the first option, or `""` |
| `list` | YAML sequence | `[]` |
| `object` | YAML mapping | one default per child field |

Example of a page with a list and an object:

```markdown
---
title: Getting started
published: false
primaryColor: "#1a2b3c"
faq:
  - question: Do I need a server?
    answer: No.
---
```

## Creating a page

1. In the tree, open the folder (or the root of `content_path`) and create a page.
2. The name is lowercased and every run of non-alphanumeric characters becomes `-`. `My First Post!` becomes `my-first-post.md`.
3. The new file is created with the default frontmatter from the `frontmatter` schema.

Nothing is written to GitHub until you save and validate the change (see [deployment.md](deployment.md) for how commits reach the site).

## Renaming, moving and deleting

- **Rename or move a page**: the file is recreated at the new path and the old one is deleted in the same commit.
- **Relative links are rewritten** when a page moves. Links starting with `./` or `../` in the body and in frontmatter values are recalculated so they still point to the same target.
- **Repo-relative paths are not rewritten** (for example `src/assets/blog/cover.jpg`). They are only valid while the target stays where it is.
- **Delete**: the file is removed in the next commit.

## Saving

Changed pages are staged in the editor. Validating the changes creates one Git commit on the default branch that contains only the changed files. Unchanged files are not touched, and `.liteditor` is never rewritten.

Next: [assets.md](assets.md)
