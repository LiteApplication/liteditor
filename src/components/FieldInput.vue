<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveRelativePath, computeRelativePath } from '@/utils/paths'
import { useUIStore } from '@/stores/ui'
import { useGitHubImage } from '@/composables/useGitHubImage'
import type { FieldSchema } from '@/types/schema'
import AssetPickerModal from './AssetPickerModal.vue'

const { t } = useI18n()

const props = defineProps<{
  modelValue: unknown
  schema: FieldSchema
  filePath?: string  // for resolving relative image paths
}>()
const emit = defineEmits<{ 'update:modelValue': [unknown] }>()

const ui = useUIStore()

const showAssetPicker = ref(false)
const fieldType = computed(() => props.schema.type ?? 'short-text')
const objectOpen = ref(false)

const objectFieldEntries = computed(() => {
  if (fieldType.value !== 'object') return []
  const fields = ((props.schema as Record<string, unknown>).fields ?? {}) as Record<string, FieldSchema>
  return Object.entries(fields)
})

const isCompactObject = computed(() => {
  if (fieldType.value !== 'object') return false
  if (objectFieldEntries.value.length === 0 || objectFieldEntries.value.length > 2) return false
  return objectFieldEntries.value.every(([, subSchema]) => {
    const t = subSchema.type ?? 'short-text'
    return t === 'short-text' || t === 'link' || t === 'boolean' || t === 'selection' || t === 'color'
  })
})

const isComplexObject = computed(() => {
  if (fieldType.value !== 'object') return false
  if (isCompactObject.value) return false
  if (objectFieldEntries.value.length > 3) return true
  return objectFieldEntries.value.some(([, subSchema]) => {
    const t = subSchema.type ?? 'short-text'
    return t === 'list' || t === 'object' || t === 'long-text' || t === 'image'
  })
})

const objectSummary = computed(() => {
  const total = objectFieldEntries.value.length
  return `${total} field${total > 1 ? 's' : ''}`
})

// List helpers
const listItems = computed(() => Array.isArray(props.modelValue) ? props.modelValue as unknown[] : [])
const canAddItem = computed(() => {
  const max = 'max' in props.schema ? (props.schema as Record<string, unknown>).max as number : undefined
  return !max || listItems.value.length < max
})

function addItem() {
  const itemSchema = ('itemSchema' in props.schema) ? (props.schema as Record<string, unknown>).itemSchema as FieldSchema : null
  let defaultVal: unknown = ''
  if (itemSchema) {
    if (itemSchema.type === 'boolean') defaultVal = false
    else if (itemSchema.type === 'color') defaultVal = '#000000'
    else if (itemSchema.type === 'object') defaultVal = {}
    else if (itemSchema.type === 'list') defaultVal = []
  }
  emit('update:modelValue', [...listItems.value, defaultVal])
}
function removeItem(i: number) {
  const arr = [...listItems.value]
  arr.splice(i, 1)
  emit('update:modelValue', arr)
}
function updateItem(i: number, val: unknown) {
  const arr = [...listItems.value]
  arr[i] = val
  emit('update:modelValue', arr)
}

function updateObjectField(key: string, val: unknown) {
  const obj = typeof props.modelValue === 'object' && props.modelValue !== null
    ? { ...(props.modelValue as Record<string, unknown>) }
    : {}
  obj[key] = val
  emit('update:modelValue', obj)
}

// Image helpers
const { loadImage } = useGitHubImage()
const thumbSrc = ref<string>('')

async function resolveThumb(path: string) {
  if (!path) { thumbSrc.value = ''; return }
  let repoPath = path
  if ((path.startsWith('.') || path.startsWith('/')) && props.filePath) {
    repoPath = resolveRelativePath(props.filePath, path)
  }
  thumbSrc.value = await loadImage(repoPath)
}

watch(
  () => [props.modelValue, props.filePath],
  ([val]) => {
    if (fieldType.value === 'image' && typeof val === 'string') void resolveThumb(val)
  },
  { immediate: true },
)

function selectAsset(path: string) {
  let finalPath = path
  if (props.filePath) {
    finalPath = computeRelativePath(props.filePath, path)
  }
  emit('update:modelValue', finalPath)
  showAssetPicker.value = false
}

const strVal = computed(() => String(props.modelValue ?? ''))
const boolVal = computed(() => Boolean(props.modelValue))

