import { useAuthStore } from '@/stores/auth'
import { useRepoStore } from '@/stores/repo'

// Module-level cache — persists for the session
const cache = new Map<string, string>()

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', avif: 'image/avif',
}

export function useGitHubImage() {
  const auth = useAuthStore()
  const repo = useRepoStore()

  /** Resolve a repo-root-relative asset path to a displayable URL/data-URL. */
  async function loadImage(repoPath: string): Promise<string> {
    if (!repoPath || repoPath.startsWith('data:')) return repoPath

    // 1. Check if the image is staged
    const staged = repo.stagedFiles.get(repoPath)
    if (staged && staged.type === 'asset' && staged.content) {
      const ext = repoPath.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mime = MIME[ext] ?? 'image/jpeg'
      return `data:${mime};base64,${staged.content.replace(/\n/g, '')}`
    }

    // 2. Check cache
    if (cache.has(repoPath)) return cache.get(repoPath)!

    const r = repo.selectedRepo
    if (!r) return ''

    // Public repos: raw GitHub URL (no auth needed, fast)
    if (!r.private) {
      const url = `https://raw.githubusercontent.com/${r.owner.login}/${r.name}/${r.default_branch}/${repoPath}`
      cache.set(repoPath, url)
      return url
    }

    // Private repos: fetch via the authenticated API
    try {
      const res = await auth.githubFetch(`/repos/${r.owner.login}/${r.name}/contents/${repoPath}`)
      if (!res.ok) return ''
      const data = await res.json() as { content: string }
      const ext = repoPath.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mime = MIME[ext] ?? 'image/jpeg'
      const dataUrl = `data:${mime};base64,${data.content.replace(/\n/g, '')}`
      cache.set(repoPath, dataUrl)
      return dataUrl
    } catch {
      return ''
    }
  }

  /** Invalidate a path (e.g. after upload). */
  function invalidate(repoPath: string) {
    cache.delete(repoPath)
  }

  return { loadImage, invalidate }
}
