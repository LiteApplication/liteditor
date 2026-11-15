<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores/ui'
import { useRepoStore } from '@/stores/repo'
import { defaultFolder } from '@/utils/pageTypes'

const { t } = useI18n()
const ui = useUIStore()
const repo = useRepoStore()

const typeKey = ref('')
const name = ref('')
const folder = ref('')

const types = computed(() => Object.entries(repo.config?.page_types ?? {}))
const current = computed(() => repo.config?.page_types?.[typeKey.value])

/** Content-relative folders offered for the selected type. */
const folderChoices = computed(() => {
  const ty = current.value
  if (!ty) return []
  const base = ty.folders?.map((f) => f.replace(/^\/+|\/+$/g, '')) ?? [
    '',
    ...new Set(
      repo.fileTree
        .map((n) => n.path.slice((repo.config?.content_path.length ?? 0) + 1).split('/').slice(0, -1).join('/'))
        .filter(Boolean)
        .concat(repo.customFolders),
    ),
  ]
  return base.map((f) => ({ value: f, ok: repo.checkCreate(typeKey.value, f).ok }))
})

watch(
  () => ui.newPageRequest,
  (req) => {
    if (!req) return
    name.value = ''
    // Prefer a type that can be created in the requested folder.
    const first = types.value.find(([k]) => repo.checkCreate(k, req.folder).ok) ?? types.value[0]
    typeKey.value = first?.[0] ?? ''
    folder.value = req.folder
  },
)

watch(typeKey, () => {
  const ty = current.value
  if (!ty) return
  const choices = folderChoices.value
  if (!choices.some((c) => c.value === folder.value && c.ok)) {
    folder.value = (choices.find((c) => c.ok) ?? choices[0])?.value ?? defaultFolder(ty)
  }
})

const canSubmit = computed(
  () => !!name.value.trim() && !!typeKey.value && repo.checkCreate(typeKey.value, folder.value).ok,
)

function cancel() { ui.closeNewPage(null) }
function submit() {
  if (!canSubmit.value) return
  ui.closeNewPage({ type: typeKey.value, name: name.value, folder: folder.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="ui.newPageRequest" class="fixed inset-0 z-[60] flex items-center justify-center p-4"
           @keydown.esc.stop="cancel">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cancel"></div>
        <form role="dialog" aria-modal="true" @submit.prevent="submit"
              class="relative w-full max-w-sm rounded-2xl border overflow-hidden"
              :class="ui.darkMode ? 'bg-surface-900 border-surface-700 shadow-2xl' : 'bg-white border-surface-200 shadow-2xl'">
          <div class="px-5 pt-5 pb-4 space-y-4">
            <h3 class="text-base font-semibold">{{ t('pageType.title') }}</h3>
            <label class="block text-xs font-medium">
              {{ t('pageType.type') }}
              <select v-model="typeKey" class="mt-1 w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      :class="ui.darkMode ? 'bg-surface-800 border-surface-700' : 'bg-surface-50 border-surface-200'">
                <option v-for="[key, ty] in types" :key="key" :value="key">{{ ty.label }}</option>
              </select>
              <span v-if="current?.description" class="block mt-1 font-normal opacity-70">{{ current.description }}</span>
            </label>
            <label class="block text-xs font-medium">
              {{ t('pageType.folder') }}
              <select v-model="folder" class="mt-1 w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      :class="ui.darkMode ? 'bg-surface-800 border-surface-700' : 'bg-surface-50 border-surface-200'">
                <option v-for="c in folderChoices" :key="c.value" :value="c.value" :disabled="!c.ok">
                  {{ c.value || t('pageType.root') }}{{ c.ok ? '' : ` (${t('pageType.limitReached')})` }}
                </option>
              </select>
              <span v-if="!folderChoices.some((c) => c.ok)" class="block mt-1 font-normal text-red-400">{{ t('pageType.noFolder') }}</span>
            </label>
            <label class="block text-xs font-medium">
              {{ t('pageType.name') }}
              <input v-model="name" type="text" :placeholder="t('pageType.namePlaceholder')" autofocus
                     class="mt-1 w-full px-3 py-2 rounded-lg text-sm border outline-none"
                     :class="ui.darkMode ? 'bg-surface-800 border-surface-700' : 'bg-surface-50 border-surface-200'" />
            </label>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t"
               :class="ui.darkMode ? 'border-surface-800' : 'border-surface-100'">
            <button type="button" @click="cancel"
                    class="px-4 py-2 rounded-lg text-sm border cursor-pointer"
                    :class="ui.darkMode ? 'border-surface-700 text-surface-300 hover:bg-surface-800' : 'border-surface-200 text-surface-600 hover:bg-surface-50'">
              {{ t('cancel') }}
            </button>
            <button type="submit" :disabled="!canSubmit"
                    class="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style="background: linear-gradient(135deg,#3b61ff,#1e3ef5)">
              {{ t('dialog.create') }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>
