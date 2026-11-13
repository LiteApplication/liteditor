/**
 * Backward-compatibility check between two JSON Schemas (draft 2020-12, as
 * emitted by `z.toJSONSchema`).
 *
 * `findBreakingChanges(old, next)` returns the reasons why a `.liteditor` file
 * that was valid against `old` might NOT be valid against `next`. An empty
 * array means `next` accepts everything `old` accepted.
 *
 * The check is deliberately conservative: when it cannot prove compatibility
 * it reports a problem, and it throws on JSON Schema keywords it does not
 * understand rather than silently ignoring them.
 *
 * Adding new optional properties is NOT considered breaking: configs written
 * for the old schema had no reason to use keys it did not declare.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = boolean | { [key: string]: any }
type Obj = Exclude<Node, boolean>

const IGNORED = new Set([
  '$schema', '$id', '$defs', '$comment', 'title', 'description', 'default', 'examples',
  'deprecated', 'readOnly', 'writeOnly',
])
const HANDLED = new Set([
  '$ref', 'type', 'enum', 'const', 'anyOf', 'properties', 'required', 'additionalProperties',
  'propertyNames', 'items', 'pattern', 'format',
  'minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems',
  'minProperties', 'maxProperties',
])
const MIN_KEYS = ['minLength', 'minimum', 'minItems', 'minProperties'] as const
const MAX_KEYS = ['maxLength', 'maximum', 'maxItems', 'maxProperties'] as const

type Ctx = { oldRoot: Obj; newRoot: Obj; seen: Set<string> }

export function findBreakingChanges(oldSchema: Obj, newSchema: Obj): string[] {
  const ctx: Ctx = { oldRoot: oldSchema, newRoot: newSchema, seen: new Set() }
  return subset(oldSchema, newSchema, ctx, '$')
}

function resolve(node: Node, root: Obj): { node: Node; ref?: string } {
  let ref: string | undefined
  let current = node
  while (typeof current === 'object' && typeof current.$ref === 'string') {
    ref = current.$ref
    if (ref === '#') {
      current = root
    } else if (ref.startsWith('#/$defs/')) {
      const target = root.$defs?.[ref.slice('#/$defs/'.length)]
      if (target === undefined) throw new Error(`Unresolvable $ref ${ref}`)
      current = target
    } else {
      throw new Error(`Unsupported $ref ${ref}`)
    }
  }
  return { node: current, ref }
}

function assertSupported(node: Obj, path: string): void {
  for (const key of Object.keys(node)) {
    if (!IGNORED.has(key) && !HANDLED.has(key)) {
      throw new Error(
        `Unsupported JSON Schema keyword "${key}" at ${path}. ` +
          'Extend scripts/lib/schema-compat.ts to handle it before releasing.',
      )
    }
  }
}

function typesOf(node: Obj): string[] | undefined {
  if (node.type !== undefined) return Array.isArray(node.type) ? node.type : [node.type]
  return undefined
}

function valuesOf(node: Obj): unknown[] | undefined {
  if (Array.isArray(node.enum)) return node.enum
  if ('const' in node) return [node.const]
  return undefined
}

function describe(node: Node): string {
  if (typeof node !== 'object') return String(node)
  const t = node.properties?.type
  const tag = t?.const ?? t?.enum?.join('|')
  return tag ? `variant type=${tag}` : `variant ${JSON.stringify(node).slice(0, 80)}`
}

function subset(oldNode: Node, newNode: Node, ctx: Ctx, path: string): string[] {
  if (newNode === true || (typeof newNode === 'object' && Object.keys(newNode).length === 0)) return []
  if (oldNode === false) return []
  if (newNode === false) return [`${path}: schema no longer accepts any value`]
  if (oldNode === true) return [`${path}: previously accepted any value, now constrained`]

  const o = resolve(oldNode, ctx.oldRoot)
  const n = resolve(newNode, ctx.newRoot)
  if (o.ref || n.ref) {
    // Coinductive assumption: a pair already being compared is assumed compatible.
    const key = `${o.ref ?? ''}=>${n.ref ?? ''}`
    if (o.ref && n.ref) {
      if (ctx.seen.has(key)) return []
      ctx.seen.add(key)
    }
  }
  if (typeof o.node === 'boolean' || typeof n.node === 'boolean') {
    return subset(o.node, n.node, ctx, path)
  }
  const old = o.node
  const next = n.node
  assertSupported(old, path)
  assertSupported(next, path)

  // Unions: every old variant must fit somewhere in the new schema.
  if (old.anyOf) {
    return (old.anyOf as Node[]).flatMap((branch, i) =>
      subset({ ...stripAnyOf(old), ...(branch as Obj) }, next, ctx, `${path}.anyOf[${i}]`),
    )
  }
  if (next.anyOf) {
    const branches = next.anyOf as Node[]
    const base = stripAnyOf(next)
    for (const branch of branches) {
      const attempt = { ...ctx, seen: new Set(ctx.seen) }
      const problems = subset(old, { ...base, ...(branch as Obj) }, attempt, path)
      if (problems.length === 0) {
        attempt.seen.forEach((k) => ctx.seen.add(k))
        return []
      }
    }
    return [`${path}: no variant of the new schema accepts the old ${describe(old)}`]
  }

  const problems: string[] = []

  const oldTypes = typesOf(old)
  const newTypes = typesOf(next)
  if (newTypes) {
    if (!oldTypes) {
      problems.push(`${path}: type is now restricted to ${newTypes.join('|')}`)
    } else {
      for (const t of oldTypes) {
        const ok = newTypes.includes(t) || (t === 'integer' && newTypes.includes('number'))
        if (!ok) problems.push(`${path}: type "${t}" is no longer accepted`)
      }
    }
  }

  const newValues = valuesOf(next)
  if (newValues) {
    const oldValues = valuesOf(old)
    if (!oldValues) {
      problems.push(`${path}: value is now restricted to ${JSON.stringify(newValues)}`)
    } else {
      const removed = oldValues.filter(
        (v) => !newValues.some((w) => JSON.stringify(w) === JSON.stringify(v)),
      )
      if (removed.length) problems.push(`${path}: value(s) no longer accepted: ${JSON.stringify(removed)}`)
    }
  }

  for (const key of MIN_KEYS) {
    if (next[key] !== undefined && !(old[key] !== undefined && old[key] >= next[key])) {
      problems.push(`${path}: ${key} is now ${next[key]} (was ${old[key] ?? 'unbounded'})`)
    }
  }
  for (const key of MAX_KEYS) {
    if (next[key] !== undefined && !(old[key] !== undefined && old[key] <= next[key])) {
      problems.push(`${path}: ${key} is now ${next[key]} (was ${old[key] ?? 'unbounded'})`)
    }
  }
  for (const key of ['pattern', 'format'] as const) {
    if (next[key] !== undefined && next[key] !== old[key]) {
      problems.push(`${path}: ${key} changed from ${old[key] ?? 'none'} to ${next[key]}`)
    }
  }

  // Objects
  for (const key of next.required ?? []) {
    if (!(old.required ?? []).includes(key)) {
      problems.push(`${path}: property "${key}" is now required`)
    }
  }
  const newProps: Record<string, Node> = next.properties ?? {}
  for (const [key, oldProp] of Object.entries<Node>(old.properties ?? {})) {
    if (key in newProps) {
      problems.push(...subset(oldProp, newProps[key]!, ctx, `${path}.${key}`))
    } else if (next.additionalProperties === false) {
      problems.push(`${path}: property "${key}" was removed`)
    } else if (next.additionalProperties !== undefined && next.additionalProperties !== true) {
      problems.push(...subset(oldProp, next.additionalProperties, ctx, `${path}.${key}`))
    }
  }
  if (next.additionalProperties === false && old.additionalProperties !== false) {
    problems.push(`${path}: unknown properties are now rejected`)
  } else if (typeof next.additionalProperties === 'object') {
    problems.push(
      ...subset(old.additionalProperties ?? true, next.additionalProperties, ctx, `${path}.*`),
    )
  }
  if (next.propertyNames !== undefined) {
    problems.push(...subset(old.propertyNames ?? true, next.propertyNames, ctx, `${path}.<key>`))
  }

  // Arrays
  if (next.items !== undefined) {
    problems.push(...subset(old.items ?? true, next.items, ctx, `${path}[]`))
  }

  return problems
}

function stripAnyOf(node: Obj): Obj {
  const { anyOf: _anyOf, ...rest } = node
  return rest
}
