<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore, type TreeNode } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import { useGitHubImage } from '@/composables/useGitHubImage'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()
const { loadImage } = useGitHubImage()

const isDirty = (path: string) => {
  const f = repo.stagedFiles.get(path)
  return f ? f.content !== f.originalContent : false
}

const isOpen = (path: string) => repo.stagedFiles.has(path)

async function handleSelect(node: TreeNode) {
  try {
    await repo.openFile(node)
    ui.settingsOpen = false
  } catch {
    ui.addToast({ type: 'error', title: t('sidebar.configError'), message: node.path })
  }
}

function openSettings() {
  ui.settingsOpen = true
  repo.activeFilePath = null
  repo.activeCarouselKey = null
}

async function handleCarouselSelect(key: string) {
  await repo.openCarousel(key)
  ui.settingsOpen = false
}

const sortedGroupedFiles = computed(() => {
  const groups: Record<string, typeof repo.fileTree> = { '/': [] }
  const contentPath = repo.config?.content_path ?? ''

  for (const node of repo.fileTree) {
    const relativePath = node.path.replace(contentPath + '/', '')
    const parts = relativePath.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/'

    if (dir !== '/') {
      const dirParts = dir.split('/')
      for (let i = 1; i <= dirParts.length; i++) {
        const ancestor = dirParts.slice(0, i).join('/')
        if (!groups[ancestor]) groups[ancestor] = []
      }
    }
    if (!groups[dir]) groups[dir] = []
    groups[dir].push(node)
  }

  for (const cf of repo.customFolders) {
    if (cf !== '/') {
      const dirParts = cf.split('/')
      for (let i = 1; i <= dirParts.length; i++) {
        const ancestor = dirParts.slice(0, i).join('/')
        if (!groups[ancestor]) groups[ancestor] = []
      }
    }
  }

  const sorted: Array<{ group: string, nodes: typeof repo.fileTree, depth: number }> = []
  const keys = Object.keys(groups).sort()

  for (const group of keys) {
    if (group !== '/') {
      const parts = group.split('/')
      let isVisible = true
      for (let i = 1; i <= parts.length - 1; i++) {
        const ancestor = parts.slice(0, i).join('/')
        if (!expandedFolders.value.has(ancestor)) {
          isVisible = false
          break
        }
      }
      if (!isVisible) continue
    }
    const depth = group === '/' ? 0 : group.split('/').length
    sorted.push({ group, nodes: groups[group]!.sort((a, b) => a.name.localeCompare(b.name)), depth })
  }
  return sorted
})

const expandedFolders = ref<Set<string>>(new Set(['/']))

function toggleFolder(folder: string) {
  if (expandedFolders.value.has(folder)) {
    expandedFolders.value.delete(folder)
  } else {
    expandedFolders.value.add(folder)
  }
}

function createNewPage(folder: string) {
  const name = prompt(t('sidebar.newPagePrompt'))
  if (!name) return
  const contentPath = repo.config?.content_path ?? ''
  const fullDir = folder === '/' ? contentPath : `${contentPath}/${folder}`
  repo.createFile(fullDir, name)
}

function createNewFolder() {
  const name = prompt(t('sidebar.newFolderPrompt'))
  if (!name) return
  const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (!sanitized) return
  if (!repo.customFolders.includes(sanitized)) {
    repo.customFolders.push(sanitized)
    expandedFolders.value.add(sanitized)
  }
}

// Drag and Drop
function onDragStartFolder(e: DragEvent, group: string) {
  const cp = repo.config?.content_path ?? ''
  const path = group === '/' ? cp : `${cp}/${group}`
  e.dataTransfer?.setData('text/plain', `folder:${path}`)
}
function onDragStart(e: DragEvent, path: string) {
  e.dataTransfer?.setData('text/plain', `file:${path}`)
}
const dragTarget = ref<string | null>(null)

function onDragOver(e: DragEvent, group: string) {
  e.preventDefault()
  dragTarget.value = group
}

function onDragLeave(e: DragEvent) {
  dragTarget.value = null
}

