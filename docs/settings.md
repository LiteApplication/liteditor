# Settings (global JSON)

Settings are site-wide values stored in one JSON file. They are the place for editable global values that change without a code deploy, such as a featured-links list or a theme choice. Static brand copy (site name, logo, navigation) belongs in your code, not here.

Two keys in `.liteditor` control it:

- `settings_file`: repo-relative path of the JSON file.
- `schema`: the fields shown in the General settings panel.

```ts
// liteditor.config.ts
import { defineConfig, f } from 'liteditor'

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets',
  settings_file: 'src/data/site.json',
  schema: {
    theme: f.select('Theme', [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ]),
    featuredLinks: f.list('Featured links', f.object('Link', {
      label: f.text('Text'),
      url: f.link('URL'),
    }), { max: 5 }),
  },
})
```

`npx liteditor generate` writes the matching `.liteditor` (see [Configuration](configuration.md)).

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

LiteEditor only writes the JSON. Read it with the `liteditor` package instead of importing it yourself:

```ts
import { loadConfig, createSite } from 'liteditor'

const site = createSite((await loadConfig()).config)
const settings = await site.settings()
// { theme: 'light', featuredLinks: [...], ...keys you did not declare }
```

`site.settings()` applies the editor's defaults (`""`, `false`, `[]`, the first option of a selection, `#000000`), so a field added to `schema` that nobody has saved yet is never `undefined`, and a missing `site.json` gives defaults instead of an error. The result is typed from `schema`. Treat an empty string as "hide this element" rather than rendering an empty link.

Settings suit short global texts too, such as the first part of a footer line (`short-text`), and not only links and images. Keep fixed credits in your code and put only the editable part in settings.

In Vite, Astro or SvelteKit, the `liteditor/vite` plugin also exposes it as `import { settings } from 'virtual:liteditor'` and reloads the dev server when the file changes (see the [package guide](../packages/liteditor/README.md)).

Without the package, import the JSON directly (`import site from '../data/site.json'`) and spread it over your own defaults.

Because the file is read at build time, a change takes effect once the deploy pipeline has run (see [deployment.md](deployment.md)).

Next: [carousels.md](carousels.md)
