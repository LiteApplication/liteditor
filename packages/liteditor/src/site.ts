import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import type { FieldSchema } from './schema.ts'
import type { ConfigInput } from './config.ts'
import type { FieldsOf } from './fields.ts'
import { applyDefaults } from './defaults.ts'
import { normalizeAssetPath } from './assets.ts'
import { parseMarkdown } from './content.ts'
import { splitBody, type ElementBlock, type MarkdownBlock } from './elements.ts'

type AnyConfig = ConfigInput<any, any, any, any>

type ElementsOf<C extends AnyConfig> = NonNullable<C['elements']>

/** Element blocks whose key is declared in the config, with typed `data`. */
export type TypedElementBlock<C extends AnyConfig> = {
  [K in keyof ElementsOf<C> & string]: Omit<ElementBlock, 'key' | 'data'> & {
    type: 'element'
    key: K
    data: FieldsOf<ElementsOf<C>[K]['fields']>
  }
}[keyof ElementsOf<C> & string]

/** An element block whose key is not declared in the config (or whose YAML is broken). */
export interface UnknownElementBlock extends Omit<ElementBlock, 'type'> {
  type: 'unknown-element'
}

export type SiteBlock<C extends AnyConfig> = MarkdownBlock | TypedElementBlock<C> | UnknownElementBlock

export type Page<C extends AnyConfig> = {
  /** Path inside `content_path` without `.md`, e.g. `guides/getting-started`. */
  slug: string
  /** Repo-relative path of the Markdown file. */
  file: string
  data: FieldsOf<C['frontmatter']>
  /** Markdown body, element fences included. */
  body: string
  /** Body split into Markdown text and element blocks, in order. */
  blocks: SiteBlock<C>[]
}

export type Carousel<C extends AnyConfig, K extends keyof NonNullable<C['carousels']>> = {
  images: Array<{ src: string } & FieldsOf<NonNullable<C['carousels']>[K]['schema']>>
} & FieldsOf<NonNullable<C['carousels']>[K]['frontmatter']>

export interface SiteOptions {
  /** Repository root. Defaults to the current directory. */
  root?: string
  /** Maps every image path (repo-relative) to what your templates need, e.g. a URL with `base`. */
  assetUrl?: (repoPath: string) => string
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const toPosix = (p: string) => p.split(path.sep).join('/')

async function readText(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw e
  }
}

async function readJson(file: string, what: string): Promise<Record<string, unknown> | undefined> {
  const text = await readText(file)
  if (text === undefined) return undefined
  try {
    const data = JSON.parse(text)
    return isObject(data) ? data : undefined
  } catch (e) {
    throw new Error(`${what}: ${toPosix(file)} is not valid JSON (${(e as Error).message})`)
  }
}

async function walkMarkdown(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walkMarkdown(full)))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full)
  }
  return files.sort()
}

/**
 * Reads everything LiteEditor writes: settings, pages, carousels and the elements
 * inside page bodies. Missing files give defaults instead of errors, and every declared
 * field is filled in so templates never see `undefined`.
 */
export function createSite<C extends AnyConfig>(config: C, options: SiteOptions = {}) {
  const root = path.resolve(options.root ?? process.cwd())
  const abs = (repoPath: string) => path.join(root, repoPath)
  const mapImage = options.assetUrl
  const knownElements = config.elements ?? {}

  const parseBody = (body: string, file: string): SiteBlock<C>[] =>
    splitBody(body).map((block) => {
      if (block.type === 'markdown') return block
      const def = knownElements[block.key]
      if (!def || block.error) return { ...block, type: 'unknown-element' } as UnknownElementBlock
      return { ...block, data: applyDefaults(def.fields, block.data, { file, mapImage }) } as TypedElementBlock<C>
    })

  const site = {
    root,
    config,

    /** Content of `settings_file`, with defaults. `{}`-based defaults if the file does not exist. */
    async settings(): Promise<FieldsOf<C['schema']>> {
      const data = config.settings_file ? await readJson(abs(config.settings_file), 'settings') : undefined
      return applyDefaults(config.schema, data, { mapImage }) as FieldsOf<C['schema']>
    },

    /** Every Markdown page under `content_path`, sorted by path. */
    async pages(): Promise<Page<C>[]> {
      const files = await walkMarkdown(abs(config.content_path))
      return Promise.all(files.map((file) => site.readPage(file)))
    },

    /** One page by slug (`hello-world`, `guides/getting-started`), or undefined. */
    async page(slug: string): Promise<Page<C> | undefined> {
      const file = abs(path.posix.join(config.content_path, `${slug}.md`))
      return (await readText(file)) === undefined ? undefined : site.readPage(file)
    },

    async readPage(file: string): Promise<Page<C>> {
      const repoFile = toPosix(path.relative(root, file))
      const { data, body } = parseMarkdown(await readFile(file, 'utf8'))
      const contentRoot = toPosix(path.normalize(config.content_path))
      return {
        slug: repoFile.slice(contentRoot.length + 1).replace(/\.md$/, ''),
        file: repoFile,
        data: applyDefaults(config.frontmatter, data, { file: repoFile, mapImage }) as Page<C>['data'],
        body,
        blocks: parseBody(body, repoFile),
      }
    },

    /** One carousel by key. A carousel that was never edited yields `{ images: [] }` plus defaults. */
    async carousel<K extends keyof NonNullable<C['carousels']> & string>(key: K): Promise<Carousel<C, K>> {
      const def = config.carousels?.[key]
      if (!def) throw new Error(`Unknown carousel "${key}". Declared: ${Object.keys(config.carousels ?? {}).join(', ') || 'none'}`)
      const raw = (await readJson(abs(path.posix.join(def.path, 'carousel.json')), `carousel "${key}"`)) ?? {}
      const slides = Array.isArray(raw.images) ? raw.images : []
      const { images: _images, ...rest } = raw
      const meta = applyDefaults(def.frontmatter, rest, { mapImage })
      const images = slides.filter(isObject).map((slide) => {
        const { src, ...fields } = slide
        const normalized = normalizeAssetPath(typeof src === 'string' ? src : '')
        return {
          ...applyDefaults(def.schema, fields, { mapImage }),
          src: mapImage && normalized ? mapImage(normalized) : normalized,
        }
      })
      return { ...meta, images } as Carousel<C, K>
    },

    /** Splits an arbitrary Markdown body (not tied to a page file). */
    elements(body: string, fromFile = ''): SiteBlock<C>[] {
      return parseBody(body, fromFile)
    },

    /** Normalises an image reference to a repo-relative path (or URL via `assetUrl`). */
    asset(value: string, fromFile?: string): string {
      const p = normalizeAssetPath(value, fromFile)
      return mapImage && p ? mapImage(p) : p
    },

    /** Everything at once; this is what the Vite plugin exposes as `virtual:liteditor`. */
    async all() {
      const carousels: Record<string, unknown> = {}
      for (const key of Object.keys(config.carousels ?? {})) carousels[key] = await site.carousel(key as never)
      return { settings: await site.settings(), pages: await site.pages(), carousels }
    },
  }
  return site
}

export type Site<C extends AnyConfig = AnyConfig> = ReturnType<typeof createSite<C>>
export type { FieldSchema }
