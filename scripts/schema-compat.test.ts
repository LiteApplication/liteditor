import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findBreakingChanges } from './lib/schema-compat.ts'
import { currentSchema, type JsonSchema } from './lib/history.ts'

const clone = (): JsonSchema => structuredClone(currentSchema())
const variants = (s: JsonSchema): JsonSchema[] => s.$defs.__schema0.anyOf

test('identical schema is compatible', () => {
  assert.deepEqual(findBreakingChanges(currentSchema(), clone()), [])
})

test('adding an optional root property is compatible', () => {
  const next = clone()
  next.properties.theme = { type: 'string' }
  assert.deepEqual(findBreakingChanges(currentSchema(), next), [])
})

test('adding a new field type variant is compatible', () => {
  const next = clone()
  variants(next).push({
    type: 'object',
    properties: { type: { type: 'string', const: 'date' } },
    required: ['type'],
  })
  assert.deepEqual(findBreakingChanges(currentSchema(), next), [])
})

test('widening an enum is compatible', () => {
  const next = clone()
  variants(next)[0]!.properties.type.enum.push('rich-text')
  assert.deepEqual(findBreakingChanges(currentSchema(), next), [])
})

test('removing a field type variant is breaking', () => {
  const next = clone()
  variants(next).splice(1, 1) // color
  assert.ok(findBreakingChanges(currentSchema(), next).length > 0)
})

test('narrowing an enum is breaking', () => {
  const next = clone()
  variants(next)[0]!.properties.type.enum.pop()
  assert.match(findBreakingChanges(currentSchema(), next).join('\n'), /no variant/)
})

test('making a property required is breaking', () => {
  const next = clone()
  next.required.push('settings_file')
  assert.match(findBreakingChanges(currentSchema(), next).join('\n'), /"settings_file" is now required/)
})

test('changing a property type is breaking', () => {
  const next = clone()
  next.properties.content_path = { type: 'number' }
  assert.match(findBreakingChanges(currentSchema(), next).join('\n'), /content_path/)
})

test('rejecting unknown properties is breaking', () => {
  const next = clone()
  next.additionalProperties = false
  assert.match(findBreakingChanges(currentSchema(), next).join('\n'), /unknown properties are now rejected/)
})

test('a breaking change inside a recursive definition is detected', () => {
  const next = clone()
  const list = variants(next).find((v) => v.properties.type.const === 'list')!
  list.required.push('max')
  assert.ok(findBreakingChanges(currentSchema(), next).length > 0)
})

test('unsupported keywords throw instead of passing silently', () => {
  const next = clone()
  next.allOf = [{ type: 'object' }]
  assert.throws(() => findBreakingChanges(currentSchema(), next), /Unsupported JSON Schema keyword/)
})
