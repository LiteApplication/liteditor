# Carousels

A carousel is a named module whose data lives in its own `carousel.json` file. Each entry under `carousels` in `.liteditor` is one carousel, and each one is edited separately in the editor.

```ts
// liteditor.config.ts
import { defineConfig, f } from 'liteditor'

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets',
  carousels: {
    homeHero: {
      label: 'Home hero',
      description: 'Slideshow on the home page',
      path: 'src/assets/carousels/home-hero',
      schema: {                                   // per slide
        alt: f.text('Alt text'),
        link: f.link('Link'),
      },
      frontmatter: {                              // whole carousel
        autoplay: f.bool('Autoplay'),
        interval: f.text('Interval (ms)'),
      },
    },
  },
})
```

`npx liteditor generate` writes the matching `.liteditor`.

## Carousel config

| Key | Required | Purpose |
|---|---|---|
| `label` | yes | Name shown in the editor |
| `description` | no | Help text shown in the editor |
| `path` | yes | Repo-relative folder that contains `carousel.json` |
| `schema` | no | Fields for each slide (per image) |
| `frontmatter` | no | Fields for the carousel as a whole |

Field types are described in [field-types.md](field-types.md).

## The `carousel.json` file

```json
{
  "images": [
    { "src": "src/assets/carousels/home-hero/slide1.jpg", "alt": "First slide", "link": "/products" },
    { "src": "src/assets/carousels/home-hero/slide2.jpg", "alt": "Second slide" }
  ],
  "autoplay": true,
  "interval": "3000"
}
```

- `images` is the list of slides. Each slide has a `src` (repo-relative image path) and optional keys.
- Keys inside each slide that are declared in the carousel `schema` (here `alt` and `link`) are edited per slide.
- Top-level keys other than `images` are declared in the carousel `frontmatter` (here `autoplay` and `interval`) and apply to the whole carousel.
- Keys not declared in the config are kept in the file but not edited.

## Behaviour

- **No file yet**: the editor starts with `{ "images": [] }`. Nothing is written until you change something.
- **Saving**: `carousel.json` is written with 2-space indentation, in the same commit as other changes, only when this carousel was changed.
- **Folder**: you do not need to create the folder by hand. The first save creates `carousel.json` and its folders.
- **Renaming an image** in `assets_path` updates slides that reference its exact old path.

## Consuming the file in the site

```ts
import { loadConfig, createSite } from 'liteditor'

const site = createSite((await loadConfig()).config, {
  assetUrl: (path) => `${import.meta.env.BASE_URL}${path}`,   // optional
})

const hero = await site.carousel('homeHero')
// { images: [{ src, alt, link }], autoplay, interval }
```

`site.carousel()` is typed from the carousel config and fills defaults. A carousel that was never edited has no `carousel.json`: you get `{ images: [], ... }` with defaults instead of a failed import, so there is no need to commit an empty file. `src` is repo-relative, or mapped by `assetUrl` to whatever your templates need.

## Carousel or custom element?

- Use a **carousel** for a global module with a fixed place in the layout, such as a home-page slideshow. It is edited from the carousel panel.
- Use a **custom element** for a block that appears inside a page body, such as a slider or a callout. See [custom-elements.md](custom-elements.md).

Next: [custom-elements.md](custom-elements.md)
