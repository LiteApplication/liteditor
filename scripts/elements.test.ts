import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseElementData,
  parseElementInfo,
  resolveElementDisplay,
  serializeElementBlock,
} from '../src/utils/elements.ts'
import { ElementConfigSchema, LiteEditorConfigSchema } from '../src/types/schema.ts'

const slider = {
  label: 'Slider',
  fields: {
    heading: { type: 'short-text' },
    text: { type: 'long-text' },
    pics: { type: 'list', itemSchema: { type: 'image' } },
  },
  display: { title: 'heading', description: 'text', images: 'pics' },
}

test('parseElementInfo', () => {
  assert.equal(parseElementInfo('liteditor-element:slider'), 'slider')
  assert.equal(parseElementInfo('js'), null)
  assert.equal(parseElementInfo('liteditor-element:'), null)
})

test('serialize / parse round-trip', () => {
  const data = { heading: 'Spring sale', text: 'a: b\nline 2', pics: ['../a.jpg', 'b.jpg'] }
  const block = serializeElementBlock('slider', data)
  const [first, ...rest] = block.split('\n')
  assert.equal(first, '```liteditor-element:slider')
  assert.equal(rest.at(-1), '```')
  assert.deepEqual(parseElementData(rest.slice(0, -1).join('\n')), data)
})

test('fence grows when content contains backticks', () => {
  const data = { text: 'use ``` fences' }
  const block = serializeElementBlock('x', data)
  assert.ok(block.startsWith('````liteditor-element:x'))
  assert.ok(block.endsWith('\n````'))
})

test('empty data', () => {
  assert.equal(serializeElementBlock('x', {}), '```liteditor-element:x\n```')
  assert.deepEqual(parseElementData(''), {})
})

test('resolveElementDisplay', () => {
  const r = resolveElementDisplay(slider, { heading: 'Hi', text: 'Desc', pics: ['a.jpg'] })
  assert.deepEqual(r, { title: 'Hi', description: 'Desc', images: ['a.jpg'] })
  assert.equal(resolveElementDisplay({ label: 'Box', fields: {} }, {}).title, 'Box')
  assert.equal(resolveElementDisplay(slider, {}).title, 'Slider')
  assert.deepEqual(
    resolveElementDisplay(
      { label: 'L', fields: {}, display: { images: 'p' } },
      { p: 'one.jpg' },
    ).images,
    ['one.jpg'],
  )
})

test('config schema validates display references', () => {
  assert.ok(ElementConfigSchema.safeParse(slider).success)
  assert.ok(ElementConfigSchema.safeParse({ label: 'x', fields: {} }).success)
  const bad = (display: object) => ElementConfigSchema.safeParse({ ...slider, display }).success
  assert.equal(bad({ title: 'missing' }), false)
  assert.equal(bad({ title: 'pics' }), false)
  assert.equal(bad({ images: 'heading' }), false)
  assert.ok(
    LiteEditorConfigSchema.safeParse({
      content_path: 'a',
      assets_path: 'b',
      elements: { slider },
    }).success,
  )
})
