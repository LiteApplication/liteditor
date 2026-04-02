<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRepoStore, type CarouselSlide } from '@/stores/repo'
import { useUIStore } from '@/stores/ui'
import { useGitHubImage } from '@/composables/useGitHubImage'
import { computeRelativePath } from '@/utils/paths'
import FieldInput from './FieldInput.vue'
import AssetPickerModal from './AssetPickerModal.vue'

const { t } = useI18n()
const repo = useRepoStore()
const ui = useUIStore()
const { loadImage } = useGitHubImage()

const showImagePicker = ref(false)
const pickingSlideIndex = ref<number | null>(null)
const thumbCache = ref<Map<string, string>>(new Map())

const carousel = computed(() => repo.activeCarousel)
const carouselKey = computed(() => repo.activeCarouselKey ?? '')
const carouselConfig = computed(() => repo.config?.carousels?.[carouselKey.value])
const slides = computed(() => carousel.value?.data?.images ?? [])
const metaKeys = computed(() => Object.keys(carouselConfig.value?.frontmatter ?? {}))

async function getThumb(src: string): Promise<string> {
  if (!src) return ''
  if (thumbCache.value.has(src)) return thumbCache.value.get(src)!
  const url = await loadImage(src)
  thumbCache.value.set(src, url)
  thumbCache.value = new Map(thumbCache.value)
  return url
}

// Pre-load thumbs for existing slides
slides.value.forEach(s => {
  if (s.src) void getThumb(s.src)
})

function addSlide() {
  if (!carousel.value) return
  const newData = {
    ...carousel.value.data,
    images: [...slides.value, { src: '' as string, alt: '' as string, caption: '' as string } as CarouselSlide],
  }
  repo.updateCarouselData(carouselKey.value, newData)
}

function removeSlide(i: number) {
  if (!carousel.value) return
  const imgs = [...slides.value]
  imgs.splice(i, 1)
  repo.updateCarouselData(carouselKey.value, { ...carousel.value.data, images: imgs })
}

function updateSlide(i: number, key: string, val: unknown) {
  if (!carousel.value) return
  const imgs = [...slides.value]
  imgs[i] = { ...imgs[i], [key]: val }
  if (key === 'src' && typeof val === 'string') {
    void getThumb(val)
  }
  repo.updateCarouselData(carouselKey.value, { ...carousel.value.data, images: imgs })
}

function openPickerForSlide(i: number) {
  pickingSlideIndex.value = i
  showImagePicker.value = true
}

function onAssetPicked(path: string) {
  if (pickingSlideIndex.value !== null) {
    updateSlide(pickingSlideIndex.value, 'src', path)
  }
  showImagePicker.value = false
  pickingSlideIndex.value = null
}

function updateMeta(key: string, val: unknown) {
  repo.updateCarouselMeta(carouselKey.value, key, val)
}

// Drag-to-reorder
const dragIndex = ref<number | null>(null)

function onSlideDragStart(i: number) {
  dragIndex.value = i
}
function onSlideDrop(i: number) {
  if (dragIndex.value === null || dragIndex.value === i || !carousel.value) return
  const imgs = [...slides.value]
  const moved = imgs.splice(dragIndex.value, 1)[0]
  imgs.splice(i, 0, moved!)
  repo.updateCarouselData(carouselKey.value, { ...carousel.value.data, images: imgs })
  dragIndex.value = null
}
</script>

