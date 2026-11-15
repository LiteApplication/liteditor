import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defineConfig, definePageType, defineElement, f, serializeConfig, checkContent, createSite } from '../src/index.ts'

const hero = defineElement({ label: 'Hero', fields: { title: f.text('Title') } })
const config = defineConfig({
  content_path: 'content',
  assets_path: 'assets',
  elements: { hero },
  page_types: {
    landing: definePageType({
      label: 'Landing',
      folders: ['landing'],
      max_pages_per_folder: 1,
      modes: ['block'],
      elements: ['hero'],
    }),
  },
})

test('page_types are serialized', () => {
  assert.equal(JSON.parse(serializeConfig(config)).page_types.landing.modes[0], 'block')
})

test('page type resolution, mode and checks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'liteditor-pt-'))
  await mkdir(path.join(root, 'content/landing'), { recursive: true })
  await writeFile(path.join(root, 'content/landing/a.md'), '```liteditor-element:hero\ntitle: A\n```\n')
  await writeFile(path.join(root, 'content/landing/b.md'), 'stray text\n')
  const page = await createSite(config, { root }).page('landing/a')
  assert.equal(page?.type, 'landing')
  assert.equal(page?.mode, 'block')
  const problems = await checkContent(config, root)
  assert.ok(problems.some((p) => p.includes('more than 1 "landing"')))
  assert.ok(problems.some((p) => p.includes('Markdown text is not allowed')))
})

test('element color and icon are serialized and validated', () => {
  const ok = defineConfig({ content_path: 'c', assets_path: 'a', elements: { x: defineElement({ label: 'X', color: '#ff0000', icon: 'star', fields: {} }) } })
  assert.equal(JSON.parse(serializeConfig(ok)).elements.x.color, '#ff0000')
  assert.throws(() => serializeConfig(defineConfig({ content_path: 'c', assets_path: 'a', elements: { x: defineElement({ label: 'X', color: 'red', fields: {} }) } })))
})
