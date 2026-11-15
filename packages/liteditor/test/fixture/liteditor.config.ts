import { defineConfig, defineElement, f } from '../../src/index.ts'

const callout = defineElement({
  label: 'Callout',
  description: 'Highlighted box with a heading, text and an optional photo.',
  fields: {
    heading: f.text('Heading'),
    text: f.longText('Text'),
    photo: f.image('Photo'),
  },
  display: { title: 'heading', description: 'text', images: 'photo' },
})

export default defineConfig({
  content_path: 'src/content/blog',
  assets_path: 'src/assets/images',
  settings_file: 'src/data/site.json',
  schema: {
    announcement: f.text('Banner text'),
    showBanner: f.bool('Show banner'),
  },
  frontmatter: {
    title: f.text('Title'),
    description: f.longText('Summary'),
    published: f.bool('Published'),
    cover: f.image('Cover image'),
    accentColor: f.color('Accent color'),
  },
  carousels: {
    homeHero: {
      label: 'Home hero',
      description: 'Slides shown at the top of the home page.',
      path: 'src/assets/carousels/home-hero',
      schema: { alt: f.text('Alt text'), link: f.link('Link') },
      frontmatter: { autoplay: f.bool('Autoplay'), interval: f.text('Interval (ms)') },
    },
  },
  elements: { callout },
})
