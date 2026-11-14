# Settings (global JSON)

Settings are site-wide values stored in one JSON file. They are the place for editable global values that change without a code deploy, such as a featured-links list or a theme choice. Static brand copy (site name, logo, navigation) belongs in your code, not here.

Two keys in `.liteditor` control it:

- `settings_file`: repo-relative path of the JSON file.
- `schema`: the fields shown in the General settings panel.

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets",
  "settings_file": "src/data/site.json",
  "schema": {
    "theme": {
      "label": "Theme",
      "type": "selection",
      "options": [
        { "label": "Light", "value": "light" },
        { "label": "Dark", "value": "dark" }
      ]
    },
    "featuredLinks": {
      "label": "Featured links",
      "type": "list",
      "itemSchema": {
        "label": "Link",
        "type": "object",
        "fields": {
          "label": { "label": "Text", "type": "short-text" },
          "url": { "label": "URL", "type": "link" }
        }
      },
      "max": 5
    }
  }
}
```

Field types are described in [field-types.md](field-types.md).

## The settings file

`src/data/site.json` is a plain JSON object whose keys match `schema`:

```json
{
  "theme": "light",
  "featuredLinks": [
    { "label": "Home", "url": "/" },
    { "label": "Blog", "url": "/blog" }
  ]
}
```

## Behaviour

- **Load**: when the editor opens, it reads the file from the default branch. If the file does not exist yet, the panel starts empty.
- **Save**: the whole object is written back with 2-space indentation, in one commit, only when a value was changed.
- **Creation**: the file is created by the first save. You can also commit it yourself with the initial values.
- **Keys not in `schema`** stay in the file and are not edited by LiteEditor.
- **Without `settings_file`**, nothing is read or saved. **Without `schema`**, the panel has no fields to edit.

## Consuming the file in the site

LiteEditor only writes the JSON. Your build must import it:

```js
// Vite / Astro / webpack: JSON imports are supported directly
import site from '../data/site.json';

console.log(site.theme);
```

Wrap the import in one module that supplies defaults, so a missing key or an empty value does not break the build:

```ts
// src/utils/site.ts
import site from '../data/site.json'

export const settings = {
  email: '',
  copyright: 'Copyright © Jane Doe',
  ...site,
}
```

A field added to `schema` is not in the JSON until someone saves it in the editor, so always provide a default for new fields. Treat an empty string as "hide this element" rather than rendering an empty link.

Settings suit short global texts too, such as the first part of a footer line (`short-text`), and not only links and images. Keep fixed credits in your code and put only the editable part in settings.

Because the file is read at build time, a change takes effect once the deploy pipeline has run (see [deployment.md](deployment.md)).

Next: [carousels.md](carousels.md)
