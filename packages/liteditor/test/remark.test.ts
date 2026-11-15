import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remarkLiteditorElements } from '../src/remark.ts'

const code = (lang: string, value: string) => ({ type: 'code', lang, value })

test('replaces elements, ranks per key, leaves unknown and broken ones', () => {
  const tree: any = {
    type: 'root',
    children: [
      code('liteditor-element:slider', 'a: 1'),
      { type: 'blockquote', children: [code('liteditor-element:slider', 'a: 2')] },
      code('liteditor-element:other', 'a: 1'),
      code('liteditor-element:slider', 'a: ['),
      code('js', 'x'),
    ],
  }
  const seen: string[] = []
  const unknown: string[] = []
  remarkLiteditorElements({
    renderers: { slider: (d, { rank }) => { seen.push(`${d.a}@${rank}`); return `<div>${d.a}</div>` } },
    onUnknown: (k, r) => unknown.push(`${k}:${r}`),
  })(tree)
  assert.deepEqual(seen, ['1@0', '2@1'])
  assert.deepEqual(unknown, ['other:no-renderer', 'slider:invalid-yaml'])
  assert.deepEqual(tree.children[0], { type: 'html', value: '<div>1</div>' })
  assert.equal(tree.children[1].children[0].type, 'html')
  assert.equal(tree.children[2].type, 'code')
  assert.equal(tree.children[3].type, 'code')
})
