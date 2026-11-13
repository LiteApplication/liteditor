# Getting started

This tutorial turns a GitHub repository into a LiteEditor-compatible site. It uses a blog as the example: posts are Markdown files in `src/content/blog`, and images are in `src/assets`.

## 1. Check the repository layout

A compatible repo needs:

- a `.liteditor` config file at the root,
- a content folder containing `.md` files (`content_path`),
- an assets folder, which can be empty but must exist (`assets_path`),
- a deploy workflow that builds and publishes the site.

```
my-site/
├── .github/workflows/deploy.yml   ← deploy pipeline
├── .liteditor                     ← LiteEditor config
└── src/
    ├── assets/
    │   └── .gitkeep               ← assets_path (empty for now)
    └── content/
        └── blog/
            └── first-post.md      ← content_path
```

## 2. Write the config file

Create `.liteditor` at the repo root. This is the minimal version: one content folder, one asset folder and a `title` field for each post.

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

Paths are relative to the repository root and must not start with `/`. See [Configuration](configuration.md) for the full format, including YAML.

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

LiteEditor commits only update the repository. A build pipeline is what makes them visible on the website. The following workflow builds a Node-based static site and publishes it to GitHub Pages. Adapt the build step and `path` to your framework (see [Deployment](deployment.md)).

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

Commit and push `.liteditor`, the post, `.gitkeep` and the workflow to the default branch (`main` in the workflow above). The deploy workflow runs once the push lands.

## 6. Connect LiteEditor

1. Open your LiteEditor instance and sign in with GitHub. LiteEditor requests the `repo` and `read:user` scopes.
2. Select your repository. LiteEditor reads `.liteditor` from the default branch.
3. A missing `.liteditor` shows a "no config" state. An invalid one shows `Config validation error: <path>: <message>`. Fix the file on GitHub and reload.

## 7. Make a first edit

1. Open `first-post` from the list of Markdown files in `src/content/blog`.
2. Change the title, then validate your changes.
3. LiteEditor creates a commit on the default branch with only the changed file.
4. The deploy workflow runs again. The editor shows the status of the latest workflow run on the default branch, so you can see when the change is live.

You now have a working LiteEditor site. To add more editable fields, continue with [Configuration](configuration.md).

Next: [Configuration](configuration.md)
