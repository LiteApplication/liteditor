// Path manipulation helpers

/**
 * Resolve a relative path from a file to an absolute repo path.
 * e.g. resolveRelativePath('src/content/blog/post.md', '../../assets/img.jpg')
 *      → 'src/assets/img.jpg'
 */
export function resolveRelativePath(fromFile: string, relativeSrc: string): string {
  if (!relativeSrc || relativeSrc.startsWith('http') || relativeSrc.startsWith('data:'))
    return relativeSrc
  const dir = fromFile.split('/').slice(0, -1)
  const parts = relativeSrc.split('/')
  const stack = [...dir]
  for (const part of parts) {
    if (part === '..') stack.pop()
    else if (part !== '.') stack.push(part)
  }
  return stack.join('/')
}

/**
 * Compute a relative path from one file to another.
 * e.g. computeRelativePath('src/content/blog/post.md', 'src/assets/img.jpg')
 *      → '../../assets/img.jpg'
 */
export function computeRelativePath(fromFile: string, toFile: string): string {
  if (!fromFile || !toFile) return toFile
  const fromDir = fromFile.split('/').slice(0, -1)
  const toParts = toFile.split('/')
  let i = 0
  while (i < fromDir.length && i < toParts.length && fromDir[i] === toParts[i]) i++
  return (fromDir.length === i ? './' : '../'.repeat(fromDir.length - i)) + toParts.slice(i).join('/')
}

/**
 * Rewrite relative document paths (markdown links, src/href attrs) and
 * frontmatter values when a file is moved from oldPath to newPath.
 */
export function adjustDocumentPaths(
  oldPath: string,
  newPath: string,
  content: string,
  frontmatter: Record<string, unknown>,
) {
  let newContent = content
  const urlRegex = /\]\(([^)]+)\)|src="([^"]+)"|href="([^"]+)"/g
  newContent = newContent.replace(urlRegex, (match, g1, g2, g3) => {
    const url = g1 || g2 || g3
    if (url && (url.startsWith('./') || url.startsWith('../'))) {
      const abs = resolveRelativePath(oldPath, url)
      const rel = computeRelativePath(newPath, abs)
      if (g1) return `](${rel})`
      if (g2) return `src="${rel}"`
      if (g3) return `href="${rel}"`
    }
    return match
  })

  let newFm = frontmatter
  if (frontmatter && typeof frontmatter === 'object') {
    newFm = JSON.parse(JSON.stringify(frontmatter))
    function walk(obj: Record<string, unknown>) {
      if (!obj) return
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          const val = obj[key]
          if (val.startsWith('./') || val.startsWith('../')) {
            const abs = resolveRelativePath(oldPath, val)
            obj[key] = computeRelativePath(newPath, abs)
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          walk(obj[key] as Record<string, unknown>)
        }
      }
    }
    walk(newFm)
  }
  return { newContent, newFm }
}

/**
 * Build a raw.githubusercontent.com URL for a file.
 */
export function rawGitHubUrl(
  repo: { owner: { login: string }; name: string; default_branch: string },
  repoPath: string,
): string {
  return `https://raw.githubusercontent.com/${repo.owner.login}/${repo.name}/${repo.default_branch}/${repoPath}`
}
