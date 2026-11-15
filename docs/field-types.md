# Field types

A field tells LiteEditor which editor control to show and what kind of value to store. Fields are used in four places: `schema` (global settings), `frontmatter` (each Markdown page), carousel `schema` and `frontmatter`, and custom element `fields`.

With the [`liteditor` package](kit.md) you write fields with the `f` builders in `liteditor.config.ts`, and `npx liteditor generate` turns them into the JSON shown on this page. The JSON is what ends up in `.liteditor`; the builder for each type is in the table below.

```ts
import { f } from 'liteditor'

f.longText('Summary', { description: 'Shown in listings.' })
```

is generated as:

```json
{
  "label": "Summary",
  "description": "Shown in listings.",
  "type": "long-text"
}
```

- `label`: shown above the control.
- `description`: optional help text shown under the control.
- `type`: one of the nine types below. If omitted, the type is `short-text`.

## The nine types

The table lists the builder and the JSON form of each type. Examples below show the generated JSON.

| Type | Builder | Control | Stored value | Extra properties |
|---|---|---|---|---|
| `short-text` | `f.text(label)` | Single-line input | string | none |
| `long-text` | `f.longText(label)` | Multi-line text area | string | none |
| `boolean` | `f.bool(label)` | Toggle | `true` or `false` | none |
| `image` | `f.image(label)` | Image picker in `assets_path` | repo-relative path string | none |
| `link` | `f.link(label)` | URL input (placeholder `https://`) | string | none |
| `color` | `f.color(label, { alpha })` | Color picker | hex string, `#RRGGBB` or `#RRGGBBAA` | `alpha` |
| `selection` | `f.select(label, options)` | Dropdown | the `value` of the chosen option | `options` (required) |
| `list` | `f.list(label, item, { max })` | Repeatable list | YAML list | `itemSchema` (required), `max` |
| `object` | `f.object(label, fields)` | Group of nested fields | YAML mapping | `fields` (required) |

Every builder also accepts `{ description }`. `f.select` takes plain strings (`['light', 'dark']`) or `{ value, label }` objects. Because the builders require `options`, `item` and `fields`, the "missing required property" errors below cannot happen in TypeScript.

### `short-text`

```json
{ "title": { "label": "Title", "type": "short-text" } }
```

### `long-text`

```json
{ "description": { "label": "Summary", "type": "long-text" } }
```

### `boolean`

```json
{ "published": { "label": "Published", "type": "boolean" } }
```

### `image`

```json
{ "cover": { "label": "Cover image", "type": "image" } }
```

The picker only offers files inside `assets_path`. See [Assets](assets.md).

### `link`

```json
{ "url": { "label": "Website", "type": "link" } }
```

The value is stored as written. Use an absolute URL (`https://...`) or a relative one (`/about`).

### `color`

```json
{
  "accent": { "label": "Accent color", "type": "color" },
  "overlay": { "label": "Overlay", "type": "color", "alpha": true }
}
```

- Without `alpha`, the value is `#RRGGBB`.
- With `"alpha": true`, the editor adds an opacity slider and the value is `#RRGGBBAA`.

### `selection`

```json
{
  "theme": {
    "label": "Theme",
    "type": "selection",
    "options": [
      { "label": "Light", "value": "light" },
      { "label": "Dark", "value": "dark" }
    ]
  }
}
```

- `options` is required. Each option needs a `value` (what is stored) and a `label` (what editors see).

### `list`

```json
{
  "gallery": {
    "label": "Gallery",
    "type": "list",
    "max": 6,
    "itemSchema": { "label": "Image", "type": "image" }
  }
}
```

- `itemSchema` is required and can be any field, including `object`.
- `max` is optional and limits the number of items.

### `object`

```json
{
  "author": {
    "label": "Author",
    "type": "object",
    "fields": {
      "name": { "label": "Name", "type": "short-text" },
      "avatar": { "label": "Avatar", "type": "image" }
    }
  }
}
```

- `fields` is required. It maps each key to a field definition, so objects can contain any type, including other objects.

## Nested example: a FAQ

A list of objects, each with a question and an answer:

```json
{
  "faq": {
    "label": "FAQ",
    "type": "list",
    "max": 10,
    "itemSchema": {
      "label": "Question",
      "type": "object",
      "fields": {
        "question": { "label": "Question", "type": "short-text" },
        "answer": { "label": "Answer", "type": "long-text" }
      }
    }
  }
}
```

In a Markdown page's frontmatter, this is stored as:

```yaml
faq:
  - question: Do you ship abroad?
    answer: Yes, within the EU.
  - question: How long does delivery take?
    answer: Three to five working days.
```

## Pitfalls

- **Missing required properties** (hand-written `.liteditor` only; the builders enforce them). `selection` needs `options`, `list` needs `itemSchema`, and `object` needs `fields`. Without them the config fails validation.
- **Properties on the wrong type.** `alpha` only applies to `color`, `options` to `selection`, and `max` to `list`. Other types ignore them, so a misplaced property has no effect.
- **Missing labels.** An empty `label` leaves the control unlabeled. Always set one.
- **Choosing a type for static text.** Fields are for values that change without a deploy. See [Design guidelines](design-guidelines.md).

Next: [Content](content.md)