function onDrop(e: DragEvent, group: string) {
  dragTarget.value = null
  const data = e.dataTransfer?.getData('text/plain')
  if (!data) return

  const cp = repo.config?.content_path ?? ''
  const targetDir = group === '/' ? cp : `${cp}/${group}`

  if (data.startsWith('file:')) {
    const oldPath = data.substring(5)
    const fileName = oldPath.split('/').pop()!
    const newPath = `${targetDir}/${fileName}`
    if (oldPath !== newPath) {
      void repo.renameItem(oldPath, newPath, false)
    }
  } else if (data.startsWith('folder:')) {
    const oldPath = data.substring(7)
    const folderName = oldPath.split('/').pop()!
    const newPath = `${targetDir}/${folderName}`
    if (oldPath !== newPath && !newPath.startsWith(oldPath + '/')) {
      void repo.renameItem(oldPath, newPath, true)
    }
  }
}

// Context Menu
const ctxMenu = ref({ show: false, x: 0, y: 0, path: '', isFolder: false })
function openCtx(e: MouseEvent, path: string, isFolder: boolean) {
  ctxMenu.value = { show: true, x: e.clientX, y: e.clientY, path, isFolder }
}
function closeCtx() { ctxMenu.value.show = false }

function ctxRename() {
  const { path, isFolder } = ctxMenu.value
  const oldName = path.split('/').pop()!
  const newName = prompt(t('ctx.renamePrompt'), oldName)
  closeCtx()
  if (!newName || newName === oldName) return
  const dir = path.split('/').slice(0, -1).join('/')
  const newPath = `${dir}/${newName}`
  void repo.renameItem(path, newPath, isFolder)
}
function ctxDuplicate() {
  const { path, isFolder } = ctxMenu.value
  closeCtx()
  repo.duplicateItem(path, isFolder)
}
function ctxDelete() {
  const { path, isFolder } = ctxMenu.value
  if (confirm(t('ctx.deleteConfirm', { path }))) {
    repo.deleteItem(path, isFolder)
  }
  closeCtx()
}

const carouselKeys = computed(() => Object.keys(repo.config?.carousels ?? {}))

// Assets logic
const thumbCache = ref<Map<string, string>>(new Map())

const assetExpandedFolders = ref<Set<string>>(new Set(['/']))
const assetDragTarget = ref<string | null>(null)

const groupedAssets = computed(() => {
  const groups: Record<string, typeof repo.assetTree> = { '/': [] }
  const assetsPath = repo.config?.assets_path ?? ''

  for (const node of repo.assetTree) {
    const relativePath = assetsPath ? node.path.replace(assetsPath + '/', '') : node.path
    const parts = relativePath.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/'

    if (dir !== '/') {
      const dirParts = dir.split('/')
      for (let i = 1; i <= dirParts.length; i++) {
        const ancestor = dirParts.slice(0, i).join('/')
        if (!groups[ancestor]) groups[ancestor] = []
      }
    }
    if (!groups[dir]) groups[dir] = []
    groups[dir].push(node)
  }

  const sorted: Array<{ group: string, nodes: typeof repo.assetTree, depth: number }> = []
  const keys = Object.keys(groups).sort()

  for (const group of keys) {
    if (group !== '/') {
      const parts = group.split('/')
      let isVisible = true
      for (let i = 1; i <= parts.length - 1; i++) {
        const ancestor = parts.slice(0, i).join('/')
        if (!assetExpandedFolders.value.has(ancestor)) {
          isVisible = false
          break
        }
      }
      if (!isVisible) continue
    }
    const depth = group === '/' ? 0 : group.split('/').length
    sorted.push({ group, nodes: groups[group]!.sort((a, b) => a.name.localeCompare(b.name)), depth })
  }
  return sorted
})

function toggleAssetFolder(folder: string) {
  if (assetExpandedFolders.value.has(folder)) {
    assetExpandedFolders.value.delete(folder)
  } else {
    assetExpandedFolders.value.add(folder)
  }
}

function onAssetDragStart(e: DragEvent, path: string) {
  e.dataTransfer?.setData('text/plain', `asset:${path}`)
}

function onAssetDragOver(e: DragEvent, group: string) {
  e.preventDefault()
  assetDragTarget.value = group
}

function onAssetDragLeave() {
  assetDragTarget.value = null
}

async function onAssetDrop(e: DragEvent, group: string) {
  assetDragTarget.value = null
  const data = e.dataTransfer?.getData('text/plain')
  if (!data?.startsWith('asset:')) return

  const oldPath = data.slice(6)
  const assetsPath = repo.config?.assets_path ?? ''
  const targetDir = group === '/' ? assetsPath : `${assetsPath}/${group}`
  const fileName = oldPath.split('/').pop()!
  const newPath = `${targetDir}/${fileName}`
  if (oldPath === newPath) return

  await repo.moveAsset(oldPath, newPath)
}

