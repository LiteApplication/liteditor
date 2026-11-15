import { z } from 'zod'

export const SelectionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})

export type SelectionOption = z.infer<typeof SelectionOptionSchema>

const BaseFields = {
  label: z.string().default(''),
  description: z.string().optional(),
}

export type FieldSchema = {
  label: string
  description?: string
} & (
  | { type?: 'short-text' | 'long-text' | 'boolean' | 'image' | 'link' }
  | { type: 'color'; alpha?: boolean }
  | { type: 'selection'; options: SelectionOption[] }
  | { type: 'list'; itemSchema: FieldSchema; max?: number }
  | { type: 'object'; fields: Record<string, FieldSchema> }
)

export const FieldSchemaSchema: z.ZodType<FieldSchema> = z.lazy(() =>
  z.union([
    z.object({
      ...BaseFields,
      type: z.enum(['short-text', 'long-text', 'boolean', 'image', 'link']).optional()
    }),
    z.object({
      ...BaseFields,
      type: z.literal('color'),
      alpha: z.boolean().optional()
    }),
    z.object({
      ...BaseFields,
      type: z.literal('selection'),
      options: z.array(SelectionOptionSchema)
    }),
    z.object({
      ...BaseFields,
      type: z.literal('list'),
      itemSchema: FieldSchemaSchema,
      max: z.number().optional()
    }),
    z.object({
      ...BaseFields,
      type: z.literal('object'),
      fields: z.record(z.string(), z.lazy(() => FieldSchemaSchema))
    }),
  ])
)

export const CarouselConfigSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  path: z.string(),
  schema: z.record(z.string(), FieldSchemaSchema).optional(),
  frontmatter: z.record(z.string(), FieldSchemaSchema).optional(),
})

export type CarouselConfig = z.infer<typeof CarouselConfigSchema>

const TEXT_TYPES = ['short-text', 'long-text', 'link']

function isImageField(f: FieldSchema): boolean {
  return f.type === 'image' || (f.type === 'list' && f.itemSchema.type === 'image')
}

export const ElementConfigSchema = z
  .object({
    label: z.string(),
    description: z.string().optional(),
    fields: z.record(z.string(), FieldSchemaSchema),
    display: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        images: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (el) => {
      const d = el.display
      if (!d) return true
      for (const key of ['title', 'description'] as const) {
        const name = d[key]
        if (name === undefined) continue
        const f = el.fields[name]
        if (!f || !TEXT_TYPES.includes(f.type ?? 'short-text')) return false
      }
      if (d.images !== undefined) {
        const f = el.fields[d.images]
        if (!f || !isImageField(f)) return false
      }
      return true
    },
    {
      message:
        'display.title/description must name a text field and display.images an image (or list of image) field of the element',
    },
  )

export type ElementConfig = z.infer<typeof ElementConfigSchema>

export const FoldersConfigSchema = z.object({
  /** Whether editors may create (and move into) folders. Defaults to true. */
  allow_create: z.boolean().optional(),
  /** Maximum nesting depth of folders below content_path / assets_path. 1 = top-level folders only. */
  max_depth: z.number().int().min(1).optional(),
})

export type FoldersConfig = z.infer<typeof FoldersConfigSchema>

export const LiteEditorConfigSchema = z.object({
  content_path: z.string(),
  assets_path: z.string(),
  settings_file: z.string().optional(),
  schema: z.record(z.string(), FieldSchemaSchema).optional(),
  frontmatter: z.record(z.string(), FieldSchemaSchema).optional(),
  carousels: z.record(z.string(), CarouselConfigSchema).optional(),
  elements: z.record(z.string(), ElementConfigSchema).optional(),
  folders: FoldersConfigSchema.optional(),
})

export type LiteEditorConfig = z.infer<typeof LiteEditorConfigSchema>
