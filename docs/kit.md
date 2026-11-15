# The `liteditor` npm package

Every example in these docs hand-writes the same glue: a frontmatter parser, default values, JSON imports with fallbacks, a remark plugin for elements. The [`liteditor`](../packages/liteditor/README.md) npm package does it for you, at build time:

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

It can also generate the `.liteditor` file from a typed `liteditor.config.ts`, so field definitions and the types of the loaded data come from one place, and `npx liteditor check` validates all content in CI.

Full guide: [packages/liteditor/README.md](../packages/liteditor/README.md).

Next: [Configuration](configuration.md)
