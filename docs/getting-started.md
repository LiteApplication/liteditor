# Getting started

This tutorial turns a GitHub repository into a LiteEditor-compatible site. It uses a blog as the example: posts are Markdown files in `src/content/blog`, and images are in `src/assets`.

## 1. Check the repository layout

A compatible repo needs:

- a `.liteditor` config file at the root (you do not write it by hand: it is generated from `liteditor.config.ts` by the [`liteditor` package](kit.md)),
- a content folder containing `.md` files (`content_path`),
- an assets folder, which can be empty but must exist (`assets_path`),
- a deploy workflow that builds and publishes the site.

```
my-site/
├── .github/workflows/deploy.yml   ← deploy pipeline
├── .liteditor                     ← LiteEditor config (generated)
├── liteditor.config.ts            ← the config you edit
└── src/
    ├── assets/
    │   └── .gitkeep               ← assets_path (empty for now)
    └── content/
        └── blog/
            └── first-post.md      ← content_path
```

## 2. Install `liteditor` and define the config

Run this in the repository (it needs a `package.json`; use `npm init -y` if there is none):

```sh
npm install liteditor
npx liteditor init
```

`init` creates `liteditor.config.ts`, the content and assets folders (with `.gitkeep`), a deploy workflow and a first `.liteditor`. It never overwrites an existing file, and its default folders are `src/content/pages` and `src/assets`. Then describe the site in `liteditor.config.ts`, changing `content_path` to `src/content/blog` for this tutorial. This is the minimal version: one content folder, one asset folder and a `title` field for each post.

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

Write `.liteditor` from it:

```sh
npx liteditor generate
```

This produces the file LiteEditor reads. Do not edit it: change `liteditor.config.ts` and run `generate` again.

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

Paths are relative to the repository root and must not start with `/`. See [Configuration](configuration.md) for every key, and [The `liteditor` package](kit.md) for what else it does. The config is also typed, so the data you load later is typed too.

## 3. Create the first post and the assets folder

`src/content/blog/first-post.md`:

```markdown
---
title: Hello world
---

My first post, written in LiteEditor.
```

`src/assets/.gitkeep` is an empty file. Git does not track empty folders, so the placeholder keeps `src/assets` in the repo.

## 4. Add the deploy workflow

LiteEditor commits only update the repository. A build pipeline is what makes them visible on the website. The following workflow builds a Node-based static site and publishes it to GitHub Pages. The two `liteditor` steps are optional but recommended: a bad content edit then fails the build with the file and field, instead of breaking the published site. Adapt the build step and `path` to your framework (see [Deployment](deployment.md)).

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx liteditor generate --check   # fail if .liteditor is stale
      - run: npx liteditor check              # fail on invalid content
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist   # framework output folder: dist, _site, public or out

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then, on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.

## 5. Commit the setup

Check everything with `npx liteditor generate --check && npx liteditor check`, then commit and push `liteditor.config.ts`, the generated `.liteditor`, the post, `.gitkeep` and the workflow to the default branch (`main` in the workflow above). The deploy workflow runs once the push lands.

## 6. Connect LiteEditor

1. Open your LiteEditor instance and sign in with GitHub. LiteEditor requests the `repo` and `read:user` scopes.
2. Select your repository. LiteEditor reads `.liteditor` from the default branch, so the generated file must be committed.
3. A missing `.liteditor` shows a "no config" state. An invalid one shows `Config validation error: <path>: <message>`. Run `npx liteditor check` locally to see the same problem, fix `liteditor.config.ts`, run `npx liteditor generate`, commit and reload.

## 7. Make a first edit

1. Open `first-post` from the list of Markdown files in `src/content/blog`.
2. Change the title, then validate your changes.
3. LiteEditor creates a commit on the default branch with only the changed file.
4. The deploy workflow runs again. The editor shows the status of the latest workflow run on the default branch, so you can see when the change is live.

You now have a working LiteEditor site. To add more editable fields, continue with [Configuration](configuration.md).

Next: [Configuration](configuration.md)
