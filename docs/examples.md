# Worked examples

Three complete setups, from the smallest possible to a full site. Each one shows the repository tree, the `.liteditor` file, and sample content. All configs below are valid against the current schema.

Paths are repo-relative and never start with `/`.

## 1. Blog only (minimal)

The editor lists every `.md` file under `content_path` and lets you edit its body. No frontmatter, no settings, no carousels.

### Repository tree

```text
my-blog/
├── .github/workflows/deploy.yml   # build + publish (see deployment notes)
├── .liteditor
└── src/
    ├── assets/images/
    │   └── .gitkeep               # keeps the empty assets folder in git
    └── content/blog/
        ├── hello-world.md
        └── second-post.md
```

### `.liteditor`

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets/images"
}
```

### Sample content

`src/content/blog/hello-world.md`:

```markdown
Welcome to my blog. This first post has no frontmatter: only the body is editable.
```

`src/content/blog/second-post.md`:

```markdown
## Notes on the second post

Plain Markdown, with a [link to the first post](hello-world.md).
```

The relative link is rewritten by LiteEditor if you rename or move `hello-world.md`.

## 2. Blog with settings and frontmatter

Adds per-post metadata (title, summary, published flag, cover image, accent color) and a global settings file for the site banner.

### Repository tree

```text
my-blog/
├── .github/workflows/deploy.yml
├── .liteditor
└── src/
    ├── assets/images/
    │   ├── cover-hello.jpg
    │   └── cover-second.jpg
    ├── content/blog/
    │   ├── hello-world.md
    │   └── second-post.md
    └── data/
        └── site.json              # settings_file
```

### `.liteditor`

JSON:

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets/images",
  "settings_file": "src/data/site.json",
  "schema": {
    "announcement": {
      "label": "Banner text",
      "description": "Shown at the top of every page. Leave empty to hide it.",
      "type": "short-text"
    },
    "showBanner": {
      "label": "Show banner",
      "type": "boolean"
    }
  },
  "frontmatter": {
    "title": {
      "label": "Title",
      "type": "short-text"
    },
    "description": {
      "label": "Summary",
      "description": "Shown in post lists.",
      "type": "long-text"
    },
    "published": {
      "label": "Published",
      "type": "boolean"
    },
    "cover": {
      "label": "Cover image",
      "type": "image"
    },
    "accentColor": {
      "label": "Accent color",
      "type": "color"
    }
  }
}
```

The same file in YAML (LiteEditor reads YAML when the file is not valid JSON):

```yaml
content_path: src/content/blog
assets_path: src/assets/images
settings_file: src/data/site.json
schema:
  announcement:
    label: Banner text
    description: Shown at the top of every page. Leave empty to hide it.
    type: short-text
  showBanner:
    label: Show banner
    type: boolean
frontmatter:
  title:
    label: Title
    type: short-text
  description:
    label: Summary
    description: Shown in post lists.
    type: long-text
  published:
    label: Published
    type: boolean
  cover:
    label: Cover image
    type: image
  accentColor:
    label: Accent color
    type: color
```

> `accentColor` uses `"type": "color"` without `alpha`, so the stored value is a 6-digit hex string such as `#3366ff`.

### Sample content

`src/data/site.json`:

```json
{
  "announcement": "Summer sale ends Sunday",
  "showBanner": true
}
```

`src/content/blog/hello-world.md`:

```markdown
---
title: Hello world
description: My first post, and how this blog works.
published: true
cover: src/assets/images/cover-hello.jpg
accentColor: "#3366ff"
---

Welcome to my blog.
```

`src/content/blog/second-post.md`:

```markdown
---
title: Second post
description: Notes on the second post.
published: false
accentColor: "#e0572f"
---

Draft content, not published yet.
```

Frontmatter values are stored as YAML. Quote colors so YAML does not read `#` as a comment.

## 3. Full site: settings, carousel and custom element

Adds a home-page carousel and a reusable `callout` block that editors can insert into any post.

### Repository tree

```text
my-site/
├── .github/workflows/deploy.yml
├── .liteditor
└── src/
    ├── assets/
    │   ├── images/
    │   │   ├── cover-hello.jpg
    │   │   └── sale.jpg
    │   └── carousels/
    │       └── home-hero/
    │           ├── carousel.json  # carousel data
    │           ├── slide1.jpg
    │           └── slide2.jpg
    ├── content/blog/
    │   ├── hello-world.md
    │   └── summer-sale.md
    └── data/
        └── site.json
```

### `.liteditor`

JSON:

```json
{
  "content_path": "src/content/blog",
  "assets_path": "src/assets/images",
  "settings_file": "src/data/site.json",
  "schema": {
    "announcement": {
      "label": "Banner text",
      "type": "short-text"
    },
    "showBanner": {
      "label": "Show banner",
      "type": "boolean"
    }
  },
  "frontmatter": {
    "title": {
      "label": "Title",
      "type": "short-text"
    },
    "description": {
      "label": "Summary",
      "type": "long-text"
    },
    "published": {
      "label": "Published",
      "type": "boolean"
    },
    "cover": {
      "label": "Cover image",
      "type": "image"
    },
    "accentColor": {
      "label": "Accent color",
      "type": "color"
    }
  },
  "carousels": {
    "homeHero": {
      "label": "Home hero",
      "description": "Slides shown at the top of the home page.",
      "path": "src/assets/carousels/home-hero",
      "schema": {
        "alt": {
          "label": "Alt text",
          "type": "short-text"
        },
        "link": {
          "label": "Link",
          "type": "link"
        }
      },
      "frontmatter": {
        "autoplay": {
          "label": "Autoplay",
          "type": "boolean"
        },
        "interval": {
          "label": "Interval (ms)",
          "type": "short-text"
        }
      }
    }
  },
  "elements": {
    "callout": {
      "label": "Callout",
      "description": "Highlighted box with a heading, text and an optional photo.",
      "fields": {
        "heading": {
          "label": "Heading",
          "type": "short-text"
        },
        "text": {
          "label": "Text",
          "type": "long-text"
        },
        "photo": {
          "label": "Photo",
          "type": "image"
        }
      },
      "display": {
        "title": "heading",
        "description": "text",
        "images": "photo"
      }
    }
  }
}
```

The `display` block must point at real fields: `title` and `description` need a text field (`short-text`, `long-text` or `link`), and `images` needs an `image` field or a `list` of `image`. Otherwise validation fails.

### Sample content

`src/assets/carousels/home-hero/carousel.json`:

```json
{
  "images": [
    {
      "src": "src/assets/carousels/home-hero/slide1.jpg",
      "alt": "Mountain lake at dawn",
      "link": "/products"
    },
    {
      "src": "src/assets/carousels/home-hero/slide2.jpg",
      "alt": "Autumn forest path"
    }
  ],
  "autoplay": true,
  "interval": "4000"
}
```

`src/data/site.json`:

```json
{
  "announcement": "Summer sale ends Sunday",
  "showBanner": true
}
```

`src/content/blog/summer-sale.md`:

````markdown
---
title: Summer sale
description: Everything you need to know about this week's offers.
published: true
cover: src/assets/images/sale.jpg
---

Our biggest discounts of the year start today.

```liteditor-element:callout
heading: Up to 50% off
text: Selected items only, while stocks last.
photo: src/assets/images/sale.jpg
```

Come and see us in store.
````

The site build must turn `liteditor-element:` fences into HTML (see the custom elements notes in the README). Without that step, the block shows as a code block.

Next: [Design guidelines](design-guidelines.md)
