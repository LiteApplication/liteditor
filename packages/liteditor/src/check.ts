import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import type { FieldSchema } from './schema.ts'
import type { ConfigInput } from './config.ts'
import { normalizeAssetPath } from './assets.ts'
import { parseMarkdown } from './content.ts'
import { splitBody } from './elements.ts'
import { folderAllowed, pageModeOf, resolvePageType } from './page-types.ts'

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/)/i

/** Type problems of one value against its field, as `path: reason` strings. */
export function validateValue(
  field: FieldSchema,
  value: unknown,
  at: string,
  onImage: (value: string, at: string) => void = () => {},
): string[] {
  if (value === undefined || value === null) return []
  const bad = (expected: string) => [`${at}: expected ${expected}, got ${Array.isArray(value) ? 'list' : typeof value}`]
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? [] : bad('true or false')
    case 'color':
      return typeof value === 'string' && /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
        ? []
        : [`${at}: expected a hex color (#RRGGBB or #RRGGBBAA)`]
    case 'selection': {
      if (typeof value !== 'string') return bad('text')
      return field.options.some((o) => o.value === value)
        ? []
        : [`${at}: "${value}" is not one of ${field.options.map((o) => o.value).join(', ')}`]
    }
    case 'list': {
      if (!Array.isArray(value)) return bad('a list')
      const problems = field.max !== undefined && value.length > field.max ? [`${at}: more than ${field.max} items`] : []
      value.forEach((item, i) => problems.push(...validateValue(field.itemSchema, item, `${at}[${i}]`, onImage)))
      return problems
    }
    case 'object': {
      if (!isObject(value)) return bad('a mapping')
      return Object.entries(field.fields).flatMap(([k, f]) => validateValue(f, value[k], `${at}.${k}`, onImage))
    }
    case 'image':
      if (typeof value !== 'string') return bad('an image path')
      if (value) onImage(value, at)
      return []
    default:
      return typeof value === 'string' ? [] : bad('text')
  }
}

const validateFields = (
  fields: Record<string, FieldSchema> | undefined,
  data: Record<string, unknown>,
  at: string,
  onImage: (value: string, at: string) => void,
) => Object.entries(fields ?? {}).flatMap(([k, f]) => validateValue(f, data[k], `${at}${k}`, onImage))

async function markdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await markdownFiles(full)))
    else if (e.name.endsWith('.md')) out.push(full)
  }
  return out.sort()
}

async function readJsonLoose(file: string, problems: string[], at: string): Promise<Record<string, unknown> | undefined> {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch {
    return undefined // not created yet: fine
  }
  try {
    const data = JSON.parse(text)
    if (isObject(data)) return data
    problems.push(`${at}: must be a JSON object`)
  } catch (e) {
    problems.push(`${at}: invalid JSON (${(e as Error).message})`)
  }
  return undefined
}

/** Checks the content on disk against the config. Returns one line per problem. */
export async function checkContent(config: ConfigInput<any, any, any, any>, root: string): Promise<string[]> {
  const problems: string[] = []
  const images: Array<{ repoPath: string; at: string }> = []
  const collector = (fromFile?: string) => (value: string, at: string) => {
    if (EXTERNAL.test(value)) return
    images.push({ repoPath: normalizeAssetPath(value, fromFile), at })
  }

  if (config.settings_file) {
    const data = await readJsonLoose(path.join(root, config.settings_file), problems, config.settings_file)
    if (data) problems.push(...validateFields(config.schema, data, `${config.settings_file}: `, collector()))
  }

  for (const [key, t] of Object.entries<any>(config.page_types ?? {})) {
    for (const el of t.elements ?? [])
      if (!config.elements?.[el]) problems.push(`page_types.${key}: element "${el}" is not declared in elements`)
  }

  const perFolder = new Map<string, number>()
  const contentRoot = path.posix.normalize(config.content_path)
  for (const file of await markdownFiles(path.join(root, config.content_path))) {
    const repoFile = path.relative(root, file).split(path.sep).join('/')
    const { data, body } = parseMarkdown(await readFile(file, 'utf8'))
    const slug = repoFile.slice(contentRoot.length + 1).replace(/\.md$/, '')
    const typeKey = resolvePageType(config, slug, data)
    const type = typeKey ? config.page_types?.[typeKey] : undefined
    const fields = { ...config.frontmatter, ...type?.frontmatter }
    problems.push(...validateFields(fields, data, `${repoFile}: frontmatter.`, collector(repoFile)))
    if (typeKey && type) {
      const folder = slug.includes('/') ? slug.slice(0, slug.lastIndexOf('/')) : ''
      if (!folderAllowed(type.folders, type.allow_new_folders, folder))
        problems.push(`${repoFile}: page type "${typeKey}" is not allowed in folder "${folder || '/'}"`)
      if (type.max_pages_per_folder !== undefined) {
        const k = `${typeKey}\0${folder}`
        const n = (perFolder.get(k) ?? 0) + 1
        perFolder.set(k, n)
        if (n === type.max_pages_per_folder + 1)
          problems.push(`${repoFile}: more than ${type.max_pages_per_folder} "${typeKey}" pages in folder "${folder || '/'}"`)
      }
    }
    for (const block of splitBody(body)) {
      if (!typeKey || !type) {
        // no type: no restriction
      } else if (block.type === 'markdown') {
        if (pageModeOf(config, typeKey, data) === 'block' && !type.markdown_block && block.value.trim())
          problems.push(`${repoFile}: Markdown text is not allowed in block pages of type "${typeKey}"`)
      } else if (type.elements && !type.elements.includes(block.key)) {
        problems.push(`${repoFile}: element "${block.key}" is not allowed on page type "${typeKey}"`)
      }
      if (block.type !== 'element') continue
      const where = `${repoFile}: element ${block.key} #${block.rank + 1}`
      const def = config.elements?.[block.key]
      if (block.error) problems.push(`${where}: invalid YAML (${block.error})`)
      else if (!def) problems.push(`${where}: no element "${block.key}" in the config`)
      else problems.push(...validateFields(def.fields, block.data, `${where}: `, collector(repoFile)))
    }
  }

  for (const [key, def] of Object.entries<any>(config.carousels ?? {})) {
    const file = `${def.path}/carousel.json`
    const data = await readJsonLoose(path.join(root, file), problems, file)
    if (!data) continue
    if (data.images !== undefined && !Array.isArray(data.images)) problems.push(`${file}: images must be a list`)
    const { images: slides, ...meta } = data
    problems.push(...validateFields(def.frontmatter, meta, `${file}: `, collector()))
    ;(Array.isArray(slides) ? slides : []).forEach((slide, i) => {
      if (!isObject(slide)) return void problems.push(`${file}: images[${i}] must be an object`)
      if (typeof slide.src !== 'string' || !slide.src) problems.push(`${file}: images[${i}].src is missing`)
      else collector()(slide.src, `${file}: images[${i}].src`)
      problems.push(...validateFields(def.schema, slide, `${file}: images[${i}].`, collector()))
    })
    void key
  }

  for (const { repoPath, at } of images) {
    await access(path.join(root, repoPath)).catch(() => problems.push(`${at}: image not found (${repoPath})`))
  }
  return problems
}
