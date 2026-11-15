import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  loadConfig,
  serializeConfig,
  createSite,
  splitBody,
  parseMarkdown,
  checkContent,
  normalizeAssetPath,
} from '../src/index.ts'
import { LiteEditorConfigSchema } from '../src/schema.ts'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixture')

test('generated .liteditor equals the documented example 3', async () => {
  const { config, source } = await loadConfig(root)
  assert.equal(source, 'code')
  assert.deepEqual(JSON.parse(serializeConfig(config)), JSON.parse(readFileSync(path.join(root, 'expected.liteditor'), 'utf8')))
})

test('generated config is accepted by the editor schema', async () => {
  const { config } = await loadConfig(root)
  assert.ok(LiteEditorConfigSchema.safeParse(JSON.parse(serializeConfig(config))).success)
})

test('invalid config is rejected with a path', () => {
  assert.throws(() => serializeConfig({ content_path: 'a' } as never), /assets_path/)
})

test('settings: keeps undeclared keys', async () => {
  const site = createSite((await loadConfig(root)).config, { root })
  assert.deepEqual(await site.settings(), { announcement: 'Summer sale ends Sunday', showBanner: true, extra: 'kept' })
})

test('pages: defaults, slugs and normalised images', async () => {
  const site = createSite((await loadConfig(root)).config, { root })
  const pages = await site.pages()
  assert.deepEqual(pages.map((p) => p.slug), ['hello-world', 'summer-sale'])
  const hello = pages[0]!
  assert.equal(hello.data.published, false)
  assert.equal(hello.data.description, '')
  assert.equal(hello.data.accentColor, '#000000')
  assert.equal(hello.data.cover, 'src/assets/images/cover-hello.jpg')
  assert.equal((await site.page('nope')), undefined)
  assert.equal((await site.page('summer-sale'))?.data.published, true)
})

test('elements: 4-backtick fence, nested fences, rank, unknown, defaults', async () => {
  const site = createSite((await loadConfig(root)).config, { root })
  const page = (await site.page('summer-sale'))!
  const els = page.blocks.filter((b) => b.type !== 'markdown')
  assert.deepEqual(els.map((b) => [b.type, b.key, b.rank]), [
    ['element', 'callout', 0],
    ['unknown-element', 'mystery', 0],
    ['element', 'callout', 1],
  ])
  const first = els[0] as any
  assert.equal(first.data.heading, 'Up to 50% off')
  assert.match(first.data.text, /stays text/)
  assert.equal(first.data.photo, 'src/assets/images/sale.jpg') // resolved from ../../assets relative to the page
  assert.equal((els[2] as any).data.text, '') // default applied
  // an element example inside a ```md fence is plain text, not a block
  const md = page.blocks.filter((b) => b.type === 'markdown').map((b: any) => b.value).join('\n')
  assert.match(md, /heading: nope/)
})

test('carousel: defaults, missing file', async () => {
  const cfg = (await loadConfig(root)).config
  const site = createSite(cfg, { root })
  const c = await site.carousel('homeHero')
  assert.equal(c.autoplay, true)
  assert.equal(c.images.length, 2)
  assert.deepEqual(c.images[1], { alt: 'Autumn forest path', link: '', src: 'src/assets/carousels/home-hero/slide2.jpg' })
  const empty = createSite({ ...cfg, carousels: { x: { label: 'X', path: 'nowhere', frontmatter: { autoplay: { label: 'A', type: 'boolean' } } } } }, { root })
  assert.deepEqual(await empty.carousel('x'), { autoplay: false, images: [] })
  await assert.rejects(site.carousel('nope' as never), /Unknown carousel/)
})

test('missing settings file and content folder give defaults', async () => {
  const site = createSite(
    { content_path: 'none', assets_path: 'a', settings_file: 'none.json', schema: { t: { label: 'T', type: 'selection', options: [{ value: 'l', label: 'L' }] } } },
    { root },
  )
  assert.deepEqual(await site.settings(), { t: 'l' })
  assert.deepEqual(await site.pages(), [])
})

test('assetUrl maps every image', async () => {
  const site = createSite((await loadConfig(root)).config, { root, assetUrl: (p) => `/base/${p}` })
  assert.equal((await site.page('hello-world'))!.data.cover, '/base/src/assets/images/cover-hello.jpg')
  assert.equal((await site.carousel('homeHero')).images[0]!.src, '/base/src/assets/carousels/home-hero/slide1.jpg')
})

test('frontmatter edge cases', () => {
  assert.deepEqual(parseMarkdown('no frontmatter'), { data: {}, body: 'no frontmatter' })
  assert.deepEqual(parseMarkdown('---\n---\nbody'), { data: {}, body: 'body' })
  assert.equal(parseMarkdown('---\n: [bad\n---\nbody').body, '---\n: [bad\n---\nbody')
  assert.deepEqual(parseMarkdown('---\r\na: 1\r\n---\r\nx').data, { a: 1 })
})

test('splitBody: invalid yaml and unterminated fence', () => {
  const [b] = splitBody('```liteditor-element:x\na: [\n```')
  assert.equal(b!.type, 'element')
  assert.ok((b as any).error)
  assert.equal(splitBody('```liteditor-element:x\na: 1').every((x) => x.type === 'markdown'), true)
})

test('normalizeAssetPath', () => {
  assert.equal(normalizeAssetPath('../a.png', 'src/content/p.md'), 'src/a.png')
  assert.equal(normalizeAssetPath('/src/a.png'), 'src/a.png')
  assert.equal(normalizeAssetPath('https://x/y.png'), 'https://x/y.png')
})

test('checkContent: fixture is valid, problems are reported', async () => {
  const { config } = await loadConfig(root)
  const problems = await checkContent(config, root)
  // only the intentional unknown "mystery" element
  assert.deepEqual(problems, ['src/content/blog/summer-sale.md: element mystery #1: no element "mystery" in the config'])
  const bad = await checkContent({ ...config, settings_file: 'src/data/site.json', schema: { announcement: { label: 'A', type: 'boolean' } } }, root)
  assert.ok(bad.some((p) => p.includes('announcement: expected true or false')))
})
