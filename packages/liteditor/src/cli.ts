#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { ConfigError, loadConfig, serializeConfig } from './config.ts'
import { checkContent } from './check.ts'

const HELP = `liteditor <command> [--root <dir>]

Commands:
  init               Scaffold liteditor.config.ts, content/assets folders and a deploy workflow
  generate [--check] Write .liteditor from liteditor.config.* (--check: fail if it is out of date)
  check              Validate the config and all content (pages, settings, carousels, elements)
`

const CONFIG_TEMPLATE = `import { defineConfig, f } from 'liteditor'

export default defineConfig({
  content_path: 'src/content/pages',
  assets_path: 'src/assets',
  frontmatter: {
    title: f.text('Title'),
    description: f.longText('Summary'),
  },
})
`

const LITEDITOR_TEMPLATE = JSON.stringify(
  {
    content_path: 'src/content/pages',
    assets_path: 'src/assets',
    frontmatter: {
      title: { label: 'Title', type: 'short-text' },
      description: { label: 'Summary', type: 'long-text' },
    },
  },
  null,
  2,
) + '\n'

const WORKFLOW_TEMPLATE = `name: Deploy to GitHub Pages

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
      - run: npx liteditor generate --check
      - run: npx liteditor check
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist # framework output folder: dist, _site, public or out

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`

const exists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  )

async function writeIfMissing(root: string, rel: string, content: string) {
  const file = path.join(root, rel)
  if (await exists(file)) return console.log(`  skip    ${rel} (exists)`)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, content)
  console.log(`  create  ${rel}`)
}

async function init(root: string) {
  console.log('Scaffolding LiteEditor files:')
  await writeIfMissing(root, 'liteditor.config.ts', CONFIG_TEMPLATE)
  await writeIfMissing(root, 'src/content/pages/.gitkeep', '')
  await writeIfMissing(root, 'src/assets/.gitkeep', '')
  await writeIfMissing(root, '.github/workflows/deploy.yml', WORKFLOW_TEMPLATE)
  // Static copy of what the template config generates, so init works before "liteditor" is installed.
  await writeIfMissing(root, '.liteditor', LITEDITOR_TEMPLATE)
  console.log('\nNext: npm install -D liteditor, edit liteditor.config.ts, run "npx liteditor generate", commit, and connect the repo in LiteEditor.')
}

async function generate(root: string, check: boolean) {
  const loaded = await loadConfig(root)
  if (loaded.source !== 'code') {
    console.log('No liteditor.config.* found: .liteditor is hand-written, nothing to generate.')
    return 0
  }
  const next = serializeConfig(loaded.config)
  const target = path.join(root, '.liteditor')
  const current = await readFile(target, 'utf8').catch(() => undefined)
  if (check) {
    if (current === next) return console.log('.liteditor is up to date'), 0
    console.error('.liteditor is out of date. Run "npx liteditor generate" and commit it.')
    return 1
  }
  if (current !== next) await writeFile(target, next)
  console.log(current === next ? '.liteditor is up to date' : 'Wrote .liteditor')
  return 0
}

async function check(root: string) {
  const loaded = await loadConfig(root)
  const problems = await checkContent(loaded.config, loaded.root)
  if (loaded.source === 'code') {
    const current = await readFile(path.join(root, '.liteditor'), 'utf8').catch(() => undefined)
    if (current !== serializeConfig(loaded.config)) problems.unshift('.liteditor is out of date: run "npx liteditor generate"')
  }
  if (!problems.length) return console.log('Config and content are valid'), 0
  console.error(problems.map((p) => `  ${p}`).join('\n'))
  console.error(`\n${problems.length} problem(s) found`)
  return 1
}

async function main(argv: string[]) {
  const rootIdx = argv.indexOf('--root')
  const root = path.resolve(rootIdx >= 0 ? (argv[rootIdx + 1] ?? '.') : '.')
  const command = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--root')
  switch (command) {
    case 'init':
      return init(root).then(() => 0)
    case 'generate':
      return generate(root, argv.includes('--check'))
    case 'check':
      return check(root)
    default:
      console.log(HELP)
      return command ? 1 : 0
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof ConfigError ? e.message : e)
    process.exit(1)
  },
)
