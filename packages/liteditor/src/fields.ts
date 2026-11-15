import type { FieldSchema } from './schema.ts'

/** A field definition that remembers the TypeScript type of the value it stores. */
export type Field<T = unknown> = FieldSchema & { readonly __type?: T }

export type FieldMap = Record<string, Field<any>>

type Loose<T> = unknown extends T ? any : T

/** Turns `{ title: Field<string> }` into `{ title: string }`. */
export type InferFields<R> = R extends FieldMap
  ? { [K in keyof R]: R[K] extends Field<infer T> ? Loose<T> : never }
  : Record<string, any>

/** Like InferFields but an absent definition (`undefined`) gives `{}`. */
export type FieldsOf<R> = [NonNullable<R>] extends [never]
  ? {}
  : NonNullable<R> extends FieldMap
    ? InferFields<NonNullable<R>>
    : {}

interface Common {
  description?: string
}

const make = <T>(field: FieldSchema): Field<T> => field as Field<T>

/**
 * Field builders. The first argument is always the label shown in the editor.
 *
 * ```ts
 * frontmatter: { title: f.text('Title'), cover: f.image('Cover') }
 * ```
 */
export const f = {
  text: (label: string, o: Common = {}) => make<string>({ label, type: 'short-text', ...o }),
  longText: (label: string, o: Common = {}) => make<string>({ label, type: 'long-text', ...o }),
  bool: (label: string, o: Common = {}) => make<boolean>({ label, type: 'boolean', ...o }),
  image: (label: string, o: Common = {}) => make<string>({ label, type: 'image', ...o }),
  link: (label: string, o: Common = {}) => make<string>({ label, type: 'link', ...o }),
  color: (label: string, o: Common & { alpha?: boolean } = {}) =>
    make<string>({ label, type: 'color', ...o }),
  /** Options are plain strings (label = value) or `{ value, label }`. */
  select: <const V extends string>(
    label: string,
    options: readonly (V | { value: V; label?: string })[],
    o: Common = {},
  ) =>
    make<V>({
      label,
      type: 'selection',
      options: options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : { value: opt.value, label: opt.label ?? opt.value },
      ),
      ...o,
    }),
  list: <T>(label: string, item: Field<T>, o: Common & { max?: number } = {}) =>
    make<T[]>({ label, type: 'list', itemSchema: item, ...o }),
  object: <R extends FieldMap>(label: string, fields: R, o: Common = {}) =>
    make<InferFields<R>>({ label, type: 'object', fields, ...o }),
}
