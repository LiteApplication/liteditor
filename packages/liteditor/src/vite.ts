import path from 'node:path'
import { writeFile, readFile } from 'node:fs/promises'
import { loadConfig, serializeConfig } from './config.ts'
import { createSite, type SiteOptions } from './site.ts'

const VIRTUAL = 'virtual:liteditor'
const RESOLVED = '\0' + VIRTUAL

export interface LiteditorPluginOptions extends Pick<SiteOptions, 'assetUrl'> {
  /** Repository root. Defaults to the Vite root. */
  root?: string
  /** Write `.liteditor` from `liteditor.config.*` on startup (default true). */
  generate?: boolean
}

// Minimal Vite types so the package does not need vite installed to compile.
interface ViteServer {
  watcher: { add(p: string): void; on(ev: string, cb: (file: string) => void): void }
  moduleGraph: { getModuleById(id: string): unknown; invalidateModule(m: unknown): void }
  ws: { send(msg: { type: 'full-reload' }): void }
}

/**
 * Vite plugin (also usable in Astro, SvelteKit…). Import everything the editors changed:
 *
 * ```ts
 * import { settings, pages, carousels } from 'virtual:liteditor'
 * ```
 */
export function liteditor(options: LiteditorPluginOptions = {}) {
  let root = options.root ?? process.cwd()
  let loaded: Awaited<ReturnType<typeof loadConfig>> | undefined

  const ensure = async () => (loaded ??= await loadConfig(root))

  return {
    name: 'liteditor',
    configResolved(c: { root: string }) {
      root = options.root ?? c.root
    },
    async buildStart() {
      const l = await ensure()
      if (l.source === 'code' && options.generate !== false) {
        const out = path.join(root, '.liteditor')
        const next = serializeConfig(l.config)
        if ((await readFile(out, 'utf8').catch(() => '')) !== next) await writeFile(out, next)
      }
    },
    resolveId(id: string) {
      return id === VIRTUAL ? RESOLVED : undefined
    },
    async load(id: string) {
      if (id !== RESOLVED) return undefined
      const l = await ensure()
      const data = await createSite(l.config, { root, assetUrl: options.assetUrl }).all()
      return [
        `export const settings = ${JSON.stringify(data.settings)}`,
        `export const pages = ${JSON.stringify(data.pages)}`,
        `export const carousels = ${JSON.stringify(data.carousels)}`,
      ].join('\n')
    },
    async configureServer(server: ViteServer) {
      const l = await ensure()
      const c = l.config
      const watched = [c.content_path, c.settings_file, ...Object.values<any>(c.carousels ?? {}).map((x) => x.path)]
        .filter((p): p is string => !!p)
        .map((p) => path.resolve(root, p))
      for (const p of watched) server.watcher.add(p)
      const onChange = (file: string) => {
        if (!watched.some((w) => path.resolve(file).startsWith(w))) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      for (const ev of ['add', 'change', 'unlink']) server.watcher.on(ev, onChange)
    },
  }
}

export default liteditor
