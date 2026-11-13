# LiteEditor documentation

LiteEditor is a lightweight, web-based CMS that works directly on a GitHub repository. Your site is a normal static website whose content lives in the repo as Markdown files, images and JSON files. LiteEditor gives editors a web interface to change that content, and every save becomes a commit on the repository's default branch.

Key points:

- **No backend.** LiteEditor talks to the GitHub API from the browser. Nothing else needs to be hosted for your site.
- **One config file.** A `.liteditor` file at the repo root declares which folders hold content and assets, and which fields editors can change.
- **Commits, not databases.** Editing a page, uploading an image or changing a setting creates a commit on the default branch.
- **Your build publishes the changes.** A deploy pipeline (for example GitHub Pages through GitHub Actions) rebuilds the site after each commit.

## Reading order

1. [Getting started](getting-started.md): build a minimal compatible repo and make a first edit.
2. [Configuration](configuration.md): every key of the `.liteditor` file, in JSON and YAML.
3. [Field types](field-types.md): the nine field types and their options.
4. [Content](content.md): Markdown pages, frontmatter and document operations.
5. [Assets](assets.md): images and the assets folder.
6. [Settings](settings.md): global site settings stored in a JSON file.
7. [Carousels](carousels.md): slideshow modules stored in `carousel.json`.
8. [Custom elements](custom-elements.md): reusable blocks inserted into Markdown pages.
9. [Deployment](deployment.md): building and publishing your site.
10. [Hosting LiteEditor](hosting-liteditor.md): running your own LiteEditor instance.
11. [Examples](examples.md): complete worked configurations.
12. [Design guidelines](design-guidelines.md): what to make editable, and common mistakes.
13. [Schema compatibility](schema-compatibility.md): how config files stay valid across LiteEditor releases.

Start with steps 1 and 2 if you are setting up a site. If you only operate a LiteEditor instance, go to [Hosting LiteEditor](hosting-liteditor.md).

Next: [Getting started](getting-started.md)
