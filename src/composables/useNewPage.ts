import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'

/** Starts the new-page flow: type dialog if the site defines page types, plain name prompt otherwise. */
export function useNewPage() {
  const { t } = useI18n()
  const repo = useRepoStore()
  const ui = useUIStore()

  /** `folder` is content-relative; '/' or '' = root. Returns true if a page was created. */
  async function newPage(folder: string): Promise<boolean> {
    const contentPath = repo.config?.content_path ?? ''
    const rel = folder === '/' ? '' : folder
    const dir = rel ? `${contentPath}/${rel}` : contentPath
    if (Object.keys(repo.config?.page_types ?? {}).length > 0) {
      const res = await ui.chooseNewPage({ folder: rel })
      if (!res) return false
      repo.createFile(res.folder ? `${contentPath}/${res.folder}` : contentPath, res.name, res.type)
      return true
    }
    const name = await ui.promptText({
      title: t('dialog.newPage'),
      message: t('sidebar.newPagePrompt'),
      confirmLabel: t('dialog.create'),
    })
    if (!name) return false
    repo.createFile(dir, name)
    return true
  }

  return { newPage }
}
