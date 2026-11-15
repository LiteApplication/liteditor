/**
 * Usage: npm run release -- <patch|minor|major|x.y.z> [--dry-run]
 *
 * 1. Requires a clean git work tree and an unused tag.
 * 2. Refuses to release if the schema breaks any snapshot in _history/.
 * 3. Bumps package.json (+ package-lock.json), writes _history/v<version>.schema.json.
 * 4. If anything under packages/ changed since the previous release tag, also bumps
 *    packages/liteditor/package.json (+ lock) with the same bump kind (patch for an explicit x.y.z).
 * 5. Commits "release v<version>" and creates the annotated tag v<version>.
 *
 * Nothing is pushed; the script prints the command to run.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  ROOT,
  checkCompatibility,
  currentSchema,
  reportBreakage,
  snapshotPath,
  writeSnapshot,
} from './lib/history.ts'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const bump = args.find((a) => !a.startsWith('--'))

function fail(message: string): never {
  console.error(`\nrelease aborted: ${message}`)
  process.exit(1)
}

function git(...gitArgs: string[]): string {
  return execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function nextVersion(current: string, bump: string): string {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump
  const [major, minor, patch] = current.split('.').map(Number) as [number, number, number]
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`
  return fail('first argument must be patch, minor, major or an explicit x.y.z version')
}

if (!bump) fail('usage: npm run release -- <patch|minor|major|x.y.z> [--dry-run]')

try {
  git('rev-parse', '--is-inside-work-tree')
} catch {
  fail('not inside a git repository')
}

if (git('status', '--porcelain')) fail('the work tree has uncommitted changes; commit or stash them first')

const pkgPath = join(ROOT, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string }
const version = nextVersion(pkg.version, bump)
const tag = `v${version}`

if (git('tag', '--list', tag)) fail(`tag ${tag} already exists`)
if (existsSync(snapshotPath(version))) fail(`${snapshotPath(version)} already exists`)

const schema = currentSchema()
const failures = checkCompatibility(schema)
if (failures.length > 0) {
  reportBreakage(failures)
  fail('schema compatibility check failed')
}

// Has anything under packages/ changed since the previous release tag?
const PACKAGE_JSON = join(ROOT, 'packages', 'liteditor', 'package.json')
let lastTag = ''
try {
  lastTag = git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*')
} catch {
  // No previous release: treat the package as changed.
}
const packageChanged = !lastTag || git('diff', '--name-only', lastTag, 'HEAD', '--', 'packages/') !== ''
let packageVersion = ''
if (packageChanged && existsSync(PACKAGE_JSON)) {
  const current = (JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { version: string }).version
  // Same bump kind as the app release; an explicit x.y.z bumps the package by a patch.
  packageVersion = nextVersion(current, /^\d+\.\d+\.\d+$/.test(bump) ? 'patch' : bump)
}

if (dryRun) {
  console.log(
    packageChanged && packageVersion
      ? `[dry-run] packages/ changed since ${lastTag || 'the start'}: npm package would be bumped to ${packageVersion}`
      : `[dry-run] packages/ unchanged since ${lastTag}: npm package version untouched`,
  )
  console.log(`[dry-run] would release ${tag}: schema compatible, snapshot + commit + tag skipped`)
  process.exit(0)
}

// Bump versions in package.json and package-lock.json (preserving formatting).
type Json = { version?: string; packages?: Record<string, { version?: string }> }
function bumpJson(file: string, edit: (json: Json) => void): void {
  const json = JSON.parse(readFileSync(file, 'utf8')) as Json
  edit(json)
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
}
bumpJson(pkgPath, (json) => {
  json.version = version
})
const lockPath = join(ROOT, 'package-lock.json')
if (existsSync(lockPath)) {
  bumpJson(lockPath, (json) => {
    json.version = version
    if (json.packages?.['']) json.packages[''].version = version
  })
}

const snapshot = writeSnapshot(version, schema)
const toAdd = ['package.json', 'package-lock.json', snapshot]

// Bump the npm package too when anything under packages/ changed since the last release.
if (packageChanged && packageVersion) {
  const pkgDir = join(ROOT, 'packages', 'liteditor')
  const pkgJson = join(pkgDir, 'package.json')
  const pkgLock = join(pkgDir, 'package-lock.json')
  bumpJson(pkgJson, (json) => {
    json.version = packageVersion
  })
  if (existsSync(pkgLock)) {
    bumpJson(pkgLock, (json) => {
      json.version = packageVersion
      if (json.packages?.['']) json.packages[''].version = packageVersion
    })
    toAdd.push(pkgLock)
  }
  toAdd.push(pkgJson)
}

git('add', ...toAdd)
git('commit', '-m', `release ${tag}`)
git('tag', '-a', tag, '-m', `LiteEditor ${tag}`)

console.log(`\nReleased ${tag}. Snapshot: _history/v${version}.schema.json`)
if (packageChanged) console.log(`npm package liteditor bumped to ${packageVersion}. To publish it: git tag liteditor-v${packageVersion} && git push origin liteditor-v${packageVersion}`)
console.log(`Push with: git push && git push origin ${tag}`)
