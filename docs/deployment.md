# Deployment

LiteEditor does not publish anything itself. It commits changes directly to the repository's default branch. Your site only goes live when a build pipeline runs on that branch, so every compatible repository needs a deploy workflow.

## How a save reaches the site

1. An editor validates changes in LiteEditor.
2. LiteEditor creates a commit on the default branch.
3. The push to `main` triggers `.github/workflows/deploy.yml` (the file name is your choice).
4. The workflow builds the site and deploys it to GitHub Pages.
5. LiteEditor shows the build status in the editor (see [Build-status indicator](#build-status-indicator)).

Enable GitHub Pages with **Settings → Pages → Build and deployment → Source: GitHub Actions**. Do not use "Deploy from a branch".

## Workflow

The workflow below is the one used by LiteEditor itself, with the LiteEditor-specific checks removed and the build step left for your framework. Save it as `.github/workflows/deploy.yml`:

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Keep `branches: [main]` in sync with the repository's default branch. LiteEditor commits to the default branch, so a different branch name means no deploy.

Set `path:` to your framework's output folder.

### Framework variants

| Framework | Build command | Output folder | Change in the workflow |
|---|---|---|---|
| Vite | `npm run build` | `dist` | None |
| Astro (static) | `npm run build` | `dist` | None |
| Next.js (static export) | `npm run build` | `out` | Set `output: 'export'` in `next.config.*`; change `path:` to `out` |
| SvelteKit (adapter-static) | `npm run build` | `build` | Change `path:` to `build` |
| Hugo | `hugo --minify` | `public` | Replace the Node steps with `uses: peaceiris/actions-hugo@v3` before the build |
| Jekyll | `actions/jekyll-build-pages@v1` | `_site` | Replace the Node and build steps with the Jekyll action; change `path:` to `_site` |

For Hugo, the Node setup and `npm ci` are not needed. Remove them and keep the checkout, Pages setup, upload and deploy steps.

### Single-page apps

If your site uses client-side routing, copy `index.html` to `404.html` after the build so direct links to deep routes do not fail on GitHub Pages:

```yaml
      - name: Add SPA fallback
        run: cp dist/index.html dist/404.html
```

Place this step after `npm run build` and before the upload step.

## Build-status indicator

The editor top bar shows an icon-only deploy badge (details on hover). It reflects the most recent deploy run on the default branch (a workflow whose name or file path contains "pages" or "deploy"):

| Badge | Tooltip | Meaning |
|---|---|---|
| Green check | "Published" | Latest run completed successfully |
| Red cross | "Build failed. Please contact your developer." | Latest run completed with a failure or other non-success conclusion |
| Brand-coloured indicator | "Deploying…" | Latest run has not completed yet |

Notes:

- Other workflows (lint, tests…) are ignored. Name your deploy workflow with "pages" or "deploy" (for example `deploy.yml`) so the badge can find it.
- While the badge shows "Deploying…", the editor refreshes the status every 15 seconds.
- If the repository has no runs yet, no badge is shown.

## Checklist

- GitHub Pages source is set to **GitHub Actions**.
- The workflow file is on the default branch.
- `branches:` matches the default branch.
- `path:` matches the framework output folder.
- A push to the default branch produces a green run in the **Actions** tab.

Next: [Hosting LiteEditor](hosting-liteditor.md)
