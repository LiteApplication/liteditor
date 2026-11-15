// Compile-time checks: run with `npm run typecheck`. Not executed.
import { createSite, defineConfig, defineElement, f } from '../src/index.ts'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
const assertType = <_T extends true>() => {}

const callout = defineElement({ label: 'C', fields: { heading: f.text('H'), n: f.list('N', f.bool('b')) } })
const config = defineConfig({
  content_path: 'c',
  assets_path: 'a',
  schema: { theme: f.select('Theme', ['light', 'dark']), links: f.list('L', f.object('Link', { url: f.link('U') })) },
  frontmatter: { title: f.text('T'), draft: f.bool('D') },
  carousels: { hero: { label: 'H', path: 'p', schema: { alt: f.text('A') }, frontmatter: { auto: f.bool('x') } } },
  elements: { callout },
})
const site = createSite(config)

export async function check() {
  const s = await site.settings()
  assertType<Equal<typeof s.theme, 'light' | 'dark'>>()
  assertType<Equal<typeof s.links, { url: string }[]>>()
  const p = (await site.pages())[0]!
  assertType<Equal<typeof p.data.draft, boolean>>()
  const c = await site.carousel('hero')
  assertType<Equal<typeof c.auto, boolean>>()
  assertType<Equal<typeof c.images[number]['alt'], string>>()
  for (const b of p.blocks) {
    if (b.type === 'element' && b.key === 'callout') assertType<Equal<typeof b.data.heading, string>>()
  }
  // @ts-expect-error unknown carousel key
  await site.carousel('nope')
  // @ts-expect-error display must name a declared field
  defineElement({ label: 'x', fields: { a: f.text('A') }, display: { title: 'b' } })
}