<template>
  <div class="flex-1 overflow-auto" :class="ui.darkMode ? 'bg-surface-950' : 'bg-surface-100'">
    <div class="max-w-3xl mx-auto px-6 py-8">

      <!-- Header -->
      <div class="mb-8 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style="background: linear-gradient(135deg, #3b61ff22, #3b61ff44);">
          <svg class="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16M2 12h20" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold">{{ carouselConfig?.label ?? t('carousel.title') }}</h2>
          <p class="text-sm mt-0.5" :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
            {{ carouselConfig?.path }}/carousel.json
          </p>
        </div>
      </div>

      <!-- Carousel metadata (frontmatter) -->
      <div v-if="metaKeys.length > 0" class="mb-8 rounded-2xl border p-5 space-y-5"
        :class="ui.darkMode ? 'bg-surface-900 border-surface-800' : 'bg-white border-surface-200 shadow-sm'">
        <h3 class="font-semibold text-sm flex items-center gap-2"
          :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
          <svg class="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {{ t('carousel.metadata') }}
        </h3>
        <div v-for="key in metaKeys" :key="key">
          <label class="block mb-1.5">
            <span class="text-xs font-semibold" :class="ui.darkMode ? 'text-surface-200' : 'text-surface-700'">
              {{ carouselConfig?.frontmatter?.[key]?.label ?? key }}
            </span>
            <span v-if="carouselConfig?.frontmatter?.[key]?.description" class="block text-xs mt-0.5"
              :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
              {{ carouselConfig?.frontmatter?.[key]?.description }}
            </span>
          </label>
          <FieldInput :model-value="carousel?.data?.[key] ?? ''" :schema="carouselConfig!.frontmatter![key]!"
            @update:model-value="updateMeta(key, $event)" />
        </div>
      </div>

      <!-- Slides list -->
      <div class="space-y-4">
        <div v-if="slides.length === 0"
          class="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 text-center"
          :class="ui.darkMode ? 'border-surface-800 text-surface-600' : 'border-surface-200 text-surface-400'">
          <svg class="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16M2 12h20" />
          </svg>
          <p class="text-sm font-medium">{{ t('carousel.empty') }}</p>
        </div>

        <div v-for="(slide, i) in slides" :key="i"
          class="rounded-2xl border transition-all duration-200 overflow-hidden group" :class="[
            dragIndex === i ? 'opacity-50 scale-95' : '',
            ui.darkMode ? 'bg-surface-900 border-surface-800 hover:border-surface-700' : 'bg-white border-surface-200 hover:border-surface-300 shadow-sm hover:shadow-md',
          ]" draggable="true" @dragstart="onSlideDragStart(i)" @dragover.prevent @drop="onSlideDrop(i)">

          <div class="flex items-start gap-0">
            <!-- Drag handle -->
            <div class="flex items-center px-3 py-6 cursor-grab active:cursor-grabbing"
              :class="ui.darkMode ? 'text-surface-700 hover:text-surface-500' : 'text-surface-300 hover:text-surface-400'"
              :title="t('carousel.dragToReorder')">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 4h2v2H9V4zm4 0h2v2h-2V4zM9 9h2v2H9V9zm4 0h2v2h-2V9zm-4 5h2v2H9v-2zm4 0h2v2h-2v-2z" />
              </svg>
            </div>

            <!-- Thumbnail -->
            <div class="py-4 pl-0 pr-2">
              <div
                class="w-32 h-28 flex-shrink-0 rounded-lg overflow-hidden relative border cursor-pointer transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                :class="ui.darkMode ? 'bg-surface-800 border-surface-700' : 'bg-surface-100 border-surface-200'"
                @click="openPickerForSlide(i)">
              <img v-if="slide.src && thumbCache.has(slide.src)" :src="thumbCache.get(slide.src)"
                :alt="slide.alt as string"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div v-else class="w-full h-full flex items-center justify-center flex-col gap-1 transition-colors duration-150"
                :class="ui.darkMode ? 'text-surface-600 bg-surface-800 hover:bg-surface-700' : 'text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100'">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-[10px]">{{ t('carousel.pickImage') }}</span>
              </div>
              <!-- Hover overlay -->
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <span class="text-white text-xs font-medium">{{ slide.src ? t('carousel.changeImage') :
                  t('carousel.pickImage') }}</span>
              </div>
            </div></div>

            <!-- Fields -->
            <div class="flex-1 p-4 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide"
                  :class="ui.darkMode ? 'text-surface-500' : 'text-surface-400'">
                  {{ t('carousel.slideN', { n: i + 1 }) }}
                </span>
                <button @click="removeSlide(i)"
                  class="flex-shrink-0 p-1 rounded-lg transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer"
                  :class="ui.darkMode ? 'text-surface-600 hover:text-red-400 hover:bg-red-400/10' : 'text-surface-400 hover:text-red-500 hover:bg-red-50'"
                  :title="t('carousel.removeSlide')">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <!-- Alt text -->
              <div>
                <label class="block text-xs font-medium mb-1"
                  :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
                  {{ t('carousel.alt') }}
                </label>
                <input type="text" :value="slide.alt as string"
                  @input="updateSlide(i, 'alt', ($event.target as HTMLInputElement).value)"
                  :placeholder="t('carousel.altPlaceholder')"
                  class="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-all duration-150"
                  :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500' : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400'" />
              </div>

              <!-- Caption -->
              <div>
                <label class="block text-xs font-medium mb-1"
                  :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
                  {{ t('carousel.caption') }}
                </label>
                <input type="text" :value="slide.caption as string"
                  @input="updateSlide(i, 'caption', ($event.target as HTMLInputElement).value)"
                  :placeholder="t('carousel.captionPlaceholder')"
                  class="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-all duration-150"
                  :class="ui.darkMode ? 'bg-surface-800 border-surface-700 text-surface-100 focus:border-brand-500' : 'bg-surface-50 border-surface-200 text-surface-900 focus:border-brand-400'" />
              </div>

              <!-- Extra schema fields (from schema key in carousel config) -->
              <template v-if="carouselConfig?.schema">
                <div v-for="schKey in Object.keys(carouselConfig.schema)" :key="schKey">
                  <label class="block text-xs font-medium mb-1"
                    :class="ui.darkMode ? 'text-surface-400' : 'text-surface-500'">
                    {{ carouselConfig.schema[schKey]?.label ?? schKey }}
                  </label>
                  <FieldInput :model-value="(slide as Record<string, unknown>)[schKey] ?? ''"
                    :schema="carouselConfig.schema[schKey]!" @update:model-value="updateSlide(i, schKey, $event)" />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Add slide button -->
        <button @click="addSlide"
          class="w-full py-3 px-4 rounded-2xl text-sm border border-dashed transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          :class="ui.darkMode ? 'border-surface-700 text-surface-500 hover:border-brand-500 hover:text-brand-400 hover:bg-brand-500/5'
            : 'border-surface-200 text-surface-400 hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50'">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {{ t('carousel.addSlide') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Image Picker Modal -->
  <Teleport to="body">
    <div v-if="showImagePicker" class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="showImagePicker = false">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showImagePicker = false"></div>
      <div class="relative z-50 w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col" style="height: 480px;"
        :class="ui.darkMode ? 'bg-surface-900 border-surface-700' : 'bg-white border-surface-200 shadow-2xl'">
        <div class="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          :class="ui.darkMode ? 'border-surface-700' : 'border-surface-200'">
          <h4 class="font-semibold text-sm">{{ t('image.pick') }}</h4>
          <button @click="showImagePicker = false"
            class="p-1 rounded cursor-pointer transition-all duration-150 hover:scale-110 active:scale-90"
            :class="ui.darkMode ? 'text-surface-400 hover:text-white' : 'text-surface-400 hover:text-surface-700'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <AssetPickerModal :model-value="null" @update:model-value="onAssetPicked($event)" />
      </div>
    </div>
  </Teleport>
</template>