// Color helpers
// The native <input type="color"> only handles 6-digit hex.
// When alpha mode is on, we show a separate opacity slider and convert to 8-digit hex.
const colorHex6 = computed(() => {
  const v = strVal.value
  // Strip the two alpha digits if present (#RRGGBBAA → #RRGGBB)
  if (/^#[0-9a-fA-F]{8}$/.test(v)) return v.slice(0, 7)
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  return '#000000'
})

const colorAlpha = computed(() => {
  const v = strVal.value
  if ('alpha' in props.schema && props.schema.alpha && /^#[0-9a-fA-F]{8}$/.test(v)) {
    return Math.round((parseInt(v.slice(7, 9), 16) / 255) * 100)
  }
  return 100
})

function onColorChange(hex: string) {
  if ('alpha' in props.schema && props.schema.alpha) {
    const aa = Math.round((colorAlpha.value / 100) * 255).toString(16).padStart(2, '0')
    emit('update:modelValue', `${hex}${aa}`)
  } else {
    emit('update:modelValue', hex)
  }
}

function onAlphaChange(pct: number) {
  const aa = Math.round((pct / 100) * 255).toString(16).padStart(2, '0')
  emit('update:modelValue', `${colorHex6.value}${aa}`)
}
</script>

<template>
  <!-- BOOLEAN -->
  <div v-if="fieldType === 'boolean'" class="flex items-center gap-3">
    <button role="switch" :aria-checked="boolVal" @click="emit('update:modelValue', !boolVal)"
      class="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
      :class="boolVal ? 'bg-brand-500' : (ui.darkMode ? 'bg-surface-700' : 'bg-surface-200')">
      <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
        :class="boolVal ? 'translate-x-5' : 'translate-x-0'"></span>
    </button>
    <span class="text-sm" :class="ui.darkMode ? 'text-surface-300' : 'text-surface-600'">
      {{ boolVal ? t('yes') : t('no') }}
    </span>
  </div>

  <!-- SHORT TEXT -->
  <input v-else-if="fieldType === 'short-text'" type="text" :value="strVal"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    class="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-400/50"
    :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500 hover:border-surface-600'
      : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400 hover:border-surface-300'" />

  <!-- LONG TEXT -->
  <textarea v-else-if="fieldType === 'long-text'" :value="strVal" rows="4"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    class="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150 resize-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
    :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500 hover:border-surface-600'
      : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400 hover:border-surface-300'">
  </textarea>

  <!-- LINK -->
  <input v-else-if="fieldType === 'link'" type="url" :value="strVal" placeholder="https://"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    class="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150 font-mono focus-visible:ring-2 focus-visible:ring-brand-400/50"
    :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500 hover:border-surface-600'
      : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400 hover:border-surface-300'" />

  <!-- SELECTION -->
  <select v-else-if="fieldType === 'selection'" :value="strVal"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    class="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-400/50"
    :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500 hover:border-surface-600'
      : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400 hover:border-surface-300'">
    <option value="" disabled>{{ t('field.selectOption') }}</option>
    <option v-for="opt in ((schema as any).options ?? [])" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>

  <!-- COLOR -->
  <div v-else-if="fieldType === 'color'" class="space-y-2">
    <div class="flex items-center gap-3">
      <!-- Color swatch + native picker -->
      <div
        class="relative w-10 h-10 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95"
        :class="ui.darkMode ? 'border-surface-600' : 'border-surface-300'" :title="strVal">
        <div class="absolute inset-0"
          :style="{ background: colorHex6 + ((schema as any).alpha ? Math.round((colorAlpha / 100) * 255).toString(16).padStart(2, '0') : '') }">
        </div>
        <input type="color" :value="colorHex6" @input="onColorChange(($event.target as HTMLInputElement).value)"
          class="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
      </div>
      <!-- Hex value display -->
      <input type="text" :value="strVal" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        maxlength="9"
        class="flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150 font-mono uppercase"
        :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500' : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400'" />
    </div>
    <!-- Alpha slider -->
    <div v-if="(schema as any).alpha" class="flex items-center gap-2">
      <span class="text-xs w-16 flex-shrink-0" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
        Opacity {{ colorAlpha }}%
      </span>
      <input type="range" min="0" max="100" :value="colorAlpha"
        @input="onAlphaChange(Number(($event.target as HTMLInputElement).value))"
        class="flex-1 h-2 rounded-full cursor-pointer accent-brand-500" />
    </div>
  </div>

  <!-- IMAGE -->
  <div v-else-if="fieldType === 'image'" class="space-y-2">
    <!-- Thumbnail preview -->
    <div v-if="strVal" class="relative rounded-lg overflow-hidden border h-28 group"
      :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
      <img :src="thumbSrc" :alt="schema.label"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <button @click="emit('update:modelValue', '')"
        class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-all duration-150 hover:scale-110 active:scale-90">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <button @click="showAssetPicker = true"
      class="w-full py-2 px-3 rounded-lg text-sm border border-dashed transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
      :class="ui.darkMode ? 'border-surface-600 text-surface-400 hover:border-brand-500 hover:text-brand-400 hover:bg-brand-500/5'
        : 'border-surface-300 text-surface-500 hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50'">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {{ strVal ? t('image.change') : t('image.pick') }}
    </button>
    <!-- Asset picker flyout -->
    <Teleport to="body">
      <div v-if="showAssetPicker" class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showAssetPicker = false">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showAssetPicker = false"></div>
        <div class="relative z-50 w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col"
          style="height: 480px;"
          :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200 shadow-2xl'">
          <div class="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
            <h4 class="font-semibold text-sm">{{ t('image.pick') }}</h4>
            <button @click="showAssetPicker = false"
              class="p-1 rounded cursor-pointer transition-all duration-150 hover:scale-110 active:scale-90"
              :class="ui.darkMode ? 'text-surface-400 hover:text-white' : 'text-surface-400 hover:text-surface-700'">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <AssetPickerModal :model-value="strVal" @update:model-value="selectAsset($event as string)" />
        </div>
      </div>
    </Teleport>
  </div>

  <!-- LIST -->
  <div v-else-if="fieldType === 'list'" class="space-y-2">
    <div v-for="(item, i) in listItems" :key="i" class="flex items-start gap-2 group">
      <div class="flex-1">
        <FieldInput :model-value="item"
          :schema="(schema as any).itemSchema"
          :file-path="filePath"
          @update:model-value="updateItem(i, $event)" />
      </div>
      <button @click="removeItem(i)"
        class="mt-1.5 w-6 h-6 flex-shrink-0 flex items-center justify-center rounded cursor-pointer transition-all duration-150 hover:scale-110 active:scale-90"
        :class="ui.darkMode ? 'text-surface-500 hover:text-red-400 hover:bg-red-400/10' : 'text-surface-400 hover:text-red-500 hover:bg-red-50'">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <button v-if="canAddItem" @click="addItem"
      class="w-full py-1.5 px-3 rounded-lg text-xs border border-dashed transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
      :class="ui.darkMode ? 'border-surface-700 text-surface-500 hover:border-brand-500 hover:text-brand-400 hover:bg-brand-500/5'
        : 'border-surface-300 text-surface-400 hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50'">
      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {{ t('field.addItem') }}{{ (schema as any).max ? ` (${listItems.length}/${(schema as any).max})` : '' }}
    </button>
    <p v-if="(schema as any).max && listItems.length >= (schema as any).max" class="text-xs"
      :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
      {{ t('field.maxReached', { max: (schema as any).max }) }}
    </p>
  </div>

  <!-- OBJECT -->
  <div v-else-if="fieldType === 'object'" class="space-y-3">
    <!-- Compact object: up to 2 simple fields displayed inline -->
    <div v-if="isCompactObject" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div v-for="([key, subSchema], idx) in objectFieldEntries" :key="key" :class="idx === 1 ? 'sm:col-span-1' : ''">
        <label class="block mb-1.5">
          <span class="text-xs font-semibold" :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
            {{ subSchema.label || key }}
          </span>
          <span v-if="subSchema.description" class="block text-xs mt-0.5"
            :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
            {{ subSchema.description }}
          </span>
        </label>
        <FieldInput :model-value="(modelValue as Record<string, unknown>)?.[key]"
          :schema="subSchema"
          :file-path="filePath"
          @update:model-value="updateObjectField(key as string, $event)" />
      </div>
    </div>

    <!-- Complex object: collapsible panel -->
    <div v-else-if="isComplexObject"
      class="rounded-xl border"
      :class="ui.darkMode ? 'bg-surface-800/40 border-surface-700' : 'bg-surface-50 border-surface-200'">
      <button type="button"
        class="w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-t-xl transition-colors duration-150"
        :class="ui.darkMode ? 'hover:bg-surface-700/60' : 'hover:bg-surface-100'"
        @click="objectOpen = !objectOpen">
        <svg class="w-3.5 h-3.5 transition-transform duration-200"
          :class="[objectOpen ? 'rotate-90' : '', ui.darkMode ? 'text-surface-500' : 'text-surface-400']"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-xs font-semibold" :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
          Object section
        </span>
        <span class="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
          :class="ui.darkMode ? 'bg-surface-700 text-surface-400' : 'bg-surface-200 text-surface-500'">
          {{ objectSummary }}
        </span>
      </button>

      <div v-if="objectOpen" class="px-3 pb-3 space-y-3">
        <div v-for="([key, subSchema]) in objectFieldEntries" :key="key">
          <label class="block mb-1.5">
            <span class="text-xs font-semibold" :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
              {{ subSchema.label || key }}
            </span>
            <span v-if="subSchema.description" class="block text-xs mt-0.5"
              :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
              {{ subSchema.description }}
            </span>
          </label>
          <FieldInput :model-value="(modelValue as Record<string, unknown>)?.[key]"
            :schema="subSchema"
            :file-path="filePath"
            @update:model-value="updateObjectField(key as string, $event)" />
        </div>
      </div>
    </div>

    <!-- Medium object: expanded but tidy card -->
    <div v-else class="space-y-3 rounded-xl border p-3"
      :class="ui.darkMode ? 'bg-surface-800/50 border-surface-700' : 'bg-surface-50 border-surface-200'">
      <div v-for="([key, subSchema]) in objectFieldEntries" :key="key">
        <label class="block mb-1.5">
          <span class="text-xs font-semibold" :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
            {{ subSchema.label || key }}
          </span>
          <span v-if="subSchema.description" class="block text-xs mt-0.5"
            :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
            {{ subSchema.description }}
          </span>
        </label>
        <FieldInput :model-value="(modelValue as Record<string, unknown>)?.[key]"
          :schema="subSchema"
          :file-path="filePath"
          @update:model-value="updateObjectField(key as string, $event)" />
      </div>
    </div>
  </div>

  <!-- Fallback -->
  <input v-else type="text" :value="strVal"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    class="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all duration-150"
    :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100' : 'bg-surface-50 border-surface-200 text-surface-900'" />
</template>
