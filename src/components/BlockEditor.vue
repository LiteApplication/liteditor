<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import { parseBlocks, serializeBlocks, type Block } from '@/utils/blocks'
import ElementBadge from './ElementBadge.vue'
import ElementEditModal from './ElementEditModal.vue'
import ElementSummary from './ElementSummary.vue'

const props = defineProps<{ allowed: string[]; markdownAllowed: boolean }>()

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()

const blocks = ref<Block[]>(parseBlocks(repo.activeFile?.content ?? ''))
const adding = ref('')
const editing = ref<number | null>(null)

// Drag and drop reordering
const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)
function onDragStart(e: DragEvent, i: number) {
  dragFrom.value = i
  e.dataTransfer?.setData('text/plain', `block:${i}`)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDrop(i: number) {
  const from = dragFrom.value
  dragFrom.value = dragOver.value = null
  if (from === null || from === i) return
  const [b] = blocks.value.splice(from, 1)
  blocks.value.splice(i, 0, b!)
  commit()
}

// Reload only when the file itself changes (key on the component handles this), not on our own writes.
watch(
  () => repo.activeFile?.path,
  () => { blocks.value = parseBlocks(repo.activeFile?.content ?? '') },
)

function commit() {
  const f = repo.activeFile
  if (f) repo.updateFileContent(f.path, serializeBlocks(blocks.value))
}

function addElement(name: string) {
  if (!name) return
  blocks.value.push({ kind: 'element', name, data: {} })
  adding.value = ''
  commit()
}
function addMarkdown() {
  blocks.value.push({ kind: 'markdown', text: '' })
  commit()
}
function remove(i: number) {
  blocks.value.splice(i, 1)
  commit()
}
function move(i: number, d: -1 | 1) {
  const j = i + d
  if (j < 0 || j >= blocks.value.length) return
  const [b] = blocks.value.splice(i, 1)
  blocks.value.splice(j, 0, b!)
  commit()
}
function setData(i: number, data: Record<string, unknown>) {
  const b = blocks.value[i]
  if (b?.kind !== 'element') return
  b.data = data
  commit()
}
function setText(i: number, text: string) {
  const b = blocks.value[i]
  if (b?.kind !== 'markdown') return
  b.text = text
  commit()
}
// A markdown block disallowed for this type is kept, but read-only.
const locked = (b: Block) => b.kind === 'markdown' && !props.markdownAllowed
</script>

<template>
  <div class="flex-1 overflow-auto py-8 px-6" :class="ui.darkMode ? 'bg-surface-950' : 'bg-surface-100'">
    <div class="max-w-3xl mx-auto space-y-4">
      <p v-if="!blocks.length" class="text-sm opacity-60 text-center py-8">{{ t('blocks.empty') }}</p>

      <div v-for="(b, i) in blocks" :key="i" class="rounded-xl border"
        :style="b.kind === 'element' && repo.config?.elements?.[b.name]?.color ? { borderLeft: `4px solid ${repo.config.elements[b.name]!.color}` } : undefined"
        @dragover.prevent="dragOver = i" @drop.prevent="onDrop(i)"
        :class="[ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200',
          dragOver === i && dragFrom !== null && dragFrom !== i ? 'ring-2 ring-brand-400' : '',
          dragFrom === i ? 'opacity-50' : '']">
        <div class="flex items-center gap-2 px-3 py-2 border-b" :draggable="!locked(b)"
          @dragstart="onDragStart($event, i)" @dragend="dragFrom = dragOver = null"
          :class="[ui.darkMode ? 'border-surface-800' : 'border-surface-100', !locked(b) ? 'cursor-grab' : '']">
          <ElementBadge class="flex-1"
            :label="b.kind === 'element' ? (repo.config?.elements?.[b.name]?.label ?? b.name) : t('blocks.markdown')"
            :color="b.kind === 'element' ? repo.config?.elements?.[b.name]?.color : undefined"
            :icon="b.kind === 'element' ? repo.config?.elements?.[b.name]?.icon : 'notes'" />
          <button type="button" class="toolbar-btn" :title="t('blocks.moveUp')" :disabled="i === 0 || locked(b)" @click="move(i, -1)">↑</button>
          <button type="button" class="toolbar-btn" :title="t('blocks.moveDown')" :disabled="i === blocks.length - 1 || locked(b)" @click="move(i, 1)">↓</button>
          <button type="button" class="toolbar-btn text-red-400" :title="t('blocks.remove')" @click="remove(i)">✕</button>
        </div>

        <div class="p-4 space-y-4">
          <div v-if="b.kind === 'element'" class="flex gap-3 items-start">
            <ElementSummary class="flex-1" :name="b.name" :data="b.data" :file-path="repo.activeFile?.path" />
            <button v-if="repo.config?.elements?.[b.name]" type="button" @click="editing = i"
              class="px-2 py-1 text-xs rounded-md border cursor-pointer flex-shrink-0"
              :class="ui.darkMode ? 'border-surface-600 text-surface-300 hover:bg-surface-800' : 'border-surface-300 text-surface-600 hover:bg-surface-100'">
              {{ t('element.edit') }}
            </button>
          </div>

          <template v-else>
            <p v-if="locked(b)" class="text-xs text-amber-500">{{ t('blocks.lockedMarkdown') }}</p>
            <textarea :value="b.text" :readonly="locked(b)" rows="6" spellcheck="true"
              @input="setText(i, ($event.target as HTMLTextAreaElement).value)"
              class="w-full px-3 py-2 rounded-lg text-sm font-mono border outline-none"
              :class="[ui.darkMode ? 'bg-surface-800 border-surface-700' : 'bg-surface-50 border-surface-200', locked(b) ? 'opacity-60' : '']" />
          </template>
        </div>
      </div>

      <ElementEditModal v-if="editing !== null && blocks[editing]?.kind === 'element'"
        :name="(blocks[editing] as any).name" :data="(blocks[editing] as any).data" :file-path="repo.activeFile?.path"
        @update:data="setData(editing, $event)" @close="editing = null" />

      <div class="flex gap-2 items-center">
        <select v-if="allowed.length" v-model="adding" @change="addElement(adding)"
          class="text-sm px-3 py-2 rounded-lg border cursor-pointer outline-none"
          :class="ui.darkMode ? 'bg-surface-800 border-surface-700' : 'bg-white border-surface-200'">
          <option value="">{{ t('blocks.add') }}</option>
          <option v-for="n in allowed" :key="n" :value="n">{{ repo.config?.elements?.[n]?.label ?? n }}</option>
        </select>
        <button v-if="markdownAllowed" type="button" @click="addMarkdown"
          class="text-sm px-3 py-2 rounded-lg border cursor-pointer"
          :class="ui.darkMode ? 'bg-surface-800 border-surface-700' : 'bg-white border-surface-200'">
          + {{ t('blocks.addMarkdown') }}
        </button>
      </div>
    </div>
  </div>
</template>
