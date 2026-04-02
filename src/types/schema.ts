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

export const LiteEditorConfigSchema = z.object({
  content_path: z.string(),
  assets_path: z.string(),
  settings_file: z.string().optional(),
  schema: z.record(z.string(), FieldSchemaSchema).optional(),
  frontmatter: z.record(z.string(), FieldSchemaSchema).optional(),
  carousels: z.record(z.string(), CarouselConfigSchema).optional(),
})

export type LiteEditorConfig = z.infer<typeof LiteEditorConfigSchema>
