import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBlocks, serializeBlocks } from '../src/utils/blocks.ts'
import { canCreateIn, resolvePageType, resolveMode, allowedElements, unknownElementRefs } from '../src/utils/pageTypes.ts'
import { LiteEditorConfigSchema } from '../src/types/schema.ts'

test('blocks round-trip with markdown between elements', () => {
  const body = 'Intro **text**\n\n```liteditor-element:hero\ntitle: Hi\n```\n\n```js\ncode\n```\n\n```liteditor-element:cta\nlabel: Go\n```\n'
  const blocks = parseBlocks(body)
  assert.deepEqual(blocks.map((b) => b.kind), ['markdown', 'element', 'markdown', 'element'])
  assert.equal(blocks[2]!.kind === 'markdown' && blocks[2]!.text, '```js\ncode\n```')
  assert.deepEqual(parseBlocks(serializeBlocks(blocks)), blocks)
})

test('element-only body has no markdown blocks', () => {
  const blocks = parseBlocks('```liteditor-element:a\nx: 1\n```\n\n```liteditor-element:b\n```\n')
  assert.equal(blocks.length, 2)
  assert.ok(blocks.every((b) => b.kind === 'element'))
})

const config = LiteEditorConfigSchema.parse({
  content_path: 'c',
  assets_path: 'a',
  elements: { hero: { label: 'H', fields: {} }, cta: { label: 'C', fields: {} } },
  page_types: {
    landing: { label: 'Landing', folders: ['landing'], max_pages_per_folder: 2, modes: ['block'], elements: ['hero'] },
    post: { label: 'Post' },
  },
})

test('page type rules', () => {
  const pages = [{ relPath: 'landing/a.md' }, { relPath: 'landing/b.md' }]
  assert.deepEqual(canCreateIn(config, 'landing', 'landing', pages), { ok: false, reason: 'limit' })
  assert.deepEqual(canCreateIn(config, 'landing', 'blog', pages), { ok: false, reason: 'folder' })
  assert.deepEqual(canCreateIn(config, 'post', 'anywhere', pages), { ok: true })
  assert.equal(resolvePageType(config, 'landing/x.md', {})?.key, 'landing')
  assert.equal(resolvePageType(config, 'x.md', { page_type: 'post' })?.key, 'post')
  assert.equal(resolvePageType(config, 'x.md', {}), null)
  assert.equal(resolveMode(config.page_types!.landing, {}), 'block')
  assert.deepEqual(allowedElements(config, config.page_types!.landing), ['hero'])
  assert.deepEqual(unknownElementRefs(config), [])
})
