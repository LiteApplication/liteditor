# Assets (images)

`assets_path` is the repo-relative folder that holds the images LiteEditor manages. The image picker (for `image` fields and carousel slides) only lists files inside this folder.

```ts
// liteditor.config.ts
export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets',
})
```

## Requirements

- The folder must exist in the repository. An empty folder cannot be stored by Git, so keep a `.gitkeep` in it, or create it from the editor (which adds a `.gitkeep` for you).
- All paths are repo-relative with no leading slash: `src/assets/blog/cover.jpg`, not `/src/assets/blog/cover.jpg`.
- Only these extensions are listed by the picker: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.avif` (case-insensitive). Other files in the folder are not shown.

## Layout

```
src/assets/
├── .gitkeep
├── blog/
│   ├── cover.jpg
│   └── hello.png
└── carousels/
    └── home-hero/
        └── carousel.json
```

Sub-folders are shown in the picker. Carousel folders can live anywhere, but keeping them under `assets_path` lets the picker see their images.

## Uploading

- Uploading an image stages it in `assets_path`.
- The file name is kept, but spaces and most punctuation (for example `(`, `'`, `+`, `!`) are replaced with `-`. `Photo 1.JPG` becomes `Photo-1.JPG`.
- `/` is replaced like any other punctuation, so an upload never creates a sub-folder. Only letters, digits, `.`, `_` and `-` are kept.
- Creating a folder lowercases the name and replaces unusual characters with `-`. A `.gitkeep` is added inside it.

## Renaming and moving

- Renaming or moving an image stages the new path and deletes the old one on the next commit.
- Carousel slides that reference the image by its exact path are updated to the new path.
- References in pages are updated too: relative links in the body (`../../assets/img.png`), and frontmatter values that are either relative or repo-relative (`cover: src/assets/blog/cover.jpg`).

## Deleting

Deleting an image stages its removal. Check carousels and pages that reference it, since they are not cleaned up automatically.

## Referencing images from content

- In frontmatter and carousel data, reference images with the repo-relative path (`src/assets/blog/cover.jpg`). These values are what the picker writes.
- In Markdown bodies, use a path that the site build can resolve. A relative path from the page works (`../../assets/blog/hello.png` from `src/content/blog/hello-world.md`), and LiteEditor rewrites it if the image moves.

- The `liteditor` package normalises image paths when it loads content: `../` paths written in element bodies are resolved against the page and returned repo-relative (`src/assets/blog/hello.png`). Pass `assetUrl` to `createSite` to map them to the URL your templates need, for example with the site `base` path.
- `npx liteditor check` reports image paths that point at a missing file.

Next: [settings.md](settings.md)
