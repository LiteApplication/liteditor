<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useGitHubImage } from '@/composables/useGitHubImage'
import { useRepoStore, resolveRelativePath } from '@/stores/repo'

const props = defineProps<{
  node: { attrs: { src: string; alt?: string; title?: string } }
  selected: boolean
}>()

const repo = useRepoStore()
const { loadImage } = useGitHubImage()
const displaySrc = ref('')
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  const raw = props.node.attrs.src
  if (!raw) { loading.value = false; return }

  // If it's already a data URL or absolute URL just use it
  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    displaySrc.value = raw
    loading.value = false
    return
  }

  // Resolve relative path (e.g. ../../assets/img.jpg) using active file context
  let repoPath = raw
  if (raw.startsWith('.') || raw.startsWith('/')) {
    const filePath = repo.activeFile?.path ?? ''
    repoPath = resolveRelativePath(filePath, raw)
  }

  try {
    displaySrc.value = await loadImage(repoPath)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <NodeViewWrapper as="figure" class="tiptap-image-wrapper" :class="{ selected }">
    <!-- Loading skeleton -->
    <div v-if="loading" class="tiptap-image-skeleton"></div>
    <!-- Error -->
    <div v-else-if="error || !displaySrc" class="tiptap-image-error">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span class="text-xs mt-1">{{ node.attrs.src }}</span>
    </div>
    <!-- Image -->
    <img v-else :src="displaySrc" :alt="node.attrs.alt ?? ''" draggable="false" />
    <!-- Caption -->
    <figcaption v-if="node.attrs.alt">{{ node.attrs.alt }}</figcaption>
  </NodeViewWrapper>
</template>

<style scoped>
.tiptap-image-wrapper {
  display: block;
  margin: 1.25em 0;
  text-align: center;
}
.tiptap-image-wrapper img {
  max-width: 100%;
  border-radius: 8px;
  display: inline-block;
  transition: opacity 0.2s;
}
.tiptap-image-wrapper.selected img {
  outline: 2px solid #3b61ff;
  outline-offset: 2px;
}
.tiptap-image-wrapper figcaption {
  font-size: 0.825em;
  text-align: center;
  margin-top: 0.4em;
  opacity: 0.6;
  font-style: italic;
}
.tiptap-image-skeleton {
  width: 100%;
  height: 160px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(128,128,128,0.1) 25%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.tiptap-image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  border-radius: 8px;
  background: rgba(255,0,0,0.05);
  color: #f87171;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