async function refreshAssetThumbs() {
  if (!ui.assetsOpen) return
  const visiblePaths = new Set(repo.assetTree.map(asset => asset.path))

  for (const key of [...thumbCache.value.keys()]) {
    if (!visiblePaths.has(key)) thumbCache.value.delete(key)
  }

  await Promise.all(
    repo.assetTree.map(async asset => {
      if (thumbCache.value.has(asset.path)) return
      const url = await loadImage(asset.path)
      thumbCache.value = new Map(thumbCache.value.set(asset.path, url))
    }),
  )
}

watch(() => ui.assetsOpen, async (open) => {
  if (open) await refreshAssetThumbs()
}, { immediate: true })

watch(() => repo.assetTree.map(asset => asset.path).join('|'), async () => {
  if (ui.assetsOpen) await refreshAssetThumbs()
})

function uploadNewImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string
      const base64 = dataUrl?.split(',')?.[1]
      if (!base64) return
      repo.uploadAsset(file.name, base64)
      ui.assetsOpen = true
      const fullPath = `${repo.config?.assets_path}/${file.name.replace(/[^a-zA-Z0-9.-_]+/g, '-')}`
      thumbCache.value.set(fullPath, dataUrl)
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

const assetCtxMenu = ref({ show: false, x: 0, y: 0, path: '', name: '' })
function openAssetCtx(e: MouseEvent, path: string, name: string) {
  assetCtxMenu.value = { show: true, x: e.clientX, y: e.clientY, path, name }
}
function closeAssetCtx() { assetCtxMenu.value.show = false }

function ctxRenameAsset() {
  const { path, name } = assetCtxMenu.value
  const newName = prompt(t('ctx.renamePrompt'), name)
  closeAssetCtx()
  if (!newName || newName === name) return
  void repo.renameAsset(path, newName)
}

function ctxDeleteAsset() {
  const { path } = assetCtxMenu.value
  if (confirm(t('ctx.deleteConfirm', { path }))) {
    repo.deleteAsset(path)
  }
  closeAssetCtx()
}
</script>

