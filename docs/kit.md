# The `liteditor` npm package

These docs use the [`liteditor`](../packages/liteditor/README.md) npm package throughout, so you do not write `.liteditor` by hand or the glue code around it: a frontmatter parser, default values, JSON imports with fallbacks, a remark plugin for elements. It works at build time:

```sh
npm install liteditor
npx liteditor init
```

```ts
import { loadConfig, createSite } from 'liteditor'

const site = createSite((await loadConfig()).config)
const settings = await site.settings()        // defaults applied, undeclared keys kept
const pages = await site.pages()              // frontmatter + body + element blocks
const hero = await site.carousel('homeHero')  // never throws on a missing carousel.json
```

You describe the site once in `liteditor.config.ts`, and:

- `npx liteditor generate` writes the `.liteditor` file LiteEditor reads (commit it; `generate --check` fails CI when it is stale),
- `createSite` loads settings, pages, carousels and elements with the same types and defaults,
- `npx liteditor check` validates the config and all content in CI.

If you prefer a hand-written `.liteditor`, delete `liteditor.config.ts`: the loaders read it as is, but data is not typed.

## Page types

`definePageType()` declares a page type for `page_types` (see [Page types](page-types.md)). Pages returned by `createSite` carry `type` (the resolved page type key) and `mode` (`'rich'` or `'block'`); `blocks` gives the ordered element and Markdown blocks. `npx liteditor check` reports pages that break their type's folder, limit, element or Markdown rules.

## Direct edit link

`https://editor.liteapp.fr/edit/<github user>/<repo>` opens the editor straight on a site (signing in first if needed). `editUrl()` builds it for you:

```ts
import { editUrl } from 'liteditor'

editUrl()                                  // https://editor.liteapp.fr/edit/me/site
editUrl({ repo: 'me/site' })               // override the repository
editUrl({ editorUrl: 'https://ed.example' }) // override the editor base URL
```

The repository is read from `LITEDITOR_REPO`, else `GITHUB_REPOSITORY` (set automatically in GitHub Actions, so a GitHub Pages build needs no setup). The base URL comes from `LITEDITOR_URL`. Without a repository (local dev) it returns `undefined`.

Full guide: [packages/liteditor/README.md](../packages/liteditor/README.md).

Next: [Configuration](configuration.md)
