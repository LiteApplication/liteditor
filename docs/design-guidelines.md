# Design guidelines

A LiteEditor config (your `liteditor.config.ts`, generated into `.liteditor`) exposes part of your site to people who do not touch code. Expose too little and they cannot do their job; expose too much and they break the layout or the brand. This page gives a simple rule and a checklist.

## The rule: edit what changes without a deploy

Before adding a field, ask: **will this value change after launch, without a developer?**

- If yes, make it editable.
- If no, hardcode it in the site templates.

### Good candidates

- Article body and per-post text.
- Per-post cover image.
- Publication status (`published`).
- A list that is updated regularly, such as featured links or FAQ entries.
- Carousel slides on the home page.
- A banner or announcement that appears and disappears.

### Keep in code

- Site name, tagline, logo.
- Home-page headline and footer copy.
- Brand colors and fonts.
- Navigation structure.
- Legal text.

Hardcoding these keeps the editable surface small, so editors cannot accidentally break the design. It also means a brand change is a normal code change, reviewed like any other.

## Keep the schema small

- Start with three or four frontmatter fields. Add more only when an editor asks for them.
- Prefer `short-text` or `long-text` over a `list` of `object` when a single text value is enough.
- Use `selection` when the set of valid values is closed (for example `draft`, `review`, `published`), and `short-text` when it is open.
- Set `max` on `list` fields so editors cannot add an unbounded number of items.
- Give each field a `label` that an editor understands. Add a `description` only when the label is not self-explanatory.

## Where each kind of value goes

| Kind of value | Put it in | Example |
|---|---|---|
| Text that belongs to one page | `frontmatter` | `title`, `description` |
| Global value that changes often | `schema` + `settings_file` | `announcement`, `showBanner` |
| Repeating visuals on one page type | `carousels` | home-page slides |
| Rich content reused across pages | `elements` | `callout` block inside a post |
| Structure, navigation, branding | Code | menu, logo, brand color |

## Common mistakes

Run `npx liteditor check` first: it catches most of this list. Then go through the rest before you commit `liteditor.config.ts` and the generated `.liteditor`.

### Config

- [ ] `content_path` and `assets_path` are present and are **repo-relative with no leading slash** (`src/content/blog`, not `/src/content/blog`).
- [ ] Every `list` field has an `itemSchema`.
- [ ] Every `selection` field has an `options` array of `{ "label", "value" }` objects.
- [ ] Every `object` field has a `fields` map.
- [ ] Every `color` field that needs transparency sets `"alpha": true`; otherwise leave it out.
- [ ] `elements[*].display.title` and `display.description` name a text field (`short-text`, `long-text` or `link`).
- [ ] `elements[*].display.images` names an `image` field or a `list` whose `itemSchema` is an `image`.
- [ ] `settings_file` is accompanied by a `schema`. Without it, the General settings panel has nothing to show.
- [ ] `.liteditor` is up to date (`npx liteditor generate --check`). With a hand-written file, it must be valid JSON or YAML. If it is not, the editor shows a "Config validation error" message on load and names the failing path.

### Repository

- [ ] `content_path` and `assets_path` exist in the repo. Empty folders need a `.gitkeep`. Carousel folders are created on first save.
- [ ] A carousel without `carousel.json` is fine: the editor and `site.carousel()` both treat a missing file as `{ "images": [] }`. Only import the JSON directly if you do not use the package, and then commit `{ "images": [] }`.
- [ ] Image paths in content, settings and carousel data are repo-relative (`src/assets/images/cover.jpg`).
- [ ] Settings keys match the `schema` keys. A key that is not in the schema does not appear in the General settings panel.

### Site build

- [ ] A deploy workflow builds the site on push to the default branch. Without it, LiteEditor commits are saved but never go live.
- [ ] If you use `elements`, the build converts `liteditor-element:<name>` fences into HTML (`blocks` or `liteditor/remark`, see [Custom elements](custom-elements.md)). Otherwise they render as raw code.
- [ ] If you use carousels, the site reads them with `site.carousel()` and renders each slide.
- [ ] The site reads the frontmatter keys defined in the `frontmatter` config (`site.pages()` types them). After a rename, pages keep the old key until they are edited, so the site must handle both during the transition.

### Content

- [ ] Each page's frontmatter uses the keys from the config.
- [ ] Draft pages use `published: false` (or your own convention) and the site filters them out.

## Renaming and removing fields

Renaming or removing a field is a breaking change for existing files. Before you do it:

1. Check whether any page, settings file or carousel still uses the key.
2. Update the site to read both names for a transition period, or migrate the files in the same commit.
3. Keep the old key in the config until the files are migrated.

See [Schema compatibility](schema-compatibility.md) for the rules the LiteEditor project enforces on its own schema.

Next: [Schema compatibility](schema-compatibility.md)