<template>
  <aside class="flex-shrink-0 w-64 flex flex-col border-r overflow-hidden transition-all"
    :class="ui.darkMode ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200'">

    <!-- Config loading -->
    <div v-if="repo.configLoading" class="flex-1 flex items-center justify-center">
      <svg class="w-6 h-6 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <!-- Config error -->
    <div v-else-if="repo.configError" class="p-4">
      <div class="rounded-lg p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
        <p class="font-semibold mb-1">{{ t('sidebar.configError') }}</p>
        <p>{{ repo.configError }}</p>
      </div>
    </div>

    <!-- Sidebar content -->
    <template v-else-if="repo.config">
      <!-- Content section -->
      <div class="flex-1 overflow-y-auto" @click="closeCtx">

        <!-- Section header: Content -->
        <div class="px-3 pt-4 pb-1 rounded-lg transition-all duration-150 flex items-center justify-between group" 
          :class="dragTarget === '/' ? 'bg-brand-500/10' : ''"
          @dragover.prevent="onDragOver($event, '/')" @dragleave="onDragLeave"
          @drop="onDrop($event, '/')">
          <p class="text-xs font-semibold uppercase tracking-wider"
            :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
            {{ t('sidebar.content') }}
          </p>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button @click="createNewPage('/')"
              class="p-0.5 rounded-md transition-all duration-150 hover:bg-surface-200 dark:hover:bg-surface-700 hover:scale-110 active:scale-90"
              :title="t('sidebar.newRootPage')">
              <svg class="w-4 h-4" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button @click="createNewFolder"
              class="p-0.5 rounded-md transition-all duration-150 hover:bg-surface-200 dark:hover:bg-surface-700 hover:scale-110 active:scale-90"
              :title="t('sidebar.newFolder')">
              <svg class="w-4 h-4" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1m-6 4h.01M6 20h12a2 2 0 002-2V9a2 2 0 00-2-2h-12a2 2 0 00-2 2v9a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Tree loading -->
        <div v-if="repo.treeLoading" class="px-3 py-2">
          <div class="space-y-1.5">
            <div v-for="i in 5" :key="i" class="h-6 rounded animate-pulse"
              :class="ui.darkMode ? 'bg-surface-800' : 'bg-surface-100'" :style="`width: ${60 + i * 10}%`"></div>
          </div>
        </div>

        <!-- File tree -->
        <div v-else class="px-2 pb-2">
          <template v-for="{ nodes, group, depth } in sortedGroupedFiles" :key="group">
            <!-- Group header -->
            <div
              class="flex items-center gap-1.5 px-2 py-1.5 mt-1 group cursor-pointer rounded-lg transition-all duration-100"
              :class="[
                dragTarget === group ? 'bg-brand-500/15 ring-2 ring-brand-400' : (ui.darkMode ? 'hover:bg-surface-800' : 'hover:bg-surface-200')
              ]"
              :style="{ marginLeft: group === '/' ? '0' : `${depth * 0.75}rem` }" draggable="true"
              @dragstart="onDragStartFolder($event, group)" 
              @dragover.prevent="onDragOver($event, group)" 
              @dragleave="onDragLeave"
              @drop="onDrop($event, group)"
              @contextmenu.prevent="e => openCtx(e, group === '/' ? (repo.config?.content_path || '') : `${repo.config?.content_path}/${group}`, true)"
              @click="toggleFolder(group)">
              <svg class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                :class="[expandedFolders.has(group) ? 'rotate-90' : '', ui.darkMode ? 'text-surface-500' : 'text-surface-400']"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <svg class="w-4 h-4 flex-shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span class="text-xs font-semibold flex-1 truncate select-none"
                :class="ui.darkMode ? 'text-surface-300' : 'text-surface-600'">
                {{ group === '/' ? repo.config?.content_path.split('/').pop() : group.split('/').pop() }}
              </span>

              <!-- Add page button -->
              <button @click.stop="createNewPage(group)"
                class="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all duration-150 hover:bg-surface-200 dark:hover:bg-surface-700 hover:scale-110 active:scale-90"
                :title="t('sidebar.newPage')">
                <svg class="w-3.5 h-3.5" :class="ui.darkMode ? 'text-surface-300' : 'text-surface-600'" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <!-- Files in folder -->
            <div v-show="expandedFolders.has(group)" class="space-y-0.5 mt-0.5 py-1 rounded-lg transition-all duration-150"
              :class="dragTarget === group ? 'bg-brand-500/5 ring-1 ring-brand-400/50' : ''"
              :style="{ marginLeft: group === '/' ? '0.75rem' : `${(depth * 0.75) + 0.75}rem` }"
              @dragover.prevent="onDragOver($event, group)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, group)">
              <button v-for="node in nodes" :key="node.path" :id="`file-${node.sha ?? 'new'}`" draggable="true"
                @dragstart="onDragStart($event, node.path)" @contextmenu.prevent="e => openCtx(e, node.path, false)"
                @click="handleSelect(node)"
                class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-all duration-100 group cursor-pointer"
                :class="[
                  repo.activeFilePath === node.path && !ui.settingsOpen
                    ? (ui.darkMode ? 'bg-brand-500/15 text-brand-300' : 'bg-brand-50 text-brand-700')
                    : (ui.darkMode
                      ? 'text-surface-300 hover:bg-surface-800 hover:text-white'
                      : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900')
                ]">

                <!-- File icon -->
                <svg class="w-4 h-4 flex-shrink-0" :class="repo.activeFilePath === node.path && !ui.settingsOpen
                  ? 'text-brand-400'
                  : (ui.darkMode ? 'text-surface-500' : 'text-surface-400')" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>

                <span class="flex-1 truncate text-sm" :class="!node.sha ? 'italic opacity-80' : ''">{{ node.name
                  }}</span>

                <!-- Dirty indicator -->
                <span v-if="isDirty(node.path)" class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400"></span>

                <!-- Open indicator -->
                <span v-else-if="isOpen(node.path)" class="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  :class="ui.darkMode ? 'bg-surface-600' : 'bg-surface-300'"></span>
              </button>
            </div>
          </template>

          <p v-if="repo.fileTree.length === 0 && !repo.treeLoading" class="text-xs px-2 py-4 text-center"
            :class="ui.darkMode ? 'text-surface-600' : 'text-surface-400'">
            {{ t('sidebar.noFiles') }}<br><code class="font-mono">{{ repo.config?.content_path }}</code>
          </p>
        </div>

        <!-- Carousels section -->
        <div v-if="carouselKeys.length > 0">
          <div class="px-3 pt-2 pb-1 border-t" :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
            <p class="text-xs font-semibold uppercase tracking-wider"
              :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
              {{ t('sidebar.carousels') }}
            </p>
          </div>
          <div class="px-2 pb-2 space-y-0.5">
            <button v-for="key in carouselKeys" :key="key" @click="handleCarouselSelect(key)"
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-all duration-100 cursor-pointer"
              :class="[
                repo.activeCarouselKey === key && !ui.settingsOpen
                  ? (ui.darkMode ? 'bg-brand-500/15 text-brand-300' : 'bg-brand-50 text-brand-700')
                  : (ui.darkMode
                    ? 'text-surface-300 hover:bg-surface-800 hover:text-white'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900')
              ]">
              <!-- Carousel icon -->
              <svg class="w-4 h-4 flex-shrink-0"
                :class="repo.activeCarouselKey === key && !ui.settingsOpen ? 'text-brand-400' : (ui.darkMode ? 'text-surface-500' : 'text-surface-400')"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                <rect x="2" y="4" width="20" height="16" rx="2" stroke-width="2" />
              </svg>
              <span class="flex-1 truncate text-sm">{{ repo.config?.carousels?.[key]?.label ?? key }}</span>
              <!-- Dirty indicator -->
              <span v-if="repo.stagedCarousels.get(key)?.dirty"
                class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400"></span>
            </button>
          </div>
        </div>

        <!-- Assets section -->
        <div v-if="repo.config?.assets_path">
          <div class="px-3 pt-2 pb-1 border-t flex items-center justify-between group" :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
            <button @click="ui.assetsOpen = !ui.assetsOpen" class="flex items-center gap-2 flex-1 cursor-pointer">
              <p class="text-xs font-semibold uppercase tracking-wider text-left"
                :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
                {{ t('sidebar.assets') }}
              </p>
              <svg class="w-3 h-3 transition-transform duration-200"
                :class="[ui.assetsOpen ? 'rotate-90' : '', ui.darkMode ? 'text-surface-500' : 'text-surface-400']"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button @click="uploadNewImage"
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded-md transition-all duration-150 hover:bg-surface-200 dark:hover:bg-surface-700 hover:scale-110 active:scale-90"
              :title="t('sidebar.addImage')">
              <svg class="w-4 h-4" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div v-if="ui.assetsOpen" class="px-2 pb-2">
            <div v-if="groupedAssets.length === 0" class="text-xs px-2 py-3 text-center"
              :class="ui.darkMode ? 'text-surface-600' : 'text-surface-400'">
              {{ t('sidebar.noImages') }}
            </div>
            <div v-else class="space-y-1 mt-1">
              <template v-for="{ group, nodes, depth } in groupedAssets" :key="group">
                <div
                  class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-100 group cursor-pointer"
                  :class="[
                    assetDragTarget === group ? 'bg-brand-500/15 ring-2 ring-brand-400' : (ui.darkMode ? 'hover:bg-surface-800' : 'hover:bg-surface-200')
                  ]"
                  :style="{ marginLeft: group === '/' ? '0' : `${depth * 0.75}rem` }"
                  @click="toggleAssetFolder(group)"
                  @dragover.prevent="onAssetDragOver($event, group)"
                  @dragleave="onAssetDragLeave"
                  @drop="onAssetDrop($event, group)">
                  <svg class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                    :class="[assetExpandedFolders.has(group) ? 'rotate-90' : '', ui.darkMode ? 'text-surface-500' : 'text-surface-400']"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <svg class="w-4 h-4 flex-shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span class="text-xs font-semibold flex-1 truncate select-none"
                    :class="ui.darkMode ? 'text-surface-300' : 'text-surface-600'">
                    {{ group === '/' ? repo.config?.assets_path.split('/').pop() : group.split('/').pop() }}
                  </span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full"
                    :class="ui.darkMode ? 'bg-surface-800 text-surface-500' : 'bg-surface-100 text-surface-500'">
                    {{ nodes.length }}
                  </span>
                </div>

                <div v-if="assetExpandedFolders.has(group) && nodes.length > 0"
                  class="grid grid-cols-3 gap-1.5 p-1 mt-1"
                  :style="{ marginLeft: group === '/' ? '0' : `${(depth + 1) * 0.75}rem` }">
                  <div v-for="asset in nodes" :key="asset.path"
                    draggable="true"
                    class="relative aspect-square rounded-md overflow-hidden border transition-all duration-150 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
                    :class="ui.darkMode ? 'border-surface-700 hover:border-surface-500' : 'border-surface-200 hover:border-brand-300'"
                    @dragstart="onAssetDragStart($event, asset.path)"
                    @click="openAssetCtx($event, asset.path, asset.name)">

                    <div v-if="!thumbCache.has(asset.path)"
                         class="w-full h-full"
                         :class="ui.darkMode ? 'bg-surface-800' : 'bg-surface-100'"
                         style="background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%); background-size: 200%; border-radius: 4px; animation: shimmer 1.5s infinite;">
                    </div>

                    <img v-else :src="thumbCache.get(asset.path)" :alt="asset.name"
                      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />

                    <div class="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] truncate bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {{ asset.name }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- General (settings) button at bottom -->
      <div class="flex-shrink-0 p-3 border-t" :class="ui.darkMode ? 'border-surface-800' : 'border-surface-200'">
        <button id="settings-btn" @click="openSettings"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          :class="ui.settingsOpen
            ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
            : (ui.darkMode
              ? 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white border border-surface-700'
              : 'bg-surface-50 text-surface-600 hover:bg-surface-100 border border-surface-200')">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ t('sidebar.general') }}
          <!-- Settings dirty indicator -->
          <span v-if="repo.settingsDirty" class="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
        </button>
      </div>

      <!-- Context Menu -->
      <Teleport to="body">
        <div v-if="ctxMenu.show" class="fixed inset-0 z-50" @click="closeCtx" @contextmenu.prevent="closeCtx">
          <div class="absolute shadow-xl border rounded-lg py-1 text-sm min-w-40 flex flex-col overflow-hidden"
            :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-200' : 'bg-white border-surface-200 text-surface-700'"
            :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }" @click.stop>
            <button
              class="px-4 py-1.5 text-left transition-colors duration-100"
              :class="ui.darkMode ? 'hover:bg-surface-700' : 'hover:bg-surface-50'"
              @click="ctxRename">
              {{ t('ctx.rename') }}
            </button>
            <button v-if="!ctxMenu.isFolder"
              class="px-4 py-1.5 text-left transition-colors duration-100"
              :class="ui.darkMode ? 'hover:bg-surface-700' : 'hover:bg-surface-50'"
              @click="ctxDuplicate">
              {{ t('ctx.duplicate') }}
            </button>
            <div class="h-px my-1" :class="ui.darkMode ? 'bg-surface-700' : 'bg-surface-100'"></div>
            <button
              class="px-4 py-1.5 text-left text-red-500 transition-colors duration-100"
              :class="ui.darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'"
              @click="ctxDelete">
              {{ t('ctx.delete') }}
            </button>
          </div>
        </div>

        <div v-if="assetCtxMenu.show" class="fixed inset-0 z-50" @click="closeAssetCtx" @contextmenu.prevent="closeAssetCtx">
          <div class="absolute shadow-xl border rounded-lg py-1 text-sm min-w-40 flex flex-col overflow-hidden"
            :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-200' : 'bg-white border-surface-200 text-surface-700'"
            :style="{ top: assetCtxMenu.y + 'px', left: assetCtxMenu.x + 'px' }" @click.stop>
            <button
              class="px-4 py-1.5 text-left transition-colors duration-100"
              :class="ui.darkMode ? 'hover:bg-surface-700' : 'hover:bg-surface-50'"
              @click="ctxRenameAsset">
              {{ t('ctx.rename') }}
            </button>
            <div class="h-px my-1" :class="ui.darkMode ? 'bg-surface-700' : 'bg-surface-100'"></div>
            <button
              class="px-4 py-1.5 text-left text-red-500 transition-colors duration-100"
              :class="ui.darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'"
              @click="ctxDeleteAsset">
              {{ t('ctx.delete') }}
            </button>
          </div>
        </div>
      </Teleport>
    </template>
  </aside>
</template>

<style scoped>
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
