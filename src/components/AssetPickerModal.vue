<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import { useGitHubImage } from '@/composables/useGitHubImage'
import type { TreeNode } from '@/stores/repo'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()
const { loadImage } = useGitHubImage()

const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const search = ref('')
const thumbs = ref<Map<string, string>>(new Map())
const expandedFolders = ref<Set<string>>(new Set(['/']))

const assetsRoot = computed(() => repo.config?.assets_path ?? '')

function toAssetsRelativePath(path: string) {
  const root = assetsRoot.value
  if (!root) return path
  if (path === root) return '/'
  if (path.startsWith(root + '/')) return path.slice(root.length + 1)
  return path
}

const filteredAssets = computed(() => {
  const q = search.value.toLowerCase()
  return repo.assetTree.filter(a => {
    const relPath = toAssetsRelativePath(a.path).toLowerCase()
    return a.name.toLowerCase().includes(q) || relPath.includes(q)
  })
})

const groupedAssets = computed(() => {
  const groups: Record<string, typeof repo.assetTree> = { '/': [] }

  for (const node of filteredAssets.value) {
    const relativePath = toAssetsRelativePath(node.path)
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

function toggleFolder(folder: string) {
  if (expandedFolders.value.has(folder)) {
    expandedFolders.value.delete(folder)
  } else {
    expandedFolders.value.add(folder)
  }
}

async function refreshThumbs() {
  const visiblePaths = new Set(repo.assetTree.map(asset => asset.path))

  for (const key of [...thumbs.value.keys()]) {
    if (!visiblePaths.has(key)) thumbs.value.delete(key)
  }

  await Promise.all(
    repo.assetTree.map(async asset => {
      if (thumbs.value.has(asset.path)) return
      const url = await loadImage(asset.path)
      thumbs.value = new Map(thumbs.value.set(asset.path, url))
    }),
  )
}

// Pre-load thumbnails when opened
onMounted(async () => {
  await refreshThumbs()
})

watch(() => repo.assetTree.map(asset => asset.path).join('|'), async () => {
  await refreshThumbs()
})

function select(asset: TreeNode) {
  emit('update:modelValue', asset.path)
}

function isSelected(asset: TreeNode) {
  return props.modelValue === asset.path
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search -->
    <div class="p-3 border-b flex-shrink-0" :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
      <div class="relative">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
             :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input v-model="search" type="text" :placeholder="t('image.searchPlaceholder')"
               class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none transition-all duration-150"
               :class="ui.darkMode ? 'bg-surface-800 border-surface-600 text-surface-100' : 'bg-white border-surface-200 text-surface-900'" />
      </div>
    </div>

    <!-- Grid -->
    <div class="flex-1 overflow-y-auto p-3">
      <div v-if="groupedAssets.length === 0" class="text-center py-6 text-xs"
           :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
        {{ t('image.noImages') }}
      </div>
      <div v-else class="space-y-2">
        <template v-for="{ group, nodes, depth } in groupedAssets" :key="group">
          <button
            type="button"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 text-left"
            :class="ui.darkMode ? 'hover:bg-surface-800' : 'hover:bg-surface-100'"
            :style="{ marginLeft: group === '/' ? '0' : `${depth * 0.75}rem` }"
            @click="toggleFolder(group)">
            <svg class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
              :class="[expandedFolders.has(group) ? 'rotate-90' : '', ui.darkMode ? 'text-surface-500' : 'text-surface-400']"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <svg class="w-4 h-4 flex-shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="flex-1 truncate text-xs font-semibold"
              :class="ui.darkMode ? 'text-surface-300' : 'text-surface-600'">
              {{ group === '/' ? repo.config?.assets_path.split('/').pop() : group.split('/').pop() }}
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full"
              :class="ui.darkMode ? 'bg-surface-800 text-surface-500' : 'bg-surface-100 text-surface-500'">
              {{ nodes.length }}
            </span>
          </button>

          <div v-if="expandedFolders.has(group) && nodes.length > 0"
               class="grid grid-cols-3 gap-2"
               :style="{ marginLeft: group === '/' ? '0' : `${(depth + 1) * 0.75}rem` }">
            <button v-for="asset in nodes" :key="asset.path"
                    type="button"
                    @click="select(asset)"
                    class="relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
                    :class="isSelected(asset)
                      ? 'border-brand-500 ring-2 ring-brand-400/30'
                      : (ui.darkMode ? 'border-surface-700 hover:border-surface-500' : 'border-surface-200 hover:border-surface-300')">
              <div v-if="!thumbs.has(asset.path)"
                   class="w-full h-full"
                   :class="ui.darkMode ? 'bg-surface-800' : 'bg-surface-100'"
                   style="background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%); background-size: 200%; animation: shimmer 1.5s infinite;">
              </div>
              <img v-else :src="thumbs.get(asset.path)" :alt="asset.name"
                   class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div v-if="isSelected(asset)" class="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[10px] font-medium truncate bg-black/60 text-white
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {{ asset.name }}
              </div>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
