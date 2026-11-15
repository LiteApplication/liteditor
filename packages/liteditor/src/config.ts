import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import yaml from 'js-yaml'
import { LiteEditorConfigSchema, type LiteEditorConfig } from './schema.ts'
import type { Field, FieldMap } from './fields.ts'

export interface ElementInput<F extends FieldMap = FieldMap> {
  label: string
  description?: string
  fields: F
  display?: {
    title?: Extract<keyof F, string>
    description?: Extract<keyof F, string>
    images?: Extract<keyof F, string>
  }
}

export interface CarouselInput<S extends FieldMap = FieldMap, M extends FieldMap = FieldMap> {
  label: string
  description?: string
  path: string
  /** Fields of each slide (besides `src`). */
  schema?: S
  /** Fields of the carousel as a whole. */
  frontmatter?: M
}

/** Same keys as the `.liteditor` file, so the generated file is a plain serialisation. */
export interface ConfigInput<
  S extends FieldMap = FieldMap,
  F extends FieldMap = FieldMap,
  C extends Record<string, CarouselInput<any, any>> = Record<string, CarouselInput>,
  E extends Record<string, ElementInput<any>> = Record<string, ElementInput>,
> {
  content_path: string
  assets_path: string
  settings_file?: string
  schema?: S
  frontmatter?: F
  carousels?: C
  elements?: E
}

/** Identity helper that keeps the literal field types so loaded data is typed. */
export function defineConfig<
  S extends FieldMap = {},
  F extends FieldMap = {},
  C extends Record<string, CarouselInput<any, any>> = {},
  E extends Record<string, ElementInput<any>> = {},
>(config: ConfigInput<S, F, C, E>): ConfigInput<S, F, C, E> {
  return config
}

/** Declares an element next to the component that renders it; reference it from `elements`. */
export function defineElement<F extends FieldMap>(element: ElementInput<F>): ElementInput<F> {
  return element
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

/** Validates against the editor's schema. Returns the config unchanged (not the zod output). */
export function validateConfig<T extends ConfigInput<any, any, any, any> | LiteEditorConfig>(config: T): T {
  const result = LiteEditorConfigSchema.safeParse(config)
  if (!result.success) {
    const lines = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    throw new ConfigError(`Invalid LiteEditor config:\n  ${lines.join('\n  ')}`)
  }
  return config
}

/** The JSON written to `.liteditor`. */
export function serializeConfig(config: ConfigInput<any, any, any, any> | LiteEditorConfig): string {
  validateConfig(config)
  const known = [
    'content_path',
    'assets_path',
    'settings_file',
    'schema',
    'frontmatter',
    'carousels',
    'elements',
  ] as const
  const out: Record<string, unknown> = {}
  for (const key of known) {
    const value = (config as Record<string, unknown>)[key]
    if (value !== undefined) out[key] = value
  }
  return JSON.stringify(out, null, 2) + '\n'
}

const CODE_CONFIGS = ['liteditor.config.ts', 'liteditor.config.mts', 'liteditor.config.js', 'liteditor.config.mjs']

export interface LoadedConfig {
  config: ConfigInput<any, any, any, any>
  /** `code` for liteditor.config.*, `file` for a hand-written `.liteditor`. */
  source: 'code' | 'file'
  /** Absolute path of the file the config was read from. */
  file: string
  root: string
}

const exists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  )

/** Finds `liteditor.config.*` (preferred) or `.liteditor` under `root` and validates it. */
export async function loadConfig(root: string = process.cwd()): Promise<LoadedConfig> {
  root = path.resolve(root)
  for (const name of CODE_CONFIGS) {
    const file = path.join(root, name)
    if (!(await exists(file))) continue
    const { createJiti } = await import('jiti')
    const jiti = createJiti(pathToFileURL(file).href, { interopDefault: true, moduleCache: false })
    const mod: any = await jiti.import(file)
    const config = mod?.default ?? mod
    if (!config || typeof config !== 'object') {
      throw new ConfigError(`${name} must export a config (use export default defineConfig({...}))`)
    }
    return { config: validateConfig(config), source: 'code', file, root }
  }

  const file = path.join(root, '.liteditor')
  if (!(await exists(file))) {
    throw new ConfigError(`No liteditor.config.ts or .liteditor found in ${root}. Run "npx liteditor init".`)
  }
  const text = await readFile(file, 'utf8')
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = yaml.load(text)
  }
  return { config: validateConfig(data as LiteEditorConfig), source: 'file', file, root }
}

export type { Field }
